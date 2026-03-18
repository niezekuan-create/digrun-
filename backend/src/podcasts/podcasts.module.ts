import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PodcastsService } from './podcasts.service';
import { PodcastsController } from './podcasts.controller';
import { Podcast } from './entities/podcast.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Podcast])],
  controllers: [PodcastsController],
  providers: [PodcastsService],
})
export class PodcastsModule {}
