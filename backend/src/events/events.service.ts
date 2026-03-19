import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { Registration } from '../registrations/entities/registration.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
    @InjectRepository(Registration)
    private registrationsRepository: Repository<Registration>,
  ) {}

  create(createEventDto: CreateEventDto) {
    const event = this.eventsRepository.create({ ...createEventDto, status: 'draft' });
    return this.eventsRepository.save(event);
  }

  // Public list: only show published events
  async findAll() {
    return this.eventsRepository
      .createQueryBuilder('event')
      .where("event.status = 'published'")
      .loadRelationCountAndMap(
        'event.registration_count',
        'event.registrations',
        'reg',
        (qb) => qb.where("reg.status IN ('approved', 'checked_in')"),
      )
      .orderBy('event.date', 'ASC')
      .getMany();
  }

  // Admin list: show all statuses (draft, published, offline, deleted)
  async findAllForAdmin() {
    return this.eventsRepository
      .createQueryBuilder('event')
      .loadRelationCountAndMap(
        'event.registration_count',
        'event.registrations',
        'reg',
        (qb) => qb.where("reg.status IN ('approved', 'checked_in')"),
      )
      .orderBy('event.date', 'DESC')
      .getMany();
  }

  async toggleActive(id: number) {
    const event = await this.eventsRepository.findOneBy({ id });
    if (!event) return null;
    const newActive = !event.is_active;
    const newStatus = newActive ? 'published' : 'offline';
    await this.eventsRepository.update(id, { is_active: newActive, status: newStatus });
    return { id, is_active: newActive, status: newStatus };
  }

  // Set event offline (cannot delete when registrations exist)
  async setOffline(id: number) {
    const event = await this.eventsRepository.findOneBy({ id });
    if (!event) throw new NotFoundException('活动不存在');
    if (event.status === 'deleted') throw new ForbiddenException('活动已删除');
    await this.eventsRepository.update(id, { is_active: false, status: 'offline' });
    return { id, status: 'offline', is_active: false };
  }

  // findOne: return event regardless of status (detail page needs to show "已取消")
  findOne(id: number) {
    return this.eventsRepository
      .createQueryBuilder('event')
      .where('event.id = :id', { id })
      .loadRelationCountAndMap(
        'event.registration_count',
        'event.registrations',
        'reg',
        (qb) => qb.where("reg.status IN ('approved', 'checked_in')"),
      )
      .getOne();
  }

  async update(id: number, updateEventDto: UpdateEventDto) {
    const event = await this.eventsRepository.findOneBy({ id });
    if (!event) throw new NotFoundException('活动不存在');
    if (event.status === 'deleted') throw new ForbiddenException('已删除的活动不可编辑');
    if (new Date(event.date) < new Date()) throw new ForbiddenException('已结束的活动不可编辑');
    return this.eventsRepository.update(id, updateEventDto);
  }

  // Soft delete: only allowed when no registrations exist
  async remove(id: number) {
    const event = await this.eventsRepository.findOneBy({ id });
    if (!event) throw new NotFoundException('活动不存在');

    if (event.status === 'deleted') throw new ForbiddenException('活动已删除');

    // Block delete if event is ongoing (published) or ended with registrations
    const regCount = await this.registrationsRepository.count({
      where: { event_id: id },
    });

    if (regCount > 0) {
      throw new ForbiddenException('已有用户报名，无法删除，请下架活动');
    }

    // Soft delete
    await this.eventsRepository.update(id, { status: 'deleted', is_active: false });
    return { id, status: 'deleted' };
  }
}
