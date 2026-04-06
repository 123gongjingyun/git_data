import { Tag, Typography } from "antd";
import type { ReactNode } from "react";
import type { PlaygroundResponse, RequestRecord, SuccessInsight } from "./types";

const { Text } = Typography;

export const QUICK_COMMANDS = [
  { key: "pending", label: "待我审批", queryText: "待我审批", tone: "blue" },
  { key: "brief", label: "今日简报", queryText: "给我今日简报", tone: "gold" },
  {
    key: "opportunity",
    label: "商机摘要",
    queryText: "商机摘要 OPP-000001",
    tone: "purple",
  },
  {
    key: "solution",
    label: "方案摘要",
    queryText: "方案摘要 SOL-000001",
    tone: "green",
  },
  {
    key: "readonly",
    label: "只读拦截",
    queryText: "帮我审批通过 OPP-000001",
    tone: "red",
  },
] as const;

export const QUICK_COMMAND_HINTS: Record<
  (typeof QUICK_COMMANDS)[number]["key"],
  string
> = {
  pending: "查看当前登录账号下可直接处理的审批事项。",
  brief: "查看今天待办、风险商机和方案更新的汇总结果。",
  opportunity: "按商机编号查看当前阶段、金额、风险和审批节点。",
  solution: "按方案编号查看版本状态、关联商机和最近评审。",
  readonly: "验证写操作会被 OpenClaw 只读能力明确拦截。",
};

export function formatDateTime(value: Date) {
  return value.toLocaleString("zh-CN", { hour12: false });
}

