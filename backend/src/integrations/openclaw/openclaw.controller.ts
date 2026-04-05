import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import {
  OpenClawQueryInput,
  OpenClawService,
  type OpenClawSkillName,
} from "./openclaw.service";

class ExecuteOpenClawSkillDto {
  platformUserId?: number;
  feishuOpenId?: string;
  queryText?: string;
  requestId?: string;
  input?: Record<string, unknown>;
}

class OpenClawQueryDto {
  platformUserId?: number;
  feishuOpenId?: string;
  queryText!: string;
  requestId?: string;
}

@Controller("integrations/openclaw")
export class OpenClawController {
  constructor(private readonly openClawService: OpenClawService) {}

  @Get("skills")
  listSkills(@Headers("x-openclaw-token") token?: string) {
    this.openClawService.assertSharedToken(token);
    return this.openClawService.listSkills();
  }

  @Post("skills/:name")
  executeSkill(
    @Param("name") name: OpenClawSkillName,
    @Body() body: ExecuteOpenClawSkillDto,
    @Headers("x-openclaw-token") token?: string,
  ) {
    this.openClawService.assertSharedToken(token);
    return this.openClawService.executeSkill(name, body);
  }

  @Post("query")
  query(
    @Body() body: OpenClawQueryDto,
    @Headers("x-openclaw-token") token?: string,
  ) {
    this.openClawService.assertSharedToken(token);
    return this.openClawService.query(body as OpenClawQueryInput);
  }
}
