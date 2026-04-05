export interface SharedTeamMember {
  username: string;
  name: string;
  email?: string;
  roleLabel: "管理员" | "经理" | "工程师" | "访客" | "销售";
  status: "活跃" | "禁用";
  mainIndustry?: string[];
  teamRole?: string;
}

export const SHARED_TEAM_MEMBERS_STORAGE_KEY = "sharedTeamMembersSnapshot";

const FALLBACK_TEAM_MEMBERS: SharedTeamMember[] = [
  {
    username: "admin_demo",
    name: "示例管理员",
    email: "admin_demo@example.com",
    roleLabel: "管理员",
    status: "活跃",
    teamRole: "系统管理员",
  },
  {
    username: "manager_demo",
    name: "示例经理",
    email: "manager_demo@example.com",
    roleLabel: "经理",
    status: "活跃",
    teamRole: "团队经理",
  },
  {
    username: "zhangsan_sales",
    name: "张三",
    email: "zhangsan_sales@example.com",
    roleLabel: "销售",
    status: "活跃",
    mainIndustry: ["金融行业"],
    teamRole: "金融行业负责人",
  },
  {
    username: "lisi_sales",
    name: "李四",
    email: "lisi_sales@example.com",
    roleLabel: "销售",
    status: "活跃",
    mainIndustry: ["制造行业"],
    teamRole: "制造行业销售",
  },
  {
    username: "wangwu_sales",
    name: "王五",
    email: "wangwu_sales@example.com",
    roleLabel: "销售",
    status: "活跃",
    mainIndustry: ["电商行业"],
    teamRole: "电商行业负责人",
  },
  {
    username: "zhaoliu_sales",
    name: "赵六",
    email: "zhaoliu_sales@example.com",
    roleLabel: "销售",
    status: "活跃",
    mainIndustry: ["园区行业"],
    teamRole: "园区行业负责人",
  },
  {
    username: "presales_demo",
    name: "示例售前",
    email: "presales_demo@example.com",
    roleLabel: "工程师",
    status: "活跃",
    teamRole: "解决方案负责人",
  },
  {
    username: "other_user",
    name: "其他售前",
    email: "other_user@example.com",
    roleLabel: "工程师",
    status: "活跃",
    teamRole: "售前工程师",
  },
  {
    username: "sales_demo",
    name: "示例销售",
    email: "sales_demo@example.com",
    roleLabel: "销售",
    status: "活跃",
    teamRole: "销售负责人",
  },
  {
    username: "guest_demo",
    name: "示例访客",
    email: "guest_demo@example.com",
    roleLabel: "访客",
    status: "活跃",
    teamRole: "访客账号",
  },
];

function normalizeTeamMembers(members: SharedTeamMember[]): SharedTeamMember[] {
  const deduped = new Map<string, SharedTeamMember>();
  [...FALLBACK_TEAM_MEMBERS, ...members].forEach((member) => {
    if (!member?.username) {
      return;
    }
    deduped.set(member.username, {
      username: member.username,
      name: member.name || member.username,
      email: member.email,
      roleLabel: member.roleLabel || "工程师",
      status: member.status || "活跃",
      mainIndustry: Array.isArray(member.mainIndustry) ? member.mainIndustry : [],
      teamRole: member.teamRole,
    });
  });
  return Array.from(deduped.values());
}

export function loadSharedTeamMembers(): SharedTeamMember[] {
  if (typeof window === "undefined") {
    return normalizeTeamMembers([]);
  }
  try {
    const raw = window.localStorage.getItem(SHARED_TEAM_MEMBERS_STORAGE_KEY);
    if (!raw) {
      return normalizeTeamMembers([]);
    }
    const parsed = JSON.parse(raw) as SharedTeamMember[];
    return normalizeTeamMembers(Array.isArray(parsed) ? parsed : []);
  } catch {
    return normalizeTeamMembers([]);
  }
}

export function saveSharedTeamMembers(members: SharedTeamMember[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      SHARED_TEAM_MEMBERS_STORAGE_KEY,
      JSON.stringify(normalizeTeamMembers(members)),
    );
  } catch {
    // ignore storage failures
  }
}

export function getSharedTeamMemberLabel(username?: string): string {
  if (!username) {
    return "-";
  }
  const member = loadSharedTeamMembers().find((item) => item.username === username);
  if (!member) {
    return username;
  }
  const suffix =
    member.teamRole && member.teamRole.trim().length > 0
      ? member.teamRole
      : member.roleLabel === "工程师"
        ? "售前"
        : member.roleLabel;
  return `${member.name}（${suffix}）`;
}

function isSalesMember(member: SharedTeamMember) {
  return member.roleLabel === "销售";
}

function isPreSalesMember(member: SharedTeamMember) {
  return ["工程师", "经理", "管理员"].includes(member.roleLabel);
}

export function getSharedTeamMemberOptions(
  role: "sales" | "presales" | "all" = "all",
): { value: string; label: string }[] {
  return loadSharedTeamMembers()
    .filter((member) => member.status === "活跃")
    .filter((member) => {
      if (role === "sales") return isSalesMember(member);
      if (role === "presales") return isPreSalesMember(member);
      return true;
    })
    .map((member) => ({
      value: member.username,
      label: getSharedTeamMemberLabel(member.username),
    }));
}

export function getDefaultSharedTeamMemberUsername(
  role: "sales" | "presales",
): string | undefined {
  const members = loadSharedTeamMembers().filter((member) => member.status === "活跃");
  const matched = members.find((member) =>
    role === "sales" ? isSalesMember(member) : isPreSalesMember(member),
  );
  return matched?.username;
}
