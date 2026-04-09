import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          const echartsFeatureChunks: Array<[string, string]> = [
            ["/echarts/lib/chart/bar/", "vendor-echarts-bar"],
            ["/echarts/lib/chart/line/", "vendor-echarts-line"],
            ["/echarts/lib/chart/pie/", "vendor-echarts-pie"],
            ["/echarts/lib/chart/scatter/", "vendor-echarts-scatter"],
            ["/echarts/lib/chart/effectScatter/", "vendor-echarts-effect-scatter"],
            ["/echarts/lib/chart/graph/", "vendor-echarts-graph"],
            ["/echarts/lib/chart/gauge/", "vendor-echarts-gauge"],
            ["/echarts/lib/chart/sankey/", "vendor-echarts-sankey"],
            ["/echarts/lib/component/geo/", "vendor-echarts-geo"],
          ];

          if (id.includes("echarts-gl")) {
            return "vendor-echarts-gl";
          }

          if (id.includes("/claygl/")) {
            return "vendor-echarts-gl";
          }

          const echartsFeatureChunk = echartsFeatureChunks.find(([pattern]) =>
            id.includes(pattern),
          );
          if (echartsFeatureChunk) {
            return echartsFeatureChunk[1];
          }

          if (id.includes("/echarts/") || id.includes("/zrender/")) {
            return "vendor-echarts-runtime";
          }

          if (id.includes("@ant-design/icons")) {
            return "vendor-antd-icons";
          }

          if (id.includes("/antd/")) {
            return "vendor-antd";
          }

          if (id.includes("@emotion") || id.includes("stylis")) {
            return "vendor-emotion";
          }

          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("scheduler")
          ) {
            return "vendor-react";
          }

          return "vendor-misc";
        },
      },
    },
  },
});
