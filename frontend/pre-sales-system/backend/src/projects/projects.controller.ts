import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: '创建项目' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER', 'SALES_MANAGER')
  async create(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.create(createProjectDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: '获取项目列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAll(@Query() query: QueryProjectsDto) {
    return this.projectsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取项目详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新项目' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER', 'SALES_MANAGER')
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.update(id, updateProjectDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除项目' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }

  @Get(':id/activities')
  @ApiOperation({ summary: '获取项目活动记录' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getActivities(@Param('id') id: string) {
    return this.projectsService.getActivities(id);
  }

  @Post(':id/activities')
  @ApiOperation({ summary: '添加项目活动记录' })
  @ApiResponse({ status: 201, description: '添加成功' })
  async addActivity(
    @Param('id') id: string,
    @Body() activityData: any,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.addActivity(id, activityData, user.id);
  }
}
