import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Modal,
  Form,
  Input as AntInput,
  Select,
  Switch,
  Radio,
  Collapse,
  Spin,
  message,
} from "antd";
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

const LazySettingsTeamRuntimePanel = lazy(async () => {
  const module = await import("./settings/SettingsTeamRuntimePanel");
  return { default: module.SettingsTeamRuntimePanel };
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
  const [permissionMembers, setPermissionMembers] = useState<TeamMember[]>(() => {
    const snapshot = loadSharedTeamMembers();
    return snapshot.length > 0
      ? snapshot.map(mapSharedTeamMemberToTeamMember)
      : teamMembers;
  });
  const [workflowForm] = Form.useForm();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
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
    profileForm.setFieldsValue({
      username: currentUser?.username || "",
      displayName: currentUser?.displayName || currentUser?.username || "",
      email: currentUser?.email || "",
      roleLabel: currentUser?.roleLabel || "",
      mainIndustry: currentUser?.mainIndustry || [],
      teamRole: currentUser?.teamRole || "",
    });
  }, [currentUser, profileForm]);

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
      permissionMembers.flatMap((member) =>
        member.mainIndustry && member.mainIndustry.length > 0
          ? member.mainIndustry
          : [],
      ),
    ),
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
  const filteredMembers = permissionMembers;

  const loadPermissionCenterMembers = async () => {
    try {
      const resp = await fetch(`${USER_API_BASE_URL}/users`, {
        headers: getWorkflowAuthHeaders(false),
      });
      if (!resp.ok) {
        if (resp.status === 401) {
          setPermissionMembers([]);
          message.warning("团队成员登录态已失效，请重新登录后再加载真实成员数据。");
          return;
        }
        message.warning(
          `权限中心成员加载失败：${resp.status}，当前继续显示本地数据。`,
        );
        return;
      }
      const data = (await resp.json()) as ApiTeamMember[];
      setPermissionMembers(Array.isArray(data) ? data.map(mapApiUserToTeamMember) : []);
    } catch {
      message.warning("未检测到可用的团队成员后端接口，当前继续显示本地数据。");
    }
  };

  useEffect(() => {
    if (
      activeMenu !== "permissionsCenter" ||
      (!canManageMenuPermissions && !canManageActionPermissions)
    ) {
      return;
    }
    void loadPermissionCenterMembers();
  }, [
    activeMenu,
    canManageActionPermissions,
    canManageMenuPermissions,
  ]);

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
              <LazySettingsTeamRuntimePanel currentUser={currentUser} />
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
                onRefreshMembers={() => void loadPermissionCenterMembers()}
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
