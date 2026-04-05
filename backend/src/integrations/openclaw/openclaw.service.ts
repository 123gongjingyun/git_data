import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { type AuthenticatedUser } from "../../auth/auth.service";
import { runtimeConfig } from "../../config/runtime";
import { FeishuUserBinding } from "../../domain/entities/feishu-user-binding.entity";
import { User } from "../../domain/entities/user.entity";
import { FeishuService } from "../feishu/feishu.service";

export type OpenClawSkillName =
  | "get_my_pending_approvals"
  | "get_opportunity_summary"
  | "get_solution_summary"
  | "get_daily_brief";

export interface OpenClawContextInput {
  platformUserId?: number;
  feishuOpenId?: string;
  queryText?: string;
  requestId?: string;
}

export interface OpenClawQueryInput extends OpenClawContextInput {
  queryText: string;
}

interface ExecuteSkillInput extends OpenClawContextInput {
  input?: Record<string, unknown>;
  code?: unknown;
  businessCode?: unknown;
  opportunityCode?: unknown;
  solutionCode?: unknown;
  limit?: unknown;
  businessType?: unknown;
}

interface ResolvedOpenClawIntent {
  skillName: OpenClawSkillName;
  arguments: Record<string, unknown>;
  reason: string;
}

@Injectable()
export class OpenClawService {
  constructor(
    private readonly feishuService: FeishuService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(FeishuUserBinding)
    private readonly feishuBindingRepository: Repository<FeishuUserBinding>,
  ) {}

  assertSharedToken(token?: string) {
    const configuredToken = runtimeConfig.openClawSharedToken.trim();
    if (!configuredToken) {
      throw new ForbiddenException("OpenClaw 只读集成尚未启用");
    }
    if (!token || token !== configuredToken) {
      throw new ForbiddenException("OpenClaw 鉴权失败");
    }
  }

