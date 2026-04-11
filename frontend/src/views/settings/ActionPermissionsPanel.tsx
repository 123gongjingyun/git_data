import {
  Avatar,
  Button,
  Card,
  Checkbox,
  Collapse,
  Input as AntInput,
  Radio,
  Select,
  Tag,
  Typography,
} from "antd";
import type { CSSProperties, ReactNode } from "react";

const { Text } = Typography;

interface PermissionMemberLike {
  key: string;
  username: string;
  name: string;
  role: string;
  permissions: string;
  menuOverrideCount?: number;
  actionOverrideCount?: number;
}

interface PermissionUserLike {
  username?: string | null;
  displayName?: string | null;
}

interface ActionPermissionDefinitionLike {
  key: string;
  label: string;
  module: string;
}

interface GroupedActionDefinitionsLike {
  moduleKey: string;
  items: ActionPermissionDefinitionLike[];
}

interface MenuPermissionDefinitionLike {
  key: string;
}

interface ActionPermissionsPanelProps {
  permissionPanelStyle: CSSProperties;
  permissionWorkbenchCardStyle: CSSProperties;
  canManageActionPermissions: boolean;
  actionPermissionsDirty: boolean;
  selectedActionPermissionUser: PermissionUserLike | null;
  roleActionKeys: string[];
  allowedActionKeysDraft: string[];
  deniedActionKeysDraft: string[];
  effectiveActionKeysPreview: string[];
  selectedActionPermissionUserId: string | null;
  permissionConfigurableMembers: PermissionMemberLike[];
  filteredMembersLength: number;
  getAvatarColor: (role: string) => string;
  getRoleTagColor: (role: string) => string;
  onRefreshMembers: () => void;
  onRefreshDefinitions: () => void;
  onSelectAllActionOverrides: () => void;
  onClearActionOverrides: () => void;
  onResetActionPermissions: () => void;
  onSaveActionPermissions: () => void;
  actionPermissionsSaving: boolean;
  onSelectActionPermissionUser: (userId: string) => void;
  actionPermissionsLoading: boolean;
  actionPermissionSearch: string;
  onActionPermissionSearchChange: (value: string) => void;
  actionPermissionViewMode: "all" | "overridden" | "effective" | "inactive" | "draft";
  onActionPermissionViewModeChange: (
    value: "all" | "overridden" | "effective" | "inactive" | "draft",
  ) => void;
  expandedActionModules: string[];
  onExpandedActionModulesChange: (keys: string[]) => void;
  groupedActionDefinitionsByModule: GroupedActionDefinitionsLike[];
  actionModuleLabelMap: Record<string, string>;
  actionPermissionItemLabelMap: Partial<Record<string, string>>;
  actionPermissionDraftChangedKeys: Set<string>;
  matchesPermissionFilter: (
    label: string,
    key: string,
    isOverridden: boolean,
    isEffective: boolean,
    isDraftChanged: boolean,
    search: string,
    mode: "all" | "overridden" | "effective" | "inactive" | "draft",
  ) => boolean;
  menuPermissionDefinitions: MenuPermissionDefinitionLike[];
  resolveMenuModuleKey: (menuKey: string) => string;
  effectiveMenuKeysPreview: string[];
  onAllowAllActionsForModule: (moduleKey: string) => void;
  onClearActionOverridesForModule: (moduleKey: string) => void;
  actionPermissionMatrixHeader: ReactNode;
  createActionPermissionRowStyle: (
    isOverridden: boolean,
    isEffective: boolean,
  ) => CSSProperties;
  renderPermissionStateTag: (
    enabled: boolean,
    allowText: string,
    denyText: string,
  ) => ReactNode;
  onToggleAllowedActionKey: (actionKey: string, checked: boolean) => void;
  onToggleDeniedActionKey: (actionKey: string, checked: boolean) => void;
  isNumericUserId: (value: string | null | undefined) => boolean;
}

