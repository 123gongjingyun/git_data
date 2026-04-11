import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Tag,
  Table,
  Avatar,
  Modal,
  Form,
  Input as AntInput,
  Select,
  Switch,
  Checkbox,
  Radio,
  Collapse,
  Popover,
  Spin,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import type { LogoConfig } from "../logoConfig";
import { buildApiUrl } from "../shared/api";
import type { CurrentUser } from "../shared/auth";
import { hasActionAccess, hasPermission } from "../shared/auth";
import type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowNodeFieldKey,
  WorkflowNodeType,
} from "../shared/workflowConfig";
import {
  isWorkflowLibraryPinnedToLocalDefaults,
  loadSelectedWorkflowId,
  loadWorkflowLibrary,
  mergeWorkflowNodeClientMeta,
  saveSelectedWorkflowId,
  saveWorkflowLibrary,
  saveWorkflowLibraryPinnedToLocalDefaults,
} from "../shared/workflowConfig";
import { DEFAULT_WORKFLOWS } from "../shared/workflowTemplates";
import {
  loadSharedTeamMembers,
  saveSharedTeamMembers,
  type SharedTeamMember,
} from "../shared/teamDirectory";

const { Text } = Typography;
const WORKFLOW_API_BASE_URL = buildApiUrl("");
const USER_API_BASE_URL = buildApiUrl("");

const LazyPluginLibraryView = lazy(async () => {
  const module = await import("./PluginLibraryView");
  return { default: module.PluginLibraryView };
});

const LazyFeishuIntegrationView = lazy(async () => {
  const module = await import("./FeishuIntegrationView");
  return { default: module.FeishuIntegrationView };
});

const LazyOpenClawPlaygroundView = lazy(async () => {
  const module = await import("./OpenClawPlaygroundView");
  return { default: module.OpenClawPlaygroundView };
});

const LazyWorkflowEditorModal = lazy(async () => {
  const module = await import("./settings/WorkflowEditorModal");
  return { default: module.WorkflowEditorModal };
});

const LazyTeamMemberModals = lazy(async () => {
  const module = await import("./settings/TeamMemberModals");
  return { default: module.TeamMemberModals };
});

const LazyBrandingSettingsPanel = lazy(async () => {
  const module = await import("./settings/SettingsExtendedPanels");
  return { default: module.BrandingSettingsPanel };
});

const LazyKnowledgeCategoryManagementPanel = lazy(async () => {
  const module = await import("./settings/SettingsExtendedPanels");
  return { default: module.KnowledgeCategoryManagementPanel };
});

const LazySettingsWorkflowPanel = lazy(async () => {
  const module = await import("./settings/SettingsWorkflowPanel");
  return { default: module.SettingsWorkflowPanel };
});

const LazySettingsTeamPanel = lazy(async () => {
  const module = await import("./settings/SettingsTeamPanel");
  return { default: module.SettingsTeamPanel };
});

const LazySettingsPermissionsCenterPanel = lazy(async () => {
  const module = await import("./settings/SettingsPermissionsCenterPanel");
  return { default: module.SettingsPermissionsCenterPanel };
});

const LazySettingsAccountPanel = lazy(async () => {
  const module = await import("./settings/SettingsAccountPanel");
  return { default: module.SettingsAccountPanel };
});

const LazySettingsKnowledgeRuntimePanel = lazy(async () => {
  const module = await import("./settings/SettingsKnowledgeRuntimePanel");
  return { default: module.SettingsKnowledgeRuntimePanel };
});

function SettingsSectionLoadingCard(props: { title: string; description: string }) {
  const { title, description } = props;

  return (
    <Card>
      <div
        style={{
          minHeight: 240,
          display: "grid",
          placeItems: "center",
          gap: 12,
          textAlign: "center",
        }}
      >
        <Spin size="large" />
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{title}</div>
          <Text type="secondary">{description}</Text>
        </div>
      </div>
    </Card>
  );
}

interface ApiWorkflowNodeApprover {
  id?: number;
  approverType: "user" | "role" | "field";
  approverRef: string;
  displayName?: string | null;
  voteRule?: "any" | "all";
  sortOrder?: number;
}

interface ApiWorkflowNode {
  id?: number;
  nodeKey?: string;
  nodeName: string;
  nodeOrder: number;
  description?: string | null;
  canReject?: boolean;
  rejectStrategy?: "terminate";
  rejectCommentRequired?: boolean;
  approvers?: ApiWorkflowNodeApprover[];
}

const WORKFLOW_NODE_TYPE_OPTIONS: { value: WorkflowNodeType; label: string }[] = [
  { value: "approval", label: "审批节点" },
  { value: "upload", label: "文档上传" },
  { value: "assignment", label: "负责人分配" },
];

const OPPORTUNITY_WORKFLOW_FIELD_OPTIONS: {
  value: WorkflowNodeFieldKey;
  label: string;
}[] = [
  { value: "requirementBriefDocName", label: "客户需求说明文档" },
  { value: "researchDocName", label: "需求调研文档" },
  { value: "solutionOwnerUsername", label: "解决方案负责人" },
  { value: "bizApprovalStatus", label: "销售领导审批状态" },
  { value: "techApprovalStatus", label: "解决方案领导审批状态" },
  { value: "approvalStatus", label: "最终审批状态" },
];

interface ApiWorkflowDefinition {
  id: number;
  name: string;
  code?: string | null;
  targetType: "opportunity" | "solution";
  description?: string | null;
  applicableOpportunity?: string | null;
  enabled: boolean;
  isDefault?: boolean;
  version?: number;
  nodes?: ApiWorkflowNode[];
}

type SettingsMenuKey =
  | "profile"
  | "security"
  | "notifications"
  | "team"
  | "permissionsCenter"
  | "feishuIntegration"
  | "openclawPlayground"
  | "workflow"
  | "system"
  | "plugins"
  | "data";

interface SettingsMenuItem {
  key: SettingsMenuKey;
  label: string;
  icon: string;
  highlight?: "primary" | "success";
}

interface TeamMember {
  key: string;
  username: string;
  name: string;
  email: string;
  role: "管理员" | "经理" | "工程师" | "访客" | "销售";
  permissions: string;
  status: "活跃" | "禁用";
  mainIndustry?: string[]; // 支持多行业
  teamRole?: string;
  menuOverrideCount?: number;
  actionOverrideCount?: number;
}

interface RolePermissionSummaryCard {
  role: TeamMember["role"];
  accent: string;
  badgeColor: string;
  highlights: string[];
}

const ROLE_PERMISSION_SUMMARY_CARDS: RolePermissionSummaryCard[] = [
  {
    role: "管理员",
    accent:
      "linear-gradient(135deg, color-mix(in srgb, rgba(239,68,68,0.18) 72%, var(--app-surface) 28%) 0%, var(--app-surface-soft) 100%)",
    badgeColor: "#cf1322",
    highlights: [
      "拥有系统全部菜单与操作权限，可维护团队管理、权限管理中心、审批流程库、平台品牌与Logo设置、图标/Logo插件库、知识库目录管理。",
      "保留项目、商机、方案、流程、知识等删除类高风险操作。",
    ],
  },
  {
    role: "经理",
    accent:
      "linear-gradient(135deg, color-mix(in srgb, rgba(59,130,246,0.18) 72%, var(--app-surface) 28%) 0%, var(--app-surface-soft) 100%)",
    badgeColor: "#1d39c4",
    highlights: [
      "可进入团队管理、审批流程库、知识库目录管理。",
      "可新建、编辑、审批项目/商机/方案，并可查看和推进投标、合同、数据分析。",
      "默认不开放删除类操作，也不开放权限管理中心、平台品牌与Logo设置、图标/Logo插件库。",
    ],
  },
  {
    role: "销售",
    accent:
      "linear-gradient(135deg, color-mix(in srgb, rgba(20,184,166,0.18) 72%, var(--app-surface) 28%) 0%, var(--app-surface-soft) 100%)",
    badgeColor: "#08979c",
    highlights: [
      "可访问工作台、项目管理、商机管理、解决方案、知识库、系统设置、帮助与支持。",
      "仅可创建和查看商机，查看项目与解决方案，下载方案与知识文档。",
      "仅可访问个人资料、安全设置、通知设置等基础个人设置。",
    ],
  },
  {
    role: "工程师",
    accent:
      "linear-gradient(135deg, color-mix(in srgb, rgba(245,158,11,0.18) 72%, var(--app-surface) 28%) 0%, var(--app-surface-soft) 100%)",
    badgeColor: "#d46b08",
    highlights: [
      "可访问工作台、项目管理、商机管理、解决方案、投标管理、合同管理、知识库、数据分析、系统设置、帮助与支持。",
      "可查看项目/商机/投标/合同，可编辑并审批解决方案，可编辑知识库与数据分析。",
      "默认不开放删除类操作，仅可访问基础个人设置。",
    ],
  },
  {
    role: "访客",
    accent:
      "linear-gradient(135deg, color-mix(in srgb, rgba(148,163,184,0.16) 72%, var(--app-surface) 28%) 0%, var(--app-surface-soft) 100%)",
    badgeColor: "#595959",
    highlights: [
      "可访问工作台、项目管理、知识库、系统设置、帮助与支持。",
      "仅支持项目与知识库只读查看及知识文档下载。",
      "不开放新增、编辑、删除、审批和高级设置入口；仅可访问基础个人设置。",
    ],
  },
];

const settingsMenuItems: SettingsMenuItem[] = [
  {
    key: "profile",
    label: "个人资料",
    icon: "👤",
    highlight: "primary",
  },
  {
    key: "security",
    label: "安全设置",
    icon: "🔒",
  },
  {
    key: "notifications",
    label: "通知设置",
    icon: "🔔",
  },
  {
    key: "team",
    label: "团队管理",
    icon: "👥",
    highlight: "success",
  },
  {
    key: "permissionsCenter",
    label: "权限管理中心",
    icon: "🎛️",
    highlight: "success",
  },
  {
    key: "feishuIntegration",
    label: "飞书集成",
    icon: "💬",
    highlight: "primary",
  },
  {
    key: "openclawPlayground",
    label: "OpenClaw联调",
    icon: "🦞",
    highlight: "primary",
  },
  {
    key: "workflow",
    label: "审批流程库",
    icon: "🧭",
    highlight: "primary",
  },
  {
    key: "data",
    label: "知识库目录管理",
    icon: "🗄️",
  },
  {
    key: "plugins",
    label: "图标/Logo插件库",
    icon: "🧩",
  },
  {
    key: "system",
    label: "平台品牌与Logo设置",
    icon: "⚙️",
  },
];

const settingsMenuPermissionKeyMap: Partial<Record<SettingsMenuKey, string>> = {
  team: "menu.team-management",
  workflow: "menu.workflow",
  system: "menu.branding-settings",
  plugins: "menu.plugin-library",
  data: "menu.knowledge-category-management",
};

