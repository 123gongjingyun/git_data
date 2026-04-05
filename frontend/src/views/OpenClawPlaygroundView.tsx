import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Row,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { useMemo, useState } from "react";
import type { CurrentUser } from "../shared/auth";
import { buildApiUrl } from "../shared/api";

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

type PlaygroundIntent = {
  skillName: string;
  arguments?: Record<string, unknown>;
  reason?: string;
};

type PlaygroundActor = {
  platformUserId?: number;
  username?: string;
  role?: string;
  feishuOpenId?: string;
};

type PlaygroundResponse = {
  requestId: string;
  queryText: string;
  intent: PlaygroundIntent;
  actor: PlaygroundActor;
  result: Record<string, unknown>;
};

type RequestRecord = {
  id: string;
  queryText: string;
  skillName: string;
  requestedAt: string;
  outcome: "success" | "error";
};

interface OpenClawPlaygroundViewProps {
  currentUser: CurrentUser | null;
  accessToken?: string | null;
}

const QUICK_COMMANDS = [
  { key: "pending", label: "待我审批", queryText: "待我审批", tone: "blue" },
  { key: "brief", label: "今日简报", queryText: "给我今日简报", tone: "gold" },
  {
    key: "opportunity",
    label: "商机摘要",
    queryText: "商机摘要 OPP-000001",
    tone: "purple",
  },
  {
    key: "solution",
    label: "方案摘要",
    queryText: "方案摘要 SOL-000001",
    tone: "green",
  },
  {
    key: "readonly",
    label: "只读拦截",
    queryText: "帮我审批通过 OPP-000001",
    tone: "red",
  },
] as const;

function formatDateTime(value: Date) {
  return value.toLocaleString("zh-CN", { hour12: false });
}

