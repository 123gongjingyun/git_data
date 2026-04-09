import { Button, Input, Modal, Select, Typography, Upload } from "antd";
import {
  getSharedTeamMemberLabel,
  loadSharedTeamMembers,
} from "../../shared/teamDirectory";
import {
  buildSnapshotApprovalRecords,
  getApiApprovalActionLabel,
  getRejectedWorkflowNodeIndex,
  getWorkflowNodeApproverUsernames,
  getWorkflowNodeDisabledReason,
  getWorkflowNodeDocumentName,
  getWorkflowNodeStatusMeta,
} from "./opportunityApprovalRuntime";
import {
  buildLocalAssignmentPlan,
  buildLocalDecisionPlan,
  buildLocalUploadPlan,
  type LocalOpportunityApprovalPlan,
} from "./opportunityApprovalLocalPlan";

const { Text } = Typography;

type ApprovalNodeLike = {
  id: string | number;
  name?: string;
  nodeName?: string;
  nodeType: "approval" | "upload" | "assignment" | string;
  fieldKey?: string;
  fieldLabel?: string;
  actionButtonLabel?: string;
  approverRole?: string;
  description?: string | null;
  canReject?: boolean;
  status?: "pending" | "in_progress" | "approved" | "rejected" | "skipped";
  canCurrentUserHandle?: boolean;
  approvers?: Array<{
    resolvedUsers: Array<{
      username: string;
      displayName?: string | null;
    }>;
  }>;
};

type ApprovalRecordLike = {
  id: string | number;
  actorLabel: string;
  nodeName: string;
  actionType: "approve" | "reject" | "notify" | "upload" | "assign" | string;
  actionLabel: string;
  createdAt: string;
  fileName?: string;
  assignedToLabel?: string;
  comment?: string;
};

type ApprovalInstanceLike = {
  currentNodeId?: string | number | null;
  status?: "pending" | "in_progress" | "approved" | "rejected" | string;
  nodes: ApprovalNodeLike[];
  actions: Array<{
    id: string | number;
    actionType: "approve" | "reject" | "upload" | "assign" | string;
    approvalInstanceNodeId?: string | number | null;
    nodeName?: string | null;
    createdAt: string;
    comment?: string | null;
    operator?: {
      username: string;
      displayName?: string | null;
    } | null;
    payload?: {
      fileName?: string;
      assignedToUsername?: string;
    } | null;
  }>;
};

type ApprovalTargetLike = {
  name: string;
  stage: string;
  solutionOwnerUsername?: string;
  workflowRecords?: ApprovalRecordLike[];
};

interface OpportunityApprovalModalProps {
  open: boolean;
  approvalTarget: ApprovalTargetLike | null;
  opportunityWorkflowName?: string;
  approvalRuntimeSource: "api" | "local";
  opportunityWorkflowSource: "api" | "local";
  approvalUsesBusinessSnapshot: boolean;
  approvalInstanceLoading: boolean;
  opportunityWorkflowError: string | null;
  approvalInstanceError: string | null;
  approvalNodes: ApprovalNodeLike[];
  approvalInstance: ApprovalInstanceLike | null;
  approvalOpinionDraft: string;
  onApprovalOpinionDraftChange: (value: string) => void;
  onClose: () => void;
  onPreviewDocument: (title: string, fileName: string) => void;
  onDownloadDocument: (fileName: string) => void;
  onExecuteApiNodeAction: (
    target: ApprovalTargetLike,
    node: ApprovalNodeLike,
    action: "upload" | "assign" | "approve" | "reject",
    payload?: Record<string, unknown>,
  ) => Promise<void>;
  onApplyLocalApprovalPlan: (plan: LocalOpportunityApprovalPlan) => void;
  getSelectablePresalesOptions: Array<{ value: string; label: string }>;
  currentOperatorUsername?: string;
  canApproveOpportunities: boolean;
  canEditOpportunities: boolean;
}