export function formatCurrency(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return undefined;
  }
  return `¥${numeric.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDateLabel(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  if (value.includes("T")) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString("zh-CN", { hour12: false });
    }
  }
  return value;
}

export function stringifyValue(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return "暂未返回";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function buildResultPreview(result: Record<string, unknown>, skillName?: string) {
  if (skillName === "get_my_pending_approvals") {
    const items = Array.isArray(result.items) ? result.items : [];
    if (items.length === 0) {
      return {
        title: "调用成功，当前无待审批数据",
        lines: ["当前账号下没有可直接处理的审批事项。"],
      };
    }

    return {
      title: `当前共有 ${stringifyValue(result.total ?? items.length)} 条待审批。`,
      lines: items.slice(0, 3).map((item) => {
        const row = item as Record<string, unknown>;
        return `${stringifyValue(row.businessCode)} · ${stringifyValue(row.currentNodeName)} · ${stringifyValue(row.summary || row.title)}`;
      }),
    };
  }

  if (skillName === "get_daily_brief") {
    return {
      title: "今日简报",
      lines: [
        `日期：${stringifyValue(result.date)}`,
        `待审批：${stringifyValue(result.pendingApprovalCount)} 条`,
        `风险商机：${stringifyValue(result.inRiskOpportunityCount)} 条`,
        `今日更新方案：${stringifyValue(result.updatedSolutionCount)} 个`,
        `关注商机：${stringifyValue(result.myOpportunityCount)} 条`,
      ],
    };
  }

  if (skillName === "get_opportunity_summary") {
    return {
      title: stringifyValue(result.code || result.name || "商机摘要"),
      lines: [
        `名称：${stringifyValue(result.name)}`,
        `阶段：${stringifyValue(result.stage)}`,
        `金额：${formatCurrency(result.expectedValue) || stringifyValue(result.expectedValue)}`,
        `赢单概率：${result.probability === undefined ? "暂未返回" : `${stringifyValue(result.probability)}%`}`,
        `当前审批节点：${stringifyValue(result.currentApprovalNodeName)}`,
        `核心风险：${stringifyValue(result.riskSummary)}`,
      ],
    };
  }

  if (skillName === "get_solution_summary") {
    return {
      title: stringifyValue(result.code || result.name || "方案摘要"),
      lines: [
        `名称：${stringifyValue(result.name)}`,
        `版本/状态：${stringifyValue(result.versionTag)} / ${stringifyValue(result.status)}`,
        `关联商机：${stringifyValue(result.opportunityCode)} ${stringifyValue(result.opportunityName)}`,
        `摘要：${stringifyValue(result.summary)}`,
        `最近评审：${stringifyValue(result.latestReviewConclusion)}`,
        `最近更新时间：${formatDateLabel(result.updatedAt) || stringifyValue(result.updatedAt)}`,
      ],
    };
  }

  return {
    title: "原始结果",
    lines: [stringifyValue(result)],
  };
}

export function getOutcomeMeta(outcome: RequestRecord["outcome"]) {
  if (outcome === "success") {
    return { color: "green", label: "成功", dot: "#52c41a" };
  }
  if (outcome === "blocked") {
    return { color: "gold", label: "安全拦截", dot: "#faad14" };
  }
  return { color: "red", label: "失败", dot: "#ff4d4f" };
}

export function buildFactItems(result: Record<string, unknown>, skillName?: string) {
  if (skillName === "get_my_pending_approvals") {
    return [
      { label: "待审批总数", value: stringifyValue(result.total ?? 0) },
      { label: "当前技能", value: "待我审批" },
      {
        label: "结果说明",
        value:
          Array.isArray(result.items) && result.items.length > 0
            ? "已返回待审批列表"
            : "调用成功，但当前无待审批数据",
      },
    ];
  }

  if (skillName === "get_daily_brief") {
    return [
      { label: "日期", value: stringifyValue(result.date) },
      { label: "待审批", value: stringifyValue(result.pendingApprovalCount) },
      { label: "风险商机", value: stringifyValue(result.inRiskOpportunityCount) },
      { label: "方案更新", value: stringifyValue(result.updatedSolutionCount) },
      { label: "关注商机", value: stringifyValue(result.myOpportunityCount) },
    ];
  }

  if (skillName === "get_opportunity_summary") {
    return [
      { label: "商机编号", value: stringifyValue(result.code) },
      { label: "当前阶段", value: stringifyValue(result.stage) },
      {
        label: "预计金额",
        value:
          formatCurrency(result.expectedValue) || stringifyValue(result.expectedValue),
      },
      {
        label: "赢单概率",
        value:
          result.probability === undefined
            ? "暂未返回"
            : `${stringifyValue(result.probability)}%`,
      },
      {
        label: "当前审批节点",
        value: stringifyValue(result.currentApprovalNodeName),
      },
      { label: "风险摘要", value: stringifyValue(result.riskSummary) },
    ];
  }

  if (skillName === "get_solution_summary") {
    return [
      { label: "方案编号", value: stringifyValue(result.code) },
      { label: "方案名称", value: stringifyValue(result.name) },
      {
        label: "版本 / 状态",
        value: `${stringifyValue(result.versionTag)} / ${stringifyValue(result.status)}`,
      },
      {
        label: "关联商机",
        value: `${stringifyValue(result.opportunityCode)} ${stringifyValue(result.opportunityName)}`,
      },
      { label: "最新评审", value: stringifyValue(result.latestReviewConclusion) },
      {
        label: "最近更新时间",
        value: formatDateLabel(result.updatedAt) || stringifyValue(result.updatedAt),
      },
    ];
  }

  return [{ label: "原始结果", value: stringifyValue(result) }];
}

export function getSkillVisualMeta(skillName?: string) {
  switch (skillName) {
    case "get_my_pending_approvals":
      return {
        accent: "#1677ff",
        soft: "rgba(22,119,255,0.10)",
        label: "待审批技能",
      };
    case "get_daily_brief":
      return {
        accent: "#d48806",
        soft: "rgba(212,136,6,0.12)",
        label: "今日简报技能",
      };
    case "get_opportunity_summary":
      return {
        accent: "#722ed1",
        soft: "rgba(114,46,209,0.12)",
        label: "商机摘要技能",
      };
    case "get_solution_summary":
      return {
        accent: "#389e0d",
        soft: "rgba(56,158,13,0.12)",
        label: "方案摘要技能",
      };
    case "readonly_guard":
      return {
        accent: "#d46b08",
        soft: "rgba(212,107,8,0.12)",
        label: "只读保护",
      };
    default:
      return {
        accent: "#595959",
        soft: "rgba(89,89,89,0.08)",
        label: "通用结果",
      };
  }
}

export function FactGrid(props: {
  items: Array<{ label: string; value: string }>;
  accent?: string;
}) {
  const { items, accent = "#1677ff" } = props;

  return (
    <div
      style={{
        display: "grid",
        gap: 10,
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      }}
    >
      {items.map((item) => (
        <div
          key={`${item.label}-${item.value}`}
          style={{
            border: "1px solid var(--app-border)",
            borderRadius: 16,
            padding: 14,
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--app-surface-soft) 88%, white 12%) 0%, var(--app-surface) 100%)",
            boxShadow: `0 0 0 1px color-mix(in srgb, ${accent} 10%, transparent 90%) inset`,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              color: "#8c8c8c",
              marginBottom: 8,
            }}
          >
            {item.label}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.6 }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export function getOutcomeExplanation(
  outcome: RequestRecord["outcome"],
  skillName?: string,
) {
  if (outcome === "success") {
    return skillName
      ? `本次请求已成功命中 ${skillName}，结果已按结构化摘要方式展示。`
      : "本次请求已成功返回结构化结果。";
  }
  if (outcome === "blocked") {
    return "这是预期中的安全拦截。请求命中了只读边界保护，平台未执行任何审批、创建、修改、删除或指派动作。";
  }
  return "本次请求未获得有效返回，请优先检查登录态、接口可用性、网络链路与当前代理口径。";
}

export function classifyErrorMessage(errorMessage: string) {
  const normalized = errorMessage.toLowerCase();

  if (
    normalized.includes("未检测到登录令牌") ||
    normalized.includes("unauthorized") ||
    normalized.includes("401") ||
    normalized.includes("jwt")
  ) {
    return {
      title: "鉴权异常",
      accent: "#722ed1",
      suggestions: [
        "确认当前账号仍处于登录态，并重新刷新当前页面。",
        "检查 /auth/me 是否还能正常返回当前用户信息。",
        "确认浏览器请求头中仍然带有 Authorization Bearer 令牌。",
      ],
    };
  }

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("network") ||
    normalized.includes("fetch") ||
    normalized.includes("timeout")
  ) {
    return {
      title: "网络连接失败",
      accent: "#cf1322",
      suggestions: [
        "确认前端 API 基地址、后端服务状态和当前环境是否一致。",
        "检查浏览器网络面板，看 /integrations/openclaw/playground/query 是否成功发出。",
        "如本机需要代理访问外部服务，确认当前代理链路仍然可用。",
      ],
    };
  }

  if (normalized.includes("openclaw_readonly_only")) {
    return {
      title: "只读边界拦截",
      accent: "#d46b08",
      suggestions: [
        "这通常是预期行为，说明平台正确阻止了写操作请求。",
        "优先改问“待我审批 / 今日简报 / 商机摘要 / 方案摘要”这四类只读命令。",
        "如果预期是读取命令却被拦截，再检查后端意图识别和技能路由逻辑。",
      ],
    };
  }

  if (normalized.includes("403") || normalized.includes("forbidden")) {
    return {
      title: "权限不足",
      accent: "#d46b08",
      suggestions: [
        "确认当前账号是否具备访问联调接口或目标资源的权限。",
        "检查当前登录态、用户角色以及后端接口的权限控制逻辑。",
        "如这本应是只读拦截，请确认后端是否正确返回了 OPENCLAW_READONLY_ONLY。",
      ],
    };
  }

  if (
    normalized.includes("500") ||
    normalized.includes("请求失败") ||
    normalized.includes("internal server error")
  ) {
    return {
      title: "接口执行异常",
      accent: "#ff4d4f",
      suggestions: [
        "检查后端日志，确认 playground 接口和 OpenClaw service 是否抛错。",
        "确认本次命中的技能是否返回了预期字段，而不是空对象或异常结构。",
        "必要时复制原始数据和 requestId 到后端日志中做定点排查。",
      ],
    };
  }

  return {
    title: "未知异常",
    accent: "#595959",
    suggestions: [
      "先复制原始数据和当前 request 信息，确认是否有更具体的错误字段。",
      "检查当前命令是否符合只读技能范围。",
      "如问题持续存在，优先从浏览器网络面板和后端日志同时排查。",
    ],
  };
}

export function analyzeSuccessResult(
  result: Record<string, unknown>,
  skillName?: string,
): SuccessInsight | null {
  if (Object.keys(result).length === 0) {
    return {
      kind: "payload_incomplete",
      title: "命中成功但结果体为空",
      accent: "#595959",
      suggestions: [
        "接口调用已成功完成，但当前返回体没有可展示字段。",
        "优先检查后端 skill 是否返回了空对象，或映射层是否把字段过滤掉了。",
        "如这是预期的空业务态，建议后端补充更明确的 empty-state 字段。",
      ],
    };
  }

  if (skillName === "get_my_pending_approvals") {
    const items = Array.isArray(result.items) ? result.items : [];
    if (items.length === 0) {
    return {
      kind: "business_empty",
      title: "调用成功，无待审批数据",
      accent: "#1677ff",
      suggestions: [
        "当前账号下确实可能没有待审批事项，这属于成功空结果，不是接口异常。",
          "可切换账号或先在平台内推进一个审批实例到当前用户名下，再重新验证。",
          "如预期应有数据，检查平台用户与飞书绑定、审批节点责任人和实例状态。",
        ],
      };
    }
    return null;
  }

  if (skillName === "get_daily_brief") {
    const keyFields = [
      "date",
      "pendingApprovalCount",
      "inRiskOpportunityCount",
      "updatedSolutionCount",
      "myOpportunityCount",
    ];
    const missingFields = keyFields.filter(
      (field) => result[field] === undefined || result[field] === null,
    );
    if (missingFields.length > 0) {
      return {
        kind: "payload_incomplete",
        title: "命中成功但简报字段不完整",
        accent: "#d48806",
        suggestions: [
          `当前缺少字段：${missingFields.join("、")}。`,
          "优先检查后端简报聚合接口的返回结构是否发生变化。",
          "如果字段是可选的，建议后续在前端继续补默认占位语义。",
        ],
      };
    }
    return null;
  }

  if (skillName === "get_opportunity_summary") {
    const keyFields = ["code", "name", "stage", "currentApprovalNodeName"];
    const missingFields = keyFields.filter(
      (field) => result[field] === undefined || result[field] === null || result[field] === "",
    );
    if (missingFields.length > 0) {
      return {
        kind: "payload_incomplete",
        title: "命中成功但商机摘要字段缺失",
        accent: "#722ed1",
        suggestions: [
          `当前缺少字段：${missingFields.join("、")}。`,
          "优先检查商机摘要 skill 的后端映射字段与真实商机数据是否一致。",
          "如果这是测试编号不存在导致的空摘要，应先确认 OPP 编号是否有效。",
        ],
      };
    }
    return null;
  }

  if (skillName === "get_solution_summary") {
    const keyFields = ["code", "name", "status", "opportunityCode"];
    const missingFields = keyFields.filter(
      (field) => result[field] === undefined || result[field] === null || result[field] === "",
    );
    if (missingFields.length > 0) {
      return {
        kind: "payload_incomplete",
        title: "命中成功但方案摘要字段缺失",
        accent: "#389e0d",
        suggestions: [
          `当前缺少字段：${missingFields.join("、")}。`,
          "优先检查方案摘要 skill 返回结构与前端当前展示字段是否一致。",
          "如使用的 SOL 编号不存在或未关联商机，也可能导致部分字段为空。",
        ],
      };
    }
    return null;
  }

  return null;
}

export function getSuccessInsightMeta(insight: SuccessInsight | null) {
  if (!insight) {
    return {
      color: "green",
      label: "结构完整",
      detail: "当前结果字段结构完整，可直接用于联调验收。",
    };
  }

  if (insight.kind === "business_empty") {
    return {
      color: "blue",
      label: "业务空结果",
      detail: "接口已成功返回，但当前账号或编号下没有可展示数据。",
    };
  }

  return {
    color: "gold",
    label: "结构待排查",
    detail: "技能命中成功，但关键字段不完整，建议继续核对 payload 结构。",
  };
}

export function MetaStrip(props: {
  title: string;
  statusMeta: ReturnType<typeof getOutcomeMeta>;
  skillName?: string;
  reason?: string;
  requestId?: string;
  queryText?: string;
  children?: ReactNode;
}) {
  const { title, statusMeta, skillName, reason, requestId, queryText, children } =
    props;

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        borderRadius: 18,
        padding: 16,
        border: "1px solid var(--app-border)",
        background:
          "linear-gradient(145deg, color-mix(in srgb, var(--app-surface-soft) 84%, white 16%) 0%, var(--app-surface) 100%)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color: "#8c8c8c",
              marginBottom: 6,
            }}
          >
            技能路由说明
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
        </div>
        <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {skillName ? <Tag color="blue">{skillName}</Tag> : null}
        {requestId ? <Tag color="purple">requestId: {requestId}</Tag> : null}
        {reason ? <Tag color="geekblue">命中原因: {reason}</Tag> : null}
      </div>

      {queryText ? (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            background: "var(--app-surface-soft)",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <Text strong style={{ marginRight: 8 }}>
            本次查询
          </Text>
          {queryText}
        </div>
      ) : null}

      {children}
    </div>
  );
}

export function buildActiveDebugPayload(input: {
  activeHistoryRecord: RequestRecord | null;
  result: PlaygroundResponse | null;
  blockedResult: { message?: string; error?: string; statusCode?: number } | null;
  errorMessage: string;
}) {
  const { activeHistoryRecord, result, blockedResult, errorMessage } = input;

  if (activeHistoryRecord?.snapshot.kind === "success") {
    return JSON.stringify(activeHistoryRecord.snapshot.payload, null, 2);
  }
  if (activeHistoryRecord?.snapshot.kind === "blocked") {
    return JSON.stringify(activeHistoryRecord.snapshot.payload, null, 2);
  }
  if (activeHistoryRecord?.snapshot.kind === "error") {
    return activeHistoryRecord.snapshot.payload;
  }
  if (result) {
    return JSON.stringify(result, null, 2);
  }
  if (blockedResult) {
    return JSON.stringify(blockedResult, null, 2);
  }
  if (errorMessage) {
    return errorMessage;
  }
  return "";
}
