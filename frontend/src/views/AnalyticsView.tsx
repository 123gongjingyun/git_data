import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Row, Col, Select, Button, Input, Tooltip, Modal, message } from "antd";
import { EChartsPreview } from "../components/EChartsPreview";
import type { CurrentUser } from "../shared/auth";
import { buildApiUrl } from "../shared/api";
import {
  loadSharedDemoOpportunities,
  OPPORTUNITY_DEMO_UPDATED_EVENT,
  type DemoOpportunity,
} from "../shared/opportunityDemoData";
import {
  buildMonthlyPerformanceTrend,
  formatWanAmount,
  getCurrentMonthSignedAmount,
} from "../shared/analyticsSync";

interface AnalyticsApiOpportunity {
  id: number;
  name: string;
  stage?: string;
  description?: string | null;
  expectedValue?: string | null;
  expectedCloseDate?: string | null;
  probability?: number | null;
  createdAt?: string;
  customer?: {
    id: number;
    name?: string | null;
  } | null;
  owner?: {
    id: number;
    username: string;
    displayName?: string | null;
  } | null;
}

interface AnalyticsOpportunityListResponse {
  items: AnalyticsApiOpportunity[];
  total: number;
  page: number;
  pageSize: number;
}

function mapApiOpportunityToDemoOpportunity(
  opportunity: AnalyticsApiOpportunity,
): DemoOpportunity {
  return {
    id: opportunity.id,
    name: opportunity.name,
    customerName: opportunity.customer?.name || undefined,
    stage: opportunity.stage,
    expectedValue: opportunity.expectedValue || undefined,
    expectedCloseDate: opportunity.expectedCloseDate || undefined,
    probability:
      typeof opportunity.probability === "number"
        ? opportunity.probability
        : undefined,
    createdAt: opportunity.createdAt,
    ownerUsername: opportunity.owner?.username,
  };
}

interface FunnelStage {
  key: string;
  label: string;
  text: string;
  widthPercent: number;
  background: string;
  count?: number;
  ratio?: number;
}

interface TrendBar {
  key: string;
  month: string;
  amount: string;
  heightPercent: number;
  background: string;
  numericAmount?: number;
}

interface IndustryItem {
  key: string;
  label: string;
  color: string;
  count?: number;
  percent?: number;
}

interface GanttItem {
  key: string;
  name: string;
  rangeText: string;
  leftPercent: number;
  widthPercent: number;
  background: string;
  tooltipText?: string;
}

type AnalyticsWidgetKey = "funnel" | "trend" | "industry" | "gantt";

type DesignerChartType =
  | "gauge"
  | "metric"
  | "progress"
  | "donut"
  | "line"
  | "area"
  | "step_line"
  | "pie"
  | "stacked_area"
  | "column"
  | "bubble"
  | "flow_map"
  | "topology"
  | "cube3d"
  | "china_map"
  | "geo3d"
  | "globe3d";

type DataSourceType =
  | "mock"
  | "opportunity"
  | "solution"
  | "bid"
  | "contract"
  | "custom";

type DataSourceTimeRange =
  | "all"
  | "this_month"
  | "this_quarter"
  | "this_year"
  | "last_12_months";

type DataSourceMetric =
  | "count"
  | "sum_expected_value"
  | "sum_contract_amount"
  | "avg_cycle"
  | "conversion_rate";

type DataSourceGroupBy =
  | "none"
  | "stage"
  | "owner"
  | "industry"
  | "month";

type DataSourceOwnerScope = "all" | "current_user" | "team";

type TransformAggregation = "auto" | "sum" | "avg" | "max" | "min" | "count";

type TransformSort = "none" | "asc" | "desc";

interface DataSourceConfig {
  type: DataSourceType;
  timeRange: DataSourceTimeRange;
  metric: DataSourceMetric;
  groupBy: DataSourceGroupBy;
  ownerScope: DataSourceOwnerScope;
}

interface TransformConfig {
  aggregation: TransformAggregation;
  sort: TransformSort;
  topN?: number;
}

interface DesignerWidget {
  id: string;
  type: DesignerChartType;
  title: string;
  dataSummary: string;
  widthPercent: number;
  height: number;
  dataSourceConfig?: DataSourceConfig;
  transformConfig?: TransformConfig;
}

type DataScopeKey =
  | "all"
  | "finance"
  | "manufacturing"
  | "ecommerce"
  | "park"
  | "others";

interface DashboardMetrics {
  totalOpportunities: string;
  monthlySigned: string;
  avgCycle: string;
  conversionRate: string;
}

interface DashboardConfig {
  id: string;
  name: string;
  widgets: AnalyticsWidgetKey[];
  dataScope?: DataScopeKey;
  metrics?: DashboardMetrics;
  isDefault?: boolean;
   designerWidgets?: DesignerWidget[];
}

const ANALYTICS_PRIMARY_DASHBOARD_ID = "standard";
const ANALYTICS_CHART_PANEL_HEIGHT = 360;

const DESIGNER_CHART_LABELS: Record<DesignerChartType, string> = {
  gauge: "仪表盘",
  metric: "指标卡",
  progress: "进度条",
  donut: "环形图",
  line: "折线图",
  area: "面积图",
  step_line: "阶梯图",
  pie: "饼图",
  stacked_area: "堆叠面积图",
  column: "柱状图",
  bubble: "气泡图",
  flow_map: "流向地图",
  topology: "拓扑图",
  cube3d: "3D 立体图",
  china_map: "全国地图组件",
  geo3d: "3D 客户分布地图",
  globe3d: "3D 客户大屏地图",
};

const DATA_SOURCE_TYPE_LABELS: Record<DataSourceType, string> = {
  mock: "仅前端示例数据（Mock）",
  opportunity: "商机（Opportunity）",
  solution: "方案版本（SolutionVersion）",
  bid: "投标记录（Bid）",
  contract: "合同（Contract）",
  custom: "自定义数据源（后端 SQL / API）",
};

const DATA_SOURCE_TIME_RANGE_LABELS: Record<DataSourceTimeRange, string> = {
  all: "全部时间",
  this_month: "本月",
  this_quarter: "本季度",
  this_year: "本年度",
  last_12_months: "最近 12 个月",
};

const DATA_SOURCE_METRIC_LABELS: Record<DataSourceMetric, string> = {
  count: "数量（条数）",
  sum_expected_value: "商机预估金额合计",
  sum_contract_amount: "合同金额合计",
  avg_cycle: "平均成交周期",
  conversion_rate: "转化率",
};

const DATA_SOURCE_GROUP_BY_LABELS: Record<DataSourceGroupBy, string> = {
  none: "不分组（整体汇总）",
  stage: "按阶段分组",
  owner: "按负责人分组",
  industry: "按行业分组",
  month: "按月份分组",
};

const DATA_SOURCE_OWNER_SCOPE_LABELS: Record<DataSourceOwnerScope, string> = {
  all: "全部负责人",
  current_user: "仅当前登录人",
  team: "当前团队",
};

const TRANSFORM_AGGREGATION_LABELS: Record<TransformAggregation, string> = {
  auto: "自动（按图表类型）",
  sum: "求和",
  avg: "平均值",
  max: "最大值",
  min: "最小值",
  count: "计数",
};

const TRANSFORM_SORT_LABELS: Record<TransformSort, string> = {
  none: "不排序",
  asc: "升序",
  desc: "降序",
};

const SCOPE_LABEL_MAP: Record<DataScopeKey, string> = {
  all: "全部数据",
  finance: "金融行业",
  manufacturing: "制造行业",
  ecommerce: "电商行业",
  park: "园区行业",
  others: "其他行业",
};

function buildAutoDataSummary(widget: DesignerWidget): string | null {
  const ds = widget.dataSourceConfig;
  const tf = widget.transformConfig;
  if (!ds && !tf) {
    return null;
  }

  const parts: string[] = [];

  if (ds) {
    parts.push(
      `数据来源：${
        DATA_SOURCE_TYPE_LABELS[ds.type] || ds.type
      }；时间范围：${
        DATA_SOURCE_TIME_RANGE_LABELS[ds.timeRange] || ds.timeRange
      }；指标：${
        DATA_SOURCE_METRIC_LABELS[ds.metric] || ds.metric
      }；分组：${
        DATA_SOURCE_GROUP_BY_LABELS[ds.groupBy] || ds.groupBy
      }；负责人范围：${
        DATA_SOURCE_OWNER_SCOPE_LABELS[ds.ownerScope] || ds.ownerScope
      }。`,
    );
  }

  if (tf) {
    parts.push(
      `加工方式：聚合=${
        TRANSFORM_AGGREGATION_LABELS[tf.aggregation] || tf.aggregation
      }，排序=${TRANSFORM_SORT_LABELS[tf.sort] || tf.sort}${
        tf.topN && tf.topN > 0 ? `，只保留 Top ${tf.topN}` : ""
      }。`,
    );
  }

  return parts.join("");
}

