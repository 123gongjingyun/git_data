import { Button, Card, Table, Tag, Typography } from "antd";
import type { WorkflowDefinition, WorkflowNode } from "../../shared/workflowConfig";

const { Text } = Typography;

interface SettingsWorkflowPanelProps {
  canApproveWorkflow: boolean;
  canCreateWorkflow: boolean;
  canDeleteWorkflow: boolean;
  canEditWorkflow: boolean;
  selectedOpportunityWorkflowId: string | null;
  selectedSolutionWorkflowId: string | null;
  workflowError: string | null;
  workflowList: WorkflowDefinition[];
  workflowLoading: boolean;
  onCreateWorkflow: () => void;
  onDeleteWorkflow: (record: WorkflowDefinition) => void;
  onEditWorkflow: (record: WorkflowDefinition) => void;
  onReload: () => void | Promise<void>;
  onResetWorkflowLibraryToDefaults: () => void;
  onSetWorkflowAsDefault: (record: WorkflowDefinition) => void;
  onToggleWorkflowEnabled: (record: WorkflowDefinition) => void;
}

export function SettingsWorkflowPanel(props: SettingsWorkflowPanelProps) {
  const {
    canApproveWorkflow,
    canCreateWorkflow,
    canDeleteWorkflow,
    canEditWorkflow,
    selectedOpportunityWorkflowId,
    selectedSolutionWorkflowId,
    workflowError,
    workflowList,
    workflowLoading,
    onCreateWorkflow,
    onDeleteWorkflow,
    onEditWorkflow,
    onReload,
    onResetWorkflowLibraryToDefaults,
    onSetWorkflowAsDefault,
    onToggleWorkflowEnabled,
  } = props;

  return (
    <Card>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, color: "#595959" }}>审批流程库</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            在此集中配置商机管理与解决方案管理的审批流程。流程定义新增“适用商机”字段并排在最前面，用于按商机名称 / 客户关键词自动匹配流程；若未匹配到专用流程，则默认走标准流程。
          </Text>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button size="small" onClick={() => void onReload()}>
            重新加载
          </Button>
          <Button
            size="small"
            disabled={!canEditWorkflow}
            onClick={onResetWorkflowLibraryToDefaults}
          >
            恢复默认模板
          </Button>
          <Button
            type="primary"
            size="small"
            disabled={!canCreateWorkflow}
            onClick={onCreateWorkflow}
          >
            + 新建流程
          </Button>
        </div>
      </div>

      <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Tag color="blue">
          商机流程：{workflowList.filter((item) => item.target === "opportunity").length}
        </Tag>
        <Tag color="purple">
          解决方案流程：{workflowList.filter((item) => item.target === "solution").length}
        </Tag>
        {workflowLoading && <Text type="secondary">审批流程库加载中...</Text>}
        {workflowError && (
          <Text type="warning" style={{ fontSize: 12 }}>
            {workflowError}
          </Text>
        )}
      </div>

      <Table<WorkflowDefinition>
        size="small"
        rowKey="id"
        pagination={false}
        loading={workflowLoading}
        dataSource={workflowList}
        columns={[
          {
            title: "适用商机",
            dataIndex: "applicableOpportunity",
            key: "applicableOpportunity",
            render: (value?: string) =>
              value && value.trim().length > 0 ? (
                <Tag color="gold">{value}</Tag>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  未配置，自动走标准流程
                </Text>
              ),
          },
          {
            title: "流程名称",
            dataIndex: "name",
            key: "name",
          },
          {
            title: "适用模块",
            dataIndex: "target",
            key: "target",
            render: (target: WorkflowDefinition["target"]) =>
              target === "opportunity" ? "商机管理" : "解决方案管理",
          },
          {
            title: "节点数",
            dataIndex: "nodes",
            key: "nodes",
            render: (nodes: WorkflowNode[]) => (nodes && nodes.length > 0 ? nodes.length : 0),
          },
          {
            title: "状态",
            dataIndex: "enabled",
            key: "enabled",
            render: (enabled: boolean) => (
              <Tag color={enabled ? "green" : "default"}>{enabled ? "启用" : "停用"}</Tag>
            ),
          },
          {
            title: "默认关联",
            key: "default",
            render: (record: WorkflowDefinition) => {
              const isOppDefault =
                record.target === "opportunity" &&
                String(record.id) === selectedOpportunityWorkflowId;
              const isSolDefault =
                record.target === "solution" &&
                String(record.id) === selectedSolutionWorkflowId;
              if (!isOppDefault && !isSolDefault) {
                return (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    未设为默认
                  </Text>
                );
              }
              return (
                <>
                  {isOppDefault && (
                    <Tag color="blue" style={{ marginRight: 4 }}>
                      商机默认流程
                    </Tag>
                  )}
                  {isSolDefault && <Tag color="purple">解决方案默认流程</Tag>}
                </>
              );
            },
          },
          {
            title: "操作",
            key: "action",
            render: (record: WorkflowDefinition) => (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button
                  type="link"
                  size="small"
                  disabled={!canEditWorkflow}
                  onClick={() => onEditWorkflow(record)}
                >
                  编辑
                </Button>
                <Button
                  type="link"
                  size="small"
                  disabled={!canApproveWorkflow}
                  onClick={() => onSetWorkflowAsDefault(record)}
                >
                  设为默认
                </Button>
                <Button
                  type="link"
                  size="small"
                  disabled={!canEditWorkflow}
                  onClick={() => onToggleWorkflowEnabled(record)}
                >
                  {record.enabled ? "停用" : "启用"}
                </Button>
                <Button
                  type="link"
                  size="small"
                  danger
                  disabled={!canDeleteWorkflow}
                  onClick={() => onDeleteWorkflow(record)}
                >
                  删除
                </Button>
              </div>
            ),
          },
        ]}
      />
      <div style={{ marginTop: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          说明：商机管理与解决方案管理会优先读取各自模块下被设为默认的流程；流程节点中的审批人绑定结果将作为后续审批实例生成的基础配置。
        </Text>
      </div>
    </Card>
  );
}
