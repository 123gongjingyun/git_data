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

          if (id.includes("echarts-gl")) {
            return "vendor-echarts-gl";
          }

          if (id.includes("/echarts/") || id.includes("/zrender/")) {
            return "vendor-echarts-core";
          }

          if (id.includes("/claygl/")) {
            return "vendor-echarts-gl";
          }

          if (id.includes("/antd/") || id.includes("@ant-design/icons")) {
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
