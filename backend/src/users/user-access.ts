export const USER_ROLE_VALUES = [
  "pre_sales_engineer",
  "manager",
  "admin",
  "sales",
  "guest",
] as const;

export type UserRole = (typeof USER_ROLE_VALUES)[number];

export interface PermissionProfile {
  role: UserRole;
  roleLabel: "工程师" | "经理" | "管理员" | "销售" | "访客";
  permissions: string[];
  permissionSummary: string;
}

export interface MenuPermissionDefinition {
  key: string;
  label: string;
  category: "workspace" | "business" | "support" | "settings";
}

export interface ActionPermissionDefinition {
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

export const MENU_PERMISSION_DEFINITIONS: MenuPermissionDefinition[] = [
  { key: "menu.workbench", label: "工作台", category: "workspace" },
  { key: "menu.projects", label: "项目管理", category: "business" },
  { key: "menu.opportunities", label: "商机管理", category: "business" },
  { key: "menu.solutions", label: "解决方案", category: "business" },
  { key: "menu.bids", label: "投标管理", category: "business" },
  { key: "menu.contracts", label: "合同管理", category: "business" },
  { key: "menu.knowledge", label: "知识库", category: "support" },
  { key: "menu.analytics", label: "数据分析", category: "support" },
  { key: "menu.settings", label: "系统设置", category: "settings" },
  { key: "menu.team-management", label: "团队管理", category: "settings" },
  { key: "menu.workflow", label: "审批流程库", category: "settings" },
  {
    key: "menu.branding-settings",
    label: "平台品牌与Logo设置",
    category: "settings",
  },
  {
    key: "menu.plugin-library",
    label: "图标/Logo插件库",
    category: "settings",
  },
  {
    key: "menu.knowledge-category-management",
    label: "知识库目录管理",
    category: "settings",
  },
  {
    key: "menu.permission-management",
    label: "菜单权限页",
    category: "settings",
  },
  {
    key: "menu.action-permission-management",
    label: "操作权限页",
    category: "settings",
  },
  { key: "menu.help", label: "帮助与支持", category: "workspace" },
];

export const ACTION_PERMISSION_DEFINITIONS: ActionPermissionDefinition[] = [
  { key: "workbench.view", label: "查看工作台", module: "workbench", category: "view" },
  { key: "project.view", label: "查看项目", module: "project", category: "view" },
  { key: "project.create", label: "新建项目", module: "project", category: "crud" },
  { key: "project.edit", label: "编辑项目", module: "project", category: "crud" },
  { key: "project.delete", label: "删除项目", module: "project", category: "crud" },
  { key: "project.download", label: "下载项目资料", module: "project", category: "download" },
  { key: "project.approve", label: "项目审批", module: "project", category: "approval" },
  { key: "opportunity.view", label: "查看商机", module: "opportunity", category: "view" },
  { key: "opportunity.create", label: "新建商机", module: "opportunity", category: "crud" },
  { key: "opportunity.edit", label: "编辑商机", module: "opportunity", category: "crud" },
  { key: "opportunity.delete", label: "删除商机", module: "opportunity", category: "crud" },
  { key: "opportunity.download", label: "下载商机资料", module: "opportunity", category: "download" },
  { key: "opportunity.approve", label: "商机审批", module: "opportunity", category: "approval" },
  { key: "solution.view", label: "查看方案", module: "solution", category: "view" },
  { key: "solution.create", label: "新建方案", module: "solution", category: "crud" },
  { key: "solution.edit", label: "编辑方案", module: "solution", category: "crud" },
  { key: "solution.delete", label: "删除方案", module: "solution", category: "crud" },
  { key: "solution.download", label: "下载方案", module: "solution", category: "download" },
  { key: "solution.approve", label: "方案审批", module: "solution", category: "approval" },
  { key: "bidding.view", label: "查看投标", module: "bidding", category: "view" },
  { key: "bidding.create", label: "新建投标", module: "bidding", category: "crud" },
  { key: "bidding.edit", label: "编辑投标", module: "bidding", category: "crud" },
  { key: "bidding.delete", label: "删除投标", module: "bidding", category: "crud" },
  { key: "bidding.download", label: "下载投标文件", module: "bidding", category: "download" },
  { key: "contract.view", label: "查看合同", module: "contract", category: "view" },
  { key: "contract.create", label: "新建合同", module: "contract", category: "crud" },
  { key: "contract.edit", label: "编辑合同", module: "contract", category: "crud" },
  { key: "contract.delete", label: "删除合同", module: "contract", category: "crud" },
  { key: "contract.download", label: "下载合同", module: "contract", category: "download" },
  { key: "knowledge.view", label: "查看知识库", module: "knowledge", category: "view" },
  { key: "knowledge.create", label: "新建知识文档", module: "knowledge", category: "crud" },
  { key: "knowledge.edit", label: "编辑知识文档", module: "knowledge", category: "crud" },
  { key: "knowledge.delete", label: "删除知识文档", module: "knowledge", category: "crud" },
  { key: "knowledge.download", label: "下载知识文档", module: "knowledge", category: "download" },
  { key: "workflow.view", label: "查看审批流程库", module: "workflow", category: "view" },
  { key: "workflow.create", label: "新建审批流程", module: "workflow", category: "crud" },
  { key: "workflow.edit", label: "编辑审批流程", module: "workflow", category: "crud" },
  { key: "workflow.delete", label: "删除审批流程", module: "workflow", category: "crud" },
  { key: "workflow.approve", label: "审批流程配置", module: "workflow", category: "approval" },
  { key: "settings.manage", label: "平台品牌与Logo设置", module: "settings", category: "manage" },
  { key: "user.manage", label: "用户管理", module: "settings", category: "manage" },
  { key: "team.manage", label: "团队管理", module: "settings", category: "manage" },
  { key: "plugin.manage", label: "图标/Logo插件库", module: "settings", category: "manage" },
  { key: "knowledge-category.manage", label: "知识库目录管理", module: "settings", category: "manage" },
  { key: "menu-permission.manage", label: "菜单权限页", module: "settings", category: "manage" },
  { key: "action-permission.manage", label: "操作权限页", module: "settings", category: "manage" },
];

const ROLE_PERMISSION_PROFILES: Record<UserRole, PermissionProfile> = {
  admin: {
    role: "admin",
    roleLabel: "管理员",
    permissions: [
      "menu.workbench",
      "menu.projects",
      "menu.opportunities",
      "menu.solutions",
      "menu.bids",
      "menu.contracts",
      "menu.knowledge",
      "menu.analytics",
      "menu.settings",
      "menu.team-management",
      "menu.workflow",
      "menu.branding-settings",
      "menu.plugin-library",
      "menu.knowledge-category-management",
      "menu.permission-management",
      "menu.action-permission-management",
      "menu.help",
      "workbench.view",
      "project.view",
      "project.create",
      "project.edit",
      "project.delete",
      "project.download",
      "project.approve",
      "project.manage",
      "opportunity.view",
      "opportunity.edit",
      "opportunity.delete",
      "opportunity.download",
      "opportunity.approve",
      "opportunity.create",
      "user.manage",
      "team.manage",
      "plugin.manage",
      "knowledge-category.manage",
      "workflow.view",
      "workflow.create",
      "workflow.edit",
      "workflow.delete",
      "workflow.approve",
      "workflow.manage",
      "settings.manage",
      "menu-permission.manage",
      "action-permission.manage",
      "knowledge.view",
      "knowledge.create",
      "knowledge.edit",
      "knowledge.delete",
      "knowledge.download",
      "analytics.manage",
      "analytics.view",
      "opportunity.manage",
      "solution.view",
      "solution.create",
      "solution.edit",
      "solution.delete",
      "solution.download",
      "solution.approve",
      "bidding.view",
      "bidding.create",
      "bidding.edit",
      "bidding.delete",
      "bidding.download",
      "contract.manage",
      "contract.view",
      "contract.create",
      "contract.edit",
      "contract.delete",
      "contract.download",
      "bidding.manage",
    ],
    permissionSummary: "全部权限",
  },
  manager: {
    role: "manager",
    roleLabel: "经理",
    permissions: [
      "menu.workbench",
      "menu.projects",
      "menu.opportunities",
      "menu.solutions",
      "menu.bids",
      "menu.contracts",
      "menu.knowledge",
      "menu.analytics",
      "menu.settings",
      "menu.team-management",
      "menu.workflow",
      "menu.knowledge-category-management",
      "menu.help",
      "workbench.view",
      "project.view",
      "project.create",
      "project.edit",
      "project.download",
      "project.approve",
      "project.manage",
      "opportunity.view",
      "opportunity.create",
      "opportunity.edit",
      "opportunity.download",
      "opportunity.approve",
      "team.manage",
      "user.manage",
      "plugin.manage",
      "knowledge-category.manage",
      "opportunity.manage",
      "solution.view",
      "solution.create",
      "solution.edit",
      "solution.download",
      "solution.approve",
      "bidding.view",
      "bidding.create",
      "bidding.edit",
      "bidding.download",
      "bidding.manage",
      "contract.view",
      "contract.create",
      "contract.edit",
      "contract.download",
      "contract.manage",
      "knowledge.view",
      "knowledge.create",
      "knowledge.edit",
      "knowledge.download",
      "analytics.view",
      "analytics.edit",
      "workflow.view",
      "workflow.create",
      "workflow.edit",
      "workflow.approve",
      "workflow.manage",
    ],
    permissionSummary: "团队管理、审批流程库、知识库目录管理，以及项目/商机/方案/投标/合同管理、知识库编辑、数据分析查看与编辑",
  },
  pre_sales_engineer: {
    role: "pre_sales_engineer",
    roleLabel: "工程师",
    permissions: [
      "menu.workbench",
      "menu.projects",
      "menu.opportunities",
      "menu.solutions",
      "menu.bids",
      "menu.contracts",
      "menu.knowledge",
      "menu.analytics",
      "menu.settings",
      "menu.help",
      "workbench.view",
      "project.view",
      "opportunity.view",
      "solution.view",
      "solution.download",
      "solution.edit",
      "solution.approve",
      "bidding.view",
      "contract.view",
      "knowledge.view",
      "knowledge.download",
      "knowledge.edit",
      "analytics.view",
      "analytics.edit",
    ],
    permissionSummary: "工作台、项目、商机、投标、合同查看；解决方案审批与编辑；知识库、数据分析编辑；仅可访问基础个人设置",
  },
  sales: {
    role: "sales",
    roleLabel: "销售",
    permissions: [
      "menu.workbench",
      "menu.projects",
      "menu.opportunities",
      "menu.solutions",
      "menu.knowledge",
      "menu.settings",
      "menu.help",
      "workbench.view",
      "project.view",
      "opportunity.create",
      "opportunity.view",
      "solution.view",
      "solution.download",
      "knowledge.view",
      "knowledge.download",
    ],
    permissionSummary: "商机创建、商机查看、项目查看、解决方案查看、知识库查看；仅可访问基础个人设置",
  },
  guest: {
    role: "guest",
    roleLabel: "访客",
    permissions: [
      "menu.workbench",
      "menu.projects",
      "menu.knowledge",
      "menu.settings",
      "menu.help",
      "workbench.view",
      "project.view",
      "knowledge.view",
      "knowledge.download",
      "view.readonly",
    ],
    permissionSummary: "工作台、项目、知识库只读查看；仅可访问基础个人设置",
  },
};

export function getPermissionProfile(role: UserRole): PermissionProfile {
  return ROLE_PERMISSION_PROFILES[role];
}

export function getRoleMenuKeys(role: UserRole): string[] {
  return getPermissionProfile(role).permissions.filter((item) =>
    item.startsWith("menu."),
  );
}

export function getRoleActionKeys(role: UserRole): string[] {
  const validActionKeys = new Set(
    ACTION_PERMISSION_DEFINITIONS.map((item) => item.key),
  );
  return getPermissionProfile(role).permissions.filter((item) =>
    validActionKeys.has(item),
  );
}

export function getEffectiveMenuKeys(
  role: UserRole,
  allowedMenuKeys: string[] = [],
  deniedMenuKeys: string[] = [],
): string[] {
  const validMenuKeys = new Set(MENU_PERMISSION_DEFINITIONS.map((item) => item.key));
  const base = new Set(getRoleMenuKeys(role).filter((item) => validMenuKeys.has(item)));
  for (const key of allowedMenuKeys) {
    if (validMenuKeys.has(key)) {
      base.add(key);
    }
  }
  for (const key of deniedMenuKeys) {
    base.delete(key);
  }
  return Array.from(base);
}

export function getEffectiveActionKeys(
  role: UserRole,
  allowedActionKeys: string[] = [],
  deniedActionKeys: string[] = [],
): string[] {
  const validActionKeys = new Set(
    ACTION_PERMISSION_DEFINITIONS.map((item) => item.key),
  );
  const base = new Set(
    getRoleActionKeys(role).filter((item) => validActionKeys.has(item)),
  );
  for (const key of allowedActionKeys) {
    if (validActionKeys.has(key)) {
      base.add(key);
    }
  }
  for (const key of deniedActionKeys) {
    base.delete(key);
  }
  return Array.from(base);
}

export function isUserRole(value: string): value is UserRole {
  return USER_ROLE_VALUES.includes(value as UserRole);
}
