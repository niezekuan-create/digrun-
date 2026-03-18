import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Registration } from '../registrations/entities/registration.entity';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(Registration)
    private registrationsRepository: Repository<Registration>,
  ) {}

  async getLeaderboard(eventId?: number) {
    const query = this.registrationsRepository
      .createQueryBuilder('registration')
      .select('registration.user_id', 'userId')
      .addSelect('user.nickname', 'nickname')
      .addSelect('user.avatar', 'avatar')
      .addSelect('COUNT(registration.id)', 'checkin_count')
      .innerJoin('registration.user', 'user')
      .where('registration.status = :status', { status: 'checked_in' })
      .groupBy('registration.user_id')
      .addGroupBy('user.nickname')
      .addGroupBy('user.avatar')
      .orderBy('checkin_count', 'DESC')
      .limit(50);

    if (eventId) {
      query.andWhere('registration.event_id = :eventId', { eventId });
    }

    const results = await query.getRawMany();
    return results.map((r, index) => ({
      rank: index + 1,
      userId: r.userId,
      nickname: r.nickname,
      avatar: r.avatar,
      checkin_count: parseInt(r.checkin_count),
    }));
  }
}
