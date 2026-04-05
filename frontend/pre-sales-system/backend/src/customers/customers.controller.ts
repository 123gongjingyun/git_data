import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  findAll(
    @Query('type') type?: string,
    @Query('level') level?: string,
    @Query('status') status?: string,
    @Query('industry') industry?: string,
    @Query('owner') owner?: string,
    @Query('keyword') keyword?: string,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20,
  ) {
    return this.customersService.findAll({
      type,
      level,
      status,
      industry,
      owner,
      keyword,
      page,
      limit,
    });
  }

  @Get('statistics/summary')
  getCustomerSummary() {
    return this.customersService.getCustomerSummary();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Get(':id/contacts')
  findContacts(@Param('id') id: string) {
    return this.customersService.findContacts(id);
  }

  @Get(':id/projects')
  findProjects(@Param('id') id: string) {
    return this.customersService.findProjects(id);
  }

  @Get(':id/followups')
  findFollowups(@Param('id') id: string) {
    return this.customersService.findFollowups(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Patch(':id/transfer')
  transfer(@Param('id') id: string, @Body('newOwnerId') newOwnerId: string) {
    return this.customersService.transfer(id, newOwnerId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
