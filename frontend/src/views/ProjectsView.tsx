import {
  Card,
  Row,
  Col,
  Typography,
  Input,
  Select,
  Button,
  Table,
  Tag,
  Modal,
  Form,
  Input as AntInput,
  Popover,
  Checkbox,
  Divider,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { MouseEvent as ReactMouseEvent, ThHTMLAttributes } from "react";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRightOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  StopFilled,
} from "@ant-design/icons";
import { getNextOpportunityCode } from "../shared/opportunityCode";
import {
  type DemoOpportunity,
  getSalesOwnerLabel,
  loadSharedDemoOpportunities,
  OPPORTUNITY_DEMO_UPDATED_EVENT,
  saveSharedDemoOpportunities,
} from "../shared/opportunityDemoData";
import { mergeByKey } from "../shared/pipelineMock";
import {
  buildProjectKey,
  getProjectKeyFromOpportunity,
  getProjectNameFromOpportunity,
  normalizeProjectName,
} from "../shared/projectNaming";
import {
  hasActionAccess,
  type CurrentUser,
} from "../shared/auth";
import { syncSharedOpportunitiesFromApi } from "../shared/realOpportunities";

const { Text, Paragraph } = Typography;

interface ProjectRow {
  key: string;
  projectKey: string;
  name: string;
  customer: string;
  status: "inprogress" | "completed" | "archived";
  // 阶段值与商机管理保持语义一致，当前以字符串编码表示
  stage: string;
  priority: "high" | "medium" | "low";
  budget: string;
  startDate: string;
  salesOwnerUsername?: string;
  salesOwner: string;
  industryOwner: string;
  preSalesOwnerUsername?: string;
  preSalesOwner: string;
  relatedOpportunities: number;
  solutionVersions: number;
  expectedCloseDate: string;
  winProbability: number;
}

interface RelatedOpportunityRow {
  key: string;
  opportunityCode?: string;
  name: string;
  customer: string;
  stage: string;
  amount: string;
  owner: string;
  probability: number;
  expectedCloseDate: string;
}

const PROJECT_STAGE_ORDER = [
  "discovery",
  "solution_design",
  "proposal",
  "bidding",
  "negotiation",
  "won",
] as const;

function renderStatus(status: ProjectRow["status"]) {
  if (status === "inprogress") {
    return <Tag color="blue">进行中</Tag>;
  }
  if (status === "completed") {
    return <Tag color="green">已完成</Tag>;
  }
  return <Tag>已归档</Tag>;
}

function renderPriority(priority: ProjectRow["priority"]) {
  if (priority === "high") {
    return <Tag color="red">高</Tag>;
  }
  if (priority === "medium") {
    return <Tag color="orange">中</Tag>;
  }
  return <Tag>低</Tag>;
}

const STAGE_LABELS: Record<string, string> = {
  discovery: "发现",
  solution_design: "方案设计",
  proposal: "提案",
  bidding: "投标",
  negotiation: "谈判",
  won: "中标",
  lost: "丢单",
};

const PROJECT_TABLE_STORAGE_KEY = "projectsTablePreference";

const PROJECT_TABLE_COLUMN_META = [
  { key: "index", title: "序号", defaultWidth: 72, minWidth: 72, visibleByDefault: true, locked: true, resizable: false },
  { key: "name", title: "项目名称", defaultWidth: 240, minWidth: 180, visibleByDefault: true, locked: true, resizable: true },
  { key: "customer", title: "客户", defaultWidth: 180, minWidth: 140, visibleByDefault: true, locked: false, resizable: true },
  { key: "status", title: "状态", defaultWidth: 120, minWidth: 100, visibleByDefault: true, locked: false, resizable: true },
  { key: "stage", title: "阶段", defaultWidth: 120, minWidth: 100, visibleByDefault: true, locked: false, resizable: true },
  { key: "salesOwner", title: "销售负责人", defaultWidth: 160, minWidth: 130, visibleByDefault: true, locked: false, resizable: true },
  { key: "preSalesOwner", title: "售前负责人", defaultWidth: 160, minWidth: 130, visibleByDefault: true, locked: false, resizable: true },
  { key: "priority", title: "优先级", defaultWidth: 120, minWidth: 100, visibleByDefault: false, locked: false, resizable: true },
  { key: "budget", title: "预算", defaultWidth: 140, minWidth: 120, visibleByDefault: true, locked: false, resizable: true },
  { key: "expectedCloseDate", title: "预计签约", defaultWidth: 140, minWidth: 120, visibleByDefault: true, locked: false, resizable: true },
  { key: "winProbability", title: "成交概率", defaultWidth: 120, minWidth: 100, visibleByDefault: true, locked: false, resizable: true },
  { key: "relatedOpportunities", title: "关联商机数", defaultWidth: 120, minWidth: 100, visibleByDefault: false, locked: false, resizable: true },
  { key: "solutionVersions", title: "方案版本数", defaultWidth: 120, minWidth: 100, visibleByDefault: false, locked: false, resizable: true },
  { key: "startDate", title: "开始时间", defaultWidth: 140, minWidth: 120, visibleByDefault: false, locked: false, resizable: true },
  { key: "action", title: "操作", defaultWidth: 180, minWidth: 180, visibleByDefault: true, locked: true, resizable: false },
] as const;

type ProjectColumnKey = (typeof PROJECT_TABLE_COLUMN_META)[number]["key"];

interface ProjectTablePreference {
  visibleColumnKeys: ProjectColumnKey[];
  columnWidths: Partial<Record<ProjectColumnKey, number>>;
}

interface ResizableHeaderCellProps
  extends ThHTMLAttributes<HTMLTableHeaderCellElement> {
  width?: number;
  minWidth?: number;
  resizable?: boolean;
  onResizeWidth?: (nextWidth: number) => void;
}

function getProjectEffectiveMinWidth(
  meta: (typeof PROJECT_TABLE_COLUMN_META)[number],
): number {
  if (meta.locked) {
    return meta.minWidth;
  }
  return Math.max(72, Math.min(meta.minWidth, Math.round(meta.defaultWidth * 0.6)));
}

function ResizableHeaderCell(props: ResizableHeaderCellProps) {
  const {
    width,
    minWidth = 80,
    resizable,
    onResizeWidth,
    style,
    children,
    ...restProps
  } = props;

  const mergedStyle = {
    ...style,
    width,
    minWidth: width,
    maxWidth: width,
    position: "relative" as const,
  };

  const handleMouseDown = (event: ReactMouseEvent<HTMLSpanElement>) => {
    if (!resizable || !onResizeWidth || !width) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.max(
        minWidth,
        startWidth + moveEvent.clientX - startX,
      );
      onResizeWidth(nextWidth);
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <th {...restProps} style={mergedStyle}>
      <div style={{ position: "relative", width: "100%" }}>
        {children}
        {resizable && (
          <span
            onMouseDown={handleMouseDown}
            style={{
              position: "absolute",
              top: -12,
              right: -8,
              width: 16,
              height: "calc(100% + 24px)",
              cursor: "col-resize",
              zIndex: 2,
            }}
          />
        )}
      </div>
    </th>
  );
}

