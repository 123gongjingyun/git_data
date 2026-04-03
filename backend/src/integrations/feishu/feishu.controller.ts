import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { type AuthenticatedUser } from "../../auth/auth.service";
import {
  CreateFeishuBindingInput,
  FeishuService,
  UpdateFeishuBindingInput,
} from "./feishu.service";
import type { Request } from "express";

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

class CreateFeishuBindingDto {
  feishuOpenId!: string;
  feishuUnionId?: string;
  feishuUserId?: string;
  feishuName?: string;
  platformUserId!: number;
  status?: "active" | "disabled" | "pending";
}

class UpdateFeishuBindingDto {
  platformUserId?: number;
  status?: "active" | "disabled" | "pending";
}

class FeishuEventDto {
  challenge?: string;
  token?: string;
  schema?: string;
  header?: Record<string, unknown>;
  event?: Record<string, unknown>;
}

class FeishuCardActionDto {
  open_id?: string;
  open_message_id?: string;
  token?: string;
  action?: Record<string, unknown>;
  event_id?: string;
}

@Controller("integrations/feishu")
export class FeishuController {
  constructor(private readonly feishuService: FeishuService) {}

  @Post("events")
  handleEvents(@Body() body: FeishuEventDto, @Req() req: Request) {
    return this.feishuService.handleEventCallback(
      { ...body },
      {
        headers: req.headers as Record<string, string | string[] | undefined>,
        rawBody:
          typeof (req as Request & { rawBody?: Buffer }).rawBody !== "undefined"
            ? (req as Request & { rawBody?: Buffer }).rawBody?.toString("utf8")
            : undefined,
      },
    );
  }

  @Post("cards/action")
  handleCardAction(@Body() body: FeishuCardActionDto, @Req() req: Request) {
    return this.feishuService.handleCardAction(
      { ...body },
      {
        headers: req.headers as Record<string, string | string[] | undefined>,
        rawBody:
          typeof (req as Request & { rawBody?: Buffer }).rawBody !== "undefined"
            ? (req as Request & { rawBody?: Buffer }).rawBody?.toString("utf8")
            : undefined,
      },
    );
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("bindings")
  listBindings(@Req() req: AuthenticatedRequest) {
    this.assertManageFeishu(req.user);
    return this.feishuService.listBindings();
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("bindings")
  createBinding(
    @Body() body: CreateFeishuBindingDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertManageFeishu(req.user);
    return this.feishuService.createBinding(
      {
        feishuOpenId: body.feishuOpenId,
        feishuUnionId: body.feishuUnionId,
        feishuUserId: body.feishuUserId,
        feishuName: body.feishuName,
        platformUserId: body.platformUserId,
        status: body.status,
      } satisfies CreateFeishuBindingInput,
      req.user,
    );
  }

  @UseGuards(AuthGuard("jwt"))
  @Patch("bindings/:id")
  updateBinding(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateFeishuBindingDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertManageFeishu(req.user);
    return this.feishuService.updateBinding(
      id,
      {
        platformUserId: body.platformUserId,
        status: body.status,
      } satisfies UpdateFeishuBindingInput,
      req.user,
    );
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("me/pending-approvals")
  getPendingApprovals(
    @Req() req: AuthenticatedRequest,
    @Query("limit") limit?: string,
    @Query("businessType") businessType?: "opportunity" | "solution",
  ) {
    return this.feishuService.getPendingApprovals(req.user, {
      limit: Number(limit) || undefined,
      businessType,
    });
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("opportunities/:code/summary")
  getOpportunitySummary(
    @Param("code") code: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.feishuService.getOpportunitySummary(code, req.user);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("solutions/:code/summary")
  getSolutionSummary(
    @Param("code") code: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.feishuService.getSolutionSummary(code, req.user);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("me/daily-brief")
  getDailyBrief(@Req() req: AuthenticatedRequest) {
    return this.feishuService.getDailyBrief(req.user);
  }

  private assertManageFeishu(user: AuthenticatedUser) {
    if (!(user.role === "admin" || user.role === "manager")) {
      throw new ForbiddenException("当前角色无权维护飞书集成配置");
    }
  }
}
