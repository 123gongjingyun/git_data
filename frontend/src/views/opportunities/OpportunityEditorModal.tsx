import { Form, Input, Modal, Radio, Select } from "antd";
import type { FormInstance } from "antd/es/form";

interface ProjectOption {
  value: string;
  label: string;
}

interface StageOption {
  value: string;
  label: string;
}

interface OwnerOption {
  value: string;
  label: string;
}

interface OpportunityEditorModalProps {
  open: boolean;
  editing: boolean;
  form: FormInstance;
  onCancel: () => void;
  onSubmit: () => void;
  projectOptions: ProjectOption[];
  ownerOptions: OwnerOption[];
  stageOptions: StageOption[];
}

export function OpportunityEditorModal(props: OpportunityEditorModalProps) {
  const { open, editing, form, onCancel, onSubmit, projectOptions, ownerOptions, stageOptions } =
    props;

  return (
    <Modal
      title={editing ? "编辑商机" : "新建商机"}
      open={open}
      onCancel={onCancel}
      onOk={onSubmit}
      okText="保存"
      cancelText="取消"
      destroyOnHidden
    >
      <Form layout="vertical" form={form}>
        <Form.Item
          label="商机名称"
          name="name"
          rules={[{ required: true, message: "请输入商机名称" }]}
        >
          <Input placeholder="例如：总部统一安全接入方案" />
        </Form.Item>
        <Form.Item label="客户名称" name="customerName">
          <Input placeholder="例如：某某集团" />
        </Form.Item>
        <Form.Item
          label="所属项目"
          name="projectBindingMode"
          initialValue="new"
          rules={[{ required: true, message: "请选择项目绑定方式" }]}
          extra="商机必须显式绑定到一个项目主线。可挂到已有项目，也可新建一个项目。"
        >
          <Radio.Group
            options={[
              { label: "绑定已有项目", value: "existing" },
              { label: "新建项目并绑定", value: "new" },
            ]}
          />
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prev, next) => prev.projectBindingMode !== next.projectBindingMode}
        >
          {({ getFieldValue }) =>
            getFieldValue("projectBindingMode") === "existing" ? (
              <Form.Item
                label="选择已有项目"
                name="existingProjectKey"
                rules={[{ required: true, message: "请选择所属项目" }]}
              >
                <Select
                  showSearch
                  placeholder="请选择已有项目"
                  optionFilterProp="label"
                  options={projectOptions}
                />
              </Form.Item>
            ) : (
              <Form.Item
                label="新项目名称"
                name="newProjectName"
                rules={[{ required: true, message: "请输入项目名称" }]}
              >
                <Input placeholder="例如：总部统一安全接入方案项目" />
              </Form.Item>
            )
          }
        </Form.Item>
        <Form.Item label="销售负责人" name="ownerUsername">
          <Select allowClear placeholder="请选择销售负责人" options={ownerOptions} />
        </Form.Item>
        <Form.Item
          label="阶段"
          name="stage"
          rules={[{ required: true, message: "请选择商机阶段" }]}
          initialValue="discovery"
        >
          <Select options={stageOptions} />
        </Form.Item>
        <Form.Item label="预期价值（元）" name="expectedValue">
          <Input placeholder="例如：5000000" />
        </Form.Item>
        <Form.Item label="成功概率（0-100）" name="probability">
          <Input placeholder="例如：60" />
        </Form.Item>
        <Form.Item label="预计关闭时间" name="expectedCloseDate">
          <Input placeholder="例如：2024-06-30" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
