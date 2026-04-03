import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { type AuthenticatedUser } from "../../auth/auth.service";
import { ApprovalsService } from "../../approvals/approvals.service";
import { runtimeConfig } from "../../config/runtime";
import { ApprovalInstance } from "../../domain/entities/approval-instance.entity";
import {
  FeishuCallbackLog,
  type FeishuCallbackStatus,
} from "../../domain/entities/feishu-callback-log.entity";
import {
  FeishuMessageLog,
  type FeishuMessageType,
  type FeishuSendStatus,
} from "../../domain/entities/feishu-message-log.entity";
import {
  FeishuUserBinding,
  type FeishuBindingSource,
  type FeishuBindingStatus,
} from "../../domain/entities/feishu-user-binding.entity";
import { Opportunity } from "../../domain/entities/opportunity.entity";
import { SolutionVersion } from "../../domain/entities/solution-version.entity";
import { User } from "../../domain/entities/user.entity";

export interface FeishuBindingRecord {
  id: number;
  feishuOpenId: string;
  feishuUnionId?: string;
  feishuUserId?: string;
  feishuName: string;
  platformUserId: number;
  platformUsername: string;
  department: string;
  bindingSource: FeishuBindingSource;
  status: FeishuBindingStatus;
  updatedAt: string;
}

export interface CreateFeishuBindingInput {
  feishuOpenId: string;
  feishuUnionId?: string;
  feishuUserId?: string;
  feishuName?: string;
  platformUserId: number;
  status?: FeishuBindingStatus;
}

export interface UpdateFeishuBindingInput {
  platformUserId?: number;
  status?: FeishuBindingStatus;
}

interface PendingApprovalsQuery {
  limit?: number;
  businessType?: "opportunity" | "solution";
}

const FEISHU_BINDINGS_SEED: FeishuBindingRecord[] = [
  {
    id: 1,
    feishuOpenId: "ou_2f1b7c9e_demo_admin",
    feishuName: "张三-飞书",
    platformUserId: 1,
    platformUsername: "admin_demo",
    department: "平台管理组",
    bindingSource: "manual",
    status: "active",
    updatedAt: "2026-04-03 09:30",
  },
  {
    id: 2,
    feishuOpenId: "ou_9d8c7a6b_demo_mgr",
    feishuName: "王经理",
    platformUserId: 2,
    platformUsername: "manager_demo",
    department: "售前管理部",
    bindingSource: "manual",
    status: "active",
    updatedAt: "2026-04-03 10:10",
  },
  {
    id: 3,
    feishuOpenId: "ou_3c5d7e9f_demo_sales",
    feishuName: "李四-销售",
    platformUserId: 4,
    platformUsername: "sales_demo",
    department: "行业销售一部",
    bindingSource: "import",
    status: "pending",
    updatedAt: "2026-04-03 10:40",
  },
];

@Injectable()
export class FeishuService {
  private seedPromise?: Promise<void>;

