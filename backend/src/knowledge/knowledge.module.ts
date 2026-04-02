import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { KnowledgeController } from "./knowledge.controller";
import { KnowledgeService } from "./knowledge.service";
import { KnowledgeCategoryGroup } from "../domain/entities/knowledge-category-group.entity";
import { KnowledgeCategory } from "../domain/entities/knowledge-category.entity";

@Module({
  imports: [TypeOrmModule.forFeature([KnowledgeCategoryGroup, KnowledgeCategory])],
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
})
export class KnowledgeModule {}
