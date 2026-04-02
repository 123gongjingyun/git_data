import { IsString, IsOptional, IsEnum, IsNotEmpty, IsNumber, IsDateString } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  teamId?: string;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsString()
  @IsOptional()
  parentTaskId?: string;

  @IsEnum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'BLOCKED'])
  @IsOptional()
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'BLOCKED';

  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  @IsOptional()
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsNumber()
  @IsOptional()
  estimatedHours?: number;

  @IsString()
  @IsOptional()
  tags?: string;
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  teamId?: string;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsEnum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'BLOCKED'])
  @IsOptional()
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'BLOCKED';

  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  @IsOptional()
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsNumber()
  @IsOptional()
  estimatedHours?: number;

  @IsNumber()
  @IsOptional()
  actualHours?: number;

  @IsString()
  @IsOptional()
  tags?: string;
}

export class UpdateTaskProgressDto {
  @IsNumber()
  @IsNotEmpty()
  progress: number;
}

export class AddSubTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  @IsOptional()
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
