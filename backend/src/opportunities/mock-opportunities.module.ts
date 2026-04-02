import { Module } from "@nestjs/common";
import { MockOpportunitiesController } from "./mock-opportunities.controller";
import { MockOpportunitiesService } from "./mock-opportunities.service";

@Module({
  controllers: [MockOpportunitiesController],
  providers: [MockOpportunitiesService],
})
export class MockOpportunitiesModule {}

