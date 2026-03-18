import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateRegistrationDto {
  @IsString()
  @IsOptional()
  pace?: string;

  @IsString()
  @IsOptional()
  distance?: string;

  @IsBoolean()
  @IsOptional()
  bag_storage?: boolean;

  @IsBoolean()
  @IsOptional()
  coffee?: boolean;

  @IsString()
  @IsOptional()
  status?: string;
}
