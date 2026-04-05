import { Controller, Get, Query } from "@nestjs/common";
import { ListOpportunitiesQuery } from "./opportunities.service";
import { MockOpportunitiesService } from "./mock-opportunities.service";

@Controller("opportunities")
export class MockOpportunitiesController {
  constructor(
    private readonly mockOpportunitiesService: MockOpportunitiesService,
  ) {}

  @Get()
  findAll(@Query() query: ListOpportunitiesQuery) {
    return this.mockOpportunitiesService.findAll(query);
  }
}
