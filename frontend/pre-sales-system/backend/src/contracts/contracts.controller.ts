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
import { ContractsService } from './contracts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  @ApiOperation({ summary: '获取合同列表' })
  async findAll(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.contractsService.findAll({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      status,
      keyword,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '获取合同详情' })
  async findOne(@Param('id') id: string) {
    return this.contractsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建合同' })
  async create(@Body() createDto: any) {
    return this.contractsService.create(createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新合同' })
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.contractsService.update(id, updateDto);
  }

  @Put(':id/approve')
  @ApiOperation({ summary: '审批合同' })
  async approve(@Param('id') id: string, @Body('approvedBy') approvedBy: string) {
    return this.contractsService.approve(id, approvedBy);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除合同' })
  async remove(@Param('id') id: string) {
    return this.contractsService.remove(id);
  }
}
