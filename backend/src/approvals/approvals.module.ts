import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ApprovalAction } from "../domain/entities/approval-action.entity";
import { ApprovalInstance } from "../domain/entities/approval-instance.entity";
import { ApprovalInstanceNode } from "../domain/entities/approval-instance-node.entity";
import { Opportunity } from "../domain/entities/opportunity.entity";
import { SolutionVersion } from "../domain/entities/solution-version.entity";
import { User } from "../domain/entities/user.entity";
import { WorkflowDefinition } from "../domain/entities/workflow-definition.entity";
import { ApprovalsController } from "./approvals.controller";
import { ApprovalsService } from "./approvals.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApprovalInstance,
      ApprovalInstanceNode,
      ApprovalAction,
      WorkflowDefinition,
      Opportunity,
      SolutionVersion,
      User,
    ]),
  ],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
