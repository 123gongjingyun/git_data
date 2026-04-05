import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto, UpdateTaskProgressDto, AddSubTaskDto } from './dto/task.dto';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(createTaskDto);
  }

  @Get()
  findAll(
    @Query('projectId') projectId?: string,
    @Query('teamId') teamId?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20,
  ) {
    return this.tasksService.findAll({
      projectId,
      teamId,
      assignedTo,
      status,
      priority,
      page,
      limit,
    });
  }

  @Get('my')
  findMyTasks(
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo: string,
  ) {
    return this.tasksService.findMyTasks(assignedTo, status);
  }

  @Get('statistics/summary')
  getTaskSummary() {
    return this.tasksService.getTaskSummary();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Get(':id/subtasks')
  findSubTasks(@Param('id') id: string) {
    return this.tasksService.findSubTasks(id);
  }

  @Post(':id/subtasks')
  addSubTask(@Param('id') id: string, @Body() addSubTaskDto: AddSubTaskDto) {
    return this.tasksService.addSubTask(id, addSubTaskDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.update(id, updateTaskDto);
  }

  @Patch(':id/progress')
  updateProgress(@Param('id') id: string, @Body() updateTaskProgressDto: UpdateTaskProgressDto) {
    return this.tasksService.updateProgress(id, updateTaskProgressDto.progress);
  }

  @Patch(':id/complete')
  completeTask(@Param('id') id: string) {
    return this.tasksService.completeTask(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
