import {
  Controller, Get, Post, Delete, Param, Body,
  UseInterceptors, UploadedFile, UseGuards, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

const imageFileFilter = (req: any, file: Express.Multer.File, cb: Function) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new BadRequestException('仅允许上传 jpg / png / webp / gif 图片'), false);
  }
  cb(null, true);
};

const audioFileFilter = (req: any, file: Express.Multer.File, cb: Function) => {
  const allowed = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/wav', 'audio/x-m4a'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new BadRequestException('仅允许上传 mp3 / m4a / wav 音频文件'), false);
  }
  cb(null, true);
};
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
      fileFilter: audioFileFilter,
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
      fileFilter: imageFileFilter,
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
