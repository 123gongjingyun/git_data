import {
  ArrowRightOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  StopFilled,
} from "@ant-design/icons";
import { Button, Card, Modal, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

interface ProjectRowLike {
  key: string;
  name: string;
  customer: string;
  status: "inprogress" | "completed" | "archived";
  stage: string;
  priority: "high" | "medium" | "low";
  budget: string;
  startDate: string;
  salesOwner: string;
  industryOwner: string;
  preSalesOwner: string;
  relatedOpportunities: number;
  solutionVersions: number;
  expectedCloseDate: string;
  winProbability: number;
}

interface RelatedOpportunityRowLike {
  key: string;
  opportunityCode?: string;
  name: string;
  customer: string;
  stage: string;
  amount: string;
  owner: string;
  probability: number;
  expectedCloseDate: string;
}

interface TimelineStageLike {
  key: string;
  title: string;
  description: string;
  target: "opportunities" | "solutions" | "bids" | "contracts";
}

interface ProjectDetailModalProps {
  open: boolean;
  currentProject: ProjectRowLike | null;
  relatedSortKey: string;
  onRelatedSortKeyChange: (value: string) => void;
  canCreateOpportunities: boolean;
  onOpenCreateRelated: () => void;
  relatedRows: RelatedOpportunityRowLike[];
  relatedColumnsWithActions: ColumnsType<RelatedOpportunityRowLike>;
  timelineStages: TimelineStageLike[];
  getStageNavigationState: (
    currentStage: string,
    targetStage: string,
  ) => "completed" | "current" | "future";
  navigateToStageModule: (
    project: ProjectRowLike,
    stageKey: string,
    target: TimelineStageLike["target"],
  ) => void;
  getProjectStageText: (stage: string) => string;
  renderStatus: (status: ProjectRowLike["status"]) => React.ReactNode;
  renderPriority: (priority: ProjectRowLike["priority"]) => React.ReactNode;
  onClose: () => void;
}

export function ProjectDetailModal(props: ProjectDetailModalProps) {
  const {
    open,
    currentProject,
    relatedSortKey,
    onRelatedSortKeyChange,
    canCreateOpportunities,
    onOpenCreateRelated,
    relatedRows,
    relatedColumnsWithActions,
    timelineStages,
    getStageNavigationState,
    navigateToStageModule,
    getProjectStageText,
    renderStatus,
    renderPriority,
    onClose,
  } = props;

  return (
    <Modal
      title="项目详情"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
      width={720}
    >
      {currentProject && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div>
              <strong>项目名称：</strong>
              <br />
              {currentProject.name}
            </div>
            <div>
              <strong>客户名称：</strong>
              <br />
              {currentProject.customer}
            </div>
            <div>
              <strong>项目状态：</strong>
              <br />
              {renderStatus(currentProject.status)}
            </div>
            <div>
              <strong>项目阶段：</strong>
              <br />
              {getProjectStageText(currentProject.stage)}
            </div>
            <div>
              <strong>预算金额：</strong>
              <br />
              {currentProject.budget}
            </div>
            <div>
              <strong>优先级：</strong>
              <br />
              {renderPriority(currentProject.priority)}
            </div>
            <div>
              <strong>开始时间：</strong>
              <br />
              {currentProject.startDate}
            </div>
            <div>
              <strong>销售负责人：</strong>
              <br />
              {currentProject.salesOwner}
            </div>
            <div>
              <strong>预计签约：</strong>
              <br />
              {currentProject.expectedCloseDate}
            </div>
            <div>
              <strong>成交概率：</strong>
              <br />
              {currentProject.winProbability}%
            </div>
            <div>
              <strong>所属行业负责人：</strong>
              <br />
              {currentProject.industryOwner}
            </div>
            <div>
              <strong>售前负责人：</strong>
              <br />
              {currentProject.preSalesOwner}
            </div>
            <div>
              <strong>关联商机数：</strong>
              <br />
              {currentProject.relatedOpportunities}
            </div>
            <div>
              <strong>方案版本数：</strong>
              <br />
              {currentProject.solutionVersions}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <strong>项目描述：</strong>
            <p
              style={{
                marginTop: 8,
                color: "#595959",
                lineHeight: 1.6,
              }}
            >
              为{currentProject.customer}
              提供全面的项目实施服务，具体范围和交付内容可根据实际需求进行扩展。
            </p>
          </div>

          <div style={{ marginBottom: 24 }}>
            <strong>关联商机列表：</strong>
            <p
              style={{
                marginTop: 8,
                color: "#8c8c8c",
                fontSize: 12,
              }}
            >
              当前列表已按“项目主线”显式绑定展示，只显示归属于该项目的商机。不再按客户名称自动混合其他项目的商机，后续可直接替换为真实 Opportunity 实体查询结果。
            </p>
            <Card size="small" bordered={false}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: 12, color: "#595959" }}>排序：</span>
                  <Select
                    size="small"
                    style={{ width: 200 }}
                    value={relatedSortKey}
                    onChange={onRelatedSortKeyChange}
                    options={[
                      {
                        value: "probability_desc",
                        label: "按成交概率（从高到低）",
                      },
                      {
                        value: "amount_desc",
                        label: "按金额（从高到低）",
                      },
                      {
                        value: "amount_asc",
                        label: "按金额（从低到高）",
                      },
                    ]}
                  />
                </div>
                <Button
                  size="small"
                  type="primary"
                  disabled={!canCreateOpportunities || currentProject.status === "completed"}
                  onClick={onOpenCreateRelated}
                >
                  + 新建关联商机
                </Button>
              </div>
              {currentProject.status === "completed" && (
                <div
                  style={{
                    marginBottom: 12,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "rgba(240, 249, 255, 0.8)",
                    border: "1px solid rgba(125, 211, 252, 0.45)",
                    color: "#475569",
                    fontSize: 12,
                  }}
                >
                  当前项目已处于“已完成 / 签约中标”状态，项目主线已封板，不再允许继续新增关联商机。如需推进新的销售机会，请新建项目或将商机绑定到其他进行中的项目。
                </div>
              )}
              <Table<RelatedOpportunityRowLike>
                size="small"
                rowKey="key"
                pagination={false}
                dataSource={relatedRows}
                columns={relatedColumnsWithActions}
              />
            </Card>
          </div>

          <div style={{ marginBottom: 24 }}>
            <strong>项目进度时间线：</strong>
            <div style={{ marginTop: 8, marginBottom: 12, color: "#8c8c8c", fontSize: 12 }}>
              已走过和当前阶段可点击并跳转到对应业务模块；未进入的阶段置灰禁用。
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginTop: 16,
              }}
            >
              {timelineStages.map((item, index) => {
                const state = getStageNavigationState(currentProject.stage, item.key);
                const clickable = state !== "future";
                const borderColor =
                  state === "completed"
                    ? "rgba(34, 197, 94, 0.34)"
                    : state === "current"
                      ? "rgba(59, 130, 246, 0.34)"
                      : "var(--app-border)";
                const background =
                  state === "completed"
                    ? "linear-gradient(135deg, color-mix(in srgb, rgba(34,197,94,0.16) 72%, var(--app-surface) 28%) 0%, var(--app-surface-soft) 100%)"
                    : state === "current"
                      ? "linear-gradient(135deg, color-mix(in srgb, rgba(59,130,246,0.16) 72%, var(--app-surface) 28%) 0%, var(--app-surface-soft) 100%)"
                      : "linear-gradient(180deg, var(--app-surface) 0%, var(--app-surface-soft) 100%)";
                const titleColor =
                  state === "future" ? "var(--app-text-muted)" : "var(--app-text-primary)";
                const descColor =
                  state === "future"
                    ? "var(--app-text-muted)"
                    : "var(--app-text-secondary)";
                const badgeText =
                  state === "completed" ? "已完成" : state === "current" ? "当前阶段" : "未进入";
                const badgeColor =
                  state === "completed"
                    ? "#22c55e"
                    : state === "current"
                      ? "#3b82f6"
                      : "#94a3b8";
                const icon =
                  state === "completed" ? (
                    <CheckCircleFilled style={{ color: "#52c41a", fontSize: 18 }} />
                  ) : state === "current" ? (
                    <ClockCircleFilled style={{ color: "#1677ff", fontSize: 18 }} />
                  ) : (
                    <StopFilled style={{ color: "#bfbfbf", fontSize: 18 }} />
                  );

                return (
                  <div
                    key={item.key}
                    role={clickable ? "button" : undefined}
                    tabIndex={clickable ? 0 : -1}
                    onClick={() => {
                      if (!clickable) {
                        return;
                      }
                      navigateToStageModule(currentProject, item.key, item.target);
                    }}
                    onKeyDown={(event) => {
                      if (!clickable) {
                        return;
                      }
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigateToStageModule(currentProject, item.key, item.target);
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: 16,
                      border: `1px solid ${borderColor}`,
                      borderRadius: 12,
                      background,
                      cursor: clickable ? "pointer" : "not-allowed",
                      opacity: clickable ? 1 : 0.78,
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div style={{ marginTop: 2 }}>{icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ fontSize: 12, color: "#8c8c8c" }}>阶段 {index + 1}</span>
                          <span style={{ fontWeight: 600, color: titleColor }}>{item.title}</span>
                          <Tag color={badgeColor} style={{ marginInlineEnd: 0 }}>
                            {badgeText}
                          </Tag>
                        </div>
                        {clickable ? (
                          <span
                            style={{
                              color: badgeColor,
                              fontSize: 12,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            查看该阶段数据
                            <ArrowRightOutlined />
                          </span>
                        ) : (
                          <span style={{ color: "#bfbfbf", fontSize: 12 }}>未进入该阶段</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 6 }}>
                        {item.key === currentProject.stage
                          ? "当前所在阶段"
                          : state === "completed"
                            ? "已完成阶段"
                            : "后续阶段"}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: descColor,
                          marginTop: 6,
                          lineHeight: 1.6,
                        }}
                      >
                        {item.description}
                      </div>
                    </div>
                  </div>
                );
              })}
              {currentProject.stage === "lost" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: 16,
                    border: "1px solid #ffccc7",
                    borderRadius: 12,
                    background: "#fff2f0",
                  }}
                >
                  <StopFilled style={{ color: "#ff4d4f", fontSize: 18, marginTop: 2 }} />
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontWeight: 600, color: "#cf1322" }}>丢单终态</span>
                      <Tag color="error" style={{ marginInlineEnd: 0 }}>
                        当前阶段
                      </Tag>
                    </div>
                    <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 6 }}>
                      当前项目已在售前流程中终止，后续阶段不可跳转。
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#595959",
                        marginTop: 6,
                        lineHeight: 1.6,
                      }}
                    >
                      已走过阶段仍可点击回看对应模块数据，未经过的阶段保持禁用。
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
