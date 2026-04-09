import {
  loadSharedTeamMembers,
  type SharedTeamMember,
} from "../../shared/teamDirectory";
import type {
  DemoOpportunity,
  OpportunityWorkflowRecord,
} from "../../shared/opportunityDemoData";
import type { WorkflowNode } from "../../shared/workflowConfig";
import type { OpportunityWorkflowRecordDraft } from "./opportunityApprovalLocalPlan";

function getWorkflowNodeDocumentName(
  target: DemoOpportunity,
  fieldKey?: WorkflowNode["fieldKey"],
) {
  if (!fieldKey) {
    return "";
  }
  const value = target[fieldKey];
  return typeof value === "string" ? value : "";
}

function getLatestWorkflowNodeRecord(
  target: DemoOpportunity,
  node: WorkflowNode,
) {
  return (target.workflowRecords || [])
    .filter((record) => record.nodeKey === (node.nodeKey || String(node.id)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

function resolveRoleBasedApprovers(
  approverRef: string,
  target: DemoOpportunity,
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

function getWorkflowNodeApproverUsernames(
  target: DemoOpportunity,
  node: WorkflowNode,
  sharedTeamMembers: SharedTeamMember[],
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
      const fieldValue = target[approver.approverRef as keyof DemoOpportunity];
      if (typeof fieldValue === "string" && fieldValue.trim()) {
        usernames.add(fieldValue);
      }
      return;
    }
    resolveRoleBasedApprovers(
      approver.approverRef,
      target,
      sharedTeamMembers,
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

function isWorkflowNodeCompleted(target: DemoOpportunity, node: WorkflowNode) {
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
  target: DemoOpportunity,
  workflowNodes: WorkflowNode[],
) {
  return workflowNodes.some((node) => {
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

function getStageDrivenWorkflowNodeIndex(target: DemoOpportunity) {
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
  target: DemoOpportunity,
  workflowNodes: WorkflowNode[],
) {
  if (hasRejectedWorkflowNode(target, workflowNodes)) {
    return -1;
  }
  for (let index = 0; index < workflowNodes.length; index += 1) {
    if (!isWorkflowNodeCompleted(target, workflowNodes[index])) {
      return index;
    }
  }
  const stageDrivenIndex = getStageDrivenWorkflowNodeIndex(target);
  if (stageDrivenIndex != null) {
    return stageDrivenIndex;
  }
  return -1;
}

export function buildNextOpportunityFromLocalWorkflowAction(input: {
  target: DemoOpportunity;
  patch: Partial<DemoOpportunity>;
  recordDrafts: OpportunityWorkflowRecordDraft[];
  workflowNodes: WorkflowNode[];
  currentOperatorUsername: string;
  currentOperatorLabel: string;
  getSharedTeamMemberLabel: (username: string) => string;
}) {
  const {
    target,
    patch,
    recordDrafts,
    workflowNodes,
    currentOperatorUsername,
    currentOperatorLabel,
    getSharedTeamMemberLabel,
  } = input;
  const sharedTeamMembers = loadSharedTeamMembers();
  const records: OpportunityWorkflowRecord[] = recordDrafts.map((draft) => {
    const assignedToUsername = draft.assignedToUsername;
    return {
      id: `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      nodeKey: draft.node.nodeKey || String(draft.node.id),
      nodeName: draft.node.name || draft.node.nodeName || "审批动作",
      actionType: draft.actionType,
      actionLabel: draft.actionLabel,
      actorUsername: currentOperatorUsername,
      actorLabel: currentOperatorLabel,
      createdAt: new Date().toISOString(),
      comment: draft.comment?.trim() || undefined,
      fileName: draft.fileName,
      assignedToUsername,
      assignedToLabel: assignedToUsername
        ? getSharedTeamMemberLabel(assignedToUsername)
        : undefined,
    };
  });
  const nextTarget: DemoOpportunity = {
    ...target,
    ...patch,
    workflowRecords: [...(target.workflowRecords || []), ...records],
  };
  const nextPendingIndex = getCurrentPendingWorkflowNodeIndex(nextTarget, workflowNodes);
  let notifySummary = "";

  if (nextPendingIndex >= 0) {
    const nextNode = workflowNodes[nextPendingIndex];
    const nextApprovers = getWorkflowNodeApproverUsernames(
      nextTarget,
      nextNode,
      sharedTeamMembers,
    );
    if (nextApprovers.length > 0) {
      notifySummary = nextApprovers
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
    }
  }

  return { nextTarget, notifySummary };
}
