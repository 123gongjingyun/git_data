import {
  Card,
  Row,
  Col,
  Input,
  Select,
  Button,
  Table,
  Tag,
  Modal,
  Typography,
  message,
  Upload,
  Popover,
  Checkbox,
  Divider,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  loadSharedDemoOpportunities,
  OPPORTUNITY_DEMO_UPDATED_EVENT,
  type DemoOpportunity,
  getSelectableOwnerOptions,
} from "../shared/opportunityDemoData";
import { getProjectNameFromOpportunity } from "../shared/projectNaming";
import {
  deriveSolutionsFromOpportunities,
  mergeByKey,
  type SolutionItem,
} from "../shared/pipelineMock";
import {
  getDefaultTablePreference,
  getVisibleToggleableKeys,
  loadTablePreference,
  normalizeTableWidths,
  ResizableHeaderCell,
  type TableColumnMeta,
  type TablePreference,
} from "../shared/tablePreferences";
import {
  hasActionAccess,
  type CurrentUser,
} from "../shared/auth";
import {
  ensureApprovalInstance,
  executeApprovalAction,
  getStoredAccessToken,
  type ApprovalActionType,
  type ApprovalInstanceActionView,
  type ApprovalInstanceNodeView,
  type ApprovalInstanceView,
} from "../shared/approvalInstances";
import {
  syncSharedOpportunitiesFromApi,
} from "../shared/realOpportunities";
import { buildApiUrl } from "../shared/api";

const { Paragraph, Text } = Typography;

const SOLUTIONS_TABLE_STORAGE_KEY = "solutionsTablePreference";
const SOLUTIONS_OVERRIDE_STORAGE_KEY = "solutionsMockOverrides";
const SOLUTIONS_DELETED_KEYS_STORAGE_KEY = "solutionsDeletedKeys";

const SOLUTIONS_TABLE_COLUMN_META = [
  { key: "index", title: "序号", defaultWidth: 72, minWidth: 72, visibleByDefault: true, locked: true, resizable: false },
  { key: "name", title: "方案名称", defaultWidth: 220, minWidth: 180, visibleByDefault: true, locked: true, resizable: true },
  { key: "project", title: "关联项目", defaultWidth: 220, minWidth: 180, visibleByDefault: true, locked: false, resizable: true },
  { key: "owner", title: "解决方案负责人", defaultWidth: 180, minWidth: 140, visibleByDefault: true, locked: false, resizable: true },
  { key: "version", title: "版本", defaultWidth: 100, minWidth: 90, visibleByDefault: true, locked: false, resizable: true },
  { key: "type", title: "类型", defaultWidth: 120, minWidth: 100, visibleByDefault: true, locked: false, resizable: true },
  { key: "status", title: "审批状态", defaultWidth: 120, minWidth: 100, visibleByDefault: true, locked: false, resizable: true },
  { key: "createdAt", title: "创建时间", defaultWidth: 140, minWidth: 120, visibleByDefault: true, locked: false, resizable: true },
  { key: "actions", title: "操作", defaultWidth: 220, minWidth: 220, visibleByDefault: true, locked: true, resizable: false },
] as const satisfies readonly TableColumnMeta<string>[];

type SolutionColumnKey = (typeof SOLUTIONS_TABLE_COLUMN_META)[number]["key"];

type SolutionWorkflowNodeKey =
  | "tech_review"
  | "business_review"
  | "final_solution_approval";

interface SolutionWorkflowStepMeta {
  key: SolutionWorkflowNodeKey;
  title: string;
  approverLabel: string;
  statusText: string;
  tone: "success" | "warning" | "danger" | "default";
}

