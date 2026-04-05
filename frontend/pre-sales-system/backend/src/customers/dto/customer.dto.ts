import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(['POTENTIAL', 'ACTIVE', 'PARTNER'])
  @IsOptional()
  type?: 'POTENTIAL' | 'ACTIVE' | 'PARTNER';

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  scale?: string;

  @IsEnum(['A', 'B', 'C'])
  @IsOptional()
  level?: 'A' | 'B' | 'C';

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsEnum(['ACTIVE', 'INACTIVE', 'LOST'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE' | 'LOST';

  @IsString()
  @IsNotEmpty()
  owner: string;
}

export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(['POTENTIAL', 'ACTIVE', 'PARTNER'])
  @IsOptional()
  type?: 'POTENTIAL' | 'ACTIVE' | 'PARTNER';

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  scale?: string;

  @IsEnum(['A', 'B', 'C'])
  @IsOptional()
  level?: 'A' | 'B' | 'C';

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsEnum(['ACTIVE', 'INACTIVE', 'LOST'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE' | 'LOST';

  @IsString()
  @IsOptional()
  owner?: string;
}
