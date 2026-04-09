import type {
  ApprovalInstanceActionView,
  ApprovalInstanceNodeView,
  ApprovalInstanceView,
} from "../../shared/approvalInstances";
import type {
  DemoOpportunity,
  OpportunityWorkflowRecord,
} from "../../shared/opportunityDemoData";
import { getApiApprovalActionLabel } from "./opportunityApprovalRuntime";

export function buildOpportunityPatchFromApprovalInstance(
  target: DemoOpportunity,
  instance: ApprovalInstanceView,
  getSharedTeamMemberLabel: (username: string) => string,
): Partial<DemoOpportunity> {
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
      const assignedToUsername = action.payload?.assignedToUsername || undefined;
      const node =
        action.approvalInstanceNodeId != null
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
        actionLabel: getApiApprovalActionLabel(
          action,
          (node as ApprovalInstanceNodeView | null) || null,
        ),
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

  return patch;
}
