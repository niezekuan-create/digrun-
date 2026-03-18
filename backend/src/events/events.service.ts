import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
  ) {}

  create(createEventDto: CreateEventDto) {
    const event = this.eventsRepository.create({ ...createEventDto, status: 'draft' });
    return this.eventsRepository.save(event);
  }

  async findAll() {
    return this.eventsRepository
      .createQueryBuilder('event')
      .where('event.is_active = true')
      .loadRelationCountAndMap(
        'event.registration_count',
        'event.registrations',
        'reg',
        (qb) => qb.where("reg.status IN ('approved', 'checked_in')"),
      )
      .orderBy('event.date', 'ASC')
      .getMany();
  }

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
    const newStatus = newActive ? 'published' : 'draft';
    await this.eventsRepository.update(id, { is_active: newActive, status: newStatus });
    return { id, is_active: newActive, status: newStatus };
  }

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
    if (!event) throw new NotFoundException('Event not found');
    if (event.status === 'published') {
      throw new ForbiddenException('已发布的活动不可编辑，请下架后修改');
    }
    return this.eventsRepository.update(id, updateEventDto);
  }

  async remove(id: number) {
    const event = await this.eventsRepository.findOneBy({ id });
    if (!event) throw new NotFoundException('Event not found');
    if (event.status === 'published') {
      throw new ForbiddenException('已发布的活动不可删除');
    }
    return this.eventsRepository.delete(id);
  }
}
