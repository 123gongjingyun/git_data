import { buildApiUrl } from "../../shared/api";
import {
  mergeWorkflowNodeClientMeta,
  type WorkflowDefinition,
} from "../../shared/workflowConfig";

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

function normalizeWorkflowDefinition(
  workflow: ApiWorkflowDefinition,
): WorkflowDefinition {
  return {
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
  };
}

export async function fetchOpportunityWorkflowDefinitions(accessToken: string) {
  const response = await fetch(
    buildApiUrl("/workflow-definitions?targetType=opportunity&enabled=true"),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  if (!response.ok) {
    throw new Error(`商机流程定义加载失败：${response.status}`);
  }
  const data = (await response.json()) as ApiWorkflowDefinition[];
  return Array.isArray(data) ? data.map(normalizeWorkflowDefinition) : [];
}
