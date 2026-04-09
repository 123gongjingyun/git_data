import type { MouseEvent, RefObject } from "react";
import { Button, Card, Input, Select } from "antd";
import { EChartsPreview } from "../../components/EChartsPreview";
import {
  buildAutoDataSummary,
  DATA_SOURCE_GROUP_BY_LABELS,
  DATA_SOURCE_METRIC_LABELS,
  DATA_SOURCE_OWNER_SCOPE_LABELS,
  DATA_SOURCE_TIME_RANGE_LABELS,
  DATA_SOURCE_TYPE_LABELS,
  getDesignerChartModuleKeys,
  getDesignerChartOption,
  TRANSFORM_AGGREGATION_LABELS,
  TRANSFORM_SORT_LABELS,
} from "./designerChartRuntime";

interface DataSourceConfigLike {
  type?: string;
  timeRange?: string;
  metric?: string;
  groupBy?: string;
  ownerScope?: string;
}

interface TransformConfigLike {
  aggregation?: string;
  sort?: string;
  topN?: number;
}

interface DesignerWidgetLike {
  id: string;
  type: string;
  title: string;
  dataSummary: string;
  widthPercent: number;
  height: number;
  dataSourceConfig?: DataSourceConfigLike;
  transformConfig?: TransformConfigLike;
}

interface AnalyticsDashboardDesignerProps {
  canDeleteAnalyticsAssets: boolean;
  quickAddType: string | null;
  setQuickAddType: (value: string | null) => void;
  handleQuickAddWidget: () => void;
  designerChartLabels: Record<string, string>;
  designerWidgets: DesignerWidgetLike[];
  designerCanvasRef: RefObject<HTMLDivElement | null>;
  handleDesignerCanvasDrop: () => void;
  selectedDesignerWidgetId: string | null;
  setSelectedDesignerWidgetId: (value: string | null) => void;
  setDesignerDraggingId: (value: string | null) => void;
  setDesignerDraggingType: (value: string | null) => void;
  handleDesignerWidgetDropOnWidget: (targetId: string) => void;
  handleDeleteDesignerWidget: (id: string) => void;
  handleDesignerResizeMouseDown: (event: MouseEvent<HTMLDivElement>, widgetId: string) => void;
  selectedDesignerWidget: DesignerWidgetLike | null;
  handleUpdateSelectedDesignerWidget: (
    patch: Partial<DesignerWidgetLike>,
    options?: { autoUpdateSummary?: boolean },
  ) => void;
}