const PROJECT_TIMELINE_STAGES = [
  {
    key: "discovery",
    title: "商机发现",
    description: "识别商机、确认客户需求与痛点，完成基本立项判断。",
    target: "opportunities" as const,
  },
  {
    key: "solution_design",
    title: "方案设计",
    description: "完成需求分析、调研沉淀与初版解决方案设计。",
    target: "solutions" as const,
  },
  {
    key: "proposal",
    title: "方案提案",
    description: "输出正式提案、报价与实施计划，并进行客户汇报。",
    target: "solutions" as const,
  },
  {
    key: "bidding",
    title: "投标阶段",
    description: "准备并提交投标文件，跟踪招投标关键事项。",
    target: "bids" as const,
  },
  {
    key: "negotiation",
    title: "商务谈判",
    description: "围绕范围、价格和合同条款推进商务谈判。",
    target: "bids" as const,
  },
  {
    key: "won",
    title: "签约中标",
    description: "完成中标确认与合同签署，进入合同管理阶段。",
    target: "contracts" as const,
  },
] as const;

function formatProjectBudget(value?: string): string {
  if (!value) return "¥0万";
  const cleaned = value.replace(/[¥,]/g, "");
  const numberValue = Number(cleaned);
  if (!Number.isFinite(numberValue)) {
    return value;
  }
  return `¥${Math.round(numberValue / 10000).toLocaleString("zh-CN")}万`;
}

function formatProjectBudgetFromNumber(value: number): string {
  return `¥${Math.round(Math.max(0, value) / 10000).toLocaleString("zh-CN")}万`;
}

function parseCurrencyAmount(value?: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[¥,]/g, "");
  const numberValue = Number(cleaned);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getProjectStatus(stage?: string): ProjectRow["status"] {
  if (stage === "won") {
    return "completed";
  }
  if (stage === "lost") {
    return "archived";
  }
  return "inprogress";
}

function getProjectPriority(probability?: number): ProjectRow["priority"] {
  const value = probability || 0;
  if (value >= 70) {
    return "high";
  }
  if (value >= 40) {
    return "medium";
  }
  return "low";
}

function deriveProjectsFromOpportunities(
  opportunities: DemoOpportunity[],
): ProjectRow[] {
  const projectGroups = new Map<string, DemoOpportunity[]>();
  opportunities.forEach((opportunity) => {
    const projectKey = getProjectKeyFromOpportunity(opportunity);
    const current = projectGroups.get(projectKey) || [];
    projectGroups.set(projectKey, [...current, opportunity]);
  });

  return Array.from(projectGroups.entries()).map(([projectKey, relatedItems]) => {
    const sortedByCreatedAt = [...relatedItems].sort((a, b) =>
      (a.createdAt || "").localeCompare(b.createdAt || ""),
    );
    const primary = sortedByCreatedAt[0];
    const projectName = getProjectNameFromOpportunity(primary);
    const activeStages = relatedItems
      .map((item) => item.stage || "discovery")
      .filter((stage) => stage !== "lost");
    const projectStage =
      activeStages.sort(
        (a, b) =>
          PROJECT_STAGE_ORDER.indexOf(a as (typeof PROJECT_STAGE_ORDER)[number]) -
          PROJECT_STAGE_ORDER.indexOf(b as (typeof PROJECT_STAGE_ORDER)[number]),
      )[activeStages.length - 1] ||
      (relatedItems.some((item) => item.stage === "lost") ? "lost" : "discovery");
    const budget = relatedItems.reduce(
      (sum, item) => sum + parseCurrencyAmount(item.expectedValue),
      0,
    );
    const probabilities = relatedItems
      .map((item) => item.probability || 0)
      .filter((item) => item > 0);
    const averageProbability =
      probabilities.length > 0
        ? Math.round(
            probabilities.reduce((sum, item) => sum + item, 0) / probabilities.length,
          )
        : 0;
    const salesOwners = Array.from(
      new Set(
        relatedItems
          .map((item) => getSalesOwnerLabel(item.ownerUsername))
          .filter((item) => item && item !== "-"),
      ),
    );
    const preSalesOwners = Array.from(
      new Set(
        relatedItems
          .map((item) =>
            getSalesOwnerLabel(item.solutionOwnerUsername || item.ownerUsername),
          )
          .filter((item) => item && item !== "-"),
      ),
    );
    const closeDates = relatedItems
      .map((item) => item.expectedCloseDate)
      .filter((item): item is string => Boolean(item))
      .sort((a, b) => a.localeCompare(b));
    const startDates = relatedItems
      .map((item) => item.createdAt?.slice(0, 10))
      .filter((item): item is string => Boolean(item))
      .sort((a, b) => a.localeCompare(b));

    return {
      key: projectKey,
      projectKey,
      name: projectName,
      customer: primary.customerName || "-",
      status: getProjectStatus(projectStage),
      stage: projectStage,
      priority: getProjectPriority(averageProbability),
      budget: formatProjectBudgetFromNumber(budget),
      startDate:
        startDates[0] || new Date().toISOString().slice(0, 10),
      salesOwner: salesOwners.join(" / ") || "-",
      salesOwnerUsername: primary.ownerUsername,
      industryOwner: salesOwners[0] || "-",
      preSalesOwnerUsername:
        primary.solutionOwnerUsername || primary.ownerUsername,
      preSalesOwner: preSalesOwners.join(" / ") || "-",
      relatedOpportunities: relatedItems.length,
      solutionVersions: relatedItems.length,
      expectedCloseDate: closeDates[closeDates.length - 1] || "",
      winProbability: projectStage === "won" ? 100 : averageProbability,
    };
  });
}

interface ProjectsViewProps {
  currentUser?: CurrentUser | null;
  onNavigateToOpportunities?: (
    customerName?: string,
    projectStage?: string,
  ) => void;
  onNavigateToSolutions?: (projectName?: string) => void;
  onNavigateToBids?: (projectName?: string) => void;
  onNavigateToContracts?: (projectName?: string) => void;
  initialKeyword?: string | null;
}

type StageNavigationState = "completed" | "current" | "future";

function getProjectStageText(stage?: string): string {
  return STAGE_LABELS[stage || ""] || stage || "-";
}

function getDefaultProjectTablePreference(): ProjectTablePreference {
  const visibleColumnKeys = PROJECT_TABLE_COLUMN_META.map((item) => item.key);
  const columnWidths = PROJECT_TABLE_COLUMN_META.reduce<
    Partial<Record<ProjectColumnKey, number>>
  >((acc, item) => {
    acc[item.key] = item.defaultWidth;
    return acc;
  }, {});
  return {
    visibleColumnKeys,
    columnWidths: normalizeProjectTableWidths(visibleColumnKeys, columnWidths),
  };
}

