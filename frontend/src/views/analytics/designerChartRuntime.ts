import type { EChartsModuleKey } from "../../components/EChartsPreview";

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

export interface DesignerChartRuntimeWidget {
  type: string;
  title?: string;
  dataSourceConfig?: DataSourceConfigLike;
  transformConfig?: TransformConfigLike;
}

export const DATA_SOURCE_TYPE_LABELS: Record<string, string> = {
  mock: "仅前端示例数据（Mock）",
  opportunity: "商机（Opportunity）",
  solution: "方案版本（SolutionVersion）",
  bid: "投标记录（Bid）",
  contract: "合同（Contract）",
  custom: "自定义数据源（后端 SQL / API）",
};

export const DATA_SOURCE_TIME_RANGE_LABELS: Record<string, string> = {
  all: "全部时间",
  this_month: "本月",
  this_quarter: "本季度",
  this_year: "本年度",
  last_12_months: "最近 12 个月",
};

export const DATA_SOURCE_METRIC_LABELS: Record<string, string> = {
  count: "数量（条数）",
  sum_expected_value: "商机预估金额合计",
  sum_contract_amount: "合同金额合计",
  avg_cycle: "平均成交周期",
  conversion_rate: "转化率",
};

export const DATA_SOURCE_GROUP_BY_LABELS: Record<string, string> = {
  none: "不分组（整体汇总）",
  stage: "按阶段分组",
  owner: "按负责人分组",
  industry: "按行业分组",
  month: "按月份分组",
};

export const DATA_SOURCE_OWNER_SCOPE_LABELS: Record<string, string> = {
  all: "全部负责人",
  current_user: "仅当前登录人",
  team: "当前团队",
};

export const TRANSFORM_AGGREGATION_LABELS: Record<string, string> = {
  auto: "自动（按图表类型）",
  sum: "求和",
  avg: "平均值",
  max: "最大值",
  min: "最小值",
  count: "计数",
};

export const TRANSFORM_SORT_LABELS: Record<string, string> = {
  none: "不排序",
  asc: "升序",
  desc: "降序",
};

const HQ_COORD_3D: [number, number] = [121.47, 31.23];

const MOCK_CUSTOMERS_3D: {
  name: string;
  coord: [number, number];
  value: number;
}[] = [
  { name: "北京金融客户A", coord: [116.4, 39.9], value: 120 },
  { name: "广州制造客户B", coord: [113.26, 23.13], value: 95 },
  { name: "深圳互联网客户C", coord: [114.06, 22.54], value: 110 },
  { name: "成都政务客户D", coord: [104.06, 30.67], value: 80 },
];

const HQ_GLOBAL_COORD: [number, number] = [116.4, 39.9];

const MOCK_GLOBAL_CUSTOMERS_3D: {
  name: string;
  coord: [number, number];
  value: number;
}[] = [
  { name: "纽约金融客户", coord: [-74.006, 40.7128], value: 130 },
  { name: "伦敦金融客户", coord: [-0.1276, 51.5074], value: 125 },
  { name: "新加坡科技客户", coord: [103.8198, 1.3521], value: 115 },
  { name: "悉尼公共事业客户", coord: [151.2093, -33.8688], value: 90 },
];

export function buildAutoDataSummary(
  widget: DesignerChartRuntimeWidget,
): string | null {
  const ds = widget.dataSourceConfig;
  const tf = widget.transformConfig;
  if (!ds && !tf) {
    return null;
  }

  const parts: string[] = [];

  if (ds) {
    parts.push(
      `数据来源：${DATA_SOURCE_TYPE_LABELS[ds.type || ""] || ds.type || "-"}；时间范围：${
        DATA_SOURCE_TIME_RANGE_LABELS[ds.timeRange || ""] || ds.timeRange || "-"
      }；指标：${DATA_SOURCE_METRIC_LABELS[ds.metric || ""] || ds.metric || "-"}；分组：${
        DATA_SOURCE_GROUP_BY_LABELS[ds.groupBy || ""] || ds.groupBy || "-"
      }；负责人范围：${
        DATA_SOURCE_OWNER_SCOPE_LABELS[ds.ownerScope || ""] || ds.ownerScope || "-"
      }。`,
    );
  }

  if (tf) {
    parts.push(
      `加工方式：聚合=${
        TRANSFORM_AGGREGATION_LABELS[tf.aggregation || ""] || tf.aggregation || "-"
      }，排序=${TRANSFORM_SORT_LABELS[tf.sort || ""] || tf.sort || "-"}${
        tf.topN && tf.topN > 0 ? `，只保留 Top ${tf.topN}` : ""
      }。`,
    );
  }

  return parts.join("");
}

