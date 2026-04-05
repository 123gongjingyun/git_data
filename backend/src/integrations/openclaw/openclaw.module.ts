import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FeishuUserBinding } from "../../domain/entities/feishu-user-binding.entity";
import { User } from "../../domain/entities/user.entity";
import { FeishuModule } from "../feishu/feishu.module";
import { OpenClawController } from "./openclaw.controller";
import { OpenClawService } from "./openclaw.service";

@Module({
  imports: [FeishuModule, TypeOrmModule.forFeature([User, FeishuUserBinding])],
  controllers: [OpenClawController],
  providers: [OpenClawService],
  exports: [OpenClawService],
})
export class OpenClawModule {}
