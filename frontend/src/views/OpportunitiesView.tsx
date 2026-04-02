import { useEffect, useState } from "react";
import {
  Layout,
  Typography,
  Form,
  Input,
  Button,
  Divider,
  Modal,
  Select,
  Switch,
  message,
  Tag,
  Timeline,
} from "antd";

import {
  useSolutionVersions,
  SolutionVersion as ApiSolutionVersion,
} from "../hooks/useSolutionVersions";
import { useReviewRecords } from "../hooks/useReviewRecords";
import { buildApiUrl } from "../shared/api";

const { Content } = Layout;
const { Title, Paragraph } = Typography;

const STAGE_LABELS: Record<string, string> = {
  discovery: "需求挖掘（discovery）",
  solution_design: "方案设计（solution_design）",
  proposal: "方案提案（proposal）",
  bidding: "投标（bidding）",
  negotiation: "谈判（negotiation）",
  won: "中标（won）",
  lost: "丢单（lost）",
};

const STAGE_TAG_COLORS: Record<string, string> = {
  discovery: "default",
  solution_design: "processing",
  proposal: "processing",
  bidding: "processing",
  negotiation: "processing",
  won: "success",
  lost: "error",
};

const SOLUTION_STATUS_LABELS: Record<string, string> = {
  draft: "草稿（draft）",
  in_review: "评审中（in_review）",
  approved: "已通过（approved）",
  rejected: "已驳回（rejected）",
  archived: "已归档（archived）",
};

const SOLUTION_STATUS_COLORS: Record<string, string> = {
  draft: "default",
  in_review: "processing",
  approved: "success",
  rejected: "error",
  archived: "default",
};

interface Opportunity {
  id: number;
  name: string;
  stage: string;
  description?: string;
  expectedValue?: string;
  expectedCloseDate?: string;
  probability?: number;
  customer?: {
    id: number;
    name?: string;
  } | null;
  owner?: {
    id: number;
    username: string;
    displayName?: string;
  } | null;
  createdAt: string;
  solutionVersions?: ApiSolutionVersion[];
}

interface OpportunityListResponse {
  items: Opportunity[];
  total: number;
  page: number;
  pageSize: number;
}

interface OpportunitiesViewProps {
  accessToken: string;
  currentUsername: string | null;
  onLogout?: () => void;
  onBackToList?: () => void;
}

// 当前阶段优先使用 Mock 数据跑通高级视图交互
const USE_MOCK_OPPORTUNITIES = true;

