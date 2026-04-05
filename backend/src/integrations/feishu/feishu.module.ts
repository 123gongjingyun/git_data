import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ApprovalsModule } from "../../approvals/approvals.module";
import { FeishuController } from "./feishu.controller";
import { FeishuService } from "./feishu.service";
import { FeishuCallbackLog } from "../../domain/entities/feishu-callback-log.entity";
import { FeishuMessageLog } from "../../domain/entities/feishu-message-log.entity";
import { User } from "../../domain/entities/user.entity";
import { Opportunity } from "../../domain/entities/opportunity.entity";
import { SolutionVersion } from "../../domain/entities/solution-version.entity";
import { ApprovalInstance } from "../../domain/entities/approval-instance.entity";
import { FeishuUserBinding } from "../../domain/entities/feishu-user-binding.entity";

@Module({
  imports: [
    ApprovalsModule,
    TypeOrmModule.forFeature([
      User,
      Opportunity,
      SolutionVersion,
      ApprovalInstance,
      FeishuCallbackLog,
      FeishuMessageLog,
      FeishuUserBinding,
    ]),
  ],
  controllers: [FeishuController],
  providers: [FeishuService],
  exports: [FeishuService],
})
export class FeishuModule {}
