import {
  Avatar,
  Button,
  Checkbox,
  Form,
  Modal,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import type { CurrentUser } from "../../shared/auth";
import { hasPermission } from "../../shared/auth";
import { buildApiUrl } from "../../shared/api";
import {
  loadSharedTeamMembers,
  saveSharedTeamMembers,
  type SharedTeamMember,
} from "../../shared/teamDirectory";
import { SettingsTeamPanel } from "./SettingsTeamPanel";

const { Text } = Typography;
const USER_API_BASE_URL = buildApiUrl("");

const LazyTeamMemberModals = lazy(async () => {
  const module = await import("./TeamMemberModals");
  return { default: module.TeamMemberModals };
});

interface TeamMember {
  key: string;
  username: string;
  name: string;
  email: string;
  role: "管理员" | "经理" | "工程师" | "访客" | "销售";
  permissions: string;
  status: "活跃" | "禁用";
  mainIndustry?: string[];
  teamRole?: string;
}

interface RolePermissionSummaryCard {
  role: TeamMember["role"];
  accent: string;
  badgeColor: string;
  highlights: string[];
}

interface ApiTeamMember {
  id: number;
  username: string;
  displayName?: string;
  email?: string;
  role: "pre_sales_engineer" | "manager" | "admin" | "sales" | "guest";
  roleLabel: "管理员" | "经理" | "工程师" | "访客" | "销售";
  permissionSummary: string;
  allowedMenuKeys: string[];
  deniedMenuKeys: string[];
  allowedActionKeys: string[];
  deniedActionKeys: string[];
  isActive: boolean;
  mainIndustry: string[];
  teamRole?: string;
}

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

interface SettingsTeamRuntimePanelProps {
  currentUser: CurrentUser | null;
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
    role: user.roleLabel,
    permissions: user.permissionSummary,
    status: user.isActive ? "活跃" : "禁用",
    mainIndustry: user.mainIndustry || [],
    teamRole: user.teamRole,
  };
}

function mapSharedTeamMemberToTeamMember(member: SharedTeamMember): TeamMember {
  return {
    key: member.username,
    username: member.username,
    name: member.name,
    email: member.email || "",
    role: member.roleLabel,
    permissions: getPermissionSummaryByRole(member.roleLabel),
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

export function SettingsTeamRuntimePanel(
  props: SettingsTeamRuntimePanelProps,
) {
  const { currentUser } = props;
  const canManageMembers =
    hasPermission(currentUser, "team.manage") ||
    hasPermission(currentUser, "user.manage");
  const canDeleteMembers = currentUser?.role === "admin";
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
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState<TeamMember["role"] | undefined>();
  const [statusFilter, setStatusFilter] = useState<
    TeamMember["status"] | undefined
  >();
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
        ? parsed.filter(
            (item): item is TeamTableColumnKey =>
              validKeys.has(item as TeamTableColumnKey),
          )
        : [];
      return Array.from(
        new Set([
          ...Array.from(TEAM_TABLE_LOCKED_COLUMNS),
          ...(nextKeys.length > 0
            ? nextKeys
            : TEAM_TABLE_DEFAULT_VISIBLE_COLUMNS),
        ]),
      );
    } catch {
      return TEAM_TABLE_DEFAULT_VISIBLE_COLUMNS;
    }
  });
  const [form] = Form.useForm();
  const selectedMemberRole = (Form.useWatch("role", form) ||
    "工程师") as TeamMember["role"];

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
    form.setFieldValue("permissions", getPermissionSummaryByRole(selectedMemberRole));
  }, [form, selectedMemberRole]);

  useEffect(() => {
    saveSharedTeamMembers(members.map(mapTeamMemberToSharedSnapshot));
  }, [members]);

  const allIndustries = Array.from(
    new Set(
      members.flatMap((member) =>
        member.mainIndustry && member.mainIndustry.length > 0
          ? member.mainIndustry
          : [],
      ),
    ),
  );

  const filteredMembers = members.filter((member) => {
    if (roleFilter && member.role !== roleFilter) {
      return false;
    }
    if (statusFilter && member.status !== statusFilter) {
      return false;
    }
    if (keyword.trim().length > 0) {
      const normalizedKeyword = keyword.trim().toLowerCase();
      const joinedIndustries = (member.mainIndustry || []).join(",").toLowerCase();
      const permissionSummary = (member.permissions || "").toLowerCase();
      const teamRole = (member.teamRole || "").toLowerCase();
      if (
        !member.name.toLowerCase().includes(normalizedKeyword) &&
        !member.email.toLowerCase().includes(normalizedKeyword) &&
        !joinedIndustries.includes(normalizedKeyword) &&
        !permissionSummary.includes(normalizedKeyword) &&
        !teamRole.includes(normalizedKeyword)
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
          headers: getAuthHeaders(false),
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
    if (!canManageMembers) {
      return;
    }
    void loadTeamMembers();
    // 当前仅在团队管理页按筛选项刷新成员列表
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageMembers, keyword, roleFilter, statusFilter]);

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
        value ? <Text>{value}</Text> : <Text type="secondary">未设置</Text>,
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
                        headers: getAuthHeaders(),
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
                      headers: getAuthHeaders(false),
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

  return (
    <>
      <SettingsTeamPanel
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
                    headers: getAuthHeaders(),
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
                  prev.map((member) =>
                    member.key === currentMember.key ? updated : member,
                  ),
                );
                message.success("已保存成员信息");
              } else {
                const resp = await fetch(`${USER_API_BASE_URL}/users`, {
                  method: "POST",
                  headers: getAuthHeaders(),
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
              // validation errors keep form open
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
    </>
  );
}
