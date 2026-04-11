import { Button, Card, Col, Form, Input, Row, Select, Space } from "antd";
import type { FormInstance } from "antd/es/form";
import type { FeishuBindingStatus } from "../../shared/feishuIntegrationMock";

interface FeishuBindingManagementPanelProps {
  bindingKeyword: string;
  bindingStatusFilter: FeishuBindingStatus | "all";
  form: FormInstance;
  onBindingKeywordChange: (value: string) => void;
  onBindingStatusFilterChange: (value: FeishuBindingStatus | "all") => void;
  onCreateBinding: () => void | Promise<void>;
  onLoadBindingsFromServer: () => void | Promise<void>;
  onReset: () => void;
}

export function FeishuBindingManagementPanel(
  props: FeishuBindingManagementPanelProps,
) {
  const {
    bindingKeyword,
    bindingStatusFilter,
    form,
    onBindingKeywordChange,
    onBindingStatusFilterChange,
    onCreateBinding,
    onLoadBindingsFromServer,
    onReset,
  } = props;

  return (
    <Card
      title="绑定管理（API 优先 / Mock 回退）"
      extra={
        <Space wrap>
          <Button onClick={() => void onLoadBindingsFromServer()}>从后端加载</Button>
          <Button onClick={onReset}>恢复默认演示数据</Button>
        </Space>
      }
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <Input
          value={bindingKeyword}
          onChange={(event) => onBindingKeywordChange(event.target.value)}
          placeholder="搜索飞书姓名 / Open ID / 平台账号 / 部门"
          style={{ flex: 1, minWidth: 220 }}
        />
        <Select
          value={bindingStatusFilter}
          onChange={onBindingStatusFilterChange}
          style={{ width: 140 }}
          options={[
            { label: "全部状态", value: "all" },
            { label: "已绑定", value: "active" },
            { label: "待确认", value: "pending" },
            { label: "已停用", value: "disabled" },
          ]}
        />
      </div>
      <Form layout="vertical" form={form}>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="飞书姓名"
              name="feishuName"
              rules={[{ required: true, message: "请输入飞书姓名" }]}
            >
              <Input placeholder="例如：王经理" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="飞书 Open ID"
              name="feishuOpenId"
              rules={[{ required: true, message: "请输入 Open ID" }]}
            >
              <Input placeholder="例如：ou_xxx_demo_user" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="平台用户 ID"
              name="platformUserId"
              rules={[{ required: true, message: "请输入平台用户 ID" }]}
            >
              <Input placeholder="例如：2" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="平台账号"
              name="platformUsername"
              rules={[{ required: true, message: "请输入平台账号" }]}
            >
              <Input placeholder="例如：manager_demo" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              label="部门"
              name="department"
              rules={[{ required: true, message: "请输入部门" }]}
            >
              <Input placeholder="例如：售前管理部" />
            </Form.Item>
          </Col>
        </Row>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={() => form.resetFields()}>清空</Button>
          <Button type="primary" onClick={() => void onCreateBinding()}>
            新增绑定记录
          </Button>
        </div>
      </Form>
    </Card>
  );
}
