import { useEffect, useRef } from "react";

interface EChartsPreviewProps {
  option: any;
  enable3D?: boolean;
  height?: number;
}

let echartsCoreLoader: Promise<typeof import("echarts/core")> | null = null;
let echartsGlLoader: Promise<unknown> | null = null;

async function loadEChartsCore() {
  if (!echartsCoreLoader) {
    echartsCoreLoader = (async () => {
      const [
        echarts,
        charts,
        components,
        renderers,
      ] = await Promise.all([
        import("echarts/core"),
        import("echarts/charts"),
        import("echarts/components"),
        import("echarts/renderers"),
      ]);

      echarts.use([
        charts.BarChart,
        charts.LineChart,
        charts.PieChart,
        charts.ScatterChart,
        charts.GraphChart,
        charts.GaugeChart,
        charts.SankeyChart,
        components.GridComponent,
        components.TooltipComponent,
        components.LegendComponent,
        components.TitleComponent,
        components.DatasetComponent,
        components.TransformComponent,
        components.GeoComponent,
        components.VisualMapComponent,
        renderers.CanvasRenderer,
      ]);

      return echarts;
    })();
  }

  return echartsCoreLoader;
}

async function loadEChartsGl() {
  if (!echartsGlLoader) {
    echartsGlLoader = import("echarts-gl").catch(() => null);
  }
  return echartsGlLoader;
}

/**
 * 轻量级 ECharts 预览组件（仅用于 AnalyticsView 中的 Mock 展示）。
 *
 * 注意：
 * - 依赖 `echarts` 和可选的 `echarts-gl` 包；
 * - 使用动态 import，避免在构建阶段强绑定实现细节；
 * - 当前仅用于示意，不处理窗口 resize 等高级场景。
 */
export function EChartsPreview(props: EChartsPreviewProps) {
  const { option, enable3D, height = 220 } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let chart: any;
    let mounted = true;

    const mountChart = async () => {
      if (!containerRef.current) return;
      try {
        const echarts = await loadEChartsCore();
        if (enable3D) {
          await loadEChartsGl();
        }
        if (!mounted || !containerRef.current) return;
        chart = echarts.init(containerRef.current);
        chart.setOption(option);
      } catch {
        // 在未安装依赖或运行环境不支持时静默失败
      }
    };

    void mountChart();

    return () => {
      mounted = false;
      if (chart) {
        chart.dispose();
      }
    };
  }, [option, enable3D]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height,
      }}
    />
  );
}
