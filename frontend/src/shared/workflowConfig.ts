import { DEFAULT_WORKFLOWS } from "./workflowTemplates";

export type WorkflowTarget = "opportunity" | "solution";
export type WorkflowApproverType = "user" | "role" | "field";
export type WorkflowVoteRule = "any" | "all";
export type WorkflowRejectStrategy = "terminate";
export type WorkflowNodeType = "approval" | "upload" | "assignment";
export type WorkflowNodeFieldKey =
  | "requirementBriefDocName"
  | "researchDocName"
  | "solutionOwnerUsername"
  | "approvalStatus"
  | "bizApprovalStatus"
  | "techApprovalStatus";

export interface WorkflowNodeApprover {
  id?: number;
  approverType: WorkflowApproverType;
  approverRef: string;
  displayName?: string;
  voteRule?: WorkflowVoteRule;
  sortOrder?: number;
}

export interface WorkflowNode {
  id: string | number;
  nodeKey?: string;
  name: string;
  nodeOrder?: number;
  nodeType?: WorkflowNodeType;
  fieldKey?: WorkflowNodeFieldKey;
  fieldLabel?: string;
  actionButtonLabel?: string;
  approverRole?: string;
  description?: string;
  canReject?: boolean;
  rejectStrategy?: WorkflowRejectStrategy;
  rejectCommentRequired?: boolean;
  approvers?: WorkflowNodeApprover[];
}

export interface WorkflowDefinition {
  id: string | number;
  name: string;
  code?: string;
  target: WorkflowTarget;
  enabled: boolean;
  isDefault?: boolean;
  version?: number;
  description?: string;
  applicableOpportunity?: string;
  nodes: WorkflowNode[];
}

export const WORKFLOW_LIBRARY_STORAGE_KEY = "approvalProcessLibrary";
export const SELECTED_OPPORTUNITY_WORKFLOW_ID_KEY =
  "selectedOpportunityProcessId";
export const SELECTED_SOLUTION_WORKFLOW_ID_KEY =
  "selectedSolutionProcessId";
export const WORKFLOW_LIBRARY_PINNED_TO_LOCAL_DEFAULTS_KEY =
  "workflowLibraryPinnedToLocalDefaults";

function getWorkflowDefaultMap(): Map<string, WorkflowDefinition> {
  return new Map(
    DEFAULT_WORKFLOWS.map((workflow) => [String(workflow.id), workflow]),
  );
}

function normalizeStoredWorkflowDefinition(
  workflow: WorkflowDefinition,
): WorkflowDefinition {
  const defaultWorkflow = getWorkflowDefaultMap().get(String(workflow.id));
  if (!defaultWorkflow) {
    return workflow;
  }

  const storedNodeKeys = (workflow.nodes || []).map((node) =>
    String(node.nodeKey || node.id),
  );
  const defaultNodeKeys = defaultWorkflow.nodes.map((node) =>
    String(node.nodeKey || node.id),
  );
  const isOutdatedDefault =
    (workflow.version ?? 0) < (defaultWorkflow.version ?? 0) ||
    storedNodeKeys.length !== defaultNodeKeys.length ||
    storedNodeKeys.some((nodeKey, index) => nodeKey !== defaultNodeKeys[index]);

  if (!isOutdatedDefault) {
    return {
      ...defaultWorkflow,
      ...workflow,
      nodes: (workflow.nodes || []).map((node, index) => ({
        ...defaultWorkflow.nodes[index],
        ...node,
      })),
    };
  }

  return { ...defaultWorkflow };
}

type WorkflowNodeClientMeta = Pick<
  WorkflowNode,
  "nodeType" | "fieldKey" | "fieldLabel" | "actionButtonLabel"
>;

function getWorkflowLibraryClientMetaMap(): Record<
  string,
  Record<string, WorkflowNodeClientMeta>
