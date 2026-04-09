import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
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
  Switch,
  Form,
  Popover,
  Checkbox,
  Divider,
  message,
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
} from "../shared/workflowConfig";
import { DEFAULT_OPPORTUNITY_WORKFLOW } from "../shared/workflowTemplates";
import {
  type ApprovalStatus,
  type DemoOpportunity,
  hasSameDemoOpportunities,
  loadSharedDemoOpportunities,
  saveSharedDemoOpportunities,
  getSalesOwnerLabel,
  getSelectableOwnerOptions,
} from "../shared/opportunityDemoData";
import {
  getProjectKeyFromOpportunity,
  getProjectNameFromOpportunity,
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
import {
  getSharedTeamMemberLabel,
} from "../shared/teamDirectory";
import {
  ensureApprovalInstance,
  executeApprovalAction,
  getStoredAccessToken,
  type ApprovalActionType,
  type ApprovalInstanceNodeView,
  type ApprovalInstanceView,
} from "../shared/approvalInstances";
import type { LocalOpportunityApprovalPlan } from "./opportunities/opportunityApprovalLocalPlan";

const { Text, Paragraph } = Typography;

const LazyOpportunityApprovalModal = lazy(async () => {
  const module = await import("./opportunities/OpportunityApprovalModal");
  return { default: module.OpportunityApprovalModal };
});

const LazyOpportunityDetailModal = lazy(async () => {
  const module = await import("./opportunities/OpportunityDetailModal");
  return { default: module.OpportunityDetailModal };
});

const LazyOpportunityEditorModal = lazy(async () => {
  const module = await import("./opportunities/OpportunityEditorModal");
  return { default: module.OpportunityEditorModal };
});

const LazyOpportunitySupportModals = lazy(async () => {
  const module = await import("./opportunities/OpportunitySupportModals");
  return { default: module.OpportunitySupportModals };
});

type SolutionStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "rejected"
  | "archived";

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
  const [detailPreferBusinessSnapshot, setDetailPreferBusinessSnapshot] =
    useState(true);
  const [detailSteps, setDetailSteps] = useState<
    { title: string; statusText: string; tone: "default" | "success" | "warning" | "danger" }[]
  >([]);
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
  const [approvalPreferBusinessSnapshot, setApprovalPreferBusinessSnapshot] =
    useState(true);
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

  const getApprovalWorkflowNodes = () => {
    const nodes =
      opportunityWorkflow?.nodes?.length
        ? opportunityWorkflow.nodes
        : DEFAULT_OPPORTUNITY_WORKFLOW.nodes;
    return nodes.map((node, index) => getResolvedOpportunityNode(node, index));
  };

  const getCurrentOperatorUsername = () =>
    currentUser?.username || currentUsername || "";

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

  const syncOpportunityFromApprovalInstance = async (
    target: DemoOpportunity,
    instance: ApprovalInstanceView,
  ) => {
    const module = await import("./opportunities/opportunityApprovalSync");
    const patch = module.buildOpportunityPatchFromApprovalInstance(
      target,
      instance,
      getSharedTeamMemberLabel,
    );
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
    setApprovalPreferBusinessSnapshot(true);
    setApprovalInstance(null);
    setApprovalInstanceError(null);

    const token = accessToken || getStoredAccessToken();
    if (!token) {
      return;
    }

    setApprovalInstanceLoading(true);
    try {
      const instance = await ensureApprovalInstance(
        "opportunity",
        resolvedTarget.id,
        token,
      );
      setApprovalInstance(instance);
      setApprovalRuntimeSource("api");
      setApprovalPreferBusinessSnapshot(false);
      setApprovalInstanceError(null);
      if (instance.actions.length > 0) {
        await syncOpportunityFromApprovalInstance(resolvedTarget, instance);
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
    try {
      const token = accessToken || getStoredAccessToken();
      if (!token) {
        message.warning("当前登录态已失效，请重新登录后再试。");
        return false;
      }
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
      setApprovalPreferBusinessSnapshot(false);
      setApprovalInstanceError(null);
      await syncOpportunityFromApprovalInstance(target, nextInstance);
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

  const handleDownloadDocument = async (fileName: string) => {
    const module = await import("./opportunities/opportunityDetailActions");
    module.triggerOpportunityDocumentDownload(fileName);
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
    preferBusinessSnapshot = true,
  ) => {
    if (!preferBusinessSnapshot) {
      return false;
    }
    if (!instance || instance.actions.length > 0) {
      return false;
    }
    return hasBusinessSnapshotProgress(target);
  };

  const getDisplayApprovalInstance = (
    target: DemoOpportunity,
    instance?: ApprovalInstanceView | null,
    preferBusinessSnapshot = true,
  ) =>
    shouldPreferBusinessSnapshot(target, instance, preferBusinessSnapshot)
      ? null
      : instance || null;

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

  const appendWorkflowRecords = async (
    target: DemoOpportunity,
    patch: Partial<DemoOpportunity>,
    recordDrafts: LocalOpportunityApprovalPlan["recordDrafts"],
  ) => {
    const module = await import("./opportunities/opportunityLocalWorkflow");
    const currentOperatorUsername = getCurrentOperatorUsername();
    const { nextTarget, notifySummary } =
      module.buildNextOpportunityFromLocalWorkflowAction({
        target,
        patch,
        recordDrafts,
        workflowNodes: getApprovalWorkflowNodes(),
        currentOperatorUsername,
        currentOperatorLabel: currentOperatorUsername
          ? getSharedTeamMemberLabel(currentOperatorUsername)
          : "未登录用户",
        getSharedTeamMemberLabel,
      });
    if (notifySummary) {
      message.info(`已通知 ${notifySummary} 处理下一节点。`);
    }
    updateOpportunityById(target.id, () => nextTarget);
  };

  const applyLocalApprovalPlan = (plan: LocalOpportunityApprovalPlan) => {
    if (!approvalTarget) {
      return;
    }
    void appendWorkflowRecords(
      approvalTarget,
      plan.patch,
      plan.recordDrafts,
    );
    if (plan.feedbackTone === "warning") {
      message.warning(plan.feedbackMessage);
    } else {
      message.success(plan.feedbackMessage);
    }
    if (plan.closeModal) {
      setApprovalVisible(false);
      setApprovalTarget(null);
      setApprovalOpinionDraft("");
    }
  };

  const loadOpportunityWorkflowDefinitions = async () => {
    if (!accessToken) {
      setOpportunityWorkflowSource("local");
      return;
    }
    try {
      const module = await import("./opportunities/opportunityWorkflowApi");
      const normalized = await module.fetchOpportunityWorkflowDefinitions(
        accessToken,
      );

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
      setDetailPreferBusinessSnapshot(true);
      setDetailSteps([]);
      return;
    }

    let cancelled = false;
    setDetailApprovalLoading(true);
    setDetailApprovalError(null);

    const token = accessToken || getStoredAccessToken();
    if (!token) {
      setDetailApprovalInstance(null);
      setDetailApprovalError(null);
      setDetailApprovalLoading(false);
      setDetailPreferBusinessSnapshot(true);
      return;
    }

    void ensureApprovalInstance("opportunity", detailOpportunity.id, token)
      .then((instance) => {
        if (cancelled) {
          return;
        }
        setDetailApprovalInstance(instance);
        setDetailPreferBusinessSnapshot(false);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setDetailApprovalInstance(null);
        setDetailPreferBusinessSnapshot(true);
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

  useEffect(() => {
    if (!detailVisible || !detailOpportunity) {
      setDetailSteps([]);
      return;
    }

    let cancelled = false;
    void import("./opportunities/opportunityDetailFlowSummary")
      .then((module) => {
        if (cancelled) {
          return;
        }
        setDetailSteps(
          module.buildOpportunityDetailFlowSummary({
            target: detailOpportunity,
            instance: detailApprovalInstance,
            workflowNodes: getApprovalWorkflowNodes(),
            preferBusinessSnapshot: detailPreferBusinessSnapshot,
          }),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setDetailSteps([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    detailVisible,
    detailOpportunity,
    detailApprovalInstance,
    detailPreferBusinessSnapshot,
    opportunityWorkflow,
  ]);

  const apiApprovalNodes = approvalInstance?.nodes
    ? [...approvalInstance.nodes].sort((a, b) => a.nodeOrder - b.nodeOrder)
    : [];
  const approvalUsesBusinessSnapshot =
    approvalRuntimeSource === "api" &&
    approvalTarget != null &&
    shouldPreferBusinessSnapshot(
      approvalTarget,
      approvalInstance,
      approvalPreferBusinessSnapshot,
    );

  const STAGE_LABELS: Record<string, string> = {
    discovery: "发现",
    solution_design: "方案设计",
    proposal: "提案",
    bidding: "投标",
    negotiation: "谈判",
    won: "中标",
    lost: "丢单",
  };

  const loadOpportunityDetailFromApi = async (opportunityId: number) => {
    const module = await import("./opportunities/opportunityApi");
    return module.fetchOpportunityDetail(opportunityId, accessToken);
  };

  const loadFromApi = async () => {
    setLoading(true);
    setError(null);
    try {
      const sharedDemo = loadSharedDemoOpportunities();
      const module = await import("./opportunities/opportunityApi");
      const mapped = await module.fetchOpportunityList(accessToken);
      if (!mapped) {
        setOpportunities(sharedDemo);
        return;
      }

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
        setOpportunities((prev) =>
          hasSameDemoOpportunities(prev, customEvent.detail)
            ? prev
            : customEvent.detail,
        );
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
            onClick={async () => {
              if (!canEditOpportunities) {
                message.warning("当前账号无权编辑商机。");
                return;
              }
              const module = await import("./opportunities/opportunityEditorPrefill");
              setEditingOpportunity(record);
              createForm.setFieldsValue(
                module.buildOpportunityEditorFormValues(record),
              );
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
      <Card style={compactStatCardStyle} styles={{ body: { padding: 14 } }}>
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
            styles={{ body: { padding: "14px 16px" } }}
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
            styles={{ body: { padding: "14px 16px" } }}
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
            styles={{ body: { padding: "14px 16px" } }}
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
            styles={{ body: { padding: "14px 16px" } }}
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
          styles={{ body: { padding: 12 } }}
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
      <Suspense fallback={null}>
        <LazyOpportunityEditorModal
          open={createVisible}
          editing={Boolean(editingOpportunity)}
          form={createForm}
          onCancel={() => {
            setCreateVisible(false);
            createForm.resetFields();
            setEditingOpportunity(null);
          }}
          onSubmit={async () => {
          try {
            const values = await createForm.validateFields();
            const module = await import("./opportunities/opportunityEditorActions");
            const result = module.buildOpportunityFromEditorInput({
              values: values as {
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
              },
              opportunities,
              projectOptions,
              editingOpportunity,
              currentUsername,
            });

            if (result.mode === "edit") {
              // 编辑已有商机（Mock）
              setOpportunities((prev) =>
                prev.map((o) =>
                  o.id === result.targetId
                    ? { ...o, ...result.patch }
                    : o,
                ),
              );
              message.success("已更新商机");
            } else {
              setOpportunities((prev) => [...prev, result.newOpportunity]);
              message.success("已创建商机");
            }

            createForm.resetFields();
            setEditingOpportunity(null);
            setCreateVisible(false);
          } catch {
            // 校验失败时不关闭弹窗
          }
          }}
          projectOptions={projectOptions}
          ownerOptions={getSelectableOwnerOptions("sales")}
          stageOptions={[
            { value: "discovery", label: STAGE_LABELS.discovery },
            { value: "solution_design", label: STAGE_LABELS.solution_design },
            { value: "proposal", label: STAGE_LABELS.proposal },
            { value: "bidding", label: STAGE_LABELS.bidding },
            { value: "negotiation", label: STAGE_LABELS.negotiation },
            { value: "won", label: STAGE_LABELS.won },
            { value: "lost", label: STAGE_LABELS.lost },
          ]}
        />
      </Suspense>
      <Suspense fallback={null}>
        <LazyOpportunityDetailModal
          open={detailVisible}
          detailOpportunity={detailOpportunity}
          detailApprovalLoading={detailApprovalLoading}
          detailApprovalError={detailApprovalError}
          detailSteps={detailSteps}
          getSalesOwnerLabel={getSalesOwnerLabel}
          getProgressLabel={getProgressLabel}
          getApprovalStatusLabel={(status) => getApprovalStatusMeta(status).label}
          onClose={() => setDetailVisible(false)}
          onPreviewDocument={handlePreviewDocument}
          onDownloadDocument={handleDownloadDocument}
          onNavigateToProject={() => {
            if (detailOpportunity && onNavigateToProject) {
              onNavigateToProject(
                detailOpportunity.projectName ||
                  getProjectNameFromOpportunity(detailOpportunity),
              );
            }
          }}
          onAdvanceStage={async () => {
            if (!detailOpportunity) {
              return;
            }
            const module = await import("./opportunities/opportunityDetailActions");
            const nextStage = module.getNextOpportunityStage(detailOpportunity.stage);
            if (!nextStage) {
              return;
            }
            setOpportunities((prev) =>
              prev.map((item) =>
                item.id === detailOpportunity.id ? { ...item, stage: nextStage } : item,
              ),
            );
            setDetailOpportunity({
              ...detailOpportunity,
              stage: nextStage,
            });
          }}
        />
      </Suspense>
      <Suspense fallback={null}>
        <LazyOpportunityApprovalModal
          open={approvalVisible}
          approvalTarget={approvalTarget}
          opportunityWorkflowName={opportunityWorkflow?.name}
          approvalRuntimeSource={approvalRuntimeSource}
          opportunityWorkflowSource={opportunityWorkflowSource}
          approvalUsesBusinessSnapshot={approvalUsesBusinessSnapshot}
          approvalInstanceLoading={approvalInstanceLoading}
          opportunityWorkflowError={opportunityWorkflowError}
          approvalInstanceError={approvalInstanceError}
          approvalNodes={
            approvalRuntimeSource === "api" &&
            !approvalUsesBusinessSnapshot &&
            apiApprovalNodes.length > 0
              ? apiApprovalNodes
              : getApprovalWorkflowNodes()
          }
          approvalInstance={approvalInstance}
          approvalOpinionDraft={approvalOpinionDraft}
          onApprovalOpinionDraftChange={setApprovalOpinionDraft}
          onClose={() => {
            setApprovalVisible(false);
            setApprovalTarget(null);
            setApprovalOpinionDraft("");
            setApprovalInstance(null);
            setApprovalInstanceError(null);
            setApprovalRuntimeSource("local");
          }}
          onPreviewDocument={handlePreviewDocument}
          onDownloadDocument={handleDownloadDocument}
          onExecuteApiNodeAction={executeOpportunityApprovalAction}
          onApplyLocalApprovalPlan={applyLocalApprovalPlan}
          getSelectablePresalesOptions={getSelectableOwnerOptions("presales")}
          currentOperatorUsername={getCurrentOperatorUsername()}
          canApproveOpportunities={canApproveOpportunities}
          canEditOpportunities={canEditOpportunities}
        />
      </Suspense>
      <Suspense fallback={null}>
        <LazyOpportunitySupportModals
          statsModalVisible={statsModalVisible}
          statsModalType={statsModalType}
          totalExpected={totalExpected}
          totalWeighted={totalWeighted}
          avgProbability={avgProbability}
          onCloseStatsModal={() => {
            setStatsModalVisible(false);
            setStatsModalType(null);
          }}
          previewDocument={previewDocument}
          onClosePreview={() => setPreviewDocument(null)}
          onDownloadPreview={handleDownloadDocument}
        />
      </Suspense>
    </div>
  );
}
