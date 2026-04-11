import type { ReactNode } from "react";
import { Button, Card, Col, Row, Select } from "antd";
import { EChartsPreview } from "../../components/EChartsPreview";
import {
  getDesignerChartModuleKeys,
  getDesignerChartOption,
} from "./designerChartRuntime";

interface PreviewThemeStyle {
  canvasBackground: string;
  cardHeadBg: string;
  cardHeadColor: string;
  cardBodyBg: string;
  cardBorder: string;
  cardTextColor: string;
  summaryTextColor: string;
}

interface MetricsLike {
  totalOpportunities: string;
  monthlySigned: string;
  avgCycle: string;
  conversionRate: string;
}

interface DesignerWidgetLike {
  id: string;
  type: string;
  title: string;
  dataSummary: string;
  widthPercent: number;
  height: number;
}

interface DashboardLike {
  name: string;
}

interface AnalyticsDashboardPreviewProps {
  activeDashboard?: DashboardLike | null;
  previewTheme: "dark" | "light" | "tech";
  previewThemeStyles: Record<"dark" | "light" | "tech", PreviewThemeStyle>;
  currentPreviewTheme: PreviewThemeStyle;
  setPreviewTheme: (value: "dark" | "light" | "tech") => void;
  handleEnterPreviewFullscreen: () => void;
  handleClosePreview: () => void;
  isPreviewFullscreen: boolean;
  activeDesignerWidgets: DesignerWidgetLike[];
  designerChartLabels: Record<string, string>;
  activeMetrics: MetricsLike;
  isEditingDashboard: boolean;
  activeWidgets: string[];
  renderFunnelPanel: () => ReactNode;
  renderTrendPanel: () => ReactNode;
  renderIndustryPanel: () => ReactNode;
  renderGanttPanel: () => ReactNode;
}

