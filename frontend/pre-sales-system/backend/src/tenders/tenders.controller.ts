import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TendersService } from './tenders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('tenders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenders')
export class TendersController {
  constructor(private readonly tendersService: TendersService) {}

  @Get()
  @ApiOperation({ summary: '获取投标列表' })
  async findAll(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.tendersService.findAll({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      status,
      type,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '获取投标详情' })
  async findOne(@Param('id') id: string) {
    return this.tendersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建投标' })
  async create(@Body() createDto: any) {
    return this.tendersService.create(createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新投标' })
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.tendersService.update(id, updateDto);
  }

  @Put(':id/status')
  @ApiOperation({ summary: '更新投标状态' })
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.tendersService.updateStatus(id, status);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除投标' })
  async remove(@Param('id') id: string) {
    return this.tendersService.remove(id);
  }
}
