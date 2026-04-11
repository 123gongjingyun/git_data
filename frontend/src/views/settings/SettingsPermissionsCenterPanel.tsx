import { Card, Tabs, message } from "antd";
import { Suspense, lazy, useEffect, useMemo, useState, type CSSProperties } from "react";
import { buildApiUrl } from "../../shared/api";

const LazyMenuPermissionsPanel = lazy(async () => {
  const module = await import("./MenuPermissionsPanel");
  return { default: module.MenuPermissionsPanel };
});

const LazyActionPermissionsPanel = lazy(async () => {
  const module = await import("./ActionPermissionsPanel");
  return { default: module.ActionPermissionsPanel };
});

interface PermissionMemberLike {
  key: string;
  username: string;
  name: string;
  role: string;
  permissions: string;
  menuOverrideCount?: number;
  actionOverrideCount?: number;
}

interface ApiTeamMember {
  id: number;
  username: string;
  displayName?: string;
  roleMenuKeys: string[];
  allowedMenuKeys: string[];
  deniedMenuKeys: string[];
  roleActionKeys: string[];
  allowedActionKeys: string[];
  deniedActionKeys: string[];
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

interface SettingsPermissionsCenterPanelProps {
  canManageActionPermissions: boolean;
  canManageMenuPermissions: boolean;
  filteredMembers: PermissionMemberLike[];
  getAvatarColor: (role: string) => string;
  getRoleTagColor: (role: string) => string;
  initialTab?: "menu" | "action";
  onRefreshMembers: () => void | Promise<void>;
  permissionPanelStyle: CSSProperties;
  permissionWorkbenchCardStyle: CSSProperties;
}

const USER_API_BASE_URL = buildApiUrl("");

function isNumericUserId(value?: string | null): value is string {
  return Boolean(value && /^\d+$/.test(value));
}

function getAuthHeaders(withJson = true) {
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
}

function hasSetDifference(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return true;
  }
  const rightSet = new Set(right);
  return left.some((item) => !rightSet.has(item));
}

function hasOrderedDifference(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return true;
  }
  return left.some((item, index) => item !== right[index]);
}

