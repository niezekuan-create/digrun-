import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, Not, In, DataSource } from 'typeorm';
import { createHmac, timingSafeEqual } from 'crypto';
import * as QRCode from 'qrcode';
import { Registration } from './entities/registration.entity';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
import { PointsService } from '../points/points.service';
import { Event } from '../events/entities/event.entity';

const QR_SECRET = process.env.JWT_SECRET || 'digrun-secret-key';
const QR_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function signQr(payload: string): string {
  return createHmac('sha256', QR_SECRET).update(payload).digest('hex');
}

function verifyQr(payload: string, sig: string): boolean {
  const expected = Buffer.from(signQr(payload));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

@Injectable()
export class RegistrationsService {
  constructor(
    @InjectRepository(Registration)
    private registrationsRepository: Repository<Registration>,
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
    @InjectDataSource()
    private dataSource: DataSource,
    private pointsService: PointsService,
  ) {}

  // ─── Create ───────────────────────────────────────────────
  async create(userId: number, dto: CreateRegistrationDto) {
    // Fetch event to enforce signup window and published status server-side
    const event = await this.eventsRepository.findOneBy({ id: dto.event_id });
    if (!event) throw new NotFoundException('活动不存在');
    if (event.status !== 'published') throw new BadRequestException('活动未开放报名');

    const now = new Date();
    if (event.signup_start_time && now < new Date(event.signup_start_time)) {
      throw new BadRequestException('报名尚未开始');
    }
    if (event.signup_end_time && now > new Date(event.signup_end_time)) {
      throw new BadRequestException('报名已截止');
    }

    const existing = await this.registrationsRepository.findOne({
      where: {
        user_id: userId,
        event_id: dto.event_id,
        status: Not(In(['cancelled', 'rejected'])),
      },
    });
    if (existing) {
      throw new BadRequestException('Already registered for this event');
    }
    const registration = this.registrationsRepository.create({
      ...dto,
      user_id: userId,
      status: 'pending',
    });
    return this.registrationsRepository.save(registration);
  }

  // ─── User: cancel ─────────────────────────────────────────
  async cancel(userId: number, registrationId: number) {
    const reg = await this.registrationsRepository.findOne({
      where: { id: registrationId },
    });
    if (!reg) throw new NotFoundException('Registration not found');
    if (reg.user_id !== userId) throw new ForbiddenException('Not your registration');
    if (reg.status === 'checked_in') {
      throw new BadRequestException('Already checked in, cannot cancel');
    }
    if (reg.status === 'cancelled') {
      throw new BadRequestException('Already cancelled');
    }
    await this.registrationsRepository.update(registrationId, {
      status: 'cancelled',
      cancelled_at: new Date(),
    });
    return { message: 'Registration cancelled' };
  }

  // ─── Admin: approve ───────────────────────────────────────
  // BUG-05 fix: wrap in transaction with row-level lock to prevent concurrent over-approval
  async approve(adminId: number, registrationId: number) {
    return this.dataSource.transaction(async (manager) => {
      const regRepo = manager.getRepository(Registration);

      const reg = await regRepo
        .createQueryBuilder('r')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('r.event', 'event')
        .where('r.id = :id', { id: registrationId })
        .getOne();

      if (!reg) throw new NotFoundException('Registration not found');
      if (reg.status === 'cancelled') throw new BadRequestException('Cannot approve a cancelled registration');
      if (reg.status === 'approved') throw new BadRequestException('Already approved');
      if (reg.status === 'checked_in') throw new BadRequestException('Already checked in');

      if (reg.event?.max_people) {
        const approvedCount = await regRepo.count({
          where: { event_id: reg.event_id, status: In(['approved', 'checked_in']) },
        });
        if (approvedCount >= reg.event.max_people) {
          throw new BadRequestException('活动名额已满');
        }
      }

      await regRepo.update(registrationId, {
        status: 'approved',
        approved_by: adminId,
        approved_at: new Date(),
      });

      return regRepo.findOne({
        where: { id: registrationId },
        relations: ['user', 'event'],
      });
    });
  }

  // ─── Admin: reject ────────────────────────────────────────
  async reject(adminId: number, registrationId: number) {
    const reg = await this.registrationsRepository.findOne({
      where: { id: registrationId },
    });
    if (!reg) throw new NotFoundException('Registration not found');
    if (reg.status === 'checked_in') {
      throw new BadRequestException('Cannot reject a checked-in registration');
    }
    await this.registrationsRepository.update(registrationId, {
      status: 'rejected',
      cancelled_at: new Date(),
    });
    return { message: 'Registration rejected' };
  }

  // ─── Queries ──────────────────────────────────────────────
  findAll() {
    return this.registrationsRepository.find({ relations: ['user', 'event'] });
  }

  findByUser(userId: number) {
    return this.registrationsRepository.find({
      where: { user_id: userId },
      relations: ['event'],
      order: { created_at: 'DESC' },
    });
  }

  findByEvent(eventId: number) {
    return this.registrationsRepository.find({
      where: { event_id: eventId },
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }

  findAllForAdmin(eventId?: number) {
    const where: any = {};
    if (eventId) where.event_id = eventId;
    return this.registrationsRepository.find({
      where,
      relations: ['user', 'event'],
      order: { created_at: 'DESC' },
    });
  }

  findOne(id: number) {
    return this.registrationsRepository.findOne({
      where: { id },
      relations: ['user', 'event'],
    });
  }

  update(id: number, updateRegistrationDto: UpdateRegistrationDto) {
    return this.registrationsRepository.update(id, updateRegistrationDto);
  }

  // ─── Checkin ──────────────────────────────────────────────
  // BUG-03 fix: transaction + row-lock prevents concurrent double award
  // BUG-06 fix: verify HMAC signature and timestamp from QR payload
  async checkin(qrData: string) {
    // Support both new signed format and legacy format
    const signedMatch = qrData.match(/[?&]p=([^&]+)&s=([^&]+)/);
    const legacyMatch = !signedMatch && qrData.match(/rid=(\d+)/);

    let registrationId: number;

    if (signedMatch) {
      const rawPayload = decodeURIComponent(signedMatch[1]);
      const sig = decodeURIComponent(signedMatch[2]);

      if (!verifyQr(rawPayload, sig)) {
        throw new BadRequestException('签到码无效（签名错误）');
      }

      // payload = "rid:uid:eid:timestamp"
      const parts = rawPayload.split(':');
      if (parts.length !== 4) throw new BadRequestException('签到码格式错误');
      registrationId = parseInt(parts[0]);
      const ts = parseInt(parts[3]);
      if (Date.now() - ts > QR_TTL_MS) {
        throw new BadRequestException('签到码已过期，请重新生成');
      }
    } else if (legacyMatch) {
      registrationId = parseInt(legacyMatch[1]);
    } else {
      throw new BadRequestException('Invalid QR code');
    }

    return this.dataSource.transaction(async (manager) => {
      const regRepo = manager.getRepository(Registration);

      const registration = await regRepo
        .createQueryBuilder('r')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('r.user', 'user')
        .leftJoinAndSelect('r.event', 'event')
        .where('r.id = :id', { id: registrationId })
        .getOne();

      if (!registration) throw new NotFoundException('Registration not found');

      if (registration.status === 'checked_in') {
        return { message: 'Already checked in', registration };
      }
      if (registration.status === 'cancelled' || registration.status === 'rejected') {
        throw new BadRequestException('报名已取消或被拒绝，无法签到');
      }
      if (registration.status === 'pending') {
        throw new BadRequestException('报名待审核，请等待管理员审核后再签到');
      }

      await regRepo.update(registrationId, {
        status: 'checked_in',
        checkin_time: new Date(),
      });

      const eventTitle = registration.event?.title || `活动 #${registration.event_id}`;
      await this.pointsService.awardCheckinPointsInTx(
        manager,
        registration.user_id,
        registration.event_id,
        eventTitle,
      );

      return { message: 'Check-in successful', registration: { ...registration, status: 'checked_in' } };
    });
  }

  // ─── QR Code ──────────────────────────────────────────────
  // BUG-06 fix: signed QR with timestamp
  async getQrCode(id: number) {
    const registration = await this.registrationsRepository.findOne({
      where: { id },
      relations: ['user', 'event'],
    });
    if (!registration) throw new NotFoundException('Registration not found');

    const payload = `${id}:${registration.user_id}:${registration.event_id}:${Date.now()}`;
    const sig = signQr(payload);
    const qrData = `digrun://checkin?p=${encodeURIComponent(payload)}&s=${encodeURIComponent(sig)}`;

    const qrCode = await QRCode.toDataURL(qrData, { width: 300 });
    return { qrcode: qrCode, registration };
  }

  remove(id: number) {
    return this.registrationsRepository.update(id, { status: 'cancelled' });
  }
}
