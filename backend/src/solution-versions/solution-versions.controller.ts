import {
  Body,
  Controller,
  Delete,
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
import {
  CreateSolutionVersionDto,
  CreateReviewRecordInput,
  ListSolutionVersionsQuery,
  SolutionVersionsService,
  UpdateSolutionVersionDto,
} from "./solution-versions.service";
import { AuthUserPayload } from "../auth/auth.service";

interface AuthenticatedRequest {
  user: AuthUserPayload;
}

@UseGuards(AuthGuard("jwt"))
@Controller()
export class SolutionVersionsController {
  constructor(
    private readonly solutionVersionsService: SolutionVersionsService,
  ) {}

  @Post("opportunities/:id/solutions")
  createForOpportunity(
    @Param("id", ParseIntPipe) opportunityId: number,
    @Body() dto: CreateSolutionVersionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.solutionVersionsService.createForOpportunity(
      opportunityId,
      dto,
      req.user,
    );
  }

  @Get("opportunities/:id/solutions")
  listForOpportunity(
    @Param("id", ParseIntPipe) opportunityId: number,
    @Query() query: ListSolutionVersionsQuery,
  ) {
    return this.solutionVersionsService.findForOpportunity(
      opportunityId,
      query,
    );
  }

  @Get("solutions/:id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.solutionVersionsService.findOne(id);
  }

  @Patch("solutions/:id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateSolutionVersionDto,
  ) {
    return this.solutionVersionsService.update(id, dto);
  }

  @Delete("solutions/:id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.solutionVersionsService.remove(id);
  }

  @Get("solutions/:id/reviews")
  listReviews(@Param("id", ParseIntPipe) solutionVersionId: number) {
    return this.solutionVersionsService.listReviewRecords(solutionVersionId);
  }

  @Post("solutions/:id/reviews")
  createReview(
    @Param("id", ParseIntPipe) solutionVersionId: number,
    @Body() body: CreateReviewRecordInput,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.solutionVersionsService.createReviewRecord(
      solutionVersionId,
      body,
      req.user,
    );
  }
}
