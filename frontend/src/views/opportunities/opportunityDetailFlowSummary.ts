import type { ApprovalInstanceView } from "../../shared/approvalInstances";
import { DEFAULT_OPPORTUNITY_WORKFLOW } from "../../shared/workflowTemplates";
import type {
  WorkflowNode,
  WorkflowNodeFieldKey,
  WorkflowNodeType,
} from "../../shared/workflowConfig";
import {
  getDisplayApprovalInstance,
  getWorkflowNodeStatusMeta,
} from "./opportunityApprovalRuntime";

interface OpportunityWorkflowRecordLike {
  nodeKey: string;
  actionType: "approve" | "reject" | "upload" | "assign" | "notify";
  createdAt: string;
}

interface DetailOpportunityLike {
  stage?: string;
  approvalStatus?: string;
  requirementBriefDocName?: string;
  researchDocName?: string;
  solutionOwnerUsername?: string;
  bizApprovalStatus?: string;
  techApprovalStatus?: string;
  workflowRecords?: OpportunityWorkflowRecordLike[];
}

interface DetailStepLike {
  title: string;
  statusText: string;
  tone: "default" | "success" | "warning" | "danger";
}

function getResolvedOpportunityNode(
  node: WorkflowNode,
  fallbackIndex: number,
): WorkflowNode {
  const fallback: Record<
    string,
    {
      nodeType: WorkflowNodeType;
      fieldKey?: WorkflowNodeFieldKey;
    }
  > = {
    lead_confirmation: {
      nodeType: "upload",
      fieldKey: "requirementBriefDocName",
    },
    sales_leader_approval: {
      nodeType: "approval",
      fieldKey: "bizApprovalStatus",
    },
    solution_leader_approval: {
      nodeType: "approval",
      fieldKey: "techApprovalStatus",
    },
    assign_solution_owner: {
      nodeType: "assignment",
      fieldKey: "solutionOwnerUsername",
    },
    requirement_analysis: {
      nodeType: "upload",
      fieldKey: "researchDocName",
    },
    final_approval: {
      nodeType: "approval",
      fieldKey: "approvalStatus",
    },
  }[node.nodeKey || `index_${fallbackIndex}`];

  return {
    ...node,
    nodeType: node.nodeType || fallback?.nodeType || "approval",
    fieldKey: node.fieldKey || fallback?.fieldKey,
  };
}

function getLatestWorkflowNodeRecord(
  target: DetailOpportunityLike,
  node: WorkflowNode,
) {
  return (target.workflowRecords || [])
    .filter((record) => record.nodeKey === (node.nodeKey || String(node.id)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

function isWorkflowNodeCompleted(
  target: DetailOpportunityLike,
  node: WorkflowNode,
  instance?: ApprovalInstanceView | null,
  preferBusinessSnapshot?: boolean,
) {
  const statusText = getWorkflowNodeStatusMeta(target, node, instance, {
    getSharedTeamMemberLabel: (username) => username,
  }, { preferBusinessSnapshot }).text;
  if (node.nodeType === "upload") {
    return statusText === "已上传";
  }
  return statusText === "已通过" || statusText === "已驳回";
}

function getStageDrivenWorkflowNodeIndex(target: DetailOpportunityLike) {
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

export function buildOpportunityDetailFlowSummary(params: {
  target: DetailOpportunityLike;
  instance?: ApprovalInstanceView | null;
  workflowNodes: WorkflowNode[];
  preferBusinessSnapshot?: boolean;
}): DetailStepLike[] {
  const { target, instance, workflowNodes, preferBusinessSnapshot } = params;
  const displayOptions = { preferBusinessSnapshot };
  const displayInstance = getDisplayApprovalInstance(
    target,
    instance,
    displayOptions,
  );
  const statusTextOf = (node?: WorkflowNode) =>
    node
      ? getWorkflowNodeStatusMeta(target, node, displayInstance, {
          getSharedTeamMemberLabel: (username) => username,
        }, displayOptions).text
      : "";
  const findNode = (nodeKey: string) =>
    workflowNodes.find((node) => (node.nodeKey || String(node.id)) === nodeKey);
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
  const salesOrSolutionStarted = Boolean(salesApprovalRecord || solutionApprovalRecord);
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
      statusText:
        statusTextOf(leadNode) === "已上传"
          ? "已上传需求说明"
          : isAnalysisStageDriven
            ? "已进入需求分析阶段"
            : "待上传需求说明文档",
      tone:
        statusTextOf(leadNode) === "已上传" || isAnalysisStageDriven
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
      tone: bothStartApproved || isAnalysisStageDriven
        ? "success"
        : anyStartRejected
          ? "danger"
          : salesOrSolutionStarted
            ? "warning"
            : "default",
    },
    {
      title: "需求分析",
      statusText:
        statusTextOf(researchNode) === "已上传"
          ? "已上传需求调研文档"
          : isAnalysisStageDriven
            ? "待上传需求调研文档"
            : isWorkflowNodeCompleted(
                target,
                leadNode,
                displayInstance,
                preferBusinessSnapshot,
              )
              ? "进行需求分析"
              : "待完成需求调研",
      tone:
        statusTextOf(researchNode) === "已上传"
          ? "success"
          : isAnalysisStageDriven ||
              isWorkflowNodeCompleted(
                target,
                leadNode,
                displayInstance,
                preferBusinessSnapshot,
              )
            ? "warning"
            : "default",
    },
    {
      title: "最终审批",
      statusText:
        statusTextOf(finalNode) === "已通过"
          ? "已批准进入方案阶段"
          : statusTextOf(finalNode) === "已驳回"
            ? "最终审批已驳回"
            : isFinalStageDriven || isWorkflowNodeCompleted(target, researchNode, displayInstance)
              ? "最终审批中"
              : "待进入最终审批",
      tone:
        statusTextOf(finalNode) === "已通过"
          ? "success"
          : statusTextOf(finalNode) === "已驳回"
            ? "danger"
            : isFinalStageDriven ||
                isWorkflowNodeCompleted(
                  target,
                  researchNode,
                  displayInstance,
                  preferBusinessSnapshot,
                )
              ? "warning"
              : "default",
    },
  ];
}
