import type {
  ApprovalInstanceActionView,
  ApprovalInstanceNodeView,
  ApprovalInstanceView,
} from "../../shared/approvalInstances";
import type { SharedTeamMember } from "../../shared/teamDirectory";
import type {
  WorkflowNode,
  WorkflowNodeFieldKey,
} from "../../shared/workflowConfig";

interface OpportunityWorkflowRecordLike {
  nodeKey: string;
  actionType: "approve" | "reject" | "upload" | "assign" | "notify";
  createdAt: string;
  fileName?: string;
  assignedToLabel?: string;
}

export interface OpportunityApprovalTargetLike
  extends Partial<Record<WorkflowNodeFieldKey, string | undefined>> {
  id?: string | number;
  stage?: string;
  createdAt?: string;
  updatedAt?: string;
  approvalOpinion?: string;
  approvalStatus?: string;
  bizApprovalStatus?: string;
  techApprovalStatus?: string;
  ownerUsername?: string;
  solutionOwnerUsername?: string;
  workflowRecords?: OpportunityWorkflowRecordLike[];
}

interface LabelResolverOptions {
  getSharedTeamMemberLabel: (username: string) => string;
}

interface ApproverResolverOptions extends LabelResolverOptions {
  sharedTeamMembers: SharedTeamMember[];
}

interface DisabledReasonOptions extends ApproverResolverOptions {
  workflowNodes: WorkflowNode[];
  target: OpportunityApprovalTargetLike;
  node: WorkflowNode;
  index: number;
  currentOperatorUsername?: string;
  canApproveOpportunities: boolean;
  canEditOpportunities: boolean;
}

export interface ApprovalDisplayOptions {
  preferBusinessSnapshot?: boolean;
}

export function getWorkflowNodeDocumentName(
  target: OpportunityApprovalTargetLike,
  fieldKey?: WorkflowNodeFieldKey,
) {
  if (!fieldKey) {
    return "";
  }
  const value = target[fieldKey];
  return typeof value === "string" ? value : "";
}

