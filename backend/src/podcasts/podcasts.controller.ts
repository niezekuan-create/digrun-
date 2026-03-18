import {
  Controller, Get, Post, Delete, Param, Body,
  UseInterceptors, UploadedFile, UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PodcastsService } from './podcasts.service';
import { CreatePodcastDto } from './dto/create-podcast.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('podcasts')
export class PodcastsController {
  constructor(private readonly podcastsService: PodcastsService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/audio',
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
          cb(null, unique + extname(file.originalname));
        },
      }),
      limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
    }),
  )
  uploadAudio(@UploadedFile() file: Express.Multer.File) {
    return { audio_url: `/uploads/audio/${file.filename}`, filename: file.filename };
  }

  @Post('upload-cover')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/podcast-covers',
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
          cb(null, unique + extname(file.originalname));
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadCover(@UploadedFile() file: Express.Multer.File) {
    return { cover_url: `/uploads/podcast-covers/${file.filename}` };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createPodcastDto: CreatePodcastDto) {
    return this.podcastsService.create(createPodcastDto);
  }

  @Get()
  findAll() {
    return this.podcastsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.podcastsService.findOne(+id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.podcastsService.remove(+id);
  }
}
