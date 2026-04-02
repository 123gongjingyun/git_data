import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { ProjectStatus, Priority, ProjectStage } from '@prisma/client';

export class CreateProjectDto {
  @ApiProperty({ description: '项目名称', example: '某企业数字化转型项目' })
  @IsNotEmpty({ message: '项目名称不能为空' })
  @IsString()
  name: string;

  @ApiProperty({ description: '项目描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '项目状态', enum: ProjectStatus, default: ProjectStatus.LEAD })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiProperty({ description: '优先级', enum: Priority, default: Priority.MEDIUM })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiProperty({ description: '预算', required: false, example: 1000000 })
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiProperty({ description: '期望价值', required: false, example: 1200000 })
  @IsOptional()
  @IsNumber()
  expectedValue?: number;

  @ApiProperty({ description: '客户名称', example: '某某科技有限公司' })
  @IsNotEmpty({ message: '客户名称不能为空' })
  @IsString()
  customerName: string;

  @ApiProperty({ description: '客户联系人', required: false })
  @IsOptional()
  @IsString()
  customerContact?: string;

  @ApiProperty({ description: '客户电话', required: false })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty({ description: '客户邮箱', required: false })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiProperty({ description: '行业', required: false, example: '制造业' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({ description: '地区', required: false, example: '华东' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ description: '开始日期', required: false })
  @IsOptional()
  startDate?: Date;

  @ApiProperty({ description: '预计成交日期', required: false })
  @IsOptional()
  expectedCloseDate?: Date;

  @ApiProperty({ description: '当前阶段', enum: ProjectStage, default: ProjectStage.DISCOVERY })
  @IsOptional()
  @IsEnum(ProjectStage)
  currentStage?: ProjectStage;

  @ApiProperty({ description: '分配给', required: false })
  @IsOptional()
  @IsString()
  assignedTo?: string;
}