function loadStoredList<T>(storageKey: string): T[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredList<T>(storageKey: string, value: T[]) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

function renderStatusTag(status: SolutionItem["status"]) {
  switch (status) {
    case "approved":
      return <Tag color="green">已批准</Tag>;
    case "reviewing":
      return <Tag color="orange">审核中</Tag>;
    case "draft":
      return <Tag>草稿</Tag>;
    case "rejected":
    default:
      return <Tag color="red">已驳回</Tag>;
  }
}

function buildSolutionActions(status: SolutionItem["status"]): string[] {
  if (status === "draft") {
    return ["查看", "下载", "编辑", "审批"];
  }
  if (status === "reviewing") {
    return ["查看", "下载", "审批"];
  }
  return ["查看", "下载", "审批"];
}

interface SolutionsViewProps {
  currentUser?: CurrentUser | null;
  initialProjectKeyword?: string | null;
  onNavigateToProjects?: (projectName?: string) => void;
  onNavigateToOpportunities?: (customerName?: string) => void;
}

interface ApiSolutionVersion {
  id: number;
  name: string;
  versionTag?: string;
  status: string;
  approvalStatus?: string | null;
  createdAt: string;
  createdBy?: {
    username?: string;
    displayName?: string;
  } | null;
}

export function SolutionsView(props: SolutionsViewProps = {}) {
  const {
    currentUser,
    initialProjectKeyword,
    onNavigateToProjects,
    onNavigateToOpportunities,
  } =
    props;
  const canCreateSolutions = hasActionAccess(
    currentUser || null,
    "solution.create",
  );
  const canEditSolutions = hasActionAccess(
    currentUser || null,
    "solution.edit",
  );
  const canDownloadSolutions = hasActionAccess(
    currentUser || null,
    "solution.download",
  );
  const canApproveSolutions = hasActionAccess(
    currentUser || null,
    "solution.approve",
  );
  const canDeleteSolutions = hasActionAccess(
    currentUser || null,
    "solution.delete",
  );
  const [keyword, setKeyword] = useState<string>(
    initialProjectKeyword?.trim() || "",
  );
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  );
  const [sortKey, setSortKey] = useState<"createdAt_desc" | "createdAt_asc">(
    "createdAt_desc",
  );
  const [sharedOpportunities, setSharedOpportunities] = useState<
    DemoOpportunity[]
  >(() => loadSharedDemoOpportunities());
  const [solutionOverrides, setSolutionOverrides] = useState<SolutionItem[]>(
    () => loadStoredList<SolutionItem>(SOLUTIONS_OVERRIDE_STORAGE_KEY),
  );
  const [deletedSolutionKeys, setDeletedSolutionKeys] = useState<string[]>(
    () => loadStoredList<string>(SOLUTIONS_DELETED_KEYS_STORAGE_KEY),
  );
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [activeSolution, setActiveSolution] = useState<SolutionItem | null>(
    null,
  );
  const [approvalOpinionDraft, setApprovalOpinionDraft] = useState("");
  const [solutionApprovalInstance, setSolutionApprovalInstance] =
    useState<ApprovalInstanceView | null>(null);
  const [solutionApprovalLoading, setSolutionApprovalLoading] = useState(false);
  const [solutionApprovalError, setSolutionApprovalError] = useState<string | null>(
    null,
  );
  const [solutionApprovalSource, setSolutionApprovalSource] = useState<
    "api" | "local"
  >("local");
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createDraft, setCreateDraft] = useState<{
    name?: string;
    project?: string;
    owner?: string;
    type?: string;
    fileName?: string;
  }>({});
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewSolution, setViewSolution] = useState<SolutionItem | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [tablePreference, setTablePreference] = useState<
    TablePreference<SolutionColumnKey>
  >(() =>
    loadTablePreference(
      SOLUTIONS_TABLE_STORAGE_KEY,
      SOLUTIONS_TABLE_COLUMN_META,
      true,
    ),
  );
  const [solutionVersionIdMap, setSolutionVersionIdMap] = useState<
    Record<number, number | null>
  >({});
  const [apiSolutions, setApiSolutions] = useState<SolutionItem[] | null>(null);

  const mapApiSolutionStatus = (
    solution: ApiSolutionVersion,
  ): SolutionItem["status"] => {
    if (
      solution.status === "approved" ||
      solution.approvalStatus === "approved"
    ) {
      return "approved";
    }
    if (
      solution.status === "rejected" ||
      solution.approvalStatus === "rejected"
    ) {
      return "rejected";
    }
    if (
      solution.status === "in_review" ||
      solution.approvalStatus === "pending" ||
      solution.approvalStatus === "in_review"
    ) {
      return "reviewing";
    }
    return "draft";
  };

  const mapApiSolutionToItem = (
    opportunity: DemoOpportunity,
    solution: ApiSolutionVersion,
  ): SolutionItem => {
    const status = mapApiSolutionStatus(solution);
    const projectName = getProjectNameFromOpportunity(opportunity);
    const ownerLabel =
      solution.createdBy?.displayName ||
      solution.createdBy?.username ||
      getSelectableOwnerOptions().find(
        (item) => item.value === opportunity.solutionOwnerUsername,
      )?.label ||
      getSelectableOwnerOptions().find(
        (item) => item.value === opportunity.ownerUsername,
      )?.label ||
      "待分配";

    return {
      key: `solution-${opportunity.id}-${solution.id}`,
      opportunityId: opportunity.id,
      solutionVersionId: solution.id,
      name: solution.name,
      project: projectName,
      owner: ownerLabel,
      version: solution.versionTag || `v${solution.id}.0`,
      type:
        (opportunity.stage || "") === "bidding" ? "投标方案" : "解决方案",
      status,
      createdAt: solution.createdAt.slice(0, 10),
      actions: buildSolutionActions(status),
      fileName:
        opportunity.researchDocName ||
        opportunity.requirementBriefDocName ||
        `${projectName}_解决方案.docx`,
    };
  };

  const loadApiBackedSolutions = async (opportunities: DemoOpportunity[]) => {
    const token = getStoredAccessToken();
    if (!token || opportunities.length === 0) {
      return;
    }

    try {
      const groups = await Promise.all(
        opportunities.map(async (opportunity) => {
          try {
            const response = await fetch(
              buildApiUrl(`/opportunities/${opportunity.id}/solutions`),
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );
            if (!response.ok) {
              return [] as SolutionItem[];
            }
            const data = (await response.json()) as ApiSolutionVersion[];
            return Array.isArray(data)
              ? data.map((item) => mapApiSolutionToItem(opportunity, item))
              : [];
          } catch {
            return [] as SolutionItem[];
          }
        }),
      );

      const flattened = groups.flat();
      setApiSolutions(flattened);
      setSolutionVersionIdMap(
        flattened.reduce<Record<number, number | null>>((acc, item) => {
          if (typeof item.opportunityId === "number") {
            acc[item.opportunityId] = item.solutionVersionId ?? null;
          }
          return acc;
        }, {}),
      );
    } catch {
      setApiSolutions(null);
    }
  };

  const loadApiBackedData = async () => {
    const nextOpportunities =
      (await syncSharedOpportunitiesFromApi()) || loadSharedDemoOpportunities();
    setSharedOpportunities(nextOpportunities);
    await loadApiBackedSolutions(nextOpportunities);
  };

  const listRef = useRef<HTMLDivElement | null>(null);
  const baseSolutions =
    apiSolutions ?? deriveSolutionsFromOpportunities(sharedOpportunities);
  const baseSolutionKeys = new Set(baseSolutions.map((item) => item.key));
  const solutions = mergeByKey(baseSolutions, solutionOverrides).filter(
    (item) => !deletedSolutionKeys.includes(item.key),
  );

  const getApiApprovalActionLabel = (
    action: ApprovalInstanceActionView,
    node?: ApprovalInstanceNodeView | null,
  ) => {
    if (action.actionType === "reject") {
      return "审批驳回";
    }
    if (action.actionType === "approve") {
      return "审批通过";
    }
    if (action.actionType === "upload") {
      return "上传材料";
    }
    if (action.actionType === "assign") {
      return "分配处理人";
    }
    return node?.nodeType === "approval" ? "提交审批" : "提交处理";
  };

  const updateSolutionState = (
    key: string,
    updater: (item: SolutionItem) => SolutionItem,
  ) => {
    setSolutionOverrides((prev) => {
      const existing = prev.find((item) => item.key === key);
      if (existing) {
        return prev.map((item) => (item.key === key ? updater(item) : item));
      }
      const base = solutions.find((item) => item.key === key);
      if (!base) {
        return prev;
      }
      return [updater(base), ...prev];
    });
    setActiveSolution((prev) => (prev && prev.key === key ? updater(prev) : prev));
  };

  const syncSolutionFromApprovalInstance = (
    solution: SolutionItem,
    instance: ApprovalInstanceView,
    solutionVersionId?: number | null,
  ) => {
    const nextStatus: SolutionItem["status"] =
      instance.status === "approved"
        ? "approved"
        : instance.status === "rejected"
          ? "rejected"
          : "reviewing";
    updateSolutionState(solution.key, (item) => ({
      ...item,
      status: nextStatus,
      actions: buildSolutionActions(nextStatus),
      solutionVersionId: solutionVersionId ?? item.solutionVersionId,
    }));
  };

  const resolveOpportunityIdFromSolution = (solution: SolutionItem) => {
    if (typeof solution.opportunityId === "number") {
      return solution.opportunityId;
    }
    const match = solution.key.match(/solution-(\d+)/);
    return match ? Number(match[1]) : null;
  };

  const resolveSolutionVersionId = async (solution: SolutionItem) => {
    if (typeof solution.solutionVersionId === "number") {
      return solution.solutionVersionId;
    }
    const opportunityId = resolveOpportunityIdFromSolution(solution);
    if (!opportunityId) {
      return null;
    }
    if (Object.prototype.hasOwnProperty.call(solutionVersionIdMap, opportunityId)) {
      return solutionVersionIdMap[opportunityId];
    }
    const token = getStoredAccessToken();
    if (!token) {
      return null;
    }
    try {
      const response = await fetch(
        buildApiUrl(`/opportunities/${opportunityId}/solutions`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!response.ok) {
        setSolutionVersionIdMap((prev) => ({ ...prev, [opportunityId]: null }));
        return null;
      }
      const data = (await response.json()) as ApiSolutionVersion[];
      const solutionVersionId = Array.isArray(data) && data.length > 0 ? data[0].id : null;
      setSolutionVersionIdMap((prev) => ({
        ...prev,
        [opportunityId]: solutionVersionId,
      }));
      if (solutionVersionId) {
        updateSolutionState(solution.key, (item) => ({
          ...item,
          solutionVersionId,
        }));
      }
      return solutionVersionId;
    } catch {
      setSolutionVersionIdMap((prev) => ({ ...prev, [opportunityId]: null }));
      return null;
    }
  };

  const openSolutionApprovalModal = async (solution: SolutionItem) => {
    setActiveSolution(solution);
    setApprovalOpinionDraft("");
    setApprovalModalVisible(true);
    setSolutionApprovalSource("local");
    setSolutionApprovalInstance(null);
    setSolutionApprovalError(null);

    const token = getStoredAccessToken();
    if (!token) {
      return;
    }

    setSolutionApprovalLoading(true);
    try {
      const solutionVersionId = await resolveSolutionVersionId(solution);
      if (!solutionVersionId) {
        setSolutionApprovalSource("local");
        setSolutionApprovalError(
          "当前商机关联的真实方案版本尚未就绪，暂时回退到前端演示审批链路。",
        );
        return;
      }
      const instance = await ensureApprovalInstance("solution", solutionVersionId, token);
      setSolutionApprovalInstance(instance);
      setSolutionApprovalSource("api");
      setSolutionApprovalError(null);
      syncSolutionFromApprovalInstance(solution, instance, solutionVersionId);
    } catch (error) {
      setSolutionApprovalSource("local");
      setSolutionApprovalInstance(null);
      setSolutionApprovalError(
        error instanceof Error
          ? `${error.message}，当前回退到前端演示审批链路。`
          : "方案审批实例加载失败，当前回退到前端演示审批链路。",
      );
    } finally {
      setSolutionApprovalLoading(false);
    }
  };

  const executeSolutionApproval = async (
    solution: SolutionItem,
    actionType: ApprovalActionType,
  ) => {
    if (!solutionApprovalInstance) {
      return false;
    }
    const token = getStoredAccessToken();
    if (!token) {
      message.warning("当前登录态已失效，请重新登录后再试。");
      return false;
    }
    try {
      const instance = await executeApprovalAction(
        solutionApprovalInstance.id,
        {
          actionType,
          comment: approvalOpinionDraft.trim() || undefined,
        },
        token,
      );
      setSolutionApprovalInstance(instance);
      setSolutionApprovalSource("api");
      setSolutionApprovalError(null);
      syncSolutionFromApprovalInstance(
        solution,
        instance,
        solution.solutionVersionId ?? null,
      );
      if (instance.status === "approved" || instance.status === "rejected") {
        setApprovalModalVisible(false);
        setApprovalOpinionDraft("");
      }
      return true;
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "方案审批提交失败，请稍后重试。",
      );
      return false;
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const handleUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<DemoOpportunity[]>;
      if (Array.isArray(customEvent.detail)) {
        setSharedOpportunities(customEvent.detail);
        void loadApiBackedSolutions(customEvent.detail);
        return;
      }
      const latest = loadSharedDemoOpportunities();
      setSharedOpportunities(latest);
      void loadApiBackedSolutions(latest);
    };
    window.addEventListener(OPPORTUNITY_DEMO_UPDATED_EVENT, handleUpdated);
    return () => {
      window.removeEventListener(OPPORTUNITY_DEMO_UPDATED_EVENT, handleUpdated);
    };
  }, []);

  useEffect(() => {
    void loadApiBackedData();
  }, []);

  useEffect(() => {
    setKeyword(initialProjectKeyword?.trim() || "");
  }, [initialProjectKeyword]);

  const totalCount = solutions.length;
  const reviewingCount = solutions.filter((s) => s.status === "reviewing")
    .length;
  const approvedCount = solutions.filter((s) => s.status === "approved").length;
  const draftCount = solutions.filter((s) => s.status === "draft").length;

  const getSolutionWorkflowSteps = (
    solution: SolutionItem | null,
  ): SolutionWorkflowStepMeta[] => {
    const status = solution?.status || "draft";
    if (status === "approved") {
      return [
        {
          key: "tech_review",
          title: "技术评审",
          approverLabel: "解决方案负责人",
          statusText: "已通过",
          tone: "success",
        },
        {
          key: "business_review",
          title: "商务评审",
          approverLabel: "经理",
          statusText: "已通过",
          tone: "success",
        },
        {
          key: "final_solution_approval",
          title: "最终审批",
          approverLabel: "管理员",
          statusText: "已通过",
          tone: "success",
        },
      ];
    }
    if (status === "rejected") {
      return [
        {
          key: "tech_review",
          title: "技术评审",
          approverLabel: "解决方案负责人",
          statusText: "已通过",
          tone: "success",
        },
        {
          key: "business_review",
          title: "商务评审",
          approverLabel: "经理",
          statusText: "已驳回",
          tone: "danger",
        },
        {
          key: "final_solution_approval",
          title: "最终审批",
          approverLabel: "管理员",
          statusText: "未开始",
          tone: "default",
        },
      ];
    }
    if (status === "reviewing") {
      return [
        {
          key: "tech_review",
          title: "技术评审",
          approverLabel: "解决方案负责人",
          statusText: "已通过",
          tone: "success",
        },
        {
          key: "business_review",
          title: "商务评审",
          approverLabel: "经理",
          statusText: "进行中",
          tone: "warning",
        },
        {
          key: "final_solution_approval",
          title: "最终审批",
          approverLabel: "管理员",
          statusText: "待开始",
          tone: "default",
        },
      ];
    }
    return [
      {
        key: "tech_review",
        title: "技术评审",
        approverLabel: "解决方案负责人",
        statusText: "待开始",
        tone: "warning",
      },
      {
        key: "business_review",
        title: "商务评审",
        approverLabel: "经理",
        statusText: "未开始",
        tone: "default",
      },
      {
        key: "final_solution_approval",
        title: "最终审批",
        approverLabel: "管理员",
        statusText: "未开始",
        tone: "default",
      },
    ];
  };

  const apiSolutionWorkflowSteps = useMemo(() => {
    if (!solutionApprovalInstance) {
      return [] as SolutionWorkflowStepMeta[];
    }
    return [...solutionApprovalInstance.nodes]
      .sort((a, b) => a.nodeOrder - b.nodeOrder)
      .map((node) => {
        const approverLabel = node.approvers
          .flatMap((item) => item.resolvedUsers)
          .map((user) => user.displayName || user.username)
          .join(" / ");
        return {
          key: (node.nodeKey || `node_${node.nodeOrder}`) as SolutionWorkflowNodeKey,
          title: node.nodeName,
          approverLabel: approverLabel || "待配置",
          statusText:
            node.status === "approved"
              ? "已通过"
              : node.status === "rejected"
                ? "已驳回"
                : node.status === "in_progress"
                  ? "进行中"
                  : node.status === "skipped"
                    ? "已跳过"
                    : "未开始",
          tone:
            node.status === "approved"
              ? "success"
              : node.status === "rejected"
                ? "danger"
                : node.status === "in_progress"
                  ? "warning"
                  : "default",
        };
      });
  }, [solutionApprovalInstance]);

  const getCurrentPendingSolutionNodeKey = (
    solution: SolutionItem | null,
  ): SolutionWorkflowNodeKey | null => {
    if (solutionApprovalInstance?.currentNode?.nodeKey) {
      return solutionApprovalInstance.currentNode.nodeKey as SolutionWorkflowNodeKey;
    }
    if (!solution) {
      return null;
    }
    if (solution.status === "draft") {
      return "tech_review";
    }
    if (solution.status === "reviewing") {
      return "business_review";
    }
    return null;
  };

  const canHandleCurrentSolutionNode = (solution: SolutionItem | null) => {
    if (solutionApprovalInstance) {
      return solutionApprovalInstance.canCurrentUserHandleCurrentNode;
    }
    const nodeKey = getCurrentPendingSolutionNodeKey(solution);
    if (!nodeKey || !solution || !currentUser || !canApproveSolutions) {
      return false;
    }
    if (nodeKey === "tech_review") {
      return Boolean(
        solution.owner.includes(currentUser.username) ||
          (currentUser.displayName &&
            solution.owner.includes(currentUser.displayName)) ||
          currentUser.role === "pre_sales_engineer",
      );
    }
    if (nodeKey === "business_review") {
      return currentUser.role === "manager";
    }
    return currentUser.role === "admin";
  };

  const getCurrentSolutionNodeDisabledReason = (
    solution: SolutionItem | null,
  ) => {
    if (solutionApprovalInstance) {
      const currentNode = solutionApprovalInstance.currentNode;
      if (!currentNode) {
        return "当前方案无待处理审批节点。";
      }
      if (solutionApprovalInstance.canCurrentUserHandleCurrentNode) {
        return "";
      }
      const approverLabel = currentNode.approvers
        .flatMap((item) => item.resolvedUsers)
        .map((user) => user.displayName || user.username)
        .join(" / ");
      return `当前节点待 ${approverLabel || "指定责任人"} 处理。`;
    }
    const nodeKey = getCurrentPendingSolutionNodeKey(solution);
    if (!solution || !nodeKey) {
      return "当前方案无待处理审批节点。";
    }
    if (!currentUser) {
      return "当前账号未登录，无法处理审批节点。";
    }
    if (!canApproveSolutions) {
      return "当前账号没有方案审批权限。";
    }
    if (nodeKey === "tech_review") {
      return "当前节点待解决方案负责人处理。";
    }
    if (nodeKey === "business_review") {
      return "当前节点待经理处理。";
    }
    return "当前节点待管理员处理。";
  };

  const solutionWorkflowSteps =
    solutionApprovalSource === "api" && apiSolutionWorkflowSteps.length > 0
      ? apiSolutionWorkflowSteps
      : getSolutionWorkflowSteps(activeSolution);
  const currentPendingSolutionNodeKey =
    getCurrentPendingSolutionNodeKey(activeSolution);
  const canApproveCurrentSolutionNode =
    canHandleCurrentSolutionNode(activeSolution);
  const currentSolutionNodeDisabledReason =
    getCurrentSolutionNodeDisabledReason(activeSolution);

  const filteredSolutions = solutions.filter((s) => {
    if (statusFilter && statusFilter.length > 0) {
      if (s.status !== statusFilter) {
        return false;
      }
    }
    if (keyword && keyword.trim().length > 0) {
      const k = keyword.trim().toLowerCase();
      const name = s.name.toLowerCase();
      const project = s.project.toLowerCase();
      if (!name.includes(k) && !project.includes(k)) {
        return false;
      }
    }
    return true;
  });

  const sortedSolutions = [...filteredSolutions].sort((a, b) => {
    const at = new Date(a.createdAt).getTime();
    const bt = new Date(b.createdAt).getTime();
    if (sortKey === "createdAt_asc") {
      return at - bt;
    }
    return bt - at;
  });
  const paginatedSolutions = sortedSolutions.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  useEffect(() => {
    setPage(1);
  }, [keyword, statusFilter, sortKey]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(sortedSolutions.length / pageSize));
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [sortedSolutions.length, page, pageSize]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(
        SOLUTIONS_TABLE_STORAGE_KEY,
        JSON.stringify(tablePreference),
      );
    } catch {
      // ignore storage errors
    }
  }, [tablePreference]);

  useEffect(() => {
    saveStoredList(SOLUTIONS_OVERRIDE_STORAGE_KEY, solutionOverrides);
  }, [solutionOverrides]);

  useEffect(() => {
    saveStoredList(SOLUTIONS_DELETED_KEYS_STORAGE_KEY, deletedSolutionKeys);
  }, [deletedSolutionKeys]);

  const handleDeleteSolution = (record: SolutionItem) => {
    if (!canDeleteSolutions) {
      message.warning("当前账号无权删除方案。");
      return;
    }
    Modal.confirm({
      title: `确认删除方案「${record.name}」？`,
      content: "删除后该方案将从当前列表移除，仅影响当前前端数据。",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: () => {
        setSolutionOverrides((prev) => prev.filter((item) => item.key !== record.key));
        if (baseSolutionKeys.has(record.key)) {
          setDeletedSolutionKeys((prev) =>
            prev.includes(record.key) ? prev : [record.key, ...prev],
          );
        } else {
          setDeletedSolutionKeys((prev) =>
            prev.filter((item) => item !== record.key),
          );
        }
        message.success("已删除方案");
      },
    });
  };

  const allColumns: ColumnsType<SolutionItem> = [
    {
      title: "序号",
      key: "index",
      width: 72,
      render: (_: unknown, __: SolutionItem, index: number) =>
        (page - 1) * pageSize + index + 1,
    },
    {
      title: "方案名称",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "关联项目",
      dataIndex: "project",
      key: "project",
      render: (text: string, record) => (
        <Button
          type="link"
          size="small"
          style={{ padding: 0 }}
          onClick={() => {
            // 关联项目点击：跳转到项目管理并按项目名称过滤
            onNavigateToProjects?.(record.project);
          }}
        >
          {text}
        </Button>
      ),
    },
    {
      title: "解决方案负责人",
      dataIndex: "owner",
      key: "owner",
    },
    {
      title: "版本",
      dataIndex: "version",
      key: "version",
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
    },
    {
      title: "审批状态",
      dataIndex: "status",
      key: "status",
      render: (status: SolutionItem["status"]) => renderStatusTag(status),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
    },
    {
      title: "操作",
      key: "actions",
      render: (_, record) => (
        <>
          {record.actions.map((label) => (
            <Button
              key={label}
              type="link"
              size="small"
              onClick={() => {
                if (label === "审批") {
                  if (!canApproveSolutions) {
                    message.warning("当前账号无权审批方案。");
                  }
                  void openSolutionApprovalModal(record);
                  return;
                }
                if (label === "查看") {
                  setViewSolution(record);
                  setViewModalVisible(true);
                  return;
                }
                if (label === "下载") {
                  if (!canDownloadSolutions) {
                    message.warning("当前账号无权下载方案。");
                    return;
                  }
                  if (record.fileName) {
                    message.success(
                      `已开始下载方案文件：${record.fileName}`,
                    );
                  } else {
                    message.info(
                      `当前方案暂未上传文件，可通过“新建方案”或后续上传入口补充文件。`,
                    );
                  }
                  return;
                }
                if (label === "编辑" && !canEditSolutions) {
                  message.warning("当前账号无权编辑方案。");
                  return;
                }
                message.info(`解决方案操作：${label} - ${record.name}`);
              }}
            >
              {label}
            </Button>
          ))}
          <Button
            type="link"
            size="small"
            danger
            disabled={!canDeleteSolutions}
            onClick={() => handleDeleteSolution(record)}
          >
            删除
          </Button>
        </>
      ),
    },
  ];

  const selectedToggleableColumnKeys = getVisibleToggleableKeys(
    SOLUTIONS_TABLE_COLUMN_META,
    tablePreference.visibleColumnKeys,
  );
  const columnOptions = SOLUTIONS_TABLE_COLUMN_META.filter(
    (item) => !item.locked,
  ).map((item) => ({ value: item.key, label: item.title }));
  const columns = allColumns
    .filter((column) =>
      tablePreference.visibleColumnKeys.includes(
        String(column.key || column.dataIndex || "") as SolutionColumnKey,
      ),
    )
    .map((column) => {
      const key = String(column.key || column.dataIndex || "") as SolutionColumnKey;
      const meta = SOLUTIONS_TABLE_COLUMN_META.find((item) => item.key === key);
      const width = tablePreference.columnWidths[key] || meta?.defaultWidth;
      return {
        ...column,
        width,
        onHeaderCell: () => ({
          width,
          minWidth: meta?.minWidth,
          resizable: meta?.resizable,
          onResizeWidth: (nextWidth: number) => {
            setTablePreference((prev) => ({
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
  const tableScrollX = columns.reduce((sum, column) => {
    const width = typeof column.width === "number" ? column.width : 120;
    return sum + width;
  }, 0);
  const updateVisibleColumns = (nextKeys: SolutionColumnKey[]) => {
    const lockedKeys = SOLUTIONS_TABLE_COLUMN_META.filter(
      (item) => item.locked,
    ).map((item) => item.key);
    const visibleColumnKeys = Array.from(new Set([...lockedKeys, ...nextKeys]));
    setTablePreference((prev) => ({
      ...prev,
      visibleColumnKeys,
      columnWidths: normalizeTableWidths(
        SOLUTIONS_TABLE_COLUMN_META,
        visibleColumnKeys,
        prev.columnWidths,
      ),
    }));
  };
  const columnSettingContent = (
    <div style={{ width: 280 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>显示列</div>
      <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 12 }}>
        勾选需要展示的解决方案列表列。
      </div>
      <Checkbox.Group
        style={{ width: "100%" }}
        value={selectedToggleableColumnKeys}
        onChange={(value) => updateVisibleColumns(value as SolutionColumnKey[])}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {columnOptions.map((item) => (
            <label key={item.value} style={{ minHeight: 32, display: "flex", alignItems: "center" }}>
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
            setTablePreference((prev) => ({
              visibleColumnKeys: SOLUTIONS_TABLE_COLUMN_META.map((item) => item.key),
              columnWidths: normalizeTableWidths(
                SOLUTIONS_TABLE_COLUMN_META,
                SOLUTIONS_TABLE_COLUMN_META.map((item) => item.key),
                prev.columnWidths,
              ),
            }));
          }}
        >
          显示全部
        </Button>
        <Button
          size="small"
          onClick={() =>
            setTablePreference(
              getDefaultTablePreference(SOLUTIONS_TABLE_COLUMN_META, true),
            )
          }
        >
          恢复默认
        </Button>
      </div>
    </div>
  );

  const compactStatCardStyle = {
    borderRadius: 16,
    border: "1px solid var(--app-border)",
    boxShadow: "var(--app-shadow)",
  };
  const filterToolbarStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap" as const,
  };
  const filterGroupStyle = {
    display: "flex",
    gap: 12,
    flexWrap: "wrap" as const,
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
            placeholder="搜索方案..."
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
              { value: "draft", label: "草稿" },
              { value: "reviewing", label: "审核中" },
              { value: "approved", label: "已批准" },
              { value: "rejected", label: "已驳回" },
            ]}
          />
          <Select
            size="middle"
            style={{ width: 220 }}
            value={sortKey}
            onChange={(value) =>
              setSortKey(value as "createdAt_desc" | "createdAt_asc")
            }
            options={[
              {
                value: "createdAt_desc",
                label: "按创建时间（最新在前）",
              },
              {
                value: "createdAt_asc",
                label: "按创建时间（最早在前）",
              },
            ]}
          />
        </div>
        <Button
          type="primary"
          disabled={!canCreateSolutions}
          onClick={() => {
            if (!canCreateSolutions) {
              message.warning("当前账号无权新建方案。");
              return;
            }
            setCreateDraft({});
            setCreateModalVisible(true);
          }}
        >
          + 新建方案
        </Button>
        </div>
      </Card>

      {/* 统计卡片：方案总数 / 审核中 / 已批准 / 草稿 */}
      <Row gutter={[14, 14]}>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            bodyStyle={{ padding: "14px 16px" }}
            onClick={() => {
              // 清空状态筛选，查看全部方案
              setStatusFilter(undefined);
              if (listRef.current) {
                listRef.current.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6, color: "#1890ff" }}>
              🎯
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {totalCount}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>方案总数</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            bodyStyle={{ padding: "14px 16px" }}
            onClick={() => {
              setStatusFilter("reviewing");
              if (listRef.current) {
                listRef.current.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6, color: "#fa8c16" }}>
              ⏳
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {reviewingCount}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>审核中</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            bodyStyle={{ padding: "14px 16px" }}
            onClick={() => {
              setStatusFilter("approved");
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
              {approvedCount}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>已批准</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            bodyStyle={{ padding: "14px 16px" }}
            onClick={() => {
              setStatusFilter("draft");
              if (listRef.current) {
                listRef.current.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6, color: "#8c8c8c" }}>
              📝
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {draftCount}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>草稿</div>
          </Card>
        </Col>
      </Row>

      {/* 解决方案列表 */}
      <div ref={listRef}>
      <Card
        style={compactStatCardStyle}
        bodyStyle={{ padding: 12 }}
        title="解决方案列表"
        extra={
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <Popover trigger="click" placement="bottomRight" content={columnSettingContent}>
              <Button size="small">
                列设置（{selectedToggleableColumnKeys.length}/{columnOptions.length}）
              </Button>
            </Popover>
          </div>
        }
      >
        <Table<SolutionItem>
          size="small"
          components={{ header: { cell: ResizableHeaderCell } }}
          scroll={{ x: tableScrollX }}
          pagination={{
            current: page,
            pageSize,
            total: sortedSolutions.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
          }}
          rowKey="key"
          dataSource={paginatedSolutions}
          columns={columns}
        />
      </Card>
      </div>

      {/* 新建方案（Mock） */}
      <Modal
        title="新建方案"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          setCreateDraft({});
        }}
        onOk={() => {
          const name = (createDraft.name || "").trim();
          const project = (createDraft.project || "").trim();
          if (!name) {
            message.error("请输入方案名称");
            return;
          }
          if (!project) {
            message.error("请输入关联项目");
            return;
          }
          const now = new Date();
          const createdAt = now.toISOString().slice(0, 10);
          const newItem: SolutionItem = {
            key: `solution-manual-${Date.now()}`,
            name,
            project,
            owner: createDraft.owner || "标准售前（presales_demo）",
            version: "v1.0",
            type: createDraft.type || "技术方案",
            status: "draft",
            createdAt,
            actions: buildSolutionActions("draft"),
            fileName: createDraft.fileName,
          };
          setSolutionOverrides((prev) => [newItem, ...prev]);
          message.success("已创建方案");
          setCreateDraft({});
          setCreateModalVisible(false);
        }}
        okText="保存方案"
        cancelText="取消"
        destroyOnClose
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <Text>方案名称</Text>
            <Input
              style={{ marginTop: 4 }}
              placeholder="例如：某行业统一安全接入方案"
              value={createDraft.name}
              onChange={(e) =>
                setCreateDraft((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>
          <div>
            <Text>关联项目</Text>
            <Input
              style={{ marginTop: 4 }}
              placeholder="例如：某银行数字化转型项目"
              value={createDraft.project}
              onChange={(e) =>
                setCreateDraft((prev) => ({ ...prev, project: e.target.value }))
              }
            />
          </div>
          <div>
            <Text>解决方案负责人</Text>
            <Select
              allowClear
              style={{ marginTop: 4, width: "100%" }}
              placeholder="请选择售前负责人"
              value={createDraft.owner}
              onChange={(value) =>
                setCreateDraft((prev) => ({ ...prev, owner: value || undefined }))
              }
              options={getSelectableOwnerOptions("presales").map((item) => ({
                value: item.label,
                label: item.label,
              }))}
            />
          </div>
          <div>
            <Text>方案类型</Text>
            <Select
              allowClear
              style={{ marginTop: 4, width: "100%" }}
              placeholder="请选择方案类型"
              value={createDraft.type}
              onChange={(value) =>
                setCreateDraft((prev) => ({ ...prev, type: value || undefined }))
              }
              options={[
                { value: "技术方案", label: "技术方案" },
                { value: "解决方案", label: "解决方案" },
                { value: "投标方案", label: "投标方案" },
              ]}
            />
          </div>
          <div>
            <Text>上传方案文件</Text>
            <div style={{ marginTop: 4 }}>
              <Upload
                showUploadList={false}
                beforeUpload={(file) => {
                  setCreateDraft((prev) => ({ ...prev, fileName: file.name }));
                  message.success(`已选择方案文件：${file.name}`);
                  return false; // 阻止真实上传
                }}
              >
                <Button size="small">选择文件</Button>
              </Upload>
              {createDraft.fileName && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: "#595959",
                  }}
                >
                  当前文件：{createDraft.fileName}
                </div>
              )}
            </div>
            <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
              当前仅记录文件名，后续接入后端后可替换为真实文件上传与下载。
            </Paragraph>
          </div>
        </div>
      </Modal>

      {/* 查看方案详情（简要信息） */}
      <Modal
        title={viewSolution ? `方案详情：${viewSolution.name}` : "方案详情"}
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setViewSolution(null);
        }}
        footer={
          <Button
            type="primary"
            onClick={() => {
              setViewModalVisible(false);
              setViewSolution(null);
            }}
          >
            关闭
          </Button>
        }
      >
        {viewSolution && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <Text type="secondary">关联项目</Text>
              <div>{viewSolution.project}</div>
            </div>
            <div>
              <Text type="secondary">解决方案负责人</Text>
              <div>{viewSolution.owner}</div>
            </div>
            <div>
              <Text type="secondary">版本</Text>
              <div>{viewSolution.version}</div>
            </div>
            <div>
              <Text type="secondary">类型</Text>
              <div>{viewSolution.type}</div>
            </div>
            <div>
              <Text type="secondary">审批状态</Text>
              <div>{renderStatusTag(viewSolution.status)}</div>
            </div>
            <div>
              <Text type="secondary">创建时间</Text>
              <div>{viewSolution.createdAt}</div>
            </div>
            <div>
              <Text type="secondary">方案文件</Text>
              <div>
                {viewSolution.fileName || "尚未上传方案文件"}
              </div>
            </div>
            <div>
              <Text type="secondary">审批过程</Text>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                {getSolutionWorkflowSteps(viewSolution).map((step, index) => (
                  <div
                    key={`view_solution_step_${step.key}`}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid var(--app-border)",
                      background: "var(--app-surface-soft)",
                    }}
                  >
                    <div style={{ fontWeight: 500, color: "var(--app-text-primary)" }}>
                      {index + 1}. {step.title}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--app-text-secondary)" }}>
                      处理人：{step.approverLabel}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--app-text-secondary)" }}>
                      状态：{step.statusText}
                    </div>
                  </div>
                ))}
                <Button
                  size="small"
                  style={{ alignSelf: "flex-start" }}
                  onClick={() => {
                    setViewModalVisible(false);
                    void openSolutionApprovalModal(viewSolution);
                  }}
                >
                  查看完整审批流程
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 方案审批流程模态框（复刻 demo.html） */}
      <Modal
        title="方案审批流程"
        open={approvalModalVisible}
        onCancel={() => {
          setApprovalModalVisible(false);
          setSolutionApprovalInstance(null);
          setSolutionApprovalError(null);
          setSolutionApprovalSource("local");
        }}
        footer={null}
        width={720}
      >
        <div style={{ marginBottom: 24 }}>
          <Typography.Title level={4} style={{ marginBottom: 16 }}>
            {activeSolution?.name || "某银行数字化转型方案 v2.1"}
          </Typography.Title>
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 12,
              background:
                "linear-gradient(180deg, color-mix(in srgb, rgba(59,130,246,0.12) 58%, var(--app-surface) 42%) 0%, var(--app-surface-soft) 100%)",
              border: "1px solid var(--app-border)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
                gap: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--app-text-primary)",
                }}
              >
                当前方案审批节点：
                {solutionWorkflowSteps.find(
                  (item) => item.key === currentPendingSolutionNodeKey,
                )?.title || "已完成 / 无待处理节点"}
              </Text>
              <Text
                type="secondary"
                style={{ fontSize: 12, color: "var(--app-text-secondary)" }}
              >
                流程来源：
                {solutionApprovalSource === "api"
                  ? "后端真实审批实例"
                  : "前端演示链路"}
              </Text>
            </div>
            <Text
              type="secondary"
              style={{ fontSize: 12, color: "var(--app-text-secondary)" }}
            >
              流程按节点责任人逐步流转。所有成员均可查看流程进度与历史记录，仅当前节点处理人可执行上传、分配、通过或驳回。
            </Text>
            {solutionApprovalLoading && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#2563eb" }}>
                正在加载真实审批实例...
              </div>
            )}
            {solutionApprovalError && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#d46b08" }}>
                {solutionApprovalError}
              </div>
            )}
            {!canApproveCurrentSolutionNode && activeSolution && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: "#d46b08",
                }}
              >
                {currentSolutionNodeDisabledReason}
              </div>
            )}
          </div>
          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            {solutionWorkflowSteps.map((step, index) => {
              const accentColor =
                step.tone === "success"
                  ? "#52c41a"
                  : step.tone === "warning"
                    ? "#fa8c16"
                    : step.tone === "danger"
                      ? "#f5222d"
                      : "#d9d9d9";
              const borderColor =
                step.tone === "default"
                  ? "var(--app-border)"
                  : `color-mix(in srgb, ${accentColor} 26%, var(--app-border) 74%)`;
              const background =
                step.tone === "default"
                  ? "linear-gradient(135deg, var(--app-surface-soft) 0%, var(--app-surface) 100%)"
                  : `linear-gradient(135deg, color-mix(in srgb, ${accentColor} 10%, var(--app-surface) 90%) 0%, var(--app-surface-soft) 100%)`;
              return (
                <div
                  key={step.key}
                  style={{
                    flex: 1,
                    minWidth: 180,
                    padding: 12,
                    borderRadius: 10,
                    border: `1px solid ${borderColor}`,
                    background,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: accentColor,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 500,
                      fontSize: 14,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, color: "var(--app-text-primary)" }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: 12, color: accentColor }}>
                      {step.statusText}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--app-text-secondary)",
                        marginTop: 2,
                      }}
                    >
                      处理人：{step.approverLabel}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 审批记录 */}
        <div style={{ marginBottom: 24 }}>
          <Typography.Title level={5} style={{ marginBottom: 12 }}>
            审批记录
          </Typography.Title>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {solutionApprovalSource === "api" && solutionApprovalInstance ? (
              <>
                {solutionApprovalInstance.actions.length === 0 && (
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      border: "1px solid var(--app-border)",
                      background: "var(--app-surface-soft)",
                      color: "var(--app-text-secondary)",
                    }}
                  >
                    当前暂无审批记录，待首个节点处理后自动生成。
                  </div>
                )}
                {[...solutionApprovalInstance.actions]
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .map((record) => {
                    const accentColor =
                      record.actionType === "approve"
                        ? "#52c41a"
                        : record.actionType === "reject"
                          ? "#f5222d"
                          : "#fa8c16";
                    return (
                      <div
                        key={`solution_action_${record.id}`}
                        style={{
                          padding: 12,
                          background: `linear-gradient(135deg, color-mix(in srgb, ${accentColor} 10%, var(--app-surface) 90%) 0%, var(--app-surface-soft) 100%)`,
                          borderRadius: 10,
                          border: `1px solid color-mix(in srgb, ${accentColor} 26%, var(--app-border) 74%)`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 4,
                          }}
                        >
                          <strong>
                            {record.operator?.displayName ||
                              record.operator?.username ||
                              "系统"}
                          </strong>
                          <span style={{ fontSize: 12, color: "var(--app-text-secondary)" }}>
                            {new Date(record.createdAt).toLocaleString("zh-CN")}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: accentColor }}>
                          {record.nodeName || "审批动作"} ·{" "}
                          {getApiApprovalActionLabel(
                            record,
                            solutionApprovalInstance.nodes.find(
                              (item) => item.id === record.approvalInstanceNodeId,
                            ) || null,
                          )}
                        </div>
                        {record.comment && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--app-text-secondary)",
                              marginTop: 4,
                            }}
                          >
                            {record.comment}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </>
            ) : (
              <>
                <div
                  style={{
                    padding: 12,
                    background:
                      "linear-gradient(135deg, color-mix(in srgb, #52c41a 10%, var(--app-surface) 90%) 0%, var(--app-surface-soft) 100%)",
                    borderRadius: 10,
                    border: "1px solid color-mix(in srgb, #52c41a 26%, var(--app-border) 74%)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <strong>张三</strong>
                    <span style={{ fontSize: 12, color: "var(--app-text-secondary)" }}>
                      2024-01-15 14:30
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "#52c41a" }}>
                    ✓ 技术评审通过
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--app-text-secondary)",
                      marginTop: 4,
                    }}
                  >
                    方案技术架构合理，符合客户需求。
                  </div>
                </div>
                <div
                  style={{
                    padding: 12,
                    background:
                      "linear-gradient(135deg, color-mix(in srgb, #fa8c16 10%, var(--app-surface) 90%) 0%, var(--app-surface-soft) 100%)",
                    borderRadius: 10,
                    border: "1px solid color-mix(in srgb, #fa8c16 26%, var(--app-border) 74%)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <strong>李四</strong>
                    <span style={{ fontSize: 12, color: "var(--app-text-secondary)" }}>
                      2024-01-16 10:15
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "#fa8c16" }}>
                    ⏳ 商务评审中
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--app-text-secondary)",
                      marginTop: 4,
                    }}
                  >
                    正在审核报价和商务条款。
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 添加审批意见 */}
        <div style={{ marginBottom: 24 }}>
          <Typography.Title level={5} style={{ marginBottom: 12 }}>
            添加审批意见
          </Typography.Title>
          <Input.TextArea
            rows={4}
            placeholder="请输入审批意见..."
            style={{ marginBottom: 12 }}
            value={approvalOpinionDraft}
            onChange={(event) => setApprovalOpinionDraft(event.target.value)}
          />
          {!canApproveCurrentSolutionNode && activeSolution && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              当前仅允许当前待处理节点责任人执行审批动作，其他成员保持只读查看。
            </Text>
          )}
          <div style={{ display: "flex", gap: 12 }}>
            <Button
              type="primary"
              disabled={!canApproveCurrentSolutionNode}
              onClick={() => {
                if (!canApproveCurrentSolutionNode) {
                  message.warning(currentSolutionNodeDisabledReason);
                  return;
                }
                if (solutionApprovalSource === "api" && activeSolution) {
                  void executeSolutionApproval(activeSolution, "approve");
                  return;
                }
                if (activeSolution) {
                  setSolutionOverrides((prev) => {
                    const nextItem: SolutionItem = {
                      ...activeSolution,
                      status: "approved",
                      actions: buildSolutionActions("approved"),
                    };
                    const exists = prev.some((item) => item.key === nextItem.key);
                    return exists
                      ? prev.map((item) =>
                          item.key === nextItem.key ? nextItem : item,
                        )
                      : [nextItem, ...prev];
                  });
                }
                setApprovalModalVisible(false);
                setApprovalOpinionDraft("");
                message.success("已提交审批意见：通过");
              }}
            >
              ✓ 通过
            </Button>
            <Button
              danger
              disabled={!canApproveCurrentSolutionNode}
              onClick={() => {
                if (!canApproveCurrentSolutionNode) {
                  message.warning(currentSolutionNodeDisabledReason);
                  return;
                }
                if (solutionApprovalSource === "api" && activeSolution) {
                  void executeSolutionApproval(activeSolution, "reject");
                  return;
                }
                if (activeSolution) {
                  setSolutionOverrides((prev) => {
                    const nextItem: SolutionItem = {
                      ...activeSolution,
                      status: "rejected",
                      actions: buildSolutionActions("rejected"),
                    };
                    const exists = prev.some((item) => item.key === nextItem.key);
                    return exists
                      ? prev.map((item) =>
                          item.key === nextItem.key ? nextItem : item,
                        )
                      : [nextItem, ...prev];
                  });
                }
                setApprovalModalVisible(false);
                setApprovalOpinionDraft("");
                message.warning("已提交审批意见：驳回");
              }}
            >
              ✗ 驳回
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