  listSkills() {
    return {
      items: [
        {
          name: "get_my_pending_approvals" as const,
          description: "返回当前用户可处理的待审批结构化列表，只读。",
          readonly: true,
          inputSchema: {
            type: "object",
            properties: {
              limit: { type: "number", minimum: 1, maximum: 20 },
              businessType: {
                type: "string",
                enum: ["opportunity", "solution"],
              },
            },
          },
        },
        {
          name: "get_opportunity_summary" as const,
          description: "按商机编号返回结构化商机摘要，只读。",
          readonly: true,
          inputSchema: {
            type: "object",
            required: ["code"],
            properties: {
              code: { type: "string", pattern: "^OPP-\\d{6}$" },
            },
          },
        },
        {
          name: "get_solution_summary" as const,
          description: "按方案编号返回结构化方案摘要，只读。",
          readonly: true,
          inputSchema: {
            type: "object",
            required: ["code"],
            properties: {
              code: { type: "string", pattern: "^SOL-\\d{6}$" },
            },
          },
        },
        {
          name: "get_daily_brief" as const,
          description: "返回当前用户今日简报，只读。",
          readonly: true,
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
      ],
      total: 4,
    };
  }

  async executeSkill(skillName: OpenClawSkillName, payload: ExecuteSkillInput) {
    const actor = await this.resolveActor(payload);
    const requestId = payload.requestId || `openclaw-${skillName}-${Date.now()}`;
    const input = this.normalizeSkillInput(payload);

    if (skillName === "get_my_pending_approvals") {
      return {
        skillName,
        requestId,
        actor: this.toActorSummary(actor, payload.feishuOpenId),
        result: await this.feishuService.getPendingApprovals(actor, {
          limit: this.readNumber(input.limit),
          businessType: this.readBusinessType(input.businessType),
        }),
      };
    }

    if (skillName === "get_opportunity_summary") {
      const code = this.readBusinessCode(input.code, "OPP");
      return {
        skillName,
        requestId,
        actor: this.toActorSummary(actor, payload.feishuOpenId),
        result: await this.feishuService.getOpportunitySummary(code, actor),
      };
    }

    if (skillName === "get_solution_summary") {
      const code = this.readBusinessCode(input.code, "SOL");
      return {
        skillName,
        requestId,
        actor: this.toActorSummary(actor, payload.feishuOpenId),
        result: await this.feishuService.getSolutionSummary(code, actor),
      };
    }

    return {
      skillName,
      requestId,
      actor: this.toActorSummary(actor, payload.feishuOpenId),
      result: await this.feishuService.getDailyBrief(actor),
    };
  }

  async query(payload: OpenClawQueryInput) {
    const actor = await this.resolveActor(payload);
    const intent = this.resolveIntent(payload.queryText);
    const requestId = payload.requestId || `openclaw-query-${Date.now()}`;
    const execution = await this.executeSkill(intent.skillName, {
      ...payload,
      requestId,
      input: intent.arguments,
    });

    return {
      requestId,
      queryText: payload.queryText,
      intent: {
        skillName: intent.skillName,
        arguments: intent.arguments,
        reason: intent.reason,
      },
      actor: this.toActorSummary(actor, payload.feishuOpenId),
      result: execution.result,
    };
  }

  private async resolveActor(input: OpenClawContextInput): Promise<AuthenticatedUser> {
    const platformUserId =
      typeof input.platformUserId === "number" && Number.isFinite(input.platformUserId)
        ? input.platformUserId
        : undefined;

    let resolvedUserId = platformUserId;
    if (input.feishuOpenId) {
      const binding = await this.feishuBindingRepository.findOne({
        where: {
          feishuOpenId: input.feishuOpenId,
          status: "active",
        },
        relations: ["platformUser"],
      });
      if (!binding || !binding.platformUser || !binding.platformUser.isActive) {
        throw new NotFoundException("未找到可用的飞书绑定账号");
      }
      if (resolvedUserId && binding.platformUserId !== resolvedUserId) {
        throw new ForbiddenException("OpenClaw 上下文中的平台用户与飞书绑定不一致");
      }
      resolvedUserId = binding.platformUserId;
    }

    if (!resolvedUserId) {
      throw new BadRequestException("缺少 platformUserId 或 feishuOpenId");
    }

    const user = await this.userRepository.findOne({
      where: { id: resolvedUserId },
    });
    if (!user || !user.isActive) {
      throw new NotFoundException("当前 OpenClaw 用户上下文无效");
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName || undefined,
      email: user.email || undefined,
      role: user.role,
      roleLabel: user.role,
      permissions: [],
      permissionSummary: "",
      roleMenuKeys: [],
      allowedMenuKeys: user.allowedMenuKeys || [],
      deniedMenuKeys: user.deniedMenuKeys || [],
      effectiveMenuKeys: [],
      roleActionKeys: [],
      allowedActionKeys: user.allowedActionKeys || [],
      deniedActionKeys: user.deniedActionKeys || [],
      effectiveActionKeys: [],
      isActive: user.isActive,
      mainIndustry: user.mainIndustry || [],
      teamRole: user.teamRole || undefined,
    };
  }

  private resolveIntent(queryText: string): ResolvedOpenClawIntent {
    const normalized = queryText.trim().replace(/\s+/g, " ");
    if (!normalized) {
      throw new BadRequestException("queryText 不能为空");
    }

    if (this.isReadonlyViolation(normalized)) {
      throw new ForbiddenException("OPENCLAW_READONLY_ONLY: OpenClaw 当前只允许只读查询");
    }

    const opportunityCode = normalized.match(/OPP-\d{6}/i)?.[0]?.toUpperCase();
    if (
      opportunityCode &&
      /(商机摘要|商机情况|商机进展|opportunity)/i.test(normalized)
    ) {
      return {
        skillName: "get_opportunity_summary",
        arguments: { code: opportunityCode },
        reason: "matched_opportunity_code",
      };
    }

    const solutionCode = normalized.match(/SOL-\d{6}/i)?.[0]?.toUpperCase();
    if (solutionCode && /(方案摘要|方案情况|方案进展|solution)/i.test(normalized)) {
      return {
        skillName: "get_solution_summary",
        arguments: { code: solutionCode },
        reason: "matched_solution_code",
      };
    }

    if (/(今日简报|今天简报|今日概览|today brief|daily brief)/i.test(normalized)) {
      return {
        skillName: "get_daily_brief",
        arguments: {},
        reason: "matched_daily_brief_keywords",
      };
    }

    if (/(待我审批|我的待审批|待审批|pending approval|approval list)/i.test(normalized)) {
      return {
        skillName: "get_my_pending_approvals",
        arguments: {},
        reason: "matched_pending_keywords",
      };
    }

    if (opportunityCode) {
      return {
        skillName: "get_opportunity_summary",
        arguments: { code: opportunityCode },
        reason: "matched_opportunity_code_only",
      };
    }

    if (solutionCode) {
      return {
        skillName: "get_solution_summary",
        arguments: { code: solutionCode },
        reason: "matched_solution_code_only",
      };
    }

    throw new BadRequestException(
      "暂无法识别该只读意图。当前仅支持待审批、今日简报、商机摘要、方案摘要。",
    );
  }

  private isReadonlyViolation(text: string) {
    return /(通过|驳回|审批通过|审批驳回|approve|reject|修改|更新|删除|创建|指派)/i.test(
      text,
    );
  }

  private readNumber(value: unknown) {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      throw new BadRequestException("limit 必须为数字");
    }
    return numeric;
  }

  private readBusinessType(value: unknown) {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    if (value === "opportunity" || value === "solution") {
      return value;
    }
    throw new BadRequestException("businessType 仅支持 opportunity / solution");
  }

  private readBusinessCode(value: unknown, prefix: "OPP" | "SOL") {
    if (typeof value !== "string" || !value.trim()) {
      throw new BadRequestException(`缺少 ${prefix} 编号`);
    }
    const code = value.trim().toUpperCase();
    if (!new RegExp(`^${prefix}-\\d{6}$`).test(code)) {
      throw new BadRequestException(`编号格式不正确，应为 ${prefix}-000001`);
    }
    return code;
  }

  private normalizeSkillInput(payload: ExecuteSkillInput) {
    const nestedInput =
      payload.input && typeof payload.input === "object" ? payload.input : {};

    return {
      ...nestedInput,
      limit: nestedInput.limit ?? payload.limit,
      businessType: nestedInput.businessType ?? payload.businessType,
      code:
        nestedInput.code ??
        nestedInput.businessCode ??
        payload.code ??
        payload.businessCode ??
        payload.opportunityCode ??
        payload.solutionCode,
    };
  }

  private toActorSummary(actor: AuthenticatedUser, feishuOpenId?: string) {
    return {
      platformUserId: actor.id,
      username: actor.username,
      role: actor.role,
      feishuOpenId: feishuOpenId || undefined,
    };
  }
}