function getDesignerChartBaseOption(type: string): any {
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
          textStyle: { fontSize: 18 },
          subtext: "¥ 3,200,000",
          subtextStyle: { fontSize: 22, fontWeight: "bold" },
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
            itemStyle: { borderRadius: 6, color: "#f0f0f0" },
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
        xAxis: { type: "category", data: ["1月", "2月", "3月", "4月", "5月", "6月"] },
        yAxis: { type: "value" },
        series: [{ data: [150, 230, 224, 218, 135, 147], type: "line", smooth: true }],
      };
    case "area":
      return {
        xAxis: {
          type: "category",
          data: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
        },
        yAxis: { type: "value" },
        series: [{ data: [140, 232, 101, 264, 90, 340, 250], type: "line", areaStyle: {} }],
      };
    case "step_line":
      return {
        xAxis: { type: "category", data: ["阶段1", "阶段2", "阶段3", "阶段4", "阶段5"] },
        yAxis: { type: "value" },
        series: [{ data: [20, 40, 40, 60, 80], type: "line", step: "middle" }],
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
        xAxis: { type: "category", data: ["金融", "制造", "电商", "园区"] },
        yAxis: { type: "value" },
        series: [{ data: [120, 200, 150, 80], type: "bar" }],
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
      return {
        series: [
          {
            type: "sankey",
            emphasis: { focus: "adjacency" },
            data: [{ name: "线索" }, { name: "商机" }, { name: "方案" }, { name: "投标" }, { name: "签约" }],
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
      return {
        tooltip: {},
        xAxis3D: { type: "category", data: ["金融", "制造", "电商", "园区"] },
        yAxis3D: { type: "category", data: ["Q1", "Q2", "Q3", "Q4"] },
        zAxis3D: { type: "value" },
        grid3D: { boxWidth: 120, boxDepth: 80, viewControl: { projection: "perspective" } },
        series: [
          {
            type: "bar3D",
            data: [
              [0, 0, 5], [0, 1, 8], [0, 2, 12], [0, 3, 6],
              [1, 0, 7], [1, 1, 6], [1, 2, 9], [1, 3, 4],
              [2, 0, 6], [2, 1, 9], [2, 2, 7], [2, 3, 5],
              [3, 0, 4], [3, 1, 6], [3, 2, 5], [3, 3, 3],
            ],
            shading: "lambert",
          },
        ],
      };
    case "china_map":
      return {
        tooltip: { trigger: "item" },
        geo: {
          map: "china",
          roam: true,
          itemStyle: { areaColor: "#e6f4ff", borderColor: "#69b1ff" },
          emphasis: { itemStyle: { areaColor: "#91caff" } },
        },
        series: [
          {
            name: "客户热度",
            type: "effectScatter",
            coordinateSystem: "geo",
            rippleEffect: { brushType: "stroke" },
            symbolSize: (val: number[]) => Math.max(8, val[2] / 12),
            itemStyle: { color: "#1677ff" },
            data: MOCK_CUSTOMERS_3D.map((c) => ({ name: c.name, value: [...c.coord, c.value] })),
          },
        ],
      };
    case "geo3d":
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
          label: { show: false },
          light: { main: { intensity: 1.2, shadow: true } },
          viewControl: { distance: 120, alpha: 35, beta: 15 },
        },
        series: [
          {
            name: "客户连线",
            type: "lines3D",
            coordinateSystem: "geo3D",
            blendMode: "lighter",
            lineStyle: { width: 1.5, color: "#ffd666", opacity: 0.9 },
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
            itemStyle: { color: "#ffd666" },
            label: {
              show: true,
              formatter: "{b}",
              position: "right",
              textStyle: { color: "#fff", fontSize: 10 },
            },
            data: MOCK_CUSTOMERS_3D.map((c) => ({ name: c.name, value: [...c.coord, c.value] })),
          },
        ],
      };
    case "globe3d":
      return {
        globe: {
          baseTexture:
            "https://fastly.jsdelivr.net/npm/echarts-gl@2/dist/asset/world.topo.bathy.200401.jpg",
          shading: "lambert",
          light: { ambient: { intensity: 0.4 }, main: { intensity: 0.8 } },
          viewControl: { autoRotate: true, autoRotateSpeed: 8 },
        },
        series: [
          {
            type: "lines3D",
            coordinateSystem: "globe",
            blendMode: "lighter",
            effect: { show: true, trailWidth: 2, trailLength: 0.2, trailOpacity: 0.8 },
            lineStyle: { width: 1, color: "#40a9ff", opacity: 0.7 },
            data: MOCK_GLOBAL_CUSTOMERS_3D.map((c) => [HQ_GLOBAL_COORD, c.coord]),
          },
          {
            type: "scatter3D",
            coordinateSystem: "globe",
            symbolSize: 8,
            itemStyle: { color: "#ffd666" },
            label: {
              show: true,
              formatter: "{b}",
              position: "top",
              textStyle: { color: "#fff", fontSize: 10 },
            },
            data: MOCK_GLOBAL_CUSTOMERS_3D.map((c) => ({ name: c.name, value: [...c.coord, c.value] })),
          },
        ],
      };
    default:
      return {};
  }
}

export function getDesignerChartOption(
  widget: DesignerChartRuntimeWidget,
  designerChartLabels: Record<string, string>,
): any {
  const base = getDesignerChartBaseOption(widget.type) || {};
  const option: any = { ...base };
  const titleText = widget.title || designerChartLabels[widget.type] || widget.type;
  const autoSummary = buildAutoDataSummary(widget);

  if (titleText || autoSummary) {
    const existingTitle: any = option.title;
    option.title = existingTitle
      ? {
          ...existingTitle,
          text: titleText ?? existingTitle.text,
          subtext: autoSummary ?? existingTitle.subtext,
        }
      : {
          text: titleText,
          subtext: autoSummary || undefined,
          left: "center",
          top: "2%",
          textStyle: { fontSize: 16, fontWeight: "bold" },
          subtextStyle: { fontSize: 11, color: "#8c8c8c" },
        };
  }

  return option;
}

export function getDesignerChartModuleKeys(type: string): EChartsModuleKey[] {
  switch (type) {
    case "progress":
    case "column":
      return ["bar"];
    case "line":
    case "area":
    case "step_line":
    case "stacked_area":
      return ["line"];
    case "donut":
    case "pie":
      return ["pie"];
    case "bubble":
      return ["scatter"];
    case "flow_map":
      return ["sankey"];
    case "topology":
      return ["graph"];
    case "gauge":
      return ["gauge"];
    case "china_map":
      return ["geo", "effect-scatter"];
    case "geo3d":
    case "globe3d":
    case "cube3d":
      return ["bar"];
    default:
      return ["bar"];
  }
}