function formatCurrency(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return undefined;
  }
  return `¥${numeric.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateLabel(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  if (value.includes("T")) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString("zh-CN", { hour12: false });
    }
  }
  return value;
}

function stringifyValue(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return "暂未返回";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function buildResultPreview(result: Record<string, unknown>, skillName?: string) {
  if (skillName === "get_my_pending_approvals") {
    const items = Array.isArray(result.items) ? result.items : [];
    if (items.length === 0) {
      return {
        title: "当前没有待审批。",
        lines: ["你当前账号下没有可直接处理的审批事项。"],
      };
    }

    return {
      title: `当前共有 ${stringifyValue(result.total ?? items.length)} 条待审批。`,
      lines: items.slice(0, 3).map((item) => {
        const row = item as Record<string, unknown>;
        return `${stringifyValue(row.businessCode)} · ${stringifyValue(row.currentNodeName)} · ${stringifyValue(row.summary || row.title)}`;
      }),
    };
  }

  if (skillName === "get_daily_brief") {
    return {
      title: "今日简报",
      lines: [
        `日期：${stringifyValue(result.date)}`,
        `待审批：${stringifyValue(result.pendingApprovalCount)} 条`,
        `风险商机：${stringifyValue(result.inRiskOpportunityCount)} 条`,
        `今日更新方案：${stringifyValue(result.updatedSolutionCount)} 个`,
        `关注商机：${stringifyValue(result.myOpportunityCount)} 条`,
      ],
    };
  }

  if (skillName === "get_opportunity_summary") {
    return {
      title: stringifyValue(result.code || result.name || "商机摘要"),
      lines: [
        `名称：${stringifyValue(result.name)}`,
        `阶段：${stringifyValue(result.stage)}`,
        `金额：${formatCurrency(result.expectedValue) || stringifyValue(result.expectedValue)}`,
        `赢单概率：${result.probability === undefined ? "暂未返回" : `${stringifyValue(result.probability)}%`}`,
        `当前审批节点：${stringifyValue(result.currentApprovalNodeName)}`,
        `核心风险：${stringifyValue(result.riskSummary)}`,
      ],
    };
  }

  if (skillName === "get_solution_summary") {
    return {
      title: stringifyValue(result.code || result.name || "方案摘要"),
      lines: [
        `名称：${stringifyValue(result.name)}`,
        `版本/状态：${stringifyValue(result.versionTag)} / ${stringifyValue(result.status)}`,
        `关联商机：${stringifyValue(result.opportunityCode)} ${stringifyValue(result.opportunityName)}`,
        `摘要：${stringifyValue(result.summary)}`,
        `最近评审：${stringifyValue(result.latestReviewConclusion)}`,
        `最近更新时间：${formatDateLabel(result.updatedAt) || stringifyValue(result.updatedAt)}`,
      ],
    };
  }

  return {
    title: "原始结果",
    lines: [stringifyValue(result)],
  };
}

export function OpenClawPlaygroundView(props: OpenClawPlaygroundViewProps) {
  const { currentUser, accessToken } = props;
  const [queryText, setQueryText] = useState("给我今日简报");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PlaygroundResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [requestHistory, setRequestHistory] = useState<RequestRecord[]>([]);

  const resultPreview = useMemo(
    () => (result ? buildResultPreview(result.result, result.intent?.skillName) : null),
    [result],
  );

  const buildAuthHeaders = (withJson = true) => {
    const headers: Record<string, string> = {};
    if (withJson) {
      headers["Content-Type"] = "application/json";
    }
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return headers;
  };

  const handleRunQuery = async (nextQueryText?: string) => {
    const normalizedQuery = (nextQueryText ?? queryText).trim();
    if (!normalizedQuery) {
      message.warning("请输入一条 OpenClaw 测试命令。");
      return;
    }
    if (!accessToken) {
      setErrorMessage("当前未检测到登录令牌，无法调用联调接口。");
      setResult(null);
      return;
    }

    setRunning(true);
    setErrorMessage("");
    try {
      const response = await fetch(buildApiUrl("/integrations/openclaw/playground/query"), {
        method: "POST",
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          queryText: normalizedQuery,
          requestId: `playground-${Date.now()}`,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `请求失败：${response.status}`);
      }

      const payload = (await response.json()) as PlaygroundResponse;
      setResult(payload);
      setRequestHistory((current) => [
        {
          id: payload.requestId,
          queryText: normalizedQuery,
          skillName: payload.intent?.skillName || "unknown",
          requestedAt: formatDateTime(new Date()),
          outcome: "success",
        },
        ...current,
      ].slice(0, 5));
      setQueryText(normalizedQuery);
      message.success("OpenClaw 联调结果已刷新。");
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : "OpenClaw 联调请求失败";
      setErrorMessage(nextMessage);
      setResult(null);
      setRequestHistory((current) => [
        {
          id: `error-${Date.now()}`,
          queryText: normalizedQuery,
          skillName: "error",
          requestedAt: formatDateTime(new Date()),
          outcome: "error",
        },
        ...current,
      ].slice(0, 5));
      message.error("OpenClaw 联调请求失败。");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
              OpenClaw 联调台
            </div>
            <Text type="secondary">
              这里直接走平台登录态调用浏览器专用联调接口，方便你在前端验证
              OpenClaw 的意图识别、只读拦截和摘要结果。
            </Text>
          </div>

          <Alert
            type="info"
            showIcon
            message={`当前登录账号：${currentUser?.displayName || currentUser?.username || "未登录"}${currentUser?.roleLabel ? ` · ${currentUser.roleLabel}` : ""}`}
            description="这个页面不会暴露 x-openclaw-token，而是通过当前平台登录态映射到后端 OpenClaw 调用。"
          />

          <Space wrap>
            {QUICK_COMMANDS.map((item) => (
              <Button
                key={item.key}
                onClick={() => {
                  setQueryText(item.queryText);
                  void handleRunQuery(item.queryText);
                }}
              >
                {item.label}
              </Button>
            ))}
          </Space>

          <TextArea
            value={queryText}
            onChange={(event) => setQueryText(event.target.value)}
            rows={4}
            placeholder="例如：给我今日简报 / 商机摘要 OPP-000001 / 帮我审批通过 OPP-000001"
          />

          <Space>
            <Button type="primary" loading={running} onClick={() => void handleRunQuery()}>
              发送测试
            </Button>
            <Button
              onClick={() => {
                setQueryText("给我今日简报");
                setResult(null);
                setErrorMessage("");
              }}
            >
              重置
            </Button>
          </Space>
        </div>
      </Card>

      {errorMessage ? (
        <Alert type="error" showIcon message="联调请求失败" description={errorMessage} />
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={15}>
          <Card
            title="结果预览"
            extra={
              result ? (
                <Tag color="processing">{result.intent?.skillName || "unknown"}</Tag>
              ) : undefined
            }
          >
            {!result || !resultPreview ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="发送一条命令后，在这里查看 OpenClaw 返回结果。"
              />
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                    {resultPreview.title}
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {resultPreview.lines.map((line) => (
                      <div
                        key={line}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
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

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Tag color="blue">requestId: {result.requestId}</Tag>
                  <Tag color="geekblue">reason: {result.intent?.reason || "n/a"}</Tag>
                  <Tag color="purple">
                    actor: {result.actor?.username || currentUser?.username || "unknown"}
                  </Tag>
                </div>

                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid var(--app-border)",
                    padding: 12,
                    background: "var(--app-surface-soft)",
                  }}
                >
                  <Text strong style={{ display: "block", marginBottom: 6 }}>
                    原始响应 JSON
                  </Text>
                  <Paragraph
                    copyable
                    style={{
                      marginBottom: 0,
                      whiteSpace: "pre-wrap",
                      fontFamily: "SFMono-Regular, Consolas, monospace",
                      fontSize: 12,
                    }}
                  >
                    {JSON.stringify(result, null, 2)}
                  </Paragraph>
                </div>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} xl={9}>
          <Card title="最近请求">
            {requestHistory.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="还没有联调记录。"
              />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {requestHistory.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      border: "1px solid var(--app-border)",
                      borderRadius: 12,
                      padding: 12,
                      background: "var(--app-surface-soft)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <Text strong>{item.queryText}</Text>
                      <Tag color={item.outcome === "success" ? "green" : "red"}>
                        {item.outcome === "success" ? "成功" : "失败"}
                      </Tag>
                    </div>
                    <div style={{ display: "grid", gap: 4, fontSize: 12, color: "#595959" }}>
                      <div>命中技能：{item.skillName}</div>
                      <div>请求时间：{item.requestedAt}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
