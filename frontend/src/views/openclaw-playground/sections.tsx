import {
  Button,
  Card,
  Empty,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import type { CurrentUser } from "../../shared/auth";
import {
  FactGrid,
  QUICK_COMMANDS,
  QUICK_COMMAND_HINTS,
  getOutcomeExplanation,
  getOutcomeMeta,
  getSkillVisualMeta,
} from "./helpers";
import {
  BlockedResultCard,
  ErrorResultCard,
  InitialResultEmptyState,
  SuccessResultCard,
} from "./cards";
import type {
  HistoryFilter,
  PlaygroundErrorResponse,
  PlaygroundResponse,
  RequestRecord,
  PlaygroundSkillDefinition,
  PlaygroundSkillName,
  SuccessInsight,
} from "./types";

const { Text } = Typography;
const { Paragraph } = Typography;
const { TextArea } = Input;

export function OpenClawQueryComposer(props: {
  queryText: string;
  running: boolean;
  skillCatalogLoading: boolean;
  skillCatalogError: string;
  skillDefinitions: PlaygroundSkillDefinition[];
  selectedSkillName: PlaygroundSkillName;
  selectedSkillInput: {
    code: string;
    limit: number;
    businessType: "" | "opportunity" | "solution";
  };
  showRawPayload: boolean;
  onChangeQueryText: (value: string) => void;
  onChangeSelectedSkillName: (value: PlaygroundSkillName) => void;
  onChangeSelectedSkillInput: (
    patch: Partial<{
      code: string;
      limit: number;
      businessType: "" | "opportunity" | "solution";
    }>,
  ) => void;
  onRunQuery: (queryText?: string) => Promise<void> | void;
  onRunSkill: () => Promise<void> | void;
  onReloadSkills: () => Promise<void> | void;
  onCopySummary: () => Promise<void> | void;
  onCopyRawPayload: () => Promise<void> | void;
  onExportHistory: () => void;
  onToggleRawPayload: () => void;
  onReset: () => void;
}) {
  const {
    queryText,
    running,
    skillCatalogLoading,
    skillCatalogError,
    skillDefinitions,
    selectedSkillName,
    selectedSkillInput,
    showRawPayload,
    onChangeQueryText,
    onChangeSelectedSkillName,
    onChangeSelectedSkillInput,
    onRunQuery,
    onRunSkill,
    onReloadSkills,
    onCopySummary,
    onCopyRawPayload,
    onExportHistory,
    onToggleRawPayload,
    onReset,
  } = props;

  const selectedSkill = skillDefinitions.find((item) => item.name === selectedSkillName);
  const selectedSkillSchema = selectedSkill?.inputSchema;
  const requiresCode = Boolean(selectedSkillSchema?.properties?.code);
  const supportsLimit = Boolean(selectedSkillSchema?.properties?.limit);
  const supportsBusinessType = Boolean(selectedSkillSchema?.properties?.businessType);

  return (
    <Card title="OpenClaw 联调台" extra={<Tag color="processing">只读联调模式</Tag>}>
      <div style={{ display: "grid", gap: 14 }}>
        <Text type="secondary">
          这里直接走平台登录态调用浏览器专用联调接口，用于验证 OpenClaw
          的技能命中、只读拦截、摘要结果和联调日志。
        </Text>

        <div style={{ display: "grid", gap: 10 }}>
          <Text strong>快捷命令</Text>
          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            {QUICK_COMMANDS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  onChangeQueryText(item.queryText);
                  void onRunQuery(item.queryText);
                }}
                style={{
                  textAlign: "left",
                  border: "1px solid var(--app-border)",
                  borderRadius: 16,
                  padding: "14px 15px",
                  background:
                    "linear-gradient(180deg, color-mix(in srgb, var(--app-surface-soft) 88%, white 12%) 0%, var(--app-surface) 100%)",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <Text strong>{item.label}</Text>
                  <Tag color={item.tone}>{item.label}</Tag>
                </div>
                <div style={{ fontSize: 12, color: "#595959", marginBottom: 8 }}>
                  {QUICK_COMMAND_HINTS[item.key]}
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {item.queryText}
                </Text>
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 12,
            borderRadius: 18,
            padding: 16,
            background:
              "linear-gradient(160deg, color-mix(in srgb, var(--app-surface-soft) 86%, white 14%) 0%, var(--app-surface) 100%)",
            border: "1px solid var(--app-border)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  color: "#8c8c8c",
                  marginBottom: 6,
                }}
              >
                输入区
              </div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>发送联调请求</div>
            </div>
            <Tag color={running ? "processing" : "default"}>
              {running ? "请求中" : "待发送"}
            </Tag>
          </div>

          <TextArea
            value={queryText}
            onChange={(event) => onChangeQueryText(event.target.value)}
            rows={4}
            placeholder="例如：给我今日简报 / 商机摘要 OPP-000001 / 帮我审批通过 OPP-000001"
          />

          <Space wrap>
            <Button type="primary" loading={running} onClick={() => void onRunQuery()}>
              发送测试
            </Button>
            <Button onClick={() => void onCopySummary()}>复制摘要</Button>
            <Button onClick={() => void onCopyRawPayload()}>复制原始数据</Button>
            <Button onClick={onExportHistory}>导出最近 5 条记录</Button>
            <Button onClick={onToggleRawPayload}>
              {showRawPayload ? "收起调试区" : "展开调试区"}
            </Button>
            <Button onClick={onReset}>重置</Button>
          </Space>
        </div>

        <div
          style={{
            display: "grid",
            gap: 12,
            borderRadius: 18,
            padding: 16,
            background:
              "linear-gradient(160deg, color-mix(in srgb, #f6ffed 82%, white 18%) 0%, var(--app-surface) 100%)",
            border: "1px solid var(--app-border)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  color: "#8c8c8c",
                  marginBottom: 6,
                }}
              >
                Skill 模式
              </div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>结构化技能执行</div>
            </div>
            <Space wrap>
              <Tag color="green">{skillDefinitions.length} 个只读 skill</Tag>
              <Button loading={skillCatalogLoading} onClick={() => void onReloadSkills()}>
                刷新技能目录
              </Button>
            </Space>
          </div>

          <Text type="secondary">
            这里直接验证技能目录、输入 schema 和结构化执行结果，不依赖自然语言意图识别。
          </Text>

          {skillCatalogError ? (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,77,79,0.28)",
                background: "rgba(255,77,79,0.06)",
                color: "#cf1322",
                fontSize: 13,
              }}
            >
              {skillCatalogError}
            </div>
          ) : null}

          <Select
            value={selectedSkillName}
            onChange={onChangeSelectedSkillName}
            options={skillDefinitions.map((item) => ({
              label: item.name,
              value: item.name,
            }))}
          />

          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            {requiresCode ? (
              <div style={{ display: "grid", gap: 6 }}>
                <Text strong>业务编号</Text>
                <Input
                  value={selectedSkillInput.code}
                  onChange={(event) =>
                    onChangeSelectedSkillInput({ code: event.target.value.toUpperCase() })
                  }
                  placeholder={
                    selectedSkillName === "get_solution_summary"
                      ? "例如：SOL-000123"
                      : "例如：OPP-000003"
                  }
                />
              </div>
            ) : null}

            {supportsLimit ? (
              <div style={{ display: "grid", gap: 6 }}>
                <Text strong>返回条数</Text>
                <InputNumber
                  min={1}
                  max={20}
                  value={selectedSkillInput.limit}
                  onChange={(value) =>
                    onChangeSelectedSkillInput({
                      limit: typeof value === "number" ? value : 5,
                    })
                  }
                  style={{ width: "100%" }}
                />
              </div>
            ) : null}

            {supportsBusinessType ? (
              <div style={{ display: "grid", gap: 6 }}>
                <Text strong>业务类型</Text>
                <Select
                  value={selectedSkillInput.businessType || undefined}
                  onChange={(value) =>
                    onChangeSelectedSkillInput({
                      businessType: (value || "") as "" | "opportunity" | "solution",
                    })
                  }
                  allowClear
                  placeholder="全部类型"
                  options={[
                    { label: "商机", value: "opportunity" },
                    { label: "方案", value: "solution" },
                  ]}
                />
              </div>
            ) : null}
          </div>

          <div
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              background: "var(--app-surface-soft)",
              border: "1px solid var(--app-border)",
            }}
          >
            <Text strong>{selectedSkill?.name || selectedSkillName}</Text>
            <div style={{ marginTop: 6, fontSize: 13, color: "#595959" }}>
              {selectedSkill?.description || "当前 skill 描述暂未加载。"}
            </div>
          </div>

          <Space wrap>
            <Button type="primary" loading={running} onClick={() => void onRunSkill()}>
              执行 Skill
            </Button>
            <Tag color="blue">
              schema: {selectedSkillSchema?.type || "object"}
            </Tag>
            <Tag color="default">只读执行</Tag>
          </Space>
        </div>
      </div>
    </Card>
  );
}

