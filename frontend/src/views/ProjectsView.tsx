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
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import {
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

const LazyProjectDetailModal = lazy(async () => {
  const module = await import("./projects/ProjectDetailModal");
  return { default: module.ProjectDetailModal };
});

const LazyProjectSupportModals = lazy(async () => {
  const module = await import("./projects/ProjectSupportModals");
  return { default: module.ProjectSupportModals };
});

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

      <Suspense fallback={null}>
        <LazyProjectSupportModals
          createProjectOpen={createModalVisible}
          projectForm={form}
          editingCurrentProject={Boolean(currentProject)}
          onCancelProject={() => setCreateModalVisible(false)}
          onSubmitProject={async () => {
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
          budgetModalOpen={budgetModalVisible}
          onCloseBudgetModal={() => setBudgetModalVisible(false)}
          totalBudget={totalBudget}
          inprogressBudget={inprogressBudget}
          completedBudget={completedBudget}
          archivedBudget={archivedBudget}
          createRelatedOpen={createRelatedVisible}
          relatedForm={createRelatedForm}
          onCancelCreateRelated={() => {
            setCreateRelatedVisible(false);
            createRelatedForm.resetFields();
          }}
          onSubmitCreateRelated={async () => {
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
        />
      </Suspense>

      <Suspense fallback={null}>
        <LazyProjectDetailModal
          open={detailModalVisible}
          currentProject={currentProject}
          relatedSortKey={relatedSortKey}
          onRelatedSortKeyChange={setRelatedSortKey}
          canCreateOpportunities={canCreateOpportunities}
          onOpenCreateRelated={() => {
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
          relatedRows={
            currentProject
              ? (() => {
                  const raw = getRelatedRowsForProject(currentProject);
                  return [...raw].sort((a, b) => {
                    if (
                      relatedSortKey === "amount_desc" ||
                      relatedSortKey === "amount_asc"
                    ) {
                      const av = parseAmount(a.amount);
                      const bv = parseAmount(b.amount);
                      return relatedSortKey === "amount_desc" ? bv - av : av - bv;
                    }
                    return b.probability - a.probability;
                  });
                })()
              : []
          }
          relatedColumnsWithActions={relatedColumnsWithActions}
          timelineStages={PROJECT_TIMELINE_STAGES}
          getStageNavigationState={getStageNavigationState}
          navigateToStageModule={(project, stageKey, target) => {
            setDetailModalVisible(false);
            navigateToStageModule(project, stageKey, target);
          }}
          getProjectStageText={getProjectStageText}
          renderStatus={renderStatus}
          renderPriority={renderPriority}
          onClose={() => setDetailModalVisible(false)}
        />
      </Suspense>
    </div>
  );
}
