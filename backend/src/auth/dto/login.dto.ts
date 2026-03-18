import { IsString, IsOptional } from 'class-validator';

export class LoginDto {
  @IsString()
  code: string;

  @IsString()
  @IsOptional()
  device_id?: string;
}