export function OpportunityApprovalModal(props: OpportunityApprovalModalProps) {
  const {
    open,
    approvalTarget,
    opportunityWorkflowName,
    approvalRuntimeSource,
    opportunityWorkflowSource,
    approvalUsesBusinessSnapshot,
    approvalInstanceLoading,
    opportunityWorkflowError,
    approvalInstanceError,
    approvalNodes,
    approvalInstance,
    approvalOpinionDraft,
    onApprovalOpinionDraftChange,
    onClose,
    onPreviewDocument,
    onDownloadDocument,
    onExecuteApiNodeAction,
    onApplyLocalApprovalPlan,
    getSelectablePresalesOptions,
    currentOperatorUsername,
    canApproveOpportunities,
    canEditOpportunities,
  } = props;
  const sharedTeamMembers = loadSharedTeamMembers();
  const snapshotApprovalRecords =
    approvalTarget && approvalUsesBusinessSnapshot
      ? buildSnapshotApprovalRecords(
          approvalTarget,
          approvalNodes as any,
          getSharedTeamMemberLabel,
        )
      : [];

  return (
    <Modal
      title="商机审批流程"
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnHidden
    >
      {approvalTarget && (
        <>
          <div style={{ marginBottom: 24 }}>
            <Typography.Title level={4} style={{ marginBottom: 16 }}>
              {approvalTarget.name}
            </Typography.Title>
            <div
              style={{
                marginBottom: 12,
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
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--app-text-primary)",
                  }}
                >
                  当前商机审批流程：{opportunityWorkflowName || "标准商机审批流程"}
                </Text>
                <Text
                  type="secondary"
                  style={{ fontSize: 12, color: "var(--app-text-secondary)" }}
                >
                  流程来源：
                  {approvalRuntimeSource === "api"
                    ? "后端真实审批实例"
                    : opportunityWorkflowSource === "api"
                      ? "后端真实流程定义 + 本地审批回退"
                      : "本地回退模板"}
                </Text>
              </div>
              <Text
                type="secondary"
                style={{ fontSize: 12, color: "var(--app-text-secondary)" }}
              >
                流程定义来自“系统设置 &gt; 审批流程库”。当前商机页会优先加载后端真实审批实例；若当前商机尚未命中可用实例，再回退到前端演示链路。
              </Text>
              {approvalUsesBusinessSnapshot && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "#d46b08",
                  }}
                >
                  当前后端审批实例尚无历史动作记录，已按商机真实业务快照展示流程进度；该视图暂仅支持查看，不直接执行审批动作。
                </div>
              )}
              {approvalInstanceLoading && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#2563eb" }}>
                  正在加载真实审批实例...
                </div>
              )}
              {opportunityWorkflowError && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "#d46b08",
                  }}
                >
                  {opportunityWorkflowError}
                </div>
              )}
              {approvalInstanceError && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "#d46b08",
                  }}
                >
                  {approvalInstanceError}
                </div>
              )}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16,
              }}
            >
              {approvalNodes.map((node, index) => {
                const isApiNode = node.status != null;
                const rejectedNodeIndex = getRejectedWorkflowNodeIndex(
                  approvalTarget,
                  approvalNodes as any,
                  approvalUsesBusinessSnapshot ? null : approvalInstance,
                );
                const isPostRejectedNode = rejectedNodeIndex >= 0 && index > rejectedNodeIndex;
                const statusMeta = getWorkflowNodeStatusMeta(
                  approvalTarget,
                  node,
                  approvalUsesBusinessSnapshot ? null : approvalInstance,
                  { getSharedTeamMemberLabel },
                );
                const rawFileName = getWorkflowNodeDocumentName(
                  approvalTarget,
                  node.fieldKey as any,
                );
                const fileName = isPostRejectedNode ? "" : rawFileName;
                const isUploadNode = node.nodeType === "upload";
                const isAssignmentNode = node.nodeType === "assignment";
                const disabledReason = isPostRejectedNode
                  ? "流程已在前序节点驳回，后续节点不再执行。"
                  : approvalUsesBusinessSnapshot
                    ? "当前审批实例与业务进度尚未完成对齐，当前仅支持查看。"
                    : isApiNode
                      ? approvalInstance?.currentNodeId === node.id
                        ? node.canCurrentUserHandle
                          ? ""
                          : `当前节点待 ${node.approvers
                              ?.flatMap((item) => item.resolvedUsers)
                              .map(
                                (user) =>
                                  user.displayName || getSharedTeamMemberLabel(user.username),
                              )
                              .join(" / ") || "指定责任人"} 处理。`
                        : node.status === "approved" ||
                            node.status === "rejected" ||
                            node.status === "skipped"
                          ? "当前节点已处理完成。"
                          : approvalInstance?.status === "rejected"
                            ? "当前流程已驳回，后续节点仅支持查看。"
                            : "请先完成上一流程节点。"
                      : getWorkflowNodeDisabledReason({
                          workflowNodes: approvalNodes as any,
                          target: approvalTarget,
                          node: node as any,
                          index,
                          currentOperatorUsername,
                          canApproveOpportunities,
                          canEditOpportunities,
                          getSharedTeamMemberLabel,
                          sharedTeamMembers,
                        });
                const isActionDisabled = Boolean(disabledReason);
                const approverSummary = isApiNode
                  ? node.approvers
                      ?.flatMap((item) => item.resolvedUsers)
                      .map(
                        (user) =>
                          user.displayName || getSharedTeamMemberLabel(user.username),
                      )
                      .join(" / ")
                  : getWorkflowNodeApproverUsernames(approvalTarget, node as any, {
                      sharedTeamMembers,
                      getSharedTeamMemberLabel,
                    })
                      .map((username) => getSharedTeamMemberLabel(username))
                      .join(" / ");
                const displayStatusMeta = isApiNode
                  ? {
                      text:
                        node.status === "approved"
                          ? node.nodeType === "upload"
                            ? "已上传"
                            : node.nodeType === "assignment"
                              ? approverSummary || "已分配"
                              : "已通过"
                          : node.status === "rejected"
                            ? "已驳回"
                            : node.status === "in_progress"
                              ? "进行中"
                              : node.status === "skipped"
                                ? "已跳过"
                                : node.nodeType === "upload"
                                  ? "待上传"
                                  : node.nodeType === "assignment"
                                    ? "待分配"
                                    : "待审批",
                      color:
                        node.status === "approved"
                          ? "#4ade80"
                          : node.status === "rejected"
                            ? "#f87171"
                            : node.status === "in_progress"
                              ? "#f59e0b"
                              : "var(--app-text-secondary)",
                      active:
                        node.status === "approved" || node.status === "in_progress",
                    }
                  : statusMeta;
                const finalStatusMeta = isPostRejectedNode
                  ? {
                      text: "未执行",
                      color: "var(--app-text-secondary)",
                      active: false,
                    }
                  : displayStatusMeta;
                const cardBorder = finalStatusMeta.active
                  ? "var(--app-success-border)"
                  : "var(--app-border)";
                const cardBackground = finalStatusMeta.active
                  ? "var(--app-success-surface)"
                  : "linear-gradient(180deg, var(--app-surface) 0%, var(--app-surface-soft) 100%)";

                return (
                  <div
                    key={String(node.id)}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      border: `1px solid ${cardBorder}`,
                      background: cardBackground,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: "#1890ff",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 600,
                          fontSize: 14,
                          flexShrink: 0,
                        }}
                      >
                        {index + 1}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 500,
                            color: "var(--app-text-primary)",
                            marginBottom: 4,
                          }}
                        >
                          {node.nodeName || node.name}
                        </div>
                        <div style={{ fontSize: 12, color: finalStatusMeta.color }}>
                          {finalStatusMeta.text}
                        </div>
                        {node.description && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--app-text-secondary)",
                              marginTop: 4,
                            }}
                          >
                            {node.description}
                          </div>
                        )}
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--app-text-secondary)",
                            marginTop: 4,
                          }}
                        >
                          当前处理人：{approverSummary || "待配置"}
                        </div>
                      </div>
                    </div>

                    {isUploadNode && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          paddingLeft: 40,
                        }}
                      >
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <Upload
                            disabled={isActionDisabled}
                            showUploadList={false}
                            beforeUpload={
                              isApiNode
                                ? (async (file: File) => {
                                    await onExecuteApiNodeAction(
                                      approvalTarget,
                                      node,
                                      "upload",
                                      { fileName: file.name, value: file.name },
                                    );
                                    return false;
                                  }) as any
                                : ((file: File) => {
                                    onApplyLocalApprovalPlan(
                                      buildLocalUploadPlan(node, file.name),
                                    );
                                    return false;
                                  }) as any
                            }
                          >
                            <Button size="small" disabled={isActionDisabled}>
                              {node.actionButtonLabel || "上传文档"}
                            </Button>
                          </Upload>
                          {fileName && (
                            <>
                              <Button
                                size="small"
                                onClick={() =>
                                  onPreviewDocument(
                                    node.fieldLabel || node.nodeName || node.name || "审批文档",
                                    fileName,
                                  )
                                }
                              >
                                查看
                              </Button>
                              <Button
                                size="small"
                                onClick={() => onDownloadDocument(fileName)}
                              >
                                下载
                              </Button>
                            </>
                          )}
                        </div>
                        {fileName && (
                          <div style={{ fontSize: 12, color: "var(--app-text-secondary)" }}>
                            当前文档：{fileName}
                          </div>
                        )}
                        {disabledReason && (
                          <div style={{ fontSize: 12, color: "var(--app-text-secondary)" }}>
                            {disabledReason}
                          </div>
                        )}
                      </div>
                    )}

                    {isAssignmentNode && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          paddingLeft: 40,
                        }}
                      >
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {node.fieldLabel || "负责人分配"}
                        </Text>
                        <Select
                          size="small"
                          disabled={isActionDisabled}
                          style={{ width: "100%" }}
                          placeholder={node.actionButtonLabel || "选择负责人"}
                          value={isPostRejectedNode ? undefined : approvalTarget.solutionOwnerUsername}
                          onChange={(value) => {
                            if (isApiNode) {
                              void onExecuteApiNodeAction(approvalTarget, node, "assign", {
                                assignedToUsername: value,
                                value,
                              });
                              return;
                            }
                            onApplyLocalApprovalPlan(
                              buildLocalAssignmentPlan(node, value),
                            );
                          }}
                          options={getSelectablePresalesOptions}
                        />
                        {disabledReason && (
                          <div style={{ fontSize: 12, color: "var(--app-text-secondary)" }}>
                            {disabledReason}
                          </div>
                        )}
                      </div>
                    )}

                    {node.nodeType === "approval" && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          paddingLeft: 40,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--app-text-secondary)",
                          }}
                        >
                          审批对象：{approverSummary || node.approverRole || "待配置审批对象"}
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <Button
                            size="small"
                            type="primary"
                            disabled={isActionDisabled}
                            onClick={() => {
                              if (isApiNode) {
                                void onExecuteApiNodeAction(approvalTarget, node, "approve");
                                return;
                              }
                              onApplyLocalApprovalPlan(
                                buildLocalDecisionPlan({
                                  target: approvalTarget as any,
                                  node,
                                  opinion: approvalOpinionDraft,
                                  action: "approve",
                                }),
                              );
                            }}
                          >
                            通过
                          </Button>
                          <Button
                            size="small"
                            danger
                            disabled={isActionDisabled || node.canReject === false}
                            onClick={() => {
                              if (isApiNode) {
                                void onExecuteApiNodeAction(approvalTarget, node, "reject");
                                return;
                              }
                              onApplyLocalApprovalPlan(
                                buildLocalDecisionPlan({
                                  target: approvalTarget as any,
                                  node,
                                  opinion: approvalOpinionDraft,
                                  action: "reject",
                                }),
                              );
                            }}
                          >
                            驳回
                          </Button>
                        </div>
                        {disabledReason && (
                          <div style={{ fontSize: 12, color: "var(--app-text-secondary)" }}>
                            {disabledReason}
                          </div>
                        )}
                      </div>
                    )}
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
              {(approvalRuntimeSource === "api" && approvalInstance && !approvalUsesBusinessSnapshot
                ? [...approvalInstance.actions]
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                    .map((record) => {
                      const accentColor =
                        record.actionType === "approve"
                          ? "#4ade80"
                          : record.actionType === "reject"
                            ? "#f87171"
                            : "#f59e0b";
                      const operatorUsername = record.operator?.username || "system";
                      return (
                        <div
                          key={`api_action_${record.id}`}
                          style={{
                            padding: 12,
                            borderRadius: 10,
                            background: "var(--app-surface-soft)",
                            border: `1px solid color-mix(in srgb, ${accentColor} 24%, var(--app-border) 76%)`,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 6,
                              gap: 12,
                            }}
                          >
                            <strong style={{ color: "var(--app-text-primary)" }}>
                              {record.operator?.displayName ||
                                getSharedTeamMemberLabel(operatorUsername)}
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
                              approvalInstance.nodes.find(
                                (item) => item.id === record.approvalInstanceNodeId,
                              ) || null,
                            )}
                          </div>
                          {record.payload?.fileName && (
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--app-text-secondary)",
                                marginTop: 4,
                              }}
                            >
                              文档：{record.payload.fileName}
                            </div>
                          )}
                          {record.payload?.assignedToUsername && (
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--app-text-secondary)",
                                marginTop: 4,
                              }}
                            >
                              分配给：
                              {getSharedTeamMemberLabel(record.payload.assignedToUsername)}
                            </div>
                          )}
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
                    })
                : (approvalUsesBusinessSnapshot
                  ? snapshotApprovalRecords
                  : (approvalTarget.workflowRecords || []))
                    .slice()
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                    .map((record) => {
                      const accentColor =
                        record.actionType === "approve"
                          ? "#4ade80"
                          : record.actionType === "reject"
                            ? "#f87171"
                            : record.actionType === "notify"
                              ? "#60a5fa"
                              : "#f59e0b";
                      return (
                        <div
                          key={record.id}
                          style={{
                            padding: 12,
                            borderRadius: 10,
                            background: "var(--app-surface-soft)",
                            border: `1px solid color-mix(in srgb, ${accentColor} 24%, var(--app-border) 76%)`,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 6,
                              gap: 12,
                            }}
                          >
                            <strong style={{ color: "var(--app-text-primary)" }}>
                              {record.actorLabel}
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
                            {record.nodeName} · {record.actionLabel}
                          </div>
                          {record.fileName && (
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--app-text-secondary)",
                                marginTop: 4,
                              }}
                            >
                              文档：{record.fileName}
                            </div>
                          )}
                          {record.assignedToLabel && (
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--app-text-secondary)",
                                marginTop: 4,
                              }}
                            >
                              分配给：{record.assignedToLabel}
                            </div>
                          )}
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
                    }))}
              {(() => {
                const hasApiRecords = Boolean(
                  approvalRuntimeSource === "api" &&
                    approvalInstance &&
                    !approvalUsesBusinessSnapshot &&
                    approvalInstance.actions.length > 0,
                );
                const hasSnapshotRecords =
                  approvalUsesBusinessSnapshot && snapshotApprovalRecords.length > 0;
                const hasLocalRecords =
                  !approvalUsesBusinessSnapshot &&
                  approvalRuntimeSource !== "api" &&
                  Boolean(approvalTarget.workflowRecords?.length);
                if (hasApiRecords || hasSnapshotRecords || hasLocalRecords) {
                  return null;
                }
                return (
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      border: "1px solid var(--app-border)",
                      background: "var(--app-surface-soft)",
                      color: "var(--app-text-secondary)",
                    }}
                  >
                    当前暂无流程记录，待首个节点开始处理后自动生成。
                  </div>
                );
              })()}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <Typography.Title level={5} style={{ marginBottom: 12 }}>
              添加审批意见
            </Typography.Title>
            <Input.TextArea
              rows={4}
              placeholder="请输入审批意见或处理说明..."
              style={{ marginBottom: 12 }}
              value={approvalOpinionDraft}
              onChange={(event) => onApprovalOpinionDraftChange(event.target.value)}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              审批动作请在对应流程节点内完成。只有当前节点处理人可以执行上传、分配、通过或驳回。
            </Text>
          </div>
        </>
      )}
    </Modal>
  );
}
