import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  SolutionStatus,
  SolutionVersion,
} from "../domain/entities/solution-version.entity";
import { Opportunity } from "../domain/entities/opportunity.entity";
import {
  ReviewRecord,
  ReviewStatus,
} from "../domain/entities/review-record.entity";
import { User } from "../domain/entities/user.entity";
import { AuthUserPayload } from "../auth/auth.service";

export interface CreateSolutionVersionDto {
  name: string;
  versionTag?: string;
  status: SolutionStatus;
  summary?: string;
}

export interface UpdateSolutionVersionDto {
  name?: string;
  versionTag?: string;
  status?: SolutionStatus;
  summary?: string;
}

export interface ListSolutionVersionsQuery {
  status?: string;
}

// 与前端 useReviewRecords 中的类型保持一致
export type ReviewDecision = ReviewStatus | "needs_change" | "info_only";

export interface ReviewRecordDto {
  id: number;
  solutionVersionId: number;
  decision: ReviewDecision;
  comment: string;
  reviewerName?: string;
  createdAt: string;
}

export interface CreateReviewRecordInput {
  decision: ReviewDecision;
  comment: string;
}

@Injectable()
export class SolutionVersionsService {
  constructor(
    @InjectRepository(SolutionVersion)
    private readonly solutionRepository: Repository<SolutionVersion>,
    @InjectRepository(Opportunity)
    private readonly opportunityRepository: Repository<Opportunity>,
    @InjectRepository(ReviewRecord)
    private readonly reviewRepository: Repository<ReviewRecord>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createForOpportunity(
    opportunityId: number,
    dto: CreateSolutionVersionDto,
    currentUser?: AuthUserPayload,
  ) {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id: opportunityId },
    });

    if (!opportunity) {
      throw new NotFoundException("关联商机不存在");
    }

    const creatorId = (currentUser as { id?: number; sub?: number } | undefined)?.id ??
      currentUser?.sub;
    const solution = this.solutionRepository.create({
      name: dto.name,
      versionTag: dto.versionTag,
      status: dto.status,
      summary: dto.summary,
      opportunity: { id: opportunityId } as Opportunity,
      createdBy: creatorId ? ({ id: creatorId } as User) : undefined,
    });

    return this.solutionRepository.save(solution);
  }

  async findForOpportunity(
    opportunityId: number,
    query: ListSolutionVersionsQuery,
  ) {
    const qb = this.solutionRepository
      .createQueryBuilder("solution")
      .leftJoinAndSelect("solution.createdBy", "createdBy")
      .where("solution.opportunityId = :opportunityId", { opportunityId })
      .orderBy("solution.createdAt", "DESC");

    if (query.status) {
      qb.andWhere("solution.status = :status", { status: query.status });
    }

    return qb.getMany();
  }

  async findOne(id: number) {
    const solution = await this.solutionRepository.findOne({
      where: { id },
      relations: ["opportunity", "createdBy", "reviewRecords"],
    });

    if (!solution) {
      throw new NotFoundException("方案版本不存在");
    }

    return solution;
  }

  async update(id: number, dto: UpdateSolutionVersionDto) {
    const solution = await this.solutionRepository.findOne({
      where: { id },
    });

    if (!solution) {
      throw new NotFoundException("方案版本不存在");
    }

    if (dto.name !== undefined) {
      solution.name = dto.name;
    }
    if (dto.versionTag !== undefined) {
      solution.versionTag = dto.versionTag;
    }
    if (dto.status !== undefined) {
      solution.status = dto.status;
    }
    if (dto.summary !== undefined) {
      solution.summary = dto.summary;
    }

    return this.solutionRepository.save(solution);
  }

  async remove(id: number) {
    const solution = await this.solutionRepository.findOne({
      where: { id },
    });

    if (!solution) {
      throw new NotFoundException("方案版本不存在");
    }

    await this.solutionRepository.remove(solution);
    return { success: true };
  }

  private toReviewRecordDto(
    record: ReviewRecord,
    solutionVersionIdOverride?: number,
  ): ReviewRecordDto {
    const reviewerName =
      record.reviewer?.displayName || record.reviewer?.username;

    return {
      id: record.id,
      solutionVersionId:
        solutionVersionIdOverride ?? record.solutionVersion?.id ?? 0,
      decision: record.status as ReviewDecision,
      comment: record.comments || "",
      reviewerName: reviewerName || undefined,
      createdAt: record.createdAt.toISOString(),
    };
  }

  async listReviewRecords(solutionVersionId: number): Promise<ReviewRecordDto[]> {
    const solution = await this.solutionRepository.findOne({
      where: { id: solutionVersionId },
    });

    if (!solution) {
      throw new NotFoundException("方案版本不存在");
    }

    const records = await this.reviewRepository.find({
      where: { solutionVersion: { id: solutionVersionId } },
      relations: ["reviewer", "solutionVersion"],
      order: { createdAt: "DESC" },
    });

    return records.map((record) =>
      this.toReviewRecordDto(record, solutionVersionId),
    );
  }

  async createReviewRecord(
    solutionVersionId: number,
    input: CreateReviewRecordInput,
    reviewerPayload: AuthUserPayload,
  ): Promise<ReviewRecordDto> {
    const solution = await this.solutionRepository.findOne({
      where: { id: solutionVersionId },
    });

    if (!solution) {
      throw new NotFoundException("方案版本不存在");
    }

    let reviewer = await this.userRepository.findOne({
      where: { username: reviewerPayload.username },
    });

    if (!reviewer) {
      reviewer = this.userRepository.create({
        username: reviewerPayload.username,
        displayName: reviewerPayload.username,
        role: "pre_sales_engineer",
        isActive: true,
      });
      reviewer = await this.userRepository.save(reviewer);
    }

    const record = this.reviewRepository.create({
      solutionVersion: { id: solutionVersionId } as SolutionVersion,
      reviewer,
      status: input.decision as ReviewStatus,
      comments: input.comment,
    });

    const saved = await this.reviewRepository.save(record);
    return this.toReviewRecordDto(saved, solutionVersionId);
  }
}
