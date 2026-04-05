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

type PlaygroundErrorResponse = {
  message?: string;
  error?: string;
  statusCode?: number;
};

type RequestSnapshot =
  | {
      kind: "success";
      payload: PlaygroundResponse;
    }
  | {
      kind: "blocked";
      payload: PlaygroundErrorResponse;
    }
  | {
      kind: "error";
      payload: string;
    };

type RequestRecord = {
  id: string;
  queryText: string;
  skillName: string;
  requestedAt: string;
  outcome: "success" | "error" | "blocked";
  responseTitle: string;
  responseDetail: string;
  snapshot: RequestSnapshot;
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

const QUICK_COMMAND_HINTS: Record<(typeof QUICK_COMMANDS)[number]["key"], string> = {
  pending: "查看当前登录账号下可直接处理的审批事项。",
  brief: "查看今天待办、风险商机和方案更新的汇总结果。",
  opportunity: "按商机编号查看当前阶段、金额、风险和审批节点。",
  solution: "按方案编号查看版本状态、关联商机和最近评审。",
  readonly: "验证写操作会被 OpenClaw 只读能力明确拦截。",
};

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

function getOutcomeMeta(outcome: RequestRecord["outcome"]) {
  if (outcome === "success") {
    return { color: "green", label: "成功", dot: "#52c41a" };
  }
  if (outcome === "blocked") {
    return { color: "gold", label: "已拦截", dot: "#faad14" };
  }
  return { color: "red", label: "失败", dot: "#ff4d4f" };
}

export function OpenClawPlaygroundView(props: OpenClawPlaygroundViewProps) {
  const { currentUser, accessToken } = props;
  const [queryText, setQueryText] = useState("给我今日简报");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PlaygroundResponse | null>(null);
  const [blockedResult, setBlockedResult] = useState<PlaygroundErrorResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [requestHistory, setRequestHistory] = useState<RequestRecord[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [showRawPayload, setShowRawPayload] = useState(false);

  const resultPreview = useMemo(
    () => (result ? buildResultPreview(result.result, result.intent?.skillName) : null),
    [result],
  );

  const sessionStats = useMemo(() => {
    const success = requestHistory.filter((item) => item.outcome === "success").length;
    const blocked = requestHistory.filter((item) => item.outcome === "blocked").length;
    const error = requestHistory.filter((item) => item.outcome === "error").length;

    return {
      total: requestHistory.length,
      success,
      blocked,
      error,
    };
  }, [requestHistory]);

  const activeHistoryRecord = useMemo(() => {
    if (!selectedHistoryId) {
      return requestHistory[0] ?? null;
    }
    return requestHistory.find((item) => item.id === selectedHistoryId) ?? requestHistory[0] ?? null;
  }, [requestHistory, selectedHistoryId]);

  const latestOutcome = activeHistoryRecord?.outcome;
  const latestSummary = activeHistoryRecord
    ? {
        title: activeHistoryRecord.responseTitle,
        detail: activeHistoryRecord.responseDetail,
      }
    : result
      ? {
          title: resultPreview?.title || "最近结果",
          detail: `${result.intent?.skillName || "unknown"} · ${result.intent?.reason || "n/a"}`,
        }
      : blockedResult
        ? {
            title: "只读拦截已生效",
            detail: blockedResult.error || "Forbidden",
          }
        : errorMessage
          ? {
              title: "最近一次请求失败",
              detail: errorMessage,
            }
          : null;

  const currentSummaryText = useMemo(() => {
    if (result && resultPreview) {
      return [resultPreview.title, ...resultPreview.lines].join("\n");
    }
    if (blockedResult?.message) {
      return ["只读拦截已生效", blockedResult.message].join("\n");
    }
    if (errorMessage) {
      return ["联调请求失败", errorMessage].join("\n");
    }
    return "";
  }, [blockedResult, errorMessage, result, resultPreview]);

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
    setBlockedResult(null);
    setSelectedHistoryId(null);
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
        let errorPayload: PlaygroundErrorResponse | null = null;
        let fallbackText = "";
        try {
          errorPayload = (await response.json()) as PlaygroundErrorResponse;
        } catch {
          fallbackText = await response.text();
        }

        if (
          response.status === 403 &&
          errorPayload?.message?.includes("OPENCLAW_READONLY_ONLY")
        ) {
          setResult(null);
          setBlockedResult(errorPayload);
          setRequestHistory((current) => [
            {
              id: `blocked-${Date.now()}`,
              queryText: normalizedQuery,
              skillName: "readonly_guard",
              requestedAt: formatDateTime(new Date()),
              outcome: "blocked",
              responseTitle: "只读拦截已生效",
              responseDetail:
                errorPayload.message || "命中了 OpenClaw 只读保护，当前命令不会被执行。",
              snapshot: {
                kind: "blocked",
                payload: errorPayload,
              },
            },
            ...current,
          ].slice(0, 5));
          message.info("只读拦截已生效。");
          return;
        }

        throw new Error(
          errorPayload?.message ||
            fallbackText ||
            `请求失败：${response.status}`,
        );
      }

      const payload = (await response.json()) as PlaygroundResponse;
      const preview = buildResultPreview(payload.result, payload.intent?.skillName);
      setResult(payload);
      setBlockedResult(null);
      setRequestHistory((current) => [
        {
          id: payload.requestId,
          queryText: normalizedQuery,
          skillName: payload.intent?.skillName || "unknown",
          requestedAt: formatDateTime(new Date()),
          outcome: "success",
          responseTitle: preview.title,
          responseDetail: preview.lines.join(" | "),
          snapshot: {
            kind: "success",
            payload,
          },
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
      setBlockedResult(null);
      setRequestHistory((current) => [
        {
          id: `error-${Date.now()}`,
          queryText: normalizedQuery,
          skillName: "error",
          requestedAt: formatDateTime(new Date()),
          outcome: "error",
          responseTitle: "联调请求失败",
          responseDetail: nextMessage,
          snapshot: {
            kind: "error",
            payload: nextMessage,
          },
        },
        ...current,
      ].slice(0, 5));
      message.error("OpenClaw 联调请求失败。");
    } finally {
      setRunning(false);
    }
  };

  const handleSelectHistory = (record: RequestRecord) => {
    setSelectedHistoryId(record.id);
    setQueryText(record.queryText);
    if (record.snapshot.kind === "success") {
      setResult(record.snapshot.payload);
      setBlockedResult(null);
      setErrorMessage("");
      return;
    }
    if (record.snapshot.kind === "blocked") {
      setResult(null);
      setBlockedResult(record.snapshot.payload);
      setErrorMessage("");
      return;
    }
    setResult(null);
    setBlockedResult(null);
    setErrorMessage(record.snapshot.payload);
  };

  const handleCopySummary = async () => {
    if (!currentSummaryText) {
      message.warning("当前没有可复制的摘要。");
      return;
    }
    try {
      await navigator.clipboard.writeText(currentSummaryText);
      message.success("摘要已复制。");
    } catch {
      message.error("摘要复制失败。");
    }
  };

  const handleExportHistory = () => {
    if (requestHistory.length === 0) {
      message.warning("当前没有可导出的联调记录。");
      return;
    }
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      currentUser: currentUser?.username || currentUser?.displayName || "unknown",
      records: requestHistory.map((item) => ({
        id: item.id,
        queryText: item.queryText,
        skillName: item.skillName,
        requestedAt: item.requestedAt,
        outcome: item.outcome,
        responseTitle: item.responseTitle,
        responseDetail: item.responseDetail,
        snapshot: item.snapshot,
      })),
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `openclaw-playground-history-${Date.now()}.json`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    message.success("联调记录已导出。");
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
                    setQueryText(item.queryText);
                    void handleRunQuery(item.queryText);
                  }}
                  style={{
                    textAlign: "left",
                    border: "1px solid var(--app-border)",
                    borderRadius: 14,
                    padding: "12px 14px",
                    background: "var(--app-surface-soft)",
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
            <Button onClick={() => void handleCopySummary()}>复制摘要</Button>
            <Button onClick={handleExportHistory}>导出记录</Button>
            <Button onClick={() => setShowRawPayload((current) => !current)}>
              {showRawPayload ? "收起 JSON" : "展开 JSON"}
            </Button>
            <Button
              onClick={() => {
                setQueryText("给我今日简报");
                setResult(null);
                setBlockedResult(null);
                setErrorMessage("");
                setSelectedHistoryId(null);
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

      {blockedResult?.message ? (
        <Alert
          type="warning"
          showIcon
          message="只读拦截已生效"
          description={blockedResult.message}
        />
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={15}>
          <Card title="联调概览">
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              }}
            >
              {[
                { label: "本轮请求", value: sessionStats.total, color: "default" },
                { label: "成功返回", value: sessionStats.success, color: "green" },
                { label: "只读拦截", value: sessionStats.blocked, color: "gold" },
                { label: "异常失败", value: sessionStats.error, color: "red" },
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
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card
            title="结果预览"
            extra={
              result ? (
                <Tag color="processing">{result.intent?.skillName || "unknown"}</Tag>
              ) : undefined
            }
          >
            {!result && !blockedResult ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="发送一条命令后，在这里查看 OpenClaw 返回结果。"
              />
            ) : blockedResult ? (
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                    只读拦截已生效
                  </div>
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "var(--app-surface-soft)",
                      fontSize: 13,
                      lineHeight: 1.6,
                    }}
                  >
                    {blockedResult.message}
                  </div>
                </div>

                {showRawPayload ? (
                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid var(--app-border)",
                      padding: 12,
                      background: "var(--app-surface-soft)",
                    }}
                  >
                    <Text strong style={{ display: "block", marginBottom: 6 }}>
                      原始错误响应 JSON
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
                      {JSON.stringify(blockedResult, null, 2)}
                    </Paragraph>
                  </div>
                ) : null}
              </div>
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

                {showRawPayload ? (
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
                ) : null}
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} xl={9}>
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
                        ? "已拦截"
                        : latestOutcome === "error"
                          ? "失败"
                          : "待发送"}
                  </Tag>
                </div>
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid var(--app-border)",
                    padding: 12,
                    background: "var(--app-surface-soft)",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  {latestSummary.detail}
                </div>
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="发起一次联调后，这里会显示最近状态。"
              />
            )}
          </Card>

          <Card title="最近请求">
            {requestHistory.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="还没有联调记录。"
              />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {requestHistory.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectHistory(item)}
                    style={{
                      border: "1px solid var(--app-border)",
                      borderRadius: 16,
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
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <Text strong>联调回放</Text>
                      <Tag color={getOutcomeMeta(item.outcome).color}>
                        {getOutcomeMeta(item.outcome).label}
                      </Tag>
                    </div>

                    <div style={{ display: "grid", gap: 10 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "88%",
                            padding: "10px 12px",
                            borderRadius: "14px 14px 4px 14px",
                            background: "linear-gradient(135deg, #1677ff 0%, #4096ff 100%)",
                            color: "#fff",
                            fontSize: 13,
                            lineHeight: 1.6,
                          }}
                        >
                          {item.queryText}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-start",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            marginTop: 10,
                            background: getOutcomeMeta(item.outcome).dot,
                            flexShrink: 0,
                          }}
                        />
                        <div
                          style={{
                            maxWidth: "88%",
                            padding: "10px 12px",
                            borderRadius: "14px 14px 14px 4px",
                            background: "#fff",
                            border: "1px solid var(--app-border)",
                            fontSize: 13,
                            lineHeight: 1.6,
                          }}
                        >
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>{item.responseTitle}</div>
                          <div style={{ color: "#595959", marginBottom: 6 }}>{item.responseDetail}</div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Tag color="blue">{item.skillName}</Tag>
                            <Tag>{item.requestedAt}</Tag>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
