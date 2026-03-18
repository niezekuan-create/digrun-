import { Controller, Get, Query } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  getLeaderboard(@Query('event_id') eventId?: string) {
    return this.leaderboardService.getLeaderboard(eventId ? +eventId : undefined);
  }
}
