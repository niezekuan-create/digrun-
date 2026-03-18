import { IsString, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  nickname: string;

  @IsString()
  wechat_openid: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  city?: string;
}
