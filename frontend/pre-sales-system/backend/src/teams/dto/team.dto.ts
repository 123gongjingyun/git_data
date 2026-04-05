import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  leaderId: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsEnum(['ACTIVE', 'INACTIVE', 'ARCHIVED'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
}

export class UpdateTeamDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  leaderId?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsEnum(['ACTIVE', 'INACTIVE', 'ARCHIVED'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
}

export class AddMemberDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsOptional()
  role?: string;
}

export class RemoveMemberDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}