const DEFAULT_3D_WIDGETS: DesignerWidget[] = [
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

// 3D 客户分布 Mock 数据（用于 geo3d 组件）
const HQ_COORD_3D: [number, number] = [121.47, 31.23]; // 上海总部

const MOCK_CUSTOMERS_3D: {
  name: string;
  coord: [number, number];
  value: number; // 例如合同金额或客户评分
  industry: string;
  region: string;
}[] = [
  {
    name: "北京金融客户A",
    coord: [116.4, 39.9],
    value: 120,
    industry: "金融",
    region: "华北",
  },
  {
    name: "广州制造客户B",
    coord: [113.26, 23.13],
    value: 95,
    industry: "制造",
    region: "华南",
  },
  {
    name: "深圳互联网客户C",
    coord: [114.06, 22.54],
    value: 110,
    industry: "互联网",
    region: "华南",
  },
  {
    name: "成都政务客户D",
    coord: [104.06, 30.67],
    value: 80,
    industry: "政务",
    region: "西南",
  },
];

// 全球客户分布 Mock（用于 globe3d 组件）
const HQ_GLOBAL_COORD: [number, number] = [116.4, 39.9]; // 设为北京作为全球总部示意

const MOCK_GLOBAL_CUSTOMERS_3D: {
  name: string;
  coord: [number, number];
  value: number;
  region: string;
}[] = [
  {
    name: "纽约金融客户",
    coord: [-74.006, 40.7128],
    value: 130,
    region: "北美",
  },
  {
    name: "伦敦金融客户",
    coord: [-0.1276, 51.5074],
    value: 125,
    region: "欧洲",
  },
  {
    name: "新加坡科技客户",
    coord: [103.8198, 1.3521],
    value: 115,
    region: "东南亚",
  },
  {
    name: "悉尼公共事业客户",
    coord: [151.2093, -33.8688],
    value: 90,
    region: "大洋洲",
  },
];

function getDesignerChartBaseOptionDuplicate(type: DesignerChartType): any {
  switch (type) {
    case "gauge":
      return {
        tooltip: { formatter: "{a} <br/>{b} : {c}%" },
        series: [
          {
            name: "完成率",
            type: "gauge",
            progress: { show: true },
            detail: { valueAnimation: true, formatter: "{value}%" },
            data: [{ value: 68, name: "完成率" }],
          },
        ],
      };
    case "metric":
      return {
        title: {
          text: "本月签约金额",
          left: "center",
          top: "40%",
          textStyle: {
            fontSize: 18,
          },
          subtext: "¥ 3,200,000",
          subtextStyle: {
            fontSize: 22,
            fontWeight: "bold",
          },
        },
      };
    case "progress":
      return {
        xAxis: { type: "value", max: 100, show: false },
        yAxis: { type: "category", data: [""], show: false },
        series: [
          {
            type: "bar",
            data: [72],
            barWidth: 30,
            itemStyle: {
              borderRadius: 6,
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 1,
                y2: 0,
                colorStops: [
                  { offset: 0, color: "#1890ff" },
                  { offset: 1, color: "#52c41a" },
                ],
              },
            },
          },
          {
            type: "bar",
            data: [100],
            barWidth: 30,
            barGap: "-100%",
            itemStyle: {
              borderRadius: 6,
              color: "#f0f0f0",
            },
            silent: true,
          },
        ],
      };
    case "donut":
      return {
        tooltip: { trigger: "item" },
        legend: { bottom: 0 },
        series: [
          {
            type: "pie",
            radius: ["50%", "70%"],
            avoidLabelOverlap: false,
            label: { show: false },
            emphasis: { label: { show: true, fontSize: 16, fontWeight: "bold" } },
            labelLine: { show: false },
            data: [
              { value: 40, name: "金融" },
              { value: 30, name: "制造" },
              { value: 20, name: "电商" },
              { value: 10, name: "其他" },
            ],
          },
        ],
      };
    case "line":
      return {
        xAxis: {
          type: "category",
          data: ["1月", "2月", "3月", "4月", "5月", "6月"],
        },
        yAxis: { type: "value" },
        series: [
          {
            data: [120, 132, 101, 134, 90, 230],
            type: "line",
            smooth: true,
          },
        ],
      };
    case "area":
      return {
        xAxis: {
          type: "category",
          data: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
        },
        yAxis: { type: "value" },
        series: [
          {
            data: [140, 232, 101, 264, 90, 340, 250],
            type: "line",
            areaStyle: {},
          },
        ],
      };
    case "step_line":
      return {
        xAxis: {
          type: "category",
          data: ["阶段1", "阶段2", "阶段3", "阶段4", "阶段5"],
        },
        yAxis: { type: "value" },
        series: [
          {
            data: [20, 40, 40, 60, 80],
            type: "line",
            step: "middle",
          },
        ],
      };
    case "pie":
      return {
        tooltip: { trigger: "item" },
        series: [
          {
            type: "pie",
            radius: "65%",
            data: [
              { value: 1048, name: "已签约" },
              { value: 735, name: "谈判中" },
              { value: 580, name: "方案阶段" },
              { value: 484, name: "需求挖掘" },
            ],
          },
        ],
      };
    case "stacked_area":
      return {
        tooltip: { trigger: "axis" },
        legend: { bottom: 0 },
        xAxis: {
          type: "category",
          boundaryGap: false,
          data: ["1月", "2月", "3月", "4月", "5月", "6月"],
        },
        yAxis: { type: "value" },
        series: [
          {
            name: "金融",
            type: "line",
            stack: "Total",
            areaStyle: {},
            data: [120, 132, 101, 134, 90, 230],
          },
          {
            name: "制造",
            type: "line",
            stack: "Total",
            areaStyle: {},
            data: [220, 182, 191, 234, 290, 330],
          },
        ],
      };
    case "column":
      return {
        xAxis: {
          type: "category",
          data: ["Q1", "Q2", "Q3", "Q4"],
        },
        yAxis: { type: "value" },
        series: [
          {
            data: [320, 432, 501, 634],
            type: "bar",
            barWidth: "40%",
          },
        ],
      };
    case "bubble":
      return {
        xAxis: {},
        yAxis: {},
        series: [
          {
            type: "scatter",
            symbolSize: (val: number[]) => val[2] / 10,
            data: [
              [10, 20, 80],
              [15, 35, 120],
              [25, 30, 60],
              [40, 55, 160],
            ],
          },
        ],
      };
    case "flow_map":
      // 简化为 Sankey 示意流向关系
      return {
        series: [
          {
            type: "sankey",
            emphasis: { focus: "adjacency" },
            data: [
              { name: "线索" },
              { name: "商机" },
              { name: "方案" },
              { name: "投标" },
              { name: "签约" },
            ],
            links: [
              { source: "线索", target: "商机", value: 40 },
              { source: "商机", target: "方案", value: 30 },
              { source: "方案", target: "投标", value: 20 },
              { source: "投标", target: "签约", value: 10 },
            ],
          },
        ],
      };
    case "topology":
      return {
        series: [
          {
            type: "graph",
            layout: "force",
            roam: true,
            data: [
              { name: "CRM", symbolSize: 40 },
              { name: "售前平台", symbolSize: 50 },
              { name: "知识库", symbolSize: 30 },
              { name: "投标系统", symbolSize: 30 },
            ],
            links: [
              { source: "CRM", target: "售前平台" },
              { source: "售前平台", target: "知识库" },
              { source: "售前平台", target: "投标系统" },
            ],
          },
        ],
      };
    case "cube3d":
      // 3D 立体图示例：3D 柱状图（需 echarts-gl）
      return {
        tooltip: {},
        xAxis3D: {
          type: "category",
          data: ["金融", "制造", "电商", "园区"],
        },
        yAxis3D: {
          type: "category",
          data: ["Q1", "Q2", "Q3", "Q4"],
        },
        zAxis3D: {
          type: "value",
        },
        grid3D: {
          boxWidth: 120,
          boxDepth: 80,
          viewControl: {
            projection: "perspective",
          },
        },
        series: [
          {
            type: "bar3D",
            data: [
              [0, 0, 5],
              [0, 1, 8],
              [0, 2, 10],
              [0, 3, 6],
              [1, 0, 7],
              [1, 1, 6],
              [1, 2, 9],
              [1, 3, 4],
              [2, 0, 6],
              [2, 1, 9],
              [2, 2, 7],
              [2, 3, 5],
              [3, 0, 4],
              [3, 1, 6],
              [3, 2, 5],
              [3, 3, 3],
            ],
            shading: "lambert",
          },
        ],
      };
    default:
      return {};
  }
}

function getDesignerChartBaseOption(type: DesignerChartType): any {
  switch (type) {
    case "gauge":
      return {
        tooltip: { formatter: "{a} <br/>{b} : {c}%" },
        series: [
          {
            name: "完成率",
            type: "gauge",
            progress: { show: true },
            detail: { valueAnimation: true, formatter: "{value}%" },
            data: [{ value: 68, name: "完成率" }],
          },
        ],
      };
    case "metric":
      return {
        title: {
          text: "本月签约金额",
          left: "center",
          top: "40%",
          textStyle: {
            fontSize: 18,
          },
          subtext: "¥ 3,200,000",
          subtextStyle: {
            fontSize: 22,
            fontWeight: "bold",
          },
        },
      };
    case "progress":
      return {
        xAxis: { type: "value", max: 100, show: false },
        yAxis: { type: "category", data: [""], show: false },
        series: [
          {
            type: "bar",
            data: [72],
            barWidth: 30,
            itemStyle: {
              borderRadius: 6,
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 1,
                y2: 0,
                colorStops: [
                  { offset: 0, color: "#1890ff" },
                  { offset: 1, color: "#52c41a" },
                ],
              },
            },
          },
          {
            type: "bar",
            data: [100],
            barWidth: 30,
            barGap: "-100%",
            itemStyle: {
              borderRadius: 6,
              color: "#f0f0f0",
            },
            silent: true,
          },
        ],
      };
    case "donut":
      return {
        tooltip: { trigger: "item" },
        legend: { bottom: 0 },
        series: [
          {
            type: "pie",
            radius: ["50%", "70%"],
            avoidLabelOverlap: false,
            label: { show: false },
            emphasis: {
              label: { show: true, fontSize: 16, fontWeight: "bold" },
            },
            labelLine: { show: false },
            data: [
              { value: 40, name: "金融" },
              { value: 30, name: "制造" },
              { value: 20, name: "电商" },
              { value: 10, name: "其他" },
            ],
          },
        ],
      };
    case "line":
      return {
        xAxis: {
          type: "category",
          data: ["1月", "2月", "3月", "4月", "5月", "6月"],
        },
        yAxis: { type: "value" },
        series: [
          {
            data: [150, 230, 224, 218, 135, 147],
            type: "line",
            smooth: true,
          },
        ],
      };
    case "area":
      return {
        xAxis: {
          type: "category",
          data: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
        },
        yAxis: { type: "value" },
        series: [
          {
            data: [140, 232, 101, 264, 90, 340, 250],
            type: "line",
            areaStyle: {},
          },
        ],
      };
    case "step_line":
      return {
        xAxis: {
          type: "category",
          data: ["阶段1", "阶段2", "阶段3", "阶段4", "阶段5"],
        },
        yAxis: { type: "value" },
        series: [
          {
            data: [20, 40, 40, 60, 80],
            type: "line",
            step: "middle",
          },
        ],
      };
    case "pie":
      return {
        tooltip: { trigger: "item" },
        series: [
          {
            type: "pie",
            radius: "65%",
            data: [
              { value: 1048, name: "已签约" },
              { value: 735, name: "谈判中" },
              { value: 580, name: "方案阶段" },
              { value: 484, name: "需求挖掘" },
            ],
          },
        ],
      };
    case "stacked_area":
      return {
        tooltip: { trigger: "axis" },
        legend: { bottom: 0 },
        xAxis: {
          type: "category",
          boundaryGap: false,
          data: ["1月", "2月", "3月", "4月", "5月", "6月"],
        },
        yAxis: { type: "value" },
        series: [
          {
            name: "金融",
            type: "line",
            stack: "Total",
            areaStyle: {},
            data: [120, 132, 101, 134, 90, 230],
          },
          {
            name: "制造",
            type: "line",
            stack: "Total",
            areaStyle: {},
            data: [220, 182, 191, 234, 290, 330],
          },
        ],
      };
    case "column":
      return {
        xAxis: {
          type: "category",
          data: ["金融", "制造", "电商", "园区"],
        },
        yAxis: { type: "value" },
        series: [
          {
            data: [120, 200, 150, 80],
            type: "bar",
          },
        ],
      };
    case "topology":
      return {
        series: [
          {
            type: "graph",
            layout: "force",
            roam: true,
            data: [
              { name: "CRM", symbolSize: 40 },
              { name: "售前平台", symbolSize: 50 },
              { name: "知识库", symbolSize: 30 },
              { name: "投标系统", symbolSize: 30 },
            ],
            links: [
              { source: "CRM", target: "售前平台" },
              { source: "售前平台", target: "知识库" },
              { source: "售前平台", target: "投标系统" },
            ],
          },
        ],
      };
    case "cube3d":
      // 3D 立体图示例：3D 柱状图（需 echarts-gl）
      return {
        tooltip: {},
        xAxis3D: {
          type: "category",
          data: ["金融", "制造", "电商", "园区"],
        },
        yAxis3D: {
          type: "category",
          data: ["Q1", "Q2", "Q3", "Q4"],
        },
        zAxis3D: {
          type: "value",
        },
        grid3D: {
          boxWidth: 120,
          boxDepth: 80,
          viewControl: {
            projection: "perspective",
          },
        },
        series: [
          {
            type: "bar3D",
            data: [
              [0, 0, 5],
              [0, 1, 8],
              [0, 2, 12],
              [0, 3, 6],
              [1, 0, 7],
              [1, 1, 6],
              [1, 2, 9],
              [1, 3, 4],
              [2, 0, 6],
              [2, 1, 9],
              [2, 2, 7],
              [2, 3, 5],
              [3, 0, 4],
              [3, 1, 6],
              [3, 2, 5],
              [3, 3, 3],
            ],
            shading: "lambert",
          },
        ],
      };
    case "china_map":
      return {
        tooltip: {
          trigger: "item",
        },
        geo: {
          map: "china",
          roam: true,
          itemStyle: {
            areaColor: "#e6f4ff",
            borderColor: "#69b1ff",
          },
          emphasis: {
            itemStyle: {
              areaColor: "#91caff",
            },
          },
        },
        series: [
          {
            name: "客户热度",
            type: "effectScatter",
            coordinateSystem: "geo",
            rippleEffect: {
              brushType: "stroke",
            },
            symbolSize: (val: number[]) => Math.max(8, val[2] / 12),
            itemStyle: {
              color: "#1677ff",
            },
            data: MOCK_CUSTOMERS_3D.map((c) => ({
              name: c.name,
              value: [...c.coord, c.value],
            })),
          },
        ],
      };
    case "geo3d":
      // 3D 中国地图 + 客户分布连线（需 echarts-gl，地图 JSON 需在项目中额外注册）
      return {
        geo3D: {
          map: "china",
          roam: true,
          regionHeight: 2,
          itemStyle: {
            color: "#003a8c",
            opacity: 0.8,
            borderWidth: 0.6,
            borderColor: "#69c0ff",
          },
          label: {
            show: false,
          },
          light: {
            main: {
              intensity: 1.2,
              shadow: true,
            },
          },
          viewControl: {
            distance: 120,
            alpha: 35,
            beta: 15,
          },
        },
        series: [
          {
            name: "客户连线",
            type: "lines3D",
            coordinateSystem: "geo3D",
            blendMode: "lighter",
            lineStyle: {
              width: 1.5,
              color: "#ffd666",
              opacity: 0.9,
            },
            effect: {
              show: true,
              trailWidth: 2,
              trailLength: 0.25,
              trailOpacity: 0.9,
              spotIntensity: 2,
            },
            data: MOCK_CUSTOMERS_3D.map((c) => [HQ_COORD_3D, c.coord]),
          },
          {
            name: "重点客户",
            type: "scatter3D",
            coordinateSystem: "geo3D",
            symbolSize: 8,
            itemStyle: {
              color: "#ffd666",
            },
            label: {
              show: true,
              formatter: "{b}",
              position: "right",
              textStyle: {
                color: "#fff",
                fontSize: 10,
              },
            },
            data: MOCK_CUSTOMERS_3D.map((c) => ({
              name: c.name,
              value: [...c.coord, c.value],
            })),
          },
        ],
      };
    case "globe3d":
      // 3D 地球 + 全球客户连线示意（需 echarts-gl）
      return {
        globe: {
          environment: "#000",
          baseColor: "#1d3f72",
          shading: "lambert",
          light: {
            main: {
              intensity: 1.2,
            },
          },
          viewControl: {
            autoRotate: true,
            autoRotateSpeed: 5,
          },
        },
        series: [
          {
            name: "全球客户连线",
            type: "lines3D",
            coordinateSystem: "globe",
            blendMode: "lighter",
            lineStyle: {
              width: 1.5,
              color: "#40a9ff",
              opacity: 0.9,
            },
            effect: {
              show: true,
              trailWidth: 2,
              trailLength: 0.25,
              trailOpacity: 0.9,
              spotIntensity: 2,
            },
            data: MOCK_GLOBAL_CUSTOMERS_3D.map((c) => [
              [...HQ_GLOBAL_COORD, 0],
              [...c.coord, c.value],
            ]),
          },
          {
            name: "全球重点客户",
            type: "scatter3D",
            coordinateSystem: "globe",
            symbolSize: 8,
            itemStyle: {
              color: "#ffd666",
            },
            label: {
              show: true,
              formatter: "{b}",
              position: "right",
              textStyle: {
                color: "#fff",
                fontSize: 10,
              },
            },
            data: MOCK_GLOBAL_CUSTOMERS_3D.map((c) => ({
              name: c.name,
              value: [...c.coord, c.value],
            })),
          },
        ],
      };
    default:
      return {};
  }
}