function loadProjectTablePreference(): ProjectTablePreference {
  const defaults = getDefaultProjectTablePreference();
  if (typeof window === "undefined") {
    return defaults;
  }
  try {
    const raw = window.localStorage.getItem(PROJECT_TABLE_STORAGE_KEY);
    if (!raw) {
      return defaults;
    }
    const parsed = JSON.parse(raw) as Partial<ProjectTablePreference>;
    const validKeys = new Set<ProjectColumnKey>(
      PROJECT_TABLE_COLUMN_META.map((item) => item.key),
    );
    const lockedKeys = PROJECT_TABLE_COLUMN_META.filter((item) => item.locked).map(
      (item) => item.key,
    );
    const visibleColumnKeys = Array.isArray(parsed.visibleColumnKeys)
      ? parsed.visibleColumnKeys.filter(
          (key): key is ProjectColumnKey => validKeys.has(key as ProjectColumnKey),
        )
      : defaults.visibleColumnKeys;
    const normalizedVisibleKeys = Array.from(
      new Set([...lockedKeys, ...visibleColumnKeys]),
    );
    const columnWidths = { ...defaults.columnWidths };
    if (parsed.columnWidths && typeof parsed.columnWidths === "object") {
      for (const item of PROJECT_TABLE_COLUMN_META) {
        const nextWidth = parsed.columnWidths[item.key];
        if (typeof nextWidth === "number" && Number.isFinite(nextWidth)) {
          columnWidths[item.key] = Math.max(
            getProjectEffectiveMinWidth(item),
            Math.round(nextWidth),
          );
        }
      }
    }
    const finalVisibleKeys =
      normalizedVisibleKeys.length > 0
        ? normalizedVisibleKeys
        : defaults.visibleColumnKeys;
    return {
      visibleColumnKeys: finalVisibleKeys,
      columnWidths: normalizeProjectTableWidths(finalVisibleKeys, columnWidths),
    };
  } catch {
    return defaults;
  }
}

function normalizeProjectTableWidths(
  visibleColumnKeys: ProjectColumnKey[],
  columnWidths: Partial<Record<ProjectColumnKey, number>>,
): Partial<Record<ProjectColumnKey, number>> {
  const normalized: Partial<Record<ProjectColumnKey, number>> = {};
  const visibleMetas = PROJECT_TABLE_COLUMN_META.filter((item) =>
    visibleColumnKeys.includes(item.key),
  );

  for (const meta of visibleMetas) {
    const width = columnWidths[meta.key] || meta.defaultWidth;
    normalized[meta.key] = Math.max(
      getProjectEffectiveMinWidth(meta),
      Math.round(width),
    );
  }

  const totalWidth = visibleMetas.reduce(
    (sum, meta) => sum + (normalized[meta.key] || meta.defaultWidth),
    0,
  );
  const maxPreferredWidth = 1180;
  if (totalWidth <= maxPreferredWidth) {
    return normalized;
  }

  let overflow = totalWidth - maxPreferredWidth;
  const shrinkableMetas = visibleMetas.filter((item) => !item.locked);

  for (const meta of shrinkableMetas) {
    if (overflow <= 0) {
      break;
    }
    const currentWidth = normalized[meta.key] || meta.defaultWidth;
    const shrinkable = currentWidth - getProjectEffectiveMinWidth(meta);
    if (shrinkable <= 0) {
      continue;
    }
    const delta = Math.min(shrinkable, overflow);
    normalized[meta.key] = currentWidth - delta;
    overflow -= delta;
  }

  return normalized;
}

function getStageNavigationState(
  projectStage: string | undefined,
  stageKey: string,
): StageNavigationState {
  if (projectStage === "lost") {
    return "future";
  }
  const currentIndex = PROJECT_TIMELINE_STAGES.findIndex(
    (item) => item.key === projectStage,
  );
  const targetIndex = PROJECT_TIMELINE_STAGES.findIndex(
    (item) => item.key === stageKey,
  );
  if (currentIndex < 0 || targetIndex < 0) {
    return "future";
  }
  if (targetIndex < currentIndex) {
    return "completed";
  }
  if (targetIndex === currentIndex) {
    return "current";
  }
  return "future";
}