export function OpenClawSessionOverview(props: {
  latestSkillName?: string;
  sessionStats: {
    total: number;
    success: number;
    blocked: number;
    error: number;
  };
  latestRequestedAt?: string;
}) {
  const { latestSkillName, sessionStats, latestRequestedAt } = props;

  return (
    <Card title="会话概览" extra={latestSkillName ? <Tag color="blue">{latestSkillName}</Tag> : undefined}>
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        }}
      >
        {[
          { label: "本轮请求", value: String(sessionStats.total), color: "default" },
          { label: "成功返回", value: String(sessionStats.success), color: "green" },
          { label: "只读拦截", value: String(sessionStats.blocked), color: "gold" },
          { label: "异常失败", value: String(sessionStats.error), color: "red" },
          {
            label: "最近时间",
            value: latestRequestedAt || "暂未发送",
            color: "processing",
          },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              border: "1px solid var(--app-border)",
              borderRadius: 14,
              padding: 14,
              background: "var(--app-surface-soft)",
            }}
          >
            <div style={{ marginBottom: 8 }}>
              <Tag color={item.color}>{item.label}</Tag>
            </div>
            <div
              style={{
                fontSize: item.label === "最近时间" ? 14 : 28,
                fontWeight: 700,
                lineHeight: 1.5,
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function OpenClawResultPanel(props: {
  queryText: string;
  result: PlaygroundResponse | null;
  blockedResult: PlaygroundErrorResponse | null;
  errorMessage: string;
  resultPreview: { title: string; lines: string[] } | null;
  successMeta: SuccessInsight | null;
  successInsightMeta: {
    color: string;
    label: string;
    detail: string;
  };
  errorMeta: {
    title: string;
    accent: string;
    suggestions: string[];
  };
}) {
  const {
    queryText,
    result,
    blockedResult,
    errorMessage,
    resultPreview,
    successMeta,
    successInsightMeta,
    errorMeta,
  } = props;

  return (
    <Card title="结果区">
      {result ? (
        <SuccessResultCard
          result={result}
          resultPreview={resultPreview}
          successMeta={successMeta}
          successInsightMeta={successInsightMeta}
        />
      ) : blockedResult ? (
        <BlockedResultCard queryText={queryText} blockedResult={blockedResult} />
      ) : errorMessage ? (
        <ErrorResultCard
          queryText={queryText}
          errorMessage={errorMessage}
          errorMeta={errorMeta}
        />
      ) : (
        <InitialResultEmptyState />
      )}
    </Card>
  );
}

export function OpenClawSidebar(props: {
  currentUser: CurrentUser | null;
  accessToken?: string | null;
  result: PlaygroundResponse | null;
  activeHistoryRecord: RequestRecord | null;
  latestSummary:
    | {
        title: string;
        detail: string;
      }
    | null;
  latestOutcome?: RequestRecord["outcome"];
  latestSkillName?: string;
  latestSkillMeta: {
    accent: string;
    soft: string;
  };
  successMeta: SuccessInsight | null;
  errorMeta: {
    suggestions: string[];
  };
  showRawPayload: boolean;
  activeDebugPayload: string;
  onToggleRawPayload: () => void;
}) {
  const {
    currentUser,
    accessToken,
    result,
    activeHistoryRecord,
    latestSummary,
    latestOutcome,
    latestSkillName,
    latestSkillMeta,
    successMeta,
    errorMeta,
    showRawPayload,
    activeDebugPayload,
    onToggleRawPayload,
  } = props;

  return (
    <>
      <Card title="联调上下文">
        <FactGrid
          accent="#722ed1"
          items={[
            {
              label: "平台用户",
              value: currentUser?.displayName || currentUser?.username || "未登录",
            },
            { label: "系统角色", value: currentUser?.roleLabel || "未知" },
            { label: "登录令牌", value: accessToken ? "已检测到" : "未检测到" },
            { label: "联调接口", value: "/integrations/openclaw/playground/query" },
            {
              label: "联调边界",
              value: "只读技能，不执行审批/创建/修改/删除/指派",
            },
            {
              label: "当前 actor",
              value:
                result?.actor?.username ||
                (activeHistoryRecord?.snapshot.kind === "success"
                  ? activeHistoryRecord.snapshot.payload.actor?.username || "待返回"
                  : currentUser?.username || "待返回"),
            },
          ]}
        />
      </Card>

      <Card title="最近状态">
        {latestSummary ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <Text strong>{latestSummary.title}</Text>
              <Tag
                color={
                  latestOutcome === "success"
                    ? "green"
                    : latestOutcome === "blocked"
                      ? "gold"
                      : latestOutcome === "error"
                        ? "red"
                        : "default"
                }
              >
                {latestOutcome === "success"
                  ? "成功"
                  : latestOutcome === "blocked"
                    ? "安全拦截"
                    : latestOutcome === "error"
                      ? "失败"
                      : "待发送"}
              </Tag>
            </div>
            <div
              style={{
                borderRadius: 12,
                border: `1px solid color-mix(in srgb, ${latestSkillMeta.accent} 18%, var(--app-border) 82%)`,
                padding: 12,
                background: `linear-gradient(180deg, ${latestSkillMeta.soft} 0%, var(--app-surface-soft) 100%)`,
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              <div style={{ marginBottom: 8 }}>{latestSummary.detail}</div>
              <div style={{ color: "#8c8c8c" }}>
                    {latestOutcome === "success" && successMeta
                      ? successMeta.title
                      : getOutcomeExplanation(latestOutcome || "error", latestSkillName)}
              </div>
              {latestOutcome === "error" ? (
                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  {errorMeta.suggestions.slice(0, 2).map((item) => (
                    <div
                      key={item}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.72)",
                        border: "1px solid var(--app-border)",
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              ) : latestOutcome === "success" && successMeta ? (
                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  <Tag color={successMeta.kind === "business_empty" ? "blue" : "gold"}>
                    {successMeta.kind === "business_empty"
                      ? "成功空结果"
                      : "成功但结构待排查"}
                  </Tag>
                  {successMeta.suggestions.slice(0, 2).map((item) => (
                    <div
                      key={item}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.72)",
                        border: "1px solid var(--app-border)",
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="发起一次联调后，这里会显示最近状态。"
          />
        )}
      </Card>

      <Card
        title="调试区"
        extra={
          <Button size="small" onClick={onToggleRawPayload}>
            {showRawPayload ? "收起" : "展开"}
          </Button>
        }
      >
        {!showRawPayload ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="展开后查看 requestId、actor、raw JSON 和错误负载。"
          />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {latestSkillName ? <Tag color="blue">{latestSkillName}</Tag> : null}
              {result?.requestId ? <Tag color="purple">requestId: {result.requestId}</Tag> : null}
              {result?.actor?.username ? <Tag color="geekblue">actor: {result.actor.username}</Tag> : null}
            </div>
            <Paragraph
              copyable
              style={{
                marginBottom: 0,
                whiteSpace: "pre-wrap",
                fontFamily: "SFMono-Regular, Consolas, monospace",
                fontSize: 12,
                borderRadius: 14,
                border: "1px solid var(--app-border)",
                background: "var(--app-surface-soft)",
                padding: 12,
              }}
            >
              {activeDebugPayload || "当前没有调试数据。"}
            </Paragraph>
          </div>
        )}
      </Card>
    </>
  );
}

export function OpenClawHistoryPanel(props: {
  historyFilter: HistoryFilter;
  requestHistory: RequestRecord[];
  filteredHistory: RequestRecord[];
  activeHistoryRecord: RequestRecord | null;
  onChangeFilter: (filter: HistoryFilter) => void;
  onSelectHistory: (record: RequestRecord) => void;
  onReplayHistory: (record: RequestRecord) => Promise<void> | void;
  onReuseHistory: (record: RequestRecord) => void;
}) {
  const {
    historyFilter,
    requestHistory,
    filteredHistory,
    activeHistoryRecord,
    onChangeFilter,
    onSelectHistory,
    onReplayHistory,
    onReuseHistory,
  } = props;

  return (
    <Card
      title="请求记录"
      extra={
        <Space wrap>
          <Button
            size="small"
            type={historyFilter === "all" ? "primary" : "default"}
            onClick={() => onChangeFilter("all")}
          >
            全部
          </Button>
          <Button
            size="small"
            type={historyFilter === "success" ? "primary" : "default"}
            onClick={() => onChangeFilter("success")}
          >
            成功
          </Button>
          <Button
            size="small"
            type={historyFilter === "blocked" ? "primary" : "default"}
            onClick={() => onChangeFilter("blocked")}
          >
            安全拦截
          </Button>
          <Button
            size="small"
            type={historyFilter === "error" ? "primary" : "default"}
            onClick={() => onChangeFilter("error")}
          >
            失败
          </Button>
        </Space>
      }
    >
      {filteredHistory.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            requestHistory.length === 0 ? "还没有联调记录。" : "当前筛选条件下没有匹配记录。"
          }
        />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filteredHistory.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectHistory(item)}
              style={{
                border: "1px solid var(--app-border)",
                borderRadius: 18,
                padding: 14,
                background:
                  activeHistoryRecord?.id === item.id
                    ? "linear-gradient(180deg, rgba(22,119,255,0.08) 0%, rgba(22,119,255,0.02) 100%)"
                    : "var(--app-surface-soft)",
                boxShadow:
                  activeHistoryRecord?.id === item.id
                    ? "0 0 0 1px rgba(22,119,255,0.25) inset"
                    : "none",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ display: "grid", gap: 10 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Tag color={getOutcomeMeta(item.outcome).color}>
                      {getOutcomeMeta(item.outcome).label}
                    </Tag>
                    <Tag color="blue">{item.skillName}</Tag>
                    <Tag>{item.requestedAt}</Tag>
                  </div>
                  <Space>
                    <Button
                      size="small"
                      onClick={(event) => {
                        event.stopPropagation();
                        void onReplayHistory(item);
                      }}
                    >
                      再次执行
                    </Button>
                    <Button
                      size="small"
                      onClick={(event) => {
                        event.stopPropagation();
                        onReuseHistory(item);
                      }}
                    >
                      回填输入框
                    </Button>
                  </Space>
                </div>

                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: `linear-gradient(135deg, ${getSkillVisualMeta(item.skillName).accent} 0%, color-mix(in srgb, ${getSkillVisualMeta(item.skillName).accent} 75%, white 25%) 100%)`,
                    color: "#fff",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  {item.queryText}
                </div>

                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "#fff",
                    border: `1px solid color-mix(in srgb, ${getSkillVisualMeta(item.skillName).accent} 18%, var(--app-border) 82%)`,
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{item.responseTitle}</div>
                  <div style={{ color: "#595959" }}>
                    {item.responseDetail.length > 140
                      ? `${item.responseDetail.slice(0, 140)}...`
                      : item.responseDetail}
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#8c8c8c",
                      fontSize: 12,
                    }}
                  >
                    {getOutcomeExplanation(item.outcome, item.skillName)}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
