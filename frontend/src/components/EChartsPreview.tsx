import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { install as installGridComponent } from "echarts/lib/component/grid/install.js";
import { install as installLegendComponent } from "echarts/lib/component/legend/install.js";
import { install as installTitleComponent } from "echarts/lib/component/title/install.js";
import { install as installTooltipComponent } from "echarts/lib/component/tooltip/install.js";
import { install as installCanvasRenderer } from "echarts/lib/renderer/installCanvasRenderer.js";

interface EChartsPreviewProps {
  option: any;
  enable3D?: boolean;
  height?: number;
  moduleKeys?: EChartsModuleKey[];
}

export type EChartsModuleKey =
  | "bar"
  | "line"
  | "pie"
  | "scatter"
  | "effectScatter"
  | "graph"
  | "gauge"
  | "sankey"
  | "geo";

let echartsGlLoader: Promise<unknown> | null = null;
let hasRegisteredBaseModules = false;
const loadedModuleKeys = new Set<EChartsModuleKey>();
const moduleLoaderCache = new Map<EChartsModuleKey, Promise<void>>();

function ensureBaseModules() {
  if (hasRegisteredBaseModules) {
    return;
  }

  echarts.use([
    installGridComponent,
    installTooltipComponent,
    installLegendComponent,
    installTitleComponent,
    installCanvasRenderer,
  ]);
  hasRegisteredBaseModules = true;
}

function loadOptionalModule(moduleKey: EChartsModuleKey) {
  const cachedLoader = moduleLoaderCache.get(moduleKey);
  if (cachedLoader) {
    return cachedLoader;
  }

  const loader = (async () => {
    if (loadedModuleKeys.has(moduleKey)) {
      return;
    }

    switch (moduleKey) {
      case "bar": {
        const { install } = await import("echarts/lib/chart/bar/install.js");
        echarts.use([install]);
        break;
      }
      case "line": {
        const { install } = await import("echarts/lib/chart/line/install.js");
        echarts.use([install]);
        break;
      }
      case "pie": {
        const { install } = await import("echarts/lib/chart/pie/install.js");
        echarts.use([install]);
        break;
      }
      case "scatter": {
        const { install } = await import("echarts/lib/chart/scatter/install.js");
        echarts.use([install]);
        break;
      }
      case "effectScatter": {
        const { install } = await import("echarts/lib/chart/effectScatter/install.js");
        echarts.use([install]);
        break;
      }
      case "graph": {
        const { install } = await import("echarts/lib/chart/graph/install.js");
        echarts.use([install]);
        break;
      }
      case "gauge": {
        const { install } = await import("echarts/lib/chart/gauge/install.js");
        echarts.use([install]);
        break;
      }
      case "sankey": {
        const { install } = await import("echarts/lib/chart/sankey/install.js");
        echarts.use([install]);
        break;
      }
      case "geo": {
        const { install } = await import("echarts/lib/component/geo/install.js");
        echarts.use([install]);
        break;
      }
      default:
        break;
    }

    loadedModuleKeys.add(moduleKey);
  })();

  moduleLoaderCache.set(moduleKey, loader);
  return loader;
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
  const { option, enable3D, height = 220, moduleKeys = [] } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let chart: any;
    let mounted = true;

    const mountChart = async () => {
      if (!containerRef.current) return;
      try {
        ensureBaseModules();
        if (moduleKeys.length > 0) {
          await Promise.all(moduleKeys.map((moduleKey) => loadOptionalModule(moduleKey)));
        }
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
  }, [enable3D, moduleKeys, option]);

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
