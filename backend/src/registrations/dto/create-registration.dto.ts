import { IsNumber, IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateRegistrationDto {
  @IsNumber()
  event_id: number;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  pace?: string;

  @IsString()
  @IsOptional()
  distance?: string;

  @IsString()
  @IsOptional()
  top_size?: string;

  @IsString()
  @IsOptional()
  pants_size?: string;

  @IsString()
  @IsOptional()
  shoe_size?: string;

  @IsBoolean()
  @IsOptional()
  bag_storage?: boolean;

  @IsBoolean()
  @IsOptional()
  coffee?: boolean;

  @IsOptional()
  form_data?: any;
}
