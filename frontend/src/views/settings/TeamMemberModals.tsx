import { Button, Col, Form, Input as AntInput, Modal, Row, Select, Typography } from "antd";
import type { FormInstance } from "antd/es/form";

const { Text } = Typography;

interface TeamMemberLike {
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

interface OptionLike {
  value: string;
  label: string;
}

interface TeamMemberModalsProps {
  memberModalVisible: boolean;
  memberModalMode: "create" | "edit";
  form: FormInstance;
  onCancelMemberModal: () => void;
  onSubmitMemberModal: () => void;
  allIndustries: string[];
  teamRoleOptions: OptionLike[];
  generatedMemberPassword: string;
  onGeneratePassword: () => void;
  viewModalVisible: boolean;
  currentMember: TeamMemberLike | null;
  onCloseViewModal: () => void;
}

export function TeamMemberModals(props: TeamMemberModalsProps) {
  const {
    memberModalVisible,
    memberModalMode,
    form,
    onCancelMemberModal,
    onSubmitMemberModal,
    allIndustries,
    teamRoleOptions,
    generatedMemberPassword,
    onGeneratePassword,
    viewModalVisible,
    currentMember,
    onCloseViewModal,
  } = props;

  return (
    <>
      <Modal
        title={memberModalMode === "create" ? "添加成员" : "编辑成员"}
        open={memberModalVisible}
        onCancel={onCancelMemberModal}
        onOk={onSubmitMemberModal}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form layout="vertical" form={form}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="账号 *"
                name="username"
                rules={[{ required: true, message: "请输入账号" }]}
              >
                <AntInput
                  name="username"
                  autoComplete="username"
                  placeholder="例如：zhangsan"
                  disabled={memberModalMode === "edit"}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="姓名 *"
                name="name"
                rules={[{ required: true, message: "请输入姓名" }]}
              >
                <AntInput placeholder="例如：张三" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="邮箱 *"
                name="email"
                rules={[{ required: true, message: "请输入邮箱" }]}
              >
                <AntInput placeholder="例如：zhangsan@example.com" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="系统角色" name="role" initialValue="工程师">
                <Select
                  options={[
                    { value: "管理员", label: "管理员" },
                    { value: "经理", label: "经理" },
                    { value: "工程师", label: "工程师" },
                    { value: "销售", label: "销售" },
                    { value: "访客", label: "访客" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="状态" name="status" initialValue="活跃">
                <Select
                  options={[
                    { value: "活跃", label: "活跃" },
                    { value: "禁用", label: "禁用" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="权限摘要（按角色自动生成）" name="permissions">
            <AntInput disabled />
          </Form.Item>
          <Form.Item label="所属行业（可多选）" name="mainIndustry">
            <Select
              mode="tags"
              style={{ width: "100%" }}
              placeholder="例如：金融行业、电商行业"
              options={allIndustries.map((value) => ({
                value,
                label: value,
              }))}
            />
          </Form.Item>
          <Form.Item label="团队角色" name="teamRole">
            <Select allowClear showSearch placeholder="请选择团队角色" options={teamRoleOptions} />
          </Form.Item>
          <Form.Item
            label={memberModalMode === "edit" ? "重置密码（可选）" : "初始密码 *"}
            name="password"
            rules={
              memberModalMode === "create"
                ? [
                    { required: true, message: "请输入初始密码" },
                    { min: 8, message: "密码长度不能少于 8 位" },
                  ]
                : [{ min: 8, message: "密码长度不能少于 8 位" }]
            }
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <AntInput.Password
                name="password"
                autoComplete="new-password"
                placeholder="请输入密码"
                style={{ flex: 1 }}
              />
              <Button onClick={onGeneratePassword}>随机生成密码</Button>
            </div>
          </Form.Item>
          {generatedMemberPassword ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              当前随机密码：{generatedMemberPassword}
            </Text>
          ) : null}
        </Form>
      </Modal>

      <Modal
        title="成员详情"
        open={viewModalVisible}
        onCancel={onCloseViewModal}
        footer={<Button onClick={onCloseViewModal}>关闭</Button>}
        destroyOnClose
      >
        {currentMember && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              fontSize: 13,
            }}
          >
            <div>
              <strong>账号：</strong>
              <br />
              {currentMember.username}
            </div>
            <div>
              <strong>姓名：</strong>
              <br />
              {currentMember.name}
            </div>
            <div>
              <strong>邮箱：</strong>
              <br />
              {currentMember.email}
            </div>
            <div>
              <strong>系统角色：</strong>
              <br />
              {currentMember.role}
            </div>
            <div>
              <strong>状态：</strong>
              <br />
              {currentMember.status}
            </div>
            <div>
              <strong>权限：</strong>
              <br />
              {currentMember.permissions}
            </div>
            <div>
              <strong>所属行业：</strong>
              <br />
              {currentMember.mainIndustry && currentMember.mainIndustry.length > 0
                ? currentMember.mainIndustry.join("，")
                : "未设置"}
            </div>
            <div>
              <strong>团队角色：</strong>
              <br />
              {currentMember.teamRole || "未设置"}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
