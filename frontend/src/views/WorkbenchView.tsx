import {
  Card,
  Row,
  Col,
  Table,
  Tag,
  Button,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import {
  hasSameDemoOpportunities,
  loadSharedDemoOpportunities,
  OPPORTUNITY_DEMO_UPDATED_EVENT,
  type DemoOpportunity,
} from "../shared/opportunityDemoData";
import {
  deriveBidsFromOpportunities,
  deriveContractsFromOpportunities,
  deriveSolutionsFromOpportunities,
} from "../shared/pipelineMock";
import {
  buildMonthlyPerformanceTrend,
  formatWanAmount,
  formatWanValue,
  getCurrentMonthKey,
  getCurrentMonthSignedAmount,
  getMonthKey,
  parseCurrencyAmount,
} from "../shared/analyticsSync";
import { syncSharedOpportunitiesFromApi } from "../shared/realOpportunities";

const { Text } = Typography;

interface WorkbenchViewProps {
  onNavigateToProjects?: (projectName?: string) => void;
  onNavigateToOpportunities?: (keyword?: string, stage?: string) => void;
  onNavigateToSolutions?: (projectName?: string) => void;
  onNavigateToBids?: (projectName?: string) => void;
  onNavigateToContracts?: (projectName?: string) => void;
  onNavigateToAnalytics?: () => void;
}

interface WorkbenchProject {
  key: string;
  name: string;
  customer: string;
  status: "inprogress" | "qualified";
  stage: string;
  budget: string;
  successRate: number;
  daysLeft: string;
}

interface TodoItem {
  key: string;
  title: string;
  subtitle: string;
  background: string;
  borderColor: string;
  accentColor: string;
  onClick: () => void;
}

interface MonthlyAmountMetric {
  key: string;
  month: string;
  newAmount: number;
  signedAmount: number;
}

const STAGE_LABELS: Record<string, string> = {
  discovery: "发现",
  solution_design: "方案设计",
  proposal: "提案",
  bidding: "投标",
  negotiation: "谈判",
  won: "中标",
  lost: "丢单",
};

function getProjectName(opportunity: DemoOpportunity): string {
  const plainName = opportunity.name.replace(/^【示例】/, "").trim();
  if (plainName.endsWith("项目")) {
    return plainName;
  }
  return `${plainName}项目`;
}

function getDaysLeftLabel(expectedCloseDate?: string): string {
  if (!expectedCloseDate) {
    return "-";
  }
  const target = new Date(expectedCloseDate).getTime();
  if (Number.isNaN(target)) {
    return "-";
  }
  const diffDays = Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) {
    return "已到期";
  }
  return `${diffDays}天`;
}