> {
  const list = loadWorkflowLibrary();
  return list.reduce<Record<string, Record<string, WorkflowNodeClientMeta>>>(
    (acc, workflow) => {
      const workflowId = String(workflow.id);
      const nodeMap = (workflow.nodes || []).reduce<Record<string, WorkflowNodeClientMeta>>(
        (nodeAcc, node) => {
          const nodeKey = String(node.nodeKey || node.id);
          nodeAcc[nodeKey] = {
            nodeType: node.nodeType,
            fieldKey: node.fieldKey,
            fieldLabel: node.fieldLabel,
            actionButtonLabel: node.actionButtonLabel,
          };
          return nodeAcc;
        },
        {},
      );
      acc[workflowId] = nodeMap;
      return acc;
    },
    {},
  );
}

export function mergeWorkflowNodeClientMeta(
  workflowId: string | number,
  node: WorkflowNode,
): WorkflowNode {
  const workflowMeta = getWorkflowLibraryClientMetaMap()[String(workflowId)];
  const nodeMeta = workflowMeta?.[String(node.nodeKey || node.id)];
  if (!nodeMeta) {
    return node;
  }
  return {
    ...node,
    nodeType: nodeMeta.nodeType || node.nodeType,
    fieldKey: nodeMeta.fieldKey || node.fieldKey,
    fieldLabel: nodeMeta.fieldLabel || node.fieldLabel,
    actionButtonLabel: nodeMeta.actionButtonLabel || node.actionButtonLabel,
  };
}

export function loadWorkflowLibrary(): WorkflowDefinition[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(
      WORKFLOW_LIBRARY_STORAGE_KEY,
    );
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      const normalized = parsed.map((item) =>
        normalizeStoredWorkflowDefinition(item as WorkflowDefinition),
      );
      if (JSON.stringify(normalized) !== JSON.stringify(parsed)) {
        saveWorkflowLibrary(normalized);
      }
      return normalized;
    }
  } catch {
    // ignore parse errors and fall back to empty list
  }
  return [];
}

export function saveWorkflowLibrary(
  list: WorkflowDefinition[],
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      WORKFLOW_LIBRARY_STORAGE_KEY,
      JSON.stringify(list),
    );
  } catch {
    // best-effort only
  }
}

export function loadSelectedWorkflowId(
  target: WorkflowTarget,
): string | null {
  if (typeof window === "undefined") return null;
  const key =
    target === "opportunity"
      ? SELECTED_OPPORTUNITY_WORKFLOW_ID_KEY
      : SELECTED_SOLUTION_WORKFLOW_ID_KEY;
  try {
    const value = window.localStorage.getItem(key);
    return value || null;
  } catch {
    return null;
  }
}

export function saveSelectedWorkflowId(
  target: WorkflowTarget,
  id: string | null,
): void {
  if (typeof window === "undefined") return;
  const key =
    target === "opportunity"
      ? SELECTED_OPPORTUNITY_WORKFLOW_ID_KEY
      : SELECTED_SOLUTION_WORKFLOW_ID_KEY;
  try {
    if (id) {
      window.localStorage.setItem(key, id);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore quota / storage errors
  }
}

export function isWorkflowLibraryPinnedToLocalDefaults(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.localStorage.getItem(WORKFLOW_LIBRARY_PINNED_TO_LOCAL_DEFAULTS_KEY) ===
      "true"
    );
  } catch {
    return false;
  }
}

export function saveWorkflowLibraryPinnedToLocalDefaults(
  pinned: boolean,
): void {
  if (typeof window === "undefined") return;
  try {
    if (pinned) {
      window.localStorage.setItem(
        WORKFLOW_LIBRARY_PINNED_TO_LOCAL_DEFAULTS_KEY,
        "true",
      );
    } else {
      window.localStorage.removeItem(
        WORKFLOW_LIBRARY_PINNED_TO_LOCAL_DEFAULTS_KEY,
      );
    }
  } catch {
    // ignore quota / storage errors
  }
}