export function OpportunitiesView({
  accessToken,
  currentUsername,
  onLogout,
  onBackToList,
}: OpportunitiesViewProps) {
  const [createOpportunityForm] = Form.useForm();
  const [createSolutionForm] = Form.useForm();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);
  const [opportunitiesError, setOpportunitiesError] = useState<string | null>(
    null,
  );
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<
    number | null
  >(null);
  const [stageFilter, setStageFilter] = useState<string | undefined>(undefined);
  const [sortKey, setSortKey] = useState<string>("createdAt_desc");
  const [keyword, setKeyword] = useState<string>("");
  const [solutionStatusFilter, setSolutionStatusFilter] = useState<
    string | undefined
  >(undefined);
  const [solutionSortKey, setSolutionSortKey] =
    useState<string>("createdAt_desc");
  const [expandedReviewSolutionId, setExpandedReviewSolutionId] = useState<
    number | null
  >(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const [isCreateOpportunityModalVisible, setIsCreateOpportunityModalVisible] =
    useState(false);
  const [isCreateSolutionModalVisible, setIsCreateSolutionModalVisible] =
    useState(false);

  const loadOpportunitiesFromApi = async (token: string) => {
    setLoadingOpportunities(true);
    setOpportunitiesError(null);

    try {
      const response = await fetch(buildApiUrl("/opportunities"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setOpportunitiesError("登录已失效，请重新登录。");
          if (onLogout) {
            onLogout();
          }
          return;
        }

        const errorBody = await response.json().catch(() => undefined);
        const messageText =
          (errorBody && (errorBody.message as string)) ||
          "加载商机列表失败";
        setOpportunitiesError(messageText);
        return;
      }

      const data = (await response.json()) as OpportunityListResponse;
      setOpportunities(data.items || []);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to load opportunities:", error);
      setOpportunitiesError("无法连接到服务器，请检查后端服务是否已启动");
    } finally {
      setLoadingOpportunities(false);
    }
  };

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    if (!USE_MOCK_OPPORTUNITIES) {
      loadOpportunitiesFromApi(accessToken);
      return;
    }

    setOpportunities([
      {
        id: 1,
        name: "【示例】大型政企数字化转型项目",
        stage: "discovery",
        description: "围绕政企客户整体数字化转型需求，提供咨询规划与整体解决方案设计。",
        expectedValue: "5000000.00",
        expectedCloseDate: "2026-06-30",
        probability: 40,
        customer: { id: 1, name: "示例客户 A 公司" },
        owner: {
          id: 1,
          username: currentUsername || "demo_user",
          displayName: currentUsername ? "当前登录售前工程师" : "示例售前工程师",
        },
        createdAt: new Date().toISOString(),
        solutionVersions: [
          {
            id: 1,
            name: "政企数字化整体方案 v1.0",
            versionTag: "v1.0",
            status: "draft",
            summary: "首版整体架构与能力清单，待评审。",
            createdAt: new Date().toISOString(),
          },
          {
            id: 2,
            name: "政企数字化整体方案 v1.1（内测）",
            versionTag: "v1.1",
            status: "in_review",
            summary: "结合客户反馈调整后的内测版本，正在走内部评审流程。",
            createdAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: 2,
        name: "【示例】总部统一安全接入方案",
        stage: "solution_design",
        description: "面向集团总部与分支机构的统一安全接入方案，支持零信任与多种接入方式。",
        expectedValue: "2000000.00",
        expectedCloseDate: "2026-07-15",
        probability: 60,
        customer: { id: 2, name: "示例客户 B 集团" },
        owner: {
          id: 1,
          username: currentUsername || "demo_user",
          displayName: currentUsername ? "当前登录售前工程师" : "示例售前工程师",
        },
        createdAt: new Date().toISOString(),
        solutionVersions: [
          {
            id: 3,
            name: "统一安全接入方案 v1.0",
            versionTag: "v1.0",
            status: "approved",
            summary: "总部评审通过版本，包含访问控制与审计方案。",
            createdAt: new Date().toISOString(),
          },
        ],
      },
    ]);
    setSelectedOpportunityId(1);
  }, [accessToken, currentUsername]);

  const handleCreateOpportunity = async () => {
    try {
      const values = await createOpportunityForm.validateFields();
      const {
        name,
        stage,
        customerName,
        expectedValue,
        expectedCloseDate,
        probability,
        description,
      } = values as {
        name: string;
        stage: string;
        customerName?: string;
        expectedValue?: string;
        expectedCloseDate?: string;
        probability?: number;
        description?: string;
      };

      if (!USE_MOCK_OPPORTUNITIES) {
        if (!accessToken) {
          message.error("当前登录状态已失效，请重新登录后再创建商机。");
          if (onLogout) {
            onLogout();
          }
          return;
        }

        try {
          const response = await fetch(buildApiUrl("/opportunities"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              name,
              stage,
              expectedValue: expectedValue || undefined,
              expectedCloseDate: expectedCloseDate || undefined,
              probability:
                probability !== undefined && probability !== null
                  ? Number(probability)
                  : undefined,
            }),
          });

          if (!response.ok) {
            if (response.status === 401) {
              message.error("登录已失效，请重新登录。");
              if (onLogout) {
                onLogout();
              }
              return;
            }

            const errorBody = await response.json().catch(() => undefined);
            const messageText =
              (errorBody && (errorBody.message as string)) ||
              "创建商机失败，请稍后重试。";
            message.error(messageText);
            return;
          }

          const created = (await response.json()) as Opportunity;

          // 刷新列表以保持与后端数据一致，同时优先选中新建的商机
          await loadOpportunitiesFromApi(accessToken);
          setSelectedOpportunityId(created.id);
          message.success("已创建商机");
          createOpportunityForm.resetFields();
          setIsCreateOpportunityModalVisible(false);
          return;
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("Failed to create opportunity:", error);
          message.error("无法连接到服务器，请检查后端服务是否已启动。");
          return;
        }
      }

      const maxId = opportunities.reduce(
        (max, opp) => (opp.id > max ? opp.id : max),
        0,
      );
      const newId = maxId + 1;
      const now = new Date().toISOString();

      const newOpportunity: Opportunity = {
        id: newId,
        name,
        stage,
        description,
        expectedValue: expectedValue || undefined,
        expectedCloseDate: expectedCloseDate || undefined,
        probability:
          probability !== undefined && probability !== null
            ? Number(probability)
            : undefined,
        customer: {
          id: newId,
          name: customerName && customerName.trim()
            ? customerName.trim()
            : "未指定客户",
        },
        owner: currentUsername
          ? {
              id: 1,
              username: currentUsername,
              displayName: "当前登录售前工程师",
            }
          : {
              id: 1,
              username: "demo_user",
              displayName: "示例售前工程师",
            },
        createdAt: now,
      };

      setOpportunities((prev) => [...prev, newOpportunity]);
      setSelectedOpportunityId(newId);
      message.success("已创建示例商机（Mock）");
      createOpportunityForm.resetFields();
      setIsCreateOpportunityModalVisible(false);
    } catch {
      // 校验未通过时不做处理
    }
  };

  const handleCreateSolutionVersion = async () => {
    const currentId =
      selectedOpportunityId ??
      (opportunities.length > 0 ? opportunities[0].id : null);

    if (!currentId) {
      message.warning("请先选择一个商机再创建方案版本。");
      return;
    }

    try {
      const values = await createSolutionForm.validateFields();
      const {
        name,
        versionTag,
        status,
        summary,
      } = values as {
        name: string;
        versionTag?: string;
        status: string;
        summary?: string;
      };

      if (USE_MOCK_OPPORTUNITIES) {
        const now = new Date().toISOString();
        const existingIds =
          opportunities.flatMap((opp) => opp.solutionVersions || []).map(
            (sv) => sv.id,
          ) || [];
        const maxId = existingIds.reduce(
          (max, id) => (id > max ? id : max),
          0,
        );
        const newId = maxId + 1;

        const newSolution: ApiSolutionVersion = {
          id: newId,
          name,
          versionTag: versionTag || undefined,
          status: status as ApiSolutionVersion["status"],
          summary: summary || undefined,
          createdAt: now,
        };

        setOpportunities((prev) =>
          prev.map((opp) =>
            opp.id === currentId
              ? {
                  ...opp,
                  solutionVersions: [
                    ...(opp.solutionVersions || []),
                    newSolution,
                  ],
                }
              : opp,
          ),
        );

        message.success("已创建示例方案版本（Mock）");
      } else {
        const created = await createSolutionVersionFromApi({
          name,
          versionTag,
          status: status as ApiSolutionVersion["status"],
          summary,
        });
        if (created) {
          message.success("已创建方案版本");
        }
      }

      createSolutionForm.resetFields();
      setIsCreateSolutionModalVisible(false);
    } catch {
      // 表单校验错误忽略
    }
  };

  const filteredOpportunities = opportunities.filter((opp) => {
    if (stageFilter && stageFilter.length > 0 && opp.stage !== stageFilter) {
      return false;
    }
    if (onlyMine && currentUsername) {
      if (opp.owner?.username !== currentUsername) {
        return false;
      }
    }
    if (keyword && keyword.trim().length > 0) {
      const k = keyword.trim().toLowerCase();
      const name = opp.name?.toLowerCase() || "";
      const customerName = opp.customer?.name?.toLowerCase() || "";
      const ownerName =
        opp.owner?.displayName?.toLowerCase() ||
        opp.owner?.username?.toLowerCase() ||
        "";
      if (
        !name.includes(k) &&
        !customerName.includes(k) &&
        !ownerName.includes(k)
      ) {
        return false;
      }
    }
    return true;
  });

  const sortedOpportunities = [...filteredOpportunities].sort((a, b) => {
    if (sortKey === "expectedValue_desc" || sortKey === "expectedValue_asc") {
      const av = a.expectedValue ? Number(a.expectedValue) : 0;
      const bv = b.expectedValue ? Number(b.expectedValue) : 0;
      if (sortKey === "expectedValue_desc") {
        return bv - av;
      }
      return av - bv;
    }

    const at = new Date(a.createdAt).getTime();
    const bt = new Date(b.createdAt).getTime();
    return bt - at;
  });

  const totalOpportunities = opportunities.length;
  const inProgressOpportunities = opportunities.filter(
    (opp) => opp.stage !== "won" && opp.stage !== "lost",
  ).length;
  const pendingReviewCount = opportunities
    .flatMap((opp) => opp.solutionVersions || [])
    .filter((sv) => sv.status === "in_review").length;

  const stageStats = [
    "discovery",
    "solution_design",
    "proposal",
    "bidding",
    "negotiation",
    "won",
    "lost",
  ].map((stageKey) => ({
    key: stageKey,
    label: STAGE_LABELS[stageKey] || stageKey,
    count: opportunities.filter((opp) => opp.stage === stageKey).length,
  }));

  const selectedOpportunity =
    sortedOpportunities.find((opp) => opp.id === selectedOpportunityId) ||
    sortedOpportunities[0] ||
    null;

  const {
    solutions: apiSolutions,
    loading: loadingSolutions,
    error: solutionsError,
    createSolutionVersion: createSolutionVersionFromApi,
  } = useSolutionVersions({
    accessToken,
    opportunityId: selectedOpportunity ? selectedOpportunity.id : null,
    useMock: USE_MOCK_OPPORTUNITIES,
  });

  const {
    records: reviewRecords,
    loading: loadingReviewRecords,
    error: reviewRecordsError,
  } = useReviewRecords({
    accessToken,
    solutionVersionId:
      !USE_MOCK_OPPORTUNITIES && expandedReviewSolutionId
        ? expandedReviewSolutionId
        : null,
    useMock: USE_MOCK_OPPORTUNITIES,
  });

  return (
    <Layout
      style={{
        maxWidth: 960,
        margin: "0 auto",
        background: "var(--app-surface)",
        borderRadius: 8,
        minHeight: 480,
        overflow: "hidden",
        border: "1px solid var(--app-border)",
        boxShadow: "var(--app-shadow)",
      }}
    >
      <Content
        style={{
          padding: 32,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Title level={3} style={{ marginBottom: 0 }}>
            商机列表
          </Title>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {onBackToList && (
              <Button size="small" onClick={onBackToList}>
                返回商机管理列表
              </Button>
            )}
            {onLogout && (
              <Button size="small" onClick={onLogout}>
                退出登录
              </Button>
            )}
            {USE_MOCK_OPPORTUNITIES && (
              <Button
                type="primary"
                onClick={() => setIsCreateOpportunityModalVisible(true)}
              >
                新建商机
              </Button>
            )}
          </div>
        </div>

        {USE_MOCK_OPPORTUNITIES && (
          <Modal
            title="新建商机"
            open={isCreateOpportunityModalVisible}
            onOk={handleCreateOpportunity}
            onCancel={() => setIsCreateOpportunityModalVisible(false)}
            okText="保存"
            cancelText="取消"
            destroyOnClose
          >
            <Form form={createOpportunityForm} layout="vertical">
              <Form.Item
                label="商机名称"
                name="name"
                rules={[{ required: true, message: "请输入商机名称" }]}
              >
                <Input placeholder="例如：政企数字化转型项目" />
              </Form.Item>
              <Form.Item
                label="阶段"
                name="stage"
                rules={[{ required: true, message: "请选择商机阶段" }]}
              >
                <Select
                  placeholder="请选择阶段"
                  options={[
                    { value: "discovery", label: "需求挖掘（discovery）" },
                    {
                      value: "solution_design",
                      label: "方案设计（solution_design）",
                    },
                    { value: "proposal", label: "方案提案（proposal）" },
                    { value: "bidding", label: "投标（bidding）" },
                    { value: "negotiation", label: "谈判（negotiation）" },
                    { value: "won", label: "中标（won）" },
                    { value: "lost", label: "丢单（lost）" },
                  ]}
                />
              </Form.Item>
              <Form.Item label="客户名称" name="customerName">
                <Input placeholder="例如：某某集团" />
              </Form.Item>
              <Form.Item label="预估金额" name="expectedValue">
                <Input placeholder="例如：5000000.00" />
              </Form.Item>
              <Form.Item label="预期签约日期" name="expectedCloseDate">
                <Input placeholder="例如：2026-06-30" />
              </Form.Item>
              <Form.Item label="成交概率（0-100）" name="probability">
                <Input placeholder="例如：60" />
              </Form.Item>
              <Form.Item label="简要描述" name="description">
                <Input.TextArea
                  rows={3}
                  placeholder="简要说明商机背景、范围等信息"
                />
              </Form.Item>
            </Form>
          </Modal>
        )}

        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          以下为当前售前项目 / 商机列表，后续会在此基础上逐步补充筛选、排序以及更多字段展示能力。点击左侧商机可在右侧查看详情。
        </Paragraph>

        <Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 13 }}>
          总商机数：{totalOpportunities}｜进行中商机数：
          {inProgressOpportunities}｜待评审方案版本：{pendingReviewCount}
        </Paragraph>
        {stageStats.some((s) => s.count > 0) && (
          <Paragraph
            type="secondary"
            style={{ marginBottom: 12, fontSize: 12 }}
          >
            各阶段商机数：
            {stageStats
              .filter((s) => s.count > 0)
              .map((s) => (
                <Tag
                  key={s.key}
                  color={STAGE_TAG_COLORS[s.key] || "default"}
                  style={{ marginLeft: 8 }}
                >
                  {s.label}：{s.count}
                </Tag>
              ))}
          </Paragraph>
        )}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>搜索：</span>
            <Input
              allowClear
              size="small"
              placeholder="按名称 / 客户 / 负责人搜索"
              style={{ width: 260 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>阶段筛选：</span>
            <Select
              allowClear
              size="small"
              placeholder="全部阶段"
              style={{ width: 200 }}
              value={stageFilter}
              onChange={(value) => setStageFilter(value)}
              options={[
                { value: "discovery", label: "需求挖掘（discovery）" },
                {
                  value: "solution_design",
                  label: "方案设计（solution_design）",
                },
                { value: "proposal", label: "方案提案（proposal）" },
                { value: "bidding", label: "投标（bidding）" },
                { value: "negotiation", label: "谈判（negotiation）" },
                { value: "won", label: "中标（won）" },
                { value: "lost", label: "丢单（lost）" },
              ]}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>排序：</span>
            <Select
              size="small"
              style={{ width: 200 }}
              value={sortKey}
              onChange={(value) => setSortKey(value)}
              options={[
                {
                  value: "createdAt_desc",
                  label: "按创建时间（最新在前）",
                },
                {
                  value: "expectedValue_desc",
                  label: "按预估金额（从高到低）",
                },
                {
                  value: "expectedValue_asc",
                  label: "按预估金额（从低到高）",
                },
              ]}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>只看我负责的：</span>
            <Switch
              size="small"
              checked={onlyMine}
              onChange={(checked) => setOnlyMine(checked)}
              disabled={!currentUsername}
            />
          </div>
        </div>

        {opportunitiesError && (
          <Paragraph type="danger" style={{ marginBottom: 16 }}>
            {opportunitiesError}
          </Paragraph>
        )}

        {loadingOpportunities ? (
          <Paragraph>商机列表加载中...</Paragraph>
        ) : sortedOpportunities.length === 0 ? (
          <Paragraph>
            暂无符合筛选条件的商机数据，可以调整筛选条件后重试。
          </Paragraph>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 3fr",
              gap: 24,
            }}
          >
            <div>
              {sortedOpportunities.map((opp) => (
                <div
                  key={opp.id}
                  onClick={() => setSelectedOpportunityId(opp.id)}
                  style={{
                    padding: "12px 12px",
                    borderRadius: 6,
                    border:
                      selectedOpportunityId === opp.id
                        ? "1px solid #1677ff"
                        : "1px solid #f0f0f0",
                    backgroundColor:
                      selectedOpportunityId === opp.id ? "#e6f4ff" : "#fff",
                    cursor: "pointer",
                    marginBottom: 8,
                  }}
                >
                  <Title level={5} style={{ marginBottom: 4 }}>
                    {opp.name}
                  </Title>
                  <Paragraph
                    type="secondary"
                    style={{ marginBottom: 0, fontSize: 12 }}
                  >
                    阶段：
                    {opp.stage ? (
                      <Tag
                        color={STAGE_TAG_COLORS[opp.stage] || "default"}
                        style={{ marginLeft: 4, marginRight: 4 }}
                      >
                        {STAGE_LABELS[opp.stage] || opp.stage}
                      </Tag>
                    ) : (
                      "-"
                    )}
                    ｜客户：
                    {opp.customer?.name || "-"}｜负责人：
                    {opp.owner?.displayName || opp.owner?.username || "-"}
                  </Paragraph>
                </div>
              ))}
            </div>
            <div
              style={{
                padding: 16,
                borderRadius: 6,
                border: "1px solid #f0f0f0",
                minHeight: 200,
              }}
            >
              {(() => {
                const selected = selectedOpportunity;

                if (!selected) {
                  return (
                    <Paragraph type="secondary">
                      暂无商机详情可展示。
                    </Paragraph>
                  );
                }

                const stageOrder = [
                  "discovery",
                  "solution_design",
                  "proposal",
                  "bidding",
                  "negotiation",
                  "won",
                  "lost",
                ];
                const currentStageIndex = selected.stage
                  ? stageOrder.indexOf(selected.stage)
                  : -1;

                const ownerNameForTimeline =
                  selected.owner?.displayName ||
                  selected.owner?.username ||
                  "未指定责任人";

                const timelineItems: { color?: string; children: React.ReactNode }[] =
                  [];

                timelineItems.push({
                  color: "gray",
                  children: `创建商机：${selected.createdAt}（责任人：${ownerNameForTimeline}，示例）`,
                });

                if (currentStageIndex >= 0) {
                  stageOrder.slice(0, currentStageIndex + 1).forEach((stageKey) => {
                    const isCurrent = stageKey === selected.stage;
                    timelineItems.push({
                      color:
                        STAGE_TAG_COLORS[stageKey] ||
                        (isCurrent ? "processing" : "gray"),
                      children: isCurrent
                        ? `当前阶段：${STAGE_LABELS[stageKey] || stageKey}（示例，责任人：${ownerNameForTimeline}）`
                        : `历史阶段：${STAGE_LABELS[stageKey] || stageKey}（示例，责任人：${ownerNameForTimeline}）`,
                    });
                  });
                }

                return (
                  <>
                    <Title level={4} style={{ marginBottom: 8 }}>
                      {selected.name}
                    </Title>
                    <Paragraph
                      type="secondary"
                      style={{ marginBottom: 16 }}
                    >
                      阶段：
                      {selected.stage ? (
                        <Tag
                          color={STAGE_TAG_COLORS[selected.stage] || "default"}
                          style={{ marginLeft: 4, marginRight: 4 }}
                        >
                          {STAGE_LABELS[selected.stage] || selected.stage}
                        </Tag>
                      ) : (
                        "-"
                      )}
                      ｜客户：
                      {selected.customer?.name || "-"}｜负责人：
                      {selected.owner?.displayName ||
                        selected.owner?.username ||
                        "-"}
                    </Paragraph>
                    <Paragraph style={{ marginBottom: 12 }}>
                      {selected.description ||
                        "该商机当前暂无详细描述，后续可在此补充需求背景、方案范围等信息。"}
                    </Paragraph>
                    <Paragraph
                      type="secondary"
                      style={{ fontSize: 12 }}
                    >
                      预估金额：{selected.expectedValue || "-"}｜预期签约日期：
                      {selected.expectedCloseDate || "-"}｜成交概率：
                      {selected.probability != null
                        ? `${selected.probability}%`
                        : "-"}
                    </Paragraph>
                    <Paragraph
                      type="secondary"
                      style={{ fontSize: 12 }}
                    >
                      创建时间：{selected.createdAt}
                    </Paragraph>
                    <Divider style={{ margin: "12px 0" }} />
                    <Title level={5} style={{ marginBottom: 8 }}>
                      关键阶段时间轴（示例）
                    </Title>
                    <Timeline
                      style={{ marginBottom: 8 }}
                      items={timelineItems}
                    />
                    <Paragraph
                      type="secondary"
                      style={{ fontSize: 12, marginBottom: 12 }}
                    >
                      当前时间轴基于商机阶段的示意节点，
                      后续接入真实阶段变更记录后，
                      将在此展示包含时间与责任人的完整阶段推进轨迹。
                    </Paragraph>
                    <Divider style={{ margin: "12px 0" }} />
                    <Title level={5} style={{ marginBottom: 8 }}>
                      方案版本（示例）
                    </Title>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 12,
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => setIsCreateSolutionModalVisible(true)}
                      >
                        {USE_MOCK_OPPORTUNITIES
                          ? "新建方案版本（Mock）"
                          : "新建方案版本"}
                      </Button>
                      <span style={{ fontSize: 12 }}>状态筛选：</span>
                      <Select
                        allowClear
                        size="small"
                        placeholder="全部状态"
                        style={{ width: 160 }}
                        value={solutionStatusFilter}
                        onChange={(value) => setSolutionStatusFilter(value)}
                        options={[
                          { value: "draft", label: "草稿（draft）" },
                          {
                            value: "in_review",
                            label: "评审中（in_review）",
                          },
                          {
                            value: "approved",
                            label: "已通过（approved）",
                          },
                          {
                            value: "rejected",
                            label: "已驳回（rejected）",
                          },
                          {
                            value: "archived",
                            label: "已归档（archived）",
                          },
                        ]}
                      />
                      <span style={{ fontSize: 12 }}>排序：</span>
                      <Select
                        size="small"
                        style={{ width: 180 }}
                        value={solutionSortKey}
                        onChange={(value) => setSolutionSortKey(value)}
                        options={[
                          {
                            value: "createdAt_desc",
                            label: "按创建时间（最新在前）",
                          },
                          {
                            value: "createdAt_asc",
                            label: "按创建时间（最早在前）",
                          },
                        ]}
                      />
                    </div>
                    {!USE_MOCK_OPPORTUNITIES && loadingSolutions && (
                      <Paragraph
                        type="secondary"
                        style={{ fontSize: 12, marginBottom: 4 }}
                      >
                        方案版本加载中...
                      </Paragraph>
                    )}
                    {!USE_MOCK_OPPORTUNITIES && solutionsError && (
                      <Paragraph
                        type="danger"
                        style={{ fontSize: 12, marginBottom: 4 }}
                      >
                        {solutionsError}
                      </Paragraph>
                    )}
                    {(() => {
                      const rawSolutions = USE_MOCK_OPPORTUNITIES
                        ? selected.solutionVersions || []
                        : apiSolutions;

                      const filteredSolutions = rawSolutions.filter((sv) => {
                        if (
                          solutionStatusFilter &&
                          solutionStatusFilter.length > 0 &&
                          sv.status !== solutionStatusFilter
                        ) {
                          return false;
                        }
                        return true;
                      });

                      const sortedSolutions = [...filteredSolutions].sort(
                        (a, b) => {
                          const at = new Date(a.createdAt).getTime();
                          const bt = new Date(b.createdAt).getTime();
                          if (solutionSortKey === "createdAt_asc") {
                            return at - bt;
                          }
                          // 默认：最新在前
                          return bt - at;
                        },
                      );

                      if (sortedSolutions.length === 0) {
                        return (
                          <Paragraph
                            type="secondary"
                            style={{ fontSize: 12, marginBottom: 0 }}
                          >
                            当前商机在当前筛选条件下暂无方案版本，
                            可调整状态筛选或稍后在此查看方案版本及其评审状态。
                          </Paragraph>
                        );
                      }

                      const draftCount = sortedSolutions.filter(
                        (sv) => sv.status === "draft",
                      ).length;
                      const inReviewCount = sortedSolutions.filter(
                        (sv) => sv.status === "in_review",
                      ).length;
                      const approvedCount = sortedSolutions.filter(
                        (sv) => sv.status === "approved",
                      ).length;
                      const rejectedCount = sortedSolutions.filter(
                        (sv) => sv.status === "rejected",
                      ).length;

                      const recommended =
                        sortedSolutions.find(
                          (sv) => sv.status === "approved",
                        ) || sortedSolutions[0];
                      const recommendedId = recommended ? recommended.id : null;

                      return (
                        <>
                          {sortedSolutions.map((sv) => (
                            <div
                              key={sv.id}
                              style={{
                                padding: "8px 0",
                                borderBottom: "1px solid #f5f5f5",
                              }}
                            >
                              <Paragraph style={{ marginBottom: 4 }}>
                                {sv.name}
                                {sv.versionTag
                                  ? `（${sv.versionTag}）`
                                  : null}
                                {recommendedId === sv.id && (
                                  <Tag color="gold" style={{ marginLeft: 8 }}>
                                    推荐版本（示例）
                                  </Tag>
                                )}
                              </Paragraph>
                              <Paragraph
                                type="secondary"
                                style={{ marginBottom: 4, fontSize: 12 }}
                              >
                                状态：
                                <Tag
                                  color={
                                    SOLUTION_STATUS_COLORS[sv.status] || "default"
                                  }
                                  style={{ marginLeft: 4, marginRight: 4 }}
                                >
                                  {SOLUTION_STATUS_LABELS[sv.status] || sv.status}
                                </Tag>
                                ｜创建时间：{sv.createdAt}
                              </Paragraph>
                              {sv.summary && (
                                <Paragraph
                                  type="secondary"
                                  style={{ marginBottom: 0, fontSize: 12 }}
                                >
                                  {sv.summary}
                                </Paragraph>
                              )}
                              <Paragraph
                                type="secondary"
                                style={{ marginBottom: 4, fontSize: 12 }}
                              >
                                评审记录（示例）：
                                {USE_MOCK_OPPORTUNITIES ? (
                                  sv.status === "approved" ? (
                                    "已通过方案评审，建议按当前版本准备投标材料。"
                                  ) : sv.status === "in_review" ? (
                                    "评审中，请补充成本测算与实施风险评估后再提交。"
                                  ) : sv.status === "rejected" ? (
                                    "上轮评审未通过，需根据评审意见调整方案范围与报价策略。"
                                  ) : (
                                    "暂未进入正式评审流程，可在内部完善方案后发起评审。"
                                  )
                                ) : (
                                  "点击下方“查看评审记录”将尝试加载后端返回的真实评审记录（如已在后端实现），否则保持示例展示。"
                                )}
                              </Paragraph>
                              <Button
                                type="link"
                                size="small"
                                style={{ padding: 0 }}
                                onClick={() =>
                                  setExpandedReviewSolutionId((prev) =>
                                    prev === sv.id ? null : sv.id,
                                  )
                                }
                              >
                                {expandedReviewSolutionId === sv.id
                                  ? "收起评审记录"
                                  : "查看评审记录（示例）"}
                              </Button>
                              {expandedReviewSolutionId === sv.id && (
                                <div style={{ marginTop: 4 }}>
                                  {USE_MOCK_OPPORTUNITIES ? (
                                    <>
                                      <Paragraph
                                        type="secondary"
                                        style={{ fontSize: 12, marginBottom: 2 }}
                                      >
                                        · 2026-03-19 10:00 评审人：示例经理 —— 同意该版本整体架构设计，建议在正式投标前补充成本测算明细。
                                      </Paragraph>
                                      <Paragraph
                                        type="secondary"
                                        style={{ fontSize: 12, marginBottom: 0 }}
                                      >
                                        · 2026-03-18 15:30 评审人：网络专家 —— 建议在安全接入方案中补充零信任访问控制细则与审计策略说明。
                                      </Paragraph>
                                    </>
                                  ) : loadingReviewRecords ? (
                                    <Paragraph
                                      type="secondary"
                                      style={{
                                        fontSize: 12,
                                        marginBottom: 0,
                                      }}
                                    >
                                      评审记录加载中...
                                    </Paragraph>
                                  ) : reviewRecordsError ? (
                                    <Paragraph
                                      type="danger"
                                      style={{
                                        fontSize: 12,
                                        marginBottom: 0,
                                      }}
                                    >
                                      {reviewRecordsError}
                                    </Paragraph>
                                  ) : reviewRecords.length === 0 ? (
                                    <Paragraph
                                      type="secondary"
                                      style={{
                                        fontSize: 12,
                                        marginBottom: 0,
                                      }}
                                    >
                                      当前方案版本暂无评审记录。
                                    </Paragraph>
                                  ) : (
                                    reviewRecords.map((record) => (
                                      <Paragraph
                                        key={record.id}
                                        type="secondary"
                                        style={{
                                          fontSize: 12,
                                          marginBottom: 2,
                                        }}
                                      >
                                        · {record.createdAt} 评审人：
                                        {record.reviewerName || "未知评审人"} ——{" "}
                                        {record.comment}
                                      </Paragraph>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                          <Divider style={{ margin: "12px 0" }} />
                          <Title level={5} style={{ marginBottom: 4, fontSize: 14 }}>
                            评审结果摘要（示例）
                          </Title>
                          <Paragraph
                            type="secondary"
                            style={{ fontSize: 12, marginBottom: 4 }}
                          >
                            草稿：{draftCount} 个｜评审中：
                            {inReviewCount} 个｜已通过：
                            {approvedCount} 个｜已驳回：
                            {rejectedCount} 个
                          </Paragraph>
                          <Paragraph
                            type="secondary"
                            style={{ fontSize: 12, marginBottom: 4 }}
                          >
                            当前推荐版本（示例）：
                            {recommended
                              ? `${recommended.name}${
                                  recommended.versionTag
                                    ? `（${recommended.versionTag}）`
                                    : ""
                                }`
                              : "暂无推荐版本"}
                          </Paragraph>
                          <Paragraph
                            type="secondary"
                            style={{ fontSize: 12, marginBottom: 0 }}
                          >
                            当前评审摘要基于方案版本状态的简单统计，
                            后续接入评审记录（ReviewRecord）后，
                            可在此展示更详细的评审结论与建议。
                          </Paragraph>
                        </>
                      );
                    })()}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        <Modal
          title={
            USE_MOCK_OPPORTUNITIES ? "新建方案版本（Mock）" : "新建方案版本"
          }
          open={isCreateSolutionModalVisible}
          onOk={handleCreateSolutionVersion}
          onCancel={() => setIsCreateSolutionModalVisible(false)}
          okText="保存"
          cancelText="取消"
          destroyOnClose
        >
          <Form form={createSolutionForm} layout="vertical">
            <Form.Item
              label="方案版本名称"
              name="name"
              rules={[{ required: true, message: "请输入方案版本名称" }]}
            >
              <Input placeholder="例如：统一安全接入方案 v1.1" />
            </Form.Item>
            <Form.Item label="版本标记" name="versionTag">
              <Input placeholder="例如：v1.1 或 内测版" />
            </Form.Item>
            <Form.Item
              label="状态"
              name="status"
              rules={[{ required: true, message: "请选择方案状态" }]}
            >
              <Select
                placeholder="请选择方案状态"
                options={[
                  { value: "draft", label: "草稿（draft）" },
                  { value: "in_review", label: "评审中（in_review）" },
                  { value: "approved", label: "已通过（approved）" },
                  { value: "rejected", label: "已驳回（rejected）" },
                  { value: "archived", label: "已归档（archived）" },
                ]}
              />
            </Form.Item>
            <Form.Item label="摘要说明" name="summary">
              <Input.TextArea
                rows={3}
                placeholder="简要说明该版本的变更点或适用场景"
              />
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
}
