import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WorkflowDefinition } from "../domain/entities/workflow-definition.entity";
import { WorkflowNode } from "../domain/entities/workflow-node.entity";
import { WorkflowNodeApprover } from "../domain/entities/workflow-node-approver.entity";
import { WorkflowsController } from "./workflows.controller";
import { WorkflowsService } from "./workflows.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowDefinition,
      WorkflowNode,
      WorkflowNodeApprover,
    ]),
  ],
  providers: [WorkflowsService],
  controllers: [WorkflowsController],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
