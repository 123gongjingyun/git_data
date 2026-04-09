import { Card } from "antd";
import { EChartsPreview } from "../../components/EChartsPreview";
import {
  getDesignerChartModuleKeys,
  getDesignerChartOption,
  type DesignerChartRuntimeWidget,
} from "./designerChartRuntime";

interface AnalyticsCustomDashboardLayoutProps {
  activeDesignerWidgets: Array<
    DesignerChartRuntimeWidget & {
      id: string;
      dataSummary: string;
      widthPercent: number;
      height: number;
    }
  >;
  designerChartLabels: Record<string, string>;
}

export function AnalyticsCustomDashboardLayout(
  props: AnalyticsCustomDashboardLayoutProps,
) {
  const { activeDesignerWidgets, designerChartLabels } = props;

  return (
    <Card title="自定义仪表盘布局">
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
              style={{ height: "100%" }}
            >
              <EChartsPreview
                option={getDesignerChartOption(widget, designerChartLabels)}
                moduleKeys={getDesignerChartModuleKeys(widget.type)}
                enable3D={
                  widget.type === "cube3d" ||
                  widget.type === "flow_map" ||
                  widget.type === "geo3d" ||
                  widget.type === "globe3d"
                }
                height={widget.height || 220}
              />
              {widget.dataSummary && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "#8c8c8c",
                  }}
                >
                  {widget.dataSummary}
                </div>
              )}
            </Card>
          </div>
        ))}
      </div>
    </Card>
  );
}
