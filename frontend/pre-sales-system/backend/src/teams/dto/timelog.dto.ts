import { IsString, IsOptional, IsNumber, IsDateString, IsNotEmpty } from 'class-validator';

export class CreateTimeLogDto {
  @IsString()
  @IsNotEmpty()
  taskId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsNumber()
  @IsNotEmpty()
  hours: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateTimeLogDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsNumber()
  @IsOptional()
  hours?: number;

  @IsString()
  @IsOptional()
  description?: string;
}
