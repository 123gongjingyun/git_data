import { Button, Form, Input as AntInput, Modal, Select, Switch, Typography } from "antd";
import type { FormInstance } from "antd/es/form";

const { Text } = Typography;

interface WorkflowNodeOption {
  value: string;
  label: string;
}

interface WorkflowEditorNodeLike {
  id: string | number;
  name: string;
  approverRole?: string;
  nodeType?: string;
  fieldKey?: string;
  fieldLabel?: string;
  actionButtonLabel?: string;
  approvers?: Array<{
    approverType?: "user" | "role" | "field";
    approverRef?: string;
    displayName?: string;
    voteRule?: "any" | "all";
    sortOrder?: number;
  }>;
  description?: string;
  canReject?: boolean;
}

interface WorkflowEditorModalProps {
  open: boolean;
  mode: "create" | "edit";
  workflowForm: FormInstance;
  onCancel: () => void;
  onSubmit: () => void;
  workflowEditorNodes: WorkflowEditorNodeLike[];
  handleAddWorkflowNode: () => void;
  handleUpdateWorkflowNode: (
    nodeId: string,
    patch: Partial<WorkflowEditorNodeLike>,
  ) => void;
  handleRemoveWorkflowNode: (nodeId: string) => void;
  canDeleteWorkflow: boolean;
  workflowNodeTypeOptions: WorkflowNodeOption[];
  opportunityWorkflowFieldOptions: WorkflowNodeOption[];
}