export function WorkbenchView(props: WorkbenchViewProps = {}) {
  const {
    onNavigateToProjects,
    onNavigateToOpportunities,
    onNavigateToSolutions,
    onNavigateToBids,
    onNavigateToContracts,
    onNavigateToAnalytics,
  } = props;
  const [sharedOpportunities, setSharedOpportunities] = useState<
    DemoOpportunity[]
  >(() => loadSharedDemoOpportunities());
  const [projectPage, setProjectPage] = useState(1);
  const [projectPageSize, setProjectPageSize] = useState(5);
  const sideCardHeight = 256;
  const compactStatCardStyle = {
    borderRadius: 16,
    border: "1px solid var(--app-border)",
    boxShadow: "var(--app-shadow)",
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const handleUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<DemoOpportunity[]>;
      if (Array.isArray(customEvent.detail)) {
        setSharedOpportunities((prev) =>
          hasSameDemoOpportunities(prev, customEvent.detail)
            ? prev
            : customEvent.detail,
        );
        return;
      }
      setSharedOpportunities(loadSharedDemoOpportunities());
    };
    window.addEventListener(OPPORTUNITY_DEMO_UPDATED_EVENT, handleUpdated);
    return () => {
      window.removeEventListener(OPPORTUNITY_DEMO_UPDATED_EVENT, handleUpdated);
    };
  }, []);

  useEffect(() => {
    void syncSharedOpportunitiesFromApi().then((items) => {
      if (items) {
        setSharedOpportunities(items);
      }
    });
  }, []);

  const workbenchProjects = useMemo<WorkbenchProject[]>(
    () =>
      sharedOpportunities.map((opportunity) => ({
        key: `workbench-${opportunity.id}`,
        name: getProjectName(opportunity),
        customer: opportunity.customerName || "-",
        status:
          opportunity.stage === "won" ? "qualified" : "inprogress",
        stage: STAGE_LABELS[opportunity.stage || ""] || opportunity.stage || "-",
        budget: formatWanAmount(parseCurrencyAmount(opportunity.expectedValue)),
        successRate: opportunity.probability || 0,
        daysLeft: getDaysLeftLabel(opportunity.expectedCloseDate),
      })),
    [sharedOpportunities],
  );

  const solutions = useMemo(
    () => deriveSolutionsFromOpportunities(sharedOpportunities),
    [sharedOpportunities],
  );
  const bids = useMemo(
    () => deriveBidsFromOpportunities(sharedOpportunities),
    [sharedOpportunities],
  );
  const contracts = useMemo(
    () => deriveContractsFromOpportunities(sharedOpportunities),
    [sharedOpportunities],
  );

  const activeOpportunities = sharedOpportunities.filter(
    (item) => !["won", "lost"].includes(item.stage || ""),
  );
  const ongoingProjects = workbenchProjects.filter(
    (item) => item.status === "inprogress",
  );
  const currentMonthKey = getCurrentMonthKey();
  const currentMonthNewOpportunities = sharedOpportunities.filter(
    (item) => getMonthKey(item.createdAt) === currentMonthKey,
  );
  const expectedAmount = activeOpportunities.reduce(
    (sum, item) => sum + parseCurrencyAmount(item.expectedValue),
    0,
  );
  const monthlySignedAmount = getCurrentMonthSignedAmount(sharedOpportunities);
  const monthlyNewAmount = currentMonthNewOpportunities.reduce(
    (sum, item) => sum + parseCurrencyAmount(item.expectedValue),
    0,
  );
  const highProbabilityAmount = activeOpportunities
    .filter((item) => (item.probability || 0) >= 70)
    .reduce((sum, item) => sum + parseCurrencyAmount(item.expectedValue), 0);
  const reserveAmount = activeOpportunities
    .filter((item) => ["proposal", "bidding", "negotiation"].includes(item.stage || ""))
    .reduce((sum, item) => sum + parseCurrencyAmount(item.expectedValue), 0);
  const averageOpportunityAmount =
    sharedOpportunities.length > 0
      ? sharedOpportunities.reduce(
          (sum, item) => sum + parseCurrencyAmount(item.expectedValue),
          0,
        ) / sharedOpportunities.length
      : 0;
  const signRate =
    expectedAmount > 0 ? Math.round((monthlySignedAmount / expectedAmount) * 100) : 0;
  const monthlyMetrics: MonthlyAmountMetric[] = buildMonthlyPerformanceTrend(
    sharedOpportunities,
    6,
  ).map((item) => ({
    key: item.key,
    month: item.monthLabel,
    newAmount: item.newAmount,
    signedAmount: item.signedAmount,
  }));
  const maxMonthlyAmount = monthlyMetrics.reduce((max, item) => {
    const current = Math.max(item.newAmount, item.signedAmount);
    return current > max ? current : max;
  }, 0);

  const todoItems: TodoItem[] = [];
  const reviewingSolution = solutions.find((item) => item.status === "reviewing");
  if (reviewingSolution) {
    todoItems.push({
      key: "todo-solution",
      title: "完成技术方案评审",
      subtitle: `${reviewingSolution.project} | ${reviewingSolution.createdAt}`,
      background: "var(--app-danger-surface)",
      borderColor: "var(--app-danger-border)",
      accentColor: "#f87171",
      onClick: () => onNavigateToSolutions?.(reviewingSolution.project),
    });
  }
  const ongoingBid = bids.find((item) => item.status === "ongoing");
  if (ongoingBid) {
    todoItems.push({
      key: "todo-bid",
      title: "提交投标文件",
      subtitle: `${ongoingBid.projectName} | ${ongoingBid.openDate}`,
      background: "var(--app-warning-surface)",
      borderColor: "var(--app-warning-border)",
      accentColor: "#f59e0b",
      onClick: () => onNavigateToBids?.(ongoingBid.projectName),
    });
  }
  const discoveryOpportunity = sharedOpportunities.find((item) =>
    ["discovery", "solution_design"].includes(item.stage || ""),
  );
  if (discoveryOpportunity) {
    todoItems.push({
      key: "todo-opportunity",
      title: "客户需求调研会议",
      subtitle: `${getProjectName(discoveryOpportunity)} | ${discoveryOpportunity.expectedCloseDate || "-"}`,
      background: "var(--app-info-surface)",
      borderColor: "var(--app-info-border)",
      accentColor: "#60a5fa",
      onClick: () =>
        onNavigateToOpportunities?.(
          getProjectName(discoveryOpportunity),
          discoveryOpportunity.stage,
        ),
    });
  }
  const reviewingContract = contracts.find((item) => item.status === "reviewing");
  if (reviewingContract) {
    todoItems.push({
      key: "todo-contract",
      title: "合同谈判",
      subtitle: `${reviewingContract.projectName} | ${reviewingContract.signDate}`,
      background: "var(--app-danger-surface)",
      borderColor: "var(--app-danger-border)",
      accentColor: "#fb7185",
      onClick: () => onNavigateToContracts?.(reviewingContract.projectName),
    });
  }

  const columns: ColumnsType<WorkbenchProject> = [
    {
      title: "序号",
      key: "index",
      width: 72,
      render: (_: unknown, __: WorkbenchProject, index: number) =>
        (projectPage - 1) * projectPageSize + index + 1,
    },
    {
      title: "项目名称",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "客户",
      dataIndex: "customer",
      key: "customer",
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: WorkbenchProject["status"]) =>
        status === "inprogress" ? (
          <Tag color="blue">进行中</Tag>
        ) : (
          <Tag color="green">已中标</Tag>
        ),
    },
    {
      title: "阶段",
      dataIndex: "stage",
      key: "stage",
    },
    {
      title: "预算",
      dataIndex: "budget",
      key: "budget",
      render: (text: string) => `¥${text}`,
    },
    {
      title: "成功概率",
      dataIndex: "successRate",
      key: "successRate",
      render: (rate: number) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 100,
              height: 6,
              background: "var(--app-surface-muted)",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${rate}%`,
                height: "100%",
                background: rate >= 60 ? "#52c41a" : "#1890ff",
                borderRadius: 3,
              }}
            />
          </div>
          <span style={{ fontSize: 12 }}>{rate}%</span>
        </div>
      ),
    },
    {
      title: "剩余天数",
      dataIndex: "daysLeft",
      key: "daysLeft",
    },
    {
      title: "操作",
      key: "action",
      render: (_: unknown, record: WorkbenchProject) => (
        <Button
          type="link"
          size="small"
          onClick={() => {
            onNavigateToProjects?.(record.name);
          }}
        >
          查看详情
        </Button>
      ),
    },
  ];

  useEffect(() => {
    const maxPage = Math.max(
      1,
      Math.ceil(workbenchProjects.length / projectPageSize),
    );
    if (projectPage > maxPage) {
      setProjectPage(maxPage);
    }
  }, [projectPage, projectPageSize, workbenchProjects.length]);

  const paginatedWorkbenchProjects = workbenchProjects.slice(
    (projectPage - 1) * projectPageSize,
    projectPage * projectPageSize,
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <Row gutter={16}>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            styles={{ body: { padding: "14px 16px" } }}
            onClick={() => onNavigateToProjects?.()}
          >
            <div style={{ fontSize: 24, marginBottom: 6, color: "#1890ff" }}>
              📁
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {ongoingProjects.length}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>进行中项目</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            styles={{ body: { padding: "14px 16px" } }}
            onClick={() => onNavigateToOpportunities?.()}
          >
            <div style={{ fontSize: 24, marginBottom: 6, color: "#52c41a" }}>
              💡
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {activeOpportunities.length}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>活跃商机</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            styles={{ body: { padding: "14px 16px" } }}
            onClick={() => onNavigateToSolutions?.()}
          >
            <div style={{ fontSize: 24, marginBottom: 6, color: "#722ed1" }}>
              🎯
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {solutions.length}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>解决方案</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            styles={{ body: { padding: "14px 16px" } }}
            onClick={() => onNavigateToBids?.()}
          >
            <div style={{ fontSize: 24, marginBottom: 6, color: "#fa8c16" }}>
              📄
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{bids.length}</div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>投标项目</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            styles={{ body: { padding: "14px 16px" } }}
            onClick={() => onNavigateToAnalytics?.()}
          >
            <div style={{ fontSize: 24, marginBottom: 6, color: "#13c2c2" }}>
              💰
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {formatWanAmount(expectedAmount)}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>预计签约金额</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            styles={{ body: { padding: "14px 16px" } }}
            onClick={() => onNavigateToContracts?.()}
          >
            <div style={{ fontSize: 24, marginBottom: 6, color: "#eb2f96" }}>
              🏆
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {formatWanAmount(monthlySignedAmount)}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>本月签约</div>
          </Card>
        </Col>
      </Row>

      <Card
        title="最近项目"
        size="small"
        extra={
          <Text
            type="secondary"
            style={{ fontSize: 12, cursor: "pointer" }}
            onClick={() => onNavigateToProjects?.()}
          >
            更多项目
          </Text>
        }
      >
        <Table<WorkbenchProject>
          size="small"
          pagination={{
            current: projectPage,
            pageSize: projectPageSize,
            total: workbenchProjects.length,
            showSizeChanger: true,
            pageSizeOptions: ["5", "10", "15", "20"],
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setProjectPage(page);
              setProjectPageSize(pageSize);
            },
          }}
          rowKey="key"
          dataSource={paginatedWorkbenchProjects}
          columns={columns}
        />
      </Card>

      <Row gutter={24} align="stretch">
        <Col xs={24} md={8}>
          <Card
            title="待办任务"
            size="small"
            style={{ height: sideCardHeight + 56 }}
            styles={{
              body: {
                minHeight: sideCardHeight,
                height: sideCardHeight,
                display: "flex",
                flexDirection: "column",
                padding: 16,
              },
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {todoItems.map((item) => (
                <div
                  key={item.key}
                  style={{
                    padding: "8px 10px",
                    background: item.background,
                    borderRadius: 8,
                    border: `1px solid ${item.borderColor}`,
                    boxShadow: "0 10px 22px rgba(15, 23, 42, 0.12)",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                  onClick={item.onClick}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      marginBottom: 4,
                      color: "var(--app-text-primary)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: item.accentColor,
                        boxShadow: `0 0 0 4px color-mix(in srgb, ${item.accentColor} 22%, transparent)`,
                        flex: "0 0 auto",
                      }}
                    />
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--app-text-secondary)",
                    }}
                  >
                    {item.subtitle}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card
            title="本月业绩趋势"
            size="small"
            hoverable
            style={{ height: sideCardHeight + 56 }}
            styles={{
              body: {
                minHeight: sideCardHeight,
                height: sideCardHeight,
                display: "flex",
                flexDirection: "column",
                padding: 16,
              },
            }}
            onClick={() => {
              onNavigateToAnalytics?.();
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                flex: 1,
                minHeight: 0,
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                {[
                  {
                    label: "本月新增商机金额",
                    value: formatWanValue(monthlyNewAmount),
                    accent: "#1677ff",
                    background:
                      "linear-gradient(135deg, color-mix(in srgb, rgba(59,130,246,0.18) 70%, var(--app-surface) 30%) 0%, var(--app-surface-soft) 100%)",
                    border: "rgba(59, 130, 246, 0.28)",
                  },
                  {
                    label: "本月签约金额",
                    value: formatWanValue(monthlySignedAmount),
                    accent: "#52c41a",
                    background:
                      "linear-gradient(135deg, color-mix(in srgb, rgba(34,197,94,0.18) 70%, var(--app-surface) 30%) 0%, var(--app-surface-soft) 100%)",
                    border: "rgba(34, 197, 94, 0.24)",
                  },
                  {
                    label: "活跃商机金额",
                    value: formatWanValue(expectedAmount),
                    accent: "#fa8c16",
                    background:
                      "linear-gradient(135deg, color-mix(in srgb, rgba(250,140,22,0.18) 70%, var(--app-surface) 30%) 0%, var(--app-surface-soft) 100%)",
                    border: "rgba(250, 140, 22, 0.24)",
                  },
                  {
                    label: "本月签约率",
                    value: `${signRate}%`,
                    accent: "#eb2f96",
                    background:
                      "linear-gradient(135deg, color-mix(in srgb, rgba(235,47,150,0.18) 70%, var(--app-surface) 30%) 0%, var(--app-surface-soft) 100%)",
                    border: "rgba(235, 47, 150, 0.24)",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      padding: "7px 9px",
                      borderRadius: 10,
                      background: item.background,
                      border: `1px solid ${item.border}`,
                      minWidth: 0,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--app-text-secondary)",
                        marginBottom: 2,
                        lineHeight: 1.25,
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: item.accent,
                        lineHeight: 1.2,
                        wordBreak: "break-word",
                      }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: 12,
                  background:
                    "linear-gradient(180deg, color-mix(in srgb, var(--app-surface-soft) 96%, transparent) 0%, color-mix(in srgb, var(--app-surface) 96%, transparent) 100%)",
                  border: "1px solid var(--app-border)",
                  flex: 1,
                  minHeight: 0,
                  display: "grid",
                  gridTemplateColumns: "120px minmax(0, 1fr)",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "stretch",
                    gap: 10,
                    minWidth: 0,
                    alignSelf: "stretch",
                  }}
                >
                  {[
                    {
                      label: "新增商机金额",
                      color: "#3b82f6",
                      shadow: "0 10px 20px rgba(37, 99, 235, 0.22)",
                    },
                    {
                      label: "签约金额",
                      color: "#22c55e",
                      shadow: "0 10px 20px rgba(22, 163, 74, 0.2)",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 11,
                        color: "var(--app-text-secondary)",
                        padding: "6px 8px",
                        borderRadius: 10,
                        background: "var(--app-surface)",
                        border: "1px solid var(--app-border)",
                        minWidth: 0,
                        justifyContent: "flex-start",
                        minHeight: 36,
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: item.color,
                          boxShadow: item.shadow,
                          display: "inline-block",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ lineHeight: 1.4 }}>{item.label}</span>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "flex-end",
                    gap: 6,
                    height: 88,
                    minWidth: 0,
                    overflow: "hidden",
                    width: "100%",
                    padding: "0 6px",
                  }}
                >
                  {monthlyMetrics.map((item) => {
                    const safeMax = maxMonthlyAmount || 1;
                    const newHeight = Math.max(
                      12,
                      Math.round((item.newAmount / safeMax) * 100),
                    );
                    const signedHeight = Math.max(
                      12,
                      Math.round((item.signedAmount / safeMax) * 100),
                    );
                    return (
                      <div
                        key={item.key}
                        style={{
                          flex: "0 1 36px",
                          minWidth: 28,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "flex-end",
                            justifyContent: "center",
                            gap: 3,
                            height: 68,
                            minWidth: 0,
                          }}
                        >
                          <div
                            title={`新增商机金额 ${formatWanValue(item.newAmount)}`}
                            style={{
                              width: 10,
                              maxWidth: 10,
                              height: `${newHeight}%`,
                              minHeight: 12,
                              borderRadius: 5,
                              background:
                                "linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)",
                              boxShadow: "0 10px 20px rgba(37, 99, 235, 0.22)",
                              flexShrink: 0,
                            }}
                          />
                          <div
                            title={`签约金额 ${formatWanValue(item.signedAmount)}`}
                            style={{
                              width: 10,
                              maxWidth: 10,
                              height: `${signedHeight}%`,
                              minHeight: 12,
                              borderRadius: 5,
                              background:
                                "linear-gradient(180deg, #4ade80 0%, #16a34a 100%)",
                              boxShadow: "0 10px 20px rgba(22, 163, 74, 0.2)",
                              flexShrink: 0,
                            }}
                          />
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--app-text-secondary)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.month}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 10,
                  background: "var(--app-surface-soft)",
                  border: "1px solid var(--app-border)",
                  flexShrink: 0,
                  minHeight: 60,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    minWidth: 0,
                    alignSelf: "stretch",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--app-text-secondary)",
                      marginBottom: 2,
                    }}
                  >
                    高概率商机金额
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--app-text-primary)",
                      lineHeight: 1.25,
                      wordBreak: "break-all",
                    }}
                  >
                    {formatWanValue(highProbabilityAmount)}
                  </div>
                </div>
                <div
                  style={{
                    minWidth: 0,
                    borderLeft: "1px solid var(--app-border)",
                    borderRight: "1px solid var(--app-border)",
                    padding: "0 8px",
                    alignSelf: "stretch",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--app-text-secondary)",
                      marginBottom: 2,
                    }}
                  >
                    待签约储备金额
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--app-text-primary)",
                      lineHeight: 1.25,
                      wordBreak: "break-all",
                    }}
                  >
                    {formatWanValue(reserveAmount)}
                  </div>
                </div>
                <div
                  style={{
                    minWidth: 0,
                    alignSelf: "stretch",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--app-text-secondary)",
                      marginBottom: 2,
                    }}
                  >
                    平均单项目金额
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--app-text-primary)",
                      lineHeight: 1.25,
                      wordBreak: "break-all",
                    }}
                  >
                    {formatWanValue(averageOpportunityAmount)}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
