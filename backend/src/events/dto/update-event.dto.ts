import { IsString, IsNumber, IsDateString, IsOptional } from 'class-validator';

export class UpdateEventDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  route?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  max_people?: number;

  @IsString()
  @IsOptional()
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
