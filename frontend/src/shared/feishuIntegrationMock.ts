export type FeishuBindingStatus = "active" | "disabled" | "pending";

export interface FeishuBindingRecord {
  id: string | number;
  feishuOpenId: string;
  feishuName: string;
  platformUserId: number;
  platformUsername: string;
  department: string;
  bindingSource: "manual" | "import" | "self_claimed";
  status: FeishuBindingStatus;
  updatedAt: string;
}

export interface FeishuCommandPreview {
  id: string;
  command: string;
  description: string;
  targetEndpoint: string;
  responseType: "interactive_card" | "summary_text";
}

export interface FeishuCardActionPreview {
  key: string;
  label: string;
  type: "link" | "action";
  action?: "approve" | "reject" | "open_detail";
  enabled: boolean;
}

export interface FeishuCardPreview {
  id: string;
  templateKey:
    | "pending_approval"
    | "opportunity_summary"
    | "solution_summary"
    | "daily_brief";
  title: string;
  subtitle: string;
  businessCode?: string;
  businessTypeLabel?: string;
  summaryLines: string[];
  tags: string[];
  fields: Array<{ label: string; value: string }>;
  actions: FeishuCardActionPreview[];
}

export interface FeishuIntegrationMockState {
  bindings: FeishuBindingRecord[];
  commands: FeishuCommandPreview[];
  cards: FeishuCardPreview[];
  lastUpdatedAt: string;
}

export const FEISHU_INTEGRATION_STORAGE_KEY = "feishuIntegrationMockState";

