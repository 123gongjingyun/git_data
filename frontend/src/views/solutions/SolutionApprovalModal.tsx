import { Button, Input, Modal, Typography } from "antd";
import type {
  ApprovalActionType,
  ApprovalInstanceActionView,
  ApprovalInstanceNodeView,
  ApprovalInstanceView,
} from "../../shared/approvalInstances";
import type { SolutionItem } from "../../shared/pipelineMock";

const { Text } = Typography;

type SolutionWorkflowStepLike = {
  key: string;
  title: string;
  approverLabel: string;
  statusText: string;
  tone: "success" | "warning" | "danger" | "default";
};

interface SolutionApprovalModalProps {
  open: boolean;
  activeSolution: SolutionItem | null;
  solutionWorkflowSteps: SolutionWorkflowStepLike[];
  currentPendingSolutionNodeKey: string | null;
  solutionApprovalSource: "api" | "local";
  solutionApprovalLoading: boolean;
  solutionApprovalError: string | null;
  canApproveCurrentSolutionNode: boolean;
  currentSolutionNodeDisabledReason: string;
  solutionApprovalInstance: ApprovalInstanceView | null;
  approvalOpinionDraft: string;
  onApprovalOpinionDraftChange: (value: string) => void;
  onClose: () => void;
  onSubmitLocal: (status: SolutionItem["status"]) => void;
  onExecuteApproval: (
    solution: SolutionItem,
    actionType: ApprovalActionType,
  ) => Promise<boolean>;
  getApiApprovalActionLabel: (
    action: ApprovalInstanceActionView,
    node?: ApprovalInstanceNodeView | null,
  ) => string;
}

