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

  @IsOptional()
  form_config?: any;
}
