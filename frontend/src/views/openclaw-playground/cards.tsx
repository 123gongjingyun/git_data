import { Empty, Tag } from "antd";
import {
  FactGrid,
  MetaStrip,
  buildFactItems,
  getOutcomeExplanation,
  getOutcomeMeta,
  getSkillVisualMeta,
} from "./helpers";
import type {
  PlaygroundErrorResponse,
  PlaygroundResponse,
  SuccessInsight,
} from "./types";

export function SuccessResultCard(props: {
  result: PlaygroundResponse;
  resultPreview: { title: string; lines: string[] } | null;
  successMeta: SuccessInsight | null;
  successInsightMeta: {
    color: string;
    label: string;
    detail: string;
  };
}) {
  const { result, resultPreview, successMeta, successInsightMeta } = props;

  return (
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
  );
}

export function BlockedResultCard(props: {
  queryText: string;
  blockedResult: PlaygroundErrorResponse;
}) {
  const { queryText, blockedResult } = props;

  return (
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
  );
}

export function ErrorResultCard(props: {
  queryText: string;
  errorMessage: string;
  errorMeta: {
    title: string;
    accent: string;
    suggestions: string[];
  };
}) {
  const { queryText, errorMessage, errorMeta } = props;

  return (
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
  );
}

export function InitialResultEmptyState() {
  return (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description="先发送一条联调命令。建议从“待我审批”或“今日简报”开始。"
    />
  );
}