export function SolutionApprovalModal(props: SolutionApprovalModalProps) {
  const {
    open,
    activeSolution,
    solutionWorkflowSteps,
    currentPendingSolutionNodeKey,
    solutionApprovalSource,
    solutionApprovalLoading,
    solutionApprovalError,
    canApproveCurrentSolutionNode,
    currentSolutionNodeDisabledReason,
    solutionApprovalInstance,
    approvalOpinionDraft,
    onApprovalOpinionDraftChange,
    onClose,
    onSubmitLocal,
    onExecuteApproval,
    getApiApprovalActionLabel,
  } = props;

  return (
    <Modal
      title="方案审批流程"
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnClose
    >
      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={4} style={{ marginBottom: 16 }}>
          {activeSolution?.name || "某银行数字化转型方案 v2.1"}
        </Typography.Title>
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 12,
            background:
              "linear-gradient(180deg, color-mix(in srgb, rgba(59,130,246,0.12) 58%, var(--app-surface) 42%) 0%, var(--app-surface-soft) 100%)",
            border: "1px solid var(--app-border)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
              gap: 12,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--app-text-primary)",
              }}
            >
              当前方案审批节点：
              {solutionWorkflowSteps.find(
                (item) => item.key === currentPendingSolutionNodeKey,
              )?.title || "已完成 / 无待处理节点"}
            </Text>
            <Text
              type="secondary"
              style={{ fontSize: 12, color: "var(--app-text-secondary)" }}
            >
              流程来源：
              {solutionApprovalSource === "api"
                ? "后端真实审批实例"
                : "前端演示链路"}
            </Text>
          </div>
          <Text
            type="secondary"
            style={{ fontSize: 12, color: "var(--app-text-secondary)" }}
          >
            流程按节点责任人逐步流转。所有成员均可查看流程进度与历史记录，仅当前节点处理人可执行上传、分配、通过或驳回。
          </Text>
          {solutionApprovalLoading && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#2563eb" }}>
              正在加载真实审批实例...
            </div>
          )}
          {solutionApprovalError && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#d46b08" }}>
              {solutionApprovalError}
            </div>
          )}
          {!canApproveCurrentSolutionNode && activeSolution && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#d46b08" }}>
              {currentSolutionNodeDisabledReason}
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          {solutionWorkflowSteps.map((step, index) => {
            const accentColor =
              step.tone === "success"
                ? "#52c41a"
                : step.tone === "warning"
                  ? "#fa8c16"
                  : step.tone === "danger"
                    ? "#f5222d"
                    : "#d9d9d9";
            const borderColor =
              step.tone === "default"
                ? "var(--app-border)"
                : `color-mix(in srgb, ${accentColor} 26%, var(--app-border) 74%)`;
            const background =
              step.tone === "default"
                ? "linear-gradient(135deg, var(--app-surface-soft) 0%, var(--app-surface) 100%)"
                : `linear-gradient(135deg, color-mix(in srgb, ${accentColor} 10%, var(--app-surface) 90%) 0%, var(--app-surface-soft) 100%)`;
            return (
              <div
                key={step.key}
                style={{
                  flex: 1,
                  minWidth: 180,
                  padding: 12,
                  borderRadius: 10,
                  border: `1px solid ${borderColor}`,
                  background,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: accentColor,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 500,
                    fontSize: 14,
                  }}
                >
                  {index + 1}
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 500,
                      color: "var(--app-text-primary)",
                    }}
                  >
                    {step.title}
                  </div>
                  <div style={{ fontSize: 12, color: accentColor }}>
                    {step.statusText}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--app-text-secondary)",
                      marginTop: 2,
                    }}
                  >
                    处理人：{step.approverLabel}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={5} style={{ marginBottom: 12 }}>
          审批记录
        </Typography.Title>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {solutionApprovalSource === "api" && solutionApprovalInstance ? (
            <>
              {solutionApprovalInstance.actions.length === 0 && (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid var(--app-border)",
                    background: "var(--app-surface-soft)",
                    color: "var(--app-text-secondary)",
                  }}
                >
                  当前暂无审批记录，待首个节点处理后自动生成。
                </div>
              )}
              {[...solutionApprovalInstance.actions]
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((record) => {
                  const accentColor =
                    record.actionType === "approve"
                      ? "#52c41a"
                      : record.actionType === "reject"
                        ? "#f5222d"
                        : "#fa8c16";
                  return (
                    <div
                      key={`solution_action_${record.id}`}
                      style={{
                        padding: 12,
                        background: `linear-gradient(135deg, color-mix(in srgb, ${accentColor} 10%, var(--app-surface) 90%) 0%, var(--app-surface-soft) 100%)`,
                        borderRadius: 10,
                        border: `1px solid color-mix(in srgb, ${accentColor} 26%, var(--app-border) 74%)`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 4,
                        }}
                      >
                        <strong>
                          {record.operator?.displayName ||
                            record.operator?.username ||
                            "系统"}
                        </strong>
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--app-text-secondary)",
                          }}
                        >
                          {new Date(record.createdAt).toLocaleString("zh-CN")}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: accentColor }}>
                        {record.nodeName || "审批动作"} ·{" "}
                        {getApiApprovalActionLabel(
                          record,
                          solutionApprovalInstance.nodes.find(
                            (item) => item.id === record.approvalInstanceNodeId,
                          ) || null,
                        )}
                      </div>
                      {record.comment && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--app-text-secondary)",
                            marginTop: 4,
                          }}
                        >
                          {record.comment}
                        </div>
                      )}
                    </div>
                  );
                })}
            </>
          ) : (
            <>
              <div
                style={{
                  padding: 12,
                  background:
                    "linear-gradient(135deg, color-mix(in srgb, #52c41a 10%, var(--app-surface) 90%) 0%, var(--app-surface-soft) 100%)",
                  borderRadius: 10,
                  border:
                    "1px solid color-mix(in srgb, #52c41a 26%, var(--app-border) 74%)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <strong>张三</strong>
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--app-text-secondary)",
                    }}
                  >
                    2024-01-15 14:30
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "#52c41a" }}>
                  ✓ 技术评审通过
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--app-text-secondary)",
                    marginTop: 4,
                  }}
                >
                  方案技术架构合理，符合客户需求。
                </div>
              </div>
              <div
                style={{
                  padding: 12,
                  background:
                    "linear-gradient(135deg, color-mix(in srgb, #fa8c16 10%, var(--app-surface) 90%) 0%, var(--app-surface-soft) 100%)",
                  borderRadius: 10,
                  border:
                    "1px solid color-mix(in srgb, #fa8c16 26%, var(--app-border) 74%)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <strong>李四</strong>
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--app-text-secondary)",
                    }}
                  >
                    2024-01-16 10:15
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "#fa8c16" }}>
                  ⏳ 商务评审中
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--app-text-secondary)",
                    marginTop: 4,
                  }}
                >
                  正在审核报价和商务条款。
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={5} style={{ marginBottom: 12 }}>
          添加审批意见
        </Typography.Title>
        <Input.TextArea
          rows={4}
          placeholder="请输入审批意见..."
          style={{ marginBottom: 12 }}
          value={approvalOpinionDraft}
          onChange={(event) => onApprovalOpinionDraftChange(event.target.value)}
        />
        {!canApproveCurrentSolutionNode && activeSolution && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            当前仅允许当前待处理节点责任人执行审批动作，其他成员保持只读查看。
          </Text>
        )}
        <div style={{ display: "flex", gap: 12 }}>
          <Button
            type="primary"
            disabled={!canApproveCurrentSolutionNode}
            onClick={() => {
              if (!activeSolution) {
                return;
              }
              if (solutionApprovalSource === "api") {
                void onExecuteApproval(activeSolution, "approve");
                return;
              }
              onSubmitLocal("approved");
            }}
          >
            ✓ 通过
          </Button>
          <Button
            danger
            disabled={!canApproveCurrentSolutionNode}
            onClick={() => {
              if (!activeSolution) {
                return;
              }
              if (solutionApprovalSource === "api") {
                void onExecuteApproval(activeSolution, "reject");
                return;
              }
              onSubmitLocal("rejected");
            }}
          >
            ✗ 驳回
          </Button>
        </div>
      </div>
    </Modal>
  );
}
