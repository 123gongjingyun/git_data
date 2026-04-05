import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  Row,
  Col,
  Input,
  Select,
  Button,
  Table,
  Tag,
  Typography,
  Modal,
  Timeline,
  Switch,
  Form,
  Popover,
  Checkbox,
  Divider,
  message,
  Radio,
  Upload,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowNodeFieldKey,
  WorkflowNodeType,
} from "../shared/workflowConfig";
import {
  loadSelectedWorkflowId,
  loadWorkflowLibrary,
  mergeWorkflowNodeClientMeta,
} from "../shared/workflowConfig";
import { DEFAULT_OPPORTUNITY_WORKFLOW } from "../shared/workflowTemplates";
import { getNextOpportunityCode } from "../shared/opportunityCode";
import {
  type ApprovalStatus,
  type DemoOpportunity,
  type OpportunityWorkflowRecord,
  loadSharedDemoOpportunities,
  saveSharedDemoOpportunities,
  getSalesOwnerLabel,
  getSelectableOwnerOptions,
} from "../shared/opportunityDemoData";
import {
  buildProjectKey,
  getProjectKeyFromOpportunity,
  getProjectNameFromOpportunity,
  normalizeProjectName,
} from "../shared/projectNaming";
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
import { buildApiUrl } from "../shared/api";
import {
  getSharedTeamMemberLabel,
  loadSharedTeamMembers,
} from "../shared/teamDirectory";
import {
  executeApprovalAction,
  fetchCurrentApprovalInstance,
  getStoredAccessToken,
  type ApprovalActionType,
  type ApprovalInstanceActionView,
  type ApprovalInstanceNodeView,
  type ApprovalInstanceView,
} from "../shared/approvalInstances";

const { Text, Paragraph } = Typography;

