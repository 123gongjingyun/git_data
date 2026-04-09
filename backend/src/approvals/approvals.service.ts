import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthUserPayload } from "../auth/auth.service";
import {
  ApprovalAction,
  ApprovalActionType,
} from "../domain/entities/approval-action.entity";
import {
  ApprovalInstance,
  ApprovalBusinessType,
  ApprovalInstanceStatus,
} from "../domain/entities/approval-instance.entity";
import {
  ApprovalInstanceNode,
  ApprovalInstanceNodeStatus,
} from "../domain/entities/approval-instance-node.entity";
import { Opportunity } from "../domain/entities/opportunity.entity";
import { SolutionVersion } from "../domain/entities/solution-version.entity";
import { User } from "../domain/entities/user.entity";
import {
  WorkflowDefinition,
  WorkflowTargetType,
} from "../domain/entities/workflow-definition.entity";
import {
  WorkflowApproverType,
  WorkflowNodeApprover,
} from "../domain/entities/workflow-node-approver.entity";

export interface StartApprovalInstanceInput {
  businessType: ApprovalBusinessType;
  businessId: number;
  workflowDefinitionId?: number;
}

export interface ListApprovalInstancesQuery {
  businessType: ApprovalBusinessType;
  businessId: number;
}

export interface ApprovalActionInput {
  actionType: ApprovalActionType;
  comment?: string;
  fileName?: string;
  assignedToUsername?: string;
  value?: string;
}

type ApprovalActor = Partial<AuthUserPayload> & {
  id?: number;
};

interface ApprovalBusinessContext {
  businessType: ApprovalBusinessType;
  opportunity?: Opportunity;
  solution?: SolutionVersion;
}

interface ResolvedApproverUserView {
  id: number;
  username: string;
  displayName?: string | null;
  role: string;
}

interface WorkflowNodeSnapshot {
  workflowNodeId?: number | null;
  nodeKey?: string | null;
  nodeName: string;
  nodeOrder: number;
  nodeType?: string | null;
  fieldKey?: string | null;
  description?: string | null;
  canReject: boolean;
  rejectCommentRequired: boolean;
  approvers: WorkflowNodeApprover[];
}