export function AnalyticsDashboardDesigner(
  props: AnalyticsDashboardDesignerProps,
) {
  const {
    canDeleteAnalyticsAssets,
    quickAddType,
    setQuickAddType,
    handleQuickAddWidget,
    designerChartLabels,
    designerWidgets,
    designerCanvasRef,
    handleDesignerCanvasDrop,
    selectedDesignerWidgetId,
    setSelectedDesignerWidgetId,
    setDesignerDraggingId,
    setDesignerDraggingType,
    handleDesignerWidgetDropOnWidget,
    handleDeleteDesignerWidget,
    handleDesignerResizeMouseDown,
    selectedDesignerWidget,
    handleUpdateSelectedDesignerWidget,
  } = props;

  return (
    <Card title="自定义仪表盘设计器（所见即所得）">
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 12, color: "#8c8c8c" }}>添加组件：</span>
        <Select
          size="small"
          style={{ width: 180 }}
          placeholder="选择组件类型"
          value={quickAddType || undefined}
          onChange={(value) => setQuickAddType(value)}
          options={Object.keys(designerChartLabels).map((type) => ({
            label: designerChartLabels[type],
            value: type,
          }))}
        />
        <Button
          type="primary"
          size="small"
          disabled={!quickAddType}
          onClick={handleQuickAddWidget}
        >
          添加到当前仪表盘
        </Button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 260px",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        <div
          ref={designerCanvasRef}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDesignerCanvasDrop}
          style={{
            minHeight: 260,
            border: "1px dashed #d9d9d9",
            borderRadius: 8,
            padding: 12,
            backgroundColor: "var(--app-surface-soft)",
            backgroundImage:
              "linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          {designerWidgets.length === 0 ? (
            <div
              style={{
                fontSize: 12,
                color: "#8c8c8c",
              }}
            >
              使用上方“添加组件”选择图形类型，系统会在此处自动生成组件卡片。可拖动组件卡片调整顺序，右下角蓝色小方块拖拽调整宽度和高度。
            </div>
          ) : (
            designerWidgets.map((widget) => (
              <div
                key={widget.id}
                draggable
                onDragStart={() => {
                  setDesignerDraggingId(widget.id);
                  setDesignerDraggingType(null);
                }}
                onDragEnd={() => {
                  setDesignerDraggingId(null);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDesignerWidgetDropOnWidget(widget.id)}
                onClick={() => setSelectedDesignerWidgetId(widget.id)}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border:
                    selectedDesignerWidgetId === widget.id
                      ? "1px solid #1890ff"
                      : "1px solid #d9d9d9",
                  background: "var(--app-surface)",
                  cursor: "move",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  flex: `0 0 calc(${widget.widthPercent || 100}% - 8px)`,
                  boxSizing: "border-box",
                  position: "relative",
                  minHeight: (widget.height || 220) + 40,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    padding: "2px 6px",
                    borderRadius: 10,
                    background: "rgba(17, 27, 48, 0.84)",
                    border: "1px solid var(--app-border)",
                    fontSize: 10,
                    color: "var(--app-text-secondary)",
                    pointerEvents: "none",
                  }}
                >
                  {`${Math.round(widget.widthPercent)}% · ${Math.round(widget.height)}px`}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <span>{widget.title}</span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "#8c8c8c",
                      }}
                    >
                      {designerChartLabels[widget.type]}
                    </span>
                  </div>
                  <Button
                    type="link"
                    size="small"
                    danger
                    disabled={!canDeleteAnalyticsAssets}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDesignerWidget(widget.id);
                    }}
                  >
                    删除
                  </Button>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#8c8c8c",
                  }}
                >
                  {widget.dataSummary}
                </div>
                <div
                  onMouseDown={(e) => handleDesignerResizeMouseDown(e, widget.id)}
                  style={{
                    position: "absolute",
                    right: 4,
                    bottom: 4,
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: "#1890ff",
                    cursor: "nwse-resize",
                  }}
                />
              </div>
            ))
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 500 }}>组件配置</div>
          {selectedDesignerWidget ? (
            <>
              <div
                style={{
                  fontSize: 12,
                  color: "#8c8c8c",
                }}
              >
                当前选中：{designerChartLabels[selectedDesignerWidget.type]}
              </div>
              <Input
                size="small"
                value={selectedDesignerWidget.title}
                onChange={(e) =>
                  handleUpdateSelectedDesignerWidget({
                    title: e.target.value,
                  })
                }
                placeholder="组件标题，如：本月签约金额趋势"
              />
              <Input.TextArea
                rows={6}
                value={selectedDesignerWidget.dataSummary}
                onChange={(e) =>
                  handleUpdateSelectedDesignerWidget({
                    dataSummary: e.target.value,
                  })
                }
                placeholder="在此处描述该组件的数据来源与含义，例如：数据来源于本月所有已签约商机的订单金额汇总（Mock）。"
                style={{ fontSize: 12 }}
              />
              <div
                style={{
                  marginTop: 8,
                  padding: 8,
                  borderRadius: 4,
                  border: "1px dashed #d9d9d9",
                  background: "var(--app-surface-soft)",
                  fontSize: 12,
                  color: "var(--app-text-secondary)",
                }}
              >
                自动摘要：
                {buildAutoDataSummary(selectedDesignerWidget) ||
                  "尚未配置结构化数据源与加工规则，请在下方选择数据来源与加工方式。"}
              </div>
              <div
                style={{
                  marginTop: 12,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                数据来源
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: 12,
                }}
              >
                <Select
                  size="small"
                  value={selectedDesignerWidget.dataSourceConfig?.type ?? "mock"}
                  onChange={(value) =>
                    handleUpdateSelectedDesignerWidget(
                      {
                        dataSourceConfig: {
                          ...(selectedDesignerWidget.dataSourceConfig || {
                            timeRange: "this_month",
                            metric: "count",
                            groupBy: "none",
                            ownerScope: "all",
                          }),
                          type: value,
                        },
                      },
                      { autoUpdateSummary: true },
                    )
                  }
                  options={Object.keys(DATA_SOURCE_TYPE_LABELS).map((type) => ({
                    label: DATA_SOURCE_TYPE_LABELS[type],
                    value: type,
                  }))}
                />
                <Select
                  size="small"
                  value={selectedDesignerWidget.dataSourceConfig?.timeRange ?? "this_month"}
                  onChange={(value) =>
                    handleUpdateSelectedDesignerWidget(
                      {
                        dataSourceConfig: {
                          ...(selectedDesignerWidget.dataSourceConfig || {
                            type: "mock",
                            metric: "count",
                            groupBy: "none",
                            ownerScope: "all",
                          }),
                          timeRange: value,
                        },
                      },
                      { autoUpdateSummary: true },
                    )
                  }
                  options={Object.keys(DATA_SOURCE_TIME_RANGE_LABELS).map((key) => ({
                    label: DATA_SOURCE_TIME_RANGE_LABELS[key],
                    value: key,
                  }))}
                />
                <Select
                  size="small"
                  value={selectedDesignerWidget.dataSourceConfig?.metric ?? "count"}
                  onChange={(value) =>
                    handleUpdateSelectedDesignerWidget(
                      {
                        dataSourceConfig: {
                          ...(selectedDesignerWidget.dataSourceConfig || {
                            type: "mock",
                            timeRange: "this_month",
                            groupBy: "none",
                            ownerScope: "all",
                          }),
                          metric: value,
                        },
                      },
                      { autoUpdateSummary: true },
                    )
                  }
                  options={Object.keys(DATA_SOURCE_METRIC_LABELS).map((key) => ({
                    label: DATA_SOURCE_METRIC_LABELS[key],
                    value: key,
                  }))}
                />
                <Select
                  size="small"
                  value={selectedDesignerWidget.dataSourceConfig?.groupBy ?? "none"}
                  onChange={(value) =>
                    handleUpdateSelectedDesignerWidget(
                      {
                        dataSourceConfig: {
                          ...(selectedDesignerWidget.dataSourceConfig || {
                            type: "mock",
                            timeRange: "this_month",
                            metric: "count",
                            ownerScope: "all",
                          }),
                          groupBy: value,
                        },
                      },
                      { autoUpdateSummary: true },
                    )
                  }
                  options={Object.keys(DATA_SOURCE_GROUP_BY_LABELS).map((key) => ({
                    label: DATA_SOURCE_GROUP_BY_LABELS[key],
                    value: key,
                  }))}
                />
                <Select
                  size="small"
                  value={selectedDesignerWidget.dataSourceConfig?.ownerScope ?? "all"}
                  onChange={(value) =>
                    handleUpdateSelectedDesignerWidget(
                      {
                        dataSourceConfig: {
                          ...(selectedDesignerWidget.dataSourceConfig || {
                            type: "mock",
                            timeRange: "this_month",
                            metric: "count",
                            groupBy: "none",
                          }),
                          ownerScope: value,
                        },
                      },
                      { autoUpdateSummary: true },
                    )
                  }
                  options={Object.keys(DATA_SOURCE_OWNER_SCOPE_LABELS).map((key) => ({
                    label: DATA_SOURCE_OWNER_SCOPE_LABELS[key],
                    value: key,
                  }))}
                />
              </div>

              <div
                style={{
                  marginTop: 12,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                数据加工
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: 12,
                }}
              >
                <Select
                  size="small"
                  value={selectedDesignerWidget.transformConfig?.aggregation ?? "auto"}
                  onChange={(value) =>
                    handleUpdateSelectedDesignerWidget(
                      {
                        transformConfig: {
                          ...(selectedDesignerWidget.transformConfig || {
                            sort: "none",
                            topN: undefined,
                          }),
                          aggregation: value,
                        },
                      },
                      { autoUpdateSummary: true },
                    )
                  }
                  options={Object.keys(TRANSFORM_AGGREGATION_LABELS).map((key) => ({
                    label: TRANSFORM_AGGREGATION_LABELS[key],
                    value: key,
                  }))}
                />
                <Select
                  size="small"
                  value={selectedDesignerWidget.transformConfig?.sort ?? "none"}
                  onChange={(value) =>
                    handleUpdateSelectedDesignerWidget(
                      {
                        transformConfig: {
                          ...(selectedDesignerWidget.transformConfig || {
                            aggregation: "auto",
                            topN: undefined,
                          }),
                          sort: value,
                        },
                      },
                      { autoUpdateSummary: true },
                    )
                  }
                  options={Object.keys(TRANSFORM_SORT_LABELS).map((key) => ({
                    label: TRANSFORM_SORT_LABELS[key],
                    value: key,
                  }))}
                />
                <Input
                  size="small"
                  type="number"
                  min={1}
                  placeholder="Top N（可选，例如：5）"
                  value={selectedDesignerWidget.transformConfig?.topN ?? undefined}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const parsed = Number(raw);
                    handleUpdateSelectedDesignerWidget(
                      {
                        transformConfig: {
                          ...(selectedDesignerWidget.transformConfig || {
                            aggregation: "auto",
                            sort: "none",
                          }),
                          topN: Number.isNaN(parsed) ? undefined : parsed,
                        },
                      },
                      { autoUpdateSummary: true },
                    );
                  }}
                />
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: "#8c8c8c",
                }}
              >
                当前尺寸：宽 {Math.round(selectedDesignerWidget.widthPercent || 100)}% ，高{" "}
                {Math.round(selectedDesignerWidget.height || 220)} px（在画布中拖拽右下角调整）
              </div>
              <div
                style={{
                  marginTop: 8,
                  padding: 8,
                  borderRadius: 4,
                  border: "1px solid #f0f0f0",
                  background: "var(--app-surface-soft)",
                }}
              >
                <EChartsPreview
                  option={getDesignerChartOption(selectedDesignerWidget, designerChartLabels)}
                  moduleKeys={getDesignerChartModuleKeys(selectedDesignerWidget.type)}
                  enable3D={
                    selectedDesignerWidget.type === "cube3d" ||
                    selectedDesignerWidget.type === "flow_map" ||
                    selectedDesignerWidget.type === "geo3d"
                  }
                  height={selectedDesignerWidget.height || 220}
                />
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#8c8c8c",
                }}
              >
                当前配置用于前端交互预演与图表展示示例，不会保存到真实数据库；实际接入大屏时可将此处的配置映射到真实数据源与图表主题。
              </div>
            </>
          ) : (
            <div
              style={{
                fontSize: 12,
                color: "#8c8c8c",
              }}
            >
              请点击中间画布中的组件卡片查看并编辑其标题与数据说明。
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