interface ApiOpportunity {
  id: number;
  name: string;
  stage?: string;
  approvalStatus?: ApprovalStatus;
  techApprovalStatus?: ApprovalStatus;
  bizApprovalStatus?: ApprovalStatus;
  approvalOpinion?: string | null;
  requirementBriefDocName?: string | null;
  researchDocName?: string | null;
  solutionOwnerUsername?: string | null;
  expectedValue?: string;
  expectedCloseDate?: string;
  probability?: number;
  customer?: {
    id: number;
    name?: string | null;
  } | null;
  owner?: {
    id: number;
    username: string;
    displayName?: string | null;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiWorkflowNodeApprover {
  id?: number;
  approverType: "user" | "role" | "field";
  approverRef: string;
  displayName?: string | null;
  voteRule?: "any" | "all";
  sortOrder?: number;
}

interface ApiWorkflowNode {
  id?: number;
  nodeKey?: string;
  nodeName: string;
  nodeOrder: number;
  description?: string | null;
  canReject?: boolean;
  rejectStrategy?: "terminate";
  rejectCommentRequired?: boolean;
  approvers?: ApiWorkflowNodeApprover[];
}

interface ApiWorkflowDefinition {
  id: number;
  name: string;
  code?: string | null;
  targetType: "opportunity" | "solution";
  description?: string | null;
  applicableOpportunity?: string | null;
  enabled: boolean;
  isDefault?: boolean;
  version?: number;
  nodes?: ApiWorkflowNode[];
}

type SolutionStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "rejected"
  | "archived";

interface OpportunityListResponse {
  items: ApiOpportunity[];
  total: number;
  page: number;
  pageSize: number;
}

interface OpportunitiesDemoViewProps {
  accessToken: string;
  currentUsername: string | null;
  currentUser: CurrentUser | null;
  initialCustomerKeyword?: string | null;
  initialStageFilter?: string | null;
  onNavigateToProject?: (projectName?: string) => void;
}

type OpportunityApprovalDerivedStatus =
  | "not_started"
  | "pending"
  | "approved"
  | "rejected";

const OPPORTUNITY_TABLE_STORAGE_KEY = "opportunitiesTablePreference";

const OPPORTUNITY_TABLE_COLUMN_META = [
  { key: "index", title: "序号", defaultWidth: 72, minWidth: 72, visibleByDefault: true, locked: true, resizable: false },
  { key: "opportunityCode", title: "商机编号", defaultWidth: 130, minWidth: 110, visibleByDefault: true, locked: false, resizable: true },
  { key: "name", title: "商机名称", defaultWidth: 240, minWidth: 180, visibleByDefault: true, locked: true, resizable: true },
  { key: "customerName", title: "客户名称", defaultWidth: 180, minWidth: 140, visibleByDefault: true, locked: false, resizable: true },
  { key: "ownerUsername", title: "销售负责人", defaultWidth: 160, minWidth: 130, visibleByDefault: true, locked: false, resizable: true },
  { key: "stage", title: "阶段", defaultWidth: 120, minWidth: 100, visibleByDefault: true, locked: false, resizable: true },
  { key: "approvalStatus", title: "审批状态", defaultWidth: 120, minWidth: 100, visibleByDefault: true, locked: false, resizable: true },
  { key: "expectedValue", title: "预期价值", defaultWidth: 140, minWidth: 120, visibleByDefault: true, locked: false, resizable: true },
  { key: "probability", title: "成功概率", defaultWidth: 120, minWidth: 100, visibleByDefault: true, locked: false, resizable: true },
  { key: "weightedValue", title: "加权价值", defaultWidth: 140, minWidth: 120, visibleByDefault: false, locked: false, resizable: true },
  { key: "expectedCloseDate", title: "预计关闭时间", defaultWidth: 140, minWidth: 120, visibleByDefault: true, locked: false, resizable: true },
  { key: "action", title: "操作", defaultWidth: 180, minWidth: 180, visibleByDefault: true, locked: true, resizable: false },
] as const satisfies readonly TableColumnMeta<string>[];

type OpportunityColumnKey = (typeof OPPORTUNITY_TABLE_COLUMN_META)[number]["key"];

const DEFAULT_OPPORTUNITY_NODE_META: Record<
  string,
  {
    nodeType: WorkflowNodeType;
    fieldKey?: WorkflowNodeFieldKey;
    fieldLabel?: string;
    actionButtonLabel?: string;
  }
> = {
  lead_confirmation: {
    nodeType: "upload",
    fieldKey: "requirementBriefDocName",
    fieldLabel: "客户需求说明文档",
    actionButtonLabel: "上传需求说明",
  },
  sales_leader_approval: {
    nodeType: "approval",
    fieldKey: "bizApprovalStatus",
    fieldLabel: "销售领导审批",
  },
  solution_leader_approval: {
    nodeType: "approval",
    fieldKey: "techApprovalStatus",
    fieldLabel: "解决方案领导审批",
  },
  assign_solution_owner: {
    nodeType: "assignment",
    fieldKey: "solutionOwnerUsername",
    fieldLabel: "解决方案负责人",
    actionButtonLabel: "选择负责人",
  },
  requirement_analysis: {
    nodeType: "upload",
    fieldKey: "researchDocName",
    fieldLabel: "需求调研文档",
    actionButtonLabel: "上传调研文档",
  },
  final_approval: {
    nodeType: "approval",
    fieldKey: "approvalStatus",
    fieldLabel: "最终审批",
  },
};

function getResolvedOpportunityNode(node: WorkflowNode, fallbackIndex: number): WorkflowNode {
  const fallback = DEFAULT_OPPORTUNITY_NODE_META[node.nodeKey || `index_${fallbackIndex}`];
  return {
    ...node,
    nodeType: node.nodeType || fallback?.nodeType || "approval",
    fieldKey: node.fieldKey || fallback?.fieldKey,
    fieldLabel: node.fieldLabel || fallback?.fieldLabel,
    actionButtonLabel: node.actionButtonLabel || fallback?.actionButtonLabel,
  };
}

export function OpportunitiesDemoView(props: OpportunitiesDemoViewProps) {
  const {
    accessToken,
    currentUsername,
    currentUser,
    initialCustomerKeyword,
    initialStageFilter,
    onNavigateToProject,
  } = props;

  // 初始使用前端内置的示例商机数据，后端可用时再用接口返回覆盖
  const [opportunities, setOpportunities] =
    useState<DemoOpportunity[]>(() => loadSharedDemoOpportunities());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState<string>(
    initialCustomerKeyword?.trim() || "",
  );
  const [stageFilter, setStageFilter] = useState<string | undefined>(
    initialStageFilter || undefined,
  );
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<
    OpportunityApprovalDerivedStatus | undefined
  >(undefined);
  const [sortKey, setSortKey] = useState<string>("createdAt_desc");
  const [onlyMine, setOnlyMine] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailOpportunity, setDetailOpportunity] =
    useState<DemoOpportunity | null>(null);
  const [detailApprovalInstance, setDetailApprovalInstance] =
    useState<ApprovalInstanceView | null>(null);
  const [detailApprovalLoading, setDetailApprovalLoading] = useState(false);
  const [detailApprovalError, setDetailApprovalError] = useState<string | null>(
    null,
  );
  const [createVisible, setCreateVisible] = useState(false);
  const [createForm] = Form.useForm();
  const canCreateOpportunities = hasActionAccess(
    currentUser,
    "opportunity.create",
  );
  const canEditOpportunities = hasActionAccess(currentUser, "opportunity.edit");
  const canDeleteOpportunities = hasActionAccess(
    currentUser,
    "opportunity.delete",
  );
  const canApproveOpportunities = hasActionAccess(
    currentUser,
    "opportunity.approve",
  );
  const canManageOpportunities =
    canCreateOpportunities || canEditOpportunities || canDeleteOpportunities;
  const [editingOpportunity, setEditingOpportunity] =
    useState<DemoOpportunity | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<string[] | undefined>(
    undefined,
  );
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [statsModalType, setStatsModalType] = useState<
    "expected" | "weighted" | "probability" | null
  >(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [approvalVisible, setApprovalVisible] = useState(false);
  const [approvalTarget, setApprovalTarget] =
    useState<DemoOpportunity | null>(null);
  const [approvalOpinionDraft, setApprovalOpinionDraft] =
    useState<string>("");
  const [approvalInstance, setApprovalInstance] =
    useState<ApprovalInstanceView | null>(null);
  const [approvalInstanceLoading, setApprovalInstanceLoading] = useState(false);
  const [approvalInstanceError, setApprovalInstanceError] = useState<string | null>(
    null,
  );
  const [approvalRuntimeSource, setApprovalRuntimeSource] = useState<
    "api" | "local"
  >("local");
  const [previewDocument, setPreviewDocument] = useState<{
    title: string;
    fileName: string;
  } | null>(null);
  const [opportunityWorkflow, setOpportunityWorkflow] =
    useState<WorkflowDefinition | null>(null);
  const [opportunityWorkflowLibrary, setOpportunityWorkflowLibrary] = useState<
    WorkflowDefinition[]
  >(() =>
    loadWorkflowLibrary().filter(
      (item) => item.target === "opportunity" && item.enabled,
    ),
  );
  const [opportunityWorkflowSource, setOpportunityWorkflowSource] = useState<
    "api" | "local"
  >("local");
  const [opportunityWorkflowError, setOpportunityWorkflowError] = useState<
    string | null
  >(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [tablePreference, setTablePreference] = useState<
    TablePreference<OpportunityColumnKey>
  >(() =>
    loadTablePreference(
      OPPORTUNITY_TABLE_STORAGE_KEY,
      OPPORTUNITY_TABLE_COLUMN_META,
      true,
    ),
  );
  const projectOptions = useMemo(() => {
    const optionMap = new Map<string, { value: string; label: string }>();
    opportunities.forEach((item) => {
      const projectKey = getProjectKeyFromOpportunity(item);
      if (optionMap.has(projectKey)) {
        return;
      }
      optionMap.set(projectKey, {
        value: projectKey,
        label: getProjectNameFromOpportunity(item),
      });
    });
    return Array.from(optionMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [opportunities]);

  const getWorkflowNode = (nodeKey: string, fallbackIndex: number) => {
    const nodes = opportunityWorkflow?.nodes || [];
    return getResolvedOpportunityNode(
      nodes.find((node) => node.nodeKey === nodeKey) ||
        nodes[fallbackIndex] ||
        DEFAULT_OPPORTUNITY_WORKFLOW.nodes[fallbackIndex],
      fallbackIndex,
    );
  };

  const getApprovalWorkflowNodes = () => {
    const nodes =
      opportunityWorkflow?.nodes?.length
        ? opportunityWorkflow.nodes
        : DEFAULT_OPPORTUNITY_WORKFLOW.nodes;
    return nodes.map((node, index) => getResolvedOpportunityNode(node, index));
  };

  const getCurrentOperatorUsername = () =>
    currentUser?.username || currentUsername || "";

  const getCurrentOperatorLabel = () => {
    const username = getCurrentOperatorUsername();
    if (!username) {
      return "未登录用户";
    }
    return getSharedTeamMemberLabel(username);
  };

  const updateOpportunityById = (
    opportunityId: number,
    updater: (item: DemoOpportunity) => DemoOpportunity,
  ) => {
    setOpportunities((prev) =>
      prev.map((item) => (item.id === opportunityId ? updater(item) : item)),
    );
    setApprovalTarget((prev) =>
      prev && prev.id === opportunityId ? updater(prev) : prev,
    );
    setDetailOpportunity((prev) =>
      prev && prev.id === opportunityId ? updater(prev) : prev,
    );
  };

  const upsertOpportunityById = (
    opportunityId: number,
    patch: Partial<DemoOpportunity>,
  ) => {
    updateOpportunityById(opportunityId, (item) => ({ ...item, ...patch }));
  };

  const buildWorkflowRecord = (input: {
    node: WorkflowNode;
    actionType: OpportunityWorkflowRecord["actionType"];
    actionLabel: string;
    comment?: string;
    fileName?: string;
    assignedToUsername?: string;
  }): OpportunityWorkflowRecord => {
    const actorUsername = getCurrentOperatorUsername();
    const assignedToUsername = input.assignedToUsername;
    return {
      id: `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      nodeKey: input.node.nodeKey || String(input.node.id),
      nodeName: input.node.name,
      actionType: input.actionType,
      actionLabel: input.actionLabel,
      actorUsername,
      actorLabel: getCurrentOperatorLabel(),
      createdAt: new Date().toISOString(),
      comment: input.comment?.trim() || undefined,
      fileName: input.fileName,
      assignedToUsername,
      assignedToLabel: assignedToUsername
        ? getSharedTeamMemberLabel(assignedToUsername)
        : undefined,
    };
  };

  const getApiApprovalActionLabel = (
    action: ApprovalInstanceActionView,
    node?: ApprovalInstanceNodeView | null,
  ) => {
    const nodeType = node?.nodeType || "approval";
    if (action.actionType === "upload") {
      return node?.fieldKey === "researchDocName" ? "上传调研文档" : "上传需求说明";
    }
    if (action.actionType === "assign") {
      return "分配承接售前";
    }
    if (action.actionType === "reject") {
      return node?.fieldKey === "approvalStatus" ? "最终审批驳回" : "审批驳回";
    }
    if (action.actionType === "approve") {
      if (nodeType === "approval") {
        return node?.fieldKey === "approvalStatus" ? "最终审批通过" : "审批通过";
      }
      return "处理完成";
    }
    return "提交处理";
  };

  const syncOpportunityFromApprovalInstance = (
    target: DemoOpportunity,
    instance: ApprovalInstanceView,
  ) => {
    const nodeMap = new Map(
      instance.nodes.map((node) => [String(node.id), node]),
    );
    const actionsAsc = [...instance.actions].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
    const latestNodeActionMap = new Map<string, ApprovalInstanceActionView>();
    actionsAsc.forEach((action) => {
      if (action.approvalInstanceNodeId != null) {
        latestNodeActionMap.set(String(action.approvalInstanceNodeId), action);
      }
    });

    const patch: Partial<DemoOpportunity> = {
      approvalStatus:
        instance.status === "approved"
          ? "approved"
          : instance.status === "rejected"
            ? "rejected"
            : "pending",
      workflowRecords: actionsAsc.map((action) => {
        const operatorUsername = action.operator?.username || "system";
        const assignedToUsername =
          action.payload?.assignedToUsername || undefined;
        const node = action.approvalInstanceNodeId != null
          ? nodeMap.get(String(action.approvalInstanceNodeId))
          : null;
        return {
          id: `api_wf_${action.id}`,
          nodeKey: action.nodeKey || node?.nodeKey || String(action.id),
          nodeName: action.nodeName || node?.nodeName || "审批动作",
          actionType:
            action.actionType === "submit" && node?.nodeType === "upload"
              ? "upload"
              : action.actionType === "submit" && node?.nodeType === "assignment"
                ? "assign"
                : (action.actionType as OpportunityWorkflowRecord["actionType"]),
          actionLabel: getApiApprovalActionLabel(action, node),
          actorUsername: operatorUsername,
          actorLabel:
            action.operator?.displayName ||
            getSharedTeamMemberLabel(operatorUsername),
          createdAt: action.createdAt,
          comment: action.comment || undefined,
          fileName: action.payload?.fileName || undefined,
          assignedToUsername,
          assignedToLabel: assignedToUsername
            ? getSharedTeamMemberLabel(assignedToUsername)
            : undefined,
        } satisfies OpportunityWorkflowRecord;
      }),
    };

    instance.nodes.forEach((node) => {
      const latestAction = latestNodeActionMap.get(String(node.id));
      if (node.fieldKey === "requirementBriefDocName") {
        patch.requirementBriefDocName =
          latestAction?.payload?.fileName || target.requirementBriefDocName;
      } else if (node.fieldKey === "researchDocName") {
        patch.researchDocName =
          latestAction?.payload?.fileName || target.researchDocName;
      } else if (node.fieldKey === "solutionOwnerUsername") {
        patch.solutionOwnerUsername =
          latestAction?.payload?.assignedToUsername ||
          latestAction?.payload?.value ||
          target.solutionOwnerUsername;
      } else if (node.fieldKey === "bizApprovalStatus") {
        patch.bizApprovalStatus =
          node.status === "approved"
            ? "approved"
            : node.status === "rejected"
              ? "rejected"
              : "pending";
      } else if (node.fieldKey === "techApprovalStatus") {
        patch.techApprovalStatus =
          node.status === "approved"
            ? "approved"
            : node.status === "rejected"
              ? "rejected"
              : "pending";
      } else if (node.fieldKey === "approvalStatus") {
        patch.approvalOpinion = latestAction?.comment || target.approvalOpinion;
      }
    });

    if (instance.status === "approved" && target.stage === "discovery") {
      patch.stage = "solution_design";
    }
    upsertOpportunityById(target.id, patch);
  };

  const openApprovalModalWithRuntime = async (target: DemoOpportunity) => {
    let resolvedTarget = target;
    if (accessToken) {
      try {
        resolvedTarget = await loadOpportunityDetailFromApi(target.id);
        upsertOpportunityById(target.id, resolvedTarget);
      } catch {
        resolvedTarget = target;
      }
    }

    setApprovalTarget(resolvedTarget);
    setApprovalOpinionDraft(resolvedTarget.approvalOpinion || "");
    setApprovalVisible(true);
    setApprovalRuntimeSource("local");
    setApprovalInstance(null);
    setApprovalInstanceError(null);

    const token = accessToken || getStoredAccessToken();
    if (!token) {
      return;
    }

    setApprovalInstanceLoading(true);
    try {
      const instance = await fetchCurrentApprovalInstance(
        "opportunity",
        resolvedTarget.id,
        token,
      );
      if (!instance) {
        setApprovalRuntimeSource("local");
        setApprovalInstance(null);
        setApprovalInstanceError(null);
        return;
      }
      setApprovalInstance(instance);
      setApprovalRuntimeSource("api");
      setApprovalInstanceError(null);
      if (!shouldPreferBusinessSnapshot(resolvedTarget, instance)) {
        syncOpportunityFromApprovalInstance(resolvedTarget, instance);
      }
    } catch (error) {
      setApprovalRuntimeSource("local");
      setApprovalInstance(null);
      setApprovalInstanceError(
        error instanceof Error
          ? `${error.message}，当前回退到前端演示链路。`
          : "商机审批实例加载失败，当前回退到前端演示链路。",
      );
    } finally {
      setApprovalInstanceLoading(false);
    }
  };

  const executeOpportunityApprovalAction = async (
    target: DemoOpportunity,
    node: ApprovalInstanceNodeView,
    actionType: ApprovalActionType,
    extra?: {
      fileName?: string;
      assignedToUsername?: string;
      value?: string;
    },
  ) => {
    if (!approvalInstance) {
      return false;
    }
    const token = accessToken || getStoredAccessToken();
    if (!token) {
      message.warning("当前登录态已失效，请重新登录后再试。");
      return false;
    }
    try {
      const nextInstance = await executeApprovalAction(
        approvalInstance.id,
        {
          actionType,
          comment: approvalOpinionDraft.trim() || undefined,
          fileName: extra?.fileName,
          assignedToUsername: extra?.assignedToUsername,
          value: extra?.value,
        },
        token,
      );
      setApprovalInstance(nextInstance);
      setApprovalRuntimeSource("api");
      setApprovalInstanceError(null);
      syncOpportunityFromApprovalInstance(target, nextInstance);
      if (nextInstance.status === "approved" || nextInstance.status === "rejected") {
        setApprovalVisible(false);
        setApprovalTarget(null);
        setApprovalOpinionDraft("");
      }
      return true;
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "审批动作提交失败，请稍后重试。",
      );
      return false;
    }
  };

  const handlePreviewDocument = (title: string, fileName: string) => {
    setPreviewDocument({ title, fileName });
  };

  const handleDownloadDocument = (fileName: string) => {
    if (typeof window === "undefined") {
      return;
    }
    const blob = new Blob(
      [`文档文件：${fileName}\n\n当前环境暂未接入真实文件服务，文件入口已预留。`],
      { type: "text/plain;charset=utf-8" },
    );
    const url = window.URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = fileName.endsWith(".txt") ? fileName : `${fileName}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const getWorkflowNodeDocumentName = (
    target: DemoOpportunity,
    fieldKey?: WorkflowNodeFieldKey,
  ) => {
    if (!fieldKey) {
      return "";
    }
    const value = target[fieldKey];
    return typeof value === "string" ? value : "";
  };

  const getLatestWorkflowNodeRecord = (
    target: DemoOpportunity,
    node: WorkflowNode,
  ) =>
    (target.workflowRecords || [])
      .filter((record) => record.nodeKey === (node.nodeKey || String(node.id)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  const getApiNodeByWorkflowNode = (
    instance: ApprovalInstanceView | null,
    node: WorkflowNode,
  ) =>
    instance?.nodes.find(
      (item) =>
        item.nodeKey === (node.nodeKey || String(node.id)) ||
        item.workflowNodeId === node.id,
    ) || null;

  const getApiLatestActionForNode = (
    instance: ApprovalInstanceView | null,
    apiNode: ApprovalInstanceNodeView | null,
  ) => {
    if (!instance || !apiNode) {
      return null;
    }
    return [...instance.actions]
      .filter((action) => action.approvalInstanceNodeId === apiNode.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
  };

  const hasBusinessSnapshotProgress = (target: DemoOpportunity) =>
    Boolean(
      target.requirementBriefDocName ||
        target.researchDocName ||
        target.solutionOwnerUsername ||
        target.bizApprovalStatus === "approved" ||
        target.bizApprovalStatus === "rejected" ||
        target.techApprovalStatus === "approved" ||
        target.techApprovalStatus === "rejected" ||
        target.approvalStatus === "approved" ||
        target.approvalStatus === "rejected" ||
        (target.stage && target.stage !== "discovery"),
    );

  const shouldPreferBusinessSnapshot = (
    target: DemoOpportunity,
    instance?: ApprovalInstanceView | null,
  ) => {
    if (!instance || instance.actions.length > 0) {
      return false;
    }
    return hasBusinessSnapshotProgress(target);
  };

  const getDisplayApprovalInstance = (
    target: DemoOpportunity,
    instance?: ApprovalInstanceView | null,
  ) => (shouldPreferBusinessSnapshot(target, instance) ? null : instance || null);

  const getWorkflowNodeStatusMeta = (
    target: DemoOpportunity,
    node: WorkflowNode,
    instance?: ApprovalInstanceView | null,
  ) => {
    const displayInstance = getDisplayApprovalInstance(target, instance);
    const apiNode = getApiNodeByWorkflowNode(displayInstance, node);
    const apiLatestAction = getApiLatestActionForNode(displayInstance, apiNode);
    if (apiNode) {
      if (apiNode.nodeType === "upload") {
        const fileName = apiLatestAction?.payload?.fileName || "";
        return {
          text: fileName ? "已上传" : apiNode.status === "in_progress" ? "进行中" : "待上传",
          color:
            apiNode.status === "approved"
              ? "#4ade80"
              : apiNode.status === "in_progress"
                ? "#f59e0b"
                : "var(--app-text-secondary)",
          active: apiNode.status === "approved" || apiNode.status === "in_progress",
        };
      }
      if (apiNode.nodeType === "assignment") {
        const assignedToUsername =
          apiLatestAction?.payload?.assignedToUsername ||
          apiLatestAction?.payload?.value ||
          "";
        const assignedLabel = assignedToUsername
          ? getSharedTeamMemberLabel(assignedToUsername)
          : "";
        return {
          text:
            assignedLabel || (apiNode.status === "in_progress" ? "进行中" : "待分配"),
          color:
            apiNode.status === "approved"
              ? "var(--app-text-primary)"
              : apiNode.status === "in_progress"
                ? "#f59e0b"
                : "var(--app-text-secondary)",
          active: apiNode.status === "approved" || apiNode.status === "in_progress",
        };
      }
      return {
        text:
          apiNode.status === "approved"
            ? "已通过"
            : apiNode.status === "rejected"
              ? "已驳回"
              : apiNode.status === "in_progress"
                ? "进行中"
                : "待审批",
        color:
          apiNode.status === "approved"
            ? "#4ade80"
            : apiNode.status === "rejected"
              ? "#f87171"
              : apiNode.status === "in_progress"
                ? "#f59e0b"
                : "var(--app-text-secondary)",
        active: apiNode.status === "approved" || apiNode.status === "in_progress",
      };
    }

    const latestRecord = getLatestWorkflowNodeRecord(target, node);
    if (node.nodeType === "upload") {
      const fileName =
        latestRecord?.fileName || getWorkflowNodeDocumentName(target, node.fieldKey);
      return {
        text: fileName ? "已上传" : "待上传",
        color: fileName ? "#4ade80" : "var(--app-text-secondary)",
        active: Boolean(fileName),
      };
    }
    if (node.nodeType === "assignment") {
      const assignedLabel =
        latestRecord?.assignedToLabel ||
        (node.fieldKey === "solutionOwnerUsername" && target.solutionOwnerUsername
          ? getSharedTeamMemberLabel(target.solutionOwnerUsername)
          : "");
      return {
        text: assignedLabel && assignedLabel !== "-" ? assignedLabel : "待分配",
        color:
          assignedLabel && assignedLabel !== "-"
            ? "var(--app-text-primary)"
            : "var(--app-text-secondary)",
        active: assignedLabel !== "-" && Boolean(assignedLabel),
      };
    }
    if (node.fieldKey === "bizApprovalStatus" || node.fieldKey === "techApprovalStatus") {
      const status = target[node.fieldKey];
      if (status === "approved") {
        return { text: "已通过", color: "#4ade80", active: true };
      }
      if (status === "rejected") {
        return { text: "已驳回", color: "#f87171", active: false };
      }
    }
    if (node.fieldKey === "approvalStatus") {
      if (target.approvalStatus === "approved") {
        return { text: "已通过", color: "#4ade80", active: true };
      }
      if (target.approvalStatus === "rejected") {
        return { text: "已驳回", color: "#f87171", active: false };
      }
    }
    if (latestRecord?.actionType === "approve") {
      return { text: "已通过", color: "#4ade80", active: true };
    }
    if (latestRecord?.actionType === "reject") {
      return { text: "已驳回", color: "#f87171", active: false };
    }
    return { text: "待审批", color: "var(--app-text-secondary)", active: false };
  };

  const resolveRoleBasedApprovers = (
    approverRef: string,
    target: DemoOpportunity,
  ) => {
    const activeMembers = loadSharedTeamMembers().filter(
      (member) => member.status === "活跃",
    );
    const managers = activeMembers.filter((member) => member.roleLabel === "经理");
    if (approverRef === "sales_owner") {
      return target.ownerUsername ? [target.ownerUsername] : [];
    }
    if (approverRef === "solutionOwnerUsername") {
      return target.solutionOwnerUsername ? [target.solutionOwnerUsername] : [];
    }
    if (approverRef === "sales_manager" || approverRef === "sales_director") {
      const matched = managers.filter((member) =>
        `${member.teamRole || ""}${member.name}`.includes("销售"),
      );
      return (matched.length > 0 ? matched : managers)
        .map((member) => member.username)
        .slice(0, 2);
    }
    if (
      approverRef === "solution_manager" ||
      approverRef === "tech_director"
    ) {
      const matched = managers.filter((member) =>
        /售前|解决方案|技术/.test(member.teamRole || member.name),
      );
      return (matched.length > 0 ? matched : managers)
        .map((member) => member.username)
        .slice(0, 2);
    }
    const directMatched = activeMembers.find(
      (member) => member.username === approverRef,
    );
    return directMatched ? [directMatched.username] : [];
  };

  const getWorkflowNodeApproverUsernames = (
    target: DemoOpportunity,
    node: WorkflowNode,
  ) => {
    const usernames = new Set<string>();
    (node.approvers || []).forEach((approver) => {
      if (approver.approverType === "user") {
        if (approver.approverRef) {
          usernames.add(approver.approverRef);
        }
        return;
      }
      if (approver.approverType === "field") {
        const fieldValue = target[
          approver.approverRef as keyof DemoOpportunity
        ];
        if (typeof fieldValue === "string" && fieldValue.trim()) {
          usernames.add(fieldValue);
        }
        return;
      }
      resolveRoleBasedApprovers(approver.approverRef, target).forEach((username) =>
        usernames.add(username),
      );
    });

    if (usernames.size > 0) {
      return Array.from(usernames);
    }
    if (node.fieldKey === "requirementBriefDocName") {
      return target.ownerUsername ? [target.ownerUsername] : [];
    }
    if (node.fieldKey === "researchDocName" || node.fieldKey === "solutionOwnerUsername") {
      return target.solutionOwnerUsername ? [target.solutionOwnerUsername] : [];
    }
    return [];
  };

  const isWorkflowNodeCompleted = (
    target: DemoOpportunity,
    node: WorkflowNode,
    instance?: ApprovalInstanceView | null,
  ) => {
    const displayInstance = getDisplayApprovalInstance(target, instance);
    const apiNode = getApiNodeByWorkflowNode(displayInstance, node);
    if (apiNode) {
      return ["approved", "rejected", "skipped"].includes(apiNode.status);
    }
    if (node.nodeType === "upload") {
      return Boolean(getWorkflowNodeDocumentName(target, node.fieldKey));
    }
    if (
      node.nodeType === "assignment" &&
      node.fieldKey === "solutionOwnerUsername"
    ) {
      return Boolean(target.solutionOwnerUsername);
    }
    if (node.fieldKey === "bizApprovalStatus" || node.fieldKey === "techApprovalStatus") {
      return (
        target[node.fieldKey] === "approved" || target[node.fieldKey] === "rejected"
      );
    }
    if (node.fieldKey === "approvalStatus") {
      return (
        target.approvalStatus === "approved" || target.approvalStatus === "rejected"
      );
    }
    const latestRecord = getLatestWorkflowNodeRecord(target, node);
    if (latestRecord) {
      if (node.nodeType === "upload") {
        return latestRecord.actionType === "upload";
      }
      if (node.nodeType === "assignment") {
        return latestRecord.actionType === "assign";
      }
      return (
        latestRecord.actionType === "approve" ||
        latestRecord.actionType === "reject"
      );
    }
    return false;
  };

  const hasRejectedWorkflowNode = (
    target: DemoOpportunity,
    instance?: ApprovalInstanceView | null,
  ) =>
    getApprovalWorkflowNodes().some((node) => {
      const displayInstance = getDisplayApprovalInstance(target, instance);
      const apiNode = getApiNodeByWorkflowNode(displayInstance, node);
      if (apiNode?.status === "rejected") {
        return true;
      }
      if (
        (node.fieldKey === "bizApprovalStatus" ||
          node.fieldKey === "techApprovalStatus") &&
        target[node.fieldKey] === "rejected"
      ) {
        return true;
      }
      if (node.fieldKey === "approvalStatus" && target.approvalStatus === "rejected") {
        return true;
      }
      const latestRecord = getLatestWorkflowNodeRecord(target, node);
      if (latestRecord?.actionType === "reject") {
        return true;
      }
      return false;
    });

  const getRejectedWorkflowNodeIndex = (
    target: DemoOpportunity,
    instance?: ApprovalInstanceView | null,
  ) => {
    const nodes = getApprovalWorkflowNodes();
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      const displayInstance = getDisplayApprovalInstance(target, instance);
      const apiNode = getApiNodeByWorkflowNode(displayInstance, node);
      if (apiNode?.status === "rejected") {
        return index;
      }
      if (
        (node.fieldKey === "bizApprovalStatus" ||
          node.fieldKey === "techApprovalStatus") &&
        target[node.fieldKey] === "rejected"
      ) {
        return index;
      }
      if (node.fieldKey === "approvalStatus" && target.approvalStatus === "rejected") {
        return index;
      }
      const latestRecord = getLatestWorkflowNodeRecord(target, node);
      if (latestRecord?.actionType === "reject") {
        return index;
      }
    }
    return -1;
  };

  const buildSnapshotApprovalRecords = (target: DemoOpportunity) => {
    const nodes = getApprovalWorkflowNodes();
    const baseTime = Date.parse(target.updatedAt || target.createdAt || new Date().toISOString());
    let offset = 0;
    const nextTime = () => new Date(baseTime - (nodes.length - offset++) * 60_000).toISOString();
    const records: OpportunityWorkflowRecord[] = [];
    const pushRecord = (nodeKey: string, actionType: OpportunityWorkflowRecord["actionType"], actionLabel: string, extra?: Partial<OpportunityWorkflowRecord>) => {
      const node = nodes.find((item) => item.nodeKey === nodeKey);
      if (!node) {
        return;
      }
      records.push({
        id: `snapshot_${target.id}_${nodeKey}_${actionType}`,
        nodeKey,
        nodeName: node.name,
        actionType,
        actionLabel,
        actorUsername: "system_snapshot",
        actorLabel: "业务快照",
        createdAt: nextTime(),
        ...extra,
      });
    };

    if (target.requirementBriefDocName) {
      pushRecord("lead_confirmation", "upload", "已上传需求说明", {
        fileName: target.requirementBriefDocName,
      });
    }

    if (target.bizApprovalStatus === "approved") {
      pushRecord("sales_leader_approval", "approve", "销售领导审批通过");
    } else if (target.bizApprovalStatus === "rejected") {
      pushRecord("sales_leader_approval", "reject", "销售领导审批驳回", {
        comment: target.approvalOpinion || "该商机在销售领导审批节点被驳回。",
      });
      return records;
    }

    if (target.techApprovalStatus === "approved") {
      pushRecord("solution_leader_approval", "approve", "解决方案领导审批通过");
    } else if (target.techApprovalStatus === "rejected") {
      pushRecord("solution_leader_approval", "reject", "解决方案领导审批驳回", {
        comment: target.approvalOpinion || "该商机在解决方案领导审批节点被驳回。",
      });
      return records;
    }

    if (target.solutionOwnerUsername) {
      pushRecord("assign_solution_owner", "assign", "已分配解决方案负责人", {
        assignedToUsername: target.solutionOwnerUsername,
        assignedToLabel: getSharedTeamMemberLabel(target.solutionOwnerUsername),
      });
    }

    if (target.researchDocName) {
      pushRecord("requirement_analysis", "upload", "已上传需求调研文档", {
        fileName: target.researchDocName,
      });
    }

    if (target.approvalStatus === "approved") {
      pushRecord("final_approval", "approve", "最终审批通过", {
        comment: target.approvalOpinion || undefined,
      });
    } else if (target.approvalStatus === "rejected") {
      pushRecord("final_approval", "reject", "最终审批驳回", {
        comment: target.approvalOpinion || undefined,
      });
    }

    return records;
  };

  const getDerivedOpportunityApprovalStatus = (
    target: DemoOpportunity,
  ): OpportunityApprovalDerivedStatus => {
    const nodes = getApprovalWorkflowNodes();
    const actionableRecords = (target.workflowRecords || []).filter(
      (record) => record.actionType !== "notify",
    );
    const hasStartedByRecord = actionableRecords.length > 0;
    const hasStartedByField =
      Boolean(target.requirementBriefDocName) ||
      Boolean(target.researchDocName) ||
      Boolean(target.solutionOwnerUsername) ||
      target.bizApprovalStatus === "approved" ||
      target.bizApprovalStatus === "rejected" ||
      target.techApprovalStatus === "approved" ||
      target.techApprovalStatus === "rejected" ||
      target.approvalStatus === "approved" ||
      target.approvalStatus === "rejected";
    const hasRejected =
      hasRejectedWorkflowNode(target) ||
      target.bizApprovalStatus === "rejected" ||
      target.techApprovalStatus === "rejected" ||
      target.approvalStatus === "rejected";
    const finalNode = nodes[nodes.length - 1];
    const finalNodeRecord = finalNode
      ? getLatestWorkflowNodeRecord(target, finalNode)
      : undefined;
    const finalApproved =
      finalNodeRecord?.actionType === "approve" ||
      target.approvalStatus === "approved";

    if (finalApproved) {
      return "approved";
    }
    if (hasRejected) {
      return "rejected";
    }
    if (hasStartedByRecord || hasStartedByField) {
      return "pending";
    }
    return "not_started";
  };

  const getStageDrivenWorkflowNodeIndex = (target: DemoOpportunity) => {
    const actionableRecords = (target.workflowRecords || []).filter(
      (record) => record.actionType !== "notify",
    );
    if (actionableRecords.length > 0) {
      return null;
    }
    if (!target.stage || target.stage === "discovery") {
      return 0;
    }
    if (["solution_design", "proposal"].includes(target.stage)) {
      return 4;
    }
    if (["bidding", "negotiation"].includes(target.stage)) {
      return 5;
    }
    if (target.stage === "won") {
      return -1;
    }
    return 0;
  };

  const getOpportunityDetailFlowSummary = (
    target: DemoOpportunity,
    instance?: ApprovalInstanceView | null,
  ) => {
    const displayInstance = getDisplayApprovalInstance(target, instance);
    const nodes = getApprovalWorkflowNodes();
    const findNode = (nodeKey: string) =>
      nodes.find((node) => (node.nodeKey || String(node.id)) === nodeKey);
    const leadNode =
      findNode("lead_confirmation") ||
      getResolvedOpportunityNode(DEFAULT_OPPORTUNITY_WORKFLOW.nodes[0], 0);
    const salesApprovalNode =
      findNode("sales_leader_approval") ||
      getResolvedOpportunityNode(DEFAULT_OPPORTUNITY_WORKFLOW.nodes[1], 1);
    const solutionApprovalNode =
      findNode("solution_leader_approval") ||
      getResolvedOpportunityNode(DEFAULT_OPPORTUNITY_WORKFLOW.nodes[2], 2);
    const researchNode =
      findNode("requirement_analysis") ||
      getResolvedOpportunityNode(DEFAULT_OPPORTUNITY_WORKFLOW.nodes[4], 4);
    const finalNode =
      findNode("final_approval") ||
      getResolvedOpportunityNode(DEFAULT_OPPORTUNITY_WORKFLOW.nodes[5], 5);

    const salesApprovalRecord = getLatestWorkflowNodeRecord(target, salesApprovalNode);
    const solutionApprovalRecord = getLatestWorkflowNodeRecord(target, solutionApprovalNode);
    const salesApproved = salesApprovalRecord?.actionType === "approve";
    const solutionApproved = solutionApprovalRecord?.actionType === "approve";
    const anyStartRejected =
      salesApprovalRecord?.actionType === "reject" ||
      solutionApprovalRecord?.actionType === "reject";
    const bothStartApproved = salesApproved && solutionApproved;
    const salesOrSolutionStarted = Boolean(
      salesApprovalRecord || solutionApprovalRecord,
    );
    const stageDrivenNodeIndex = getStageDrivenWorkflowNodeIndex(target);
    const isAnalysisStageDriven =
      !displayInstance &&
      stageDrivenNodeIndex != null &&
      stageDrivenNodeIndex >= 4 &&
      !salesOrSolutionStarted;
    const isFinalStageDriven =
      !displayInstance &&
      stageDrivenNodeIndex != null &&
      stageDrivenNodeIndex >= 5;

    return [
      {
        title: "线索确认",
        statusText: getWorkflowNodeStatusMeta(target, leadNode, displayInstance).text === "已上传"
          ? "已上传需求说明"
          : isAnalysisStageDriven
            ? "已进入需求分析阶段"
          : "待上传需求说明文档",
        tone:
          getWorkflowNodeStatusMeta(target, leadNode, displayInstance).text === "已上传"
            ? "success"
            : isAnalysisStageDriven
              ? "success"
            : "default",
      },
      {
        title: "项目启动",
        statusText: bothStartApproved
          ? "已完成项目启动审批"
          : isAnalysisStageDriven
            ? "已完成项目启动审批"
          : anyStartRejected
            ? "项目启动已驳回"
            : salesOrSolutionStarted
              ? "项目启动审批中"
              : "待销售/方案领导审批",
        tone: bothStartApproved
          ? "success"
          : isAnalysisStageDriven
            ? "success"
          : anyStartRejected
            ? "danger"
            : salesOrSolutionStarted
              ? "warning"
              : "default",
      },
      {
        title: "需求分析",
        statusText: getWorkflowNodeStatusMeta(target, researchNode, displayInstance).text === "已上传"
          ? "已上传需求调研文档"
          : isAnalysisStageDriven
            ? "待上传需求调研文档"
          : isWorkflowNodeCompleted(target, leadNode, displayInstance)
            ? "进行需求分析"
            : "待完成需求调研",
        tone:
          getWorkflowNodeStatusMeta(target, researchNode, displayInstance).text === "已上传"
            ? "success"
            : isAnalysisStageDriven
              ? "warning"
            : isWorkflowNodeCompleted(target, leadNode, displayInstance)
              ? "warning"
              : "default",
      },
      {
        title: "最终审批",
        statusText: getWorkflowNodeStatusMeta(target, finalNode, displayInstance).text === "已通过"
          ? "已批准进入方案阶段"
          : getWorkflowNodeStatusMeta(target, finalNode, displayInstance).text === "已驳回"
            ? "最终审批已驳回"
            : isFinalStageDriven
              ? "最终审批中"
            : isWorkflowNodeCompleted(target, researchNode, displayInstance)
              ? "最终审批中"
              : "待进入最终审批",
        tone:
          getWorkflowNodeStatusMeta(target, finalNode, displayInstance).text === "已通过"
            ? "success"
            : getWorkflowNodeStatusMeta(target, finalNode, displayInstance).text === "已驳回"
              ? "danger"
              : isFinalStageDriven
                ? "warning"
              : isWorkflowNodeCompleted(target, researchNode, displayInstance)
                ? "warning"
                : "default",
      },
    ] as const;
  };

  const getCurrentPendingWorkflowNodeIndex = (target: DemoOpportunity) => {
    if (hasRejectedWorkflowNode(target)) {
      return -1;
    }
    const nodes = getApprovalWorkflowNodes();
    for (let index = 0; index < nodes.length; index += 1) {
      if (!isWorkflowNodeCompleted(target, nodes[index])) {
        return index;
      }
    }
    const stageDrivenIndex = getStageDrivenWorkflowNodeIndex(target);
    if (stageDrivenIndex != null) {
      return stageDrivenIndex;
    }
    return -1;
  };

  const getWorkflowNodeDisabledReason = (
    target: DemoOpportunity,
    node: WorkflowNode,
    index: number,
  ) => {
    const currentOperatorUsername = getCurrentOperatorUsername();
    const pendingIndex = getCurrentPendingWorkflowNodeIndex(target);
    if (pendingIndex === -1) {
      return hasRejectedWorkflowNode(target)
        ? "当前流程已驳回，后续节点仅支持查看。"
        : "当前流程已全部完成。";
    }
    if (index !== pendingIndex) {
      return isWorkflowNodeCompleted(target, node)
        ? "当前节点已处理完成。"
        : "请先完成上一流程节点。";
    }
    if (!currentOperatorUsername) {
      return "当前账号未登录，无法处理该节点。";
    }
    const approvers = getWorkflowNodeApproverUsernames(target, node);
    if (approvers.length > 0 && !approvers.includes(currentOperatorUsername)) {
      return `当前节点待 ${approvers
        .map((username) => getSharedTeamMemberLabel(username))
        .join(" / ")} 处理。`;
    }
    if (node.nodeType === "approval" && !canApproveOpportunities) {
      return "当前账号无审批权限。";
    }
    if (
      (node.nodeType === "upload" || node.nodeType === "assignment") &&
      !canEditOpportunities &&
      !canApproveOpportunities
    ) {
      return "当前账号无处理权限。";
    }
    return "";
  };

  const appendWorkflowRecords = (
    target: DemoOpportunity,
    patch: Partial<DemoOpportunity>,
    records: OpportunityWorkflowRecord[],
  ) => {
    const nextTarget: DemoOpportunity = {
      ...target,
      ...patch,
      workflowRecords: [...(target.workflowRecords || []), ...records],
    };
    const nextPendingIndex = getCurrentPendingWorkflowNodeIndex(nextTarget);
    if (nextPendingIndex >= 0) {
      const nextNode = getApprovalWorkflowNodes()[nextPendingIndex];
      const nextApprovers = getWorkflowNodeApproverUsernames(nextTarget, nextNode);
      if (nextApprovers.length > 0) {
        const notifySummary = nextApprovers
          .map((username) => getSharedTeamMemberLabel(username))
          .join(" / ");
        nextTarget.workflowRecords = [
          ...(nextTarget.workflowRecords || []),
          {
            id: `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            nodeKey: nextNode.nodeKey || String(nextNode.id),
            nodeName: nextNode.name,
            actionType: "notify",
            actionLabel: "系统已通知下一处理人",
            actorUsername: "system",
            actorLabel: "系统通知",
            createdAt: new Date().toISOString(),
            comment: `已通知 ${notifySummary} 处理「${nextNode.name}」。`,
          },
        ];
        message.info(`已通知 ${notifySummary} 处理下一节点。`);
      }
    }
    updateOpportunityById(target.id, () => nextTarget);
  };

  const handleRequirementDocUpload = (file: File) => {
    if (!approvalTarget) return false;
    const name = file.name;
    const node = getApprovalWorkflowNodes().find(
      (item) => item.fieldKey === "requirementBriefDocName",
    );
    appendWorkflowRecords(
      approvalTarget,
      { requirementBriefDocName: name },
      node
        ? [
            buildWorkflowRecord({
              node,
              actionType: "upload",
              actionLabel: "上传需求说明",
              fileName: name,
              comment: "已补齐客户背景、需求说明和预期金额。",
            }),
          ]
        : [],
    );
    message.success("已上传客户需求说明文档");
    return false;
  };

  const handleResearchDocUpload = (file: File) => {
    if (!approvalTarget) return false;
    const name = file.name;
    const node = getApprovalWorkflowNodes().find(
      (item) => item.fieldKey === "researchDocName",
    );
    appendWorkflowRecords(
      approvalTarget,
      { researchDocName: name },
      node
        ? [
            buildWorkflowRecord({
              node,
              actionType: "upload",
              actionLabel: "上传调研文档",
              fileName: name,
              comment: "已完成详细需求分析并上传调研文档。",
            }),
          ]
        : [],
    );
    message.success("已上传需求调研文档");
    return false;
  };

  const normalizeWorkflowDefinition = (
    workflow: ApiWorkflowDefinition,
  ): WorkflowDefinition => ({
    id: workflow.id,
    name: workflow.name,
    code: workflow.code || undefined,
    target: workflow.targetType,
    enabled: workflow.enabled,
    isDefault: workflow.isDefault ?? false,
    version: workflow.version ?? 1,
    description: workflow.description || undefined,
    applicableOpportunity: workflow.applicableOpportunity || undefined,
    nodes: [...(workflow.nodes || [])]
      .sort((a, b) => a.nodeOrder - b.nodeOrder)
      .map((node) =>
        mergeWorkflowNodeClientMeta(workflow.id, {
          id: node.id ?? `${workflow.id}-${node.nodeKey || node.nodeOrder}`,
          nodeKey: node.nodeKey || `node_${node.nodeOrder}`,
          name: node.nodeName,
          nodeOrder: node.nodeOrder,
          approverRole:
            node.approvers && node.approvers.length > 0
              ? node.approvers
                  .map((item) => item.displayName || item.approverRef)
                  .join(" / ")
              : "",
          description: node.description || undefined,
          canReject: node.canReject ?? true,
          rejectStrategy: node.rejectStrategy ?? "terminate",
          rejectCommentRequired: node.rejectCommentRequired ?? false,
          approvers: (node.approvers || []).map((item, index) => ({
            id: item.id,
            approverType: item.approverType,
            approverRef: item.approverRef,
            displayName: item.displayName || undefined,
            voteRule: item.voteRule ?? "any",
            sortOrder: item.sortOrder ?? index,
          })),
        }),
      ),
  });

  const loadOpportunityWorkflowDefinitions = async () => {
    if (!accessToken) {
      setOpportunityWorkflowSource("local");
      return;
    }
    try {
      const response = await fetch(
        buildApiUrl("/workflow-definitions?targetType=opportunity&enabled=true"),
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      if (!response.ok) {
        setOpportunityWorkflowSource("local");
        setOpportunityWorkflowError(
          `商机流程定义加载失败：${response.status}，当前回退到本地流程模板。`,
        );
        return;
      }

      const data = (await response.json()) as ApiWorkflowDefinition[];
      const normalized = Array.isArray(data)
        ? data.map(normalizeWorkflowDefinition)
        : [];

      if (normalized.length > 0) {
        setOpportunityWorkflowLibrary(normalized);
        setOpportunityWorkflowSource("api");
        setOpportunityWorkflowError(null);
        return;
      }

      setOpportunityWorkflowSource("local");
      setOpportunityWorkflowError(
        "后端当前未返回可用的商机流程定义，当前回退到本地流程模板。",
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to load opportunity workflows:", err);
      setOpportunityWorkflowSource("local");
      setOpportunityWorkflowError(
        "未检测到可用的商机流程后端接口，当前回退到本地流程模板。",
      );
    }
  };

  const resolveWorkflowForOpportunity = (
    target: DemoOpportunity | null,
  ): WorkflowDefinition => {
    const enabledOpportunityWorkflows =
      opportunityWorkflowLibrary.length > 0
        ? opportunityWorkflowLibrary
        : loadWorkflowLibrary().filter(
            (item) => item.target === "opportunity" && item.enabled,
          );

    if (target) {
      const targetText = `${target.name || ""} ${target.customerName || ""}`.toLowerCase();
      const matchedByOpportunity = enabledOpportunityWorkflows
        .filter(
          (item) =>
            item.applicableOpportunity &&
            item.applicableOpportunity.trim().length > 0 &&
            targetText.includes(item.applicableOpportunity.trim().toLowerCase()),
        )
        .sort(
          (a, b) =>
            (b.applicableOpportunity?.trim().length || 0) -
            (a.applicableOpportunity?.trim().length || 0),
        );
      if (matchedByOpportunity.length > 0) {
        return matchedByOpportunity[0];
      }
    }

    const selectedId = loadSelectedWorkflowId("opportunity");
    if (selectedId) {
      const selected = enabledOpportunityWorkflows.find(
        (item) => String(item.id) === String(selectedId),
      );
      if (selected) {
        return selected;
      }
    }

    const defaultWorkflow = enabledOpportunityWorkflows.find(
      (item) => item.isDefault,
    );
    return defaultWorkflow || DEFAULT_OPPORTUNITY_WORKFLOW;
  };

  useEffect(() => {
    setOpportunityWorkflow(resolveWorkflowForOpportunity(approvalTarget));
  }, [approvalTarget, opportunityWorkflowLibrary]);

  useEffect(() => {
    if (!detailVisible || !detailOpportunity || !accessToken) {
      return;
    }

    let cancelled = false;
    void loadOpportunityDetailFromApi(detailOpportunity.id)
      .then((fullDetail) => {
        if (cancelled) {
          return;
        }
        upsertOpportunityById(detailOpportunity.id, fullDetail);
      })
      .catch(() => {
        // keep current snapshot when detail api is unavailable
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, detailVisible, detailOpportunity?.id]);

  useEffect(() => {
    if (!detailVisible || !detailOpportunity) {
      setDetailApprovalInstance(null);
      setDetailApprovalError(null);
      setDetailApprovalLoading(false);
      return;
    }

    const token = accessToken || getStoredAccessToken();
    if (!token) {
      setDetailApprovalInstance(null);
      setDetailApprovalError(null);
      setDetailApprovalLoading(false);
      return;
    }

    let cancelled = false;
    setDetailApprovalLoading(true);
    setDetailApprovalError(null);

    void fetchCurrentApprovalInstance("opportunity", detailOpportunity.id, token)
      .then((instance) => {
        if (cancelled) {
          return;
        }
        setDetailApprovalInstance(instance);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setDetailApprovalInstance(null);
        setDetailApprovalError(
          error instanceof Error ? error.message : "商机审批过程加载失败。",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setDetailApprovalLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, detailVisible, detailOpportunity]);

  const apiApprovalNodes = approvalInstance?.nodes
    ? [...approvalInstance.nodes].sort((a, b) => a.nodeOrder - b.nodeOrder)
    : [];
  const approvalUsesBusinessSnapshot =
    approvalRuntimeSource === "api" &&
    approvalTarget != null &&
    shouldPreferBusinessSnapshot(approvalTarget, approvalInstance);
  const snapshotApprovalRecords =
    approvalTarget && approvalUsesBusinessSnapshot
      ? buildSnapshotApprovalRecords(approvalTarget)
      : [];

  const STAGE_LABELS: Record<string, string> = {
    discovery: "发现",
    solution_design: "方案设计",
    proposal: "提案",
    bidding: "投标",
    negotiation: "谈判",
    won: "中标",
    lost: "丢单",
  };

  const STAGE_COLORS: Record<string, string> = {
    discovery: "orange",
    solution_design: "blue",
    proposal: "blue",
    bidding: "purple",
    negotiation: "purple",
    won: "green",
    lost: "red",
  };

  const mapApiToDemo = (api: ApiOpportunity): DemoOpportunity => {
    const rawExpected = api.expectedValue;
    const expectedNumber =
      rawExpected != null && rawExpected !== ""
        ? Number(rawExpected)
        : undefined;

    let expectedDisplay: string | undefined;
    if (
      expectedNumber != null &&
      Number.isFinite(expectedNumber)
    ) {
      expectedDisplay = `¥${expectedNumber.toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    } else if (typeof rawExpected === "string") {
      expectedDisplay = rawExpected;
    }

    const prob =
      typeof api.probability === "number" ? api.probability : undefined;

    let weightedDisplay: string | undefined;
    if (
      expectedNumber != null &&
      Number.isFinite(expectedNumber) &&
      prob != null
    ) {
      const weighted = (expectedNumber * prob) / 100;
      weightedDisplay = `¥${weighted.toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }

    return {
      id: api.id,
      opportunityCode: `OPP-${String(api.id).padStart(6, "0")}`,
      name: api.name,
      customerName: api.customer?.name || undefined,
      stage: api.stage,
      approvalStatus: api.approvalStatus,
      techApprovalStatus: api.techApprovalStatus || undefined,
      bizApprovalStatus: api.bizApprovalStatus || undefined,
      approvalOpinion: api.approvalOpinion || undefined,
      requirementBriefDocName: api.requirementBriefDocName || undefined,
      researchDocName: api.researchDocName || undefined,
      solutionOwnerUsername: api.solutionOwnerUsername || undefined,
      expectedValue: expectedDisplay,
      expectedCloseDate: api.expectedCloseDate || undefined,
      probability: prob,
      weightedValue: weightedDisplay,
      // createdAt 仅用于排序展示，不直接渲染
      ...(api.createdAt ? { createdAt: api.createdAt } : {}),
      ...(api.updatedAt ? { updatedAt: api.updatedAt } : {}),
      ...(api.owner?.username ? { ownerUsername: api.owner.username } : {}),
    };
  };

  const loadOpportunityDetailFromApi = async (opportunityId: number) => {
    const response = await fetch(buildApiUrl(`/opportunities/${opportunityId}`), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) {
      throw new Error(`商机详情加载失败：${response.status}`);
    }
    const data = (await response.json()) as ApiOpportunity;
    return mapApiToDemo(data);
  };

  const loadFromApi = async () => {
    setLoading(true);
    setError(null);
    try {
      const sharedDemo = loadSharedDemoOpportunities();
      const response = await fetch(buildApiUrl("/opportunities"), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) {
        setOpportunities(sharedDemo);
        return;
      }
      const data = (await response.json()) as
        | OpportunityListResponse
        | ApiOpportunity[];
      const mapped: DemoOpportunity[] = Array.isArray(data)
        ? data.map((item) => mapApiToDemo(item))
        : (Array.isArray(data.items) ? data.items : []).map((item) =>
            mapApiToDemo(item),
          );

      if (!mapped.length) {
        setOpportunities(sharedDemo);
      } else {
        // API 可用时以真实后端商机为准，避免演示数据与真实主键错位后
        // 继续触发审批、方案等接口时传入不存在的 businessId。
        setOpportunities(mapped);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to load opportunities (demo view):", err);
      setOpportunities(loadSharedDemoOpportunities());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    void loadFromApi();
    void loadOpportunityWorkflowDefinitions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    saveSharedDemoOpportunities(opportunities);
  }, [opportunities]);

  useEffect(() => {
    const handleSharedOpportunitiesUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<DemoOpportunity[]>;
      if (Array.isArray(customEvent.detail)) {
        setOpportunities(customEvent.detail);
      }
    };
    window.addEventListener(
      "sharedDemoOpportunitiesUpdated",
      handleSharedOpportunitiesUpdated as EventListener,
    );
    return () => {
      window.removeEventListener(
        "sharedDemoOpportunitiesUpdated",
        handleSharedOpportunitiesUpdated as EventListener,
      );
    };
  }, []);
  const handleDeleteOpportunity = (record: DemoOpportunity) => {
    if (!canDeleteOpportunities) {
      message.warning("当前账号无权删除商机。");
      return;
    }
    Modal.confirm({
      title: `确认删除商机「${record.name}」？`,
      content: "删除后该商机将从当前列表移除。",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: () => {
        setOpportunities((prev) => prev.filter((o) => o.id !== record.id));
        if (detailOpportunity && detailOpportunity.id === record.id) {
          setDetailVisible(false);
          setDetailOpportunity(null);
        }
        message.success("已删除商机");
      },
    });
  };

  // 方案版本示例与评审结果已按你的要求从商机详情中移除，
  // 后续如需方案层面的操作，请在“解决方案”页面统一处理。

  const parseAmount = (value?: string): number => {
    if (!value) return 0;
    const cleaned = value.replace(/[¥,]/g, "");
    const num = Number(cleaned);
    return Number.isNaN(num) ? 0 : num;
  };

  const filtered = opportunities.filter((opp) => {
    if (stageFilter && stageFilter.length > 0) {
      if (opp.stage !== stageFilter) return false;
    }
    if (ownerFilter && ownerFilter.length > 0) {
      if (!opp.ownerUsername || !ownerFilter.includes(opp.ownerUsername)) {
        return false;
      }
    }
    if (approvalStatusFilter) {
      if (getDerivedOpportunityApprovalStatus(opp) !== approvalStatusFilter) {
        return false;
      }
    }
    if (keyword && keyword.trim().length > 0) {
      const k = keyword.trim().toLowerCase();
      const name = opp.name?.toLowerCase() || "";
      const customer = opp.customerName?.toLowerCase() || "";
      const projectName = getProjectNameFromOpportunity(opp).toLowerCase();
      if (!name.includes(k) && !customer.includes(k) && !projectName.includes(k)) {
        return false;
      }
    }
    if (onlyMine && currentUsername) {
      if (!opp.ownerUsername || opp.ownerUsername !== currentUsername) {
        return false;
      }
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "expectedValue_desc" || sortKey === "expectedValue_asc") {
      const av = parseAmount(a.expectedValue);
      const bv = parseAmount(b.expectedValue);
      if (sortKey === "expectedValue_desc") {
        return bv - av;
      }
      return av - bv;
    }
    // 默认按创建时间（最新在前）
    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bt - at;
  });

  useEffect(() => {
    setPage(1);
  }, [keyword, stageFilter, approvalStatusFilter, sortKey, onlyMine, ownerFilter]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(
        OPPORTUNITY_TABLE_STORAGE_KEY,
        JSON.stringify(tablePreference),
      );
    } catch {
      // ignore storage errors
    }
  }, [tablePreference]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(sorted.length / pageSize));
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [sorted.length, page, pageSize]);

  const totalCount = sorted.length;
  const totalExpected = sorted.reduce(
    (sum, o) => sum + parseAmount(o.expectedValue),
    0,
  );
  const totalWeighted = sorted.reduce(
    (sum, o) => sum + parseAmount(o.weightedValue),
    0,
  );
  const avgProbability =
    sorted.length > 0
      ? Math.round(
          sorted.reduce(
            (sum, o) => sum + (o.probability != null ? o.probability : 0),
            0,
          ) / sorted.length,
        )
      : 0;

  // 各阶段商机数：按“进度”（线索确认 / 需求分析）维度统计，而不是按底层阶段枚举
  const stageStats = [
    { key: "discovery_progress", progress: "线索确认" },
    { key: "analysis_progress", progress: "需求分析" },
  ].map(({ key, progress }) => {
    const items = sorted.filter(
      (opp) => getProgressLabel(opp.stage) === progress,
    );
    const count = items.length;
    const stageExpected = items.reduce(
      (sum, o) => sum + parseAmount(o.expectedValue),
      0,
    );
    const stageWeighted = items.reduce(
      (sum, o) => sum + parseAmount(o.weightedValue),
      0,
    );
    const stageAvgProb =
      count > 0
        ? Math.round(
            items.reduce(
              (sum, o) => sum + (o.probability != null ? o.probability : 0),
              0,
            ) / count,
          )
        : 0;

    return {
      key,
      label: progress,
      count,
      expected: stageExpected,
      weighted: stageWeighted,
      avgProb: stageAvgProb,
    };
  });

  // 方案版本相关统计逻辑已移除，避免与“解决方案”页面重复。

  const ownerOptions = Array.from(
    new Set(
      opportunities
        .map((opp) => opp.ownerUsername)
        .filter((u): u is string => !!u && u.trim().length > 0),
    ),
  ).map((username) => ({
    value: username,
    label: getSalesOwnerLabel(username),
  }));

  function getProgressLabel(stage?: string): string {
    // 列表进度仅区分“线索确认”和“需求分析”两档，
    // 底层阶段仍然保留完整的售前阶段模型
    if (!stage || stage === "discovery") {
      return "线索确认";
    }
    // discovery 之后的所有阶段在列表视角统一归为“需求分析”
    return "需求分析";
  }

  function getProgressColor(stage?: string): string {
    const label = getProgressLabel(stage);
    if (label === "线索确认") return "blue";
    if (label === "需求分析") return "orange";
    return "default";
  }

  const getApprovalStatusMeta = (
    status?: OpportunityApprovalDerivedStatus,
  ): { label: string; color: string } => {
    if (status === "approved") {
      return { label: "已批准", color: "green" };
    }
    if (status === "rejected") {
      return { label: "已驳回", color: "red" };
    }
    if (status === "pending") {
      return { label: "审核中", color: "gold" };
    }
    return { label: "未发起", color: "default" };
  };

  const allColumns: ColumnsType<DemoOpportunity> = [
    {
      title: "序号",
      key: "index",
      width: 72,
      render: (_: unknown, __: DemoOpportunity, index: number) =>
        (page - 1) * pageSize + index + 1,
    },
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
      title: "销售负责人",
      dataIndex: "ownerUsername",
      key: "ownerUsername",
      render: (value?: string) => getSalesOwnerLabel(value),
    },
    {
      title: "客户",
      dataIndex: "customerName",
      key: "customerName",
    },
    {
      title: "进度",
      dataIndex: "stage",
      key: "stage",
      render: (stage?: string) => {
        if (!stage) return "-";
        const label = getProgressLabel(stage);
        const color = getProgressColor(stage);
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: "审批状态",
      dataIndex: "approvalStatus",
      key: "approvalStatus",
      render: (_status: ApprovalStatus | undefined, record: DemoOpportunity) => {
        const meta = getApprovalStatusMeta(
          getDerivedOpportunityApprovalStatus(record),
        );
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: "预期价值",
      dataIndex: "expectedValue",
      key: "expectedValue",
      render: (value?: string) => value || "-",
    },
    {
      title: "成功概率",
      dataIndex: "probability",
      key: "probability",
      render: (prob?: number) =>
        prob != null ? `${prob}%` : "-",
    },
    {
      title: "加权价值",
      dataIndex: "weightedValue",
      key: "weightedValue",
      render: (value?: string) => value || "-",
    },
    {
      title: "预计关闭时间",
      dataIndex: "expectedCloseDate",
      key: "expectedCloseDate",
      render: (value?: string) => value || "-",
    },
    {
      title: "操作",
      key: "action",
      render: (_: unknown, record: DemoOpportunity) => (
        <>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setDetailOpportunity(record);
              setDetailVisible(true);
            }}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              void openApprovalModalWithRuntime(record);
            }}
          >
            审批
          </Button>
          <Button
            type="link"
            size="small"
            disabled={!canEditOpportunities}
            onClick={() => {
              if (!canEditOpportunities) {
                message.warning("当前账号无权编辑商机。");
                return;
              }
              setEditingOpportunity(record);
              createForm.setFieldsValue({
                name: record.name,
                customerName: record.customerName,
                projectBindingMode: "existing",
                existingProjectKey: getProjectKeyFromOpportunity(record),
                newProjectName: record.projectName || getProjectNameFromOpportunity(record),
                ownerUsername: record.ownerUsername,
                stage: record.stage || "discovery",
                expectedValue: record.expectedValue
                  ? String(parseAmount(record.expectedValue))
                  : undefined,
                probability:
                  record.probability != null ? record.probability : undefined,
                expectedCloseDate: record.expectedCloseDate,
              });
              setCreateVisible(true);
            }}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            disabled={!canDeleteOpportunities}
            onClick={() => handleDeleteOpportunity(record)}
          >
            删除
          </Button>
        </>
      ),
    },
  ];

  const selectedToggleableColumnKeys = getVisibleToggleableKeys(
    OPPORTUNITY_TABLE_COLUMN_META,
    tablePreference.visibleColumnKeys,
  );
  const columnOptions = OPPORTUNITY_TABLE_COLUMN_META.filter(
    (item) => !item.locked,
  ).map((item) => ({
    value: item.key,
    label: item.title,
  }));
  const columns = allColumns
    .filter((column) => {
      const columnDataIndex = "dataIndex" in column ? column.dataIndex : undefined;
      const resolvedKey = Array.isArray(columnDataIndex)
        ? columnDataIndex.join(".")
        : columnDataIndex;
      return tablePreference.visibleColumnKeys.includes(
        String(column.key || resolvedKey || "") as OpportunityColumnKey,
      );
    })
    .map((column) => {
      const columnDataIndex = "dataIndex" in column ? column.dataIndex : undefined;
      const resolvedKey = Array.isArray(columnDataIndex)
        ? columnDataIndex.join(".")
        : columnDataIndex;
      const key = String(column.key || resolvedKey || "") as OpportunityColumnKey;
      const meta = OPPORTUNITY_TABLE_COLUMN_META.find((item) => item.key === key);
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
  const updateVisibleColumns = (nextKeys: OpportunityColumnKey[]) => {
    const lockedKeys = OPPORTUNITY_TABLE_COLUMN_META.filter(
      (item) => item.locked,
    ).map((item) => item.key);
    const visibleColumnKeys = Array.from(new Set([...lockedKeys, ...nextKeys]));
    setTablePreference((prev) => ({
      ...prev,
      visibleColumnKeys,
      columnWidths: normalizeTableWidths(
        OPPORTUNITY_TABLE_COLUMN_META,
        visibleColumnKeys,
        prev.columnWidths,
      ),
    }));
  };
  const columnSettingContent = (
    <div style={{ width: 280 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>显示列</div>
      <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 12 }}>
        勾选需要展示的商机列表列。
      </div>
      <Checkbox.Group
        style={{ width: "100%" }}
        value={selectedToggleableColumnKeys}
        onChange={(value) => updateVisibleColumns(value as OpportunityColumnKey[])}
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
              visibleColumnKeys: OPPORTUNITY_TABLE_COLUMN_META.map((item) => item.key),
              columnWidths: normalizeTableWidths(
                OPPORTUNITY_TABLE_COLUMN_META,
                OPPORTUNITY_TABLE_COLUMN_META.map((item) => item.key),
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
              getDefaultTablePreference(OPPORTUNITY_TABLE_COLUMN_META, true),
            )
          }
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
            placeholder="搜索商机..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Select
            allowClear
            style={{ width: 180 }}
            placeholder="全部状态（审批）"
            value={approvalStatusFilter}
            onChange={(value) =>
              setApprovalStatusFilter(
                (value as OpportunityApprovalDerivedStatus | undefined) || undefined,
              )
            }
            options={[
              { value: "not_started", label: "未发起" },
              { value: "approved", label: "已批准" },
              { value: "pending", label: "审核中" },
              { value: "rejected", label: "已驳回" },
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
          <Select
            size="middle"
            style={{ width: 200 }}
            value={sortKey}
            onChange={(value) => setSortKey(value)}
            options={[
              {
                value: "createdAt_desc",
                label: "最新创建优先",
              },
              {
                value: "expectedValue_desc",
                label: "金额从高到低",
              },
              {
                value: "expectedValue_asc",
                label: "金额从低到高",
              },
            ]}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 6, paddingInline: 4 }}>
            <Switch
              size="small"
              checked={onlyMine}
              onChange={(checked) => setOnlyMine(checked)}
              disabled={!currentUsername}
            />
            <span style={{ fontSize: 12 }}>只看我负责的</span>
          </div>
          </div>
          <Button
            type="primary"
            disabled={!canCreateOpportunities}
            onClick={() => {
              if (!canCreateOpportunities) {
                message.warning("当前账号无权新建商机。");
                return;
              }
              createForm.setFieldsValue({
                name: "",
                customerName: "",
                ownerUsername: currentUsername || undefined,
                stage: "discovery",
                expectedValue: "",
                probability: "",
                expectedCloseDate: "",
                projectBindingMode: "new",
                existingProjectKey: undefined,
                newProjectName: "",
              });
              setCreateVisible(true);
            }}
          >
            + 新建商机
          </Button>
        </div>
      </Card>

      {/* 统计卡片：商机总数 / 总预期价值 / 总加权价值 / 平均成功概率 */}
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
              💡
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {totalCount}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>商机总数</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            bodyStyle={{ padding: "14px 16px" }}
            onClick={() => {
              setStatsModalType("expected");
              setStatsModalVisible(true);
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6, color: "#52c41a" }}>
              💰
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {totalExpected.toLocaleString("zh-CN")}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
              总预期价值
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            bodyStyle={{ padding: "14px 16px" }}
            onClick={() => {
              setStatsModalType("weighted");
              setStatsModalVisible(true);
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6, color: "#722ed1" }}>
              📊
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {totalWeighted.toLocaleString("zh-CN")}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
              总加权价值
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            bodyStyle={{ padding: "14px 16px" }}
            onClick={() => {
              setStatsModalType("probability");
              setStatsModalVisible(true);
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6, color: "#fa8c16" }}>
              %
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {avgProbability}%
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
              平均成功概率
            </div>
          </Card>
        </Col>
      </Row>

      {/* 商机列表表格（3步转化流程示意） */}
      <div ref={listRef}>
        <Card
          style={compactStatCardStyle}
          bodyStyle={{ padding: 12 }}
          title="商机列表"
          extra={
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <Popover trigger="click" placement="bottomRight" content={columnSettingContent}>
                <Button size="small">
                  列设置（{selectedToggleableColumnKeys.length}/{columnOptions.length}）
                </Button>
              </Popover>
            </div>
          }
        >
          <Table<DemoOpportunity>
            size="small"
            components={{ header: { cell: ResizableHeaderCell } }}
            scroll={{ x: tableScrollX }}
            rowKey="id"
            pagination={{
              current: page,
              pageSize,
              total: sorted.length,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (nextPage, nextPageSize) => {
                setPage(nextPage);
                setPageSize(nextPageSize);
              },
            }}
            loading={loading}
            dataSource={sorted.slice((page - 1) * pageSize, page * pageSize)}
            columns={columns}
          />
        </Card>
      </div>
      <Modal
        title={editingOpportunity ? "编辑商机" : "新建商机"}
        open={createVisible}
        onCancel={() => {
          setCreateVisible(false);
          createForm.resetFields();
          setEditingOpportunity(null);
        }}
        onOk={async () => {
          try {
            const values = await createForm.validateFields();
            const {
              name,
              customerName: formCustomer,
              projectBindingMode,
              existingProjectKey,
              newProjectName,
              stage: formStage,
              expectedValue: formExpectedValue,
              probability: formProbability,
              expectedCloseDate,
              ownerUsername: formOwnerUsername,
            } = values as {
              name: string;
              customerName?: string;
              projectBindingMode: "existing" | "new";
              existingProjectKey?: string;
              newProjectName?: string;
              stage: string;
              expectedValue?: string;
              probability?: number;
              expectedCloseDate?: string;
              ownerUsername?: string;
            };

            const now = new Date().toISOString();
            const maxId = opportunities.reduce(
              (max, o) => (o.id > max ? o.id : max),
              0,
            );
            const newId = maxId + 1;
            const nextOpportunityCode = getNextOpportunityCode(
              opportunities.map((item) => item.opportunityCode),
            );

            const rawExpected = formExpectedValue
              ? Number(formExpectedValue)
              : undefined;
            let expectedDisplay: string | undefined;
            if (
              rawExpected != null &&
              Number.isFinite(rawExpected)
            ) {
              expectedDisplay = `¥${rawExpected.toLocaleString("zh-CN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`;
            }

            let probabilityNumber: number | undefined;
            if (formProbability !== undefined && formProbability !== null) {
              const num = Number(formProbability);
              if (!Number.isNaN(num)) {
                probabilityNumber = num;
              }
            }

            let weightedDisplay: string | undefined;
            if (
              rawExpected != null &&
              Number.isFinite(rawExpected) &&
              probabilityNumber != null
            ) {
              const weighted = (rawExpected * probabilityNumber) / 100;
              weightedDisplay = `¥${weighted.toLocaleString("zh-CN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`;
            }

            const trimmedCustomer = formCustomer?.trim() || undefined;
            const resolvedProjectName =
              projectBindingMode === "existing"
                ? projectOptions.find((item) => item.value === existingProjectKey)?.label ||
                  getProjectNameFromOpportunity({
                    name,
                    customerName: trimmedCustomer,
                  } as DemoOpportunity)
                : normalizeProjectName(newProjectName || name);
            const resolvedProjectKey =
              projectBindingMode === "existing" && existingProjectKey
                ? existingProjectKey
                : buildProjectKey(resolvedProjectName, trimmedCustomer);

            if (editingOpportunity) {
              // 编辑已有商机（Mock）
              const targetId = editingOpportunity.id;
              setOpportunities((prev) =>
                prev.map((o) =>
                  o.id === targetId
                    ? {
                        ...o,
                        name,
                        customerName: trimmedCustomer,
                        projectName: resolvedProjectName,
                        projectKey: resolvedProjectKey,
                        stage: formStage,
                        expectedValue: expectedDisplay,
                        expectedCloseDate: expectedCloseDate || undefined,
                        probability: probabilityNumber,
                        weightedValue: weightedDisplay,
                        ownerUsername:
                          formOwnerUsername && formOwnerUsername.trim().length > 0
                            ? formOwnerUsername
                            : o.ownerUsername,
                        opportunityCode: o.opportunityCode || nextOpportunityCode,
                      }
                    : o,
                ),
              );
              message.success("已更新商机");
            } else {
              const newOpp: DemoOpportunity = {
                id: newId,
                opportunityCode: nextOpportunityCode,
                name,
                customerName: trimmedCustomer,
                projectName: resolvedProjectName,
                projectKey: resolvedProjectKey,
                stage: formStage,
                expectedValue: expectedDisplay,
                expectedCloseDate: expectedCloseDate || undefined,
                probability: probabilityNumber,
                weightedValue: weightedDisplay,
                createdAt: now,
                ownerUsername:
                  (formOwnerUsername &&
                    formOwnerUsername.trim().length > 0 &&
                    formOwnerUsername) ||
                  currentUsername ||
                  undefined,
              };

              setOpportunities((prev) => [...prev, newOpp]);
              message.success("已创建商机");
            }

            createForm.resetFields();
            setEditingOpportunity(null);
            setCreateVisible(false);
          } catch {
            // 校验失败时不关闭弹窗
          }
        }}
        okText="保存"
        cancelText="取消"
        destroyOnClose
        >
          <Form layout="vertical" form={createForm}>
          <Form.Item
            label="商机名称"
            name="name"
            rules={[{ required: true, message: "请输入商机名称" }]}
          >
            <Input placeholder="例如：总部统一安全接入方案" />
          </Form.Item>
          <Form.Item label="客户名称" name="customerName">
            <Input placeholder="例如：某某集团" />
          </Form.Item>
          <Form.Item
            label="所属项目"
            name="projectBindingMode"
            initialValue="new"
            rules={[{ required: true, message: "请选择项目绑定方式" }]}
            extra="商机必须显式绑定到一个项目主线。可挂到已有项目，也可新建一个项目。"
          >
            <Radio.Group
              options={[
                { label: "绑定已有项目", value: "existing" },
                { label: "新建项目并绑定", value: "new" },
              ]}
            />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, next) =>
              prev.projectBindingMode !== next.projectBindingMode
            }
          >
            {({ getFieldValue }) =>
              getFieldValue("projectBindingMode") === "existing" ? (
                <Form.Item
                  label="选择已有项目"
                  name="existingProjectKey"
                  rules={[{ required: true, message: "请选择所属项目" }]}
                >
                  <Select
                    showSearch
                    placeholder="请选择已有项目"
                    optionFilterProp="label"
                    options={projectOptions}
                  />
                </Form.Item>
              ) : (
                <Form.Item
                  label="新项目名称"
                  name="newProjectName"
                  rules={[{ required: true, message: "请输入项目名称" }]}
                >
                  <Input placeholder="例如：总部统一安全接入方案项目" />
                </Form.Item>
              )
            }
          </Form.Item>
          <Form.Item label="销售负责人" name="ownerUsername">
            <Select
              allowClear
              placeholder="请选择销售负责人"
              options={getSelectableOwnerOptions("sales")}
            />
          </Form.Item>
          <Form.Item
            label="阶段"
            name="stage"
            rules={[{ required: true, message: "请选择商机阶段" }]}
            initialValue="discovery"
          >
            <Select
              options={[
                { value: "discovery", label: STAGE_LABELS.discovery },
                {
                  value: "solution_design",
                  label: STAGE_LABELS.solution_design,
                },
                { value: "proposal", label: STAGE_LABELS.proposal },
                { value: "bidding", label: STAGE_LABELS.bidding },
                {
                  value: "negotiation",
                  label: STAGE_LABELS.negotiation,
                },
                { value: "won", label: STAGE_LABELS.won },
                { value: "lost", label: STAGE_LABELS.lost },
              ]}
            />
          </Form.Item>
          <Form.Item label="预期价值（元）" name="expectedValue">
            <Input placeholder="例如：5000000" />
          </Form.Item>
          <Form.Item label="成功概率（0-100）" name="probability">
            <Input placeholder="例如：60" />
          </Form.Item>
          <Form.Item label="预计关闭时间" name="expectedCloseDate">
            <Input placeholder="例如：2024-06-30" />
          </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="商机统计概览"
          open={statsModalVisible}
          onCancel={() => {
            setStatsModalVisible(false);
            setStatsModalType(null);
          }}
          footer={
            <Button
              type="primary"
              onClick={() => {
                setStatsModalVisible(false);
                setStatsModalType(null);
              }}
            >
              关闭
            </Button>
          }
        >
          {statsModalType === "expected" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Paragraph>
                当前列表总预期价值：{" "}
                <Text strong>
                  {totalExpected.toLocaleString("zh-CN")}
                </Text>
              </Paragraph>
              <Paragraph type="secondary" style={{ fontSize: 12 }}>
                该数值基于当前筛选条件下的商机预估金额汇总，
                后续接入后端后可按行业 / 客户 / 负责人等维度拆分展示。
              </Paragraph>
            </div>
          )}
          {statsModalType === "weighted" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Paragraph>
                当前列表总加权价值：{" "}
                <Text strong>
                  {totalWeighted.toLocaleString("zh-CN")}
                </Text>
              </Paragraph>
              <Paragraph type="secondary" style={{ fontSize: 12 }}>
                加权价值 = 预估金额 × 成功概率，
                用于快速评估当前商机池的“潜在签约规模”。
              </Paragraph>
            </div>
          )}
          {statsModalType === "probability" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Paragraph>
                当前列表平均成功概率：{" "}
                <Text strong>{avgProbability}%</Text>
              </Paragraph>
              <Paragraph type="secondary" style={{ fontSize: 12 }}>
                该数值基于当前筛选条件下所有商机的平均成交概率，
                后续可在“数据分析”模块中按阶段 / 行业等维度进一步拆分。
              </Paragraph>
            </div>
          )}
          {!statsModalType && (
            <Paragraph type="secondary" style={{ fontSize: 12 }}>
              请选择上方的统计卡片查看对应指标说明。
            </Paragraph>
          )}
        </Modal>
      <Modal
        title={
          detailOpportunity
            ? `商机详情：${detailOpportunity.name}`
            : "商机详情"
        }
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        onOk={() => setDetailVisible(false)}
        width={720}
      >
        {detailOpportunity && (
          <>
            <div style={{ marginBottom: 24 }}>
              <Text strong>商机转化流程</Text>
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                {(() => {
                  const steps = getOpportunityDetailFlowSummary(
                    detailOpportunity,
                    detailApprovalInstance,
                  );

                  return steps.map((step, index) => {
                    let bgColor =
                      "linear-gradient(180deg, var(--app-surface) 0%, var(--app-surface-soft) 100%)";
                    let borderColor = "var(--app-border)";
                    let statusText = step.statusText;
                    let textColor = "var(--app-text-secondary)";

                    if (step.tone === "success") {
                      bgColor = "var(--app-success-surface)";
                      borderColor = "var(--app-success-border)";
                      textColor = "#4ade80";
                    } else if (step.tone === "danger") {
                      bgColor = "var(--app-danger-surface)";
                      borderColor = "var(--app-danger-border)";
                      textColor = "#f87171";
                    } else if (step.tone === "warning") {
                      bgColor = "var(--app-warning-surface)";
                      borderColor = "var(--app-warning-border)";
                      textColor = "#fbbf24";
                    }

                    return (
                      <div
                        key={step.title}
                        style={{
                          flex: 1,
                          minWidth: 160,
                          padding: 12,
                          borderRadius: 4,
                          border: `1px solid ${borderColor}`,
                          background: bgColor,
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
                            background: "#1890ff",
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
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span
                            style={{
                              fontWeight: 500,
                              color: "var(--app-text-primary)",
                            }}
                          >
                            {step.title}
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              color: textColor,
                            }}
                          >
                            {statusText}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              {(detailApprovalLoading || detailApprovalError) && (
                <div style={{ marginTop: 8 }}>
                  {detailApprovalLoading && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      正在加载真实审批过程...
                    </Text>
                  )}
                  {!detailApprovalLoading && detailApprovalError && (
                    <Text type="warning" style={{ fontSize: 12 }}>
                      {detailApprovalError}
                    </Text>
                  )}
                </div>
              )}
            </div>

            {/* 左右信息 + 时间线 */}
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary">客户</Text>
                  <div>{detailOpportunity.customerName || "-"}</div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary">销售负责人</Text>
                  <div>{getSalesOwnerLabel(detailOpportunity.ownerUsername)}</div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary">进度</Text>
                  <div>
                    {getProgressLabel(detailOpportunity.stage)}
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary">审批结果</Text>
                  <div>
                    {(() => {
                      const meta = getApprovalStatusMeta(
                        detailOpportunity.approvalStatus,
                      );
                      return meta.label;
                    })()}
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary">预期价值</Text>
                  <div>{detailOpportunity.expectedValue || "-"}</div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary">成功概率</Text>
                  <div>
                    {detailOpportunity.probability != null
                      ? `${detailOpportunity.probability}%`
                      : "-"}
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary">加权价值</Text>
                  <div>{detailOpportunity.weightedValue || "-"}</div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary">预计关闭时间</Text>
                  <div>{detailOpportunity.expectedCloseDate || "-"}</div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">审批文档</Text>
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {[
                      {
                        title: "需求说明文档",
                        fileName: detailOpportunity.requirementBriefDocName,
                      },
                      {
                        title: "需求调研文档",
                        fileName: detailOpportunity.researchDocName,
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: "1px solid var(--app-border)",
                          background: "var(--app-surface-soft)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <div style={{ color: "var(--app-text-primary)", fontWeight: 500 }}>
                              {item.title}
                            </div>
                            <div style={{ color: "var(--app-text-secondary)", fontSize: 12 }}>
                              {item.fileName || "暂无文件"}
                            </div>
                          </div>
                          {item.fileName && (
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <Button
                                size="small"
                                onClick={() =>
                                  handlePreviewDocument(item.title, item.fileName as string)
                                }
                              >
                                查看
                              </Button>
                              <Button
                                size="small"
                                onClick={() =>
                                  handleDownloadDocument(item.fileName as string)
                                }
                              >
                                下载
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => {
                      if (onNavigateToProject) {
                        onNavigateToProject(
                          detailOpportunity.projectName ||
                            getProjectNameFromOpportunity(detailOpportunity),
                        );
                      }
                    }}
                  >
                    跳转到项目管理（按项目名称过滤）
                  </Button>
                </div>
                <div style={{ marginTop: 16 }}>
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => {
                      const flow: string[] = [
                        "discovery",
                        "solution_design",
                        "proposal",
                        "bidding",
                        "negotiation",
                        "won",
                      ];
                      const currentStage = detailOpportunity.stage;
                      const currentIndex = currentStage
                        ? flow.indexOf(currentStage)
                        : -1;
                      if (currentIndex === -1) {
                        // 没有阶段或未知阶段，从第一个开始
                        const nextStage = flow[0];
                        setOpportunities((prev) =>
                          prev.map((o) =>
                            o.id === detailOpportunity.id
                              ? { ...o, stage: nextStage }
                              : o,
                          ),
                        );
                        setDetailOpportunity({
                          ...detailOpportunity,
                          stage: nextStage,
                        });
                        return;
                      }
                      if (currentIndex >= flow.length - 1) {
                        // 已经到达最终阶段，中标；不再推进
                        return;
                      }
                      const nextStage = flow[currentIndex + 1];
                      setOpportunities((prev) =>
                        prev.map((o) =>
                          o.id === detailOpportunity.id
                            ? { ...o, stage: nextStage }
                            : o,
                        ),
                      );
                      setDetailOpportunity({
                        ...detailOpportunity,
                        stage: nextStage,
                      });
                    }}
                  >
                    推进阶段（方案提报）
                  </Button>
                  <Paragraph
                    type="secondary"
                    style={{ fontSize: 12, marginTop: 4 }}
                  >
                    当前阶段流转用于演示审批推进，不会直接写入后端。
                  </Paragraph>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 260 }}>
                <Text
                  type="secondary"
                  style={{ marginBottom: 8, display: "block" }}
                >
                  商机推进时间线
                </Text>
                <Timeline
                  items={[
                    {
                      color:
                        detailOpportunity.requirementBriefDocName &&
                        detailOpportunity.stage !== "lost"
                          ? "green"
                          : detailOpportunity.stage === "lost"
                            ? "red"
                            : "gray",
                      children:
                        "线索确认 —— 客户提出初步需求（需求说明文档）",
                    },
                    {
                      color:
                        detailOpportunity.researchDocName &&
                        detailOpportunity.stage !== "lost"
                          ? "green"
                          : detailOpportunity.stage === "lost"
                            ? "red"
                            : "gray",
                      children:
                        "需求澄清 —— 完成需求访谈与澄清（调研文档）",
                    },
                    {
                      color: "gray",
                      children: `方案设计阶段 —— 输出方案文档并完成内部评审（预计完成：${
                        detailOpportunity.expectedCloseDate ||
                        "待定"
                      }）`,
                    },
                    {
                      color: "gray",
                      children: `投标阶段 —— 准备并提交投标文件（预计完成：${
                        detailOpportunity.expectedCloseDate ||
                        "待定"
                      }）`,
                    },
                    {
                      color: "gray",
                      children: `谈判阶段 —— 与客户就条款进行谈判（预计结束：${
                        detailOpportunity.expectedCloseDate ||
                        "待定"
                      }）`,
                    },
                    {
                      color: "gray",
                      children: `结果待定 —— 等待评标结果或内部决策（预计结果时间：${
                        detailOpportunity.expectedCloseDate ||
                        "待定"
                      }）`,
                    },
                  ]}
                />
              </div>
              </div>

          </>
        )}
      </Modal>
      <Modal
        title="商机审批流程"
        open={approvalVisible}
        onCancel={() => {
          setApprovalVisible(false);
          setApprovalTarget(null);
          setApprovalOpinionDraft("");
          setApprovalInstance(null);
          setApprovalInstanceError(null);
          setApprovalRuntimeSource("local");
        }}
        footer={null}
        width={720}
        destroyOnClose
      >
        {approvalTarget && (
          <>
            <div style={{ marginBottom: 24 }}>
              <Typography.Title level={4} style={{ marginBottom: 16 }}>
                {approvalTarget.name}
              </Typography.Title>
              <div
                style={{
                  marginBottom: 12,
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
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--app-text-primary)",
                    }}
                  >
                    当前商机审批流程：{opportunityWorkflow?.name || "标准商机审批流程"}
                  </Text>
                  <Text
                    type="secondary"
                    style={{ fontSize: 12, color: "var(--app-text-secondary)" }}
                  >
                    流程来源：
                    {approvalRuntimeSource === "api"
                      ? "后端真实审批实例"
                      : opportunityWorkflowSource === "api"
                        ? "后端真实流程定义 + 本地审批回退"
                        : "本地回退模板"}
                  </Text>
                </div>
                <Text
                  type="secondary"
                  style={{ fontSize: 12, color: "var(--app-text-secondary)" }}
                >
                  流程定义来自“系统设置 &gt; 审批流程库”。当前商机页会优先加载后端真实审批实例；若当前商机尚未命中可用实例，再回退到前端演示链路。
                </Text>
                {approvalUsesBusinessSnapshot && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: "#d46b08",
                    }}
                  >
                    当前后端审批实例尚无历史动作记录，已按商机真实业务快照展示流程进度；该视图暂仅支持查看，不直接执行审批动作。
                  </div>
                )}
                {approvalInstanceLoading && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#2563eb" }}>
                    正在加载真实审批实例...
                  </div>
                )}
                {opportunityWorkflowError && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: "#d46b08",
                    }}
                  >
                    {opportunityWorkflowError}
                  </div>
                )}
                {approvalInstanceError && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: "#d46b08",
                    }}
                  >
                    {approvalInstanceError}
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: 16,
                }}
              >
                {(approvalRuntimeSource === "api" &&
                !approvalUsesBusinessSnapshot &&
                apiApprovalNodes.length > 0
                  ? apiApprovalNodes
                  : getApprovalWorkflowNodes()
                ).map((node, index) => {
                  const isApiNode = "status" in node;
                  const rejectedNodeIndex = getRejectedWorkflowNodeIndex(
                    approvalTarget,
                    approvalUsesBusinessSnapshot ? null : approvalInstance,
                  );
                  const isPostRejectedNode =
                    rejectedNodeIndex >= 0 && index > rejectedNodeIndex;
                  const statusMeta = getWorkflowNodeStatusMeta(
                    approvalTarget,
                    node,
                    approvalUsesBusinessSnapshot ? null : approvalInstance,
                  );
                  const rawFileName = getWorkflowNodeDocumentName(
                    approvalTarget,
                    node.fieldKey,
                  );
                  const fileName = isPostRejectedNode ? "" : rawFileName;
                  const isUploadNode = node.nodeType === "upload";
                  const isAssignmentNode = node.nodeType === "assignment";
                  const disabledReason = isPostRejectedNode
                    ? "流程已在前序节点驳回，后续节点不再执行。"
                    : approvalUsesBusinessSnapshot
                    ? "当前审批实例与业务进度尚未完成对齐，当前仅支持查看。"
                    : isApiNode
                    ? approvalInstance?.currentNodeId === node.id
                      ? node.canCurrentUserHandle
                        ? ""
                        : `当前节点待 ${node.approvers
                            .flatMap((item) => item.resolvedUsers)
                            .map((user) => user.displayName || getSharedTeamMemberLabel(user.username))
                            .join(" / ") || "指定责任人"} 处理。`
                      : node.status === "approved" ||
                          node.status === "rejected" ||
                          node.status === "skipped"
                        ? "当前节点已处理完成。"
                        : approvalInstance?.status === "rejected"
                          ? "当前流程已驳回，后续节点仅支持查看。"
                          : "请先完成上一流程节点。"
                    : getWorkflowNodeDisabledReason(
                        approvalTarget,
                        node,
                        index,
                      );
                  const isActionDisabled = Boolean(disabledReason);
                  const approverSummary = isApiNode
                    ? node.approvers
                        .flatMap((item) => item.resolvedUsers)
                        .map((user) => user.displayName || getSharedTeamMemberLabel(user.username))
                        .join(" / ")
                    : getWorkflowNodeApproverUsernames(
                        approvalTarget,
                        node,
                      )
                        .map((username) => getSharedTeamMemberLabel(username))
                        .join(" / ");
                  const displayStatusMeta = isApiNode
                    ? {
                        text:
                          node.status === "approved"
                            ? node.nodeType === "upload"
                              ? "已上传"
                              : node.nodeType === "assignment"
                                ? approverSummary || "已分配"
                                : "已通过"
                            : node.status === "rejected"
                              ? "已驳回"
                              : node.status === "in_progress"
                                ? "进行中"
                                : node.status === "skipped"
                                  ? "已跳过"
                                  : node.nodeType === "upload"
                                    ? "待上传"
                                    : node.nodeType === "assignment"
                                      ? "待分配"
                                      : "待审批",
                        color:
                          node.status === "approved"
                            ? "#4ade80"
                            : node.status === "rejected"
                              ? "#f87171"
                              : node.status === "in_progress"
                                ? "#f59e0b"
                                : "var(--app-text-secondary)",
                        active:
                          node.status === "approved" || node.status === "in_progress",
                      }
                    : statusMeta;
                  const finalStatusMeta = isPostRejectedNode
                    ? {
                        text: "未执行",
                        color: "var(--app-text-secondary)",
                        active: false,
                      }
                    : displayStatusMeta;
                  const cardBorder = finalStatusMeta.active
                    ? "var(--app-success-border)"
                    : "var(--app-border)";
                  const cardBackground = finalStatusMeta.active
                    ? "var(--app-success-surface)"
                    : "linear-gradient(180deg, var(--app-surface) 0%, var(--app-surface-soft) 100%)";

                  return (
                    <div
                      key={String(node.id)}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        border: `1px solid ${cardBorder}`,
                        background: cardBackground,
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: "#1890ff",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 600,
                            fontSize: 14,
                            flexShrink: 0,
                          }}
                        >
                          {index + 1}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontWeight: 500,
                              color: "var(--app-text-primary)",
                              marginBottom: 4,
                            }}
                          >
                            {"nodeName" in node ? node.nodeName : node.name}
                          </div>
                          <div style={{ fontSize: 12, color: finalStatusMeta.color }}>
                            {finalStatusMeta.text}
                          </div>
                          {node.description && (
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--app-text-secondary)",
                                marginTop: 4,
                              }}
                            >
                              {node.description}
                            </div>
                          )}
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--app-text-secondary)",
                              marginTop: 4,
                            }}
                          >
                            当前处理人：{approverSummary || "待配置"}
                          </div>
                        </div>
                      </div>

                      {isUploadNode && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            paddingLeft: 40,
                          }}
                        >
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Upload
                              disabled={isActionDisabled}
                              showUploadList={false}
                              beforeUpload={
                                isApiNode
                                  ? (async (file: File) => {
                                      await executeOpportunityApprovalAction(
                                        approvalTarget,
                                        node,
                                        "upload",
                                        { fileName: file.name, value: file.name },
                                      );
                                      return false;
                                    }) as any
                                  : node.fieldKey === "researchDocName"
                                    ? (handleResearchDocUpload as any)
                                    : (handleRequirementDocUpload as any)
                              }
                            >
                              <Button size="small" disabled={isActionDisabled}>
                                {node.actionButtonLabel || "上传文档"}
                              </Button>
                            </Upload>
                            {fileName && (
                              <>
                                <Button
                                  size="small"
                                  onClick={() =>
                                    handlePreviewDocument(
                                      node.fieldLabel ||
                                        ("nodeName" in node ? node.nodeName : node.name),
                                      fileName,
                                    )
                                  }
                                >
                                  查看
                                </Button>
                                <Button
                                  size="small"
                                  onClick={() => handleDownloadDocument(fileName)}
                                >
                                  下载
                                </Button>
                              </>
                            )}
                          </div>
                          {fileName && (
                            <div style={{ fontSize: 12, color: "var(--app-text-secondary)" }}>
                              当前文档：{fileName}
                            </div>
                          )}
                          {disabledReason && (
                            <div style={{ fontSize: 12, color: "var(--app-text-secondary)" }}>
                              {disabledReason}
                            </div>
                          )}
                        </div>
                      )}

                      {isAssignmentNode && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            paddingLeft: 40,
                          }}
                        >
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {node.fieldLabel || "负责人分配"}
                          </Text>
                          <Select
                            size="small"
                            disabled={isActionDisabled}
                            style={{ width: "100%" }}
                            placeholder={node.actionButtonLabel || "选择负责人"}
                            value={
                              isPostRejectedNode
                                ? undefined
                                : approvalTarget.solutionOwnerUsername
                            }
                            onChange={(value) => {
                              if (isApiNode) {
                                void executeOpportunityApprovalAction(
                                  approvalTarget,
                                  node,
                                  "assign",
                                  {
                                    assignedToUsername: value,
                                    value,
                                  },
                                );
                                return;
                              }
                              appendWorkflowRecords(
                                approvalTarget,
                                { solutionOwnerUsername: value },
                                [
                                  buildWorkflowRecord({
                                    node,
                                    actionType: "assign",
                                    actionLabel: "分配承接售前",
                                    assignedToUsername: value,
                                  }),
                                ],
                              );
                            }}
                            options={getSelectableOwnerOptions("presales")}
                          />
                          {disabledReason && (
                            <div style={{ fontSize: 12, color: "var(--app-text-secondary)" }}>
                              {disabledReason}
                            </div>
                          )}
                        </div>
                      )}

                      {node.nodeType === "approval" && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            paddingLeft: 40,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--app-text-secondary)",
                            }}
                          >
                            审批对象：{approverSummary || node.approverRole || "待配置审批对象"}
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Button
                              size="small"
                              type="primary"
                              disabled={isActionDisabled}
                              onClick={() => {
                                if (isApiNode) {
                                  void executeOpportunityApprovalAction(
                                    approvalTarget,
                                    node,
                                    "approve",
                                  );
                                  return;
                                }
                                if (!node.fieldKey) return;
                                const patch: Partial<DemoOpportunity> = {
                                  [node.fieldKey]: "approved",
                                } as Partial<DemoOpportunity>;
                                if (node.fieldKey === "approvalStatus") {
                                  patch.stage =
                                    approvalTarget.stage === "discovery"
                                      ? "solution_design"
                                      : approvalTarget.stage;
                                  patch.approvalOpinion = approvalOpinionDraft;
                                }
                                appendWorkflowRecords(approvalTarget, patch, [
                                  buildWorkflowRecord({
                                    node,
                                    actionType: "approve",
                                    actionLabel:
                                      node.fieldKey === "approvalStatus"
                                        ? "最终审批通过"
                                        : "审批通过",
                                    comment: approvalOpinionDraft,
                                  }),
                                ]);
                                if (node.fieldKey === "approvalStatus") {
                                  message.success("已提交最终审批：通过");
                                  setApprovalVisible(false);
                                  setApprovalTarget(null);
                                  setApprovalOpinionDraft("");
                                } else {
                                  message.success(
                                    `已完成「${"nodeName" in node ? node.nodeName : node.name}」审批通过`,
                                  );
                                }
                              }}
                            >
                              通过
                            </Button>
                            <Button
                              size="small"
                              danger
                              disabled={isActionDisabled || node.canReject === false}
                              onClick={() => {
                                if (isApiNode) {
                                  void executeOpportunityApprovalAction(
                                    approvalTarget,
                                    node,
                                    "reject",
                                  );
                                  return;
                                }
                                if (!node.fieldKey) return;
                                const patch: Partial<DemoOpportunity> = {
                                  [node.fieldKey]: "rejected",
                                } as Partial<DemoOpportunity>;
                                if (node.fieldKey === "approvalStatus") {
                                  patch.approvalOpinion = approvalOpinionDraft;
                                }
                                appendWorkflowRecords(approvalTarget, patch, [
                                  buildWorkflowRecord({
                                    node,
                                    actionType: "reject",
                                    actionLabel:
                                      node.fieldKey === "approvalStatus"
                                        ? "最终审批驳回"
                                        : "审批驳回",
                                    comment: approvalOpinionDraft,
                                  }),
                                ]);
                                if (node.fieldKey === "approvalStatus") {
                                  message.warning("已提交最终审批：驳回");
                                  setApprovalVisible(false);
                                  setApprovalTarget(null);
                                  setApprovalOpinionDraft("");
                                } else {
                                  message.warning(
                                    `已完成「${"nodeName" in node ? node.nodeName : node.name}」审批驳回`,
                                  );
                                }
                              }}
                            >
                              驳回
                            </Button>
                          </div>
                          {disabledReason && (
                            <div style={{ fontSize: 12, color: "var(--app-text-secondary)" }}>
                              {disabledReason}
                            </div>
                          )}
                        </div>
                      )}
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
                {(approvalRuntimeSource === "api" && approvalInstance && !approvalUsesBusinessSnapshot
                  ? [...approvalInstance.actions]
                      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                      .map((record) => {
                        const accentColor =
                          record.actionType === "approve"
                            ? "#4ade80"
                            : record.actionType === "reject"
                              ? "#f87171"
                              : "#f59e0b";
                        const operatorUsername = record.operator?.username || "system";
                        return (
                          <div
                            key={`api_action_${record.id}`}
                            style={{
                              padding: 12,
                              borderRadius: 10,
                              background: "var(--app-surface-soft)",
                              border: `1px solid color-mix(in srgb, ${accentColor} 24%, var(--app-border) 76%)`,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 6,
                                gap: 12,
                              }}
                            >
                              <strong style={{ color: "var(--app-text-primary)" }}>
                                {record.operator?.displayName ||
                                  getSharedTeamMemberLabel(operatorUsername)}
                              </strong>
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "var(--app-text-secondary)",
                                }}
                              >
                                {new Date(record.createdAt).toLocaleString("zh-CN")}
                              </span>
                            </div>
                            <div style={{ fontSize: 13, color: accentColor }}>
                              {record.nodeName || "审批动作"} ·{" "}
                              {getApiApprovalActionLabel(
                                record,
                                approvalInstance.nodes.find(
                                  (item) => item.id === record.approvalInstanceNodeId,
                                ) || null,
                              )}
                            </div>
                            {record.payload?.fileName && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "var(--app-text-secondary)",
                                  marginTop: 4,
                                }}
                              >
                                文档：{record.payload.fileName}
                              </div>
                            )}
                            {record.payload?.assignedToUsername && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "var(--app-text-secondary)",
                                  marginTop: 4,
                                }}
                              >
                                分配给：
                                {getSharedTeamMemberLabel(
                                  record.payload.assignedToUsername,
                                )}
                              </div>
                            )}
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
                      })
                  : (approvalUsesBusinessSnapshot
                    ? snapshotApprovalRecords
                    : (approvalTarget.workflowRecords || []))
                  .slice()
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .map((record) => {
                    const accentColor =
                      record.actionType === "approve"
                        ? "#4ade80"
                        : record.actionType === "reject"
                          ? "#f87171"
                          : record.actionType === "notify"
                            ? "#60a5fa"
                            : "#f59e0b";
                    return (
                      <div
                        key={record.id}
                        style={{
                          padding: 12,
                          borderRadius: 10,
                          background: "var(--app-surface-soft)",
                          border: `1px solid color-mix(in srgb, ${accentColor} 24%, var(--app-border) 76%)`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 6,
                            gap: 12,
                          }}
                        >
                          <strong style={{ color: "var(--app-text-primary)" }}>
                            {record.actorLabel}
                          </strong>
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--app-text-secondary)",
                            }}
                          >
                            {new Date(record.createdAt).toLocaleString("zh-CN")}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: accentColor }}>
                          {record.nodeName} · {record.actionLabel}
                        </div>
                        {record.fileName && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--app-text-secondary)",
                              marginTop: 4,
                            }}
                          >
                            文档：{record.fileName}
                          </div>
                        )}
                        {record.assignedToLabel && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--app-text-secondary)",
                              marginTop: 4,
                            }}
                          >
                            分配给：{record.assignedToLabel}
                          </div>
                        )}
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
                  }))}
                {(() => {
                  const hasApiRecords = Boolean(
                    approvalRuntimeSource === "api" &&
                      approvalInstance &&
                      !approvalUsesBusinessSnapshot &&
                      approvalInstance.actions.length > 0,
                  );
                  const hasSnapshotRecords =
                    approvalUsesBusinessSnapshot && snapshotApprovalRecords.length > 0;
                  const hasLocalRecords =
                    !approvalUsesBusinessSnapshot &&
                    approvalRuntimeSource !== "api" &&
                    Boolean(approvalTarget.workflowRecords?.length);
                  if (hasApiRecords || hasSnapshotRecords || hasLocalRecords) {
                    return null;
                  }
                  return (
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      border: "1px solid var(--app-border)",
                      background: "var(--app-surface-soft)",
                      color: "var(--app-text-secondary)",
                    }}
                  >
                    当前暂无流程记录，待首个节点开始处理后自动生成。
                  </div>
                  );
                })()}
              </div>
            </div>

            {/* 添加审批意见 */}
            <div style={{ marginBottom: 24 }}>
              <Typography.Title level={5} style={{ marginBottom: 12 }}>
                添加审批意见
              </Typography.Title>
              <Input.TextArea
                rows={4}
                placeholder="请输入审批意见或处理说明..."
                style={{ marginBottom: 12 }}
                value={approvalOpinionDraft}
                onChange={(e) => setApprovalOpinionDraft(e.target.value)}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                审批动作请在对应流程节点内完成。只有当前节点处理人可以执行上传、分配、通过或驳回。
              </Text>
            </div>
          </>
        )}
      </Modal>
      <Modal
        title={previewDocument?.title || "文档预览"}
        open={!!previewDocument}
        onCancel={() => setPreviewDocument(null)}
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <Button
              onClick={() =>
                previewDocument?.fileName &&
                handleDownloadDocument(previewDocument.fileName)
              }
              disabled={!previewDocument?.fileName}
            >
              下载
            </Button>
            <Button type="primary" onClick={() => setPreviewDocument(null)}>
              关闭
            </Button>
          </div>
        }
      >
        {previewDocument && (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid var(--app-border)",
              background: "var(--app-surface-soft)",
              color: "var(--app-text-primary)",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{previewDocument.fileName}</div>
            <div style={{ fontSize: 13, color: "var(--app-text-secondary)", lineHeight: 1.8 }}>
              当前预览入口已预留。后续接入真实文件服务后，这里将展示文档内容或在线预览页面。
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
