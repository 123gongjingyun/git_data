import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import {
  CreateOpportunityDto,
  ListOpportunitiesQuery,
  OpportunitiesService,
  UpdateOpportunityDto,
} from "./opportunities.service";

@UseGuards(AuthGuard("jwt"))
@Controller("opportunities")
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Post()
  create(@Body() dto: CreateOpportunityDto) {
    return this.opportunitiesService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListOpportunitiesQuery) {
    const normalizedQuery: ListOpportunitiesQuery = {
      ...query,
      ownerId: query.ownerId ? Number(query.ownerId) : undefined,
      customerId: query.customerId ? Number(query.customerId) : undefined,
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    };

    return this.opportunitiesService.findAll(normalizedQuery);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.opportunitiesService.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateOpportunityDto,
  ) {
    return this.opportunitiesService.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.opportunitiesService.remove(id);
  }
}