const teamMembers: TeamMember[] = [
  {
    key: "1",
    username: "zhangsan_admin",
    name: "张三",
    email: "zhangsan@example.com",
    role: "管理员",
    permissions: "全部权限",
    status: "活跃",
    mainIndustry: ["金融行业"],
    teamRole: "金融行业负责人",
  },
  {
    key: "2",
    username: "lisi_sales",
    name: "李四",
    email: "lisi@example.com",
    role: "销售",
    permissions: "商机、项目、解决方案、知识库",
    status: "活跃",
    mainIndustry: ["制造行业"],
    teamRole: "制造行业负责人",
  },
  {
    key: "3",
    username: "wangwu_presales",
    name: "王五",
    email: "wangwu@example.com",
    role: "工程师",
    permissions: "项目、商机",
    status: "活跃",
    mainIndustry: ["电商行业", "政企行业"],
    teamRole: "电商行业负责人",
  },
  {
    key: "4",
    username: "zhaoliu_presales",
    name: "赵六",
    email: "zhaoliu@example.com",
    role: "工程师",
    permissions: "项目、商机",
    status: "禁用",
    mainIndustry: ["园区行业"],
    teamRole: "园区行业负责人",
  },
  {
    key: "5",
    username: "qianqi_guest",
    name: "钱七",
    email: "qianqi@example.com",
    role: "访客",
    permissions: "仅查看",
    status: "活跃",
  },
];

const TEAM_ROLE_OPTIONS = [
  "系统管理员",
  "团队经理",
  "金融行业负责人",
  "制造行业负责人",
  "电商行业负责人",
  "园区行业负责人",
  "解决方案负责人",
  "销售负责人",
  "销售",
  "访客账号",
].map((item) => ({
  value: item,
  label: item,
}));

type TeamTableColumnKey =
  | "index"
  | "name"
  | "username"
  | "email"
  | "role"
  | "permissions"
  | "mainIndustry"
  | "teamRole"
  | "status"
  | "action";

const TEAM_TABLE_VISIBLE_COLUMNS_STORAGE_KEY = "settingsTeamTableVisibleColumns";
const TEAM_TABLE_DEFAULT_VISIBLE_COLUMNS: TeamTableColumnKey[] = [
  "index",
  "name",
  "username",
  "email",
  "role",
  "permissions",
  "mainIndustry",
  "teamRole",
  "status",
  "action",
];
const TEAM_TABLE_LOCKED_COLUMNS = new Set<TeamTableColumnKey>([
  "index",
  "name",
  "action",
]);
const TEAM_TABLE_COLUMN_OPTIONS: {
  key: TeamTableColumnKey;
  label: string;
}[] = [
  { key: "index", label: "序号" },
  { key: "name", label: "姓名" },
  { key: "username", label: "账号" },
  { key: "email", label: "邮箱" },
  { key: "role", label: "角色" },
  { key: "permissions", label: "权限" },
  { key: "mainIndustry", label: "所属行业" },
  { key: "teamRole", label: "团队角色" },
  { key: "status", label: "状态" },
  { key: "action", label: "操作" },
];

function getAvatarColor(role: TeamMember["role"]): string {
  switch (role) {
    case "管理员":
      return "#1890ff";
    case "经理":
      return "#52c41a";
    case "工程师":
      return "#fa8c16";
    case "销售":
      return "#13c2c2";
    case "访客":
    default:
      return "#eb2f96";
  }
}

function getRoleTagColor(role: TeamMember["role"]) {
  switch (role) {
    case "管理员":
      return "red";
    case "经理":
      return "blue";
    case "工程师":
      return "orange";
    case "销售":
      return "cyan";
    case "访客":
    default:
      return "default";
  }
}

interface SettingsViewProps {
  appName: string;
  logoConfig: LogoConfig;
  onChangeAppName: (name: string) => void;
  onChangeLogo: (config: LogoConfig) => void;
  currentUser: CurrentUser | null;
  initialMenu?: SettingsMenuKey;
  accessToken?: string | null;
  onCurrentUserChange?: (user: CurrentUser) => void;
}

interface ApiTeamMember {
  id: number;
  username: string;
  displayName?: string;
  email?: string;
  role: "pre_sales_engineer" | "manager" | "admin" | "sales" | "guest";
  roleLabel: "管理员" | "经理" | "工程师" | "访客" | "销售";
  permissionSummary: string;
  roleMenuKeys: string[];
  allowedMenuKeys: string[];
  deniedMenuKeys: string[];
  effectiveMenuKeys: string[];
  roleActionKeys: string[];
  allowedActionKeys: string[];
  deniedActionKeys: string[];
  effectiveActionKeys: string[];
  isActive: boolean;
  mainIndustry: string[];
  teamRole?: string;
}

interface MenuPermissionDefinition {
  key: string;
  label: string;
  category: "workspace" | "business" | "support" | "settings";
}

interface UserMenuPermissionResponse {
  user: ApiTeamMember;
  roleMenuKeys: string[];
  allowedMenuKeys: string[];
  deniedMenuKeys: string[];
  effectiveMenuKeys: string[];
  definitions: MenuPermissionDefinition[];
}

interface ActionPermissionDefinition {
  key: string;
  label: string;
  module:
    | "workbench"
    | "project"
    | "opportunity"
    | "solution"
    | "bidding"
    | "contract"
    | "knowledge"
    | "workflow"
    | "settings";
  category: "view" | "crud" | "download" | "approval" | "manage";
}

interface UserActionPermissionResponse {
  user: ApiTeamMember;
  roleActionKeys: string[];
  allowedActionKeys: string[];
  deniedActionKeys: string[];
  effectiveActionKeys: string[];
  definitions: ActionPermissionDefinition[];
}

type PermissionModuleKey =
  | "workbench"
  | "project"
  | "opportunity"
  | "solution"
  | "bidding"
  | "contract"
  | "knowledge"
  | "analytics"
  | "workflow"
  | "settings"
  | "help";

function teamRoleLabelToApiRole(
  role: TeamMember["role"],
): ApiTeamMember["role"] {
  switch (role) {
    case "管理员":
      return "admin";
    case "经理":
      return "manager";
    case "销售":
      return "sales";
    case "访客":
      return "guest";
    case "工程师":
    default:
      return "pre_sales_engineer";
  }
}

function apiRoleToTeamRoleLabel(
  role: ApiTeamMember["roleLabel"],
): TeamMember["role"] {
  return role;
}

function getPermissionSummaryByRole(role: TeamMember["role"]) {
  switch (role) {
    case "管理员":
      return "全部权限";
    case "经理":
      return "团队管理、项目、商机、解决方案、投标查看、合同查看";
    case "销售":
      return "商机创建、商机查看、项目查看、解决方案查看、知识库查看";
    case "访客":
      return "仅查看";
    case "工程师":
    default:
      return "商机、项目、投标、合同查看；解决方案、知识库、数据分析编辑";
  }
}

function mapApiUserToTeamMember(user: ApiTeamMember): TeamMember {
  return {
    key: String(user.id),
    username: user.username,
    name: user.displayName || user.username,
    email: user.email || "",
    role: apiRoleToTeamRoleLabel(user.roleLabel),
    permissions: user.permissionSummary,
    status: user.isActive ? "活跃" : "禁用",
    mainIndustry: user.mainIndustry || [],
    teamRole: user.teamRole,
    menuOverrideCount:
      (user.allowedMenuKeys?.length || 0) + (user.deniedMenuKeys?.length || 0),
    actionOverrideCount:
      (user.allowedActionKeys?.length || 0) + (user.deniedActionKeys?.length || 0),
  };
}

function isNumericUserId(value?: string | null): value is string {
  return Boolean(value && /^\d+$/.test(value));
}

function mapSharedTeamMemberToTeamMember(member: SharedTeamMember): TeamMember {
  const role = apiRoleToTeamRoleLabel(member.roleLabel);
  return {
    key: member.username,
    username: member.username,
    name: member.name,
    email: member.email || "",
    role,
    permissions: getPermissionSummaryByRole(role),
    status: member.status,
    mainIndustry: member.mainIndustry || [],
    teamRole: member.teamRole,
  };
}

function mapTeamMemberToSharedSnapshot(member: TeamMember): SharedTeamMember {
  return {
    username: member.username,
    name: member.name,
    email: member.email,
    roleLabel: member.role,
    status: member.status,
    mainIndustry: member.mainIndustry || [],
    teamRole: member.teamRole,
  };
}

interface KnowledgeCategoryTreeNode {
  id: string;
  name: string;
  icon: string;
  description: string;
  subCategories: { value: string; label: string }[];
}

const KNOWLEDGE_TREE_STORAGE_KEY = "knowledgeCategoryTreeConfig";

const DEFAULT_KNOWLEDGE_CATEGORY_TREE: KnowledgeCategoryTreeNode[] = [
  {
    id: "experience",
    name: "经验知识库",
    icon: "📘",
    description:
      "沉淀成功案例与标准文档模板，作为售前与交付团队的经验复用入口。",
    subCategories: [
      { value: "经验知识库 / 成功案例", label: "成功案例" },
      { value: "经验知识库 / 文档模板", label: "文档模板" },
    ],
  },
  {
    id: "sales",
    name: "销售知识库",
    icon: "💼",
    description:
      "适用于销售团队的实战资料、话术脚本与一指禅速查表。",
    subCategories: [
      { value: "销售知识库 / 销售一指禅", label: "销售一指禅" },
      { value: "销售知识库 / 销售话术", label: "销售话术" },
    ],
  },
  {
    id: "solution",
    name: "解决方案知识库",
    icon: "🧩",
    description:
      "汇总通用方案、行业方案与典型场景方案，支撑售前快速选型与复用。",
    subCategories: [
      {
        value: "解决方案知识库 / 通用解决方案",
        label: "通用解决方案",
      },
      {
        value: "解决方案知识库 / 行业解决方案",
        label: "行业解决方案",
      },
      {
        value: "解决方案知识库 / 场景解决方案",
        label: "场景解决方案",
      },
    ],
  },
  {
    id: "product",
    name: "产品知识库",
    icon: "🧬",
    description:
      "产品白皮书、功能说明与操作手册统一收口，方便销售与售前查阅。",
    subCategories: [
      {
        value: "产品知识库 / 产品白皮书",
        label: "产品白皮书",
      },
      {
        value: "产品知识库 / 产品操作手册",
        label: "产品操作手册",
      },
    ],
  },
  {
    id: "industry",
    name: "行业知识库",
    icon: "🌐",
    description:
      "行业白皮书、政策解读与竞品分析，支撑行业洞察与标前策略制定。",
    subCategories: [
      {
        value: "行业知识库 / 行业白皮书",
        label: "行业白皮书",
      },
      {
        value: "行业知识库 / 政策解读",
        label: "政策解读",
      },
      {
        value: "行业知识库 / 竞品分析",
        label: "竞品分析",
      },
    ],
  },
  {
    id: "delivery",
    name: "交付实施知识库",
    icon: "🛠️",
    description:
      "项目实施模板、运维手册与巡检规范，保障交付与运维的一致性。",
    subCategories: [
      {
        value: "交付实施知识库 / 实施模板",
        label: "实施模板",
      },
      {
        value: "交付实施知识库 / 运维手册",
        label: "运维手册",
      },
    ],
  },
  {
    id: "bidding",
    name: "投标知识库",
    icon: "📄",
    description:
      "投标模板、评分标准解读等资源，提升投标命中率与规范性。",
    subCategories: [
      {
        value: "投标知识库 / 投标模板",
        label: "投标模板",
      },
      {
        value: "投标知识库 / 评分标准解读",
        label: "评分标准解读",
      },
    ],
  },
];

