import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import * as QRCode from 'qrcode';
import { Registration } from './entities/registration.entity';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
import { PointsService } from '../points/points.service';

@Injectable()
export class RegistrationsService {
  constructor(
    @InjectRepository(Registration)
    private registrationsRepository: Repository<Registration>,
    private pointsService: PointsService,
  ) {}

  // ─── Create ───────────────────────────────────────────────
  async create(userId: number, dto: CreateRegistrationDto) {
    // Prevent duplicate active registration
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
  async approve(adminId: number, registrationId: number) {
    const reg = await this.registrationsRepository.findOne({
      where: { id: registrationId },
      relations: ['event'],
    });
    if (!reg) throw new NotFoundException('Registration not found');
    if (reg.status === 'cancelled') {
      throw new BadRequestException('Cannot approve a cancelled registration');
    }
    if (reg.status === 'checked_in') {
      throw new BadRequestException('Already checked in');
    }

    // Check capacity: count currently approved for this event
    if (reg.event?.max_people) {
      const approvedCount = await this.registrationsRepository.count({
        where: { event_id: reg.event_id, status: In(['approved', 'checked_in']) },
      });
      if (approvedCount >= reg.event.max_people) {
        throw new BadRequestException('活动名额已满');
      }
    }

    await this.registrationsRepository.update(registrationId, {
      status: 'approved',
      approved_by: adminId,
      approved_at: new Date(),
    });
    return this.registrationsRepository.findOne({
      where: { id: registrationId },
      relations: ['user', 'event'],
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

  // Admin: all registrations, optionally filtered by event
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
  async checkin(qrData: string) {
    const match = qrData.match(/rid=(\d+)/);
    if (!match) throw new BadRequestException('Invalid QR code');

    const registrationId = parseInt(match[1]);
    const registration = await this.registrationsRepository.findOne({
      where: { id: registrationId },
      relations: ['user', 'event'],
    });
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

    await this.registrationsRepository.update(registrationId, {
      status: 'checked_in',
      checkin_time: new Date(),
    });
    const eventTitle = registration.event?.title || `活动 #${registration.event_id}`;
    await this.pointsService.awardCheckinPoints(registration.user_id, registration.event_id, eventTitle);
    return { message: 'Check-in successful', registration: { ...registration, status: 'checked_in' } };
  }

  // ─── QR Code ──────────────────────────────────────────────
  async getQrCode(id: number) {
    const registration = await this.registrationsRepository.findOne({
      where: { id },
      relations: ['user', 'event'],
    });
    if (!registration) throw new NotFoundException('Registration not found');
    const qrData = `digrun://checkin?rid=${id}&uid=${registration.user_id}&eid=${registration.event_id}`;
    const qrCode = await QRCode.toDataURL(qrData, { width: 300 });
    return { qrcode: qrCode, registration };
  }

  remove(id: number) {
    return this.registrationsRepository.update(id, { status: 'cancelled' });
  }
}
