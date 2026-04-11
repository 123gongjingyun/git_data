import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { type AuthenticatedUser } from "../../auth/auth.service";
import {
  OpenClawQueryInput,
  OpenClawService,
  type OpenClawSkillName,
} from "./openclaw.service";

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

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

class OpenClawPlaygroundQueryDto {
  queryText!: string;
  requestId?: string;
}

class OpenClawPlaygroundExecuteSkillDto {
  input?: Record<string, unknown>;
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

  @UseGuards(AuthGuard("jwt"))
  @Get("playground/skills")
  listPlaygroundSkills() {
    return this.openClawService.listSkills();
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("playground/skills/:name")
  async executeSkillFromPlayground(
    @Param("name") name: OpenClawSkillName,
    @Body() body: OpenClawPlaygroundExecuteSkillDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const execution = await this.openClawService.executeSkill(name, {
      platformUserId: req.user.id,
      requestId: body.requestId,
      input: body.input,
    });

    return {
      requestId: execution.requestId,
      queryText: "",
      intent: {
        skillName: execution.skillName,
        arguments: body.input || {},
        reason: "playground_skill_execution",
      },
      actor: execution.actor,
      result: execution.result,
    };
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("playground/query")
  queryFromPlayground(
    @Body() body: OpenClawPlaygroundQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.openClawService.query({
      platformUserId: req.user.id,
      queryText: body.queryText,
      requestId: body.requestId,
    });
  }
}