export function SettingsView(props: SettingsViewProps) {
  const {
    appName,
    logoConfig,
    onChangeAppName,
    onChangeLogo,
    currentUser,
    initialMenu,
    accessToken,
    onCurrentUserChange,
  } = props;
  const [activeMenu, setActiveMenu] = useState<SettingsMenuKey>(
    initialMenu || "workflow",
  );
  const [members, setMembers] = useState<TeamMember[]>(() => {
    const snapshot = loadSharedTeamMembers();
    return snapshot.length > 0
      ? snapshot.map(mapSharedTeamMemberToTeamMember)
      : teamMembers;
  });
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [memberModalMode, setMemberModalMode] = useState<"create" | "edit">(
    "create",
  );
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [currentMember, setCurrentMember] = useState<TeamMember | null>(null);
  const [keyword, setKeyword] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<TeamMember["role"] | undefined>(
    undefined,
  );
  const [statusFilter, setStatusFilter] = useState<
    TeamMember["status"] | undefined
  >(undefined);
  const [teamTablePage, setTeamTablePage] = useState(1);
  const [teamTablePageSize, setTeamTablePageSize] = useState(10);
  const [generatedMemberPassword, setGeneratedMemberPassword] = useState("");
  const [teamTableVisibleColumns, setTeamTableVisibleColumns] = useState<
    TeamTableColumnKey[]
  >(() => {
    if (typeof window === "undefined") {
      return TEAM_TABLE_DEFAULT_VISIBLE_COLUMNS;
    }
    try {
      const raw = window.localStorage.getItem(
        TEAM_TABLE_VISIBLE_COLUMNS_STORAGE_KEY,
      );
      if (!raw) {
        return TEAM_TABLE_DEFAULT_VISIBLE_COLUMNS;
      }
      const parsed = JSON.parse(raw) as string[];
      const validKeys = new Set(TEAM_TABLE_COLUMN_OPTIONS.map((item) => item.key));
      const nextKeys = Array.isArray(parsed)
        ? parsed.filter((item): item is TeamTableColumnKey => validKeys.has(item as TeamTableColumnKey))
        : [];
      return Array.from(
        new Set([
          ...Array.from(TEAM_TABLE_LOCKED_COLUMNS),
          ...(nextKeys.length > 0 ? nextKeys : TEAM_TABLE_DEFAULT_VISIBLE_COLUMNS),
        ]),
      );
    } catch {
      return TEAM_TABLE_DEFAULT_VISIBLE_COLUMNS;
    }
  });
  const [form] = Form.useForm();
  const [workflowForm] = Form.useForm();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const selectedMemberRole = (Form.useWatch("role", form) ||
    "工程师") as TeamMember["role"];
  const canManageMembers =
    hasPermission(currentUser, "team.manage") ||
    hasPermission(currentUser, "user.manage");
  const canDeleteMembers = currentUser?.role === "admin";
  const canManageSettings = hasPermission(currentUser, "settings.manage");
  const canManagePluginLibrary = hasPermission(currentUser, "plugin.manage");
  const canManageWorkflow =
    hasActionAccess(currentUser, "workflow.create") ||
    hasActionAccess(currentUser, "workflow.edit") ||
    hasActionAccess(currentUser, "workflow.delete") ||
    hasActionAccess(currentUser, "workflow.approve");
  const canCreateWorkflow = hasActionAccess(currentUser, "workflow.create");
  const canEditWorkflow = hasActionAccess(currentUser, "workflow.edit");
  const canDeleteWorkflow = hasActionAccess(currentUser, "workflow.delete");
  const canApproveWorkflow = hasActionAccess(currentUser, "workflow.approve");
  const canEditKnowledge =
    hasPermission(currentUser, "knowledge-category.manage") ||
    hasPermission(currentUser, "knowledge.edit");
  const canDeleteKnowledgeCategories = currentUser?.role === "admin";
  const canManageMenuPermissions = hasPermission(
    currentUser,
    "menu-permission.manage",
  );
  const canManageActionPermissions = hasPermission(
    currentUser,
    "action-permission.manage",
  );
  const [permissionCenterEntryTab, setPermissionCenterEntryTab] = useState<
    "menu" | "action"
  >("menu");

  useEffect(() => {
    if (initialMenu) {
      setActiveMenu(initialMenu);
    }
  }, [initialMenu]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      TEAM_TABLE_VISIBLE_COLUMNS_STORAGE_KEY,
      JSON.stringify(teamTableVisibleColumns),
    );
  }, [teamTableVisibleColumns]);

  useEffect(() => {
    profileForm.setFieldsValue({
      username: currentUser?.username || "",
      displayName: currentUser?.displayName || currentUser?.username || "",
      email: currentUser?.email || "",
      roleLabel: currentUser?.roleLabel || "",
      mainIndustry: currentUser?.mainIndustry || [],
      teamRole: currentUser?.teamRole || "",
    });
  }, [currentUser, profileForm]);

  useEffect(() => {
    form.setFieldValue("permissions", getPermissionSummaryByRole(selectedMemberRole));
  }, [form, selectedMemberRole]);

  const initialKnowledgeTree = useMemo(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(KNOWLEDGE_TREE_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as KnowledgeCategoryTreeNode[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // ignore parse errors
      }
    }
    return DEFAULT_KNOWLEDGE_CATEGORY_TREE;
  }, []);

  const allIndustries = Array.from(
    new Set(
      members.flatMap((m) => (m.mainIndustry && m.mainIndustry.length > 0
        ? m.mainIndustry
        : [])),
    ),
  );

  const filteredMembers = members.filter((m) => {
    if (roleFilter && m.role !== roleFilter) {
      return false;
    }
    if (statusFilter && m.status !== statusFilter) {
      return false;
    }
    if (keyword && keyword.trim().length > 0) {
      const k = keyword.trim().toLowerCase();
      const name = m.name.toLowerCase();
      const email = m.email.toLowerCase();
      const permissions = (m.permissions || "").toLowerCase();
      const teamRole = (m.teamRole || "").toLowerCase();
      const industries = (m.mainIndustry || []).join(",").toLowerCase();
      if (
        !name.includes(k) &&
        !email.includes(k) &&
        !permissions.includes(k) &&
        !teamRole.includes(k) &&
        !industries.includes(k)
      ) {
        return false;
      }
    }
    return true;
  });

  useEffect(() => {
    const maxPage = Math.max(
      1,
      Math.ceil(filteredMembers.length / teamTablePageSize),
    );
    if (teamTablePage > maxPage) {
      setTeamTablePage(maxPage);
    }
  }, [filteredMembers.length, teamTablePage, teamTablePageSize]);

  const paginatedMembers = filteredMembers.slice(
    (teamTablePage - 1) * teamTablePageSize,
    teamTablePage * teamTablePageSize,
  );

  const teamTableToggleableColumnKeys = useMemo(
    () =>
      TEAM_TABLE_COLUMN_OPTIONS.filter(
        (item) => !TEAM_TABLE_LOCKED_COLUMNS.has(item.key),
      ).map((item) => item.key),
    [],
  );

  const selectedTeamTableToggleableColumnKeys = useMemo(
    () =>
      teamTableVisibleColumns.filter(
        (item) => !TEAM_TABLE_LOCKED_COLUMNS.has(item),
      ),
    [teamTableVisibleColumns],
  );

  const filteredSettingsMenuItems = useMemo(
    () =>
      settingsMenuItems.filter((item) => {
        if (item.key === "permissionsCenter") {
          return canManageMenuPermissions || canManageActionPermissions;
        }
        const permissionKey = settingsMenuPermissionKeyMap[item.key];
        if (permissionKey) {
          return hasPermission(currentUser, permissionKey);
        }
        return true;
      }),
    [
      canManageActionPermissions,
      canManageMenuPermissions,
      currentUser,
    ],
  );

  useEffect(() => {
    if (filteredSettingsMenuItems.some((item) => item.key === activeMenu)) {
      return;
    }
    setActiveMenu(filteredSettingsMenuItems[0]?.key ?? "workflow");
  }, [activeMenu, filteredSettingsMenuItems]);

  useEffect(() => {
    if ((activeMenu as string) === "menuPermissions") {
      setActiveMenu("permissionsCenter");
      setPermissionCenterEntryTab("menu");
      return;
    }
    if ((activeMenu as string) === "actionPermissions") {
      setActiveMenu("permissionsCenter");
      setPermissionCenterEntryTab("action");
    }
  }, [activeMenu]);

  const allTeamColumns: ColumnsType<TeamMember> = [
    {
      title: "序号",
      key: "index",
      width: 72,
      render: (_: unknown, __: TeamMember, index: number) =>
        (teamTablePage - 1) * teamTablePageSize + index + 1,
    },
    {
      title: "姓名",
      dataIndex: "name",
      key: "name",
      width: 168,
      render: (name: string, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Avatar
            size={32}
            style={{
              backgroundColor: getAvatarColor(record.role),
              fontSize: 14,
              fontWeight: "bold",
            }}
          >
            {name.charAt(0)}
          </Avatar>
          <span>{name}</span>
        </div>
      ),
    },
    {
      title: "账号",
      dataIndex: "username",
      key: "username",
      width: 150,
    },
    {
      title: "邮箱",
      dataIndex: "email",
      key: "email",
      width: 220,
    },
    {
      title: "角色",
      dataIndex: "role",
      key: "role",
      width: 110,
      render: (role: TeamMember["role"]) => (
        <Tag color={getRoleTagColor(role)}>{role}</Tag>
      ),
    },
    {
      title: "权限",
      dataIndex: "permissions",
      key: "permissions",
      width: 260,
    },
    {
      title: "所属行业",
      dataIndex: "mainIndustry",
      key: "mainIndustry",
      width: 220,
      render: (value?: string[]) =>
        value && value.length > 0 ? (
          <>
            {value.map((item) => (
              <Tag color="blue" key={item}>
                {item}
              </Tag>
            ))}
          </>
        ) : (
          <Text type="secondary">未设置</Text>
        ),
    },
    {
      title: "团队角色",
      dataIndex: "teamRole",
      key: "teamRole",
      width: 180,
      render: (value?: string) =>
        value ? (
          <Text>{value}</Text>
        ) : (
          <Text type="secondary">未设置</Text>
        ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: TeamMember["status"]) => (
        <Tag color={status === "活跃" ? "green" : "volcano"}>{status}</Tag>
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 230,
      render: (_, record) => (
        <>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setCurrentMember(record);
              setViewModalVisible(true);
            }}
          >
            查看
          </Button>
          {canManageMembers && (
            <Button
              type="link"
              size="small"
              onClick={() => {
                setCurrentMember(record);
                setMemberModalMode("edit");
                form.setFieldsValue({
                  username: record.username,
                  name: record.name,
                  email: record.email,
                  role: record.role,
                  permissions: record.permissions,
                  status: record.status,
                  mainIndustry: record.mainIndustry || [],
                  teamRole: record.teamRole,
                  password: "",
                });
                setGeneratedMemberPassword("");
                setMemberModalVisible(true);
              }}
              >
                编辑
              </Button>
          )}
          {canManageMembers && (
            <Button
              type="link"
              size="small"
              danger={record.status === "活跃"}
              onClick={() => {
                const nextStatus: TeamMember["status"] =
                  record.status === "活跃" ? "禁用" : "活跃";
                const actionLabel = nextStatus === "禁用" ? "禁用" : "启用";
                Modal.confirm({
                  title: `确认${actionLabel}成员「${record.name}」？`,
                  content:
                    nextStatus === "禁用"
                      ? "禁用后，该成员将无法继续登录系统。"
                      : "启用后，该成员可以重新登录系统。",
                  okText: actionLabel,
                  okButtonProps:
                    nextStatus === "禁用" ? { danger: true } : undefined,
                  cancelText: "取消",
                  onOk: async () => {
                    const resp = await fetch(
                      `${USER_API_BASE_URL}/users/${record.key}`,
                      {
                        method: "PATCH",
                        headers: getWorkflowAuthHeaders(),
                        body: JSON.stringify({
                          isActive: nextStatus === "活跃",
                        }),
                      },
                    );
                    if (!resp.ok) {
                      message.error(`${actionLabel}成员失败：${resp.status}`);
                      return;
                    }
                    const updated = mapApiUserToTeamMember(
                      (await resp.json()) as ApiTeamMember,
                    );
                    setMembers((prev) =>
                      prev.map((member) =>
                        member.key === record.key ? updated : member,
                      ),
                    );
                    if (currentMember && currentMember.key === record.key) {
                      setCurrentMember(updated);
                    }
                    message.success(
                      nextStatus === "禁用"
                        ? `已禁用成员：${record.name}`
                        : `已启用成员：${record.name}`,
                    );
                  },
                });
              }}
            >
              {record.status === "活跃" ? "禁用" : "启用"}
            </Button>
          )}
          <Button
            type="link"
            size="small"
            danger
            disabled={!canDeleteMembers}
            onClick={() => {
              if (!canDeleteMembers) {
                message.warning("当前账号无权删除成员。");
                return;
              }
              Modal.confirm({
                title: `确认删除成员「${record.name}」？`,
                content: "删除后，该成员将无法继续使用系统登录。",
                okText: "删除",
                okButtonProps: { danger: true },
                cancelText: "取消",
                onOk: async () => {
                  const resp = await fetch(
                    `${USER_API_BASE_URL}/users/${record.key}`,
                    {
                      method: "DELETE",
                      headers: getWorkflowAuthHeaders(false),
                    },
                  );
                  if (!resp.ok) {
                    message.error(`删除成员失败：${resp.status}`);
                    return;
                  }
                  setMembers((prev) =>
                    prev.filter((member) => member.key !== record.key),
                  );
                  if (currentMember && currentMember.key === record.key) {
                    setCurrentMember(null);
                    setViewModalVisible(false);
                    setMemberModalVisible(false);
                  }
                  message.success(`已删除成员：${record.name}`);
                },
              });
            }}
          >
            删除
          </Button>
        </>
      ),
    },
  ];

  const columns = useMemo(
    () =>
      allTeamColumns.filter((item) =>
        teamTableVisibleColumns.includes(item.key as TeamTableColumnKey),
      ),
    [allTeamColumns, teamTableVisibleColumns],
  );

  const teamTableColumnSettingContent = (
    <div style={{ width: 280 }}>
      <div style={{ marginBottom: 10, fontWeight: 600 }}>显示列</div>
      <Checkbox.Group
        style={{ display: "grid", gap: 8 }}
        value={selectedTeamTableToggleableColumnKeys}
        options={TEAM_TABLE_COLUMN_OPTIONS.filter(
          (item) => !TEAM_TABLE_LOCKED_COLUMNS.has(item.key),
        ).map((item) => ({
          value: item.key,
          label: item.label,
        }))}
        onChange={(checkedValues) => {
          const nextKeys = checkedValues.filter(
            (item): item is TeamTableColumnKey => typeof item === "string",
          );
          setTeamTableVisibleColumns([
            ...Array.from(TEAM_TABLE_LOCKED_COLUMNS),
            ...teamTableToggleableColumnKeys.filter((item) =>
              nextKeys.includes(item),
            ),
          ]);
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 12,
        }}
      >
        <Button
          size="small"
          onClick={() => {
            setTeamTableVisibleColumns(TEAM_TABLE_DEFAULT_VISIBLE_COLUMNS);
          }}
        >
          恢复默认
        </Button>
        <Button
          size="small"
          onClick={() => {
            setTeamTableVisibleColumns([
              ...Array.from(TEAM_TABLE_LOCKED_COLUMNS),
              ...teamTableToggleableColumnKeys,
            ]);
          }}
        >
          显示全部
        </Button>
      </div>
    </div>
  );

  const loadTeamMembers = async () => {
    setMembersLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword.trim()) {
        params.set("keyword", keyword.trim());
      }
      if (roleFilter) {
        params.set("role", teamRoleLabelToApiRole(roleFilter));
      }
      if (statusFilter) {
        params.set("status", statusFilter === "活跃" ? "active" : "inactive");
      }
      const query = params.toString();
      const resp = await fetch(
        `${USER_API_BASE_URL}/users${query ? `?${query}` : ""}`,
        {
          headers: getWorkflowAuthHeaders(false),
        },
      );
      if (!resp.ok) {
        if (resp.status === 401) {
          setMembers([]);
          message.warning("团队成员登录态已失效，请重新登录后再加载真实成员数据。");
          return;
        }
        message.warning(
          `团队成员加载失败：${resp.status}，当前继续显示本地数据。`,
        );
        return;
      }
      const data = (await resp.json()) as ApiTeamMember[];
      setMembers(Array.isArray(data) ? data.map(mapApiUserToTeamMember) : []);
    } catch {
      message.warning("未检测到可用的团队成员后端接口，当前继续显示本地数据。");
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    if (
      (activeMenu !== "team" && activeMenu !== "permissionsCenter") ||
      !canManageMembers
    ) {
      return;
    }
    void loadTeamMembers();
    // 当前仅在团队管理页按筛选项刷新成员列表
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMenu, canManageMembers, keyword, roleFilter, statusFilter]);

  // 审批流程库（流程库）配置，仅前端 Mock，存入 localStorage，供商机 / 解决方案模块引用
  const [workflowList, setWorkflowList] = useState<WorkflowDefinition[]>(
    () => {
      if (typeof window === "undefined") return [];
      const stored = loadWorkflowLibrary();
      if (stored && stored.length > 0) {
        return stored;
      }
      const defaultWorkflows: WorkflowDefinition[] = DEFAULT_WORKFLOWS;
      saveWorkflowLibrary(defaultWorkflows);
      // 默认将两个流程分别设置为商机和解决方案的当前流程
      saveSelectedWorkflowId("opportunity", "default_opportunity_flow");
      saveSelectedWorkflowId("solution", "default_solution_flow");
      return defaultWorkflows;
    },
  );

  const [selectedOpportunityWorkflowId, setSelectedOpportunityWorkflowId] =
    useState<string | null>(() =>
      typeof window === "undefined"
        ? null
        : loadSelectedWorkflowId("opportunity"),
    );
  const [selectedSolutionWorkflowId, setSelectedSolutionWorkflowId] =
    useState<string | null>(() =>
      typeof window === "undefined"
        ? null
        : loadSelectedWorkflowId("solution"),
    );

  const [workflowModalVisible, setWorkflowModalVisible] = useState(false);
  const [workflowModalMode, setWorkflowModalMode] = useState<
    "create" | "edit"
  >("create");
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(
    null,
  );
  const [workflowEditorNodes, setWorkflowEditorNodes] = useState<
    WorkflowNode[]
  >([]);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowError, setWorkflowError] = useState<string | null>(null);

  const getWorkflowAuthHeaders = (withJson = true) => {
    const headers: Record<string, string> = {};
    if (withJson) {
      headers["Content-Type"] = "application/json";
    }
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("accessToken");
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }
    return headers;
  };

  const normalizeWorkflowDefinition = (
    workflow: ApiWorkflowDefinition,
  ): WorkflowDefinition => ({
    id: workflow.id,
    name: workflow.name,
    code: workflow.code || undefined,
    target: workflow.targetType,
    enabled: workflow.enabled,
    isDefault: workflow.isDefault ?? false,
    version: workflow.version ?? 1,
    description: workflow.description || undefined,
    applicableOpportunity: workflow.applicableOpportunity || undefined,
    nodes: [...(workflow.nodes || [])]
      .sort((a, b) => a.nodeOrder - b.nodeOrder)
      .map((node) =>
        mergeWorkflowNodeClientMeta(workflow.id, {
          id: node.id ?? `${workflow.id}-${node.nodeKey || node.nodeOrder}`,
          nodeKey: node.nodeKey || `node_${node.nodeOrder}`,
          name: node.nodeName,
          nodeOrder: node.nodeOrder,
          approverRole:
            node.approvers && node.approvers.length > 0
              ? node.approvers
                  .map((item) => item.displayName || item.approverRef)
                  .join(" / ")
              : "",
          description: node.description || undefined,
          canReject: node.canReject ?? true,
          rejectStrategy: node.rejectStrategy ?? "terminate",
          rejectCommentRequired: node.rejectCommentRequired ?? false,
          approvers: (node.approvers || []).map((item, index) => ({
            id: item.id,
            approverType: item.approverType,
            approverRef: item.approverRef,
            displayName: item.displayName || undefined,
            voteRule: item.voteRule ?? "any",
            sortOrder: item.sortOrder ?? index,
          })),
        }),
      ),
  });

  const attachWorkflowNodeClientMeta = (
    workflow: WorkflowDefinition,
    sourceNodes: WorkflowNode[],
  ): WorkflowDefinition => {
    const metaByNodeKey = new Map(
      sourceNodes.map((node) => [
        String(node.nodeKey || node.id),
        {
          nodeType: node.nodeType,
          fieldKey: node.fieldKey,
          fieldLabel: node.fieldLabel,
          actionButtonLabel: node.actionButtonLabel,
        },
      ]),
    );

    return {
      ...workflow,
      nodes: workflow.nodes.map((node) => {
        const meta = metaByNodeKey.get(String(node.nodeKey || node.id));
        return meta
          ? {
              ...node,
              nodeType: meta.nodeType || node.nodeType,
              fieldKey: meta.fieldKey || node.fieldKey,
              fieldLabel: meta.fieldLabel || node.fieldLabel,
              actionButtonLabel:
                meta.actionButtonLabel || node.actionButtonLabel,
            }
          : node;
      }),
    };
  };

  const buildWorkflowPayload = (values: {
    name: string;
    target: "opportunity" | "solution";
    enabled: boolean;
    description?: string;
    applicableOpportunity?: string;
  }) => ({
    name: values.name,
    targetType: values.target,
    enabled: values.enabled,
    description: values.description,
    applicableOpportunity: values.applicableOpportunity,
    nodes: workflowEditorNodes.map((node, index) => ({
      nodeKey: node.nodeKey || `node_${index + 1}`,
      nodeName: node.name,
      nodeOrder: node.nodeOrder ?? index + 1,
      description: node.description,
      canReject: node.canReject ?? true,
      rejectStrategy: node.rejectStrategy ?? "terminate",
      rejectCommentRequired: node.rejectCommentRequired ?? false,
      approvers:
        node.approvers && node.approvers.length > 0
          ? node.approvers.map((approver, approverIndex) => ({
              approverType: approver.approverType,
              approverRef: approver.approverRef,
              displayName: approver.displayName,
              voteRule: approver.voteRule ?? "any",
              sortOrder: approver.sortOrder ?? approverIndex,
            }))
          : [
              {
                approverType: "user",
                approverRef:
                  node.approverRole && node.approverRole.trim().length > 0
                    ? node.approverRole.trim()
                    : "待配置审批对象",
                displayName:
                  node.approverRole && node.approverRole.trim().length > 0
                    ? node.approverRole.trim()
                    : "待配置审批对象",
                voteRule: "any",
                sortOrder: 0,
              },
            ],
    })),
  });

  const loadWorkflowDefinitions = async (force = false) => {
    if (!force && isWorkflowLibraryPinnedToLocalDefaults()) {
      setWorkflowError(null);
      setWorkflowLoading(false);
      return;
    }
    setWorkflowLoading(true);
    try {
      const resp = await fetch(`${WORKFLOW_API_BASE_URL}/workflow-definitions`, {
        method: "GET",
        headers: getWorkflowAuthHeaders(false),
      });
      if (!resp.ok) {
        setWorkflowError(
          `流程库加载失败：${resp.status}。若后端未启动或数据库未初始化，当前继续显示本地流程。`,
        );
        return;
      }
      const data = (await resp.json()) as ApiWorkflowDefinition[];
      if (Array.isArray(data)) {
        const normalized = data.map(normalizeWorkflowDefinition);
        setWorkflowList(normalized);
        const opportunityDefault = normalized.find(
          (item) => item.target === "opportunity" && item.isDefault,
        );
        const solutionDefault = normalized.find(
          (item) => item.target === "solution" && item.isDefault,
        );
        setSelectedOpportunityWorkflowId(
          opportunityDefault ? String(opportunityDefault.id) : null,
        );
        setSelectedSolutionWorkflowId(
          solutionDefault ? String(solutionDefault.id) : null,
        );
        saveWorkflowLibraryPinnedToLocalDefaults(false);
        setWorkflowError(null);
      }
    } catch {
      setWorkflowError(
        "未检测到可用的流程库后端接口，当前继续显示本地流程。",
      );
    } finally {
      setWorkflowLoading(false);
    }
  };

  // 持久化流程库与默认流程选择
  useEffect(() => {
    if (typeof window === "undefined") return;
    saveWorkflowLibrary(workflowList);
  }, [workflowList]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    saveSelectedWorkflowId("opportunity", selectedOpportunityWorkflowId);
  }, [selectedOpportunityWorkflowId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    saveSelectedWorkflowId("solution", selectedSolutionWorkflowId);
  }, [selectedSolutionWorkflowId]);

  useEffect(() => {
    saveSharedTeamMembers(members.map(mapTeamMemberToSharedSnapshot));
  }, [members]);

  useEffect(() => {
    void loadWorkflowDefinitions(false);
  }, []);

  const handleAddWorkflowNode = () => {
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}_${workflowEditorNodes.length + 1}`,
      nodeKey: `node_${workflowEditorNodes.length + 1}`,
      name: `审批节点 ${workflowEditorNodes.length + 1}`,
      nodeOrder: workflowEditorNodes.length + 1,
      nodeType: "approval",
      fieldKey: "approvalStatus",
      fieldLabel: "审批结果",
      approverRole: "待配置审批对象",
      canReject: true,
      rejectStrategy: "terminate",
      rejectCommentRequired: false,
      approvers: [
        {
          approverType: "user",
          approverRef: "待配置审批对象",
          displayName: "待配置审批对象",
          voteRule: "any",
          sortOrder: 0,
        },
      ],
    };
    setWorkflowEditorNodes((prev) => [...prev, newNode]);
  };

  const handleUpdateWorkflowNode = (
    nodeId: string | number,
    patch: Partial<WorkflowNode>,
  ) => {
    setWorkflowEditorNodes((prev) =>
      prev.map((n) =>
        String(n.id) === String(nodeId)
          ? { ...n, ...patch }
          : n,
      ),
    );
  };

  const handleRemoveWorkflowNode = (nodeId: string | number) => {
    const targetNode = workflowEditorNodes.find(
      (node) => String(node.id) === String(nodeId),
    );
    Modal.confirm({
      title: `确认删除流程节点「${targetNode?.name || "未命名节点"}」？`,
      content: "删除后当前流程中的节点顺序会自动重排。",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: () => {
        setWorkflowEditorNodes((prev) =>
          prev
            .filter((n) => String(n.id) !== String(nodeId))
            .map((node, index) => ({
              ...node,
              nodeOrder: index + 1,
            })),
        );
        message.success(`已删除流程节点：${targetNode?.name || "未命名节点"}`);
      },
    });
  };

  const handleCreateWorkflow = () => {
    if (!canCreateWorkflow) {
      message.warning("当前账号无权维护流程库。");
      return;
    }
    setWorkflowModalMode("create");
    setEditingWorkflowId(null);
    setWorkflowEditorNodes([]);
    workflowForm.resetFields();
    workflowForm.setFieldsValue({
      target: "opportunity",
      enabled: true,
      description: "",
      applicableOpportunity: "",
    });
    setWorkflowModalVisible(true);
  };

  const handleEditWorkflow = (record: WorkflowDefinition) => {
    if (!canEditWorkflow) {
      message.warning("当前账号无权编辑流程。");
      return;
    }
    setWorkflowModalMode("edit");
    setEditingWorkflowId(String(record.id));
    setWorkflowEditorNodes(record.nodes || []);
    workflowForm.resetFields();
    workflowForm.setFieldsValue({
      name: record.name,
      target: record.target,
      enabled: record.enabled,
      description: record.description,
      applicableOpportunity: record.applicableOpportunity,
    });
    setWorkflowModalVisible(true);
  };

  const handleSaveWorkflowFromModal = async () => {
    if (
      (workflowModalMode === "create" && !canCreateWorkflow) ||
      (workflowModalMode === "edit" && !canEditWorkflow)
    ) {
      message.warning("当前账号无权保存流程。");
      return;
    }
    try {
      const values = await workflowForm.validateFields();
      const { name, target, enabled, description, applicableOpportunity } = values as {
        name: string;
        target: "opportunity" | "solution";
        enabled: boolean;
        description?: string;
        applicableOpportunity?: string;
      };
      if (!workflowEditorNodes || workflowEditorNodes.length === 0) {
        message.warning("请至少添加一个审批节点");
        return;
      }

      const requestPayload = buildWorkflowPayload({
        name,
        target,
        enabled,
        description,
        applicableOpportunity,
      });

      let resp: Response;
      if (workflowModalMode === "edit" && editingWorkflowId) {
        resp = await fetch(
          `${WORKFLOW_API_BASE_URL}/workflow-definitions/${editingWorkflowId}`,
          {
            method: "PATCH",
            headers: getWorkflowAuthHeaders(),
            body: JSON.stringify(requestPayload),
          },
        );
        if (!resp.ok) {
          message.error(`更新流程失败：${resp.status}`);
          return;
        }
      } else {
        resp = await fetch(`${WORKFLOW_API_BASE_URL}/workflow-definitions`, {
          method: "POST",
          headers: getWorkflowAuthHeaders(),
          body: JSON.stringify(requestPayload),
        });
        if (!resp.ok) {
          message.error(`创建流程失败：${resp.status}`);
          return;
        }
      }

      const savedData = (await resp.json()) as ApiWorkflowDefinition;
      const savedWorkflow = attachWorkflowNodeClientMeta(
        normalizeWorkflowDefinition(savedData),
        workflowEditorNodes,
      );
      const nextWorkflowList =
        workflowModalMode === "edit"
          ? workflowList.map((item) =>
              String(item.id) === String(savedWorkflow.id) ? savedWorkflow : item,
            )
          : [savedWorkflow, ...workflowList];

      setWorkflowList(nextWorkflowList);
      saveWorkflowLibrary(nextWorkflowList);

      if (workflowModalMode === "edit") {
        message.success("已更新流程配置");
      } else {
        message.success("已创建新审批流程");
      }

      await loadWorkflowDefinitions(true);
      setWorkflowModalVisible(false);
    } catch {
      // 校验失败不关闭
    }
  };

  const handleSetWorkflowAsDefault = async (record: WorkflowDefinition) => {
    if (!canApproveWorkflow) {
      message.warning("当前账号无权设置默认流程。");
      return;
    }
    try {
      const resp = await fetch(
        `${WORKFLOW_API_BASE_URL}/workflow-definitions/${record.id}/set-default`,
        {
          method: "POST",
          headers: getWorkflowAuthHeaders(),
        },
      );
      if (!resp.ok) {
        message.error(`设置默认流程失败：${resp.status}`);
        return;
      }
      await loadWorkflowDefinitions();
      if (record.target === "opportunity") {
        message.success(`已将「${record.name}」设为商机管理默认流程`);
      } else {
        message.success(`已将「${record.name}」设为解决方案管理默认流程`);
      }
    } catch {
      message.error("设置默认流程失败，请检查后端流程库接口。");
    }
  };

  const handleToggleWorkflowEnabled = async (record: WorkflowDefinition) => {
    if (!canEditWorkflow) {
      message.warning("当前账号无权更新流程状态。");
      return;
    }
    try {
      const endpoint = record.enabled ? "disable" : "enable";
      const resp = await fetch(
        `${WORKFLOW_API_BASE_URL}/workflow-definitions/${record.id}/${endpoint}`,
        {
          method: "POST",
          headers: getWorkflowAuthHeaders(),
        },
      );
      if (!resp.ok) {
        message.error(`更新流程状态失败：${resp.status}`);
        return;
      }
      await loadWorkflowDefinitions();
      message.success(
        record.enabled ? "已停用流程" : "已启用流程",
      );
    } catch {
      message.error("更新流程状态失败，请检查后端流程库接口。");
    }
  };

  const handleDeleteWorkflow = (record: WorkflowDefinition) => {
    if (!canDeleteWorkflow) {
      message.warning("当前账号无权删除流程。");
      return;
    }
    Modal.confirm({
      title: `确认删除流程「${record.name}」？`,
      content:
        "删除后，对应模块需要重新指定默认流程。该操作会删除服务器中的流程定义。",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        const resp = await fetch(
          `${WORKFLOW_API_BASE_URL}/workflow-definitions/${record.id}`,
          {
            method: "DELETE",
            headers: getWorkflowAuthHeaders(false),
          },
        );
        if (!resp.ok) {
          message.error(`删除流程失败：${resp.status}`);
          return;
        }
        await loadWorkflowDefinitions();
        message.success("已删除流程");
      },
    });
  };

  const getBrandLogoVisual = () => {
    const usageKey = logoConfig.usageKey;
    if (usageKey === "app.logo.ai") {
      return {
        background:
          "linear-gradient(135deg, #1890ff 0%, #722ed1 50%, #fadb14 100%)",
        text: "AI",
      };
    }
    if (usageKey === "app.logo.main") {
      return {
        background: "#1890ff",
        text: "PS",
      };
    }
    return {
      background: "#13c2c2",
      text:
        (logoConfig.displayName && logoConfig.displayName.charAt(0)) || "L",
    };
  };

  const handleResetWorkflowLibraryToDefaults = () => {
    if (!canEditWorkflow) {
      message.warning("当前账号无权重置流程库。");
      return;
    }
    setWorkflowList(DEFAULT_WORKFLOWS);
    setSelectedOpportunityWorkflowId("default_opportunity_flow");
    setSelectedSolutionWorkflowId("default_solution_flow");
    saveWorkflowLibrary(DEFAULT_WORKFLOWS);
    saveSelectedWorkflowId("opportunity", "default_opportunity_flow");
    saveSelectedWorkflowId("solution", "default_solution_flow");
    saveWorkflowLibraryPinnedToLocalDefaults(true);
    setWorkflowError(null);
    message.success("已将前端流程库恢复为当前代码默认模板，并记忆为后续默认展示内容。");
  };

  const permissionWorkbenchCardStyle: React.CSSProperties = {
    borderRadius: 20,
    border: "1px solid var(--app-border)",
    boxShadow: "var(--app-shadow)",
    background:
      "linear-gradient(180deg, color-mix(in srgb, var(--app-surface) 96%, transparent) 0%, color-mix(in srgb, var(--app-surface-soft) 96%, transparent) 100%)",
  };

  const permissionPanelStyle: React.CSSProperties = {
    ...permissionWorkbenchCardStyle,
    background:
      "linear-gradient(180deg, color-mix(in srgb, var(--app-surface) 98%, transparent) 0%, color-mix(in srgb, var(--app-surface-strong) 96%, transparent) 100%)",
  };

  const permissionStickySummaryStyle: React.CSSProperties = {
    position: "sticky",
    top: 20,
  };

  const menuPermissionMatrixColumns = "minmax(280px, 2.1fr) 132px 132px 132px 124px";

  const menuPermissionMatrixHeader = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: menuPermissionMatrixColumns,
        gap: 14,
        padding: "12px 16px 14px",
        fontSize: 12,
        color: "var(--app-text-secondary)",
        fontWeight: 700,
        background:
          "linear-gradient(90deg, color-mix(in srgb, rgba(59,130,246,0.16) 70%, var(--app-surface) 30%) 0%, var(--app-surface-soft) 48%, var(--app-surface) 100%)",
        borderRadius: 16,
        border: "1px solid rgba(59, 130, 246, 0.24)",
      }}
    >
      <div>权限项</div>
      <div>角色默认</div>
      <div>自定义允许</div>
      <div>自定义隐藏</div>
      <div>最终生效</div>
    </div>
  );

  const createMenuPermissionRowStyle = (
    isOverridden: boolean,
    isEffective: boolean,
  ) =>
    ({
      display: "grid",
      gridTemplateColumns: menuPermissionMatrixColumns,
      gap: 14,
      alignItems: "center",
      padding: "16px 16px",
      borderRadius: 16,
      border: isOverridden
        ? "1px solid rgba(59, 130, 246, 0.32)"
        : "1px solid var(--app-border)",
      background: isOverridden
        ? "linear-gradient(90deg, color-mix(in srgb, rgba(59,130,246,0.18) 70%, var(--app-surface) 30%) 0%, var(--app-surface-soft) 100%)"
        : isEffective
          ? "linear-gradient(90deg, var(--app-surface) 0%, var(--app-surface-soft) 100%)"
          : "linear-gradient(90deg, color-mix(in srgb, var(--app-surface) 88%, transparent) 0%, var(--app-surface-soft) 100%)",
      boxShadow: isOverridden
        ? "0 10px 22px rgba(59, 130, 246, 0.10)"
        : "0 8px 18px rgba(15, 23, 42, 0.12)",
      opacity: isEffective ? 1 : 0.88,
    } satisfies React.CSSProperties);

  const actionPermissionMatrixColumns = "minmax(280px, 2.1fr) 132px 132px 132px 124px";

  const actionPermissionMatrixHeader = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: actionPermissionMatrixColumns,
        gap: 14,
        padding: "12px 16px 14px",
        fontSize: 12,
        color: "var(--app-text-secondary)",
        fontWeight: 700,
        background:
          "linear-gradient(90deg, color-mix(in srgb, rgba(34,197,94,0.16) 70%, var(--app-surface) 30%) 0%, var(--app-surface-soft) 45%, var(--app-surface) 100%)",
        borderRadius: 16,
        border: "1px solid rgba(34, 197, 94, 0.24)",
      }}
    >
      <div>权限项</div>
      <div>角色默认</div>
      <div>自定义允许</div>
      <div>自定义隐藏</div>
      <div>最终生效</div>
    </div>
  );

  const createActionPermissionRowStyle = (
    isOverridden: boolean,
    isEffective: boolean,
  ) =>
    ({
      display: "grid",
      gridTemplateColumns: actionPermissionMatrixColumns,
      gap: 14,
      alignItems: "center",
      padding: "16px 16px",
      borderRadius: 16,
      border: isOverridden
        ? "1px solid rgba(251, 146, 60, 0.3)"
        : "1px solid var(--app-border)",
      background: isOverridden
        ? "linear-gradient(90deg, color-mix(in srgb, rgba(251,146,60,0.16) 70%, var(--app-surface) 30%) 0%, var(--app-surface-soft) 100%)"
        : isEffective
          ? "linear-gradient(90deg, var(--app-surface) 0%, var(--app-surface-soft) 100%)"
          : "linear-gradient(90deg, color-mix(in srgb, var(--app-surface) 88%, transparent) 0%, var(--app-surface-soft) 100%)",
      boxShadow: isOverridden
        ? "0 10px 22px rgba(251, 146, 60, 0.10)"
        : "0 8px 18px rgba(15, 23, 42, 0.12)",
      opacity: isEffective ? 1 : 0.88,
    } satisfies React.CSSProperties);

  const permissionMatrixHeader = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.3fr 120px 120px 120px 120px",
        gap: 12,
        padding: "10px 14px 12px",
        fontSize: 12,
        color: "var(--app-text-secondary)",
        fontWeight: 600,
        background:
          "linear-gradient(90deg, var(--app-surface-soft) 0%, color-mix(in srgb, rgba(59,130,246,0.12) 55%, var(--app-surface) 45%) 100%)",
        borderRadius: 12,
        border: "1px solid var(--app-border)",
      }}
    >
      <div>权限项</div>
      <div>角色默认</div>
      <div>自定义允许</div>
      <div>自定义隐藏</div>
      <div>最终生效</div>
    </div>
  );

  const createPermissionRowStyle = (isOverridden: boolean, isEffective: boolean) =>
    ({
      display: "grid",
      gridTemplateColumns: "1.3fr 120px 120px 120px 120px",
      gap: 12,
      alignItems: "center",
      padding: "14px 12px",
      borderRadius: 14,
      border: isOverridden
        ? "1px solid rgba(251, 146, 60, 0.3)"
        : "1px solid var(--app-border)",
      background: isOverridden
        ? "linear-gradient(90deg, color-mix(in srgb, rgba(251,146,60,0.16) 70%, var(--app-surface) 30%) 0%, var(--app-surface-soft) 100%)"
        : isEffective
          ? "linear-gradient(90deg, var(--app-surface) 0%, var(--app-surface-soft) 100%)"
          : "linear-gradient(90deg, color-mix(in srgb, var(--app-surface) 88%, transparent) 0%, var(--app-surface-soft) 100%)",
      boxShadow: isOverridden
        ? "0 8px 18px rgba(251, 146, 60, 0.10)"
        : "0 6px 16px rgba(15, 23, 42, 0.12)",
      opacity: isEffective ? 1 : 0.8,
    } satisfies React.CSSProperties);

  const handleAllowAllMenusForModule = (moduleKey: PermissionModuleKey) => {
    const keys = groupedMenuDefinitionsByModule
      .find((item) => item.moduleKey === moduleKey)
      ?.items.map((item) => item.key) || [];
    setAllowedMenuKeysDraft((prev) => Array.from(new Set([...prev, ...keys])));
    setDeniedMenuKeysDraft((prev) => prev.filter((item) => !keys.includes(item)));
  };

  const handleClearMenuOverridesForModule = (moduleKey: PermissionModuleKey) => {
    const keys = groupedMenuDefinitionsByModule
      .find((item) => item.moduleKey === moduleKey)
      ?.items.map((item) => item.key) || [];
    setAllowedMenuKeysDraft((prev) => prev.filter((item) => !keys.includes(item)));
    setDeniedMenuKeysDraft((prev) => prev.filter((item) => !keys.includes(item)));
  };

  const handleAllowAllActionsForModule = (
    moduleKey: ActionPermissionDefinition["module"],
  ) => {
    const keys = groupedActionDefinitionsByModule
      .find((item) => item.moduleKey === moduleKey)
      ?.items.map((item) => item.key) || [];
    setAllowedActionKeysDraft((prev) => Array.from(new Set([...prev, ...keys])));
    setDeniedActionKeysDraft((prev) =>
      prev.filter((item) => !keys.includes(item)),
    );
  };

  const handleClearActionOverridesForModule = (
    moduleKey: ActionPermissionDefinition["module"],
  ) => {
    const keys = groupedActionDefinitionsByModule
      .find((item) => item.moduleKey === moduleKey)
      ?.items.map((item) => item.key) || [];
    setAllowedActionKeysDraft((prev) =>
      prev.filter((item) => !keys.includes(item)),
    );
    setDeniedActionKeysDraft((prev) =>
      prev.filter((item) => !keys.includes(item)),
    );
  };

  const handleMenuClick = (item: SettingsMenuItem) => {
    setActiveMenu(item.key);
  };

  const handleLoadBrandingFromServer = async () => {
    try {
      const resp = await fetch(buildApiUrl("/settings/branding"), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!resp.ok) {
        message.warning(
          `从服务器加载品牌配置失败：${resp.status}，请检查后端 /settings/branding 接口是否正常`,
        );
        return;
      }
      const json = (await resp.json()) as {
        success?: boolean;
        data?: {
          appName?: string;
          logo?: { usageKey?: string; displayName?: string };
        } | null;
      };
      if (!json || !json.data) {
        message.info("服务器尚未保存品牌配置，保持当前本地配置。");
        return;
      }
      const nextName = json.data.appName;
      const nextLogo = json.data.logo;
      if (nextName && typeof nextName === "string") {
        onChangeAppName(nextName);
      }
      if (
        nextLogo &&
        typeof nextLogo.usageKey === "string" &&
        typeof nextLogo.displayName === "string"
      ) {
        onChangeLogo({
          usageKey: nextLogo.usageKey,
          displayName: nextLogo.displayName,
        });
      }
      message.success("已从服务器加载品牌配置并应用到当前界面");
    } catch {
      message.info(
        "未检测到可用的 /settings/branding 后端接口，继续使用本地浏览器中的配置。",
      );
    }
  };

  const handleSaveBrandingToServer = async () => {
    if (!canManageSettings) {
      message.warning("当前账号无权保存系统品牌配置。");
      return;
    }
    try {
      const payload = {
        appName,
        logo: {
          usageKey: logoConfig.usageKey,
          displayName: logoConfig.displayName,
        },
      };
      const resp = await fetch(buildApiUrl("/settings/branding"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (resp.ok) {
        message.success("已将品牌配置保存到服务器");
      } else {
        message.warning(
          `服务器返回非成功状态：${resp.status}，请检查后端 /settings/branding 接口是否已实现`,
        );
      }
    } catch {
      message.info(
        "未检测到可用的 /settings/branding 后端接口，仅本地保存到浏览器。",
      );
    }
  };

  const handleSaveCurrentProfile = async () => {
    if (!accessToken) {
      message.warning("当前登录态已失效，请重新登录后再试。");
      return;
    }
    setProfileSaving(true);
    try {
      const values = await profileForm.validateFields();
      const resp = await fetch(`${USER_API_BASE_URL}/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          displayName: values.displayName,
          email: values.email,
          mainIndustry: values.mainIndustry || [],
          teamRole: values.teamRole,
        }),
      });
      if (!resp.ok) {
        message.error(`保存个人资料失败：${resp.status}`);
        return;
      }
      const updatedUser = (await resp.json()) as CurrentUser;
      onCurrentUserChange?.(updatedUser);
      message.success("个人资料已更新");
    } catch {
      // validation errors keep form open
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangeCurrentPassword = async () => {
    if (!accessToken) {
      message.warning("当前登录态已失效，请重新登录后再试。");
      return;
    }
    setPasswordSaving(true);
    try {
      const values = await passwordForm.validateFields();
      const resp = await fetch(`${USER_API_BASE_URL}/users/me/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
          confirmPassword: values.confirmPassword,
        }),
      });
      if (!resp.ok) {
        let detail = `${resp.status}`;
        try {
          const body = (await resp.json()) as { message?: string };
          if (body?.message) {
            detail = body.message;
          }
        } catch {
          // ignore response parse errors
        }
        message.error(`修改密码失败：${detail}`);
        return;
      }
      passwordForm.resetFields();
      message.success("密码已更新，请使用新密码继续登录。");
    } catch {
      // validation errors keep form open
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div
      className="settings-view"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 18,
        padding: 0,
      }}
    >
      <Row gutter={[16, 16]} align="top">
        <Col xs={24} md={8} lg={7} xl={6}>
          <Card
            title="设置菜单"
            style={{
              ...permissionWorkbenchCardStyle,
              position: "sticky",
              top: 12,
              background:
                "radial-gradient(circle at top left, rgba(20,184,166,0.12), transparent 34%), linear-gradient(180deg, color-mix(in srgb, var(--app-surface) 98%, transparent) 0%, color-mix(in srgb, var(--app-surface-soft) 98%, transparent) 100%)",
            }}
            headStyle={{
              borderBottom: "1px solid var(--app-border)",
              fontSize: 15,
              fontWeight: 700,
            }}
            bodyStyle={{ padding: 14 }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {filteredSettingsMenuItems.map((item) => {
                const isActive = activeMenu === item.key;
                const baseStyle: React.CSSProperties = {
                  padding: "14px 14px",
                  borderRadius: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  transition: "all 0.2s ease",
                  border: "1px solid color-mix(in srgb, var(--app-border) 84%, transparent)",
                  background:
                    "linear-gradient(180deg, color-mix(in srgb, var(--app-surface) 98%, transparent) 0%, color-mix(in srgb, var(--app-surface-soft) 96%, transparent) 100%)",
                };

                let background: string | undefined;
                let borderLeft: string | undefined;
                let color = "var(--app-text-primary)";

                if (isActive) {
                  background =
                    "linear-gradient(90deg, color-mix(in srgb, var(--app-accent-soft) 52%, var(--app-surface) 48%) 0%, color-mix(in srgb, var(--app-surface-soft) 94%, transparent) 100%)";
                  borderLeft = "4px solid var(--app-accent)";
                  color = "var(--app-text-primary)";
                }

                return (
                  <div
                    key={item.key}
                    style={{
                      ...baseStyle,
                      background,
                      borderLeft,
                      color,
                      borderColor: isActive
                        ? "color-mix(in srgb, var(--app-accent) 32%, var(--app-border-strong) 68%)"
                        : "color-mix(in srgb, var(--app-border) 84%, transparent)",
                      boxShadow: isActive
                        ? "0 0 0 1px color-mix(in srgb, var(--app-accent) 24%, transparent), 0 14px 28px rgba(20, 184, 166, 0.12)"
                        : "var(--app-shadow)",
                    }}
                    onClick={() => handleMenuClick(item)}
                  >
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <span style={{ fontWeight: isActive ? 700 : 600 }}>
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>

        <Col xs={24} md={16} lg={17} xl={18}>
          {(activeMenu === "profile" || activeMenu === "security") && (
            <Suspense
              fallback={
                <SettingsSectionLoadingCard
                  title={activeMenu === "profile" ? "正在加载个人资料" : "正在加载安全设置"}
                  description="账号资料与安全表单正在按需加载，以继续压缩系统设置页主包。"
                />
              }
            >
              <LazySettingsAccountPanel
                allIndustries={allIndustries}
                currentUser={currentUser}
                getAvatarColor={getAvatarColor}
                onNavigateToProfile={() => setActiveMenu("profile")}
                onNavigateToSecurity={() => setActiveMenu("security")}
                onSaveCurrentProfile={handleSaveCurrentProfile}
                onChangeCurrentPassword={handleChangeCurrentPassword}
                passwordForm={passwordForm}
                passwordSaving={passwordSaving}
                permissionPanelStyle={permissionPanelStyle}
                permissionWorkbenchCardStyle={permissionWorkbenchCardStyle}
                profileForm={profileForm}
                profileSaving={profileSaving}
                teamRoleOptions={TEAM_ROLE_OPTIONS}
                view={activeMenu}
              />
            </Suspense>
          )}

          {activeMenu === "notifications" && (
            <Card style={permissionWorkbenchCardStyle}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--app-text-primary)", marginBottom: 10 }}>
                通知设置
              </div>
              <Text type="secondary" style={{ display: "block", marginBottom: 18 }}>
                这里保留为个人通知偏好入口，后续可继续扩展短信、邮件、审批提醒等通知策略。
              </Text>
              <Card size="small" bordered={false} style={permissionPanelStyle}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>审批提醒</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        在商机、方案或流程审批状态变化时接收提醒。
                      </Text>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>系统公告</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        顶栏展示平台更新、权限调整和流程模板更新提醒。
                      </Text>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </Card>
            </Card>
          )}

          {activeMenu === "team" && (
            <Suspense
              fallback={
                <SettingsSectionLoadingCard
                  title="正在加载团队管理"
                  description="成员列表、筛选器与权限说明正在按需加载，以继续压缩系统设置页主包。"
                />
              }
            >
              <LazySettingsTeamPanel
                canManageMembers={canManageMembers}
                columns={columns}
                filteredMembersLength={filteredMembers.length}
                keyword={keyword}
                membersLoading={membersLoading}
                membersPermissionHint={
                  !canManageMembers
                    ? "当前登录角色仅可查看权限说明；团队成员维护、权限配置与设置中心高级入口需按角色模板或个性化权限开放。"
                    : "当前页面已接入真实团队成员接口，菜单与操作权限均基于角色模板 + 用户个性化覆盖实时生效。"
                }
                paginatedMembers={paginatedMembers}
                roleFilter={roleFilter}
                rolePermissionSummaryCards={ROLE_PERMISSION_SUMMARY_CARDS}
                selectedTeamTableToggleableColumnCount={
                  selectedTeamTableToggleableColumnKeys.length
                }
                statusFilter={statusFilter}
                teamTableColumnSettingContent={teamTableColumnSettingContent}
                teamTablePage={teamTablePage}
                teamTablePageSize={teamTablePageSize}
                teamTableToggleableColumnCount={teamTableToggleableColumnKeys.length}
                onAddMember={() => {
                  setCurrentMember(null);
                  setMemberModalMode("create");
                  setGeneratedMemberPassword("");
                  form.resetFields();
                  form.setFieldsValue({
                    role: "工程师",
                    status: "活跃",
                    permissions: getPermissionSummaryByRole("工程师"),
                    mainIndustry: [],
                  });
                  setMemberModalVisible(true);
                }}
                onKeywordChange={(value) => {
                  setTeamTablePage(1);
                  setKeyword(value);
                }}
                onPaginationChange={(nextPage, nextPageSize) => {
                  setTeamTablePage(nextPage);
                  setTeamTablePageSize(nextPageSize);
                }}
                onRoleFilterChange={(value) => {
                  setTeamTablePage(1);
                  setRoleFilter(value as TeamMember["role"] | undefined);
                }}
                onStatusFilterChange={(value) => {
                  setTeamTablePage(1);
                  setStatusFilter(value as TeamMember["status"] | undefined);
                }}
              />
            </Suspense>
          )}

          {activeMenu === "permissionsCenter" && (
            <Suspense
              fallback={
                <SettingsSectionLoadingCard
                  title="正在加载权限中心"
                  description="菜单权限与操作权限运行时正在按需加载。"
                />
              }
            >
              <LazySettingsPermissionsCenterPanel
                canManageActionPermissions={canManageActionPermissions}
                canManageMenuPermissions={canManageMenuPermissions}
                filteredMembers={filteredMembers}
                getAvatarColor={getAvatarColor}
                getRoleTagColor={getRoleTagColor}
                initialTab={permissionCenterEntryTab}
                onRefreshMembers={() => void loadTeamMembers()}
                permissionPanelStyle={permissionPanelStyle}
                permissionWorkbenchCardStyle={permissionWorkbenchCardStyle}
              />
            </Suspense>
          )}

          {activeMenu === "system" && (
            <Suspense
              fallback={
                <SettingsSectionLoadingCard
                  title="正在加载品牌设置"
                  description="当前正在按需加载平台品牌与 Logo 设置，以降低系统设置页的初始包体积。"
                />
              }
            >
              <LazyBrandingSettingsPanel
                appName={appName}
                logoConfig={logoConfig}
                canManageSettings={canManageSettings}
                getBrandLogoVisual={getBrandLogoVisual}
                onChangeAppName={onChangeAppName}
                onLoadBrandingFromServer={handleLoadBrandingFromServer}
                onSaveBrandingToServer={handleSaveBrandingToServer}
                onNavigateToPlugins={() => setActiveMenu("plugins")}
              />
            </Suspense>
          )}

          {activeMenu === "workflow" && (
            <Suspense
              fallback={
                <SettingsSectionLoadingCard
                  title="正在加载审批流程库"
                  description="审批流程列表与操作面板正在按需加载，以继续压缩系统设置页主包。"
                />
              }
            >
              <LazySettingsWorkflowPanel
                canApproveWorkflow={canApproveWorkflow}
                canCreateWorkflow={canCreateWorkflow}
                canDeleteWorkflow={canDeleteWorkflow}
                canEditWorkflow={canEditWorkflow}
                selectedOpportunityWorkflowId={selectedOpportunityWorkflowId}
                selectedSolutionWorkflowId={selectedSolutionWorkflowId}
                workflowError={workflowError}
                workflowList={workflowList}
                workflowLoading={workflowLoading}
                onCreateWorkflow={handleCreateWorkflow}
                onDeleteWorkflow={handleDeleteWorkflow}
                onEditWorkflow={handleEditWorkflow}
                onReload={() => void loadWorkflowDefinitions(true)}
                onResetWorkflowLibraryToDefaults={handleResetWorkflowLibraryToDefaults}
                onSetWorkflowAsDefault={handleSetWorkflowAsDefault}
                onToggleWorkflowEnabled={handleToggleWorkflowEnabled}
              />
            </Suspense>
          )}

          {activeMenu === "feishuIntegration" && (
            <Suspense
              fallback={
                <SettingsSectionLoadingCard
                  title="正在加载飞书集成页"
                  description="当前正在按需加载飞书集成模块，以降低系统设置首页的初始包体积。"
                />
              }
            >
              <LazyFeishuIntegrationView
                currentUser={currentUser}
                accessToken={accessToken}
              />
            </Suspense>
          )}

          {activeMenu === "openclawPlayground" && (
            <Suspense
              fallback={
                <SettingsSectionLoadingCard
                  title="正在加载 OpenClaw 联调页"
                  description="当前正在按需加载联调模块，以降低系统设置首页的初始包体积。"
                />
              }
            >
              <LazyOpenClawPlaygroundView
                currentUser={currentUser}
                accessToken={accessToken}
              />
            </Suspense>
          )}

          {activeMenu === "plugins" && (
            <Card>
              <div
                style={{
                  marginBottom: 16,
                  fontSize: 14,
                  color: "#595959",
                }}
              >
                图标/Logo插件库
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  集中管理平台使用的图标与 Logo 资源，可在此选择平台左上角 Logo
                  资源。
                </Text>
              </div>
              <Suspense
                fallback={
                  <SettingsSectionLoadingCard
                    title="正在加载图标/Logo插件库"
                    description="当前正在按需加载插件资源模块，以降低系统设置首页的初始包体积。"
                  />
                }
              >
                <LazyPluginLibraryView
                  currentLogo={logoConfig}
                  onChangeLogo={onChangeLogo}
                  readOnly={!canManagePluginLibrary}
                />
              </Suspense>
            </Card>
          )}

          {activeMenu === "data" && (
            <Suspense
              fallback={
                <SettingsSectionLoadingCard
                  title="正在加载知识库目录管理"
                  description="当前正在按需加载知识库目录编辑面板，以降低系统设置页的初始包体积。"
                />
              }
            >
              <LazySettingsKnowledgeRuntimePanel
                canEditKnowledge={canEditKnowledge}
                canDeleteKnowledgeCategories={canDeleteKnowledgeCategories}
                defaultKnowledgeCategoryTree={DEFAULT_KNOWLEDGE_CATEGORY_TREE}
                initialKnowledgeCategoryTree={initialKnowledgeTree}
              />
            </Suspense>
          )}

          {activeMenu !== "team" &&
            activeMenu !== "permissionsCenter" &&
            activeMenu !== "profile" &&
            activeMenu !== "security" &&
            activeMenu !== "notifications" &&
            activeMenu !== "system" &&
            activeMenu !== "feishuIntegration" &&
            activeMenu !== "workflow" &&
            activeMenu !== "plugins" &&
            activeMenu !== "data" && (
            <Card>
              <div style={{ fontSize: 14, color: "#595959" }}>
                {filteredSettingsMenuItems.find((i) => i.key === activeMenu)?.label}
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                当前区域为占位内容，后续可根据实际需求补充详细配置项。
              </Text>
            </Card>
          )}
        </Col>
      </Row>

      <Suspense fallback={null}>
        <LazyTeamMemberModals
          memberModalVisible={memberModalVisible}
          memberModalMode={memberModalMode}
          form={form}
          onCancelMemberModal={() => {
            setGeneratedMemberPassword("");
            setMemberModalVisible(false);
          }}
          onSubmitMemberModal={async () => {
            try {
              const values = await form.validateFields();
              const {
                username,
                name,
                email,
                role,
                status,
                mainIndustry,
                teamRole,
                password,
              } = values as {
                username: string;
                name: string;
                email: string;
                role: TeamMember["role"];
                status: TeamMember["status"];
                mainIndustry?: string[];
                teamRole?: string;
                password?: string;
              };

              if (memberModalMode === "edit" && currentMember) {
                const resp = await fetch(
                  `${USER_API_BASE_URL}/users/${currentMember.key}`,
                  {
                    method: "PATCH",
                    headers: getWorkflowAuthHeaders(),
                    body: JSON.stringify({
                      displayName: name,
                      email,
                      role: teamRoleLabelToApiRole(role),
                      isActive: status === "活跃",
                      mainIndustry: mainIndustry || [],
                      teamRole,
                      ...(password ? { password } : {}),
                    }),
                  },
                );
                if (!resp.ok) {
                  message.error(`保存成员失败：${resp.status}`);
                  return;
                }
                const updated = mapApiUserToTeamMember(
                  (await resp.json()) as ApiTeamMember,
                );
                setMembers((prev) =>
                  prev.map((m) => (m.key === currentMember.key ? updated : m)),
                );
                message.success("已保存成员信息");
              } else {
                const resp = await fetch(`${USER_API_BASE_URL}/users`, {
                  method: "POST",
                  headers: getWorkflowAuthHeaders(),
                  body: JSON.stringify({
                    username,
                    displayName: name,
                    email,
                    password,
                    role: teamRoleLabelToApiRole(role),
                    isActive: status === "活跃",
                    mainIndustry: mainIndustry || [],
                    teamRole,
                  }),
                });
                if (!resp.ok) {
                  message.error(`添加成员失败：${resp.status}`);
                  return;
                }
                const created = mapApiUserToTeamMember(
                  (await resp.json()) as ApiTeamMember,
                );
                setMembers((prev) => [...prev, created]);
                message.success("已添加成员");
              }

              setGeneratedMemberPassword("");
              setMemberModalVisible(false);
            } catch {
              // 校验失败时不关闭
            }
          }}
          allIndustries={allIndustries}
          teamRoleOptions={TEAM_ROLE_OPTIONS}
          generatedMemberPassword={generatedMemberPassword}
          onGeneratePassword={() => {
            const chars =
              "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
            const generated = Array.from({ length: 12 }, () =>
              chars.charAt(Math.floor(Math.random() * chars.length)),
            ).join("");
            form.setFieldValue("password", generated);
            setGeneratedMemberPassword(generated);
            message.success("已随机生成密码");
          }}
          viewModalVisible={viewModalVisible}
          currentMember={currentMember}
          onCloseViewModal={() => setViewModalVisible(false)}
        />
      </Suspense>

      <Suspense fallback={null}>
        <LazyWorkflowEditorModal
          open={workflowModalVisible}
          mode={workflowModalMode}
          workflowForm={workflowForm}
          onCancel={() => {
            setWorkflowModalVisible(false);
          }}
          onSubmit={() => {
            void handleSaveWorkflowFromModal();
          }}
          workflowEditorNodes={workflowEditorNodes}
          handleAddWorkflowNode={handleAddWorkflowNode}
          handleUpdateWorkflowNode={handleUpdateWorkflowNode}
          handleRemoveWorkflowNode={handleRemoveWorkflowNode}
          canDeleteWorkflow={canDeleteWorkflow}
          workflowNodeTypeOptions={WORKFLOW_NODE_TYPE_OPTIONS}
          opportunityWorkflowFieldOptions={OPPORTUNITY_WORKFLOW_FIELD_OPTIONS}
        />
      </Suspense>
    </div>
  );
}
