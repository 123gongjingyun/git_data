import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SolutionVersion } from "../domain/entities/solution-version.entity";
import { Opportunity } from "../domain/entities/opportunity.entity";
import { ReviewRecord } from "../domain/entities/review-record.entity";
import { User } from "../domain/entities/user.entity";
import { SolutionVersionsService } from "./solution-versions.service";
import { SolutionVersionsController } from "./solution-versions.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([SolutionVersion, Opportunity, ReviewRecord, User]),
  ],
  providers: [SolutionVersionsService],
  controllers: [SolutionVersionsController],
})
export class SolutionVersionsModule {}
