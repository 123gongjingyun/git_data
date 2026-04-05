import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '获取仪表盘统计数据' })
  async getDashboardStats(@Query('timeRange') timeRange: string = 'month') {
    return this.analyticsService.getDashboardStats(timeRange);
  }

  @Get('funnel')
  @ApiOperation({ summary: '获取销售漏斗数据' })
  async getFunnelData(@Query('timeRange') timeRange: string = 'month') {
    return this.analyticsService.getFunnelData(timeRange);
  }

  @Get('trends')
  @ApiOperation({ summary: '获取业绩趋势数据' })
  async getTrendData(@Query('timeRange') timeRange: string = 'month') {
    return this.analyticsService.getTrendData(timeRange);
  }

  @Get('distribution')
  @ApiOperation({ summary: '获取行业分布数据' })
  async getDistributionData(@Query('timeRange') timeRange: string = 'month') {
    return this.analyticsService.getDistributionData(timeRange);
  }

  @Get('project-progress')
  @ApiOperation({ summary: '获取项目进度数据' })
  async getProjectProgress(@Query('timeRange') timeRange: string = 'month') {
    return this.analyticsService.getProjectProgress(timeRange);
  }
}
