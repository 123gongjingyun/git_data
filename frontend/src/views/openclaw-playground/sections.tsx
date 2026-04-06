import {
  Button,
  Card,
  Empty,
  Input,
  Space,
  Tag,
  Typography,
} from "antd";
import type { CurrentUser } from "../../shared/auth";
import {
  FactGrid,
  MetaStrip,
  QUICK_COMMANDS,
  QUICK_COMMAND_HINTS,
  buildFactItems,
  getOutcomeExplanation,
  getOutcomeMeta,
  getSkillVisualMeta,
} from "./helpers";
import type {
  HistoryFilter,
  PlaygroundErrorResponse,
  PlaygroundResponse,
  RequestRecord,
  SuccessInsight,
} from "./types";

const { Text } = Typography;
const { Paragraph } = Typography;
const { TextArea } = Input;

export function OpenClawQueryComposer(props: {
  queryText: string;
  running: boolean;
  showRawPayload: boolean;
  onChangeQueryText: (value: string) => void;
  onRunQuery: (queryText?: string) => Promise<void> | void;
  onCopySummary: () => Promise<void> | void;
  onCopyRawPayload: () => Promise<void> | void;
  onExportHistory: () => void;
  onToggleRawPayload: () => void;
  onReset: () => void;
}) {
  const {
    queryText,
    running,
    showRawPayload,
    onChangeQueryText,
    onRunQuery,
    onCopySummary,
    onCopyRawPayload,
    onExportHistory,
    onToggleRawPayload,
    onReset,
  } = props;

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
        <div style={{ display: "grid", gap: 14 }}>
          <MetaStrip
            title={resultPreview?.title || "最近结果"}
            statusMeta={getOutcomeMeta("success")}
            skillName={result.intent?.skillName || "unknown"}
            reason={result.intent?.reason || "未返回命中原因"}
            requestId={result.requestId}
            queryText={result.queryText}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Tag color={successInsightMeta.color}>{successInsightMeta.label}</Tag>
              <Tag color="cyan">{successInsightMeta.detail}</Tag>
            </div>
            <FactGrid
              items={buildFactItems(result.result, result.intent?.skillName)}
              accent={getSkillVisualMeta(result.intent?.skillName).accent}
            />
          </MetaStrip>

          {successMeta ? (
            <div
              style={{
                display: "grid",
                gap: 8,
                borderRadius: 16,
                padding: 16,
                background: `color-mix(in srgb, ${successMeta.accent} 10%, white 90%)`,
                border: `1px solid color-mix(in srgb, ${successMeta.accent} 18%, var(--app-border) 82%)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 700 }}>{successMeta.title}</div>
                <Tag color={successMeta.kind === "business_empty" ? "blue" : "gold"}>
                  {successMeta.kind === "business_empty" ? "业务空结果" : "结构不完整"}
                </Tag>
              </div>
              {successMeta.suggestions.map((item) => (
                <div
                  key={item}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.72)",
                    border: "1px solid var(--app-border)",
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          ) : null}

          <div
            style={{
              borderRadius: 16,
              padding: 16,
              background: `linear-gradient(180deg, ${getSkillVisualMeta(result.intent?.skillName).soft} 0%, var(--app-surface) 100%)`,
              border: `1px solid color-mix(in srgb, ${getSkillVisualMeta(result.intent?.skillName).accent} 18%, var(--app-border) 82%)`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  color: "#8c8c8c",
                }}
              >
                结果摘要
              </div>
              <Tag color={getSkillVisualMeta(result.intent?.skillName).accent}>
                {getSkillVisualMeta(result.intent?.skillName).label}
              </Tag>
            </div>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                background: "color-mix(in srgb, var(--app-surface-soft) 78%, white 22%)",
                fontSize: 13,
                lineHeight: 1.7,
                marginBottom: 10,
              }}
            >
              {getOutcomeExplanation("success", result.intent?.skillName)}
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {resultPreview?.lines.map((line) => (
                <div
                  key={line}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "var(--app-surface-soft)",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : blockedResult ? (
        <MetaStrip
          title="已安全拦截，未执行写操作"
          statusMeta={getOutcomeMeta("blocked")}
          skillName="readonly_guard"
          reason={blockedResult.error || "命中了只读边界保护"}
          queryText={queryText}
        >
          <FactGrid
            accent="#faad14"
            items={[
              { label: "状态", value: "预期中的只读保护" },
              { label: "拦截类型", value: "写操作保护" },
              { label: "当前模式", value: "OpenClaw 只读联调" },
              {
                label: "建议改问",
                value: "待我审批 / 今日简报 / 商机摘要 / 方案摘要",
              },
              {
                label: "返回信息",
                value: blockedResult.message || "当前命令不会被执行",
              },
            ]}
          />
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              background: "rgba(250,173,20,0.10)",
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            {getOutcomeExplanation("blocked", "readonly_guard")}
          </div>
        </MetaStrip>
      ) : errorMessage ? (
        <MetaStrip
          title={errorMeta.title}
          statusMeta={getOutcomeMeta("error")}
          reason={errorMessage}
          queryText={queryText}
        >
          <FactGrid
            accent={errorMeta.accent}
            items={[
              { label: "主状态", value: errorMeta.title },
              { label: "异常分类", value: errorMeta.title },
              { label: "错误信息", value: errorMessage },
            ]}
          />
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              background: `color-mix(in srgb, ${errorMeta.accent} 10%, white 90%)`,
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            {getOutcomeExplanation("error")}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {errorMeta.suggestions.map((item) => (
              <div
                key={item}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "var(--app-surface-soft)",
                  fontSize: 13,
                  lineHeight: 1.7,
                  border: "1px solid var(--app-border)",
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </MetaStrip>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="先发送一条联调命令。建议从“待我审批”或“今日简报”开始。"
        />
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
