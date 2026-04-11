import { Avatar, Button, Card, Col, Form, Input, Row, Select, Tag, Typography } from "antd";
import type { FormInstance } from "antd/es/form";
import type { CurrentUser } from "../../shared/auth";

const { Text } = Typography;

interface SettingsAccountPanelProps {
  allIndustries: string[];
  currentUser: CurrentUser | null;
  getAvatarColor: (role: string) => string;
  onNavigateToProfile: () => void;
  onNavigateToSecurity: () => void;
  onSaveCurrentProfile: () => void | Promise<void>;
  onChangeCurrentPassword: () => void | Promise<void>;
  passwordForm: FormInstance;
  passwordSaving: boolean;
  permissionPanelStyle: React.CSSProperties;
  permissionWorkbenchCardStyle: React.CSSProperties;
  profileForm: FormInstance;
  profileSaving: boolean;
  teamRoleOptions: Array<{ label: string; value: string }>;
  view: "profile" | "security";
}

export function SettingsAccountPanel(props: SettingsAccountPanelProps) {
  const {
    allIndustries,
    currentUser,
    getAvatarColor,
    onNavigateToProfile,
    onNavigateToSecurity,
    onSaveCurrentProfile,
    onChangeCurrentPassword,
    passwordForm,
    passwordSaving,
    permissionPanelStyle,
    permissionWorkbenchCardStyle,
    profileForm,
    profileSaving,
    teamRoleOptions,
    view,
  } = props;

  if (view === "profile") {
    return (
      <Card style={permissionWorkbenchCardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--app-text-primary)" }}>
              个人资料
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              从右上角用户区或系统设置进入时，均使用同一套资料和密码维护入口。
            </Text>
          </div>
          <Tag color="blue">当前账号：{currentUser?.roleLabel || "访客"}</Tag>
        </div>
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={14}>
            <Card size="small" title="基础资料" bordered={false} style={permissionPanelStyle}>
              <Form layout="vertical" form={profileForm}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="用户名" name="username">
                      <Input name="username" autoComplete="username" disabled />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="系统角色" name="roleLabel">
                      <Input name="roleLabel" autoComplete="organization-title" disabled />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item
                  label="显示名称"
                  name="displayName"
                  rules={[{ required: true, message: "请输入显示名称" }]}
                >
                  <Input
                    name="displayName"
                    autoComplete="name"
                    placeholder="例如：平台管理员"
                  />
                </Form.Item>
                <Form.Item
                  label="邮箱"
                  name="email"
                  rules={[
                    { required: true, message: "请输入邮箱" },
                    { type: "email", message: "邮箱格式不正确" },
                  ]}
                >
                  <Input
                    name="email"
                    autoComplete="email"
                    placeholder="例如：admin_demo@example.com"
                  />
                </Form.Item>
                <Form.Item label="所属行业" name="mainIndustry">
                  <Select
                    mode="tags"
                    placeholder="例如：金融行业、平台管理"
                    options={allIndustries.map((item) => ({ value: item, label: item }))}
                  />
                </Form.Item>
                <Form.Item label="团队角色" name="teamRole">
                  <Select
                    allowClear
                    showSearch
                    placeholder="请选择团队角色"
                    options={teamRoleOptions}
                  />
                </Form.Item>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <Button onClick={() => profileForm.resetFields()}>重置</Button>
                  <Button
                    type="primary"
                    loading={profileSaving}
                    onClick={() => void onSaveCurrentProfile()}
                  >
                    保存个人资料
                  </Button>
                </div>
              </Form>
            </Card>
          </Col>
          <Col xs={24} xl={10}>
            <Card size="small" title="账号概览" bordered={false} style={permissionPanelStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  marginBottom: 18,
                }}
              >
                <Avatar
                  size={52}
                  style={{ backgroundColor: getAvatarColor(currentUser?.roleLabel || "访客") }}
                >
                  {(currentUser?.displayName || currentUser?.username || "U")
                    .charAt(0)
                    .toUpperCase()}
                </Avatar>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--app-text-primary)" }}>
                    {currentUser?.displayName || currentUser?.username || "未登录用户"}
                  </div>
                  <Text type="secondary">{currentUser?.email || "未设置邮箱"}</Text>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    权限摘要
                  </Text>
                  <div style={{ marginTop: 4, fontWeight: 600 }}>
                    {currentUser?.permissionSummary || "基础访问权限"}
                  </div>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    当前可见菜单
                  </Text>
                  <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(currentUser?.effectiveMenuKeys || []).slice(0, 8).map((item) => (
                      <Tag key={item} color="cyan">
                        {item.replace("menu.", "")}
                      </Tag>
                    ))}
                  </div>
                </div>
                <Button onClick={onNavigateToSecurity}>去修改密码</Button>
              </div>
            </Card>
          </Col>
        </Row>
      </Card>
    );
  }

  return (
    <Card style={permissionWorkbenchCardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--app-text-primary)" }}>
            安全设置
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            当前密码校验通过后才允许更新新密码，和右上角用户区入口保持一致。
          </Text>
        </div>
        <Button onClick={onNavigateToProfile}>返回个人资料</Button>
      </div>
      <Card size="small" bordered={false} style={permissionPanelStyle}>
        <Form layout="vertical" form={passwordForm}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                label="当前密码"
                name="currentPassword"
                rules={[{ required: true, message: "请输入当前密码" }]}
              >
                <Input.Password
                  name="currentPassword"
                  autoComplete="current-password"
                  placeholder="请输入当前密码"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="新密码"
                name="newPassword"
                rules={[
                  { required: true, message: "请输入新密码" },
                  { min: 8, message: "密码长度不能少于 8 位" },
                ]}
              >
                <Input.Password
                  name="newPassword"
                  autoComplete="new-password"
                  placeholder="请输入新密码"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="确认新密码"
                name="confirmPassword"
                dependencies={["newPassword"]}
                rules={[
                  { required: true, message: "请再次输入新密码" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("newPassword") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error("两次输入的新密码不一致"));
                    },
                  }),
                ]}
              >
                <Input.Password
                  name="confirmPassword"
                  autoComplete="new-password"
                  placeholder="请再次输入新密码"
                />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={() => passwordForm.resetFields()}>清空</Button>
            <Button
              type="primary"
              loading={passwordSaving}
              onClick={() => void onChangeCurrentPassword()}
            >
              更新密码
            </Button>
          </div>
        </Form>
      </Card>
    </Card>
  );
}
