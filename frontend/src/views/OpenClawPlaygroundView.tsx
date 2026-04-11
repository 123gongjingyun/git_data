import { Col, Row, message } from "antd";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import type { CurrentUser } from "../shared/auth";
import { buildApiUrl } from "../shared/api";
import {
  analyzeSuccessResult,
  buildActiveDebugPayload,
  buildResultPreview,
  classifyErrorMessage,
  formatDateTime,
  getSuccessInsightMeta,
  getSkillVisualMeta,
} from "./openclaw-playground/helpers";
import {
  OpenClawQueryComposer,
  OpenClawResultPanel,
  OpenClawSessionOverview,
} from "./openclaw-playground/sections";
import type {
  HistoryFilter,
  PlaygroundErrorResponse,
  PlaygroundResponse,
  RequestRecord,
  PlaygroundSkillCatalogResponse,
  PlaygroundSkillDefinition,
  PlaygroundSkillName,
} from "./openclaw-playground/types";

const LazyOpenClawSidebar = lazy(async () => {
  const module = await import("./openclaw-playground/OpenClawAsyncPanels");
  return { default: module.OpenClawSidebar };
});

const LazyOpenClawHistoryPanel = lazy(async () => {
  const module = await import("./openclaw-playground/OpenClawAsyncPanels");
  return { default: module.OpenClawHistoryPanel };
});

