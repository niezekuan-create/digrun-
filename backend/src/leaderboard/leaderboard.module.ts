import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';
import { Registration } from '../registrations/entities/registration.entity';
import { UserPoints } from '../points/entities/user-points.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Registration, UserPoints])],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
})
export class LeaderboardModule {}
