import { useEffect, useRef } from "react";

interface EChartsPreviewProps {
  option: any;
  enable3D?: boolean;
  height?: number;
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
        const echarts = await import("echarts");
        if (enable3D) {
          try {
            await import("echarts-gl");
          } catch {
            // 在未安装 echarts-gl 时静默忽略，仍可渲染 2D 图表
          }
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

