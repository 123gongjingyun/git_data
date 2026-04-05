import { buildApiUrl } from "./api";

export type ApprovalBusinessType = "opportunity" | "solution";
export type ApprovalInstanceStatus =
  | "pending"
  | "in_progress"
  | "approved"
  | "rejected"
  | "cancelled";
export type ApprovalInstanceNodeStatus =
  | "pending"
  | "in_progress"
  | "approved"
  | "rejected"
  | "skipped";
export type ApprovalActionType =
  | "approve"
  | "reject"
  | "upload"
  | "assign"
  | "submit";

export interface ApprovalResolvedUser {
  id: number;
  username: string;
  displayName?: string | null;
  role: string;
}

export interface ApprovalNodeApproverView {
  approverType: "user" | "role" | "field";
  approverRef: string;
  displayName: string;
  resolvedUsers: ApprovalResolvedUser[];
}

export interface ApprovalInstanceNodeView {
  id: number;
  workflowNodeId?: number | null;
  nodeKey?: string | null;
  nodeName: string;
  nodeOrder: number;
  nodeType: "approval" | "upload" | "assignment" | string;
  fieldKey?: string | null;
  description?: string | null;
  canReject: boolean;
  rejectCommentRequired: boolean;
  status: ApprovalInstanceNodeStatus;
  startedAt?: string | null;
  finishedAt?: string | null;
  approvers: ApprovalNodeApproverView[];
  canCurrentUserHandle: boolean;
}

export interface ApprovalInstanceActionView {
  id: number;
  actionType: ApprovalActionType;
  comment?: string | null;
  payload?: {
    fileName?: string | null;
    assignedToUsername?: string | null;
    value?: string | null;
  } | null;
  createdAt: string;
  approvalInstanceNodeId?: number | null;
  nodeKey?: string | null;
  nodeName?: string | null;
  operator?: ApprovalResolvedUser | null;
}

export interface ApprovalInstanceView {
  id: number;
  businessType: ApprovalBusinessType;
  businessId: number;
  status: ApprovalInstanceStatus;
  workflowDefinition: {
    id: number;
    name: string;
    targetType: ApprovalBusinessType;
    version: number;
  };
  currentNodeId?: number | null;
  currentNode?: ApprovalInstanceNodeView | null;
  canCurrentUserHandleCurrentNode: boolean;
  startedAt?: string | null;
  finishedAt?: string | null;
  startedBy?: ApprovalResolvedUser | null;
  nodes: ApprovalInstanceNodeView[];
  actions: ApprovalInstanceActionView[];
}

export interface ExecuteApprovalActionInput {
  actionType: ApprovalActionType;
  comment?: string;
  fileName?: string;
  assignedToUsername?: string;
  value?: string;
}

export function getStoredAccessToken() {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem("accessToken") || "";
}

function createAuthHeaders(accessToken?: string, withJson = false) {
  const token = accessToken || getStoredAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (withJson) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

export async function fetchCurrentApprovalInstance(
  businessType: ApprovalBusinessType,
  businessId: number,
  accessToken?: string,
) {
  const response = await fetch(
    buildApiUrl(
      `/approval-instances/current?businessType=${businessType}&businessId=${businessId}`,
    ),
    {
      headers: createAuthHeaders(accessToken, false),
    },
  );
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`审批实例加载失败：${response.status}`);
  }
  const text = await response.text();
  if (!text.trim()) {
    return null;
  }
  return JSON.parse(text) as ApprovalInstanceView | null;
}

export async function startApprovalInstance(
  businessType: ApprovalBusinessType,
  businessId: number,
  accessToken?: string,
) {
  const response = await fetch(buildApiUrl("/approval-instances/start"), {
    method: "POST",
    headers: createAuthHeaders(accessToken, true),
    body: JSON.stringify({
      businessType,
      businessId,
    }),
  });
  if (!response.ok) {
    throw new Error(`审批实例启动失败：${response.status}`);
  }
  return (await response.json()) as ApprovalInstanceView;
}

export async function ensureApprovalInstance(
  businessType: ApprovalBusinessType,
  businessId: number,
  accessToken?: string,
) {
  const current = await fetchCurrentApprovalInstance(
    businessType,
    businessId,
    accessToken,
  );
  if (current) {
    return current;
  }
  return startApprovalInstance(businessType, businessId, accessToken);
}

export async function executeApprovalAction(
  approvalInstanceId: number,
  input: ExecuteApprovalActionInput,
  accessToken?: string,
) {
  const response = await fetch(
    buildApiUrl(`/approval-instances/${approvalInstanceId}/actions`),
    {
      method: "POST",
      headers: createAuthHeaders(accessToken, true),
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) {
    throw new Error(`审批动作执行失败：${response.status}`);
  }
  return (await response.json()) as ApprovalInstanceView;
}
