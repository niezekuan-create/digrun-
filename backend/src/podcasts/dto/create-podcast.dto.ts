import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreatePodcastDto {
  @IsString()
  title: string;

  @IsNumber()
  @IsOptional()
  episode?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  audio_url: string;

  @IsString()
  @IsOptional()
  cover_url?: string;

  @IsNumber()
  @IsOptional()
  duration?: number;
}