function getDesignerChartOption(widget: DesignerWidget): any {
  const base = getDesignerChartBaseOption(widget.type) || {};
  const option: any = { ...base };

  const titleText = widget.title || DESIGNER_CHART_LABELS[widget.type];
  const autoSummary = buildAutoDataSummary(widget);

  if (titleText || autoSummary) {
    const existingTitle: any = (option as any).title;
    if (existingTitle) {
      option.title = {
        ...existingTitle,
        text: titleText ?? existingTitle.text,
        subtext: autoSummary ?? existingTitle.subtext,
      };
    } else {
      option.title = {
        text: titleText,
        subtext: autoSummary || undefined,
        left: "center",
        top: "2%",
        textStyle: {
          fontSize: 16,
          fontWeight: "bold",
        },
        subtextStyle: {
          fontSize: 11,
          color: "#8c8c8c",
        },
      };
    }
  }

  return option;
}

const funnelStages: FunnelStage[] = [
  {
    key: "leads",
    label: "线索确认",
    text: "32个 (100%)",
    widthPercent: 100,
    background: "linear-gradient(135deg, #1890ff, #40a9ff)",
  },
  {
    key: "discovery",
    label: "需求分析",
    text: "18个 (56%)",
    widthPercent: 90,
    background: "linear-gradient(135deg, #52c41a, #73d13d)",
  },
  {
    key: "proposal",
    label: "方案提报",
    text: "12个 (38%)",
    widthPercent: 80,
    background: "linear-gradient(135deg, #fa8c16, #ffa940)",
  },
  {
    key: "negotiation",
    label: "商务谈判",
    text: "8个 (25%)",
    widthPercent: 70,
    background: "linear-gradient(135deg, #722ed1, #9254de)",
  },
  {
    key: "won",
    label: "签约",
    text: "6个 (19%)",
    widthPercent: 60,
    background: "linear-gradient(135deg, #13c2c2, #36cfc9)",
  },
];

const trendBars: TrendBar[] = [
  {
    key: "jan",
    month: "1月",
    amount: "¥120万",
    heightPercent: 60,
    background: "linear-gradient(135deg, #1890ff, #40a9ff)",
  },
  {
    key: "feb",
    month: "2月",
    amount: "¥150万",
    heightPercent: 75,
    background: "linear-gradient(135deg, #52c41a, #73d13d)",
  },
  {
    key: "mar",
    month: "3月",
    amount: "¥130万",
    heightPercent: 65,
    background: "linear-gradient(135deg, #fa8c16, #ffa940)",
  },
  {
    key: "apr",
    month: "4月",
    amount: "¥170万",
    heightPercent: 85,
    background: "linear-gradient(135deg, #722ed1, #9254de)",
  },
  {
    key: "may",
    month: "5月",
    amount: "¥190万",
    heightPercent: 95,
    background: "linear-gradient(135deg, #eb2f96, #f759ab)",
  },
  {
    key: "jun",
    month: "6月",
    amount: "¥200万",
    heightPercent: 100,
    background: "linear-gradient(135deg, #13c2c2, #36cfc9)",
  },
];

const industries: IndustryItem[] = [
  { key: "finance", label: "金融 30%", color: "#1890ff" },
  { key: "manufacturing", label: "制造 25%", color: "#52c41a" },
  { key: "ecommerce", label: "电商 20%", color: "#fa8c16" },
  { key: "realestate", label: "地产 15%", color: "#722ed1" },
  { key: "others", label: "其他 10%", color: "#eb2f96" },
];

const ganttItems: GanttItem[] = [
  {
    key: "bank",
    name: "银行数字化转型",
    rangeText: "1/5 - 2/15",
    leftPercent: 0,
    widthPercent: 80,
    background: "linear-gradient(135deg, #1890ff, #40a9ff)",
  },
  {
    key: "mes",
    name: "制造业MES系统",
    rangeText: "1/10 - 3/20",
    leftPercent: 10,
    widthPercent: 70,
    background: "linear-gradient(135deg, #52c41a, #73d13d)",
  },
  {
    key: "ecommerce",
    name: "电商平台升级",
    rangeText: "1/15 - 2/28",
    leftPercent: 20,
    widthPercent: 50,
    background: "linear-gradient(135deg, #fa8c16, #ffa940)",
  },
  {
    key: "park",
    name: "智慧园区项目",
    rangeText: "1/8 - 3/10",
    leftPercent: 5,
    widthPercent: 85,
    background: "linear-gradient(135deg, #722ed1, #9254de)",
  },
  {
    key: "datacenter",
    name: "数据中心建设",
    rangeText: "1/20 - 3/5",
    leftPercent: 30,
    widthPercent: 60,
    background: "linear-gradient(135deg, #eb2f96, #f759ab)",
  },
  {
    key: "healthcare",
    name: "智慧医疗系统",
    rangeText: "1/25 - 3/15",
    leftPercent: 40,
    widthPercent: 55,
    background: "linear-gradient(135deg, #13c2c2, #36cfc9)",
  },
];