export function ProjectsView(props: ProjectsViewProps) {
  const {
    currentUser,
    onNavigateToOpportunities,
    onNavigateToSolutions,
    onNavigateToBids,
    onNavigateToContracts,
    initialKeyword,
  } = props;
  const [keyword, setKeyword] = useState<string>(
    initialKeyword?.trim() || "",
  );
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  );
  const [stageFilter, setStageFilter] = useState<string | undefined>(undefined);
  const [ownerFilter, setOwnerFilter] = useState<string[] | undefined>(
    undefined,
  );
  const [projectOverrides, setProjectOverrides] = useState<ProjectRow[]>([]);
  const [removedProjectKeys, setRemovedProjectKeys] = useState<string[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentProject, setCurrentProject] = useState<ProjectRow | null>(null);
  const [form] = Form.useForm();
  const [relatedSortKey, setRelatedSortKey] =
    useState<string>("probability_desc");
  const [sharedOpportunities, setSharedOpportunities] = useState<
    DemoOpportunity[]
  >(() => loadSharedDemoOpportunities());
  const [createRelatedVisible, setCreateRelatedVisible] = useState(false);
  const [createRelatedForm] = Form.useForm();
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [projectTablePreference, setProjectTablePreference] =
    useState<ProjectTablePreference>(() => loadProjectTablePreference());
  const canCreateProjects = hasActionAccess(
    currentUser || null,
    "project.create",
  );
  const canEditProjects = hasActionAccess(
    currentUser || null,
    "project.edit",
  );
  const canDeleteProjects = hasActionAccess(
    currentUser || null,
    "project.delete",
  );
  const canManageProjects =
    canCreateProjects || canEditProjects || canDeleteProjects;
  const canCreateOpportunities = hasActionAccess(
    currentUser || null,
    "opportunity.create",
  );
  const projects = mergeByKey(
    deriveProjectsFromOpportunities(sharedOpportunities),
    projectOverrides,
  ).filter((project) => !removedProjectKeys.includes(project.key));

  useEffect(() => {
    if (!currentProject) {
      return;
    }
    const refreshed = projects.find((item) => item.projectKey === currentProject.projectKey);
    if (!refreshed) {
      setCurrentProject(null);
      setDetailModalVisible(false);
      return;
    }
    const shouldRefresh =
      refreshed.budget !== currentProject.budget ||
      refreshed.relatedOpportunities !== currentProject.relatedOpportunities ||
      refreshed.stage !== currentProject.stage ||
      refreshed.status !== currentProject.status ||
      refreshed.expectedCloseDate !== currentProject.expectedCloseDate ||
      refreshed.winProbability !== currentProject.winProbability;
    if (shouldRefresh) {
      setCurrentProject(refreshed);
    }
  }, [currentProject, projects]);

  useEffect(() => {
    void syncSharedOpportunitiesFromApi().then((items) => {
      if (items) {
        setSharedOpportunities(items);
      }
    });
  }, []);

  const navigateToStageModule = (
    project: ProjectRow,
    stageKey: string,
    target: (typeof PROJECT_TIMELINE_STAGES)[number]["target"],
  ) => {
    if (target === "opportunities") {
      const shouldApplyStageFilter = project.stage === stageKey;
      onNavigateToOpportunities?.(
        project.name,
        shouldApplyStageFilter ? stageKey : undefined,
      );
      return;
    }
    if (target === "solutions") {
      onNavigateToSolutions?.(project.name);
      return;
    }
    if (target === "bids") {
      onNavigateToBids?.(project.name);
      return;
    }
    if (target === "contracts") {
      onNavigateToContracts?.(project.name);
    }
  };

  const formatRelatedAmount = (value?: string): string => {
    if (!value) return "¥0万";
    const cleaned = value.replace(/[¥,]/g, "");
    const numberValue = Number(cleaned);
    if (!Number.isFinite(numberValue)) {
      return value;
    }
    return `¥${Math.round(numberValue / 10000).toLocaleString("zh-CN")}万`;
  };

  const mapOpportunityToRelatedRow = (
    opportunity: DemoOpportunity,
  ): RelatedOpportunityRow => ({
    key: String(opportunity.id),
    opportunityCode: opportunity.opportunityCode,
    name: opportunity.name,
    customer: opportunity.customerName || "-",
    stage: opportunity.stage || "",
    amount: formatRelatedAmount(opportunity.expectedValue),
    owner: getSalesOwnerLabel(opportunity.ownerUsername),
    probability: opportunity.probability || 0,
    expectedCloseDate: opportunity.expectedCloseDate || "",
  });

  const getRelatedRowsForProject = (project: ProjectRow): RelatedOpportunityRow[] =>
    sharedOpportunities
      .filter(
        (opportunity) =>
          getProjectKeyFromOpportunity(opportunity) === project.projectKey,
      )
      .map(mapOpportunityToRelatedRow);

  const handleDeleteRelated = (record: RelatedOpportunityRow) => {
    if (!canDeleteProjects) {
      message.warning("当前账号无权删除关联商机。");
      return;
    }
    Modal.confirm({
      title: `确认删除关联商机「${record.name}」？`,
      content: "删除后将同步移除共享商机数据，项目详情中的关联记录也会一并消失。",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: () => {
        const next = sharedOpportunities.filter(
          (item) => String(item.id) !== String(record.key),
        );
        setSharedOpportunities(next);
        saveSharedDemoOpportunities(next);
        message.success("已删除关联商机（同步删除共享商机数据）");
      },
    });
  };

  const handleDeleteProject = (record: ProjectRow) => {
    if (!canDeleteProjects) {
      message.warning("当前账号无权删除项目。");
      return;
    }
    Modal.confirm({
      title: `确认删除项目「${record.name}」？`,
      content: "删除后该项目将从当前项目列表中移除，当前不会进入回收站。",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: () => {
        const projectKey = record.key;
        setProjectOverrides((prev) => prev.filter((p) => p.key !== projectKey));
        setRemovedProjectKeys((prev) =>
          prev.includes(projectKey) ? prev : [...prev, projectKey],
        );
        if (currentProject && currentProject.key === projectKey) {
          setDetailModalVisible(false);
          setCurrentProject(null);
        }
        message.success("已删除项目");
      },
    });
  };

  const parseAmount = (value?: string): number => {
    if (!value) return 0;
    const cleaned = value.replace(/[¥,万]/g, "");
    const num = Number(cleaned);
    return Number.isNaN(num) ? 0 : num;
  };

  const totalBudget = projects.reduce(
    (sum, p) => sum + parseAmount(p.budget),
    0,
  );
  const inprogressBudget = projects
    .filter((p) => p.status === "inprogress")
    .reduce((sum, p) => sum + parseAmount(p.budget), 0);
  const completedBudget = projects
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + parseAmount(p.budget), 0);
  const archivedBudget = projects
    .filter((p) => p.status === "archived")
    .reduce((sum, p) => sum + parseAmount(p.budget), 0);

  const relatedColumns: ColumnsType<RelatedOpportunityRow> = [
    {
      title: "商机编号",
      dataIndex: "opportunityCode",
      key: "opportunityCode",
      render: (value?: string) => value || "-",
    },
    {
      title: "商机名称",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "客户",
      dataIndex: "customer",
      key: "customer",
    },
    {
      title: "阶段",
      dataIndex: "stage",
      key: "stage",
      render: (stage: string) => <Tag>{STAGE_LABELS[stage] || stage}</Tag>,
    },
    {
      title: "金额",
      dataIndex: "amount",
      key: "amount",
    },
    {
      title: "负责人",
      dataIndex: "owner",
      key: "owner",
    },
    {
      title: "成交概率",
      dataIndex: "probability",
      key: "probability",
      render: (prob: number) => `${prob}%`,
    },
    {
      title: "预计签约",
      dataIndex: "expectedCloseDate",
      key: "expectedCloseDate",
    },
  ];

  const relatedColumnsWithActions: ColumnsType<RelatedOpportunityRow> = [
    ...relatedColumns,
    {
      title: "操作",
      key: "action",
      render: (_: unknown, record: RelatedOpportunityRow) => (
        <Button
          type="link"
          size="small"
          danger
          disabled={!canDeleteProjects}
          onClick={() => handleDeleteRelated(record)}
        >
          删除
        </Button>
      ),
    },
  ];

  const filteredProjects = projects.filter((p) => {
    if (statusFilter && statusFilter.length > 0) {
      if (p.status !== statusFilter) {
        return false;
      }
    }
    if (ownerFilter && ownerFilter.length > 0) {
      const owners = [p.salesOwner, p.industryOwner, p.preSalesOwner];
      const match = owners.some((name) => ownerFilter.includes(name));
      if (!match) {
        return false;
      }
    }
    if (stageFilter && stageFilter.length > 0) {
      if (!p.stage || p.stage !== stageFilter) {
        return false;
      }
    }
    if (keyword && keyword.trim().length > 0) {
      const k = keyword.trim().toLowerCase();
      const name = p.name.toLowerCase();
      const customer = p.customer.toLowerCase();
      const salesOwner = p.salesOwner.toLowerCase();
      const industryOwner = p.industryOwner.toLowerCase();
      const preSalesOwner = p.preSalesOwner.toLowerCase();
      if (
        !name.includes(k) &&
        !customer.includes(k) &&
        !salesOwner.includes(k) &&
        !industryOwner.includes(k) &&
        !preSalesOwner.includes(k)
      ) {
        return false;
      }
    }
    return true;
  });

  useEffect(() => {
    const handleSharedOpportunitiesUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<DemoOpportunity[]>;
      if (Array.isArray(customEvent.detail)) {
        setSharedOpportunities(customEvent.detail);
      }
    };
    window.addEventListener(
      OPPORTUNITY_DEMO_UPDATED_EVENT,
      handleSharedOpportunitiesUpdated as EventListener,
    );
    return () => {
      window.removeEventListener(
        OPPORTUNITY_DEMO_UPDATED_EVENT,
        handleSharedOpportunitiesUpdated as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [keyword, statusFilter, stageFilter, ownerFilter]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [filteredProjects.length, page, pageSize]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(
        PROJECT_TABLE_STORAGE_KEY,
        JSON.stringify(projectTablePreference),
      );
    } catch {
      // ignore storage errors
    }
  }, [projectTablePreference]);

  const ownerOptions = Array.from(
    new Set(
      projects.flatMap((p) => [
        p.salesOwner,
        p.industryOwner,
        p.preSalesOwner,
      ]),
    ),
  ).map((name) => ({
    value: name,
    label: name,
  }));

  const handleProjectNameClick = (project: ProjectRow) => {
    setCurrentProject(project);
    setDetailModalVisible(true);
  };

  const paginatedProjects = filteredProjects.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const allColumns: ColumnsType<ProjectRow> = [
    {
      title: "序号",
      key: "index",
      width: 72,
      render: (_: unknown, __: ProjectRow, index: number) =>
        (page - 1) * pageSize + index + 1,
    },
    {
      title: "项目名称",
      dataIndex: "name",
      key: "name",
      render: (text: string, record) => (
        <Button
          type="link"
          size="small"
          style={{ padding: 0, fontWeight: 500 }}
          onClick={() => handleProjectNameClick(record)}
        >
          {text}
        </Button>
      ),
    },
    {
      title: "客户",
      dataIndex: "customer",
      key: "customer",
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: ProjectRow["status"]) => renderStatus(status),
    },
    {
      title: "阶段",
      dataIndex: "stage",
      key: "stage",
      render: (stage: string) => (
        <Tag>{STAGE_LABELS[stage] || stage}</Tag>
      ),
    },
    {
      title: "销售负责人",
      dataIndex: "salesOwner",
      key: "salesOwner",
    },
    {
      title: "售前负责人",
      dataIndex: "preSalesOwner",
      key: "preSalesOwner",
    },
    {
      title: "优先级",
      dataIndex: "priority",
      key: "priority",
      render: (priority: ProjectRow["priority"]) => renderPriority(priority),
    },
    {
      title: "预算",
      dataIndex: "budget",
      key: "budget",
    },
    {
      title: "预计签约",
      dataIndex: "expectedCloseDate",
      key: "expectedCloseDate",
    },
    {
      title: "成交概率",
      dataIndex: "winProbability",
      key: "winProbability",
      render: (prob: number) => `${prob}%`,
    },
    {
      title: "关联商机数",
      dataIndex: "relatedOpportunities",
      key: "relatedOpportunities",
    },
    {
      title: "方案版本数",
      dataIndex: "solutionVersions",
      key: "solutionVersions",
    },
    {
      title: "开始时间",
      dataIndex: "startDate",
      key: "startDate",
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setCurrentProject(record);
              setDetailModalVisible(true);
            }}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            disabled={!canEditProjects}
            onClick={() => {
              if (!canEditProjects) {
                message.warning("当前账号无权编辑项目。");
                return;
              }
              setCurrentProject(record);
              form.setFieldsValue({
                name: record.name,
                customer: record.customer,
                budget: record.budget.replace(/[¥万]/g, ""),
                salesOwner: record.salesOwner,
                industryOwner: record.industryOwner,
                preSalesOwner: record.preSalesOwner,
                priority: record.priority,
                status: record.status,
                stage: record.stage,
                startDate: record.startDate,
                description: "",
              });
              setCreateModalVisible(true);
            }}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            disabled={!canDeleteProjects}
            onClick={() => handleDeleteProject(record)}
          >
            删除
          </Button>
        </>
      ),
    },
  ];

  const projectColumnOptions = PROJECT_TABLE_COLUMN_META.filter(
    (item) => !item.locked,
  ).map((item) => ({
    value: item.key,
    label: item.title,
  }));

  const selectedToggleableColumnKeys = projectTablePreference.visibleColumnKeys.filter(
    (key) =>
      PROJECT_TABLE_COLUMN_META.some((item) => item.key === key && !item.locked),
  );

  const columns = allColumns
    .filter((column) => {
      const key = String(column.key || column.dataIndex || "");
      return projectTablePreference.visibleColumnKeys.includes(
        key as ProjectColumnKey,
      );
    })
    .map((column) => {
      const key = String(column.key || column.dataIndex || "") as ProjectColumnKey;
      const meta = PROJECT_TABLE_COLUMN_META.find((item) => item.key === key);
      const width =
        projectTablePreference.columnWidths[key] || meta?.defaultWidth;
      return {
        ...column,
        width,
        onHeaderCell: () => ({
          width,
          minWidth: meta?.minWidth,
          resizable: meta?.resizable,
          onResizeWidth: (nextWidth: number) => {
            setProjectTablePreference((prev) => ({
              ...prev,
              columnWidths: {
                ...prev.columnWidths,
                [key]: nextWidth,
              },
            }));
          },
        }),
      };
    });

  const projectTableScrollX = columns.reduce((sum, column) => {
    const width = typeof column.width === "number" ? column.width : 120;
    return sum + width;
  }, 0);

  const updateVisibleColumns = (nextKeys: ProjectColumnKey[]) => {
    const lockedKeys = PROJECT_TABLE_COLUMN_META.filter(
      (item) => item.locked,
    ).map((item) => item.key);
    const visibleColumnKeys = Array.from(new Set([...lockedKeys, ...nextKeys]));
    setProjectTablePreference((prev) => ({
      ...prev,
      visibleColumnKeys,
      columnWidths: normalizeProjectTableWidths(
        visibleColumnKeys,
        prev.columnWidths,
      ),
    }));
  };

  const columnSettingContent = (
    <div style={{ width: 280 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>显示列</div>
      <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 12 }}>
        勾选需要展示的项目列表列，未勾选的列将暂时隐藏。
      </div>
      <Checkbox.Group
        style={{ width: "100%" }}
        value={selectedToggleableColumnKeys}
        onChange={(value) => updateVisibleColumns(value as ProjectColumnKey[])}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          {projectColumnOptions.map((item) => (
            <label
              key={item.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                minHeight: 32,
              }}
            >
              <Checkbox value={item.value}>{item.label}</Checkbox>
            </label>
          ))}
        </div>
      </Checkbox.Group>
      <Divider style={{ margin: "12px 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <Button
          size="small"
          onClick={() => {
            setProjectTablePreference((prev) => ({
              visibleColumnKeys: PROJECT_TABLE_COLUMN_META.map(
                (item) => item.key,
              ),
              columnWidths: normalizeProjectTableWidths(
                PROJECT_TABLE_COLUMN_META.map((item) => item.key),
                prev.columnWidths,
              ),
            }));
          }}
        >
          显示全部
        </Button>
        <Button
          size="small"
          onClick={() => {
            setProjectTablePreference(getDefaultProjectTablePreference());
          }}
        >
          恢复默认
        </Button>
      </div>
    </div>
  );

  const compactStatCardStyle: React.CSSProperties = {
    borderRadius: 16,
    border: "1px solid var(--app-border)",
    boxShadow: "var(--app-shadow)",
  };
  const filterToolbarStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  };
  const filterGroupStyle: React.CSSProperties = {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <Card style={compactStatCardStyle} bodyStyle={{ padding: 14 }}>
        <div style={filterToolbarStyle}>
          <div style={filterGroupStyle}>
          <Input
            allowClear
            style={{ width: 220 }}
            placeholder="搜索项目 / 客户 / 人员..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Select
            allowClear
            style={{ width: 180 }}
            placeholder="全部状态"
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
            options={[
              { value: "inprogress", label: "进行中" },
              { value: "completed", label: "已完成" },
              { value: "archived", label: "已归档" },
            ]}
          />
          <Select
            allowClear
            style={{ width: 180 }}
            placeholder="全部阶段"
            value={stageFilter}
            onChange={(value) => setStageFilter(value as string | undefined)}
            options={[
              { value: "discovery", label: "发现" },
              { value: "solution_design", label: "方案设计" },
              { value: "proposal", label: "提案" },
              { value: "bidding", label: "投标" },
              { value: "negotiation", label: "谈判" },
              { value: "won", label: "中标" },
              { value: "lost", label: "丢单" },
            ]}
          />
          <Select
            mode="multiple"
            allowClear
            style={{ minWidth: 240 }}
            placeholder="按负责人过滤"
            value={ownerFilter}
            onChange={(value) => setOwnerFilter(value)}
            options={ownerOptions}
            maxTagCount="responsive"
          />
          </div>
          <Button
            type="primary"
            disabled={!canCreateProjects}
            onClick={() => {
              if (!canCreateProjects) {
                message.warning("当前账号无权新建项目。");
                return;
              }
              form.resetFields();
              setCurrentProject(null);
              setCreateModalVisible(true);
            }}
          >
            + 新建项目
          </Button>
        </div>
      </Card>

      <Row gutter={[14, 14]}>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            bodyStyle={{ padding: "14px 16px" }}
            onClick={() => {
              if (listRef.current) {
                listRef.current.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6, color: "#1890ff" }}>
              📁
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {projects.length}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>项目总数</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            bodyStyle={{ padding: "14px 16px" }}
            onClick={() => {
              setStatusFilter("inprogress");
              if (listRef.current) {
                listRef.current.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6, color: "#52c41a" }}>
              ✓
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {projects.filter((project) => project.status === "inprogress").length}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>进行中</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            bodyStyle={{ padding: "14px 16px" }}
            onClick={() => {
              setStatusFilter("archived");
              if (listRef.current) {
                listRef.current.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6, color: "#722ed1" }}>
              ⏳
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {projects.filter((project) => project.status === "archived").length}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>已归档</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            bodyStyle={{ padding: "14px 16px" }}
            onClick={() => {
              setBudgetModalVisible(true);
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6, color: "#fa8c16" }}>
              💰
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {totalBudget.toLocaleString("zh-CN")}万
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>总预算</div>
          </Card>
        </Col>
      </Row>

      {/* 项目列表 */}
      <div ref={listRef}>
        <Card
          style={compactStatCardStyle}
          bodyStyle={{ padding: 12 }}
          title="项目列表"
          extra={
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                justifyContent: "flex-end",
                alignItems: "center",
              }}
            >
              <Popover
                trigger="click"
                placement="bottomRight"
                content={columnSettingContent}
              >
                <Button size="small">
                  列设置（{selectedToggleableColumnKeys.length}/
                  {projectColumnOptions.length}）
                </Button>
              </Popover>
            </div>
          }
        >
          <Table<ProjectRow>
            size="small"
            components={{
              header: {
                cell: ResizableHeaderCell,
              },
            }}
            scroll={{ x: projectTableScrollX }}
            pagination={{
              current: page,
              pageSize,
              total: filteredProjects.length,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (nextPage, nextPageSize) => {
                setPage(nextPage);
                setPageSize(nextPageSize);
              },
            }}
            rowKey="key"
            dataSource={paginatedProjects}
            columns={columns}
          />
        </Card>
      </div>

      {/* 新建 / 编辑项目模态框（复刻 demo.html 项目表单） */}
      <Modal
        title="项目信息"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={async () => {
          try {
              const values = await form.validateFields();
              const {
                name,
                customer,
                budget,
                salesOwner,
                industryOwner,
                preSalesOwner,
                priority,
                status,
                stage,
                startDate,
                description,
              } = values as {
                name: string;
                customer: string;
                budget?: string;
                salesOwner?: string;
                industryOwner?: string;
                preSalesOwner?: string;
                priority: ProjectRow["priority"];
                status: ProjectRow["status"];
                stage: string;
                startDate?: string;
                description?: string;
            };
            const budgetLabel =
              budget && budget.trim().length > 0
                ? `¥${Number(budget).toLocaleString("zh-CN")}万`
                : "¥0万";

            if (currentProject) {
              const nextProjectName = normalizeProjectName(name);
              setProjectOverrides((prev) => {
                const baseProject =
                  projects.find((item) => item.key === currentProject.key) || currentProject;
                const nextProject: ProjectRow = {
                  ...baseProject,
                  name: nextProjectName,
                  customer,
                  budget: budgetLabel,
                  salesOwner: salesOwner || baseProject.salesOwner,
                  industryOwner: industryOwner || baseProject.industryOwner,
                  preSalesOwner: preSalesOwner || baseProject.preSalesOwner,
                  priority,
                  status,
                  stage,
                  startDate: startDate || baseProject.startDate,
                };
                const exists = prev.some((p) => p.key === currentProject.key);
                return exists
                  ? prev.map((p) => (p.key === currentProject.key ? nextProject : p))
                  : [nextProject, ...prev];
              });
              const nextShared = sharedOpportunities.map((item) =>
                getProjectKeyFromOpportunity(item) === currentProject.projectKey
                  ? {
                      ...item,
                      projectName: nextProjectName,
                      customerName: customer,
                    }
                  : item,
              );
              setSharedOpportunities(nextShared);
              saveSharedDemoOpportunities(nextShared);
            } else {
              const newKey = buildProjectKey(name, customer);
              const newProject: ProjectRow = {
                key: newKey,
                projectKey: newKey,
                name: normalizeProjectName(name),
                customer,
                status,
                stage,
                priority,
                budget: budgetLabel,
                startDate: startDate || "2024-01-01",
                salesOwnerUsername: undefined,
                salesOwner: salesOwner || "未指定",
                industryOwner: industryOwner || "未指定",
                preSalesOwnerUsername: undefined,
                preSalesOwner: preSalesOwner || "未指定",
                relatedOpportunities: 0,
                solutionVersions: 0,
                expectedCloseDate: "2026-12-31",
                winProbability: 50,
              };
              setProjectOverrides((prev) => [newProject, ...prev]);
            }

            setCreateModalVisible(false);
          } catch {
            // 校验失败时不关闭模态框
          }
        }}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form layout="vertical" form={form}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="项目名称 *"
                name="name"
                rules={[{ required: true, message: "请输入项目名称" }]}
              >
                <AntInput placeholder="请输入项目名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="客户名称 *"
                name="customer"
                rules={[{ required: true, message: "请输入客户名称" }]}
              >
                <AntInput placeholder="请输入客户名称" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="预算金额（万）" name="budget">
                <AntInput placeholder="请输入预算金额，例如 500" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="优先级" name="priority" initialValue="medium">
                <Select
                  options={[
                    { value: "low", label: "低" },
                    { value: "medium", label: "中" },
                    { value: "high", label: "高" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="项目状态"
                name="status"
                initialValue="inprogress"
              >
                <Select
                  options={[
                    { value: "inprogress", label: "进行中" },
                    { value: "completed", label: "已完成" },
                    { value: "archived", label: "已归档" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="项目阶段" name="stage" initialValue="提案">
                <Select
                  options={[
                    { value: "发现", label: "发现" },
                    { value: "分析", label: "分析" },
                    { value: "提案", label: "提案" },
                    { value: "谈判", label: "谈判" },
                    { value: "签约", label: "签约" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="开始时间" name="startDate">
                <AntInput placeholder="例如：2024-01-05" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="销售负责人" name="salesOwner">
                <AntInput placeholder="例如：张三（销售）" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="所属行业负责人" name="industryOwner">
                <AntInput placeholder="例如：某行业负责人" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="售前负责人" name="preSalesOwner">
                <AntInput placeholder="例如：王五（售前）" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="项目描述" name="description">
            <AntInput.TextArea
              rows={3}
              placeholder="请输入项目描述，例如项目背景、范围等信息"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="项目预算分布"
        open={budgetModalVisible}
        onCancel={() => setBudgetModalVisible(false)}
        footer={null}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Paragraph>
            总预算：{" "}
            <Text strong>
              {totalBudget.toLocaleString("zh-CN")}
              万
            </Text>
          </Paragraph>
          <Paragraph>
            进行中项目预算：{" "}
            <Text>
              {inprogressBudget.toLocaleString("zh-CN")}
              万
            </Text>
          </Paragraph>
          <Paragraph>
            已完成项目预算：{" "}
            <Text>
              {completedBudget.toLocaleString("zh-CN")}
              万
            </Text>
          </Paragraph>
          <Paragraph>
            已归档项目预算：{" "}
            <Text>
              {archivedBudget.toLocaleString("zh-CN")}
              万
            </Text>
          </Paragraph>
          <Paragraph type="secondary" style={{ fontSize: 12 }}>
            当前基于列表数据计算预算分布，
            后续接入后端实体（Project / Opportunity / Contract）后，
            可在此展示按状态 / 行业 / 负责人等维度拆分的真实预算结构。
          </Paragraph>
        </div>
        <div style={{ textAlign: "right", marginTop: 16 }}>
          <Button type="primary" onClick={() => setBudgetModalVisible(false)}>
            关闭
          </Button>
        </div>
      </Modal>
      <Modal
        title="新建关联商机"
        open={createRelatedVisible}
        onCancel={() => {
          setCreateRelatedVisible(false);
          createRelatedForm.resetFields();
        }}
        onOk={async () => {
          if (!currentProject) {
            setCreateRelatedVisible(false);
            return;
          }
          if (currentProject.status === "completed") {
            message.warning("已完成项目已封板，不能继续新增关联商机。");
            setCreateRelatedVisible(false);
            return;
          }

          try {
            const values = await createRelatedForm.validateFields();
            const {
              name,
              amount,
              stage,
              probability,
              expectedCloseDate,
            } = values as {
              name: string;
              amount?: string;
              stage?: string;
              probability?: number;
              expectedCloseDate?: string;
            };

            const probNumber =
              probability !== undefined && probability !== null
                ? Number(probability)
                : 0;

            const maxId = sharedOpportunities.reduce(
              (max, item) => (item.id > max ? item.id : max),
              0,
            );
            const newOpportunity: DemoOpportunity = {
              id: maxId + 1,
              opportunityCode: getNextOpportunityCode(
                sharedOpportunities.map((item) => item.opportunityCode),
              ),
              name,
              customerName: currentProject.customer,
              projectKey: currentProject.projectKey,
              projectName: currentProject.name,
              stage: stage || "solution_design",
              expectedValue:
                amount && amount.trim().length > 0
                  ? `¥${(Number(amount) * 10000).toLocaleString("zh-CN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : "¥0.00",
              ownerUsername:
                currentProject.preSalesOwnerUsername ||
                currentProject.salesOwnerUsername,
              probability: Number.isNaN(probNumber) ? 0 : probNumber,
              expectedCloseDate: expectedCloseDate || "",
              createdAt: new Date().toISOString(),
            };

            const next = [...sharedOpportunities, newOpportunity];
            setSharedOpportunities(next);
            saveSharedDemoOpportunities(next);
            message.success("已创建关联商机，并同步到商机管理");
            createRelatedForm.resetFields();
            setCreateRelatedVisible(false);
          } catch {
            // 校验失败时不关闭弹窗
          }
        }}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form layout="vertical" form={createRelatedForm}>
          <Form.Item
            label="商机名称"
            name="name"
            rules={[{ required: true, message: "请输入商机名称" }]}
          >
            <AntInput placeholder="例如：智慧园区二期网络扩容" />
          </Form.Item>
          <Form.Item label="金额（万）" name="amount">
            <AntInput placeholder="例如：300" />
          </Form.Item>
          <Form.Item label="阶段" name="stage" initialValue="solution_design">
            <Select
              options={[
                { value: "discovery", label: "发现" },
                { value: "solution_design", label: "方案设计" },
                { value: "proposal", label: "提案" },
                { value: "bidding", label: "投标" },
                { value: "negotiation", label: "谈判" },
                { value: "won", label: "中标" },
              ]}
            />
          </Form.Item>
          <Form.Item label="成交概率（0-100）" name="probability">
            <AntInput placeholder="例如：70" />
          </Form.Item>
          <Form.Item label="预计签约时间" name="expectedCloseDate">
            <AntInput placeholder="例如：2024-10-31" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 项目详情模态框（复刻 demo.html 项目详情 + 时间线） */}
      <Modal
        title="项目详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button
            key="close"
            onClick={() => setDetailModalVisible(false)}
          >
            关闭
          </Button>,
        ]}
        width={720}
      >
        {currentProject && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div>
                <strong>项目名称：</strong>
                <br />
                {currentProject.name}
              </div>
              <div>
                <strong>客户名称：</strong>
                <br />
                {currentProject.customer}
              </div>
              <div>
                <strong>项目状态：</strong>
                <br />
                {renderStatus(currentProject.status)}
              </div>
              <div>
                <strong>项目阶段：</strong>
                <br />
                {getProjectStageText(currentProject.stage)}
              </div>
              <div>
                <strong>预算金额：</strong>
                <br />
                {currentProject.budget}
              </div>
              <div>
                <strong>优先级：</strong>
                <br />
                {renderPriority(currentProject.priority)}
              </div>
              <div>
                <strong>开始时间：</strong>
                <br />
                {currentProject.startDate}
              </div>
              <div>
                <strong>销售负责人：</strong>
                <br />
                {currentProject.salesOwner}
              </div>
              <div>
                <strong>预计签约：</strong>
                <br />
                {currentProject.expectedCloseDate}
              </div>
              <div>
                <strong>成交概率：</strong>
                <br />
                {currentProject.winProbability}%
              </div>
              <div>
                <strong>所属行业负责人：</strong>
                <br />
                {currentProject.industryOwner}
              </div>
              <div>
                <strong>售前负责人：</strong>
                <br />
                {currentProject.preSalesOwner}
              </div>
              <div>
              <strong>关联商机数：</strong>
              <br />
              {currentProject.relatedOpportunities}
            </div>
              <div>
                <strong>方案版本数：</strong>
                <br />
                {currentProject.solutionVersions}
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <strong>项目描述：</strong>
              <p
                style={{
                  marginTop: 8,
                  color: "#595959",
                  lineHeight: 1.6,
                }}
              >
                为{currentProject.customer}
                提供全面的项目实施服务，具体范围和交付内容可根据实际需求进行扩展。
              </p>
            </div>
            <div style={{ marginBottom: 24 }}>
              <strong>关联商机列表：</strong>
              <p
                style={{
                  marginTop: 8,
                  color: "#8c8c8c",
                  fontSize: 12,
                }}
              >
                当前列表已按“项目主线”显式绑定展示，只显示归属于该项目的商机。
                不再按客户名称自动混合其他项目的商机，后续可直接替换为真实
                Opportunity 实体查询结果。
              </p>
              <Card size="small" bordered={false}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontSize: 12, color: "#595959" }}>
                      排序：
                    </span>
                    <Select
                      size="small"
                      style={{ width: 200 }}
                      value={relatedSortKey}
                      onChange={(value) => setRelatedSortKey(value)}
                      options={[
                        {
                          value: "probability_desc",
                          label: "按成交概率（从高到低）",
                        },
                        {
                          value: "amount_desc",
                          label: "按金额（从高到低）",
                        },
                        {
                          value: "amount_asc",
                          label: "按金额（从低到高）",
                        },
                      ]}
                    />
                  </div>
                  <Button
                    size="small"
                    type="primary"
                    disabled={
                      !canCreateOpportunities || currentProject.status === "completed"
                    }
                    onClick={() => {
                      if (!canCreateOpportunities) {
                        message.warning("当前账号无权新建关联商机。");
                        return;
                      }
                      if (!currentProject) {
                        return;
                      }
                      if (currentProject.status === "completed") {
                        message.warning("已完成项目已封板，不能继续新增关联商机。");
                        return;
                      }
                      createRelatedForm.setFieldsValue({
                        name: "",
                        amount: "",
                        stage: "solution_design",
                        probability: "",
                        expectedCloseDate: "",
                      });
                      setCreateRelatedVisible(true);
                    }}
                  >
                    + 新建关联商机
                  </Button>
                </div>
                {currentProject.status === "completed" && (
                  <div
                    style={{
                      marginBottom: 12,
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "rgba(240, 249, 255, 0.8)",
                      border: "1px solid rgba(125, 211, 252, 0.45)",
                      color: "#475569",
                      fontSize: 12,
                    }}
                  >
                    当前项目已处于“已完成 / 签约中标”状态，项目主线已封板，不再允许继续新增关联商机。
                    如需推进新的销售机会，请新建项目或将商机绑定到其他进行中的项目。
                  </div>
                )}
                <Table<RelatedOpportunityRow>
                  size="small"
                  rowKey="key"
                  pagination={false}
                  dataSource={(() => {
                    const raw = getRelatedRowsForProject(currentProject);
                    const sorted = [...raw].sort((a, b) => {
                      if (
                        relatedSortKey === "amount_desc" ||
                        relatedSortKey === "amount_asc"
                      ) {
                        const av = parseAmount(a.amount);
                        const bv = parseAmount(b.amount);
                        return relatedSortKey === "amount_desc"
                          ? bv - av
                          : av - bv;
                      }
                      // 默认按成交概率从高到低
                      return b.probability - a.probability;
                    });
                    return sorted;
                  })()}
                  columns={relatedColumnsWithActions}
                />
              </Card>
            </div>
            <div style={{ marginBottom: 24 }}>
              <strong>项目进度时间线：</strong>
              <div style={{ marginTop: 8, marginBottom: 12, color: "#8c8c8c", fontSize: 12 }}>
                已走过和当前阶段可点击并跳转到对应业务模块；未进入的阶段置灰禁用。
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginTop: 16,
                }}
              >
                {PROJECT_TIMELINE_STAGES.map((item, index) => {
                  const state = getStageNavigationState(
                    currentProject.stage,
                    item.key,
                  );
                  const clickable = state !== "future";
                  const borderColor =
                    state === "completed"
                      ? "rgba(34, 197, 94, 0.34)"
                      : state === "current"
                        ? "rgba(59, 130, 246, 0.34)"
                        : "var(--app-border)";
                  const background =
                    state === "completed"
                      ? "linear-gradient(135deg, color-mix(in srgb, rgba(34,197,94,0.16) 72%, var(--app-surface) 28%) 0%, var(--app-surface-soft) 100%)"
                      : state === "current"
                        ? "linear-gradient(135deg, color-mix(in srgb, rgba(59,130,246,0.16) 72%, var(--app-surface) 28%) 0%, var(--app-surface-soft) 100%)"
                        : "linear-gradient(180deg, var(--app-surface) 0%, var(--app-surface-soft) 100%)";
                  const titleColor =
                    state === "future"
                      ? "var(--app-text-muted)"
                      : "var(--app-text-primary)";
                  const descColor =
                    state === "future"
                      ? "var(--app-text-muted)"
                      : "var(--app-text-secondary)";
                  const badgeText =
                    state === "completed"
                      ? "已完成"
                      : state === "current"
                        ? "当前阶段"
                        : "未进入";
                  const badgeColor =
                    state === "completed"
                      ? "#22c55e"
                      : state === "current"
                        ? "#3b82f6"
                        : "#94a3b8";
                  const icon =
                    state === "completed" ? (
                      <CheckCircleFilled style={{ color: "#52c41a", fontSize: 18 }} />
                    ) : state === "current" ? (
                      <ClockCircleFilled style={{ color: "#1677ff", fontSize: 18 }} />
                    ) : (
                      <StopFilled style={{ color: "#bfbfbf", fontSize: 18 }} />
                    );

                  return (
                    <div
                      key={item.key}
                      role={clickable ? "button" : undefined}
                      tabIndex={clickable ? 0 : -1}
                      onClick={() => {
                        if (!clickable) {
                          return;
                        }
                        setDetailModalVisible(false);
                        navigateToStageModule(currentProject, item.key, item.target);
                      }}
                      onKeyDown={(event) => {
                        if (!clickable) {
                          return;
                        }
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setDetailModalVisible(false);
                          navigateToStageModule(currentProject, item.key, item.target);
                        }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: 16,
                        border: `1px solid ${borderColor}`,
                        borderRadius: 12,
                        background,
                        cursor: clickable ? "pointer" : "not-allowed",
                        opacity: clickable ? 1 : 0.78,
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div style={{ marginTop: 2 }}>{icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12, color: "#8c8c8c" }}>
                              阶段 {index + 1}
                            </span>
                            <span style={{ fontWeight: 600, color: titleColor }}>
                              {item.title}
                            </span>
                            <Tag
                              color={badgeColor}
                              style={{ marginInlineEnd: 0 }}
                            >
                              {badgeText}
                            </Tag>
                          </div>
                          {clickable ? (
                            <span
                              style={{
                                color: badgeColor,
                                fontSize: 12,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              查看该阶段数据
                              <ArrowRightOutlined />
                            </span>
                          ) : (
                            <span style={{ color: "#bfbfbf", fontSize: 12 }}>
                              未进入该阶段
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 6 }}>
                          {item.key === currentProject.stage
                            ? "当前所在阶段"
                            : state === "completed"
                              ? "已完成阶段"
                              : "后续阶段"}
                        </div>
                        <div style={{ fontSize: 13, color: descColor, marginTop: 6, lineHeight: 1.6 }}>
                          {item.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {currentProject.stage === "lost" && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: 16,
                      border: "1px solid #ffccc7",
                      borderRadius: 12,
                      background: "#fff2f0",
                    }}
                  >
                    <StopFilled style={{ color: "#ff4d4f", fontSize: 18, marginTop: 2 }} />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, color: "#cf1322" }}>
                          丢单终态
                        </span>
                        <Tag color="error" style={{ marginInlineEnd: 0 }}>
                          当前阶段
                        </Tag>
                      </div>
                      <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 6 }}>
                        当前项目已在售前流程中终止，后续阶段不可跳转。
                      </div>
                      <div style={{ fontSize: 13, color: "#595959", marginTop: 6, lineHeight: 1.6 }}>
                        已走过阶段仍可点击回看对应模块数据，未经过的阶段保持禁用。
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