@Injectable()
export class ApprovalsService {
  constructor(
    @InjectRepository(ApprovalInstance)
    private readonly approvalInstanceRepository: Repository<ApprovalInstance>,
    @InjectRepository(ApprovalInstanceNode)
    private readonly approvalInstanceNodeRepository: Repository<ApprovalInstanceNode>,
    @InjectRepository(ApprovalAction)
    private readonly approvalActionRepository: Repository<ApprovalAction>,
    @InjectRepository(WorkflowDefinition)
    private readonly workflowDefinitionRepository: Repository<WorkflowDefinition>,
    @InjectRepository(Opportunity)
    private readonly opportunityRepository: Repository<Opportunity>,
    @InjectRepository(SolutionVersion)
    private readonly solutionRepository: Repository<SolutionVersion>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private getActorUserId(actor?: ApprovalActor | null) {
    return actor?.id ?? actor?.sub;
  }

  private async loadBusinessContext(
    businessType: ApprovalBusinessType,
    businessId: number,
  ): Promise<ApprovalBusinessContext> {
    if (businessType === "opportunity") {
      const opportunity = await this.opportunityRepository.findOne({
        where: { id: businessId },
        relations: ["owner", "customer"],
      });
      if (!opportunity) {
        throw new NotFoundException("商机不存在");
      }
      return { businessType, opportunity };
    }

    const solution = await this.solutionRepository.findOne({
      where: { id: businessId },
      relations: ["createdBy", "opportunity", "opportunity.owner"],
    });
    if (!solution) {
      throw new NotFoundException("方案不存在");
    }
    return { businessType, solution };
  }

  private normalizeOpportunityStatus(
    status: ApprovalInstanceStatus,
  ): "pending" | "approved" | "rejected" {
    if (status === "approved") {
      return "approved";
    }
    if (status === "rejected" || status === "cancelled") {
      return "rejected";
    }
    return "pending";
  }

  private normalizeSolutionApprovalStatus(
    status: ApprovalInstanceStatus,
  ): "draft" | "in_review" | "approved" | "rejected" {
    if (status === "approved") {
      return "approved";
    }
    if (status === "rejected" || status === "cancelled") {
      return "rejected";
    }
    return "in_review";
  }

  private normalizeOpportunityNodeStatus(
    status?: ApprovalInstanceNodeStatus | null,
  ): "pending" | "approved" | "rejected" {
    if (status === "approved") {
      return "approved";
    }
    if (status === "rejected") {
      return "rejected";
    }
    return "pending";
  }

  private async syncBusinessApprovalState(
    context: ApprovalBusinessContext,
    instance: ApprovalInstance,
  ) {
    if (context.businessType === "opportunity" && context.opportunity) {
      const instanceNodes = Array.isArray(instance.nodes) ? instance.nodes : [];
      const bizApprovalNode = instanceNodes.find(
        (node) => node.fieldKeySnapshot === "bizApprovalStatus",
      );
      const techApprovalNode = instanceNodes.find(
        (node) => node.fieldKeySnapshot === "techApprovalStatus",
      );
      await this.opportunityRepository.update(context.opportunity.id, {
        currentApprovalInstanceId: instance.id,
        approvalStatus: this.normalizeOpportunityStatus(instance.status),
        bizApprovalStatus: bizApprovalNode
          ? this.normalizeOpportunityNodeStatus(bizApprovalNode.status)
          : context.opportunity.bizApprovalStatus ?? null,
        techApprovalStatus: techApprovalNode
          ? this.normalizeOpportunityNodeStatus(techApprovalNode.status)
          : context.opportunity.techApprovalStatus ?? null,
      });
      return;
    }

    if (context.solution) {
      await this.solutionRepository.update(context.solution.id, {
        currentApprovalInstanceId: instance.id,
        approvalStatus: this.normalizeSolutionApprovalStatus(instance.status),
        status:
          instance.status === "approved"
            ? "approved"
            : instance.status === "rejected"
              ? "rejected"
              : "in_review",
      });
    }
  }

  private async resolveWorkflowDefinition(
    input: StartApprovalInstanceInput,
    context: ApprovalBusinessContext,
  ) {
    if (input.workflowDefinitionId) {
      const workflowDefinition = await this.workflowDefinitionRepository.findOne({
        where: {
          id: input.workflowDefinitionId,
          targetType: input.businessType as WorkflowTargetType,
        },
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
        throw new NotFoundException("审批流程定义不存在");
      }
      return workflowDefinition;
    }

    const workflowDefinitions = await this.workflowDefinitionRepository.find({
      where: {
        targetType: input.businessType as WorkflowTargetType,
        enabled: true,
      },
      relations: ["nodes", "nodes.approvers"],
      order: {
        isDefault: "DESC",
        updatedAt: "DESC",
        nodes: {
          nodeOrder: "ASC",
          approvers: {
            sortOrder: "ASC",
          },
        },
      },
    });

    if (workflowDefinitions.length === 0) {
      throw new NotFoundException("当前业务类型尚未配置可用审批流程");
    }

    if (input.businessType === "opportunity" && context.opportunity) {
      const nameKeywords = [
        context.opportunity.name,
        context.opportunity.customer?.name,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      const matched = workflowDefinitions.find((workflow) => {
        const keyword = workflow.applicableOpportunity?.trim().toLowerCase();
        return Boolean(
          keyword &&
            nameKeywords.some((source) => source.includes(keyword)),
        );
      });
      if (matched) {
        return matched;
      }
    }

    return workflowDefinitions[0];
  }

  private async findUserByRef(ref: string) {
    const trimmed = ref.trim();
    if (!trimmed) {
      return [];
    }
    if (/^\d+$/.test(trimmed)) {
      const user = await this.userRepository.findOne({
        where: { id: Number(trimmed) },
      });
      return user ? [user] : [];
    }
    const user = await this.userRepository.findOne({
      where: { username: trimmed },
    });
    return user ? [user] : [];
  }

  private async resolveRoleUsers(roleRef: string, context: ApprovalBusinessContext) {
    switch (roleRef) {
      case "sales_owner":
        return context.opportunity?.owner ? [context.opportunity.owner] : [];
      case "sales_manager":
      case "solution_manager":
      case "sales_director":
      case "tech_director":
        return this.userRepository.find({
          where: { role: "manager" },
          order: { id: "ASC" },
        });
      case "manager":
        return this.userRepository.find({
          where: { role: "manager" },
          order: { id: "ASC" },
        });
      case "admin":
        return this.userRepository.find({
          where: { role: "admin" },
          order: { id: "ASC" },
        });
      case "pre_sales_engineer":
        return this.userRepository.find({
          where: { role: "pre_sales_engineer" },
          order: { id: "ASC" },
        });
      case "sales":
        return this.userRepository.find({
          where: { role: "sales" },
          order: { id: "ASC" },
        });
      default:
        return this.userRepository.find({
          where: { role: roleRef as any },
          order: { id: "ASC" },
        });
    }
  }

  private async resolveFieldUsers(
    fieldRef: string,
    context: ApprovalBusinessContext,
  ) {
    if (context.opportunity) {
      if (
        fieldRef === "owner" ||
        fieldRef === "ownerId" ||
        fieldRef === "ownerUsername"
      ) {
        return context.opportunity.owner ? [context.opportunity.owner] : [];
      }
      if (fieldRef === "solutionOwnerUsername") {
        if (!context.opportunity.solutionOwnerUsername) {
          return [];
        }
        return this.findUserByRef(context.opportunity.solutionOwnerUsername);
      }
    }

    if (context.solution) {
      if (fieldRef === "createdBy" || fieldRef === "createdById") {
        return context.solution.createdBy ? [context.solution.createdBy] : [];
      }
      if (fieldRef === "opportunityOwner") {
        return context.solution.opportunity?.owner
          ? [context.solution.opportunity.owner]
          : [];
      }
    }

    return [];
  }

  private async resolveApproverUsers(
    approver: WorkflowNodeApprover,
    context: ApprovalBusinessContext,
  ): Promise<User[]> {
    if (approver.approverType === "user") {
      return this.findUserByRef(approver.approverRef);
    }
    if (approver.approverType === "field") {
      return this.resolveFieldUsers(approver.approverRef, context);
    }
    return this.resolveRoleUsers(approver.approverRef, context);
  }

  private getOrderedNodeSnapshots(
    workflowDefinition: WorkflowDefinition,
  ): WorkflowNodeSnapshot[] {
    return (workflowDefinition.nodes || [])
      .slice()
      .sort((a, b) => a.nodeOrder - b.nodeOrder)
      .map((node) => ({
        workflowNodeId: node.id,
        nodeKey: node.nodeKey || null,
        nodeName: node.nodeName,
        nodeOrder: node.nodeOrder,
        nodeType: (node as any).nodeType || "approval",
        fieldKey: (node as any).fieldKey || null,
        description: node.description || null,
        canReject: node.canReject ?? true,
        rejectCommentRequired: node.rejectCommentRequired ?? false,
        approvers: (node.approvers || []).slice().sort((a, b) => a.sortOrder - b.sortOrder),
      }));
  }

  private async findLatestInstanceForBusiness(
    businessType: ApprovalBusinessType,
    businessId: number,
  ) {
    return this.approvalInstanceRepository.findOne({
      where: { businessType, businessId },
      order: {
        createdAt: "DESC",
      },
    });
  }

  private async findApprovalInstanceEntity(id: number) {
    const approvalInstance = await this.approvalInstanceRepository.findOne({
      where: { id },
      relations: [
        "workflowDefinition",
        "workflowDefinition.nodes",
        "workflowDefinition.nodes.approvers",
        "nodes",
        "actions",
        "actions.operator",
        "actions.approvalInstanceNode",
        "startedBy",
      ],
      order: {
        workflowDefinition: {
          nodes: {
            nodeOrder: "ASC",
            approvers: {
              sortOrder: "ASC",
            },
          },
        },
        nodes: {
          nodeOrder: "ASC",
        },
        actions: {
          createdAt: "DESC",
        },
      },
    });

    if (!approvalInstance) {
      throw new NotFoundException("审批实例不存在");
    }
    return approvalInstance;
  }

  private async canUserHandleNode(
    currentUserId: number | undefined,
    nodeSnapshot: WorkflowNodeSnapshot,
    context: ApprovalBusinessContext,
  ) {
    if (!currentUserId) {
      return false;
    }
    for (const approver of nodeSnapshot.approvers) {
      const users = await this.resolveApproverUsers(approver, context);
      if (users.some((user) => user.id === currentUserId)) {
        return true;
      }
    }
    return false;
  }

  private async buildApprovalInstanceView(
    approvalInstance: ApprovalInstance,
    currentUserId?: number,
  ) {
    const context = await this.loadBusinessContext(
      approvalInstance.businessType,
      approvalInstance.businessId,
    );
    const nodeSnapshotMap = new Map(
      this.getOrderedNodeSnapshots(approvalInstance.workflowDefinition).map((node) => [
        node.workflowNodeId || node.nodeOrder,
        node,
      ]),
    );

    const nodes = [];
    for (const node of approvalInstance.nodes.slice().sort((a, b) => a.nodeOrder - b.nodeOrder)) {
      const snapshot =
        nodeSnapshotMap.get(node.workflowNodeId || node.nodeOrder) ||
        ({
          workflowNodeId: node.workflowNodeId,
          nodeKey: node.nodeKeySnapshot,
          nodeName: node.nodeNameSnapshot,
          nodeOrder: node.nodeOrder,
          nodeType: node.nodeTypeSnapshot,
          fieldKey: node.fieldKeySnapshot,
          description: node.descriptionSnapshot,
          canReject: node.canReject,
          rejectCommentRequired: node.rejectCommentRequired,
          approvers: [],
        } satisfies WorkflowNodeSnapshot);

      const approvers = [];
      for (const approver of snapshot.approvers) {
        const users = await this.resolveApproverUsers(approver, context);
        approvers.push({
          approverType: approver.approverType,
          approverRef: approver.approverRef,
          displayName: approver.displayName || approver.approverRef,
          resolvedUsers: users.map<ResolvedApproverUserView>((user) => ({
            id: user.id,
            username: user.username,
            displayName: user.displayName || null,
            role: user.role,
          })),
        });
      }

      nodes.push({
        id: node.id,
        workflowNodeId: node.workflowNodeId,
        nodeKey: node.nodeKeySnapshot || snapshot.nodeKey || null,
        nodeName: node.nodeNameSnapshot,
        nodeOrder: node.nodeOrder,
        nodeType: node.nodeTypeSnapshot || snapshot.nodeType || "approval",
        fieldKey: node.fieldKeySnapshot || snapshot.fieldKey || null,
        description: node.descriptionSnapshot || snapshot.description || null,
        canReject: node.canReject,
        rejectCommentRequired: node.rejectCommentRequired,
        status: node.status,
        startedAt: node.startedAt?.toISOString() || null,
        finishedAt: node.finishedAt?.toISOString() || null,
        approvers,
        canCurrentUserHandle:
          approvalInstance.currentNodeId === node.id
            ? await this.canUserHandleNode(currentUserId, snapshot, context)
            : false,
      });
    }

    const currentNode = nodes.find((node) => node.id === approvalInstance.currentNodeId) || null;

    return {
      id: approvalInstance.id,
      businessType: approvalInstance.businessType,
      businessId: approvalInstance.businessId,
      status: approvalInstance.status,
      workflowDefinition: {
        id: approvalInstance.workflowDefinition.id,
        name: approvalInstance.workflowDefinition.name,
        targetType: approvalInstance.workflowDefinition.targetType,
        version: approvalInstance.workflowDefinition.version,
      },
      currentNodeId: approvalInstance.currentNodeId,
      currentNode,
      canCurrentUserHandleCurrentNode:
        currentNode?.canCurrentUserHandle || false,
      startedAt: approvalInstance.startedAt?.toISOString() || null,
      finishedAt: approvalInstance.finishedAt?.toISOString() || null,
      startedBy: approvalInstance.startedBy
        ? {
            id: approvalInstance.startedBy.id,
            username: approvalInstance.startedBy.username,
            displayName: approvalInstance.startedBy.displayName || null,
            role: approvalInstance.startedBy.role,
          }
        : null,
      nodes,
      actions: (approvalInstance.actions || []).map((action) => ({
        id: action.id,
        actionType: action.actionType,
        comment: action.comment || null,
        payload: action.payload || null,
        createdAt: action.createdAt.toISOString(),
        approvalInstanceNodeId: action.approvalInstanceNode?.id || null,
        nodeKey:
          action.approvalInstanceNode?.nodeKeySnapshot ||
          currentNode?.nodeKey ||
          null,
        nodeName: action.approvalInstanceNode?.nodeNameSnapshot || null,
        operator: action.operator
          ? {
              id: action.operator.id,
              username: action.operator.username,
              displayName: action.operator.displayName || null,
              role: action.operator.role,
            }
          : null,
      })),
    };
  }

  async findLatestForBusiness(
    query: ListApprovalInstancesQuery,
    currentUser?: ApprovalActor,
  ) {
    const approvalInstance = await this.findLatestInstanceForBusiness(
      query.businessType,
      query.businessId,
    );
    if (!approvalInstance) {
      return null;
    }
    const instance = await this.findApprovalInstanceEntity(approvalInstance.id);
    const businessContext = await this.loadBusinessContext(
      instance.businessType,
      instance.businessId,
    );
    await this.syncBusinessApprovalState(businessContext, instance);
    return this.buildApprovalInstanceView(
      instance,
      this.getActorUserId(currentUser),
    );
  }

  async findOne(id: number, currentUser?: ApprovalActor) {
    const approvalInstance = await this.findApprovalInstanceEntity(id);
    const businessContext = await this.loadBusinessContext(
      approvalInstance.businessType,
      approvalInstance.businessId,
    );
    await this.syncBusinessApprovalState(businessContext, approvalInstance);
    return this.buildApprovalInstanceView(
      approvalInstance,
      this.getActorUserId(currentUser),
    );
  }

  async startInstance(
    input: StartApprovalInstanceInput,
    currentUser?: ApprovalActor,
  ) {
    const businessContext = await this.loadBusinessContext(
      input.businessType,
      input.businessId,
    );

    const existing = await this.findLatestInstanceForBusiness(
      input.businessType,
      input.businessId,
    );
    if (existing && ["pending", "in_progress"].includes(existing.status)) {
      return this.findOne(existing.id, currentUser);
    }

    const workflowDefinition = await this.resolveWorkflowDefinition(
      input,
      businessContext,
    );
    const nodeSnapshots = this.getOrderedNodeSnapshots(workflowDefinition);
    if (nodeSnapshots.length === 0) {
      throw new BadRequestException("审批流程未配置节点，无法启动");
    }

    const actorUserId = this.getActorUserId(currentUser);
    const operator = actorUserId
      ? await this.userRepository.findOne({ where: { id: actorUserId } })
      : null;
    const now = new Date();
    const approvalInstance = this.approvalInstanceRepository.create({
      businessType: input.businessType,
      businessId: input.businessId,
      workflowDefinition,
      status: "in_progress",
      startedBy: operator || null,
      startedAt: now,
    });

    const savedInstance = await this.approvalInstanceRepository.save(
      approvalInstance,
    );
    const savedNodes = await this.approvalInstanceNodeRepository.save(
      nodeSnapshots.map((node, index) =>
      this.approvalInstanceNodeRepository.create({
        approvalInstance: savedInstance,
        workflowNodeId: node.workflowNodeId,
        nodeKeySnapshot: node.nodeKey,
        nodeNameSnapshot: node.nodeName,
        nodeOrder: node.nodeOrder,
        nodeTypeSnapshot: node.nodeType,
        fieldKeySnapshot: node.fieldKey,
        descriptionSnapshot: node.description,
        canReject: node.canReject,
        rejectCommentRequired: node.rejectCommentRequired,
        status: index === 0 ? "in_progress" : "pending",
        startedAt: index === 0 ? now : null,
      }),
    ),
    );

    const firstNode = savedNodes.slice().sort((a, b) => a.nodeOrder - b.nodeOrder)[0];
    savedInstance.currentNodeId = firstNode?.id || null;
    savedInstance.nodes = savedNodes;
    await this.approvalInstanceRepository.save(savedInstance);
    await this.syncBusinessApprovalState(businessContext, savedInstance);
    return this.findOne(savedInstance.id, currentUser);
  }

  private async applyBusinessMutationForNodeAction(
    context: ApprovalBusinessContext,
    node: ApprovalInstanceNode,
    actionType: ApprovalActionType,
    input: ApprovalActionInput,
  ) {
    const fieldKey = node.fieldKeySnapshot || undefined;

    if (context.opportunity) {
      if (fieldKey === "requirementBriefDocName") {
        context.opportunity.requirementBriefDocName =
          input.fileName || input.value || context.opportunity.requirementBriefDocName || null;
      } else if (fieldKey === "researchDocName") {
        context.opportunity.researchDocName =
          input.fileName || input.value || context.opportunity.researchDocName || null;
      } else if (fieldKey === "solutionOwnerUsername") {
        context.opportunity.solutionOwnerUsername =
          input.assignedToUsername ||
          input.value ||
          context.opportunity.solutionOwnerUsername ||
          null;
      } else if (fieldKey === "bizApprovalStatus") {
        context.opportunity.bizApprovalStatus =
          actionType === "reject" ? "rejected" : "approved";
      } else if (fieldKey === "techApprovalStatus") {
        context.opportunity.techApprovalStatus =
          actionType === "reject" ? "rejected" : "approved";
      } else if (fieldKey === "approvalStatus") {
        context.opportunity.approvalStatus =
          actionType === "reject" ? "rejected" : "approved";
        context.opportunity.approvalOpinion = input.comment?.trim() || null;
      }
      await this.opportunityRepository.save(context.opportunity);
      return;
    }

    if (context.solution) {
      if (actionType === "reject") {
        context.solution.approvalStatus = "rejected";
        context.solution.status = "rejected";
      } else {
        context.solution.approvalStatus = "in_review";
        context.solution.status = "in_review";
      }
      await this.solutionRepository.save(context.solution);
    }
  }

  async executeAction(
    id: number,
    input: ApprovalActionInput,
    currentUser: ApprovalActor,
  ) {
    const approvalInstance = await this.findApprovalInstanceEntity(id);
    if (!["pending", "in_progress"].includes(approvalInstance.status)) {
      throw new BadRequestException("当前审批实例已结束，不能继续处理");
    }

    const context = await this.loadBusinessContext(
      approvalInstance.businessType,
      approvalInstance.businessId,
    );
    const currentNode = approvalInstance.nodes.find(
      (node) => node.id === approvalInstance.currentNodeId,
    );
    if (!currentNode) {
      throw new BadRequestException("当前审批实例不存在待处理节点");
    }

    const currentNodeSnapshot = this.getOrderedNodeSnapshots(
      approvalInstance.workflowDefinition,
    ).find(
      (node) =>
        node.workflowNodeId === currentNode.workflowNodeId ||
        node.nodeOrder === currentNode.nodeOrder,
    );
    if (!currentNodeSnapshot) {
      throw new BadRequestException("当前审批节点配置不存在");
    }

    const actorUserId = this.getActorUserId(currentUser);
    if (!actorUserId) {
      throw new ForbiddenException("当前登录态无效，无法执行审批动作");
    }

    const canHandle = await this.canUserHandleNode(
      actorUserId,
      currentNodeSnapshot,
      context,
    );
    if (!canHandle) {
      throw new ForbiddenException("只有当前节点处理人可以执行此审批动作");
    }

    const actionType = input.actionType;
    const nodeType = currentNode.nodeTypeSnapshot || currentNodeSnapshot.nodeType || "approval";
    if (nodeType === "approval" && !["approve", "reject"].includes(actionType)) {
      throw new BadRequestException("审批节点仅支持通过或驳回");
    }
    if (nodeType !== "approval" && !["submit", "upload", "assign", "reject"].includes(actionType)) {
      throw new BadRequestException("当前节点不支持该操作");
    }
    if (actionType === "reject" && !currentNode.canReject) {
      throw new BadRequestException("当前节点不支持驳回");
    }
    if (
      actionType === "reject" &&
      currentNode.rejectCommentRequired &&
      !input.comment?.trim()
    ) {
      throw new BadRequestException("当前节点驳回时必须填写审批意见");
    }

    const operator = await this.userRepository.findOne({
      where: { id: actorUserId },
    });
    const now = new Date();

    await this.applyBusinessMutationForNodeAction(
      context,
      currentNode,
      actionType,
      input,
    );

    currentNode.status =
      actionType === "reject" ? "rejected" : ("approved" as ApprovalInstanceNodeStatus);
    currentNode.finishedAt = now;

    const orderedNodes = approvalInstance.nodes
      .slice()
      .sort((a, b) => a.nodeOrder - b.nodeOrder);
    const currentIndex = orderedNodes.findIndex((node) => node.id === currentNode.id);
    const nextNode = orderedNodes.slice(currentIndex + 1).find((node) => node.status === "pending");

    if (actionType === "reject") {
      orderedNodes.slice(currentIndex + 1).forEach((node) => {
        if (node.status === "pending") {
          node.status = "skipped";
          node.finishedAt = now;
        }
      });
      approvalInstance.status = "rejected";
      approvalInstance.currentNodeId = null;
      approvalInstance.finishedAt = now;
    } else if (nextNode) {
      nextNode.status = "in_progress";
      nextNode.startedAt = now;
      approvalInstance.status = "in_progress";
      approvalInstance.currentNodeId = nextNode.id;
    } else {
      approvalInstance.status = "approved";
      approvalInstance.currentNodeId = null;
      approvalInstance.finishedAt = now;
      if (context.solution) {
        context.solution.approvalStatus = "approved";
        context.solution.status = "approved";
        await this.solutionRepository.save(context.solution);
      }
      if (context.opportunity) {
        context.opportunity.approvalStatus = "approved";
        context.opportunity.approvalOpinion = input.comment?.trim() || null;
        await this.opportunityRepository.save(context.opportunity);
      }
    }

    const action = this.approvalActionRepository.create({
      approvalInstance,
      approvalInstanceNode: currentNode,
      actionType,
      operator: operator || null,
      comment: input.comment?.trim() || null,
      payload:
        input.fileName || input.assignedToUsername || input.value
          ? {
              fileName: input.fileName || null,
              assignedToUsername: input.assignedToUsername || null,
              value: input.value || null,
            }
          : null,
    });

    await this.approvalInstanceNodeRepository.save(orderedNodes);
    await this.approvalInstanceRepository.save(approvalInstance);
    await this.approvalActionRepository.save(action);
    await this.syncBusinessApprovalState(context, approvalInstance);

    return this.findOne(id, currentUser);
  }
}
