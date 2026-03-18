import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Podcast } from './entities/podcast.entity';
import { CreatePodcastDto } from './dto/create-podcast.dto';

@Injectable()
export class PodcastsService {
  constructor(
    @InjectRepository(Podcast)
    private podcastsRepository: Repository<Podcast>,
  ) {}

  create(createPodcastDto: CreatePodcastDto) {
    const podcast = this.podcastsRepository.create(createPodcastDto);
    return this.podcastsRepository.save(podcast);
  }

  findAll() {
    return this.podcastsRepository.find({ order: { episode: 'DESC', created_at: 'DESC' } });
  }

  findOne(id: number) {
    return this.podcastsRepository.findOneBy({ id });
  }

  remove(id: number) {
    return this.podcastsRepository.delete(id);
  }
}
