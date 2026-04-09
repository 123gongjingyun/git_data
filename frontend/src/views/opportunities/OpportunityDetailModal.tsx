import { Button, Modal, Timeline, Typography } from "antd";

const { Text, Paragraph } = Typography;

interface DetailStepLike {
  title: string;
  statusText: string;
  tone: "default" | "success" | "warning" | "danger";
}

interface DetailOpportunityLike {
  id: number;
  name: string;
  customerName?: string;
  ownerUsername?: string;
  stage?: string;
  approvalStatus?: string;
  expectedValue?: string;
  probability?: number;
  weightedValue?: string;
  expectedCloseDate?: string;
  requirementBriefDocName?: string;
  researchDocName?: string;
  projectName?: string;
}

interface OpportunityDetailModalProps {
  open: boolean;
  detailOpportunity: DetailOpportunityLike | null;
  detailApprovalLoading: boolean;
  detailApprovalError: string | null;
  detailSteps: DetailStepLike[];
  getSalesOwnerLabel: (value?: string) => string;
  getProgressLabel: (stage?: string) => string;
  getApprovalStatusLabel: (status?: string) => string;
  onClose: () => void;
  onPreviewDocument: (title: string, fileName: string) => void;
  onDownloadDocument: (fileName: string) => void;
  onNavigateToProject: () => void;
  onAdvanceStage: () => void;
}

export function OpportunityDetailModal(props: OpportunityDetailModalProps) {
  const {
    open,
    detailOpportunity,
    detailApprovalLoading,
    detailApprovalError,
    detailSteps,
    getSalesOwnerLabel,
    getProgressLabel,
    getApprovalStatusLabel,
    onClose,
    onPreviewDocument,
    onDownloadDocument,
    onNavigateToProject,
    onAdvanceStage,
  } = props;

  return (
    <Modal
      title={detailOpportunity ? `商机详情：${detailOpportunity.name}` : "商机详情"}
      open={open}
      onCancel={onClose}
      onOk={onClose}
      width={720}
    >
      {detailOpportunity && (
        <>
          <div style={{ marginBottom: 24 }}>
            <Text strong>商机转化流程</Text>
            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              {detailSteps.map((step, index) => {
                let bgColor =
                  "linear-gradient(180deg, var(--app-surface) 0%, var(--app-surface-soft) 100%)";
                let borderColor = "var(--app-border)";
                let textColor = "var(--app-text-secondary)";

                if (step.tone === "success") {
                  bgColor = "var(--app-success-surface)";
                  borderColor = "var(--app-success-border)";
                  textColor = "#4ade80";
                } else if (step.tone === "danger") {
                  bgColor = "var(--app-danger-surface)";
                  borderColor = "var(--app-danger-border)";
                  textColor = "#f87171";
                } else if (step.tone === "warning") {
                  bgColor = "var(--app-warning-surface)";
                  borderColor = "var(--app-warning-border)";
                  textColor = "#fbbf24";
                }

                return (
                  <div
                    key={step.title}
                    style={{
                      flex: 1,
                      minWidth: 160,
                      padding: 12,
                      borderRadius: 4,
                      border: `1px solid ${borderColor}`,
                      background: bgColor,
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
                        background: "#1890ff",
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
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span
                        style={{
                          fontWeight: 500,
                          color: "var(--app-text-primary)",
                        }}
                      >
                        {step.title}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: textColor,
                        }}
                      >
                        {step.statusText}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {(detailApprovalLoading || detailApprovalError) && (
              <div style={{ marginTop: 8 }}>
                {detailApprovalLoading && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    正在加载真实审批过程...
                  </Text>
                )}
                {!detailApprovalLoading && detailApprovalError && (
                  <Text type="warning" style={{ fontSize: 12 }}>
                    {detailApprovalError}
                  </Text>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">客户</Text>
                <div>{detailOpportunity.customerName || "-"}</div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">销售负责人</Text>
                <div>{getSalesOwnerLabel(detailOpportunity.ownerUsername)}</div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">进度</Text>
                <div>{getProgressLabel(detailOpportunity.stage)}</div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">审批结果</Text>
                <div>{getApprovalStatusLabel(detailOpportunity.approvalStatus)}</div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">预期价值</Text>
                <div>{detailOpportunity.expectedValue || "-"}</div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">成功概率</Text>
                <div>
                  {detailOpportunity.probability != null
                    ? `${detailOpportunity.probability}%`
                    : "-"}
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">加权价值</Text>
                <div>{detailOpportunity.weightedValue || "-"}</div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">预计关闭时间</Text>
                <div>{detailOpportunity.expectedCloseDate || "-"}</div>
              </div>
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">审批文档</Text>
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {[
                    {
                      title: "需求说明文档",
                      fileName: detailOpportunity.requirementBriefDocName,
                    },
                    {
                      title: "需求调研文档",
                      fileName: detailOpportunity.researchDocName,
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid var(--app-border)",
                        background: "var(--app-surface-soft)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              color: "var(--app-text-primary)",
                              fontWeight: 500,
                            }}
                          >
                            {item.title}
                          </div>
                          <div
                            style={{
                              color: "var(--app-text-secondary)",
                              fontSize: 12,
                            }}
                          >
                            {item.fileName || "暂无文件"}
                          </div>
                        </div>
                        {item.fileName && (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Button
                              size="small"
                              onClick={() => onPreviewDocument(item.title, item.fileName as string)}
                            >
                              查看
                            </Button>
                            <Button
                              size="small"
                              onClick={() => onDownloadDocument(item.fileName as string)}
                            >
                              下载
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <Button type="link" size="small" onClick={onNavigateToProject}>
                  跳转到项目管理（按项目名称过滤）
                </Button>
              </div>
              <div style={{ marginTop: 16 }}>
                <Button type="primary" size="small" onClick={onAdvanceStage}>
                  推进阶段（方案提报）
                </Button>
                <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
                  当前阶段流转用于演示审批推进，不会直接写入后端。
                </Paragraph>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <Text type="secondary" style={{ marginBottom: 8, display: "block" }}>
                商机推进时间线
              </Text>
              <Timeline
                items={[
                  {
                    color:
                      detailOpportunity.requirementBriefDocName &&
                      detailOpportunity.stage !== "lost"
                        ? "green"
                        : detailOpportunity.stage === "lost"
                          ? "red"
                          : "gray",
                    children: "线索确认 —— 客户提出初步需求（需求说明文档）",
                  },
                  {
                    color:
                      detailOpportunity.researchDocName &&
                      detailOpportunity.stage !== "lost"
                        ? "green"
                        : detailOpportunity.stage === "lost"
                          ? "red"
                          : "gray",
                    children: "需求澄清 —— 完成需求访谈与澄清（调研文档）",
                  },
                  {
                    color: "gray",
                    children: `方案设计阶段 —— 输出方案文档并完成内部评审（预计完成：${
                      detailOpportunity.expectedCloseDate || "待定"
                    }）`,
                  },
                  {
                    color: "gray",
                    children: `投标阶段 —— 准备并提交投标文件（预计完成：${
                      detailOpportunity.expectedCloseDate || "待定"
                    }）`,
                  },
                  {
                    color: "gray",
                    children: `谈判阶段 —— 与客户就条款进行谈判（预计结束：${
                      detailOpportunity.expectedCloseDate || "待定"
                    }）`,
                  },
                  {
                    color: "gray",
                    children: `结果待定 —— 等待评标结果或内部决策（预计结果时间：${
                      detailOpportunity.expectedCloseDate || "待定"
                    }）`,
                  },
                ]}
              />
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