function OpenClawPanelLoading(props: { title: string; description: string }) {
  const { title, description } = props;

  return (
    <div
      style={{
        minHeight: 160,
        display: "grid",
        placeItems: "center",
        gap: 10,
        textAlign: "center",
        borderRadius: 18,
        border: "1px solid var(--app-border)",
        background: "var(--app-surface)",
        padding: 20,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#8c8c8c" }}>{description}</div>
    </div>
  );
}

interface OpenClawPlaygroundViewProps {
  currentUser: CurrentUser | null;
  accessToken?: string | null;
}

export function OpenClawPlaygroundView(props: OpenClawPlaygroundViewProps) {
  const { currentUser, accessToken } = props;
  const [queryText, setQueryText] = useState("给我今日简报");
  const [running, setRunning] = useState(false);
  const [skillCatalogLoading, setSkillCatalogLoading] = useState(false);
  const [skillCatalogError, setSkillCatalogError] = useState("");
  const [skillDefinitions, setSkillDefinitions] = useState<PlaygroundSkillDefinition[]>([]);
  const [selectedSkillName, setSelectedSkillName] =
    useState<PlaygroundSkillName>("get_daily_brief");
  const [selectedSkillInput, setSelectedSkillInput] = useState({
    code: "OPP-000003",
    limit: 5,
    businessType: "" as "" | "opportunity" | "solution",
  });
  const [result, setResult] = useState<PlaygroundResponse | null>(null);
  const [blockedResult, setBlockedResult] = useState<PlaygroundErrorResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [requestHistory, setRequestHistory] = useState<RequestRecord[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [showRawPayload, setShowRawPayload] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");

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
    return (
      requestHistory.find((item) => item.id === selectedHistoryId) ??
      requestHistory[0] ??
      null
    );
  }, [requestHistory, selectedHistoryId]);

  const filteredHistory = useMemo(() => {
    if (historyFilter === "all") {
      return requestHistory;
    }
    return requestHistory.filter((item) => item.outcome === historyFilter);
  }, [historyFilter, requestHistory]);

  const activeDebugPayload = useMemo(
    () =>
      buildActiveDebugPayload({
        activeHistoryRecord,
        result,
        blockedResult,
        errorMessage,
      }),
    [activeHistoryRecord, blockedResult, errorMessage, result],
  );

  const latestOutcome = activeHistoryRecord?.outcome;
  const latestSkillName =
    activeHistoryRecord?.skillName ||
    result?.intent?.skillName ||
    (blockedResult ? "readonly_guard" : undefined);
  const latestSkillMeta = getSkillVisualMeta(latestSkillName);
  const successMeta = useMemo(
    () => (result ? analyzeSuccessResult(result.result, result.intent?.skillName) : null),
    [result],
  );
  const successInsightMeta = useMemo(
    () => getSuccessInsightMeta(successMeta),
    [successMeta],
  );
  const errorMeta = useMemo(
    () => classifyErrorMessage(errorMessage || activeDebugPayload || ""),
    [activeDebugPayload, errorMessage],
  );

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
          title: "已安全拦截，未执行写操作",
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
      return ["已安全拦截，未执行写操作", blockedResult.message].join("\n");
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

  const loadSkillCatalog = async () => {
    if (!accessToken) {
      setSkillCatalogError("当前未检测到登录令牌，无法加载技能目录。");
      setSkillDefinitions([]);
      return;
    }

    setSkillCatalogLoading(true);
    setSkillCatalogError("");
    try {
      const response = await fetch(buildApiUrl("/integrations/openclaw/playground/skills"), {
        headers: buildAuthHeaders(false),
      });
      if (!response.ok) {
        throw new Error(`技能目录请求失败：${response.status}`);
      }
      const payload = (await response.json()) as PlaygroundSkillCatalogResponse;
      const nextDefinitions = Array.isArray(payload.items) ? payload.items : [];
      setSkillDefinitions(nextDefinitions);
      if (nextDefinitions.length > 0) {
        setSelectedSkillName((current) =>
          nextDefinitions.some((item) => item.name === current)
            ? current
            : nextDefinitions[0].name,
        );
      }
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : "技能目录加载失败";
      setSkillCatalogError(nextMessage);
      message.warning("OpenClaw 技能目录加载失败。");
    } finally {
      setSkillCatalogLoading(false);
    }
  };

  useEffect(() => {
    void loadSkillCatalog();
  }, [accessToken]);

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
          setRequestHistory((current) =>
            [
              {
                id: `blocked-${Date.now()}`,
                queryText: normalizedQuery,
                skillName: "readonly_guard",
                requestedAt: formatDateTime(new Date()),
                outcome: "blocked",
                responseTitle: "已安全拦截，未执行写操作",
                responseDetail:
                  errorPayload.message || "命中了 OpenClaw 只读保护，当前命令不会被执行。",
                snapshot: {
                  kind: "blocked",
                  payload: errorPayload,
                },
              },
              ...current,
            ].slice(0, 5),
          );
          message.info("已安全拦截写操作请求。");
          return;
        }

        throw new Error(errorPayload?.message || fallbackText || `请求失败：${response.status}`);
      }

      const payload = (await response.json()) as PlaygroundResponse;
      const preview = buildResultPreview(payload.result, payload.intent?.skillName);
      setResult(payload);
      setBlockedResult(null);
      setRequestHistory((current) =>
        [
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
        ].slice(0, 5),
      );
      setQueryText(normalizedQuery);
      message.success("OpenClaw 联调结果已刷新。");
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "OpenClaw 联调请求失败";
      setErrorMessage(nextMessage);
      setResult(null);
      setBlockedResult(null);
      setRequestHistory((current) =>
        [
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
        ].slice(0, 5),
      );
      message.error("OpenClaw 联调请求失败。");
    } finally {
      setRunning(false);
    }
  };

  const handleRunSkill = async (nextSkillName?: PlaygroundSkillName) => {
    if (!accessToken) {
      setErrorMessage("当前未检测到登录令牌，无法调用联调接口。");
      setResult(null);
      return;
    }

    const activeSkillName = nextSkillName ?? selectedSkillName;
    const requestId = `playground-skill-${activeSkillName}-${Date.now()}`;
    const normalizedInput: Record<string, unknown> = {};
    if (activeSkillName === "get_my_pending_approvals") {
      normalizedInput.limit = selectedSkillInput.limit;
      if (selectedSkillInput.businessType) {
        normalizedInput.businessType = selectedSkillInput.businessType;
      }
    }
    if (
      activeSkillName === "get_opportunity_summary" ||
      activeSkillName === "get_solution_summary"
    ) {
      const code = selectedSkillInput.code.trim().toUpperCase();
      if (!code) {
        message.warning("请输入业务编号。");
        return;
      }
      normalizedInput.code = code;
    }

    const requestLabel =
      Object.keys(normalizedInput).length > 0
        ? `${activeSkillName} ${JSON.stringify(normalizedInput)}`
        : activeSkillName;

    setRunning(true);
    setErrorMessage("");
    setBlockedResult(null);
    setSelectedHistoryId(null);
    try {
      const response = await fetch(
        buildApiUrl(`/integrations/openclaw/playground/skills/${activeSkillName}`),
        {
          method: "POST",
          headers: buildAuthHeaders(),
          body: JSON.stringify({
            input: normalizedInput,
            requestId,
          }),
        },
      );

      if (!response.ok) {
        let fallbackText = "";
        try {
          const errorPayload = (await response.json()) as PlaygroundErrorResponse;
          fallbackText = errorPayload.message || errorPayload.error || "";
        } catch {
          fallbackText = await response.text();
        }
        throw new Error(fallbackText || `请求失败：${response.status}`);
      }

      const payload = (await response.json()) as PlaygroundResponse;
      const preview = buildResultPreview(payload.result, payload.intent?.skillName);
      setResult(payload);
      setBlockedResult(null);
      setRequestHistory((current) =>
        [
          {
            id: payload.requestId,
            queryText: requestLabel,
            skillName: payload.intent?.skillName || activeSkillName,
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
        ].slice(0, 5),
      );
      message.success("OpenClaw Skill 执行结果已刷新。");
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "OpenClaw Skill 执行失败";
      setErrorMessage(nextMessage);
      setResult(null);
      setBlockedResult(null);
      setRequestHistory((current) =>
        [
          {
            id: `error-${Date.now()}`,
            queryText: requestLabel,
            skillName: activeSkillName,
            requestedAt: formatDateTime(new Date()),
            outcome: "error",
            responseTitle: "Skill 执行失败",
            responseDetail: nextMessage,
            snapshot: {
              kind: "error",
              payload: nextMessage,
            },
          },
          ...current,
        ].slice(0, 5),
      );
      message.error("OpenClaw Skill 执行失败。");
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

  const handleReplayHistory = async (record: RequestRecord) => {
    setQueryText(record.queryText);
    if (
      record.skillName === "get_my_pending_approvals" ||
      record.skillName === "get_opportunity_summary" ||
      record.skillName === "get_solution_summary" ||
      record.skillName === "get_daily_brief"
    ) {
      setSelectedSkillName(record.skillName);
      await handleRunSkill(record.skillName);
      return;
    }

    await handleRunQuery(record.queryText);
  };

  const handleReuseHistory = (record: RequestRecord) => {
    setQueryText(record.queryText);
    message.success("已回填到输入框，可继续编辑后重试。");
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

  const handleCopyRawPayload = async () => {
    if (!activeDebugPayload) {
      message.warning("当前没有可复制的原始数据。");
      return;
    }
    try {
      await navigator.clipboard.writeText(activeDebugPayload);
      message.success("原始数据已复制。");
    } catch {
      message.error("原始数据复制失败。");
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

  const handleReset = () => {
    setQueryText("给我今日简报");
    setSelectedSkillInput({
      code: "OPP-000003",
      limit: 5,
      businessType: "",
    });
    setResult(null);
    setBlockedResult(null);
    setErrorMessage("");
    setSelectedHistoryId(null);
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <OpenClawQueryComposer
            queryText={queryText}
            running={running}
            skillCatalogLoading={skillCatalogLoading}
            skillCatalogError={skillCatalogError}
            skillDefinitions={skillDefinitions}
            selectedSkillName={selectedSkillName}
            selectedSkillInput={selectedSkillInput}
            showRawPayload={showRawPayload}
            onChangeQueryText={setQueryText}
            onChangeSelectedSkillName={setSelectedSkillName}
            onChangeSelectedSkillInput={(patch) =>
              setSelectedSkillInput((current) => ({ ...current, ...patch }))
            }
            onRunQuery={handleRunQuery}
            onRunSkill={handleRunSkill}
            onReloadSkills={loadSkillCatalog}
            onCopySummary={handleCopySummary}
            onCopyRawPayload={handleCopyRawPayload}
            onExportHistory={handleExportHistory}
            onToggleRawPayload={() => setShowRawPayload((current) => !current)}
            onReset={handleReset}
          />

          <OpenClawSessionOverview
            latestSkillName={latestSkillName}
            sessionStats={sessionStats}
            latestRequestedAt={activeHistoryRecord?.requestedAt}
          />

          <OpenClawResultPanel
            queryText={queryText}
            result={result}
            blockedResult={blockedResult}
            errorMessage={errorMessage}
            resultPreview={resultPreview}
            successMeta={successMeta}
            successInsightMeta={successInsightMeta}
            errorMeta={errorMeta}
          />
        </Col>

        <Col xs={24} xl={8}>
          <div style={{ display: "grid", gap: 16 }}>
            <Suspense
              fallback={
                <OpenClawPanelLoading
                  title="正在加载辅助面板"
                  description="正在准备最近状态、调试区与联调上下文。"
                />
              }
            >
              <LazyOpenClawSidebar
                currentUser={currentUser}
                accessToken={accessToken}
                result={result}
                skillDefinitions={skillDefinitions}
                activeHistoryRecord={activeHistoryRecord}
                latestSummary={latestSummary}
                latestOutcome={latestOutcome}
                latestSkillName={latestSkillName}
                latestSkillMeta={latestSkillMeta}
                successMeta={successMeta}
                errorMeta={errorMeta}
                showRawPayload={showRawPayload}
                activeDebugPayload={activeDebugPayload}
                onToggleRawPayload={() => setShowRawPayload((current) => !current)}
              />
            </Suspense>
          </div>
        </Col>
      </Row>

      <Suspense
        fallback={
          <OpenClawPanelLoading
            title="正在加载请求记录"
            description="正在准备最近联调历史与重放操作。"
          />
        }
      >
        <LazyOpenClawHistoryPanel
          historyFilter={historyFilter}
          requestHistory={requestHistory}
          filteredHistory={filteredHistory}
          activeHistoryRecord={activeHistoryRecord}
          onChangeFilter={setHistoryFilter}
          onSelectHistory={handleSelectHistory}
          onReplayHistory={handleReplayHistory}
          onReuseHistory={handleReuseHistory}
        />
      </Suspense>
    </div>
  );
}
