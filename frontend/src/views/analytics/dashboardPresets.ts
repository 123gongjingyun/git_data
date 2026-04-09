interface DashboardPresetWidget {
  id: string;
  type: string;
  title: string;
  dataSummary: string;
  widthPercent: number;
  height: number;
  dataSourceConfig?: {
    type: string;
    timeRange: string;
    metric: string;
    groupBy: string;
    ownerScope: string;
  };
  transformConfig?: {
    aggregation: string;
    sort: string;
  };
}

interface DashboardPreset {
  id: string;
  name: string;
  widgets: string[];
  dataScope: string;
  metrics: {
    totalOpportunities: string;
    monthlySigned: string;
    avgCycle: string;
    conversionRate: string;
  };
  designerWidgets: DashboardPresetWidget[];
}

const BIGSCREEN_3D_WIDGETS: DashboardPresetWidget[] = [
  {
    id: "3d_cube_main",
    type: "cube3d",
    title: "3D 行业-季度签约金额分布",
    dataSummary:
      "当前以 3D 柱状图方式展示金融 / 制造 / 电商 / 园区在各季度的签约金额分布，后续可替换为真实经营数据。",
    widthPercent: 100,
    height: 360,
    dataSourceConfig: {
      type: "mock",
      timeRange: "this_year",
      metric: "sum_contract_amount",
      groupBy: "industry",
      ownerScope: "all",
    },
    transformConfig: {
      aggregation: "sum",
      sort: "none",
    },
  },
  {
    id: "3d_flow_map",
    type: "flow_map",
    title: "售前全流程转化流向图",
    dataSummary:
      "当前通过 Sankey 流向图展示从线索到商机、方案、投标再到签约的数量转化关系，后续可替换为真实经营数据。",
    widthPercent: 60,
    height: 260,
    dataSourceConfig: {
      type: "mock",
      timeRange: "this_quarter",
      metric: "count",
      groupBy: "stage",
      ownerScope: "all",
    },
    transformConfig: {
      aggregation: "count",
      sort: "none",
    },
  },
  {
    id: "3d_topology",
    type: "topology",
    title: "售前系统拓扑与集成关系",
    dataSummary:
      "当前以力导向图展示 CRM / 售前平台 / 知识库 / 投标系统之间的系统拓扑与集成关系，后续可替换为真实经营数据。",
    widthPercent: 40,
    height: 260,
    dataSourceConfig: {
      type: "mock",
      timeRange: "all",
      metric: "count",
      groupBy: "none",
      ownerScope: "all",
    },
    transformConfig: {
      aggregation: "auto",
      sort: "none",
    },
  },
  {
    id: "3d_customer_map",
    type: "geo3d",
    title: "3D 客户分布与连线地图",
    dataSummary:
      "当前以 3D 地图形式展示重点客户在全国的分布，并用连线体现各区域客户与总部之间的关系，后续可替换为真实经营数据。",
    widthPercent: 100,
    height: 320,
    dataSourceConfig: {
      type: "mock",
      timeRange: "last_12_months",
      metric: "count",
      groupBy: "industry",
      ownerScope: "all",
    },
    transformConfig: {
      aggregation: "count",
      sort: "none",
    },
  },
  {
    id: "china_customer_map",
    type: "china_map",
    title: "全国地图组件",
    dataSummary:
      "当前以全国二维地图展示重点客户分布与区域热度，后续可替换为真实经营数据。",
    widthPercent: 50,
    height: 320,
    dataSourceConfig: {
      type: "mock",
      timeRange: "last_12_months",
      metric: "count",
      groupBy: "industry",
      ownerScope: "all",
    },
    transformConfig: {
      aggregation: "count",
      sort: "none",
    },
  },
];

const DASHBOARD_PRESETS: Record<string, DashboardPreset> = {
  bigscreen_3d: {
    id: "bigscreen_3d",
    name: "3D 酷炫大屏示例",
    widgets: ["funnel", "trend", "industry", "gantt"],
    dataScope: "all",
    metrics: {
      totalOpportunities: "30",
      monthlySigned: "680万",
      avgCycle: "39天",
      conversionRate: "48%",
    },
    designerWidgets: BIGSCREEN_3D_WIDGETS,
  },
  bigscreen_3d_global: {
    id: "bigscreen_3d_global",
    name: "3D 客户大屏示例",
    widgets: [],
    dataScope: "all",
    metrics: {
      totalOpportunities: "36",
      monthlySigned: "920万",
      avgCycle: "42天",
      conversionRate: "51%",
    },
    designerWidgets: [
      {
        id: "globe_customer_map",
        type: "geo3d",
        title: "3D 客户大屏",
        dataSummary:
          "示例数据：默认以全国 3D 地图展示重点客户分布与连线关系（Mock，仅前端示意）。",
        widthPercent: 100,
        height: 420,
        dataSourceConfig: {
          type: "mock",
          timeRange: "last_12_months",
          metric: "count",
          groupBy: "industry",
          ownerScope: "all",
        },
        transformConfig: {
          aggregation: "count",
          sort: "none",
        },
      },
    ],
  },
};

export function getAnalyticsAsyncDashboardPreset(id: string) {
  return DASHBOARD_PRESETS[id] ? { ...DASHBOARD_PRESETS[id] } : null;
}