  constructor(
    private readonly approvalsService: ApprovalsService,
    @InjectRepository(FeishuCallbackLog)
    private readonly feishuCallbackLogRepository: Repository<FeishuCallbackLog>,
    @InjectRepository(FeishuMessageLog)
    private readonly feishuMessageLogRepository: Repository<FeishuMessageLog>,
    @InjectRepository(FeishuUserBinding)
    private readonly feishuBindingRepository: Repository<FeishuUserBinding>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Opportunity)
    private readonly opportunityRepository: Repository<Opportunity>,
    @InjectRepository(SolutionVersion)
    private readonly solutionRepository: Repository<SolutionVersion>,
    @InjectRepository(ApprovalInstance)
    private readonly approvalInstanceRepository: Repository<ApprovalInstance>,
  ) {}

  async handleEventCallback(
    body: { challenge?: string; token?: string; header?: Record<string, unknown> },
    request?: {
      headers?: Record<string, string | string[] | undefined>;
    },
  ) {
    const eventId =
      (typeof body.header?.event_id === "string" && body.header.event_id) ||
      undefined;
    const callbackLog = await this.feishuCallbackLogRepository.save(
      this.feishuCallbackLogRepository.create({
        callbackType: "event",
        eventId: eventId || null,
        requestJson: {
          body,
          headers: request?.headers || {},
        },
        status: "received",
      }),
    );

    try {
      this.assertEventToken(body);

      if (eventId) {
        const duplicated = await this.feishuCallbackLogRepository.findOne({
          where: {
            callbackType: "event",
            eventId,
          },
          order: { id: "DESC" },
        });
        if (duplicated && duplicated.id !== callbackLog.id) {
          const duplicateResult = {
            code: 0,
            message: "duplicate event ignored",
          };
          await this.finishCallbackLog(callbackLog, "ignored", duplicateResult);
          return duplicateResult;
        }
      }

      if (body.challenge) {
        const challengeResult = { challenge: body.challenge };
        await this.finishCallbackLog(callbackLog, "processed", challengeResult);
        return challengeResult;
      }

      const result = {
        code: 0,
        message:
          "Feishu event callback accepted. Signature verification is still pending, but verification token check is enabled when configured.",
      };
      await this.finishCallbackLog(callbackLog, "processed", result);
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "飞书事件回调处理失败";
      const failedResult = {
        code: 1,
        message,
      };
      await this.finishCallbackLog(callbackLog, "failed", failedResult, message);
      throw error;
    }
  }

  async handleCardAction(body: Record<string, unknown>) {
    const operatorOpenId =
      typeof body.open_id === "string" ? body.open_id : undefined;
    const actionToken = this.readString(body, ["token", "action.token", "action.value.actionToken"]);
    const action = this.readString(body, ["action.value.action", "action.action", "actionValue.action"]);
    const approvalInstanceId = this.readNumber(body, [
      "action.value.approvalInstanceId",
      "action.approvalInstanceId",
      "approvalInstanceId",
    ]);
    const businessType = this.readString(body, [
      "action.value.businessType",
      "action.businessType",
    ]);
    const businessId = this.readNumber(body, [
      "action.value.businessId",
      "action.businessId",
    ]);
    const comment = this.readString(body, [
      "action.value.comment",
      "action.formValue.comment",
      "comment",
    ]);

    const callbackLog = await this.feishuCallbackLogRepository.save(
      this.feishuCallbackLogRepository.create({
        callbackType: "card_action",
        actionToken: actionToken || null,
        eventId:
          typeof body.event_id === "string"
            ? body.event_id
            : null,
        operatorOpenId: operatorOpenId || null,
        businessType: businessType || null,
        businessId: businessId ?? null,
        requestJson: body,
        status: "received",
      }),
    );

    try {
      if (actionToken) {
        const processed = await this.feishuCallbackLogRepository.findOne({
          where: {
            callbackType: "card_action",
            actionToken,
          },
          order: { id: "DESC" },
        });
        if (processed && processed.id !== callbackLog.id) {
          const duplicateResult = {
            toast: {
              type: "warning",
              content: "该卡片动作已处理，请刷新最新卡片状态。",
            },
          };
          await this.logOutboundMessage({
            receiverId: operatorOpenId || "unknown",
            messageType: "interactive",
            businessType,
            businessId,
            templateKey: "card_action_duplicate",
            payloadJson: duplicateResult,
            responseJson: { callbackLogId: processed.id },
            sendStatus: "sent",
          });
          await this.finishCallbackLog(callbackLog, "ignored", duplicateResult);
          return duplicateResult;
        }
      }

      if (!operatorOpenId) {
        throw new BadRequestException("缺少飞书操作人 open_id");
      }

      const binding = await this.feishuBindingRepository.findOne({
        where: {
          feishuOpenId: operatorOpenId,
        },
        relations: ["platformUser"],
      });
      if (!binding || binding.status !== "active") {
        throw new NotFoundException("当前飞书用户未绑定有效的平台账号");
      }

      callbackLog.operatorOpenId = operatorOpenId;
      callbackLog.operatorPlatformUserId = binding.platformUserId;
      callbackLog.operatorPlatformUser = binding.platformUser;
      await this.feishuCallbackLogRepository.save(callbackLog);

      if (action === "open_detail") {
        const openResult = {
          toast: {
            type: "success",
            content: "请在平台中继续处理详情。",
          },
          action: {
            url:
              typeof businessId === "number" && businessType
                ? `/${businessType === "solution" ? "solutions" : "opportunities"}?highlight=${
                    this.formatBusinessCode(
                      businessType === "solution" ? "SOL" : "OPP",
                      businessId,
                    )
                  }`
                : "/",
          },
        };
        await this.logOutboundMessage({
          receiverId: operatorOpenId,
          messageType: "interactive",
          businessType,
          businessId,
          templateKey: "card_action_open_detail",
          payloadJson: openResult,
          responseJson: { callbackLogId: callbackLog.id },
          sendStatus: "sent",
        });
        await this.finishCallbackLog(callbackLog, "processed", openResult);
        return openResult;
      }

      if (!approvalInstanceId) {
        throw new BadRequestException("缺少 approvalInstanceId");
      }
      if (!(action === "approve" || action === "reject")) {
        throw new BadRequestException("当前仅支持 approve / reject / open_detail 三类动作");
      }

      const approvalInstance = await this.approvalInstanceRepository.findOne({
        where: { id: approvalInstanceId },
      });
      if (!approvalInstance || !["pending", "in_progress"].includes(approvalInstance.status)) {
        const staleResult = {
          toast: {
            type: "warning",
            content: "当前卡片已失效，请重新获取最新审批卡片。",
          },
        };
        await this.logOutboundMessage({
          receiverId: operatorOpenId,
          messageType: "interactive",
          businessType,
          businessId,
          templateKey: "card_action_stale",
          payloadJson: staleResult,
          responseJson: { callbackLogId: callbackLog.id },
          sendStatus: "sent",
        });
        await this.finishCallbackLog(callbackLog, "ignored", staleResult);
        return staleResult;
      }

      const approvalResult = await this.approvalsService.executeAction(
        approvalInstanceId,
        {
          actionType: action,
          comment,
        },
        {
          id: binding.platformUserId,
          username: binding.platformUsername,
          role: binding.platformUser.role,
        },
      );

      const currentNodeName =
        approvalResult.currentNode?.nodeName || "已完成";
      const result = {
        toast: {
          type: "success",
          content:
            action === "approve"
              ? `审批已通过，当前节点：${currentNodeName}`
              : "审批已驳回，平台状态已更新。",
        },
        card: {
          status: approvalResult.status,
          currentNodeName,
          approvalInstanceId,
        },
      };
      await this.logOutboundMessage({
        receiverId: operatorOpenId,
        messageType: "interactive",
        businessType,
        businessId,
        templateKey: action === "approve" ? "card_action_approve" : "card_action_reject",
        payloadJson: result,
        responseJson: {
          callbackLogId: callbackLog.id,
          approvalStatus: approvalResult.status,
        },
        sendStatus: "sent",
      });
      await this.finishCallbackLog(callbackLog, "processed", result);
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "飞书卡片动作处理失败";
      const failedResult = {
        toast: {
          type: "error",
          content: message,
        },
      };
      await this.logOutboundMessage({
        receiverId: operatorOpenId || "unknown",
        messageType: "interactive",
        businessType,
        businessId,
        templateKey: "card_action_error",
        payloadJson: failedResult,
        responseJson: { callbackLogId: callbackLog.id },
        sendStatus: "failed",
        errorMessage: message,
      });
      await this.finishCallbackLog(callbackLog, "failed", failedResult, message);
      throw error;
    }
  }

  listBindings() {
    return this.listBindingsInternal();
  }

  private async listBindingsInternal() {
    await this.ensureSeedBindings();
    const bindings = await this.feishuBindingRepository.find({
      relations: ["platformUser"],
      order: { updatedAt: "DESC" },
    });
    return {
      items: bindings.map((item) => this.toBindingRecord(item)),
      total: bindings.length,
    };
  }

  async createBinding(
    input: CreateFeishuBindingInput,
    actor: AuthenticatedUser,
  ) {
    await this.ensureSeedBindings();
    const feishuOpenId = input.feishuOpenId?.trim();
    if (!feishuOpenId) {
      throw new BadRequestException("feishuOpenId 不能为空");
    }

    const targetUser = await this.userRepository.findOne({
      where: { id: input.platformUserId },
    });
    if (!targetUser) {
      throw new NotFoundException("绑定的平台注册用户不存在");
    }

    await this.assertBindingUniqueness(feishuOpenId, targetUser.id);

    const saved = await this.feishuBindingRepository.save(
      this.feishuBindingRepository.create({
        feishuOpenId,
        feishuUnionId: input.feishuUnionId?.trim() || null,
        feishuUserId: input.feishuUserId?.trim() || null,
        feishuName: input.feishuName?.trim() || targetUser.displayName || targetUser.username,
        platformUserId: targetUser.id,
        platformUser: targetUser,
        platformUsername: targetUser.username,
        department: targetUser.teamRole || "未分配团队",
        bindingSource: "manual",
        status: input.status || "pending",
      }),
    );

    return {
      ...this.toBindingRecord(saved),
      updatedBy: actor.username,
    };
  }

  async updateBinding(
    id: number,
    input: UpdateFeishuBindingInput,
    actor: AuthenticatedUser,
  ) {
    await this.ensureSeedBindings();
    const existing = await this.feishuBindingRepository.findOne({
      where: { id },
      relations: ["platformUser"],
    });
    if (!existing) {
      throw new NotFoundException("飞书绑定记录不存在");
    }

    let targetUser: User | null = null;
    if (input.platformUserId !== undefined) {
      targetUser = await this.userRepository.findOne({
        where: { id: input.platformUserId },
      });
      if (!targetUser) {
        throw new NotFoundException("绑定的平台注册用户不存在");
      }
      await this.assertBindingUniqueness(existing.feishuOpenId, targetUser.id, existing.id);
    }

    const updated = this.feishuBindingRepository.create({
      ...existing,
      platformUserId: targetUser?.id ?? existing.platformUserId,
      platformUser: targetUser ?? existing.platformUser,
      platformUsername: targetUser?.username ?? existing.platformUsername,
      department: targetUser?.teamRole || existing.department,
      status: input.status || existing.status,
    });
    const saved = await this.feishuBindingRepository.save(updated);
    return {
      ...this.toBindingRecord(saved),
      updatedBy: actor.username,
    };
  }

  async getPendingApprovals(
    user: AuthenticatedUser,
    query: PendingApprovalsQuery,
  ) {
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 20) : 10;
    const instances = await this.approvalInstanceRepository.find({
      where: { status: "pending" as any },
      relations: ["workflowDefinition", "startedBy", "nodes"],
      order: { updatedAt: "DESC" },
      take: limit * 2,
    });

    const items = [];
    for (const instance of instances) {
      if (query.businessType && instance.businessType !== query.businessType) {
        continue;
      }
      const item = await this.mapPendingApprovalItem(instance, user);
      if (item) {
        items.push(item);
      }
      if (items.length >= limit) {
        break;
      }
    }

    return {
      items,
      total: items.length,
      requestId: `feishu-pending-${Date.now()}`,
    };
  }

  async getOpportunitySummary(code: string, user: AuthenticatedUser) {
    const opportunityId = this.parseBusinessCode(code, "OPP");
    const opportunity = await this.opportunityRepository.findOne({
      where: { id: opportunityId },
      relations: ["owner", "customer"],
    });
    if (!opportunity) {
      throw new NotFoundException("未找到对应商机");
    }

    return {
      id: opportunity.id,
      code: this.formatBusinessCode("OPP", opportunity.id),
      name: opportunity.name,
      customerName: opportunity.customer?.name || undefined,
      ownerName:
        opportunity.owner?.displayName || opportunity.owner?.username || undefined,
      stage: opportunity.stage,
      expectedValue: opportunity.expectedValue || undefined,
      probability: opportunity.probability ?? undefined,
      expectedCloseDate: opportunity.expectedCloseDate || undefined,
      approvalStatus: opportunity.approvalStatus || undefined,
      currentApprovalNodeName: await this.resolveCurrentApprovalNodeName(
        opportunity.currentApprovalInstanceId,
      ),
      solutionOwnerName: opportunity.solutionOwnerUsername || undefined,
      requirementBriefDocName: opportunity.requirementBriefDocName || undefined,
      researchDocName: opportunity.researchDocName || undefined,
      approvalOpinion: opportunity.approvalOpinion || undefined,
      riskSummary: this.buildOpportunityRiskSummary(opportunity),
      nextActions: this.buildOpportunityNextActions(opportunity, user),
      updatedAt: opportunity.updatedAt.toISOString(),
      detailUrl: `/opportunities?highlight=${this.formatBusinessCode("OPP", opportunity.id)}`,
    };
  }

  async getSolutionSummary(code: string, _user: AuthenticatedUser) {
    const solutionId = this.parseBusinessCode(code, "SOL");
    const solution = await this.solutionRepository.findOne({
      where: { id: solutionId },
      relations: ["createdBy", "opportunity", "opportunity.customer"],
    });
    if (!solution) {
      throw new NotFoundException("未找到对应方案");
    }

    return {
      id: solution.id,
      code: this.formatBusinessCode("SOL", solution.id),
      name: solution.name,
      versionTag: solution.versionTag || undefined,
      status: solution.status,
      approvalStatus: solution.approvalStatus || undefined,
      opportunityId: solution.opportunity.id,
      opportunityCode: this.formatBusinessCode("OPP", solution.opportunity.id),
      opportunityName: solution.opportunity.name,
      customerName: solution.opportunity.customer?.name || undefined,
      createdByName:
        solution.createdBy?.displayName || solution.createdBy?.username || undefined,
      currentApprovalNodeName: await this.resolveCurrentApprovalNodeName(
        solution.currentApprovalInstanceId,
      ),
      summary: solution.summary || undefined,
      latestReviewConclusion: this.buildSolutionReviewConclusion(solution),
      updatedAt: solution.updatedAt.toISOString(),
      detailUrl: `/solutions?highlight=${this.formatBusinessCode("SOL", solution.id)}`,
    };
  }

  async getDailyBrief(user: AuthenticatedUser) {
    const pendingApprovals = await this.getPendingApprovals(user, { limit: 5 });
    const myOpportunities = await this.opportunityRepository.find({
      relations: ["owner"],
      where: user.role === "sales" ? { owner: { id: user.id } } : undefined,
      order: { updatedAt: "DESC" },
      take: 12,
    });
    const inRiskOpportunityCount = myOpportunities.filter(
      (item) =>
        (item.probability ?? 0) < 60 || item.approvalStatus === "rejected",
    ).length;
    const updatedSolutions = await this.solutionRepository.find({
      order: { updatedAt: "DESC" },
      take: 10,
    });

    return {
      date: new Date().toISOString().slice(0, 10),
      userId: user.id,
      pendingApprovalCount: pendingApprovals.total,
      pendingApprovalTopItems: pendingApprovals.items,
      myOpportunityCount: myOpportunities.length,
      inRiskOpportunityCount,
      updatedSolutionCount: updatedSolutions.length,
      summaryLines: [
        `你当前有 ${pendingApprovals.total} 条待审批事项。`,
        `你负责或关注的商机中，${inRiskOpportunityCount} 条需要优先跟进。`,
        `今天共有 ${updatedSolutions.length} 个方案版本在最近一轮更新中。`,
      ],
      generatedBy: "platform",
    };
  }

  private async mapPendingApprovalItem(
    instance: ApprovalInstance,
    user: AuthenticatedUser,
  ) {
    if (instance.businessType === "opportunity") {
      const opportunity = await this.opportunityRepository.findOne({
        where: { id: instance.businessId },
        relations: ["owner", "customer"],
      });
      if (!opportunity) {
        return null;
      }
      return {
        approvalInstanceId: instance.id,
        businessType: "opportunity",
        businessId: opportunity.id,
        businessCode: this.formatBusinessCode("OPP", opportunity.id),
        title: opportunity.name,
        customerName: opportunity.customer?.name || undefined,
        currentNodeId: instance.currentNodeId || undefined,
        currentNodeName:
          this.findCurrentNodeName(instance) || "待处理节点",
        status: instance.status,
        stage: opportunity.stage,
        initiatorName:
          instance.startedBy?.displayName || instance.startedBy?.username || undefined,
        canApprove: this.canUserHandleInstance(user, opportunity.owner?.id),
        updatedAt: instance.updatedAt.toISOString(),
        summary: `当前处于 ${opportunity.stage} 阶段，预计金额 ${
          opportunity.expectedValue || "待补充"
        }。`,
        detailUrl: `/opportunities?highlight=${this.formatBusinessCode("OPP", opportunity.id)}`,
      };
    }

    const solution = await this.solutionRepository.findOne({
      where: { id: instance.businessId },
      relations: ["createdBy", "opportunity", "opportunity.customer"],
    });
    if (!solution) {
      return null;
    }
    return {
      approvalInstanceId: instance.id,
      businessType: "solution",
      businessId: solution.id,
      businessCode: this.formatBusinessCode("SOL", solution.id),
      title: solution.name,
      customerName: solution.opportunity.customer?.name || undefined,
      currentNodeId: instance.currentNodeId || undefined,
      currentNodeName: this.findCurrentNodeName(instance) || "待处理节点",
      status: instance.status,
      stage: solution.status,
      initiatorName:
        instance.startedBy?.displayName || instance.startedBy?.username || undefined,
      canApprove: this.canUserHandleInstance(user, solution.createdBy?.id),
      updatedAt: instance.updatedAt.toISOString(),
      summary: `当前方案版本 ${
        solution.versionTag || "未标记版本"
      }，状态为 ${solution.status}。`,
      detailUrl: `/solutions?highlight=${this.formatBusinessCode("SOL", solution.id)}`,
    };
  }

  private canUserHandleInstance(user: AuthenticatedUser, businessOwnerId?: number | null) {
    if (user.role === "admin" || user.role === "manager") {
      return true;
    }
    return Boolean(businessOwnerId && businessOwnerId === user.id);
  }

  private findCurrentNodeName(instance: ApprovalInstance) {
    const node = instance.nodes?.find((item) => item.id === instance.currentNodeId);
    return node?.nodeNameSnapshot;
  }

  private async resolveCurrentApprovalNodeName(instanceId?: number | null) {
    if (!instanceId) {
      return undefined;
    }
    const instance = await this.approvalInstanceRepository.findOne({
      where: { id: instanceId },
      relations: ["nodes"],
    });
    if (!instance) {
      return undefined;
    }
    return this.findCurrentNodeName(instance) || undefined;
  }

  private buildOpportunityRiskSummary(opportunity: Opportunity) {
    const risks: string[] = [];
    if ((opportunity.probability ?? 0) < 60) {
      risks.push("成交概率低于 60%，建议复核客户预算与推进节奏。");
    }
    if (opportunity.approvalStatus === "rejected") {
      risks.push("最近审批结果为驳回，需要尽快补充材料后重新提交。");
    }
    if (!opportunity.requirementBriefDocName) {
      risks.push("尚未补充客户需求说明文档。");
    }
    if (risks.length === 0) {
      risks.push("当前未发现高优先级结构化风险。");
    }
    return risks;
  }

  private buildOpportunityNextActions(opportunity: Opportunity, user: AuthenticatedUser) {
    const actions: string[] = [];
    if (!opportunity.requirementBriefDocName) {
      actions.push("补充需求说明文档后再进入后续审批。");
    }
    if (!opportunity.solutionOwnerUsername) {
      actions.push("尽快指派解决方案负责人。");
    }
    if (opportunity.approvalStatus === "pending" || opportunity.approvalStatus === "in_review") {
      actions.push(
        user.role === "manager" || user.role === "admin"
          ? "优先处理当前审批节点。"
          : "关注当前审批节点推进状态。",
      );
    }
    if (actions.length === 0) {
      actions.push("保持当前推进节奏，继续跟进客户反馈。");
    }
    return actions;
  }

  private buildSolutionReviewConclusion(solution: SolutionVersion) {
    if (solution.approvalStatus === "approved") {
      return "最近结论：方案审批已通过。";
    }
    if (solution.approvalStatus === "rejected") {
      return "最近结论：方案审批被驳回，需按意见修订。";
    }
    if (solution.status === "in_review") {
      return "最近结论：方案处于评审中，待当前节点处理。";
    }
    return "最近结论：暂无完整评审结论。";
  }

  private parseBusinessCode(code: string, prefix: "OPP" | "SOL") {
    const normalized = code.trim().toUpperCase();
    const match = normalized.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (!match) {
      throw new BadRequestException(`编号格式不正确，应为 ${prefix}-000001`);
    }
    return Number(match[1]);
  }

  private formatBusinessCode(prefix: "OPP" | "SOL", id: number) {
    return `${prefix}-${String(id).padStart(6, "0")}`;
  }

  private buildTimestamp() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 5);
    return `${date} ${time}`;
  }

  private async ensureSeedBindings() {
    if (!this.seedPromise) {
      this.seedPromise = this.seedBindingsIfEmpty();
    }
    await this.seedPromise;
  }

  private async seedBindingsIfEmpty() {
    const existingCount = await this.feishuBindingRepository.count();
    if (existingCount > 0) {
      return;
    }

    for (const seed of FEISHU_BINDINGS_SEED) {
      const targetUser = await this.userRepository.findOne({
        where: { username: seed.platformUsername },
      });
      if (!targetUser) {
        continue;
      }
      const binding = this.feishuBindingRepository.create({
        feishuOpenId: seed.feishuOpenId,
        feishuName: seed.feishuName,
        platformUserId: targetUser.id,
        platformUser: targetUser,
        platformUsername: targetUser.username,
        department: seed.department,
        bindingSource: seed.bindingSource,
        status: seed.status,
      });
      await this.feishuBindingRepository.save(binding);
    }
  }

  private async assertBindingUniqueness(
    feishuOpenId: string,
    platformUserId: number,
    excludeId?: number,
  ) {
    const bindings = await this.feishuBindingRepository.find();
    const openIdTaken = bindings.find(
      (item) => item.feishuOpenId === feishuOpenId && item.id !== excludeId,
    );
    if (openIdTaken) {
      throw new ConflictException("该飞书 Open ID 已绑定其他平台账号");
    }
    const platformUserTaken = bindings.find(
      (item) => item.platformUserId === platformUserId && item.id !== excludeId,
    );
    if (platformUserTaken) {
      throw new ConflictException("该平台账号已绑定其他飞书用户");
    }
  }

  private toBindingRecord(binding: FeishuUserBinding): FeishuBindingRecord {
    return {
      id: binding.id,
      feishuOpenId: binding.feishuOpenId,
      feishuUnionId: binding.feishuUnionId || undefined,
      feishuUserId: binding.feishuUserId || undefined,
      feishuName: binding.feishuName || binding.platformUsername,
      platformUserId: binding.platformUserId,
      platformUsername: binding.platformUsername,
      department: binding.department || "未分配团队",
      bindingSource: binding.bindingSource,
      status: binding.status,
      updatedAt: this.buildTimestampFromDate(binding.updatedAt),
    };
  }

  private buildTimestampFromDate(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    const hour = String(value.getHours()).padStart(2, "0");
    const minute = String(value.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  private async finishCallbackLog(
    log: FeishuCallbackLog,
    status: FeishuCallbackStatus,
    resultJson: Record<string, unknown>,
    errorMessage?: string,
  ) {
    log.status = status;
    log.resultJson = resultJson;
    log.errorMessage = errorMessage || null;
    await this.feishuCallbackLogRepository.save(log);
  }

  private assertEventToken(body: {
    token?: string;
    header?: Record<string, unknown>;
  }) {
    const configuredToken = runtimeConfig.feishuVerificationToken.trim();
    if (!configuredToken) {
      return;
    }

    const candidateToken =
      (typeof body.token === "string" && body.token) ||
      (typeof body.header?.token === "string" && body.header.token) ||
      "";
    if (candidateToken !== configuredToken) {
      throw new BadRequestException("飞书事件 token 校验失败");
    }
  }

  private async logOutboundMessage(input: {
    receiverId: string;
    messageType: FeishuMessageType;
    businessType?: string;
    businessId?: number;
    templateKey?: string;
    payloadJson: Record<string, unknown>;
    responseJson?: Record<string, unknown>;
    sendStatus: FeishuSendStatus;
    errorMessage?: string;
  }) {
    await this.feishuMessageLogRepository.save(
      this.feishuMessageLogRepository.create({
        messageDirection: "outbound",
        messageType: input.messageType,
        receiverType: "open_id",
        receiverId: input.receiverId,
        businessType: input.businessType || null,
        businessId: input.businessId ?? null,
        templateKey: input.templateKey || null,
        payloadJson: input.payloadJson,
        responseJson: input.responseJson || null,
        sendStatus: input.sendStatus,
        errorMessage: input.errorMessage || null,
        sentAt: input.sendStatus === "sent" ? new Date() : null,
      }),
    );
  }

  private readPath(source: Record<string, unknown>, path: string) {
    const segments = path.split(".");
    let current: unknown = source;
    for (const segment of segments) {
      if (!current || typeof current !== "object" || !(segment in current)) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }
    return current;
  }

  private readString(source: Record<string, unknown>, paths: string[]) {
    for (const path of paths) {
      const value = this.readPath(source, path);
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    return undefined;
  }

  private readNumber(source: Record<string, unknown>, paths: string[]) {
    for (const path of paths) {
      const value = this.readPath(source, path);
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === "string" && /^\d+$/.test(value.trim())) {
        return Number(value.trim());
      }
    }
    return undefined;
  }
}
