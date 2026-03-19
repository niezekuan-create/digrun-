import { IsNumber, IsString, IsBoolean, IsOptional, IsObject, MaxLength } from 'class-validator';

export class CreateRegistrationDto {
  @IsNumber()
  event_id: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  pace?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  distance?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  top_size?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  pants_size?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  shoe_size?: string;

  @IsBoolean()
  @IsOptional()
  bag_storage?: boolean;

  @IsBoolean()
  @IsOptional()
  coffee?: boolean;

  @IsObject()
  @IsOptional()
  form_data?: Record<string, string>;
}
