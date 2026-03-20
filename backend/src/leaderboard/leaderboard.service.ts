import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Registration } from '../registrations/entities/registration.entity';
import { UserPoints } from '../points/entities/user-points.entity';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(Registration)
    private registrationsRepository: Repository<Registration>,
    @InjectRepository(UserPoints)
    private userPointsRepository: Repository<UserPoints>,
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

  async getPointsLeaderboard() {
    const results = await this.userPointsRepository
      .createQueryBuilder('up')
      .select('up.user_id', 'userId')
      .addSelect('user.nickname', 'nickname')
      .addSelect('user.avatar', 'avatar')
      .addSelect('up.points_balance', 'points_balance')
      .innerJoin('up.user', 'user')
      .where('up.points_balance > 0')
      .orderBy('up.points_balance', 'DESC')
      .limit(50)
      .getRawMany();

    return results.map((r, index) => ({
      rank: index + 1,
      userId: r.userId,
      nickname: r.nickname,
      avatar: r.avatar,
      points_balance: parseInt(r.points_balance),
    }));
  }
}
