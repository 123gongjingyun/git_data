import { Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import {
  WorkflowDefinition,
  WorkflowTargetType,
} from "../domain/entities/workflow-definition.entity";
import {
  WorkflowApproverType,
  WorkflowNodeApprover,
  WorkflowVoteRule,
} from "../domain/entities/workflow-node-approver.entity";
import {
  WorkflowNode,
  WorkflowRejectStrategy,
  WorkflowNodeType,
} from "../domain/entities/workflow-node.entity";

export interface WorkflowApproverDto {
  id?: number;
  approverType: WorkflowApproverType;
  approverRef: string;
  displayName?: string;
  voteRule?: WorkflowVoteRule;
  sortOrder?: number;
}

export interface WorkflowNodeDto {
  id?: number;
  nodeKey?: string;
  nodeName: string;
  nodeOrder: number;
  nodeType?: WorkflowNodeType;
  fieldKey?: string;
  fieldLabel?: string;
  actionButtonLabel?: string;
  description?: string;
  canReject?: boolean;
  rejectStrategy?: WorkflowRejectStrategy;
  rejectCommentRequired?: boolean;
  approvers: WorkflowApproverDto[];
}

export interface CreateWorkflowDefinitionDto {
  name: string;
  code?: string;
  targetType: WorkflowTargetType;
  description?: string;
  applicableOpportunity?: string;
  enabled?: boolean;
  isDefault?: boolean;
  version?: number;
  nodes: WorkflowNodeDto[];
}

export interface UpdateWorkflowDefinitionDto {
  name?: string;
  code?: string | null;
  targetType?: WorkflowTargetType;
  description?: string | null;
  applicableOpportunity?: string | null;
  enabled?: boolean;
  isDefault?: boolean;
  version?: number;
  nodes?: WorkflowNodeDto[];
}

export interface ListWorkflowDefinitionsQuery {
  targetType?: WorkflowTargetType;
  enabled?: string;
}

const SEEDED_DEFAULT_WORKFLOWS: CreateWorkflowDefinitionDto[] = [
  {
    name: "标准商机审批流程",
    code: "default_opportunity_flow",
    targetType: "opportunity",
    description:
      "用于商机早期阶段审批：线索确认上传需求说明，项目启动分配解决方案负责人，需求分析上传调研文档，最终审批给出通过或驳回结论。",
    applicableOpportunity: "",
    enabled: true,
    isDefault: true,
    version: 2,
    nodes: [
      {
        nodeKey: "lead_confirmation",
        nodeName: "线索确认",
        nodeOrder: 1,
        nodeType: "upload",
        fieldKey: "requirementBriefDocName",
        fieldLabel: "客户需求说明",
        actionButtonLabel: "上传需求说明",
        description: "上传客户需求说明文档，确认客户背景与初步诉求。",
        canReject: false,
        rejectStrategy: "terminate",
        rejectCommentRequired: false,
        approvers: [
          {
            approverType: "role",
            approverRef: "sales_owner",
            displayName: "销售负责人",
            voteRule: "any",
            sortOrder: 0,
          },
        ],
      },
      {
        nodeKey: "sales_leader_approval",
        nodeName: "销售领导审批",
        nodeOrder: 2,
        nodeType: "approval",
        fieldKey: "bizApprovalStatus",
        fieldLabel: "销售领导审批",
        description: "确认商机是否值得继续投入，决定是否进入下一阶段。",
        canReject: true,
        rejectStrategy: "terminate",
        rejectCommentRequired: false,
        approvers: [
          {
            approverType: "role",
            approverRef: "sales_manager",
            displayName: "销售领导",
            voteRule: "any",
            sortOrder: 0,
          },
        ],
      },
      {
        nodeKey: "solution_leader_approval",
        nodeName: "解决方案领导审批",
        nodeOrder: 3,
        nodeType: "approval",
        fieldKey: "techApprovalStatus",
        fieldLabel: "解决方案领导审批",
        description: "确认售前资源投入方向，并给出技术侧审批意见。",
        canReject: true,
        rejectStrategy: "terminate",
        rejectCommentRequired: false,
        approvers: [
          {
            approverType: "role",
            approverRef: "solution_manager",
            displayName: "解决方案领导",
            voteRule: "any",
            sortOrder: 0,
          },
        ],
      },
      {
        nodeKey: "assign_solution_owner",
        nodeName: "分配解决方案负责人",
        nodeOrder: 4,
        nodeType: "assignment",
        fieldKey: "solutionOwnerUsername",
        fieldLabel: "解决方案负责人",
        actionButtonLabel: "选择负责人",
        description: "明确后续由谁承接需求分析和方案设计。",
        canReject: false,
        rejectStrategy: "terminate",
        rejectCommentRequired: false,
        approvers: [
          {
            approverType: "role",
            approverRef: "solution_manager",
            displayName: "售前经理",
            voteRule: "any",
            sortOrder: 0,
          },
        ],
      },
      {
        nodeKey: "requirement_analysis",
        nodeName: "需求分析",
        nodeOrder: 5,
        nodeType: "upload",
        fieldKey: "researchDocName",
        fieldLabel: "需求调研文档",
        actionButtonLabel: "上传调研文档",
        description: "完成需求调研并上传调研文档。",
        canReject: false,
        rejectStrategy: "terminate",
        rejectCommentRequired: false,
        approvers: [
          {
            approverType: "field",
            approverRef: "solutionOwnerUsername",
            displayName: "解决方案负责人",
            voteRule: "any",
            sortOrder: 0,
          },
        ],
      },
      {
        nodeKey: "final_approval",
        nodeName: "最终审批",
        nodeOrder: 6,
        nodeType: "approval",
        fieldKey: "approvalStatus",
        fieldLabel: "最终审批",
        description: "基于前序材料给出最终通过或驳回结论。",
        canReject: true,
        rejectStrategy: "terminate",
        rejectCommentRequired: true,
        approvers: [
          {
            approverType: "role",
            approverRef: "sales_director",
            displayName: "销售总监",
            voteRule: "any",
            sortOrder: 0,
          },
          {
            approverType: "role",
            approverRef: "tech_director",
            displayName: "技术总监",
            voteRule: "any",
            sortOrder: 1,
          },
        ],
      },
    ],
  },
  {
    name: "标准解决方案审批流程",
    code: "default_solution_flow",
    targetType: "solution",
    description: "技术评审、商务评审、最终审批三段式解决方案审批流。",
    applicableOpportunity: "",
    enabled: true,
    isDefault: true,
    version: 2,
    nodes: [
      {
        nodeKey: "tech_review",
        nodeName: "技术评审",
        nodeOrder: 1,
        nodeType: "approval",
        fieldKey: "approvalStatus",
        fieldLabel: "技术评审",
        description: "评估方案技术可行性、风险与资源匹配度。",
        canReject: true,
        rejectStrategy: "terminate",
        rejectCommentRequired: false,
        approvers: [
          {
            approverType: "field",
            approverRef: "createdBy",
            displayName: "解决方案负责人",
            voteRule: "any",
            sortOrder: 0,
          },
        ],
      },
      {
        nodeKey: "business_review",
        nodeName: "商务评审",
        nodeOrder: 2,
        nodeType: "approval",
        fieldKey: "approvalStatus",
        fieldLabel: "商务评审",
        description: "校验报价策略、交付范围与商务条款。",
        canReject: true,
        rejectStrategy: "terminate",
        rejectCommentRequired: false,
        approvers: [
          {
            approverType: "role",
            approverRef: "manager",
            displayName: "经理",
            voteRule: "any",
            sortOrder: 0,
          },
        ],
      },
      {
        nodeKey: "final_solution_approval",
        nodeName: "最终审批",
        nodeOrder: 3,
        nodeType: "approval",
        fieldKey: "approvalStatus",
        fieldLabel: "最终审批",
        description: "综合技术与商务意见给出最终审批结论。",
        canReject: true,
        rejectStrategy: "terminate",
        rejectCommentRequired: true,
        approvers: [
          {
            approverType: "role",
            approverRef: "admin",
            displayName: "管理员",
            voteRule: "any",
            sortOrder: 0,
          },
        ],
      },
    ],
  },
];

@Injectable()
export class WorkflowsService implements OnModuleInit {
  constructor(
    @InjectRepository(WorkflowDefinition)
    private readonly workflowDefinitionRepository: Repository<WorkflowDefinition>,
    @InjectRepository(WorkflowNode)
    private readonly workflowNodeRepository: Repository<WorkflowNode>,
    @InjectRepository(WorkflowNodeApprover)
    private readonly workflowNodeApproverRepository: Repository<WorkflowNodeApprover>,
  ) {}

  async onModuleInit() {
    await this.ensureSeededDefaults();
  }

  private async ensureSeededDefaults() {
    for (const workflow of SEEDED_DEFAULT_WORKFLOWS) {
      const existing = workflow.code
        ? await this.workflowDefinitionRepository.findOne({
            where: { code: workflow.code },
            relations: ["nodes", "nodes.approvers"],
          })
        : null;

      if (!existing) {
        await this.create(workflow);
        continue;
      }

      const shouldRepair =
        existing.targetType !== workflow.targetType ||
        existing.isDefault !== (workflow.isDefault ?? false) ||
        existing.enabled !== (workflow.enabled ?? true) ||
        (existing.version ?? 1) < (workflow.version ?? 1) ||
        (existing.nodes?.length || 0) !== workflow.nodes.length;

      if (shouldRepair) {
        await this.update(existing.id, workflow);
      }
    }
  }

  private normalizeNodes(nodes: WorkflowNodeDto[]): WorkflowNodeDto[] {
    return [...nodes].sort((a, b) => a.nodeOrder - b.nodeOrder);
  }

  private buildWorkflowNodes(
    workflowDefinition: WorkflowDefinition,
    nodes: WorkflowNodeDto[],
  ): WorkflowNode[] {
    return this.normalizeNodes(nodes).map((node, index) => {
      return this.workflowNodeRepository.create({
        workflowDefinition,
        nodeKey: node.nodeKey?.trim() || `node_${index + 1}`,
        nodeName: node.nodeName,
        nodeOrder: node.nodeOrder,
        nodeType: node.nodeType ?? "approval",
        fieldKey: node.fieldKey,
        fieldLabel: node.fieldLabel,
        actionButtonLabel: node.actionButtonLabel,
        description: node.description,
        canReject: node.canReject ?? true,
        rejectStrategy: node.rejectStrategy ?? "terminate",
        rejectCommentRequired: node.rejectCommentRequired ?? false,
      });
    });
  }

  private async saveWorkflowNodeApprovers(
    savedNodes: WorkflowNode[],
    nodes: WorkflowNodeDto[],
  ) {
    const sortedDtos = this.normalizeNodes(nodes);
    for (let index = 0; index < savedNodes.length; index += 1) {
      const workflowNode = savedNodes[index];
      const nodeDto = sortedDtos[index];
      workflowNode.approvers = await this.workflowNodeApproverRepository.save(
        (nodeDto.approvers || []).map((approver, approverIndex) =>
          this.workflowNodeApproverRepository.create({
            workflowNode,
            approverType: approver.approverType,
            approverRef: approver.approverRef,
            displayName: approver.displayName,
            voteRule: approver.voteRule ?? "any",
            sortOrder: approver.sortOrder ?? approverIndex,
          }),
        ),
      );
    }
  }

  private async unsetDefaultForTarget(targetType: WorkflowTargetType) {
    await this.workflowDefinitionRepository.update(
      { targetType, isDefault: true },
      { isDefault: false },
    );
  }

  async create(dto: CreateWorkflowDefinitionDto) {
    const workflowDefinition = this.workflowDefinitionRepository.create({
      name: dto.name,
      code: dto.code,
      targetType: dto.targetType,
      description: dto.description,
      applicableOpportunity: dto.applicableOpportunity,
      enabled: dto.enabled ?? true,
      isDefault: dto.isDefault ?? false,
      version: dto.version ?? 1,
    });

    if (workflowDefinition.isDefault) {
      await this.unsetDefaultForTarget(workflowDefinition.targetType);
    }

    const savedDefinition = await this.workflowDefinitionRepository.save(
      workflowDefinition,
    );
    const savedNodes = await this.workflowNodeRepository.save(
      this.buildWorkflowNodes(savedDefinition, dto.nodes || []),
    );
    await this.saveWorkflowNodeApprovers(savedNodes, dto.nodes || []);
    return this.findOne(savedDefinition.id);
  }

  async findAll(query: ListWorkflowDefinitionsQuery) {
    const qb = this.workflowDefinitionRepository
      .createQueryBuilder("workflow")
      .leftJoinAndSelect("workflow.nodes", "nodes")
      .leftJoinAndSelect("nodes.approvers", "approvers")
      .orderBy("workflow.isDefault", "DESC")
      .addOrderBy("workflow.updatedAt", "DESC")
      .addOrderBy("nodes.nodeOrder", "ASC")
      .addOrderBy("approvers.sortOrder", "ASC");

    if (query.targetType) {
      qb.andWhere("workflow.targetType = :targetType", {
        targetType: query.targetType,
      });
    }

    if (query.enabled === "true" || query.enabled === "false") {
      qb.andWhere("workflow.enabled = :enabled", {
        enabled: query.enabled === "true",
      });
    }

    return qb.getMany();
  }

  async findOne(id: number) {
    const workflowDefinition = await this.workflowDefinitionRepository.findOne({
      where: { id },
      relations: ["nodes", "nodes.approvers"],
      order: {
        nodes: {
          nodeOrder: "ASC",
          approvers: {
            sortOrder: "ASC",
          },
        },
      },
    });

    if (!workflowDefinition) {
      throw new NotFoundException("流程定义不存在");
    }

    return workflowDefinition;
  }

  async update(id: number, dto: UpdateWorkflowDefinitionDto) {
    const workflowDefinition = await this.workflowDefinitionRepository.findOne({
      where: { id },
      relations: ["nodes", "nodes.approvers"],
    });

    if (!workflowDefinition) {
      throw new NotFoundException("流程定义不存在");
    }

    if (dto.name !== undefined) {
      workflowDefinition.name = dto.name;
    }
    if (dto.code !== undefined) {
      workflowDefinition.code = dto.code;
    }
    if (dto.targetType !== undefined) {
      workflowDefinition.targetType = dto.targetType;
    }
    if (dto.description !== undefined) {
      workflowDefinition.description = dto.description;
    }
    if (dto.applicableOpportunity !== undefined) {
      workflowDefinition.applicableOpportunity = dto.applicableOpportunity;
    }
    if (dto.enabled !== undefined) {
      workflowDefinition.enabled = dto.enabled;
    }
    if (dto.version !== undefined) {
      workflowDefinition.version = dto.version;
    }
    if (dto.isDefault !== undefined) {
      workflowDefinition.isDefault = dto.isDefault;
      if (dto.isDefault) {
        await this.unsetDefaultForTarget(workflowDefinition.targetType);
      }
    }
    await this.workflowDefinitionRepository.save(workflowDefinition);

    if (dto.nodes !== undefined) {
      const existingNodes = await this.workflowNodeRepository.find({
        where: {
          workflowDefinition: { id },
        },
        relations: ["approvers"],
      });
      if (existingNodes.length > 0) {
        const existingNodeIds = existingNodes.map((node) => node.id);
        await this.workflowNodeApproverRepository.delete({
          workflowNode: {
            id: In(existingNodeIds),
          } as any,
        });
        await this.workflowNodeRepository.delete({
          workflowDefinition: { id } as any,
        });
      }
      const savedNodes = await this.workflowNodeRepository.save(
        this.buildWorkflowNodes(workflowDefinition, dto.nodes),
      );
      await this.saveWorkflowNodeApprovers(savedNodes, dto.nodes);
    }
    return this.findOne(id);
  }

  async setDefault(id: number) {
    const workflowDefinition = await this.findOne(id);
    await this.unsetDefaultForTarget(workflowDefinition.targetType);
    workflowDefinition.isDefault = true;
    await this.workflowDefinitionRepository.save(workflowDefinition);
    return this.findOne(id);
  }

  async setEnabled(id: number, enabled: boolean) {
    const workflowDefinition = await this.findOne(id);
    workflowDefinition.enabled = enabled;
    await this.workflowDefinitionRepository.save(workflowDefinition);
    return this.findOne(id);
  }

  async remove(id: number) {
    const workflowDefinition = await this.workflowDefinitionRepository.findOne({
      where: { id },
    });
    if (!workflowDefinition) {
      throw new NotFoundException("流程定义不存在");
    }

    await this.workflowDefinitionRepository.remove(workflowDefinition);
    return { success: true };
  }
}
