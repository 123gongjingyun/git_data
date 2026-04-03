import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { Customer } from "./entities/customer.entity";
import { Lead } from "./entities/lead.entity";
import { Opportunity } from "./entities/opportunity.entity";
import { SolutionVersion } from "./entities/solution-version.entity";
import { ReviewRecord } from "./entities/review-record.entity";
import { KnowledgeCategoryGroup } from "./entities/knowledge-category-group.entity";
import { KnowledgeCategory } from "./entities/knowledge-category.entity";
import { WorkflowDefinition } from "./entities/workflow-definition.entity";
import { WorkflowNode } from "./entities/workflow-node.entity";
import { WorkflowNodeApprover } from "./entities/workflow-node-approver.entity";
import { ApprovalInstance } from "./entities/approval-instance.entity";
import { ApprovalInstanceNode } from "./entities/approval-instance-node.entity";
import { ApprovalAction } from "./entities/approval-action.entity";
import { FeishuCallbackLog } from "./entities/feishu-callback-log.entity";
import { FeishuUserBinding } from "./entities/feishu-user-binding.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Customer,
      Lead,
      Opportunity,
      SolutionVersion,
      ReviewRecord,
      KnowledgeCategoryGroup,
      KnowledgeCategory,
      WorkflowDefinition,
      WorkflowNode,
      WorkflowNodeApprover,
      ApprovalInstance,
      ApprovalInstanceNode,
      ApprovalAction,
      FeishuCallbackLog,
      FeishuUserBinding,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DomainModule {}