const DEFAULT_DASHBOARDS: DashboardConfig[] = [
  {
    id: "standard",
    name: "标准销售仪表盘",
    widgets: ["funnel", "trend", "industry", "gantt"],
    dataScope: "all",
    metrics: {
      totalOpportunities: "18",
      monthlySigned: "320万",
      avgCycle: "45天",
      conversionRate: "43%",
    },
    isDefault: true,
  },
  {
    id: "trend_focus",
    name: "趋势分析仪表盘",
    widgets: ["trend", "funnel"],
    dataScope: "all",
    metrics: {
      totalOpportunities: "12",
      monthlySigned: "210万",
      avgCycle: "38天",
      conversionRate: "40%",
    },
  },
  {
    id: "management_overview",
    name: "管理层概览仪表盘",
    widgets: ["funnel", "trend", "industry", "gantt"],
    dataScope: "all",
    metrics: {
      totalOpportunities: "24",
      monthlySigned: "450万",
      avgCycle: "52天",
      conversionRate: "35%",
    },
  },
  {
    id: "finance_focus",
    name: "金融经营仪表盘",
    widgets: ["trend", "industry", "gantt", "funnel"],
    dataScope: "finance",
    metrics: {
      totalOpportunities: "10",
      monthlySigned: "280万",
      avgCycle: "41天",
      conversionRate: "46%",
    },
  },
  {
    id: "manufacturing_pipeline",
    name: "制造推进仪表盘",
    widgets: ["funnel", "trend", "gantt", "industry"],
    dataScope: "manufacturing",
    metrics: {
      totalOpportunities: "8",
      monthlySigned: "190万",
      avgCycle: "48天",
      conversionRate: "38%",
    },
  },
  {
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
    designerWidgets: DEFAULT_3D_WIDGETS,
  },
  {
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
];

function normalizeDashboards(dashboards: DashboardConfig[]): DashboardConfig[] {
  const normalized = dashboards.map((dashboard) => {
    if (dashboard.id !== "bigscreen_3d_global") {
      return dashboard;
    }
    return {
      ...dashboard,
      name: "3D 客户大屏示例",
      designerWidgets: (dashboard.designerWidgets || []).map((widget) =>
        widget.id === "globe_customer_map"
          ? {
              ...widget,
              type: "geo3d",
              title: "3D 客户大屏",
              dataSummary:
                "示例数据：默认以全国 3D 地图展示重点客户分布与连线关系（Mock，仅前端示意）。",
            }
          : widget,
      ),
    };
  });

  const standardDashboard =
    normalized.find((dashboard) => dashboard.id === ANALYTICS_PRIMARY_DASHBOARD_ID) ||
    DEFAULT_DASHBOARDS.find(
      (dashboard) => dashboard.id === ANALYTICS_PRIMARY_DASHBOARD_ID,
    );

  const dashboardsWithoutStandard = normalized.filter(
    (dashboard) => dashboard.id !== ANALYTICS_PRIMARY_DASHBOARD_ID,
  );

  return [
    {
      ...(standardDashboard || DEFAULT_DASHBOARDS[0]),
      isDefault: true,
    },
    ...dashboardsWithoutStandard.map((dashboard) => ({
      ...dashboard,
      isDefault: false,
    })),
  ];
}

interface AnalyticsViewProps {
  currentUser?: CurrentUser | null;
  themeMode?: "light" | "dark";
}

export function AnalyticsView(props: AnalyticsViewProps = {}) {
  const { currentUser, themeMode = "light" } = props;
  const canDeleteAnalyticsAssets = currentUser?.role === "admin";
  const isDarkMode = themeMode === "dark";
  const panelBorder = isDarkMode
    ? "1px solid rgba(148, 163, 184, 0.26)"
    : "1px solid rgba(148, 163, 184, 0.18)";
  const panelBackground = isDarkMode
    ? "linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(17, 24, 39, 0.9) 100%)"
    : "linear-gradient(180deg, rgba(248, 250, 252, 0.96) 0%, rgba(241, 245, 249, 0.9) 100%)";
  const panelBackgroundBlue = isDarkMode
    ? "linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(13, 27, 42, 0.92) 100%)"
    : "linear-gradient(180deg, rgba(248, 250, 252, 0.96) 0%, rgba(239, 246, 255, 0.92) 100%)";
  const panelBackgroundCyan = isDarkMode
    ? "linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(8, 28, 37, 0.92) 100%)"
    : "linear-gradient(180deg, rgba(248, 250, 252, 0.96) 0%, rgba(240, 249, 255, 0.92) 100%)";
  const surfaceCardBackground = isDarkMode ? "rgba(15, 23, 42, 0.82)" : "#ffffff";
  const surfaceCardBorder = isDarkMode
    ? "1px solid rgba(71, 85, 105, 0.72)"
    : "1px solid rgba(219, 229, 239, 0.95)";
  const mutedTextColor = isDarkMode ? "rgba(226, 232, 240, 0.72)" : "#64748b";
  const strongTextColor = isDarkMode ? "#f8fafc" : "#0f172a";
  const accentTextColor = isDarkMode ? "#5eead4" : "#0f766e";
  const [sharedOpportunities, setSharedOpportunities] = useState<
    DemoOpportunity[]
  >(() => loadSharedDemoOpportunities());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const token = window.localStorage.getItem("accessToken");
    if (!token) {
      return;
    }

    let cancelled = false;

    const loadAnalyticsOpportunitiesFromApi = async () => {
      try {
        const response = await fetch(
          buildApiUrl("/opportunities?page=1&pageSize=100"),
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          return;
        }

        const data =
          (await response.json()) as AnalyticsOpportunityListResponse;
        const items = Array.isArray(data.items)
          ? data.items.map(mapApiOpportunityToDemoOpportunity)
          : [];

        if (!cancelled && items.length > 0) {
          setSharedOpportunities(items);
        }
      } catch {
        // Fall back to local demo opportunities when backend is unavailable.
      }
    };

    void loadAnalyticsOpportunitiesFromApi();

    return () => {
      cancelled = true;
    };
  }, []);

  const [dashboards, setDashboards] = useState<DashboardConfig[]>(() => {
    if (typeof window === "undefined") {
      return normalizeDashboards(DEFAULT_DASHBOARDS);
    }
    try {
      const stored = window.localStorage.getItem("analyticsDashboards");
      if (stored) {
        const parsed = JSON.parse(stored) as DashboardConfig[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return normalizeDashboards(parsed);
        }
      }
    } catch {
      // ignore parse errors, fall back to defaults
    }
    return normalizeDashboards(DEFAULT_DASHBOARDS);
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const handleUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<DemoOpportunity[]>;
      if (Array.isArray(customEvent.detail)) {
        setSharedOpportunities(customEvent.detail);
        return;
      }
      setSharedOpportunities(loadSharedDemoOpportunities());
    };
    window.addEventListener(OPPORTUNITY_DEMO_UPDATED_EVENT, handleUpdated);
    return () => {
      window.removeEventListener(OPPORTUNITY_DEMO_UPDATED_EVENT, handleUpdated);
    };
  }, []);

  const initialDefaultDashboard =
    dashboards.find((d) => d.isDefault)?.id || dashboards[0]?.id;

  const [activeDashboardId, setActiveDashboardId] = useState<string>(
    () => {
      if (typeof window === "undefined") {
        return initialDefaultDashboard;
      }
      const storedId =
        window.localStorage.getItem("analyticsDefaultDashboardId") || "";
      return dashboards.some((d) => d.id === storedId)
        ? storedId
        : initialDefaultDashboard;
    },
  );
  const [isEditingDashboard, setIsEditingDashboard] = useState(false);

  const [designerWidgets, setDesignerWidgets] = useState<DesignerWidget[]>([]);
  const [designerDraggingType, setDesignerDraggingType] =
    useState<DesignerChartType | null>(null);
  const [designerDraggingId, setDesignerDraggingId] = useState<string | null>(
    null,
  );
  const [selectedDesignerWidgetId, setSelectedDesignerWidgetId] = useState<
    string | null
  >(null);

  const [quickAddType, setQuickAddType] =
    useState<DesignerChartType | null>(null);

  const [isPreviewingDashboard, setIsPreviewingDashboard] = useState(false);
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<"dark" | "light" | "tech">(
    "dark",
  );

  const designerCanvasRef = useRef<HTMLDivElement | null>(null);
  const designerResizeInfoRef = useRef<{
    widgetId: string;
    startX: number;
    startY: number;
    startWidthPercent: number;
    startHeight: number;
    containerWidth: number;
  } | null>(null);

  const activeDashboard =
    dashboards.find((d) => d.id === activeDashboardId) || dashboards[0];

  const [widgetOrder, setWidgetOrder] = useState<AnalyticsWidgetKey[]>(
    activeDashboard?.widgets || ["funnel", "trend", "industry", "gantt"],
  );

  useEffect(() => {
    setWidgetOrder(activeDashboard?.widgets || []);
  }, [activeDashboardId, dashboards]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "analyticsDashboards",
        JSON.stringify(dashboards),
      );
      const defaultId =
        dashboards.find((d) => d.isDefault)?.id || dashboards[0]?.id;
      if (defaultId) {
        window.localStorage.setItem("analyticsDefaultDashboardId", defaultId);
      }
    } catch {
      // ignore storage errors in demo
    }
  }, [dashboards]);

  const handleSetDefaultDashboard = () => {
    if (activeDashboardId !== ANALYTICS_PRIMARY_DASHBOARD_ID) {
      return;
    }
    setDashboards((prev) =>
      prev.map((d) => ({
        ...d,
        isDefault: d.id === ANALYTICS_PRIMARY_DASHBOARD_ID,
      })),
    );
  };

  const handleDeleteDashboard = () => {
    if (!activeDashboard) return;
    if (
      activeDashboard.id === ANALYTICS_PRIMARY_DASHBOARD_ID ||
      activeDashboard.isDefault
    ) {
      return;
    }
    Modal.confirm({
      title: `确认删除仪表盘「${activeDashboard.name}」？`,
      content: "删除后将移出当前仪表盘列表，如有需要需重新创建或复制。",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: () => {
        const remaining = dashboards.filter((d) => d.id !== activeDashboardId);
        const nextDashboards =
          remaining.length === 0 ? DEFAULT_DASHBOARDS : remaining;
        const nextActiveId =
          nextDashboards.find((d) => d.isDefault)?.id || nextDashboards[0]?.id;

        setDashboards(nextDashboards);
        if (nextActiveId) {
          setActiveDashboardId(nextActiveId);
        }
        setDesignerWidgets([]);
        setSelectedDesignerWidgetId(null);
        setIsEditingDashboard(false);
        setIsPreviewingDashboard(false);
        message.success(`已删除仪表盘：${activeDashboard.name}`);
      },
    });
  };

  const handleDuplicateDashboard = () => {
    if (!activeDashboard) return;
    const newId = `custom_${Date.now()}`;
    const clonedDesignerWidgets = activeDashboard.designerWidgets
      ? activeDashboard.designerWidgets.map((w) => ({
          ...w,
          id: `designer_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 8)}`,
        }))
      : undefined;

    const cloned: DashboardConfig = {
      ...activeDashboard,
      id: newId,
      name: `${activeDashboard.name}（副本）`,
      isDefault: false,
      designerWidgets: clonedDesignerWidgets,
    };

    setDashboards((prev) => [...prev, cloned]);
    setActiveDashboardId(newId);
    setDesignerWidgets(clonedDesignerWidgets || []);
    setSelectedDesignerWidgetId(clonedDesignerWidgets?.[0]?.id ?? null);
    setIsEditingDashboard(true);
  };

  const handleClosePreview = () => {
    setIsPreviewingDashboard(false);
    if (typeof document !== "undefined" && document.fullscreenElement) {
      if (document.exitFullscreen) {
        void document.exitFullscreen().catch(() => {
          // ignore
        });
      }
    }
  };

  const handleEnterPreviewFullscreen = () => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (root.requestFullscreen) {
      void root.requestFullscreen().catch(() => {
        // ignore
      });
    }
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handler = () => {
      setIsPreviewFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
    };
  }, []);

  const handleCreateDashboard = () => {
    const newId = `custom_${Date.now()}`;
    const newDashboard: DashboardConfig = {
      id: newId,
      name: "未命名仪表盘",
      widgets: ["funnel", "trend", "industry", "gantt"],
      dataScope: "all",
      metrics: DEFAULT_DASHBOARDS[0].metrics,
      isDefault: false,
      designerWidgets: [],
    };
    setDashboards((prev) => [...prev, newDashboard]);
    setActiveDashboardId(newId);
    setDesignerWidgets([]);
    setSelectedDesignerWidgetId(null);
    setIsEditingDashboard(true);
  };

  const activeWidgets = activeDashboard?.widgets || [];
  const activeScope = activeDashboard?.dataScope || "all";
  const activeDesignerWidgets: DesignerWidget[] =
    activeDashboard?.designerWidgets || [];

  const inferIndustry = (opportunity: DemoOpportunity): DataScopeKey => {
    const content = `${opportunity.name} ${opportunity.customerName || ""}`.toLowerCase();
    if (content.includes("银行") || content.includes("金融")) return "finance";
    if (content.includes("制造") || content.includes("工业")) return "manufacturing";
    if (content.includes("电商") || content.includes("零售")) return "ecommerce";
    if (content.includes("园区") || content.includes("地产")) return "park";
    return "others";
  };

  const filteredOpportunities = useMemo(() => {
    if (activeScope === "all") {
      return sharedOpportunities;
    }
    return sharedOpportunities.filter(
      (opportunity) => inferIndustry(opportunity) === activeScope,
    );
  }, [activeScope, sharedOpportunities]);

  const activeMetrics: DashboardMetrics = useMemo(() => {
    const total = filteredOpportunities.length;
    const signedThisMonth = getCurrentMonthSignedAmount(filteredOpportunities);
    const avgCycleDays =
      filteredOpportunities.length > 0
        ? Math.round(
            filteredOpportunities.reduce((sum, item) => {
              const start = new Date(item.createdAt || "").getTime();
              const end = new Date(item.expectedCloseDate || "").getTime();
              if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
                return sum;
              }
              return sum + Math.round((end - start) / (1000 * 60 * 60 * 24));
            }, 0) / filteredOpportunities.length,
          )
        : 0;
    const wonCount = filteredOpportunities.filter((item) => item.stage === "won").length;
    const conversionRate =
      total > 0 ? Math.round((wonCount / total) * 100) : 0;
    return {
      totalOpportunities: String(total),
      monthlySigned: formatWanAmount(signedThisMonth),
      avgCycle: `${avgCycleDays}天`,
      conversionRate: `${conversionRate}%`,
    };
  }, [filteredOpportunities]);

  const funnelStages = useMemo<FunnelStage[]>(() => {
    const total = filteredOpportunities.length || 1;
    const stageConfigs = [
      { key: "leads", label: "线索确认", stages: ["discovery", "solution_design", "proposal", "bidding", "negotiation", "won"], background: "linear-gradient(135deg, #1890ff, #40a9ff)" },
      { key: "discovery", label: "需求分析", stages: ["solution_design", "proposal", "bidding", "negotiation", "won"], background: "linear-gradient(135deg, #52c41a, #73d13d)" },
      { key: "proposal", label: "方案提报", stages: ["proposal", "bidding", "negotiation", "won"], background: "linear-gradient(135deg, #fa8c16, #ffa940)" },
      { key: "negotiation", label: "商务谈判", stages: ["negotiation", "won"], background: "linear-gradient(135deg, #722ed1, #9254de)" },
      { key: "won", label: "签约", stages: ["won"], background: "linear-gradient(135deg, #13c2c2, #36cfc9)" },
    ];
    return stageConfigs.map((config, index) => {
      const count = filteredOpportunities.filter((item) =>
        config.stages.includes(item.stage || ""),
      ).length;
      const ratio = Math.round((count / total) * 100);
      return {
        key: config.key,
        label: config.label,
        text: `${count}个 (${ratio}%)`,
        widthPercent: Math.max(60, 100 - index * 10),
        background: config.background,
        count,
        ratio,
      };
    });
  }, [filteredOpportunities]);

  const trendBars = useMemo<TrendBar[]>(() => {
    const monthlyAmounts = buildMonthlyPerformanceTrend(filteredOpportunities, 6);
    const maxAmount = monthlyAmounts.reduce(
      (max, item) => (item.signedAmount > max ? item.signedAmount : max),
      0,
    );
    const colors = [
      "linear-gradient(135deg, #1890ff, #40a9ff)",
      "linear-gradient(135deg, #52c41a, #73d13d)",
      "linear-gradient(135deg, #fa8c16, #ffa940)",
      "linear-gradient(135deg, #722ed1, #9254de)",
      "linear-gradient(135deg, #eb2f96, #f759ab)",
      "linear-gradient(135deg, #13c2c2, #36cfc9)",
    ];
    return monthlyAmounts.map((item, index) => ({
      key: item.monthKey,
      month: item.monthLabel,
      amount: formatWanAmount(item.signedAmount),
      numericAmount: item.signedAmount,
      heightPercent:
        maxAmount > 0
          ? Math.max(12, Math.round((item.signedAmount / maxAmount) * 100))
          : 12,
      background: colors[index % colors.length],
    }));
  }, [filteredOpportunities]);

  const funnelChartOption = useMemo(
    () => ({
      backgroundColor: "transparent",
      animationDuration: 500,
      grid: {
        left: 88,
        right: 76,
        top: 22,
        bottom: 16,
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
          shadowStyle: {
            color: "rgba(20, 184, 166, 0.08)",
          },
        },
        backgroundColor: "rgba(15, 23, 42, 0.92)",
        borderWidth: 0,
        textStyle: {
          color: "#f8fafc",
        },
        formatter: (params: Array<{ dataIndex: number }>) => {
          const stage = funnelStages[params[0]?.dataIndex || 0];
          return `${stage.label}<br/>${stage.text}`;
        },
      },
      xAxis: {
        type: "value",
        min: 0,
        max: 110,
        splitNumber: 4,
        axisLabel: {
          color: "#94a3b8",
          formatter: "{value}%",
        },
        splitLine: {
          lineStyle: {
            color: "rgba(148, 163, 184, 0.16)",
            type: "dashed",
          },
        },
      },
      yAxis: {
        type: "category",
        inverse: true,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: {
          color: "#475569",
          fontSize: 12,
        },
        data: funnelStages.map((stage) => stage.label),
      },
      series: [
        {
          type: "bar",
          data: funnelStages.map((stage, index) => ({
            value: stage.ratio || 0,
            itemStyle: {
              color: [
                "#1677ff",
                "#52c41a",
                "#fa8c16",
                "#722ed1",
                "#13c2c2",
              ][index % 5],
              borderRadius: [0, 12, 12, 0],
              shadowBlur: 18,
              shadowColor: "rgba(15, 23, 42, 0.12)",
            },
          })),
          barWidth: 18,
          showBackground: true,
          backgroundStyle: {
            color: "rgba(226, 232, 240, 0.42)",
            borderRadius: [0, 12, 12, 0],
          },
          label: {
            show: true,
            position: "right",
            color: "#0f172a",
            fontSize: 11,
            fontWeight: 600,
            formatter: (_: { dataIndex: number }) =>
              funnelStages[_.dataIndex]?.text || "",
          },
        },
      ],
    }),
    [funnelStages],
  );

  const trendChartOption = useMemo(
    () => ({
      backgroundColor: "transparent",
      animationDuration: 500,
      grid: {
        left: 18,
        right: 18,
        top: 30,
        bottom: 42,
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(15, 23, 42, 0.92)",
        borderWidth: 0,
        textStyle: {
          color: "#f8fafc",
        },
        formatter: (params: Array<{ dataIndex: number }>) => {
          const bar = trendBars[params[0]?.dataIndex || 0];
          return `${bar.month}<br/>签约金额：${bar.amount}`;
        },
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        axisTick: { show: false },
        axisLine: {
          lineStyle: {
            color: "rgba(148, 163, 184, 0.22)",
          },
        },
        axisLabel: {
          color: "#64748b",
          margin: 14,
        },
        data: trendBars.map((bar) => bar.month),
      },
      yAxis: {
        type: "value",
        min: 0,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: {
            color: "rgba(148, 163, 184, 0.16)",
            type: "dashed",
          },
        },
        axisLabel: {
          color: "#94a3b8",
          formatter: (value: number) => `${Math.round(value)}万`,
        },
      },
      series: [
        {
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 9,
          data: trendBars.map((bar) => bar.numericAmount || 0),
          lineStyle: {
            color: "#13c2c2",
            width: 3,
          },
          itemStyle: {
            color: "#ffffff",
            borderColor: "#13c2c2",
            borderWidth: 3,
          },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(19, 194, 194, 0.32)" },
                { offset: 1, color: "rgba(19, 194, 194, 0.04)" },
              ],
            },
          },
        },
        {
          type: "bar",
          barWidth: 18,
          data: trendBars.map((bar) => ({
            value: bar.numericAmount || 0,
            itemStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: "#7dd3fc" },
                  { offset: 1, color: "#1677ff" },
                ],
              },
              borderRadius: [8, 8, 0, 0],
              opacity: 0.9,
            },
          })),
          z: 1,
        },
      ],
    }),
    [trendBars],
  );

  const renderFunnelPanel = () => (
    <div
      style={{
        height: ANALYTICS_CHART_PANEL_HEIGHT,
        padding: 14,
        borderRadius: 20,
        border: panelBorder,
        background: panelBackground,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
      }}
    >
      <EChartsPreview option={funnelChartOption} height={260} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        {funnelStages.map((stage) => (
          <div
            key={stage.key}
            style={{
              padding: "10px 12px",
              borderRadius: 14,
              background: surfaceCardBackground,
              border: surfaceCardBorder,
            }}
          >
            <div style={{ fontSize: 12, color: mutedTextColor }}>{stage.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: strongTextColor }}>
              {stage.count || 0} 个
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTrendPanel = () => (
    <div
      style={{
        height: ANALYTICS_CHART_PANEL_HEIGHT,
        padding: 14,
        borderRadius: 20,
        border: panelBorder,
        background: panelBackgroundBlue,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          padding: "0 4px",
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: mutedTextColor }}>最近 6 个月签约走势</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: strongTextColor }}>
            {activeMetrics.monthlySigned}
          </div>
        </div>
        <div style={{ fontSize: 12, color: accentTextColor }}>
          真实 MySQL 数据优先，空缺月份保留 0 值
        </div>
      </div>
      <EChartsPreview option={trendChartOption} height={236} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        {trendBars.slice(-3).map((bar) => (
          <div
            key={bar.key}
            style={{
              padding: "10px 12px",
              borderRadius: 14,
              background: surfaceCardBackground,
              border: surfaceCardBorder,
            }}
          >
            <div style={{ fontSize: 12, color: mutedTextColor }}>{bar.month}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: strongTextColor }}>
              {bar.amount}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderIndustryPanel = () => (
    <div
      style={{
        height: ANALYTICS_CHART_PANEL_HEIGHT,
        padding: 14,
        borderRadius: 20,
        border: panelBorder,
        background: panelBackground,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
          padding: "0 4px",
        }}
      >
        <div style={{ fontSize: 12, color: mutedTextColor }}>
          鼠标悬停任一颜色区域即可查看对应行业数据
        </div>
        <div style={{ fontSize: 12, color: strongTextColor, fontWeight: 600 }}>
          活跃行业 {activeIndustryCount} 个
        </div>
      </div>
      <EChartsPreview option={industryChartOption} height={286} />
    </div>
  );

  const renderGanttPanel = () => (
    <div
      style={{
        height: ANALYTICS_CHART_PANEL_HEIGHT,
        padding: 14,
        borderRadius: 20,
        border: panelBorder,
        background: panelBackgroundCyan,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
      }}
    >
        <div
          style={{
            fontSize: 12,
            color: mutedTextColor,
            padding: "0 4px",
          }}
        >
        左侧固定项目名称，右侧展示阶段窗口与推进区间，避免图形压住标题。
      </div>
      <EChartsPreview option={ganttChartOption} height={286} />
    </div>
  );

  const industries = useMemo<IndustryItem[]>(() => {
    const counts = filteredOpportunities.reduce<Record<string, number>>((acc, item) => {
      const industry = inferIndustry(item);
      acc[industry] = (acc[industry] || 0) + 1;
      return acc;
    }, {});
    const total = filteredOpportunities.length || 1;
    const defs: Array<{ key: DataScopeKey; label: string; color: string }> = [
      { key: "finance", label: "金融", color: "#1890ff" },
      { key: "manufacturing", label: "制造", color: "#52c41a" },
      { key: "ecommerce", label: "电商", color: "#fa8c16" },
      { key: "park", label: "园区", color: "#722ed1" },
      { key: "others", label: "其他", color: "#eb2f96" },
    ];
    return defs.map((item) => ({
      key: item.key,
      color: item.color,
      label: item.label,
      count: counts[item.key] || 0,
      percent: Math.round(((counts[item.key] || 0) / total) * 100),
    }));
  }, [filteredOpportunities]);

  const ganttItems = useMemo<GanttItem[]>(() => {
    return filteredOpportunities.slice(0, 5).map((item, index) => ({
      key: String(item.id),
      name: item.name.replace(/^【示例】/, "").trim(),
      rangeText: `${item.createdAt?.slice(5, 10) || "-"} - ${item.expectedCloseDate?.slice(5, 10) || "-"}`,
      leftPercent: Math.min(60, index * 10),
      widthPercent: Math.max(25, (item.probability || 0)),
      tooltipText: `${item.name.replace(/^【示例】/, "").trim()} | 阶段：${item.stage || "-"} | 成功概率：${item.probability || 0}% | 周期：${item.createdAt?.slice(5, 10) || "-"} - ${item.expectedCloseDate?.slice(5, 10) || "-"}`,
      background: [
        "linear-gradient(135deg, #1890ff, #40a9ff)",
        "linear-gradient(135deg, #52c41a, #73d13d)",
        "linear-gradient(135deg, #722ed1, #9254de)",
        "linear-gradient(135deg, #eb2f96, #f759ab)",
        "linear-gradient(135deg, #13c2c2, #36cfc9)",
      ][index % 5],
    }));
  }, [filteredOpportunities]);

  const industryChartOption = useMemo(
    () => ({
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(15, 23, 42, 0.92)",
        borderWidth: 0,
        textStyle: {
          color: "#f8fafc",
        },
        formatter: (params: {
          name: string;
          value: number;
          percent: number;
        }) =>
          `${params.name}<br/>商机数：${params.value} 个<br/>占比：${params.percent}%`,
      },
      legend: {
        bottom: 0,
        icon: "circle",
        itemWidth: 10,
        itemHeight: 10,
        textStyle: {
          color: "#475569",
          fontSize: 12,
        },
      },
      series: [
        {
          type: "pie",
          radius: ["52%", "76%"],
          center: ["50%", "42%"],
          avoidLabelOverlap: false,
          label: {
            show: true,
            formatter: "{b}\n{d}%",
            color: "#334155",
            fontSize: 12,
            lineHeight: 16,
          },
          labelLine: {
            length: 10,
            length2: 10,
          },
          itemStyle: {
            borderColor: "#ffffff",
            borderWidth: 3,
          },
          emphasis: {
            scale: true,
            scaleSize: 8,
          },
          data: industries.map((item) => ({
            value: item.count || 0,
            name: item.label,
            itemStyle: {
              color: item.color,
            },
          })),
        },
      ],
    }),
    [industries],
  );

  const ganttChartOption = useMemo(
    () => ({
      backgroundColor: "transparent",
      grid: {
        left: 124,
        right: 24,
        top: 18,
        bottom: 24,
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
        },
        backgroundColor: "rgba(15, 23, 42, 0.92)",
        borderWidth: 0,
        textStyle: {
          color: "#f8fafc",
        },
        formatter: (params: Array<{ dataIndex: number }>) => {
          const item = ganttItems[params[0]?.dataIndex || 0];
          return item.tooltipText || `${item.name}：${item.rangeText}`;
        },
      },
      xAxis: {
        type: "value",
        min: 0,
        max: 100,
        splitNumber: 5,
        axisLabel: {
          color: "#94a3b8",
          formatter: "{value}%",
        },
        splitLine: {
          lineStyle: {
            color: "rgba(148, 163, 184, 0.16)",
            type: "dashed",
          },
        },
      },
      yAxis: {
        type: "category",
        inverse: true,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: {
          color: "#475569",
          fontSize: 12,
          width: 108,
          overflow: "truncate",
        },
        data: ganttItems.map((item) => item.name),
      },
      series: [
        {
          type: "bar",
          stack: "timeline",
          silent: true,
          data: ganttItems.map((item) => item.leftPercent),
          itemStyle: {
            color: "transparent",
          },
          emphasis: {
            disabled: true,
          },
        },
        {
          type: "bar",
          stack: "timeline",
          barWidth: 18,
          data: ganttItems.map((item) => {
            const colors =
              item.background.match(/#(?:[0-9a-fA-F]{3}){1,2}/g) || [];
            return {
              value: item.widthPercent,
              itemStyle: {
                color: {
                  type: "linear",
                  x: 0,
                  y: 0,
                  x2: 1,
                  y2: 0,
                  colorStops: [
                    { offset: 0, color: colors[0] || "#1677ff" },
                    { offset: 1, color: colors[1] || colors[0] || "#69b1ff" },
                  ],
                },
                borderRadius: 999,
              },
            };
          }),
          label: {
            show: true,
            position: "inside",
            color: "#ffffff",
            fontSize: 10,
            formatter: (_: { dataIndex: number }) =>
              ganttItems[_.dataIndex]?.rangeText || "",
          },
        },
      ],
    }),
    [ganttItems],
  );

  const previewThemeStyles: Record<
    "dark" | "light" | "tech",
    {
      canvasBackground: string;
      cardHeadBg: string;
      cardHeadColor: string;
      cardBodyBg: string;
      cardBorder: string;
      cardTextColor: string;
      summaryTextColor: string;
    }
  > = {
    dark: {
      canvasBackground: "#050b16",
      cardHeadBg: "#001529",
      cardHeadColor: "#ffffff",
      cardBodyBg: "#0b1a2b",
      cardBorder: "#003a8c",
      cardTextColor: "#ffffff",
      summaryTextColor: "rgba(255,255,255,0.65)",
    },
    light: {
      canvasBackground: "#f0f2f5",
      cardHeadBg: "#f5f5f5",
      cardHeadColor: "#262626",
      cardBodyBg: "#ffffff",
      cardBorder: "#d9d9d9",
      cardTextColor: "#262626",
      summaryTextColor: "#8c8c8c",
    },
    tech: {
      canvasBackground:
        "radial-gradient(circle at top, #112a45 0, #020b1f 60%)",
      cardHeadBg: "linear-gradient(90deg, #001529, #003a8c)",
      cardHeadColor: "#e6f7ff",
      cardBodyBg: "#020b1f",
      cardBorder: "#177ddc",
      cardTextColor: "#e6f7ff",
      summaryTextColor: "#69c0ff",
    },
  };

  const currentPreviewTheme = previewThemeStyles[previewTheme];
  const activeIndustryCount = industries.filter((item) => (item.count || 0) > 0).length;
  const compactStatCardStyle = {
    borderRadius: 16,
    border: "1px solid var(--app-border)",
    boxShadow: "var(--app-shadow)",
  };

  const handleDesignerCanvasDrop = () => {
    if (!isEditingDashboard) return;
    if (!designerDraggingType) {
      return;
    }
    const newWidget: DesignerWidget = {
      id: `designer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: designerDraggingType,
      title: DESIGNER_CHART_LABELS[designerDraggingType],
      dataSummary:
        "示例数据：请在右侧为该组件填写自定义数据说明（Mock，仅前端占位）。",
      widthPercent:
        designerDraggingType === "metric" || designerDraggingType === "progress"
          ? 50
          : 100,
      // 默认高度：与当前图表预览高度保持一致
      height: 220,
      dataSourceConfig: {
        type: "mock",
        timeRange: "this_month",
        metric: "count",
        groupBy: "none",
        ownerScope: "all",
      },
      transformConfig: {
        aggregation: "auto",
        sort: "none",
        topN: undefined,
      },
    };
    setDesignerWidgets((prev) => [...prev, newWidget]);
    setSelectedDesignerWidgetId(newWidget.id);
    setDesignerDraggingType(null);
  };

  const handleQuickAddWidget = () => {
    if (!isEditingDashboard || !quickAddType) return;
    const newWidget: DesignerWidget = {
      id: `designer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: quickAddType,
      title: DESIGNER_CHART_LABELS[quickAddType],
      dataSummary:
        "示例数据：请在右侧为该组件填写自定义数据说明（Mock，仅前端占位）。",
      widthPercent:
        quickAddType === "metric" || quickAddType === "progress" ? 50 : 100,
      height: 220,
      dataSourceConfig: {
        type: "mock",
        timeRange: "this_month",
        metric: "count",
        groupBy: "none",
        ownerScope: "all",
      },
      transformConfig: {
        aggregation: "auto",
        sort: "none",
        topN: undefined,
      },
    };
    setDesignerWidgets((prev) => [...prev, newWidget]);
    setSelectedDesignerWidgetId(newWidget.id);
  };

  const handleDesignerWidgetDropOnWidget = (targetId: string) => {
    if (!isEditingDashboard) return;
    if (!designerDraggingId || designerDraggingId === targetId) {
      return;
    }
    setDesignerWidgets((prev) => {
      const next = [...prev];
      const fromIndex = next.findIndex((w) => w.id === designerDraggingId);
      const toIndex = next.findIndex((w) => w.id === targetId);
      if (fromIndex === -1 || toIndex === -1) {
        return prev;
      }
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setDesignerDraggingId(null);
  };

  const selectedDesignerWidget =
    designerWidgets.find((w) => w.id === selectedDesignerWidgetId) || null;

  const handleUpdateSelectedDesignerWidget = (
    patch: Partial<DesignerWidget>,
    options?: { autoUpdateSummary?: boolean },
  ) => {
    if (!selectedDesignerWidgetId || !isEditingDashboard) return;
    setDesignerWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== selectedDesignerWidgetId) return w;
        const next: DesignerWidget = { ...w, ...patch };
        if (options?.autoUpdateSummary) {
          const autoSummary = buildAutoDataSummary(next);
          if (autoSummary) {
            next.dataSummary = autoSummary;
          }
        }
        return next;
      }),
    );
  };

  const handleDeleteDesignerWidget = (id: string) => {
    if (!isEditingDashboard) return;
    const targetWidget = designerWidgets.find((widget) => widget.id === id);
    if (!targetWidget) return;
    Modal.confirm({
      title: `确认删除组件「${targetWidget.title}」？`,
      content: "删除后该组件将从当前仪表盘设计稿中移除。",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: () => {
        setDesignerWidgets((prev) => {
          const next = prev.filter((w) => w.id !== id);
          if (selectedDesignerWidgetId === id) {
            setSelectedDesignerWidgetId(next[0]?.id ?? null);
          }
          return next;
        });
        message.success(`已删除组件：${targetWidget.title}`);
      },
    });
  };

  // 同步编辑中的 designerWidgets 到当前仪表盘配置
  useEffect(() => {
    if (!isEditingDashboard) return;
    setDashboards((prev) =>
      prev.map((d) =>
        d.id === activeDashboardId
          ? {
              ...d,
              designerWidgets:
                designerWidgets && designerWidgets.length > 0
                  ? designerWidgets
                  : undefined,
            }
          : d,
      ),
    );
  }, [designerWidgets, isEditingDashboard, activeDashboardId, setDashboards]);

  function handleDesignerResizeMouseMove(e: MouseEvent) {
    const info = designerResizeInfoRef.current;
    if (!info) return;

    const deltaX = e.clientX - info.startX;
    const deltaY = e.clientY - info.startY;

    const deltaPercent = (deltaX / info.containerWidth) * 100;
    let newWidthPercent = info.startWidthPercent + deltaPercent;

    // 方案1：水平方向只吸附到典型宽度档位（25%、33%、50%、66%、100%）
    const allowedPercents = [25, 33, 50, 66, 100];
    // 先限制在 25%~100% 范围内，避免越界
    newWidthPercent = Math.max(25, Math.min(100, newWidthPercent));
    // 找到距离最近的一个档位
    let snappedWidthPercent = newWidthPercent;
    let minDiff = Number.POSITIVE_INFINITY;
    for (const p of allowedPercents) {
      const diff = Math.abs(newWidthPercent - p);
      if (diff < minDiff) {
        minDiff = diff;
        snappedWidthPercent = p;
      }
    }
    newWidthPercent = snappedWidthPercent;

    let newHeight = info.startHeight + deltaY;
    // 按垂直方向网格对齐
    const heightGrid = 20;
    const snappedHeight =
      Math.round(newHeight / heightGrid) * heightGrid;
    newHeight = Math.max(160, Math.min(480, snappedHeight));

    setDesignerWidgets((prev) =>
      prev.map((w) =>
        w.id === info.widgetId
          ? {
              ...w,
              widthPercent: newWidthPercent,
              height: newHeight,
            }
          : w,
      ),
    );
  }

  function handleDesignerResizeMouseUp() {
    designerResizeInfoRef.current = null;
    window.removeEventListener("mousemove", handleDesignerResizeMouseMove);
    window.removeEventListener("mouseup", handleDesignerResizeMouseUp);
  }

  const handleDesignerResizeMouseDown = (e: any, widgetId: string) => {
    if (!isEditingDashboard) return;
    e.stopPropagation();
    const container = designerCanvasRef.current;
    if (!container) return;
    const widget = designerWidgets.find((w) => w.id === widgetId);
    if (!widget) return;

    designerResizeInfoRef.current = {
      widgetId,
      startX: e.clientX,
      startY: e.clientY,
      startWidthPercent: widget.widthPercent || 100,
      startHeight: widget.height || 220,
      containerWidth: container.clientWidth,
    };

    window.addEventListener("mousemove", handleDesignerResizeMouseMove);
    window.addEventListener("mouseup", handleDesignerResizeMouseUp);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      {/* 仪表盘选择与管理 */}
      <div
        style={{
          marginTop: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Select
            style={{ minWidth: 220 }}
            value={activeDashboardId}
            onChange={(value) => setActiveDashboardId(value)}
            options={dashboards.map((d) => ({
              value: d.id,
              label: d.isDefault ? `${d.name}（默认）` : d.name,
            }))}
            placeholder="请选择仪表盘"
          />
          <Button
            type="primary"
            onClick={() => {
              void handleCreateDashboard();
            }}
          >
            + 新建仪表盘
          </Button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <span style={{ fontSize: 12, color: "#8c8c8c" }}>
          当前数据范围：{SCOPE_LABEL_MAP[activeScope]}
          </span>
          {activeDashboard && (
            <>
              <Button onClick={() => setIsPreviewingDashboard(true)}>
                预览大屏
              </Button>
              <Button
                onClick={() => {
                  const targetId = "bigscreen_3d";
                  const exists = dashboards.some((d) => d.id === targetId);
                  if (!exists) {
                    // 若用户曾删除该仪表盘，则临时追加一个 3D 大屏示例
                    setDashboards((prev) => [
                      ...prev,
                      {
                        id: targetId,
                        name: "3D 酷炫大屏示例",
                        widgets: ["funnel", "trend", "industry", "gantt"],
                        dataScope: "all",
                        metrics: {
                          totalOpportunities: "30",
                          monthlySigned: "680万",
                          avgCycle: "39天",
                          conversionRate: "48%",
                        },
                        designerWidgets: DEFAULT_3D_WIDGETS,
                      },
                    ]);
                  }
                  setActiveDashboardId(targetId);
                  setPreviewTheme("tech");
                  setIsPreviewingDashboard(true);
                }}
              >
                打开 3D 酷炫大屏
              </Button>
              <Button
                onClick={() => {
                  const targetId = "bigscreen_3d_global";
                  const exists = dashboards.some((d) => d.id === targetId);
                  if (!exists) {
                    const globalConfig = DEFAULT_DASHBOARDS.find(
                      (d) => d.id === targetId,
                    );
                    if (globalConfig) {
                      setDashboards((prev) => [...prev, globalConfig]);
                    }
                  }
                  setActiveDashboardId(targetId);
                  setPreviewTheme("tech");
                  setIsPreviewingDashboard(true);
                }}
              >
                打开 3D 客户大屏
              </Button>
            </>
          )}
          <Button
            onClick={handleSetDefaultDashboard}
            disabled={
              activeDashboard?.isDefault ||
              activeDashboard?.id !== ANALYTICS_PRIMARY_DASHBOARD_ID
            }
          >
            设为默认仪表盘
          </Button>
          {activeDashboard && (
            <>
              <Button onClick={handleDuplicateDashboard}>
                复制当前仪表盘
              </Button>
              <Button
                danger
                disabled={
                  !canDeleteAnalyticsAssets ||
                  activeDashboard.id === ANALYTICS_PRIMARY_DASHBOARD_ID ||
                  !!activeDashboard.isDefault
                }
                onClick={handleDeleteDashboard}
              >
                删除当前仪表盘
              </Button>
            </>
          )}
          {activeDashboard && !isEditingDashboard && (
            <Button
              onClick={() => {
                const current = dashboards.find(
                  (d) => d.id === activeDashboardId,
                );
                if (!current) return;
                setDesignerWidgets(current.designerWidgets || []);
                setSelectedDesignerWidgetId(
                  (current.designerWidgets &&
                    current.designerWidgets[0]?.id) || null,
                );
                setIsEditingDashboard(true);
              }}
            >
              编辑当前仪表盘
            </Button>
          )}
          {activeDashboard && isEditingDashboard && (
            <Button
              type="primary"
              onClick={() => {
                setIsEditingDashboard(false);
                setDesignerDraggingType(null);
                setDesignerDraggingId(null);
              }}
            >
              完成编辑
            </Button>
          )}
        </div>
      </div>

      {/* 当前仪表盘名称内联编辑 */}
      <div
        style={{
          marginTop: 4,
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 12, color: "#8c8c8c" }}>
          当前仪表盘名称：
        </span>
        <Input
          size="small"
          style={{ width: 260 }}
          value={activeDashboard?.name || ""}
          onChange={(e) => {
            if (!isEditingDashboard) return;
            const newName = e.target.value;
            setDashboards((prev) =>
              prev.map((d) =>
                d.id === activeDashboardId ? { ...d, name: newName } : d,
              ),
            );
          }}
          disabled={!isEditingDashboard}
          placeholder="请输入仪表盘名称"
        />
      </div>

      {/* 顶部统计卡片：仅在未使用自定义布局且不处于编辑模式时展示 */}
      {!isEditingDashboard && activeDesignerWidgets.length === 0 && (
        <Row gutter={[14, 14]}>
          <Col xs={24} sm={12} md={6}>
            <Card
              size="small"
              style={compactStatCardStyle}
              bodyStyle={{ padding: "14px 16px" }}
            >
              <div style={{ fontSize: 24, marginBottom: 6, color: "#1890ff" }}>
                💡
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {activeMetrics.totalOpportunities}
              </div>
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>商机总数</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card
              size="small"
              style={compactStatCardStyle}
              bodyStyle={{ padding: "14px 16px" }}
            >
              <div style={{ fontSize: 24, marginBottom: 6, color: "#52c41a" }}>
                💰
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {activeMetrics.monthlySigned}
              </div>
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>本月签约</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card
              size="small"
              style={compactStatCardStyle}
              bodyStyle={{ padding: "14px 16px" }}
            >
              <div style={{ fontSize: 24, marginBottom: 6, color: "#722ed1" }}>
                📊
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {activeMetrics.avgCycle}
              </div>
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>平均成交周期</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card
              size="small"
              style={compactStatCardStyle}
              bodyStyle={{ padding: "14px 16px" }}
            >
              <div style={{ fontSize: 24, marginBottom: 6, color: "#fa8c16" }}>
                %
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {activeMetrics.conversionRate}
              </div>
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>商机转化率</div>
            </Card>
          </Col>
        </Row>
      )}

      {/* 主仪表盘内容：如有自定义布局则优先使用设计器布局，否则展示默认漏斗/趋势/行业/甘特 */}
      {activeDesignerWidgets.length > 0 ? (
        <Card title="自定义仪表盘布局">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            {activeDesignerWidgets.map((w) => (
              <div
                key={w.id}
                style={{
                  // 同样在最终布局中用 calc 处理 gap，保证两个 1/2 宽组件可以并排
                  flex: `0 0 calc(${w.widthPercent || 100}% - 12px)`,
                  boxSizing: "border-box",
                }}
              >
                <Card
                  size="small"
                  title={w.title || DESIGNER_CHART_LABELS[w.type]}
                  style={{ height: "100%" }}
                >
                  <EChartsPreview
                    option={getDesignerChartOption(w)}
                    enable3D={
                      w.type === "cube3d" ||
                      w.type === "flow_map" ||
                      w.type === "geo3d" ||
                      w.type === "globe3d"
                    }
                    height={w.height || 220}
                  />
                  {w.dataSummary && (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        color: "#8c8c8c",
                      }}
                    >
                      {w.dataSummary}
                    </div>
                  )}
                </Card>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <>
          {/* 销售漏斗 + 业绩趋势 */}
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

          {/* 行业分布 + 项目进度甘特图 */}
          <Row gutter={16}>
            {activeWidgets.includes("industry") && (
              <Col xs={24} md={12}>
                <Card title="行业分布">
                  {renderIndustryPanel()}
                </Card>
              </Col>
            )}
            {activeWidgets.includes("gantt") && (
              <Col xs={24} md={12}>
                <Card title="项目进度甘特图">
                  {renderGanttPanel()}
                </Card>
              </Col>
            )}
          </Row>
        </>
      )}

      {/* 自定义仪表盘设计器（所见即所得），仅在新建 / 编辑仪表盘时展示 */}
      {isEditingDashboard && (
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
              onChange={(value) =>
                setQuickAddType(value as DesignerChartType)
              }
              options={(
                Object.keys(DESIGNER_CHART_LABELS) as DesignerChartType[]
              ).map((type) => ({
                label: DESIGNER_CHART_LABELS[type],
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
          {/* 中间：布局编辑区（所见即所得） */}
          <div
            ref={designerCanvasRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDesignerCanvasDrop}
            style={{
              minHeight: 260,
              border: "1px dashed #d9d9d9",
              borderRadius: 8,
              padding: 12,
              // 网格背景：20px 间距的浅色网格，方便对齐组件
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
              designerWidgets.map((w) => (
                <div
                  key={w.id}
                  draggable
                  onDragStart={() => {
                    setDesignerDraggingId(w.id);
                    setDesignerDraggingType(null);
                  }}
                  onDragEnd={() => {
                    setDesignerDraggingId(null);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDesignerWidgetDropOnWidget(w.id)}
                  onClick={() => setSelectedDesignerWidgetId(w.id)}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border:
                      selectedDesignerWidgetId === w.id
                        ? "1px solid #1890ff"
                        : "1px solid #d9d9d9",
                    background: "var(--app-surface)",
                    cursor: "move",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    // 使用 calc 把 gap 考虑进去，避免两个 1/2 宽组件因为间距导致换行
                    flex: `0 0 calc(${w.widthPercent || 100}% - 8px)`,
                    boxSizing: "border-box",
                    position: "relative",
                    minHeight: (w.height || 220) + 40,
                  }}
                >
                  {/* 尺寸标记：宽度百分比 + 高度像素，方便精确布局 */}
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
                    {`${Math.round(w.widthPercent)}% · ${
                      Math.round(w.height)
                    }px`}
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
                      <span>{w.title}</span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "#8c8c8c",
                        }}
                      >
                        {DESIGNER_CHART_LABELS[w.type]}
                      </span>
                    </div>
                    <Button
                      type="link"
                      size="small"
                      danger
                      disabled={!canDeleteAnalyticsAssets}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDesignerWidget(w.id);
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
                    {w.dataSummary}
                  </div>
                  {/* 右下角拖拽改变大小的句柄，仅在编辑模式下可见 */}
                  <div
                    onMouseDown={(e) =>
                      handleDesignerResizeMouseDown(e, w.id)
                    }
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

          {/* 右侧：选中组件配置 */}
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
                  当前选中：{DESIGNER_CHART_LABELS[selectedDesignerWidget.type]}
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
                    value={
                      selectedDesignerWidget.dataSourceConfig?.type ?? "mock"
                    }
                    onChange={(value) =>
                      handleUpdateSelectedDesignerWidget(
                        {
                          dataSourceConfig: {
                            ...(selectedDesignerWidget.dataSourceConfig || {
                              timeRange: "this_month" as DataSourceTimeRange,
                              metric: "count" as DataSourceMetric,
                              groupBy: "none" as DataSourceGroupBy,
                              ownerScope: "all" as DataSourceOwnerScope,
                            }),
                            type: value as DataSourceType,
                          },
                        },
                        { autoUpdateSummary: true },
                      )
                    }
                    options={(
                      Object.keys(
                        DATA_SOURCE_TYPE_LABELS,
                      ) as DataSourceType[]
                    ).map((t) => ({
                      label: DATA_SOURCE_TYPE_LABELS[t],
                      value: t,
                    }))}
                  />
                  <Select
                    size="small"
                    value={
                      selectedDesignerWidget.dataSourceConfig?.timeRange ??
                      "this_month"
                    }
                    onChange={(value) =>
                      handleUpdateSelectedDesignerWidget(
                        {
                          dataSourceConfig: {
                            ...(selectedDesignerWidget.dataSourceConfig || {
                              type: "mock" as DataSourceType,
                              metric: "count" as DataSourceMetric,
                              groupBy: "none" as DataSourceGroupBy,
                              ownerScope: "all" as DataSourceOwnerScope,
                            }),
                            timeRange: value as DataSourceTimeRange,
                          },
                        },
                        { autoUpdateSummary: true },
                      )
                    }
                    options={(
                      Object.keys(
                        DATA_SOURCE_TIME_RANGE_LABELS,
                      ) as DataSourceTimeRange[]
                    ).map((k) => ({
                      label: DATA_SOURCE_TIME_RANGE_LABELS[k],
                      value: k,
                    }))}
                  />
                  <Select
                    size="small"
                    value={
                      selectedDesignerWidget.dataSourceConfig?.metric ??
                      "count"
                    }
                    onChange={(value) =>
                      handleUpdateSelectedDesignerWidget(
                        {
                          dataSourceConfig: {
                            ...(selectedDesignerWidget.dataSourceConfig || {
                              type: "mock" as DataSourceType,
                              timeRange:
                                "this_month" as DataSourceTimeRange,
                              groupBy: "none" as DataSourceGroupBy,
                              ownerScope:
                                "all" as DataSourceOwnerScope,
                            }),
                            metric: value as DataSourceMetric,
                          },
                        },
                        { autoUpdateSummary: true },
                      )
                    }
                    options={(
                      Object.keys(
                        DATA_SOURCE_METRIC_LABELS,
                      ) as DataSourceMetric[]
                    ).map((k) => ({
                      label: DATA_SOURCE_METRIC_LABELS[k],
                      value: k,
                    }))}
                  />
                  <Select
                    size="small"
                    value={
                      selectedDesignerWidget.dataSourceConfig?.groupBy ??
                      "none"
                    }
                    onChange={(value) =>
                      handleUpdateSelectedDesignerWidget(
                        {
                          dataSourceConfig: {
                            ...(selectedDesignerWidget.dataSourceConfig || {
                              type: "mock" as DataSourceType,
                              timeRange:
                                "this_month" as DataSourceTimeRange,
                              metric: "count" as DataSourceMetric,
                              ownerScope:
                                "all" as DataSourceOwnerScope,
                            }),
                            groupBy: value as DataSourceGroupBy,
                          },
                        },
                        { autoUpdateSummary: true },
                      )
                    }
                    options={(
                      Object.keys(
                        DATA_SOURCE_GROUP_BY_LABELS,
                      ) as DataSourceGroupBy[]
                    ).map((k) => ({
                      label: DATA_SOURCE_GROUP_BY_LABELS[k],
                      value: k,
                    }))}
                  />
                  <Select
                    size="small"
                    value={
                      selectedDesignerWidget.dataSourceConfig?.ownerScope ??
                      "all"
                    }
                    onChange={(value) =>
                      handleUpdateSelectedDesignerWidget(
                        {
                          dataSourceConfig: {
                            ...(selectedDesignerWidget.dataSourceConfig || {
                              type: "mock" as DataSourceType,
                              timeRange:
                                "this_month" as DataSourceTimeRange,
                              metric: "count" as DataSourceMetric,
                              groupBy:
                                "none" as DataSourceGroupBy,
                            }),
                            ownerScope: value as DataSourceOwnerScope,
                          },
                        },
                        { autoUpdateSummary: true },
                      )
                    }
                    options={(
                      Object.keys(
                        DATA_SOURCE_OWNER_SCOPE_LABELS,
                      ) as DataSourceOwnerScope[]
                    ).map((k) => ({
                      label: DATA_SOURCE_OWNER_SCOPE_LABELS[k],
                      value: k,
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
                    value={
                      selectedDesignerWidget.transformConfig
                        ?.aggregation ?? "auto"
                    }
                    onChange={(value) =>
                      handleUpdateSelectedDesignerWidget(
                        {
                          transformConfig: {
                            ...(selectedDesignerWidget.transformConfig || {
                              sort: "none" as TransformSort,
                              topN: undefined,
                            }),
                            aggregation:
                              value as TransformAggregation,
                          },
                        },
                        { autoUpdateSummary: true },
                      )
                    }
                    options={(
                      Object.keys(
                        TRANSFORM_AGGREGATION_LABELS,
                      ) as TransformAggregation[]
                    ).map((k) => ({
                      label: TRANSFORM_AGGREGATION_LABELS[k],
                      value: k,
                    }))}
                  />
                  <Select
                    size="small"
                    value={
                      selectedDesignerWidget.transformConfig?.sort ??
                      "none"
                    }
                    onChange={(value) =>
                      handleUpdateSelectedDesignerWidget(
                        {
                          transformConfig: {
                            ...(selectedDesignerWidget.transformConfig || {
                              aggregation:
                                "auto" as TransformAggregation,
                              topN: undefined,
                            }),
                            sort: value as TransformSort,
                          },
                        },
                        { autoUpdateSummary: true },
                      )
                    }
                    options={(
                      Object.keys(
                        TRANSFORM_SORT_LABELS,
                      ) as TransformSort[]
                    ).map((k) => ({
                      label: TRANSFORM_SORT_LABELS[k],
                      value: k,
                    }))}
                  />
                  <Input
                    size="small"
                    type="number"
                    min={1}
                    placeholder="Top N（可选，例如：5）"
                    value={
                      selectedDesignerWidget.transformConfig?.topN ??
                      undefined
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      const parsed = Number(raw);
                      handleUpdateSelectedDesignerWidget(
                        {
                          transformConfig: {
                            ...(selectedDesignerWidget.transformConfig || {
                              aggregation:
                                "auto" as TransformAggregation,
                              sort: "none" as TransformSort,
                            }),
                            topN: Number.isNaN(parsed)
                              ? undefined
                              : parsed,
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
                  当前尺寸：宽{" "}
                  {Math.round(selectedDesignerWidget.widthPercent || 100)}% ，高{" "}
                  {Math.round(selectedDesignerWidget.height || 220)} px
                  （在画布中拖拽右下角调整）
                </div>
                {/* 尺寸完全通过画布拖拽调整，这里不再提供宽度/高度下拉，保持所见即所得体验 */}
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
                    option={getDesignerChartOption(selectedDesignerWidget)}
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
      )}

      {/* 全屏大屏预览 */}
      {isPreviewingDashboard && (
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
                onChange={(value) =>
                  setPreviewTheme(value as "dark" | "light" | "tech")
                }
                options={[
                  { label: "深色", value: "dark" },
                  { label: "浅色", value: "light" },
                  { label: "科技蓝", value: "tech" },
                ]}
              />
              <Button
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEnterPreviewFullscreen();
                }}
                disabled={isPreviewFullscreen}
              >
                {isPreviewFullscreen ? "已全屏" : "全屏显示"}
              </Button>
              <Button
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClosePreview();
                }}
              >
                退出预览
              </Button>
            </div>
          </div>
          <div
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
                  {activeDesignerWidgets.map((w) => (
                    <div
                      key={w.id}
                      style={{
                        flex: `0 0 calc(${w.widthPercent || 100}% - 12px)`,
                        boxSizing: "border-box",
                      }}
                    >
                      <Card
                        size="small"
                        title={w.title || DESIGNER_CHART_LABELS[w.type]}
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
                          option={getDesignerChartOption(w)}
                          enable3D={
                            w.type === "cube3d" ||
                            w.type === "flow_map" ||
                            w.type === "geo3d"
                          }
                          height={w.height || 220}
                        />
                        {w.dataSummary && (
                          <div
                            style={{
                              marginTop: 8,
                              fontSize: 12,
                              color: currentPreviewTheme.summaryTextColor,
                            }}
                          >
                            {w.dataSummary}
                          </div>
                        )}
                      </Card>
                    </div>
                  ))}
                </div>
              ) : (
                // 若没有自定义布局，则在预览中展示默认仪表盘内容
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
                            <div
                              style={{
                                fontSize: 32,
                                marginBottom: 8,
                                color: "#1890ff",
                              }}
                            >
                              💡
                            </div>
                            <div
                              style={{ fontSize: 22, fontWeight: 600 }}
                            >
                              {activeMetrics.totalOpportunities}
                            </div>
                            <div
                              style={{ fontSize: 14, color: "#8c8c8c" }}
                            >
                              商机总数
                            </div>
                          </Card>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                          <Card>
                            <div
                              style={{
                                fontSize: 32,
                                marginBottom: 8,
                                color: "#52c41a",
                              }}
                            >
                              💰
                            </div>
                            <div
                              style={{ fontSize: 22, fontWeight: 600 }}
                            >
                              {activeMetrics.monthlySigned}
                            </div>
                            <div
                              style={{ fontSize: 14, color: "#8c8c8c" }}
                            >
                              本月签约
                            </div>
                          </Card>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                          <Card>
                            <div
                              style={{
                                fontSize: 32,
                                marginBottom: 8,
                                color: "#722ed1",
                              }}
                            >
                              📊
                            </div>
                            <div
                              style={{ fontSize: 22, fontWeight: 600 }}
                            >
                              {activeMetrics.avgCycle}
                            </div>
                            <div
                              style={{ fontSize: 14, color: "#8c8c8c" }}
                            >
                              平均成交周期
                            </div>
                          </Card>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                          <Card>
                            <div
                              style={{
                                fontSize: 32,
                                marginBottom: 8,
                                color: "#fa8c16",
                              }}
                            >
                              %
                            </div>
                            <div
                              style={{ fontSize: 22, fontWeight: 600 }}
                            >
                              {activeMetrics.conversionRate}
                            </div>
                            <div
                              style={{ fontSize: 14, color: "#8c8c8c" }}
                            >
                              商机转化率
                            </div>
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
                        <Card title="行业分布">
                          {renderIndustryPanel()}
                        </Card>
                      </Col>
                    )}
                    {activeWidgets.includes("gantt") && (
                      <Col xs={24} md={12}>
                        <Card title="项目进度甘特图">
                          {renderGanttPanel()}
                        </Card>
                      </Col>
                    )}
                  </Row>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