export function SettingsPermissionsCenterPanel(
  props: SettingsPermissionsCenterPanelProps,
) {
  const {
    canManageActionPermissions,
    canManageMenuPermissions,
    filteredMembers,
    getAvatarColor,
    getRoleTagColor,
    initialTab = "menu",
    onRefreshMembers,
    permissionPanelStyle,
    permissionWorkbenchCardStyle,
  } = props;

  const [permissionCenterTab, setPermissionCenterTab] = useState<"menu" | "action">(
    initialTab,
  );
  const [menuPermissionDefinitions, setMenuPermissionDefinitions] = useState<
    MenuPermissionDefinition[]
  >([]);
  const [selectedPermissionUserId, setSelectedPermissionUserId] = useState<
    string | null
  >(null);
  const [menuPermissionsLoading, setMenuPermissionsLoading] = useState(false);
  const [menuPermissionsSaving, setMenuPermissionsSaving] = useState(false);
  const [selectedPermissionUser, setSelectedPermissionUser] =
    useState<ApiTeamMember | null>(null);
  const [roleMenuKeys, setRoleMenuKeys] = useState<string[]>([]);
  const [allowedMenuKeysDraft, setAllowedMenuKeysDraft] = useState<string[]>([]);
  const [deniedMenuKeysDraft, setDeniedMenuKeysDraft] = useState<string[]>([]);
  const [menuPermissionSearch, setMenuPermissionSearch] = useState("");
  const [menuPermissionViewMode, setMenuPermissionViewMode] = useState<
    "all" | "overridden" | "effective" | "inactive" | "draft"
  >("all");
  const [expandedMenuModules, setExpandedMenuModules] = useState<string[]>([]);
  const [actionPermissionDefinitions, setActionPermissionDefinitions] = useState<
    ActionPermissionDefinition[]
  >([]);
  const [selectedActionPermissionUserId, setSelectedActionPermissionUserId] =
    useState<string | null>(null);
  const [actionPermissionsLoading, setActionPermissionsLoading] =
    useState(false);
  const [actionPermissionsSaving, setActionPermissionsSaving] =
    useState(false);
  const [selectedActionPermissionUser, setSelectedActionPermissionUser] =
    useState<ApiTeamMember | null>(null);
  const [roleActionKeys, setRoleActionKeys] = useState<string[]>([]);
  const [allowedActionKeysDraft, setAllowedActionKeysDraft] = useState<
    string[]
  >([]);
  const [deniedActionKeysDraft, setDeniedActionKeysDraft] = useState<string[]>(
    [],
  );
  const [actionPermissionSearch, setActionPermissionSearch] = useState("");
  const [actionPermissionViewMode, setActionPermissionViewMode] = useState<
    "all" | "overridden" | "effective" | "inactive" | "draft"
  >("all");
  const [expandedActionModules, setExpandedActionModules] = useState<string[]>([]);

  useEffect(() => {
    setPermissionCenterTab(initialTab);
  }, [initialTab]);

  const permissionConfigurableMembers = useMemo(
    () => filteredMembers.filter((member) => isNumericUserId(member.key)),
    [filteredMembers],
  );

  const effectiveMenuKeysPreview = useMemo(
    () =>
      menuPermissionDefinitions
        .map((item) => item.key)
        .filter((item) => {
          if (deniedMenuKeysDraft.includes(item)) {
            return false;
          }
          return (
            roleMenuKeys.includes(item) || allowedMenuKeysDraft.includes(item)
          );
        }),
    [menuPermissionDefinitions, deniedMenuKeysDraft, roleMenuKeys, allowedMenuKeysDraft],
  );

  const effectiveActionKeysPreview = useMemo(
    () =>
      actionPermissionDefinitions
        .map((item) => item.key)
        .filter((item) => {
          if (deniedActionKeysDraft.includes(item)) {
            return false;
          }
          return (
            roleActionKeys.includes(item) || allowedActionKeysDraft.includes(item)
          );
        }),
    [
      actionPermissionDefinitions,
      deniedActionKeysDraft,
      roleActionKeys,
      allowedActionKeysDraft,
    ],
  );

  const permissionModuleLabelMap: Record<PermissionModuleKey, string> = {
    workbench: "工作台",
    project: "项目管理",
    opportunity: "商机管理",
    solution: "解决方案",
    bidding: "投标管理",
    contract: "合同管理",
    knowledge: "知识库",
    analytics: "数据分析",
    workflow: "审批流程库",
    settings: "系统设置",
    help: "帮助与支持",
  };

  const actionModuleLabelMap: Record<ActionPermissionDefinition["module"], string> =
    {
      workbench: permissionModuleLabelMap.workbench,
      project: permissionModuleLabelMap.project,
      opportunity: permissionModuleLabelMap.opportunity,
      solution: permissionModuleLabelMap.solution,
      bidding: permissionModuleLabelMap.bidding,
      contract: permissionModuleLabelMap.contract,
      knowledge: permissionModuleLabelMap.knowledge,
      workflow: permissionModuleLabelMap.workflow,
      settings: permissionModuleLabelMap.settings,
    };

  const actionPermissionItemLabelMap: Partial<Record<string, string>> = {
    "settings.manage": "平台品牌与Logo设置",
    "user.manage": "用户管理",
    "team.manage": "团队管理",
    "plugin.manage": "图标/Logo插件库",
    "knowledge-category.manage": "知识库目录管理",
    "menu-permission.manage": "菜单权限页",
    "action-permission.manage": "操作权限页",
  };

  const menuModuleOrder: PermissionModuleKey[] = [
    "workbench",
    "project",
    "opportunity",
    "solution",
    "bidding",
    "contract",
    "knowledge",
    "analytics",
    "workflow",
    "settings",
    "help",
  ];

  const actionModuleOrder: ActionPermissionDefinition["module"][] = [
    "workbench",
    "project",
    "opportunity",
    "solution",
    "bidding",
    "contract",
    "knowledge",
    "workflow",
    "settings",
  ];

  const resolveMenuModuleKey = (menuKey: string): PermissionModuleKey => {
    if (menuKey === "menu.projects") return "project";
    if (menuKey === "menu.opportunities") return "opportunity";
    if (menuKey === "menu.solutions") return "solution";
    if (menuKey === "menu.bids") return "bidding";
    if (menuKey === "menu.contracts") return "contract";
    if (menuKey === "menu.knowledge") return "knowledge";
    if (menuKey === "menu.analytics") return "analytics";
    if (
      menuKey === "menu.team-management" ||
      menuKey === "menu.workflow" ||
      menuKey === "menu.branding-settings" ||
      menuKey === "menu.plugin-library" ||
      menuKey === "menu.knowledge-category-management" ||
      menuKey === "menu.permission-management" ||
      menuKey === "menu.action-permission-management" ||
      menuKey === "menu.settings"
    ) {
      return menuKey === "menu.workflow" ? "workflow" : "settings";
    }
    if (menuKey === "menu.help") return "help";
    return "workbench";
  };

  const groupedMenuDefinitionsByModule = useMemo(
    () =>
      menuModuleOrder
        .map((moduleKey) => ({
          moduleKey,
          items: menuPermissionDefinitions.filter(
            (item) => resolveMenuModuleKey(item.key) === moduleKey,
          ),
        }))
        .filter((item) => item.items.length > 0),
    [menuPermissionDefinitions],
  );

  const groupedActionDefinitionsByModule = useMemo(
    () =>
      actionModuleOrder
        .map((moduleKey) => ({
          moduleKey,
          items: actionPermissionDefinitions.filter(
            (item) => item.module === moduleKey,
          ),
        }))
        .filter((item) => item.items.length > 0),
    [actionPermissionDefinitions],
  );

  const menuPermissionsDirty =
    hasSetDifference(allowedMenuKeysDraft, selectedPermissionUser?.allowedMenuKeys || []) ||
    hasSetDifference(deniedMenuKeysDraft, selectedPermissionUser?.deniedMenuKeys || []);

  const actionPermissionsDirty =
    hasSetDifference(
      allowedActionKeysDraft,
      selectedActionPermissionUser?.allowedActionKeys || [],
    ) ||
    hasSetDifference(
      deniedActionKeysDraft,
      selectedActionPermissionUser?.deniedActionKeys || [],
    );

  const menuPermissionDraftChangedKeys = new Set([
    ...allowedMenuKeysDraft.filter(
      (item) => !(selectedPermissionUser?.allowedMenuKeys || []).includes(item),
    ),
    ...(selectedPermissionUser?.allowedMenuKeys || []).filter(
      (item) => !allowedMenuKeysDraft.includes(item),
    ),
    ...deniedMenuKeysDraft.filter(
      (item) => !(selectedPermissionUser?.deniedMenuKeys || []).includes(item),
    ),
    ...(selectedPermissionUser?.deniedMenuKeys || []).filter(
      (item) => !deniedMenuKeysDraft.includes(item),
    ),
  ]);

  const actionPermissionDraftChangedKeys = new Set([
    ...allowedActionKeysDraft.filter(
      (item) => !(selectedActionPermissionUser?.allowedActionKeys || []).includes(item),
    ),
    ...(selectedActionPermissionUser?.allowedActionKeys || []).filter(
      (item) => !allowedActionKeysDraft.includes(item),
    ),
    ...deniedActionKeysDraft.filter(
      (item) => !(selectedActionPermissionUser?.deniedActionKeys || []).includes(item),
    ),
    ...(selectedActionPermissionUser?.deniedActionKeys || []).filter(
      (item) => !deniedActionKeysDraft.includes(item),
    ),
  ]);

  const matchesPermissionFilter = (
    label: string,
    key: string,
    isOverridden: boolean,
    isEffective: boolean,
    isDraftChanged: boolean,
    search: string,
    mode: "all" | "overridden" | "effective" | "inactive" | "draft",
  ) => {
    const query = search.trim().toLowerCase();
    const text = `${label} ${key}`.toLowerCase();
    if (query && !text.includes(query)) {
      return false;
    }
    if (mode === "overridden" && !isOverridden) {
      return false;
    }
    if (mode === "effective" && !isEffective) {
      return false;
    }
    if (mode === "inactive" && isEffective) {
      return false;
    }
    if (mode === "draft" && !isDraftChanged) {
      return false;
    }
    return true;
  };

  useEffect(() => {
    const nextExpanded = groupedMenuDefinitionsByModule
      .filter(({ items }) =>
        items.some((item) => {
          const allowed = allowedMenuKeysDraft.includes(item.key);
          const denied = deniedMenuKeysDraft.includes(item.key);
          return allowed || denied;
        }),
      )
      .map((item) => item.moduleKey);
    const fallbackExpanded = groupedMenuDefinitionsByModule.map(
      (item) => item.moduleKey,
    );
    const targetExpanded =
      nextExpanded.length > 0 ? nextExpanded : fallbackExpanded;
    setExpandedMenuModules((prev) =>
      hasOrderedDifference(prev, targetExpanded) ? targetExpanded : prev,
    );
  }, [
    groupedMenuDefinitionsByModule,
    allowedMenuKeysDraft,
    deniedMenuKeysDraft,
    selectedPermissionUserId,
  ]);

  useEffect(() => {
    const nextExpanded = groupedActionDefinitionsByModule
      .filter(({ items }) =>
        items.some((item) => {
          const allowed = allowedActionKeysDraft.includes(item.key);
          const denied = deniedActionKeysDraft.includes(item.key);
          return allowed || denied;
        }),
      )
      .map((item) => item.moduleKey);
    const fallbackExpanded = groupedActionDefinitionsByModule.map(
      (item) => item.moduleKey,
    );
    const targetExpanded =
      nextExpanded.length > 0 ? nextExpanded : fallbackExpanded;
    setExpandedActionModules((prev) =>
      hasOrderedDifference(prev, targetExpanded) ? targetExpanded : prev,
    );
  }, [
    groupedActionDefinitionsByModule,
    allowedActionKeysDraft,
    deniedActionKeysDraft,
    selectedActionPermissionUserId,
  ]);

  const loadMenuPermissionDefinitions = async () => {
    try {
      const resp = await fetch(`${USER_API_BASE_URL}/users/permission-menus`, {
        headers: getAuthHeaders(false),
      });
      if (!resp.ok) {
        message.warning(`菜单权限项加载失败：${resp.status}`);
        return;
      }
      const data = (await resp.json()) as MenuPermissionDefinition[];
      setMenuPermissionDefinitions(Array.isArray(data) ? data : []);
    } catch {
      message.warning("未检测到可用的菜单权限接口。");
    }
  };

  const loadUserMenuPermissions = async (userId: string) => {
    if (!isNumericUserId(userId)) {
      return;
    }
    setMenuPermissionsLoading(true);
    try {
      const resp = await fetch(
        `${USER_API_BASE_URL}/users/${userId}/menu-permissions`,
        {
          headers: getAuthHeaders(false),
        },
      );
      if (!resp.ok) {
        message.warning(`用户菜单权限加载失败：${resp.status}`);
        return;
      }
      const data = (await resp.json()) as UserMenuPermissionResponse;
      setSelectedPermissionUser(data.user);
      setRoleMenuKeys(data.roleMenuKeys || []);
      setAllowedMenuKeysDraft(data.allowedMenuKeys || []);
      setDeniedMenuKeysDraft(data.deniedMenuKeys || []);
      if ((data.definitions || []).length > 0) {
        setMenuPermissionDefinitions(data.definitions);
      }
    } catch {
      message.warning("未能加载用户菜单权限详情。");
    } finally {
      setMenuPermissionsLoading(false);
    }
  };

  const loadActionPermissionDefinitions = async () => {
    try {
      const resp = await fetch(
        `${USER_API_BASE_URL}/users/permission-actions`,
        {
          headers: getAuthHeaders(false),
        },
      );
      if (!resp.ok) {
        message.warning(`操作权限项加载失败：${resp.status}`);
        return;
      }
      const data = (await resp.json()) as ActionPermissionDefinition[];
      setActionPermissionDefinitions(Array.isArray(data) ? data : []);
    } catch {
      message.warning("未检测到可用的操作权限接口。");
    }
  };

  const loadUserActionPermissions = async (userId: string) => {
    if (!isNumericUserId(userId)) {
      return;
    }
    setActionPermissionsLoading(true);
    try {
      const resp = await fetch(
        `${USER_API_BASE_URL}/users/${userId}/action-permissions`,
        {
          headers: getAuthHeaders(false),
        },
      );
      if (!resp.ok) {
        message.warning(`用户操作权限加载失败：${resp.status}`);
        return;
      }
      const data = (await resp.json()) as UserActionPermissionResponse;
      setSelectedActionPermissionUser(data.user);
      setRoleActionKeys(data.roleActionKeys || []);
      setAllowedActionKeysDraft(data.allowedActionKeys || []);
      setDeniedActionKeysDraft(data.deniedActionKeys || []);
      if ((data.definitions || []).length > 0) {
        setActionPermissionDefinitions(data.definitions);
      }
    } catch {
      message.warning("未能加载用户操作权限详情。");
    } finally {
      setActionPermissionsLoading(false);
    }
  };

  useEffect(() => {
    if (permissionCenterTab !== "menu" || !canManageMenuPermissions) {
      return;
    }
    void loadMenuPermissionDefinitions();
  }, [permissionCenterTab, canManageMenuPermissions]);

  useEffect(() => {
    if (
      permissionCenterTab !== "menu" ||
      !canManageMenuPermissions
    ) {
      return;
    }
    if (permissionConfigurableMembers.length === 0) {
      if (selectedPermissionUserId !== null) {
        setSelectedPermissionUserId(null);
      }
      setSelectedPermissionUser(null);
      setRoleMenuKeys([]);
      setAllowedMenuKeysDraft([]);
      setDeniedMenuKeysDraft([]);
      return;
    }
    if (
      selectedPermissionUserId &&
      permissionConfigurableMembers.some(
        (member) => member.key === selectedPermissionUserId,
      )
    ) {
      return;
    }
    setSelectedPermissionUserId(permissionConfigurableMembers[0]?.key ?? null);
  }, [
    permissionCenterTab,
    canManageMenuPermissions,
    permissionConfigurableMembers,
    selectedPermissionUserId,
  ]);

  useEffect(() => {
    if (
      permissionCenterTab !== "menu" ||
      !canManageMenuPermissions ||
      !isNumericUserId(selectedPermissionUserId)
    ) {
      return;
    }
    void loadUserMenuPermissions(selectedPermissionUserId);
  }, [permissionCenterTab, canManageMenuPermissions, selectedPermissionUserId]);

  useEffect(() => {
    if (permissionCenterTab !== "action" || !canManageActionPermissions) {
      return;
    }
    void loadActionPermissionDefinitions();
  }, [permissionCenterTab, canManageActionPermissions]);

  useEffect(() => {
    if (
      permissionCenterTab !== "action" ||
      !canManageActionPermissions
    ) {
      return;
    }
    if (permissionConfigurableMembers.length === 0) {
      if (selectedActionPermissionUserId !== null) {
        setSelectedActionPermissionUserId(null);
      }
      setSelectedActionPermissionUser(null);
      setRoleActionKeys([]);
      setAllowedActionKeysDraft([]);
      setDeniedActionKeysDraft([]);
      return;
    }
    if (
      selectedActionPermissionUserId &&
      permissionConfigurableMembers.some(
        (member) => member.key === selectedActionPermissionUserId,
      )
    ) {
      return;
    }
    setSelectedActionPermissionUserId(permissionConfigurableMembers[0]?.key ?? null);
  }, [
    permissionCenterTab,
    canManageActionPermissions,
    permissionConfigurableMembers,
    selectedActionPermissionUserId,
  ]);

  useEffect(() => {
    if (
      permissionCenterTab !== "action" ||
      !canManageActionPermissions ||
      !isNumericUserId(selectedActionPermissionUserId)
    ) {
      return;
    }
    void loadUserActionPermissions(selectedActionPermissionUserId);
  }, [
    permissionCenterTab,
    canManageActionPermissions,
    selectedActionPermissionUserId,
  ]);

  const handleToggleAllowedMenuKey = (menuKey: string, checked: boolean) => {
    setAllowedMenuKeysDraft((prev) =>
      checked ? Array.from(new Set([...prev, menuKey])) : prev.filter((item) => item !== menuKey),
    );
    if (checked) {
      setDeniedMenuKeysDraft((prev) => prev.filter((item) => item !== menuKey));
    }
  };

  const handleToggleDeniedMenuKey = (menuKey: string, checked: boolean) => {
    setDeniedMenuKeysDraft((prev) =>
      checked ? Array.from(new Set([...prev, menuKey])) : prev.filter((item) => item !== menuKey),
    );
    if (checked) {
      setAllowedMenuKeysDraft((prev) => prev.filter((item) => item !== menuKey));
    }
  };

  const handleSelectAllMenuOverrides = () => {
    const allKeys = menuPermissionDefinitions.map((item) => item.key);
    setAllowedMenuKeysDraft(allKeys);
    setDeniedMenuKeysDraft([]);
  };

  const handleClearMenuOverrides = () => {
    setAllowedMenuKeysDraft([]);
    setDeniedMenuKeysDraft([]);
  };

  const handleSaveMenuPermissions = async () => {
    if (!isNumericUserId(selectedPermissionUserId)) {
      message.warning("请先选择要配置的成员。");
      return;
    }
    setMenuPermissionsSaving(true);
    try {
      const resp = await fetch(
        `${USER_API_BASE_URL}/users/${selectedPermissionUserId}/menu-permissions`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            allowedMenuKeys: allowedMenuKeysDraft,
            deniedMenuKeys: deniedMenuKeysDraft,
          }),
        },
      );
      if (!resp.ok) {
        message.error(`保存菜单权限失败：${resp.status}`);
        return;
      }
      message.success("已保存菜单权限覆盖。");
      await loadUserMenuPermissions(selectedPermissionUserId);
      await Promise.resolve(onRefreshMembers());
    } catch {
      message.error("保存菜单权限失败，请检查后端接口。");
    } finally {
      setMenuPermissionsSaving(false);
    }
  };

  const handleResetMenuPermissions = async () => {
    if (!isNumericUserId(selectedPermissionUserId)) {
      message.warning("请先选择要恢复的成员。");
      return;
    }
    setMenuPermissionsSaving(true);
    try {
      const resp = await fetch(
        `${USER_API_BASE_URL}/users/${selectedPermissionUserId}/menu-permissions/reset`,
        {
          method: "POST",
          headers: getAuthHeaders(false),
        },
      );
      if (!resp.ok) {
        message.error(`恢复角色默认菜单失败：${resp.status}`);
        return;
      }
      message.success("已恢复为角色默认菜单。");
      await loadUserMenuPermissions(selectedPermissionUserId);
    } catch {
      message.error("恢复默认菜单失败，请检查后端接口。");
    } finally {
      setMenuPermissionsSaving(false);
    }
  };

  const handleToggleAllowedActionKey = (actionKey: string, checked: boolean) => {
    setAllowedActionKeysDraft((prev) =>
      checked
        ? Array.from(new Set([...prev, actionKey]))
        : prev.filter((item) => item !== actionKey),
    );
    if (checked) {
      setDeniedActionKeysDraft((prev) =>
        prev.filter((item) => item !== actionKey),
      );
    }
  };

  const handleToggleDeniedActionKey = (actionKey: string, checked: boolean) => {
    setDeniedActionKeysDraft((prev) =>
      checked
        ? Array.from(new Set([...prev, actionKey]))
        : prev.filter((item) => item !== actionKey),
    );
    if (checked) {
      setAllowedActionKeysDraft((prev) =>
        prev.filter((item) => item !== actionKey),
      );
    }
  };

  const handleSelectAllActionOverrides = () => {
    const allKeys = actionPermissionDefinitions.map((item) => item.key);
    setAllowedActionKeysDraft(allKeys);
    setDeniedActionKeysDraft([]);
  };

  const handleClearActionOverrides = () => {
    setAllowedActionKeysDraft([]);
    setDeniedActionKeysDraft([]);
  };

  const handleSaveActionPermissions = async () => {
    if (!isNumericUserId(selectedActionPermissionUserId)) {
      message.warning("请先选择要配置的成员。");
      return;
    }
    setActionPermissionsSaving(true);
    try {
      const resp = await fetch(
        `${USER_API_BASE_URL}/users/${selectedActionPermissionUserId}/action-permissions`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            allowedActionKeys: allowedActionKeysDraft,
            deniedActionKeys: deniedActionKeysDraft,
          }),
        },
      );
      if (!resp.ok) {
        message.error(`保存操作权限失败：${resp.status}`);
        return;
      }
      message.success("已保存操作权限覆盖。");
      await loadUserActionPermissions(selectedActionPermissionUserId);
    } catch {
      message.error("保存操作权限失败，请检查后端接口。");
    } finally {
      setActionPermissionsSaving(false);
    }
  };

  const handleResetActionPermissions = async () => {
    if (!isNumericUserId(selectedActionPermissionUserId)) {
      message.warning("请先选择要恢复的成员。");
      return;
    }
    setActionPermissionsSaving(true);
    try {
      const resp = await fetch(
        `${USER_API_BASE_URL}/users/${selectedActionPermissionUserId}/action-permissions/reset`,
        {
          method: "POST",
          headers: getAuthHeaders(false),
        },
      );
      if (!resp.ok) {
        message.error(`恢复角色默认操作权限失败：${resp.status}`);
        return;
      }
      message.success("已恢复为角色默认操作权限。");
      await loadUserActionPermissions(selectedActionPermissionUserId);
    } catch {
      message.error("恢复默认操作权限失败，请检查后端接口。");
    } finally {
      setActionPermissionsSaving(false);
    }
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
    } satisfies CSSProperties);

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
    } satisfies CSSProperties);

  const renderPermissionStateTag = (enabled: boolean, allowText: string, denyText: string) => (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        color: enabled ? "#135200" : "#595959",
        background: enabled ? "rgba(82,196,26,0.18)" : "rgba(0,0,0,0.06)",
      }}
    >
      {enabled ? allowText : denyText}
    </span>
  );

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

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Card
          style={permissionWorkbenchCardStyle}
          bodyStyle={{ padding: 12 }}
        >
          <Tabs
            activeKey={permissionCenterTab}
            onChange={(key) =>
              setPermissionCenterTab(key as "menu" | "action")
            }
            items={[
              {
                key: "menu",
                label: "菜单权限",
                disabled: !canManageMenuPermissions,
              },
              {
                key: "action",
                label: "操作权限",
                disabled: !canManageActionPermissions,
              },
            ]}
          />
        </Card>
      </div>

      {permissionCenterTab === "menu" && (
        <Suspense fallback={null}>
          <LazyMenuPermissionsPanel
            permissionPanelStyle={permissionPanelStyle}
            permissionWorkbenchCardStyle={permissionWorkbenchCardStyle}
            canManageMenuPermissions={canManageMenuPermissions}
            menuPermissionsDirty={menuPermissionsDirty}
            selectedPermissionUser={selectedPermissionUser}
            roleMenuKeys={roleMenuKeys}
            allowedMenuKeysDraft={allowedMenuKeysDraft}
            deniedMenuKeysDraft={deniedMenuKeysDraft}
            effectiveMenuKeysPreview={effectiveMenuKeysPreview}
            selectedPermissionUserId={selectedPermissionUserId}
            permissionConfigurableMembers={permissionConfigurableMembers}
            filteredMembersLength={filteredMembers.length}
            getAvatarColor={getAvatarColor}
            getRoleTagColor={getRoleTagColor}
            onRefreshMembers={() => void onRefreshMembers()}
            onRefreshDefinitions={() => void loadMenuPermissionDefinitions()}
            onSelectAllMenuOverrides={handleSelectAllMenuOverrides}
            onClearMenuOverrides={handleClearMenuOverrides}
            onResetMenuPermissions={handleResetMenuPermissions}
            onSaveMenuPermissions={() => void handleSaveMenuPermissions()}
            menuPermissionsSaving={menuPermissionsSaving}
            onSelectPermissionUser={setSelectedPermissionUserId}
            menuPermissionsLoading={menuPermissionsLoading}
            menuPermissionSearch={menuPermissionSearch}
            onMenuPermissionSearchChange={setMenuPermissionSearch}
            menuPermissionViewMode={menuPermissionViewMode}
            onMenuPermissionViewModeChange={setMenuPermissionViewMode}
            expandedMenuModules={expandedMenuModules}
            onExpandedMenuModulesChange={setExpandedMenuModules}
            groupedMenuDefinitionsByModule={groupedMenuDefinitionsByModule}
            permissionModuleLabelMap={permissionModuleLabelMap}
            menuPermissionDraftChangedKeys={menuPermissionDraftChangedKeys}
            matchesPermissionFilter={matchesPermissionFilter}
            onAllowAllMenusForModule={handleAllowAllMenusForModule}
            onClearMenuOverridesForModule={handleClearMenuOverridesForModule}
            menuPermissionMatrixHeader={menuPermissionMatrixHeader}
            createMenuPermissionRowStyle={createMenuPermissionRowStyle}
            renderPermissionStateTag={renderPermissionStateTag}
            onToggleAllowedMenuKey={handleToggleAllowedMenuKey}
            onToggleDeniedMenuKey={handleToggleDeniedMenuKey}
            isNumericUserId={isNumericUserId}
          />
        </Suspense>
      )}

      {permissionCenterTab === "action" && (
        <Suspense fallback={null}>
          <LazyActionPermissionsPanel
            permissionPanelStyle={permissionPanelStyle}
            permissionWorkbenchCardStyle={permissionWorkbenchCardStyle}
            canManageActionPermissions={canManageActionPermissions}
            actionPermissionsDirty={actionPermissionsDirty}
            selectedActionPermissionUser={selectedActionPermissionUser}
            roleActionKeys={roleActionKeys}
            allowedActionKeysDraft={allowedActionKeysDraft}
            deniedActionKeysDraft={deniedActionKeysDraft}
            effectiveActionKeysPreview={effectiveActionKeysPreview}
            selectedActionPermissionUserId={selectedActionPermissionUserId}
            permissionConfigurableMembers={permissionConfigurableMembers}
            filteredMembersLength={filteredMembers.length}
            getAvatarColor={getAvatarColor}
            getRoleTagColor={getRoleTagColor}
            onRefreshMembers={() => void onRefreshMembers()}
            onRefreshDefinitions={() => void loadActionPermissionDefinitions()}
            onSelectAllActionOverrides={handleSelectAllActionOverrides}
            onClearActionOverrides={handleClearActionOverrides}
            onResetActionPermissions={handleResetActionPermissions}
            onSaveActionPermissions={() => void handleSaveActionPermissions()}
            actionPermissionsSaving={actionPermissionsSaving}
            onSelectActionPermissionUser={setSelectedActionPermissionUserId}
            actionPermissionsLoading={actionPermissionsLoading}
            actionPermissionSearch={actionPermissionSearch}
            onActionPermissionSearchChange={setActionPermissionSearch}
            actionPermissionViewMode={actionPermissionViewMode}
            onActionPermissionViewModeChange={setActionPermissionViewMode}
            expandedActionModules={expandedActionModules}
            onExpandedActionModulesChange={setExpandedActionModules}
            groupedActionDefinitionsByModule={groupedActionDefinitionsByModule}
            actionModuleLabelMap={actionModuleLabelMap}
            actionPermissionItemLabelMap={actionPermissionItemLabelMap}
            actionPermissionDraftChangedKeys={actionPermissionDraftChangedKeys}
            matchesPermissionFilter={matchesPermissionFilter}
            menuPermissionDefinitions={menuPermissionDefinitions}
            resolveMenuModuleKey={resolveMenuModuleKey}
            effectiveMenuKeysPreview={effectiveMenuKeysPreview}
            onAllowAllActionsForModule={handleAllowAllActionsForModule}
            onClearActionOverridesForModule={handleClearActionOverridesForModule}
            actionPermissionMatrixHeader={actionPermissionMatrixHeader}
            createActionPermissionRowStyle={createActionPermissionRowStyle}
            renderPermissionStateTag={renderPermissionStateTag}
            onToggleAllowedActionKey={handleToggleAllowedActionKey}
            onToggleDeniedActionKey={handleToggleDeniedActionKey}
            isNumericUserId={isNumericUserId}
          />
        </Suspense>
      )}
    </>
  );
}
