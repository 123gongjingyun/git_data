import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Customer } from "../domain/entities/customer.entity";
import { Lead } from "../domain/entities/lead.entity";
import { Opportunity } from "../domain/entities/opportunity.entity";
import { SolutionVersion } from "../domain/entities/solution-version.entity";
import { User } from "../domain/entities/user.entity";
import { UsersModule } from "../users/users.module";
import { BusinessSeedService } from "./business-seed.service";
import { OpportunitiesService } from "./opportunities.service";
import { OpportunitiesController } from "./opportunities.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Customer, Lead, Opportunity, SolutionVersion]),
    UsersModule,
  ],
  providers: [OpportunitiesService, BusinessSeedService],
  controllers: [OpportunitiesController],
})
export class OpportunitiesModule {}
