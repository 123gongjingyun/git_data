import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Opportunity,
  OpportunityStage,
} from "../domain/entities/opportunity.entity";

export interface CreateOpportunityDto {
  name: string;
  stage: OpportunityStage;
  expectedValue?: string;
  expectedCloseDate?: string;
  probability?: number;
  description?: string;
  approvalStatus?: "draft" | "pending" | "in_review" | "approved" | "rejected";
  bizApprovalStatus?: "pending" | "approved" | "rejected";
  techApprovalStatus?: "pending" | "approved" | "rejected";
  requirementBriefDocName?: string;
  researchDocName?: string;
  solutionOwnerUsername?: string;
  approvalOpinion?: string;
  customerId?: number;
  leadId?: number;
  ownerId?: number;
}

export interface UpdateOpportunityDto {
  name?: string;
  stage?: OpportunityStage;
  expectedValue?: string;
  expectedCloseDate?: string;
  probability?: number;
  description?: string;
  approvalStatus?: "draft" | "pending" | "in_review" | "approved" | "rejected" | null;
  bizApprovalStatus?: "pending" | "approved" | "rejected" | null;
  techApprovalStatus?: "pending" | "approved" | "rejected" | null;
  requirementBriefDocName?: string | null;
  researchDocName?: string | null;
  solutionOwnerUsername?: string | null;
  approvalOpinion?: string | null;
  customerId?: number | null;
  leadId?: number | null;
  ownerId?: number | null;
}

export interface ListOpportunitiesQuery {
  stage?: string;
  ownerId?: number;
  customerId?: number;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class OpportunitiesService {
  constructor(
    @InjectRepository(Opportunity)
    private readonly opportunityRepository: Repository<Opportunity>,
  ) {}

  async create(dto: CreateOpportunityDto) {
    const opportunity = this.opportunityRepository.create({
      name: dto.name,
      description: dto.description,
      stage: dto.stage,
      expectedValue: dto.expectedValue,
      expectedCloseDate: dto.expectedCloseDate,
      probability: dto.probability,
      approvalStatus: dto.approvalStatus,
      bizApprovalStatus: dto.bizApprovalStatus,
      techApprovalStatus: dto.techApprovalStatus,
      requirementBriefDocName: dto.requirementBriefDocName,
      researchDocName: dto.researchDocName,
      solutionOwnerUsername: dto.solutionOwnerUsername,
      approvalOpinion: dto.approvalOpinion,
      customer: dto.customerId ? ({ id: dto.customerId } as any) : undefined,
      lead: dto.leadId ? ({ id: dto.leadId } as any) : undefined,
      owner: dto.ownerId ? ({ id: dto.ownerId } as any) : undefined,
    });

    return this.opportunityRepository.save(opportunity);
  }

  async findAll(query: ListOpportunitiesQuery) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize =
      query.pageSize && query.pageSize > 0 && query.pageSize <= 100
        ? query.pageSize
        : 20;

    const qb = this.opportunityRepository
      .createQueryBuilder("opportunity")
      .leftJoinAndSelect("opportunity.customer", "customer")
      .leftJoinAndSelect("opportunity.owner", "owner");

    if (query.stage) {
      qb.andWhere("opportunity.stage = :stage", { stage: query.stage });
    }

    if (query.ownerId) {
      qb.andWhere("owner.id = :ownerId", { ownerId: query.ownerId });
    }

    if (query.customerId) {
      qb.andWhere("customer.id = :customerId", {
        customerId: query.customerId,
      });
    }

    qb.orderBy("opportunity.createdAt", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: number) {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id },
      relations: ["customer", "lead", "owner", "solutionVersions"],
    });

    if (!opportunity) {
      throw new NotFoundException("商机不存在");
    }

    return opportunity;
  }

  async update(id: number, dto: UpdateOpportunityDto) {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id },
    });

    if (!opportunity) {
      throw new NotFoundException("商机不存在");
    }

    if (dto.name !== undefined) {
      opportunity.name = dto.name;
    }
    if (dto.stage !== undefined) {
      opportunity.stage = dto.stage;
    }
    if (dto.expectedValue !== undefined) {
      opportunity.expectedValue = dto.expectedValue;
    }
    if (dto.expectedCloseDate !== undefined) {
      opportunity.expectedCloseDate = dto.expectedCloseDate;
    }
    if (dto.probability !== undefined) {
      opportunity.probability = dto.probability;
    }
    if (dto.description !== undefined) {
      opportunity.description = dto.description;
    }
    if (dto.approvalStatus !== undefined) {
      opportunity.approvalStatus = dto.approvalStatus;
    }
    if (dto.bizApprovalStatus !== undefined) {
      opportunity.bizApprovalStatus = dto.bizApprovalStatus;
    }
    if (dto.techApprovalStatus !== undefined) {
      opportunity.techApprovalStatus = dto.techApprovalStatus;
    }
    if (dto.requirementBriefDocName !== undefined) {
      opportunity.requirementBriefDocName = dto.requirementBriefDocName;
    }
    if (dto.researchDocName !== undefined) {
      opportunity.researchDocName = dto.researchDocName;
    }
    if (dto.solutionOwnerUsername !== undefined) {
      opportunity.solutionOwnerUsername = dto.solutionOwnerUsername;
    }
    if (dto.approvalOpinion !== undefined) {
      opportunity.approvalOpinion = dto.approvalOpinion;
    }
    if (dto.customerId !== undefined) {
      opportunity.customer =
        dto.customerId === null
          ? null
          : ({ id: dto.customerId } as any);
    }
    if (dto.leadId !== undefined) {
      opportunity.lead =
        dto.leadId === null ? null : ({ id: dto.leadId } as any);
    }
    if (dto.ownerId !== undefined) {
      opportunity.owner =
        dto.ownerId === null ? null : ({ id: dto.ownerId } as any);
    }

    return this.opportunityRepository.save(opportunity);
  }

  async remove(id: number) {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id },
    });

    if (!opportunity) {
      throw new NotFoundException("商机不存在");
    }

    await this.opportunityRepository.remove(opportunity);
    return { success: true };
  }
}