export function AnalyticsDashboardPreview(
  props: AnalyticsDashboardPreviewProps,
) {
  const {
    activeDashboard,
    previewTheme,
    previewThemeStyles,
    currentPreviewTheme,
    setPreviewTheme,
    handleEnterPreviewFullscreen,
    handleClosePreview,
    isPreviewFullscreen,
    activeDesignerWidgets,
    designerChartLabels,
    activeMetrics,
    isEditingDashboard,
    activeWidgets,
    renderFunnelPanel,
    renderTrendPanel,
    renderIndustryPanel,
    renderGanttPanel,
  } = props;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
      }}
      onClick={handleClosePreview}
    >
      <div
        style={{
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: currentPreviewTheme.cardHeadColor,
          borderBottom: "1px solid rgba(255,255,255,0.15)",
          background:
            previewTheme === "tech"
              ? previewThemeStyles.tech.cardHeadBg
              : "transparent",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ flex: 1, textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 600 }}>
              {activeDashboard?.name || "大屏预览"}
            </span>
            <span
              style={{
                marginTop: 2,
                fontSize: 12,
                color: "rgba(255,255,255,0.65)",
              }}
            >
              仅前端预览效果 · Esc 可退出全屏
            </span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.75)",
            }}
          >
            主题：
          </span>
          <Select
            size="small"
            style={{ width: 120 }}
            value={previewTheme}
            onChange={(value) => setPreviewTheme(value as "dark" | "light" | "tech")}
            options={[
              { label: "深色", value: "dark" },
              { label: "浅色", value: "light" },
              { label: "科技蓝", value: "tech" },
            ]}
          />
          <Button size="small" onClick={handleEnterPreviewFullscreen} disabled={isPreviewFullscreen}>
            {isPreviewFullscreen ? "已全屏" : "全屏显示"}
          </Button>
          <Button size="small" onClick={handleClosePreview}>
            退出预览
          </Button>
        </div>
      </div>
      <div
        className="app-scrollbar"
        style={{
          flex: 1,
          padding: 24,
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            padding: 16,
            borderRadius: 8,
            background: currentPreviewTheme.canvasBackground,
            boxShadow: "0 0 24px rgba(0,0,0,0.45)",
          }}
        >
          {activeDesignerWidgets.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              {activeDesignerWidgets.map((widget) => (
                <div
                  key={widget.id}
                  style={{
                    flex: `0 0 calc(${widget.widthPercent || 100}% - 12px)`,
                    boxSizing: "border-box",
                  }}
                >
                  <Card
                    size="small"
                    title={widget.title || designerChartLabels[widget.type]}
                    headStyle={{
                      background: currentPreviewTheme.cardHeadBg,
                      color: currentPreviewTheme.cardHeadColor,
                      borderBottom: "none",
                    }}
                    bodyStyle={{
                      background: currentPreviewTheme.cardBodyBg,
                    }}
                    style={{
                      height: "100%",
                      borderColor: currentPreviewTheme.cardBorder,
                      background: currentPreviewTheme.cardBodyBg,
                      color: currentPreviewTheme.cardTextColor,
                    }}
                  >
                    <EChartsPreview
                      option={getDesignerChartOption(widget, designerChartLabels)}
                      moduleKeys={getDesignerChartModuleKeys(widget.type)}
                      enable3D={
                        widget.type === "cube3d" ||
                        widget.type === "flow_map" ||
                        widget.type === "geo3d"
                      }
                      height={widget.height || 220}
                    />
                    {widget.dataSummary && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 12,
                          color: currentPreviewTheme.summaryTextColor,
                        }}
                      >
                        {widget.dataSummary}
                      </div>
                    )}
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            <>
              {!isEditingDashboard && (
                <div
                  style={{
                    marginBottom: 16,
                  }}
                >
                  <Row gutter={16}>
                    <Col xs={24} sm={12} md={6}>
                      <Card>
                        <div style={{ fontSize: 32, marginBottom: 8, color: "#1890ff" }}>💡</div>
                        <div style={{ fontSize: 22, fontWeight: 600 }}>
                          {activeMetrics.totalOpportunities}
                        </div>
                        <div style={{ fontSize: 14, color: "#8c8c8c" }}>商机总数</div>
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card>
                        <div style={{ fontSize: 32, marginBottom: 8, color: "#52c41a" }}>💰</div>
                        <div style={{ fontSize: 22, fontWeight: 600 }}>
                          {activeMetrics.monthlySigned}
                        </div>
                        <div style={{ fontSize: 14, color: "#8c8c8c" }}>本月签约</div>
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card>
                        <div style={{ fontSize: 32, marginBottom: 8, color: "#722ed1" }}>📊</div>
                        <div style={{ fontSize: 22, fontWeight: 600 }}>
                          {activeMetrics.avgCycle}
                        </div>
                        <div style={{ fontSize: 14, color: "#8c8c8c" }}>平均成交周期</div>
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card>
                        <div style={{ fontSize: 32, marginBottom: 8, color: "#fa8c16" }}>%</div>
                        <div style={{ fontSize: 22, fontWeight: 600 }}>
                          {activeMetrics.conversionRate}
                        </div>
                        <div style={{ fontSize: 14, color: "#8c8c8c" }}>商机转化率</div>
                      </Card>
                    </Col>
                  </Row>
                </div>
              )}

              <Row gutter={16}>
                {activeWidgets.includes("funnel") && (
                  <Col xs={24} md={12}>
                    <Card title="销售漏斗" style={{ height: "100%" }}>
                      {renderFunnelPanel()}
                    </Card>
                  </Col>
                )}
                {activeWidgets.includes("trend") && (
                  <Col xs={24} md={12}>
                    <Card title="业绩趋势" style={{ height: "100%" }}>
                      {renderTrendPanel()}
                    </Card>
                  </Col>
                )}
              </Row>

              <Row gutter={16} style={{ marginTop: 16 }}>
                {activeWidgets.includes("industry") && (
                  <Col xs={24} md={12}>
                    <Card title="行业分布">{renderIndustryPanel()}</Card>
                  </Col>
                )}
                {activeWidgets.includes("gantt") && (
                  <Col xs={24} md={12}>
                    <Card title="项目进度甘特图">{renderGanttPanel()}</Card>
                  </Col>
                )}
              </Row>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
