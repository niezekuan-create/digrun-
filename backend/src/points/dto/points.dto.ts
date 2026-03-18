import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsNumber()
  points_cost: number;

  @IsNumber()
  stock: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  product_type?: string;

  @IsArray()
  @IsOptional()
  size_options?: string[];
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsNumber()
  @IsOptional()
  points_cost?: number;

  @IsNumber()
  @IsOptional()
  stock?: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  product_type?: string;

  @IsArray()
  @IsOptional()
  size_options?: string[];
}

export class UpdateOrderStatusDto {
  @IsString()
  status: string;
}
