import type {
  DemoOpportunity,
  OpportunityWorkflowRecord,
} from "../../shared/opportunityDemoData";

type ApprovalNodeLike = {
  id: string | number;
  name?: string;
  nodeName?: string;
  fieldKey?: string;
};

export interface OpportunityWorkflowRecordDraft {
  node: ApprovalNodeLike;
  actionType: OpportunityWorkflowRecord["actionType"];
  actionLabel: string;
  comment?: string;
  fileName?: string;
  assignedToUsername?: string;
}

export interface LocalOpportunityApprovalPlan {
  patch: Partial<DemoOpportunity>;
  recordDrafts: OpportunityWorkflowRecordDraft[];
  feedbackTone: "success" | "warning";
  feedbackMessage: string;
  closeModal: boolean;
}

export function buildLocalUploadPlan(
  node: ApprovalNodeLike,
  fileName: string,
): LocalOpportunityApprovalPlan {
  const isResearchDoc = node.fieldKey === "researchDocName";
  return {
    patch: {
      [node.fieldKey || "requirementBriefDocName"]: fileName,
    } as Partial<DemoOpportunity>,
    recordDrafts: [
      {
        node,
        actionType: "upload",
        actionLabel: isResearchDoc ? "上传调研文档" : "上传需求说明",
        fileName,
        comment: isResearchDoc
          ? "已完成详细需求分析并上传调研文档。"
          : "已补齐客户背景、需求说明和预期金额。",
      },
    ],
    feedbackTone: "success",
    feedbackMessage: isResearchDoc
      ? "已上传需求调研文档"
      : "已上传客户需求说明文档",
    closeModal: false,
  };
}

export function buildLocalAssignmentPlan(
  node: ApprovalNodeLike,
  assignedToUsername: string,
): LocalOpportunityApprovalPlan {
  return {
    patch: { solutionOwnerUsername: assignedToUsername },
    recordDrafts: [
      {
        node,
        actionType: "assign",
        actionLabel: "分配承接售前",
        assignedToUsername,
      },
    ],
    feedbackTone: "success",
    feedbackMessage: `已完成「${node.nodeName || node.name || "当前节点"}」负责人分配`,
    closeModal: false,
  };
}

export function buildLocalDecisionPlan(input: {
  target: Pick<DemoOpportunity, "stage">;
  node: ApprovalNodeLike;
  opinion: string;
  action: "approve" | "reject";
}): LocalOpportunityApprovalPlan {
  const { target, node, opinion, action } = input;
  const isFinalApproval = node.fieldKey === "approvalStatus";
  const approved = action === "approve";
  const patch: Partial<DemoOpportunity> = {
    [node.fieldKey || "approvalStatus"]: approved ? "approved" : "rejected",
  } as Partial<DemoOpportunity>;

  if (isFinalApproval) {
    patch.approvalOpinion = opinion;
    if (approved) {
      patch.stage =
        target.stage === "discovery" ? "solution_design" : target.stage;
    }
  }

  return {
    patch,
    recordDrafts: [
      {
        node,
        actionType: action,
        actionLabel: isFinalApproval
          ? approved
            ? "最终审批通过"
            : "最终审批驳回"
          : approved
            ? "审批通过"
            : "审批驳回",
        comment: opinion,
      },
    ],
    feedbackTone: approved ? "success" : "warning",
    feedbackMessage: isFinalApproval
      ? approved
        ? "已提交最终审批：通过"
        : "已提交最终审批：驳回"
      : `已完成「${node.nodeName || node.name || "当前节点"}」审批${
          approved ? "通过" : "驳回"
        }`,
    closeModal: isFinalApproval,
  };
}