const DEFAULT_BINDINGS: FeishuBindingRecord[] = [
  {
    id: "binding-1",
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
    id: "binding-2",
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
    id: "binding-3",
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

const DEFAULT_COMMANDS: FeishuCommandPreview[] = [
  {
    id: "cmd-pending",
    command: "待我审批",
    description: "查询当前飞书绑定用户可处理的审批实例列表。",
    targetEndpoint: "GET /api/integrations/feishu/me/pending-approvals",
    responseType: "interactive_card",
  },
  {
    id: "cmd-opportunity",
    command: "商机 OPP-000010",
    description: "根据商机编号返回结构化摘要与关键风险。",
    targetEndpoint: "GET /api/integrations/feishu/opportunities/:code/summary",
    responseType: "interactive_card",
  },
  {
    id: "cmd-solution",
    command: "解决方案 SOL-000123",
    description: "查询方案版本摘要、审批节点和关联商机。",
    targetEndpoint: "GET /api/integrations/feishu/solutions/:code/summary",
    responseType: "interactive_card",
  },
  {
    id: "cmd-brief",
    command: "今日简报",
    description: "聚合待审批、我的商机和今日方案动态。",
    targetEndpoint: "GET /api/integrations/feishu/me/daily-brief",
    responseType: "summary_text",
  },
];

const DEFAULT_CARDS: FeishuCardPreview[] = [
  {
    id: "card-pending-1",
    templateKey: "pending_approval",
    title: "待审批：OPP-000010 华东制造云底座升级项目",
    subtitle: "当前节点：销售领导审批",
    businessCode: "OPP-000010",
    businessTypeLabel: "商机审批",
    summaryLines: [
      "客户需求说明已提交，等待销售领导确认是否进入方案设计阶段。",
      "预计金额 680 万，当前阶段为 solution_design。",
    ],
    tags: ["待审批", "商机", "可在飞书轻审批"],
    fields: [
      { label: "客户", value: "华东制造集团" },
      { label: "发起人", value: "李四（销售）" },
      { label: "最近更新时间", value: "2026-04-03 10:22" },
    ],
    actions: [
      { key: "open", label: "打开平台", type: "link", action: "open_detail", enabled: true },
      { key: "approve", label: "通过", type: "action", action: "approve", enabled: true },
      { key: "reject", label: "驳回", type: "action", action: "reject", enabled: true },
    ],
  },
  {
    id: "card-opportunity-1",
    templateKey: "opportunity_summary",
    title: "商机摘要：OPP-000003 工业互联网平台升级项目",
    subtitle: "平台后端聚合摘要卡片",
    businessCode: "OPP-000003",
    businessTypeLabel: "商机摘要",
    summaryLines: [
      "当前停留在 proposal 阶段，成交概率 55%，预计关闭时间 2026-08-20。",
      "当前风险：客户预算口径待确认，技术选型需和交付团队复核。",
    ],
    tags: ["摘要", "商机", "只读"],
    fields: [
      { label: "销售负责人", value: "李四（制造行业销售）" },
      { label: "方案负责人", value: "示例售前（presales_demo）" },
      { label: "最近审批意见", value: "请补充预算拆分与实施边界说明" },
    ],
    actions: [
      { key: "open", label: "打开平台", type: "link", action: "open_detail", enabled: true },
    ],
  },
  {
    id: "card-solution-1",
    templateKey: "solution_summary",
    title: "方案摘要：SOL-000123 工业互联网平台升级项目解决方案",
    subtitle: "版本 v3.2，等待商务评审",
    businessCode: "SOL-000123",
    businessTypeLabel: "方案摘要",
    summaryLines: [
      "当前方案版本已完成技术评审，待商务评审确认商务条款。",
      "关联商机为 OPP-000003，客户为示例制造企业。",
    ],
    tags: ["摘要", "方案", "只读"],
    fields: [
      { label: "方案状态", value: "in_review" },
      { label: "创建人", value: "王五（售前工程师）" },
      { label: "当前节点", value: "商务评审" },
    ],
    actions: [
      { key: "open", label: "打开平台", type: "link", action: "open_detail", enabled: true },
    ],
  },
  {
    id: "card-brief-1",
    templateKey: "daily_brief",
    title: "今日简报：王经理",
    subtitle: "工作日 09:00 定时推送示例",
    summaryLines: [
      "你今天有 3 条待审批，其中 2 条商机审批、1 条方案审批。",
      "你负责或关注的商机中，有 2 条存在预算或节点延期风险。",
      "今日有 1 个方案版本进入商务评审，建议优先处理。",
    ],
    tags: ["简报", "只读", "MVP 范围内"],
    fields: [
      { label: "待审批总数", value: "3" },
      { label: "高风险商机", value: "2" },
      { label: "今日更新方案", value: "1" },
    ],
    actions: [
      { key: "open", label: "打开平台", type: "link", action: "open_detail", enabled: true },
    ],
  },
];

export function createDefaultFeishuIntegrationState(): FeishuIntegrationMockState {
  return {
    bindings: DEFAULT_BINDINGS,
    commands: DEFAULT_COMMANDS,
    cards: DEFAULT_CARDS,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function loadFeishuIntegrationMockState(): FeishuIntegrationMockState {
  if (typeof window === "undefined") {
    return createDefaultFeishuIntegrationState();
  }

  try {
    const raw = window.localStorage.getItem(FEISHU_INTEGRATION_STORAGE_KEY);
    if (!raw) {
      return createDefaultFeishuIntegrationState();
    }
    const parsed = JSON.parse(raw) as Partial<FeishuIntegrationMockState>;
    return {
      bindings: Array.isArray(parsed.bindings) ? parsed.bindings : DEFAULT_BINDINGS,
      commands: Array.isArray(parsed.commands) ? parsed.commands : DEFAULT_COMMANDS,
      cards: Array.isArray(parsed.cards) ? parsed.cards : DEFAULT_CARDS,
      lastUpdatedAt:
        typeof parsed.lastUpdatedAt === "string"
          ? parsed.lastUpdatedAt
          : new Date().toISOString(),
    };
  } catch {
    return createDefaultFeishuIntegrationState();
  }
}

export function saveFeishuIntegrationMockState(
  state: FeishuIntegrationMockState,
) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    FEISHU_INTEGRATION_STORAGE_KEY,
    JSON.stringify({
      ...state,
      lastUpdatedAt: new Date().toISOString(),
    }),
  );
}
