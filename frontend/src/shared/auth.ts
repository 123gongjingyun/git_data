export type UserRole =
  | "pre_sales_engineer"
  | "manager"
  | "admin"
  | "sales"
  | "guest";

export interface CurrentUser {
  id: number;
  username: string;
  displayName?: string;
  email?: string;
  role: UserRole;
  roleLabel: "工程师" | "经理" | "管理员" | "销售" | "访客";
  permissions: string[];
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

export function hasPermission(user: CurrentUser | null, permission: string) {
  if (!user) {
    return false;
  }
  if (permission.startsWith("menu.")) {
    return user.effectiveMenuKeys.includes(permission);
  }
  if (user.effectiveActionKeys.includes(permission)) {
    return true;
  }
  return user.permissions.includes(permission);
}

export function hasAnyPermission(
  user: CurrentUser | null,
  permissions: string[],
) {
  return permissions.some((permission) => hasPermission(user, permission));
}

export function hasAllPermissions(
  user: CurrentUser | null,
  permissions: string[],
) {
  return permissions.every((permission) => hasPermission(user, permission));
}

export function hasMenuAccess(user: CurrentUser | null, menuKey: string) {
  return !!user?.effectiveMenuKeys.includes(menuKey);
}

export function hasActionAccess(user: CurrentUser | null, actionKey: string) {
  return !!user?.effectiveActionKeys.includes(actionKey) || hasPermission(user, actionKey);
}