export function getLatestWorkflowNodeRecord(
  target: OpportunityApprovalTargetLike,
  node: WorkflowNode,
) {
  return (target.workflowRecords || [])
    .filter((record) => record.nodeKey === (node.nodeKey || String(node.id)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export function getApiNodeByWorkflowNode(
  instance: ApprovalInstanceView | null | undefined,
  node: WorkflowNode,
) {
  return (
    instance?.nodes.find(
      (item) =>
        item.nodeKey === (node.nodeKey || String(node.id)) ||
        item.workflowNodeId === node.id,
    ) || null
  );
}

export function getApiLatestActionForNode(
  instance: ApprovalInstanceView | null | undefined,
  apiNode: ApprovalInstanceNodeView | null,
) {
  if (!instance || !apiNode) {
    return null;
  }
  return (
    [...instance.actions]
      .filter((action) => action.approvalInstanceNodeId === apiNode.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null
  );
}

function hasBusinessSnapshotProgress(target: OpportunityApprovalTargetLike) {
  return Boolean(
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
}

export function shouldPreferBusinessSnapshot(
  target: OpportunityApprovalTargetLike,
  instance?: ApprovalInstanceView | null,
  displayOptions?: ApprovalDisplayOptions,
) {
  if (displayOptions?.preferBusinessSnapshot === false) {
    return false;
  }
  if (!instance || instance.actions.length > 0) {
    return false;
  }
  return hasBusinessSnapshotProgress(target);
}

export function getDisplayApprovalInstance(
  target: OpportunityApprovalTargetLike,
  instance?: ApprovalInstanceView | null,
  displayOptions?: ApprovalDisplayOptions,
) {
  return shouldPreferBusinessSnapshot(target, instance, displayOptions)
    ? null
    : instance || null;
}

export function getWorkflowNodeStatusMeta(
  target: OpportunityApprovalTargetLike,
  node: WorkflowNode,
  instance: ApprovalInstanceView | null | undefined,
  options: LabelResolverOptions,
  displayOptions?: ApprovalDisplayOptions,
) {
  const displayInstance = getDisplayApprovalInstance(
    target,
    instance,
    displayOptions,
  );
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
        ? options.getSharedTeamMemberLabel(assignedToUsername)
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
        ? options.getSharedTeamMemberLabel(target.solutionOwnerUsername)
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
}

function resolveRoleBasedApprovers(
  approverRef: string,
  target: OpportunityApprovalTargetLike,
  sharedTeamMembers: SharedTeamMember[],
) {
  const activeMembers = sharedTeamMembers.filter((member) => member.status === "活跃");
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
  if (approverRef === "solution_manager" || approverRef === "tech_director") {
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
}

export function getWorkflowNodeApproverUsernames(
  target: OpportunityApprovalTargetLike,
  node: WorkflowNode,
  options: ApproverResolverOptions,
) {
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
        approver.approverRef as WorkflowNodeFieldKey
      ];
      if (typeof fieldValue === "string" && fieldValue.trim()) {
        usernames.add(fieldValue);
      }
      return;
    }
    resolveRoleBasedApprovers(
      approver.approverRef,
      target,
      options.sharedTeamMembers,
    ).forEach((username) => usernames.add(username));
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
}

function isWorkflowNodeCompleted(
  target: OpportunityApprovalTargetLike,
  node: WorkflowNode,
  instance: ApprovalInstanceView | null | undefined,
) {
  const displayInstance = getDisplayApprovalInstance(target, instance);
  const apiNode = getApiNodeByWorkflowNode(displayInstance, node);
  if (apiNode) {
    return ["approved", "rejected", "skipped"].includes(apiNode.status);
  }
  if (node.nodeType === "upload") {
    return Boolean(getWorkflowNodeDocumentName(target, node.fieldKey));
  }
  if (node.nodeType === "assignment" && node.fieldKey === "solutionOwnerUsername") {
    return Boolean(target.solutionOwnerUsername);
  }
  if (node.fieldKey === "bizApprovalStatus" || node.fieldKey === "techApprovalStatus") {
    return target[node.fieldKey] === "approved" || target[node.fieldKey] === "rejected";
  }
  if (node.fieldKey === "approvalStatus") {
    return target.approvalStatus === "approved" || target.approvalStatus === "rejected";
  }
  const latestRecord = getLatestWorkflowNodeRecord(target, node);
  if (latestRecord) {
    if (node.nodeType === "upload") {
      return latestRecord.actionType === "upload";
    }
    if (node.nodeType === "assignment") {
      return latestRecord.actionType === "assign";
    }
    return latestRecord.actionType === "approve" || latestRecord.actionType === "reject";
  }
  return false;
}

function hasRejectedWorkflowNode(
  target: OpportunityApprovalTargetLike,
  workflowNodes: WorkflowNode[],
  instance: ApprovalInstanceView | null | undefined,
) {
  return workflowNodes.some((node) => {
    const displayInstance = getDisplayApprovalInstance(target, instance);
    const apiNode = getApiNodeByWorkflowNode(displayInstance, node);
    if (apiNode?.status === "rejected") {
      return true;
    }
    if (
      (node.fieldKey === "bizApprovalStatus" || node.fieldKey === "techApprovalStatus") &&
      target[node.fieldKey] === "rejected"
    ) {
      return true;
    }
    if (node.fieldKey === "approvalStatus" && target.approvalStatus === "rejected") {
      return true;
    }
    return getLatestWorkflowNodeRecord(target, node)?.actionType === "reject";
  });
}

export function getRejectedWorkflowNodeIndex(
  target: OpportunityApprovalTargetLike,
  workflowNodes: WorkflowNode[],
  instance: ApprovalInstanceView | null | undefined,
) {
  for (let index = 0; index < workflowNodes.length; index += 1) {
    const node = workflowNodes[index];
    const displayInstance = getDisplayApprovalInstance(target, instance);
    const apiNode = getApiNodeByWorkflowNode(displayInstance, node);
    if (apiNode?.status === "rejected") {
      return index;
    }
    if (
      (node.fieldKey === "bizApprovalStatus" || node.fieldKey === "techApprovalStatus") &&
      target[node.fieldKey] === "rejected"
    ) {
      return index;
    }
    if (node.fieldKey === "approvalStatus" && target.approvalStatus === "rejected") {
      return index;
    }
    if (getLatestWorkflowNodeRecord(target, node)?.actionType === "reject") {
      return index;
    }
  }
  return -1;
}

function getStageDrivenWorkflowNodeIndex(target: OpportunityApprovalTargetLike) {
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
}

function getCurrentPendingWorkflowNodeIndex(
  target: OpportunityApprovalTargetLike,
  workflowNodes: WorkflowNode[],
) {
  if (hasRejectedWorkflowNode(target, workflowNodes, null)) {
    return -1;
  }
  for (let index = 0; index < workflowNodes.length; index += 1) {
    if (!isWorkflowNodeCompleted(target, workflowNodes[index], null)) {
      return index;
    }
  }
  const stageDrivenIndex = getStageDrivenWorkflowNodeIndex(target);
  if (stageDrivenIndex != null) {
    return stageDrivenIndex;
  }
  return -1;
}

export function getWorkflowNodeDisabledReason(
  options: DisabledReasonOptions,
) {
  const {
    workflowNodes,
    target,
    node,
    index,
    currentOperatorUsername,
    canApproveOpportunities,
    canEditOpportunities,
    getSharedTeamMemberLabel,
    sharedTeamMembers,
  } = options;
  const pendingIndex = getCurrentPendingWorkflowNodeIndex(target, workflowNodes);
  if (pendingIndex === -1) {
    return hasRejectedWorkflowNode(target, workflowNodes, null)
      ? "当前流程已驳回，后续节点仅支持查看。"
      : "当前流程已全部完成。";
  }
  if (index !== pendingIndex) {
    return isWorkflowNodeCompleted(target, node, null)
      ? "当前节点已处理完成。"
      : "请先完成上一流程节点。";
  }
  if (!currentOperatorUsername) {
    return "当前账号未登录，无法处理该节点。";
  }
  const approvers = getWorkflowNodeApproverUsernames(target, node, {
    sharedTeamMembers,
    getSharedTeamMemberLabel,
  });
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
}

export function getApiApprovalActionLabel(
  action: ApprovalInstanceActionView,
  node?: ApprovalInstanceNodeView | null,
) {
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
}

export function buildSnapshotApprovalRecords(
  target: OpportunityApprovalTargetLike,
  workflowNodes: WorkflowNode[],
  getSharedTeamMemberLabel: (username: string) => string,
) {
  const baseTime = Date.parse(
    target.updatedAt || target.createdAt || new Date().toISOString(),
  );
  let offset = 0;
  const nextTime = () =>
    new Date(baseTime - (workflowNodes.length - offset++) * 60_000).toISOString();
  const records: Array<{
    id: string;
    actorLabel: string;
    nodeName: string;
    actionType: "approve" | "reject" | "notify" | "upload" | "assign";
    actionLabel: string;
    createdAt: string;
    fileName?: string;
    assignedToUsername?: string;
    assignedToLabel?: string;
    comment?: string;
  }> = [];
  const pushRecord = (
    nodeKey: string,
    actionType: "approve" | "reject" | "upload" | "assign",
    actionLabel: string,
    extra?: Record<string, string | undefined>,
  ) => {
    const node = workflowNodes.find((item) => item.nodeKey === nodeKey);
    if (!node) {
      return;
    }
    records.push({
      id: `snapshot_${String((target as { id?: string | number }).id || "unknown")}_${nodeKey}_${actionType}`,
      nodeName: node.name,
      actorLabel: "业务快照",
      actionType,
      actionLabel,
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
      comment: target.approvalOpinion,
    });
  } else if (target.approvalStatus === "rejected") {
    pushRecord("final_approval", "reject", "最终审批驳回", {
      comment: target.approvalOpinion,
    });
  }

  return records;
}
