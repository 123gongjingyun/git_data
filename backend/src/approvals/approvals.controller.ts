import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AuthUserPayload } from "../auth/auth.service";
import {
  ApprovalActionInput,
  ApprovalsService,
  ListApprovalInstancesQuery,
  StartApprovalInstanceInput,
} from "./approvals.service";

interface AuthenticatedRequest {
  user: AuthUserPayload;
}

@UseGuards(AuthGuard("jwt"))
@Controller("approval-instances")
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get("current")
  findLatestForBusiness(
    @Query() query: ListApprovalInstancesQuery,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.approvalsService.findLatestForBusiness(
      {
        businessType: query.businessType,
        businessId: Number(query.businessId),
      },
      req.user,
    );
  }

  @Get(":id")
  findOne(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.approvalsService.findOne(id, req.user);
  }

  @Post("start")
  start(
    @Body() input: StartApprovalInstanceInput,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.approvalsService.startInstance(input, req.user);
  }

  @Post(":id/actions")
  executeAction(
    @Param("id", ParseIntPipe) id: number,
    @Body() input: ApprovalActionInput,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.approvalsService.executeAction(id, input, req.user);
  }
}
