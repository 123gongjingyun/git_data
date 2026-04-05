import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { TimeLogsService } from './timelogs.service';
import { CreateTimeLogDto, UpdateTimeLogDto } from './dto/timelog.dto';

@Controller('time-logs')
export class TimeLogsController {
  constructor(private readonly timeLogsService: TimeLogsService) {}

  @Post()
  create(@Body() createTimeLogDto: CreateTimeLogDto) {
    return this.timeLogsService.create(createTimeLogDto);
  }

  @Get()
  findAll(
    @Query('taskId') taskId?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20,
  ) {
    return this.timeLogsService.findAll({
      taskId,
      userId,
      startDate,
      endDate,
      page,
      limit,
    });
  }

  @Get('statistics/user/:userId')
  getUserStatistics(
    @Param('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.timeLogsService.getUserStatistics(userId, startDate, endDate);
  }

  @Get('statistics/task/:taskId')
  getTaskStatistics(@Param('taskId') taskId: string) {
    return this.timeLogsService.getTaskStatistics(taskId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.timeLogsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTimeLogDto: UpdateTimeLogDto) {
    return this.timeLogsService.update(id, updateTimeLogDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.timeLogsService.remove(id);
  }
}
