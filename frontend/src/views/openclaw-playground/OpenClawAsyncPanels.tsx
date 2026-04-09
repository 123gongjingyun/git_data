import { Button, Card, Empty, Space, Tag, Typography } from "antd";
import type { CurrentUser } from "../../shared/auth";
import {
  FactGrid,
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

const { Text, Paragraph } = Typography;

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
