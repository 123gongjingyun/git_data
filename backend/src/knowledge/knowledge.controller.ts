import { Body, Controller, Get, Post } from "@nestjs/common";
import {
  KnowledgeCategoryTreeNodeDto,
  KnowledgeService,
} from "./knowledge.service";

@Controller("knowledge")
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get("categories/tree")
  getCategoryTree() {
    return this.knowledgeService.getCategoryTree();
  }

  @Post("categories/tree")
  saveCategoryTree(@Body() body: KnowledgeCategoryTreeNodeDto[]) {
    return this.knowledgeService.saveCategoryTree(body);
  }
}
