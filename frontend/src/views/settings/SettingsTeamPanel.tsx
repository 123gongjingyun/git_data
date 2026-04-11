import { Button, Card, Input, Popover, Select, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ReactNode } from "react";

const { Text } = Typography;

interface RolePermissionSummaryCard {
  role: string;
  accent: string;
  badgeColor: string;
  highlights: string[];
}

interface SettingsTeamPanelProps {
  canManageMembers: boolean;
  columns: ColumnsType<any>;
  filteredMembersLength: number;
  keyword: string;
  membersLoading: boolean;
  membersPermissionHint: string;
  paginatedMembers: any[];
  roleFilter?: string;
  rolePermissionSummaryCards: RolePermissionSummaryCard[];
  selectedTeamTableToggleableColumnCount: number;
  statusFilter?: string;
  teamTableColumnSettingContent: ReactNode;
  teamTablePage: number;
  teamTablePageSize: number;
  teamTableToggleableColumnCount: number;
  onAddMember: () => void;
  onKeywordChange: (value: string) => void;
  onPaginationChange: (page: number, pageSize: number) => void;
  onRoleFilterChange: (value?: string) => void;
  onStatusFilterChange: (value?: string) => void;
}

export function SettingsTeamPanel(props: SettingsTeamPanelProps) {
  const {
    canManageMembers,
    columns,
    filteredMembersLength,
    keyword,
    membersLoading,
    membersPermissionHint,
    paginatedMembers,
    roleFilter,
    rolePermissionSummaryCards,
    selectedTeamTableToggleableColumnCount,
    statusFilter,
    teamTableColumnSettingContent,
    teamTablePage,
    teamTablePageSize,
    teamTableToggleableColumnCount,
    onAddMember,
    onKeywordChange,
    onPaginationChange,
    onRoleFilterChange,
    onStatusFilterChange,
  } = props;

  return (
    <Card>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 14, color: "#595959" }}>
          团队与权限管理
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            管理团队成员及其访问权限
          </Text>
        </div>
        <Button type="primary" disabled={!canManageMembers} onClick={onAddMember}>
          + 添加成员
        </Button>
      </div>
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Input
          allowClear
          style={{ width: 240 }}
          placeholder="搜索姓名 / 邮箱 / 行业 / 团队角色..."
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
        />
        <Select
          allowClear
          style={{ width: 140 }}
          placeholder="全部角色"
          value={roleFilter}
          onChange={(value) => onRoleFilterChange(value)}
          options={[
            { value: "管理员", label: "管理员" },
            { value: "经理", label: "经理" },
            { value: "工程师", label: "工程师" },
            { value: "销售", label: "销售" },
            { value: "访客", label: "访客" },
          ]}
        />
        <Select
          allowClear
          style={{ width: 140 }}
          placeholder="全部状态"
          value={statusFilter}
          onChange={(value) => onStatusFilterChange(value)}
          options={[
            { value: "活跃", label: "活跃" },
            { value: "禁用", label: "禁用" },
          ]}
        />
        <Popover
          trigger="click"
          placement="bottomRight"
          content={teamTableColumnSettingContent}
        >
          <Button>
            列设置（{selectedTeamTableToggleableColumnCount}/{teamTableToggleableColumnCount}）
          </Button>
        </Popover>
      </div>
      <Table<any>
        size="small"
        loading={membersLoading}
        scroll={{ x: 1360 }}
        pagination={{
          current: teamTablePage,
          pageSize: teamTablePageSize,
          total: filteredMembersLength,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ["5", "10", "20", "50"],
          showTotal: (total) => `共 ${total} 条`,
          onChange: onPaginationChange,
        }}
        rowKey="key"
        dataSource={paginatedMembers}
        columns={columns}
      />

      <div
        style={{
          marginTop: 24,
          padding: 18,
          background:
            "linear-gradient(135deg, color-mix(in srgb, rgba(250,140,22,0.16) 70%, var(--app-surface) 30%) 0%, var(--app-surface-soft) 100%)",
          borderRadius: 16,
          border: "1px solid rgba(250, 140, 22, 0.24)",
          boxShadow: "0 12px 32px rgba(250, 140, 22, 0.08)",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>权限说明</div>
        <div
          style={{
            fontSize: 12,
            color: "var(--app-text-secondary)",
            marginBottom: 14,
          }}
        >
          当前说明已与系统内真实角色模板、菜单权限和操作权限逻辑保持同步。
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginBottom: 14,
          }}
        >
          {rolePermissionSummaryCards.map((item) => (
            <div
              key={item.role}
              style={{
                background: item.accent,
                borderRadius: 14,
                border: "1px solid var(--app-border)",
                padding: 14,
                minHeight: 168,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--app-text-primary)",
                  }}
                >
                  {item.role}
                </span>
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: item.badgeColor,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.role}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {item.highlights.map((highlight) => (
                  <div
                    key={highlight}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      fontSize: 12,
                      color: "var(--app-text-secondary)",
                      lineHeight: 1.6,
                    }}
                  >
                    <span
                      style={{
                        color: item.badgeColor,
                        fontWeight: 700,
                        marginTop: 1,
                      }}
                    >
                      •
                    </span>
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--app-text-secondary)",
            lineHeight: 1.7,
            padding: "10px 12px",
            borderRadius: 12,
            background:
              "linear-gradient(180deg, color-mix(in srgb, rgba(245,158,11,0.10) 56%, var(--app-surface) 44%) 0%, var(--app-surface-soft) 100%)",
            border: "1px dashed rgba(245, 158, 11, 0.32)",
            boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
          }}
        >
          {membersPermissionHint}
        </div>
      </div>
    </Card>
  );
}