export function ActionPermissionsPanel(props: ActionPermissionsPanelProps) {
  const {
    permissionPanelStyle,
    permissionWorkbenchCardStyle,
    canManageActionPermissions,
    actionPermissionsDirty,
    selectedActionPermissionUser,
    roleActionKeys,
    allowedActionKeysDraft,
    deniedActionKeysDraft,
    effectiveActionKeysPreview,
    selectedActionPermissionUserId,
    permissionConfigurableMembers,
    filteredMembersLength,
    getAvatarColor,
    getRoleTagColor,
    onRefreshMembers,
    onRefreshDefinitions,
    onSelectAllActionOverrides,
    onClearActionOverrides,
    onResetActionPermissions,
    onSaveActionPermissions,
    actionPermissionsSaving,
    onSelectActionPermissionUser,
    actionPermissionsLoading,
    actionPermissionSearch,
    onActionPermissionSearchChange,
    actionPermissionViewMode,
    onActionPermissionViewModeChange,
    expandedActionModules,
    onExpandedActionModulesChange,
    groupedActionDefinitionsByModule,
    actionModuleLabelMap,
    actionPermissionItemLabelMap,
    actionPermissionDraftChangedKeys,
    matchesPermissionFilter,
    menuPermissionDefinitions,
    resolveMenuModuleKey,
    effectiveMenuKeysPreview,
    onAllowAllActionsForModule,
    onClearActionOverridesForModule,
    actionPermissionMatrixHeader,
    createActionPermissionRowStyle,
    renderPermissionStateTag,
    onToggleAllowedActionKey,
    onToggleDeniedActionKey,
    isNumericUserId,
  } = props;

  return (
    <Card
      style={permissionPanelStyle}
      headStyle={{ display: "none" }}
      bodyStyle={{ padding: 22 }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 16,
          flexWrap: "wrap",
          padding: 20,
          borderRadius: 18,
          background:
            "radial-gradient(circle at top left, rgba(22,163,74,0.14), transparent 30%), linear-gradient(135deg, var(--app-surface-soft) 0%, color-mix(in srgb, rgba(34,197,94,0.12) 55%, var(--app-surface) 45%) 55%, var(--app-surface) 100%)",
          border: "1px solid rgba(34, 197, 94, 0.22)",
        }}
      >
        <div style={{ fontSize: 14, color: "var(--app-text-primary)" }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--app-text-primary)",
              marginBottom: 6,
            }}
          >
            操作权限管理
          </div>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            第一期将新增 / 查看 / 编辑 / 删除 / 下载 / 审批等动作做成可视化勾选项。当前先覆盖项目管理、商机管理、解决方案、审批流程库等高风险模块。
          </Text>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {actionPermissionsDirty && <Tag color="orange">有未保存变更</Tag>}
          <Button size="small" onClick={onRefreshMembers}>
            刷新成员
          </Button>
          <Button size="small" onClick={onRefreshDefinitions}>
            刷新权限项
          </Button>
          <Button
            size="small"
            disabled={!isNumericUserId(selectedActionPermissionUserId)}
            onClick={onSelectAllActionOverrides}
          >
            全部允许
          </Button>
          <Button
            size="small"
            disabled={!isNumericUserId(selectedActionPermissionUserId)}
            onClick={onClearActionOverrides}
          >
            清空覆盖
          </Button>
          <Button
            size="small"
            disabled={!isNumericUserId(selectedActionPermissionUserId) || actionPermissionsSaving}
            onClick={onResetActionPermissions}
          >
            恢复角色默认
          </Button>
          <Button
            type="primary"
            size="small"
            loading={actionPermissionsSaving}
            disabled={!isNumericUserId(selectedActionPermissionUserId)}
            onClick={onSaveActionPermissions}
          >
            保存
          </Button>
        </div>
      </div>

      {!canManageActionPermissions && (
        <div
          style={{
            padding: 12,
            marginBottom: 12,
            borderRadius: 6,
            background: "rgba(250, 173, 20, 0.14)",
            border: "1px solid #ffd591",
            color: "#ad6800",
            fontSize: 12,
          }}
        >
          当前账号无权维护操作权限。仅管理员可进入该页面。
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {[
          {
            label: "当前用户",
            value:
              selectedActionPermissionUser?.displayName ||
              selectedActionPermissionUser?.username ||
              "未选择",
          },
          { label: "角色默认动作", value: `${roleActionKeys.length} 项` },
          {
            label: "当前覆盖",
            value: `${allowedActionKeysDraft.length + deniedActionKeysDraft.length} 项`,
          },
          { label: "最终生效", value: `${effectiveActionKeysPreview.length} 项` },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              padding: "14px 16px",
              borderRadius: 16,
              border: "1px solid rgba(34, 197, 94, 0.24)",
              background:
                "linear-gradient(180deg, color-mix(in srgb, rgba(34,197,94,0.16) 68%, var(--app-surface) 32%) 0%, var(--app-surface-soft) 100%)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "var(--app-text-secondary)",
                marginBottom: 6,
              }}
            >
              {item.label}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--app-text-primary)",
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <Card
        size="small"
        title="成员选择"
        bordered={false}
        style={{
          ...permissionWorkbenchCardStyle,
          marginBottom: 16,
          background:
            "radial-gradient(circle at top right, rgba(34,197,94,0.14), transparent 28%), linear-gradient(180deg, color-mix(in srgb, rgba(34,197,94,0.10) 52%, var(--app-surface) 48%) 0%, var(--app-surface-soft) 100%)",
        }}
        headStyle={{ fontWeight: 700 }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.2,
                color: "#16a34a",
                marginBottom: 4,
              }}
            >
              STEP 1
            </div>
            <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
              先选择一个成员，再在下方按模块勾选操作权限。当前为单成员配置模式。
            </Text>
          </div>
          <Tag color="green">横向单选模式</Tag>
        </div>
        {permissionConfigurableMembers.length === 0 ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {filteredMembersLength === 0
              ? "当前没有可配置的成员。"
              : "当前成员列表仍为本地快照，需连接后端真实用户数据后才能维护操作权限。"}
          </Text>
        ) : (
          <Radio.Group
            value={selectedActionPermissionUserId ?? undefined}
            onChange={(event) => onSelectActionPermissionUser(event.target.value)}
            style={{ width: "100%" }}
          >
            <div
              className="app-scrollbar"
              style={{
                display: "flex",
                gap: 12,
                overflowX: "auto",
                paddingBottom: 4,
                scrollSnapType: "x proximity",
              }}
            >
              {permissionConfigurableMembers.map((member) => {
                const isActive = member.key === selectedActionPermissionUserId;
                return (
                  <label
                    key={member.key}
                    style={{
                      minWidth: 260,
                      flex: "0 0 260px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "14px 16px",
                      borderRadius: 16,
                      cursor: "pointer",
                      border: isActive
                        ? "1px solid rgba(251, 146, 60, 0.3)"
                        : "1px solid var(--app-border)",
                      background: isActive
                        ? "linear-gradient(135deg, color-mix(in srgb, rgba(251,146,60,0.16) 70%, var(--app-surface) 30%) 0%, var(--app-surface-soft) 100%)"
                        : "linear-gradient(180deg, var(--app-surface) 0%, var(--app-surface-soft) 100%)",
                      boxShadow: isActive
                        ? "0 12px 24px rgba(251,146,60,0.12)"
                        : "0 8px 18px rgba(15,23,42,0.12)",
                      scrollSnapAlign: "start",
                    }}
                  >
                    <Radio value={member.key} style={{ marginTop: 2 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            minWidth: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <Avatar
                            size={36}
                            style={{
                              background: getAvatarColor(member.role),
                              flex: "0 0 auto",
                              boxShadow: isActive
                                ? "0 10px 18px rgba(251,146,60,0.18)"
                                : "none",
                            }}
                          >
                            {member.name.slice(0, 1)}
                          </Avatar>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 700,
                                color: "var(--app-text-primary)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {member.name}
                            </div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {member.username}
                            </Text>
                          </div>
                        </div>
                        <Tag color={getRoleTagColor(member.role)}>{member.role}</Tag>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          marginBottom: 6,
                        }}
                      >
                        <Tag color="gold">操作覆盖 {member.actionOverrideCount || 0}</Tag>
                        {(member.menuOverrideCount || 0) > 0 && (
                          <Tag color="blue">菜单覆盖 {member.menuOverrideCount}</Tag>
                        )}
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {member.permissions}
                      </Text>
                    </div>
                  </label>
                );
              })}
            </div>
          </Radio.Group>
        )}
      </Card>

      <Card
        size="small"
        title="操作权限明细"
        bordered={false}
        style={{
          ...permissionWorkbenchCardStyle,
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--app-surface) 98%, transparent) 0%, color-mix(in srgb, rgba(34,197,94,0.08) 45%, var(--app-surface-soft) 55%) 100%)",
        }}
        headStyle={{ fontWeight: 700 }}
      >
        {!selectedActionPermissionUserId && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            请先在上方选择成员。
          </Text>
        )}

        {selectedActionPermissionUserId && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
                marginBottom: 16,
                padding: 16,
                borderRadius: 16,
                border: "1px solid rgba(34, 197, 94, 0.22)",
                background:
                  "linear-gradient(135deg, color-mix(in srgb, rgba(34,197,94,0.14) 70%, var(--app-surface) 30%) 0%, var(--app-surface-soft) 100%)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 1.2,
                    color: "#16a34a",
                    marginBottom: 8,
                  }}
                >
                  STEP 2
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Tag color="blue">
                    当前成员：
                    {selectedActionPermissionUser?.displayName ||
                      selectedActionPermissionUser?.username ||
                      "--"}
                  </Tag>
                  <Tag color="geekblue">角色默认 {roleActionKeys.length} 项</Tag>
                  <Tag color="green">自定义允许 {allowedActionKeysDraft.length} 项</Tag>
                  <Tag color="red">自定义隐藏 {deniedActionKeysDraft.length} 项</Tag>
                  <Tag color="gold">最终生效 {effectiveActionKeysPreview.length} 项</Tag>
                </div>
              </div>
              <div
                style={{
                  minWidth: 240,
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(34, 197, 94, 0.24)",
                  background:
                    "linear-gradient(180deg, color-mix(in srgb, var(--app-surface) 92%, transparent) 0%, color-mix(in srgb, rgba(34,197,94,0.12) 50%, var(--app-surface-soft) 50%) 100%)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--app-text-secondary)",
                    marginBottom: 6,
                  }}
                >
                  当前编辑状态
                </div>
                <Text type="secondary" style={{ fontSize: 12, maxWidth: 360 }}>
                  {actionPermissionsDirty
                    ? "当前存在未保存的动作权限调整，建议保存后再切换成员或离开页面。"
                    : "当前操作权限与服务器已同步。"}
                </Text>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 18,
                alignItems: "center",
                padding: 14,
                borderRadius: 16,
                border: "1px solid rgba(34, 197, 94, 0.2)",
                background:
                  "linear-gradient(180deg, var(--app-surface) 0%, var(--app-surface-soft) 100%)",
              }}
            >
              <AntInput
                allowClear
                style={{ width: 320 }}
                placeholder="搜索模块 / 动作名称 / 权限码"
                value={actionPermissionSearch}
                onChange={(event) => onActionPermissionSearchChange(event.target.value)}
              />
              <Select
                style={{ width: 200 }}
                value={actionPermissionViewMode}
                onChange={onActionPermissionViewModeChange}
                options={[
                  { value: "all", label: "查看全部" },
                  { value: "overridden", label: "只看已覆盖项" },
                  { value: "effective", label: "只看已生效项" },
                  { value: "inactive", label: "只看未生效项" },
                  { value: "draft", label: "只看本次变更项" },
                ]}
              />
              <Tag color="green">模块化矩阵视图</Tag>
            </div>

            {actionPermissionsLoading ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                正在加载操作权限详情...
              </Text>
            ) : (
              <Collapse
                activeKey={expandedActionModules}
                onChange={(keys) =>
                  onExpandedActionModulesChange(
                    (Array.isArray(keys) ? keys : [keys]).map(String),
                  )
                }
                ghost
                style={{ background: "transparent" }}
                items={groupedActionDefinitionsByModule
                  .map(({ moduleKey, items }) => {
                    const visibleItems = items.filter((item) => {
                      const allowed = allowedActionKeysDraft.includes(item.key);
                      const denied = deniedActionKeysDraft.includes(item.key);
                      const effective = effectiveActionKeysPreview.includes(item.key);
                      return matchesPermissionFilter(
                        `${actionModuleLabelMap[moduleKey]} ${item.label}`,
                        item.key,
                        allowed || denied,
                        effective,
                        actionPermissionDraftChangedKeys.has(item.key),
                        actionPermissionSearch,
                        actionPermissionViewMode,
                      );
                    });
                    if (visibleItems.length === 0) {
                      return null;
                    }
                    const relatedMenuKey = menuPermissionDefinitions.find(
                      (item) => resolveMenuModuleKey(item.key) === moduleKey,
                    )?.key;
                    const menuEffective =
                      relatedMenuKey != null
                        ? effectiveMenuKeysPreview.includes(relatedMenuKey)
                        : null;
                    const moduleEffectiveCount = visibleItems.filter((item) =>
                      effectiveActionKeysPreview.includes(item.key),
                    ).length;
                    const moduleOverrideCount = visibleItems.filter(
                      (item) =>
                        allowedActionKeysDraft.includes(item.key) ||
                        deniedActionKeysDraft.includes(item.key),
                    ).length;

                    return {
                      key: moduleKey,
                      style: {
                        marginBottom: 16,
                        borderRadius: 20,
                        background:
                          "linear-gradient(180deg, color-mix(in srgb, var(--app-surface) 98%, transparent) 0%, color-mix(in srgb, rgba(34,197,94,0.1) 38%, var(--app-surface-soft) 62%) 100%)",
                        border: "1px solid rgba(34, 197, 94, 0.2)",
                        boxShadow: "0 14px 30px rgba(15, 23, 42, 0.2)",
                        overflow: "hidden",
                      } satisfies CSSProperties,
                      label: (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                            flexWrap: "wrap",
                            width: "100%",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 800,
                                color: "var(--app-text-primary)",
                              }}
                            >
                              {actionModuleLabelMap[moduleKey]}
                            </span>
                            <Tag color="blue">
                              {moduleEffectiveCount}/{items.length} 生效
                            </Tag>
                            <Tag color="gold">覆盖 {moduleOverrideCount} 项</Tag>
                            {menuEffective !== null && (
                              <Tag color={menuEffective ? "green" : "default"}>
                                菜单{menuEffective ? "已生效" : "未生效"}
                              </Tag>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Button
                              size="small"
                              onClick={(event) => {
                                event.stopPropagation();
                                onAllowAllActionsForModule(moduleKey);
                              }}
                            >
                              本模块全部允许
                            </Button>
                            <Button
                              size="small"
                              onClick={(event) => {
                                event.stopPropagation();
                                onClearActionOverridesForModule(moduleKey);
                              }}
                            >
                              清空本模块覆盖
                            </Button>
                          </div>
                        </div>
                      ),
                      children: (
                        <div>
                          {actionPermissionMatrixHeader}
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 10,
                            }}
                          >
                            {visibleItems.map((item) => {
                              const inRole = roleActionKeys.includes(item.key);
                              const allowed = allowedActionKeysDraft.includes(item.key);
                              const denied = deniedActionKeysDraft.includes(item.key);
                              const effective = effectiveActionKeysPreview.includes(item.key);
                              const isOverridden = allowed || denied;

                              return (
                                <div
                                  key={item.key}
                                  style={createActionPermissionRowStyle(
                                    isOverridden,
                                    effective,
                                  )}
                                >
                                  <div>
                                    <div
                                      style={{
                                        fontWeight: 700,
                                        color: "var(--app-text-primary)",
                                        marginBottom: 4,
                                      }}
                                    >
                                      {actionPermissionItemLabelMap[item.key] ||
                                        item.label.replace(
                                          actionModuleLabelMap[moduleKey],
                                          "",
                                        ) ||
                                        item.label}
                                    </div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                      {actionModuleLabelMap[moduleKey]} · {item.key}
                                    </Text>
                                  </div>
                                  <div>
                                    {renderPermissionStateTag(
                                      inRole,
                                      "默认允许",
                                      "默认禁止",
                                    )}
                                  </div>
                                  <div>
                                    <Checkbox
                                      checked={allowed}
                                      onChange={(event) =>
                                        onToggleAllowedActionKey(
                                          item.key,
                                          event.target.checked,
                                        )
                                      }
                                    >
                                      允许
                                    </Checkbox>
                                  </div>
                                  <div>
                                    <Checkbox
                                      checked={denied}
                                      onChange={(event) =>
                                        onToggleDeniedActionKey(
                                          item.key,
                                          event.target.checked,
                                        )
                                      }
                                    >
                                      隐藏
                                    </Checkbox>
                                  </div>
                                  <div>
                                    {renderPermissionStateTag(
                                      effective,
                                      "已生效",
                                      "未生效",
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ),
                    };
                  })
                  .filter(Boolean)}
              />
            )}
          </>
        )}
      </Card>
    </Card>
  );
}