export function WorkflowEditorModal(props: WorkflowEditorModalProps) {
  const {
    open,
    mode,
    workflowForm,
    onCancel,
    onSubmit,
    workflowEditorNodes,
    handleAddWorkflowNode,
    handleUpdateWorkflowNode,
    handleRemoveWorkflowNode,
    canDeleteWorkflow,
    workflowNodeTypeOptions,
    opportunityWorkflowFieldOptions,
  } = props;

  return (
    <Modal
      title={mode === "edit" ? "编辑审批流程" : "新建审批流程"}
      open={open}
      onCancel={onCancel}
      onOk={onSubmit}
      okText="保存"
      cancelText="取消"
      destroyOnClose
    >
      <Form layout="vertical" form={workflowForm}>
        <Form.Item
          label="流程名称"
          name="name"
          rules={[{ required: true, message: "请输入流程名称" }]}
        >
          <AntInput placeholder="例如：标准商机审批流程 / 标准解决方案审批流程" />
        </Form.Item>
        <Form.Item
          label="适用模块"
          name="target"
          rules={[{ required: true, message: "请选择适用模块" }]}
        >
          <Select
            options={[
              { value: "opportunity", label: "商机管理" },
              { value: "solution", label: "解决方案管理" },
            ]}
          />
        </Form.Item>
        <Form.Item label="流程说明" name="description">
          <AntInput.TextArea
            rows={2}
            placeholder="例如：适用于商机立项审批 / 方案版本评审审批"
          />
        </Form.Item>
        <Form.Item label="适用商机" name="applicableOpportunity">
          <AntInput placeholder="优先填写商机名称或客户关键词，例如：银行 / 总部统一安全 / 智慧园区" />
        </Form.Item>
        <Form.Item label="是否启用" name="enabled" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>

      <div
        style={{
          marginTop: 12,
          marginBottom: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 500 }}>审批节点配置</div>
        <Button type="dashed" size="small" onClick={handleAddWorkflowNode}>
          + 添加审批节点
        </Button>
      </div>
      {workflowEditorNodes.length === 0 && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          当前尚未添加任何审批节点，可点击“添加审批节点”配置节点名称与审批对象，例如：线索确认 / 项目启动 / 需求分析 / 最终审批 或 技术评审 / 商务评审 / 最终审批。
        </Text>
      )}
      {workflowEditorNodes.length > 0 && (
        <div
          className="app-scrollbar"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginTop: 4,
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {workflowEditorNodes.map((node, index) => (
            <div
              key={node.id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: 10,
                border: "1px solid var(--app-border)",
                borderRadius: 6,
                background: "var(--app-surface-soft)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px minmax(0, 1.3fr) minmax(0, 1fr) auto",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 24,
                    textAlign: "center",
                    fontSize: 12,
                    color: "#8c8c8c",
                  }}
                >
                  {index + 1}
                </div>
                <AntInput
                  size="small"
                  placeholder="节点名称，例如：线索确认 / 技术评审"
                  value={node.name}
                  onChange={(e) =>
                    handleUpdateWorkflowNode(String(node.id), {
                      name: e.target.value,
                    })
                  }
                />
                <AntInput
                  size="small"
                  placeholder="审批对象名称，例如：销售负责人 / 技术评审专家 / zhangsan"
                  value={node.approverRole}
                  onChange={(e) =>
                    handleUpdateWorkflowNode(String(node.id), {
                      approverRole: e.target.value,
                      approvers: [
                        {
                          approverType: "user",
                          approverRef: e.target.value,
                          displayName: e.target.value,
                          voteRule: "any",
                          sortOrder: 0,
                        },
                      ],
                    })
                  }
                />
                <Button
                  type="link"
                  size="small"
                  danger
                  disabled={!canDeleteWorkflow}
                  onClick={() => handleRemoveWorkflowNode(String(node.id))}
                >
                  删除
                </Button>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 8,
                }}
              >
                <Select
                  size="small"
                  value={node.nodeType || "approval"}
                  options={workflowNodeTypeOptions}
                  onChange={(value) =>
                    handleUpdateWorkflowNode(String(node.id), {
                      nodeType: value,
                      fieldKey:
                        value === "upload"
                          ? "requirementBriefDocName"
                          : value === "assignment"
                            ? "solutionOwnerUsername"
                            : "approvalStatus",
                    })
                  }
                />
                {workflowForm.getFieldValue("target") === "opportunity" && (
                  <Select
                    size="small"
                    value={node.fieldKey}
                    placeholder="选择节点绑定字段"
                    options={opportunityWorkflowFieldOptions}
                    onChange={(value) =>
                      handleUpdateWorkflowNode(String(node.id), {
                        fieldKey: value,
                      })
                    }
                  />
                )}
                <AntInput
                  size="small"
                  placeholder="界面字段名称，例如：需求调研文档 / 解决方案负责人"
                  value={node.fieldLabel}
                  onChange={(e) =>
                    handleUpdateWorkflowNode(String(node.id), {
                      fieldLabel: e.target.value,
                    })
                  }
                />
                <AntInput
                  size="small"
                  placeholder="按钮名称，例如：上传文档 / 选择负责人"
                  value={node.actionButtonLabel}
                  onChange={(e) =>
                    handleUpdateWorkflowNode(String(node.id), {
                      actionButtonLabel: e.target.value,
                    })
                  }
                />
                <Select
                  size="small"
                  value={node.approvers?.[0]?.approverType || "user"}
                  options={[
                    { value: "user", label: "指定用户" },
                    { value: "role", label: "角色对象" },
                    { value: "field", label: "字段对象" },
                  ]}
                  onChange={(value) =>
                    handleUpdateWorkflowNode(String(node.id), {
                      approvers: [
                        {
                          ...(node.approvers?.[0] || {
                            approverType: "user",
                            approverRef: "",
                            displayName: "",
                            voteRule: "any",
                            sortOrder: 0,
                          }),
                          approverType: value,
                        },
                      ],
                    })
                  }
                />
                <AntInput
                  size="small"
                  placeholder="审批对象标识，例如：sales_manager / solutionOwnerUsername"
                  value={node.approvers?.[0]?.approverRef}
                  onChange={(e) =>
                    handleUpdateWorkflowNode(String(node.id), {
                      approvers: [
                        {
                          ...(node.approvers?.[0] || {
                            approverType: "user",
                            voteRule: "any",
                            sortOrder: 0,
                          }),
                          approverRef: e.target.value,
                          displayName:
                            node.approverRole && node.approverRole.trim().length > 0
                              ? node.approverRole
                              : e.target.value,
                        },
                      ],
                    })
                  }
                />
                <AntInput
                  size="small"
                  placeholder="节点说明，例如：审批是否允许进入下一阶段"
                  value={node.description}
                  onChange={(e) =>
                    handleUpdateWorkflowNode(String(node.id), {
                      description: e.target.value,
                    })
                  }
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 8px",
                    border: "1px solid #d9d9d9",
                    borderRadius: 6,
                    background: "var(--app-surface-soft)",
                  }}
                >
                  <Text style={{ fontSize: 12 }}>允许驳回</Text>
                  <Switch
                    size="small"
                    checked={node.canReject ?? true}
                    onChange={(checked) =>
                      handleUpdateWorkflowNode(String(node.id), {
                        canReject: checked,
                      })
                    }
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 8px",
                    border: "1px solid #d9d9d9",
                    borderRadius: 6,
                    background: "var(--app-surface-soft)",
                    fontSize: 12,
                    color: "var(--app-text-secondary)",
                  }}
                >
                  驳回即结束流程
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
