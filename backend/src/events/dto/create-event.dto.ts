import { IsString, IsNumber, IsDateString, IsOptional } from 'class-validator';

export class CreateEventDto {
  @IsString()
  title: string;

  @IsDateString()
  date: string;

  @IsString()
  location: string;

  @IsString()
  route: string;

  @IsString()
  description: string;

  @IsNumber()
  max_people: number;

  @IsOptional()
  @IsString()
  cover_image?: string;

  @IsDateString()
  @IsOptional()
  end_date?: string;

  @IsDateString()
  @IsOptional()
  signup_start_time?: string;

  @IsDateString()
  @IsOptional()
  signup_end_time?: string;

  @IsDateString()
  @IsOptional()
  event_start_time?: string;

  @IsDateString()
  @IsOptional()
  event_end_time?: string;

  @IsOptional()
  form_config?: any;
}
