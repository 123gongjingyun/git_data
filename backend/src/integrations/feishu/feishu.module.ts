import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FeishuController } from "./feishu.controller";
import { FeishuService } from "./feishu.service";
import { User } from "../../domain/entities/user.entity";
import { Opportunity } from "../../domain/entities/opportunity.entity";
import { SolutionVersion } from "../../domain/entities/solution-version.entity";
import { ApprovalInstance } from "../../domain/entities/approval-instance.entity";
import { FeishuUserBinding } from "../../domain/entities/feishu-user-binding.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Opportunity,
      SolutionVersion,
      ApprovalInstance,
      FeishuUserBinding,
    ]),
  ],
  controllers: [FeishuController],
  providers: [FeishuService],
  exports: [FeishuService],
})
export class FeishuModule {}
