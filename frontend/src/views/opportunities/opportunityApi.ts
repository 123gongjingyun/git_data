import { buildApiUrl } from "../../shared/api";
import type {
  ApprovalStatus,
  DemoOpportunity,
} from "../../shared/opportunityDemoData";

export interface ApiOpportunity {
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

export interface OpportunityListResponse {
  items: ApiOpportunity[];
  total: number;
  page: number;
  pageSize: number;
}

export function mapApiOpportunityToDemo(api: ApiOpportunity): DemoOpportunity {
  const rawExpected = api.expectedValue;
  const expectedNumber =
    rawExpected != null && rawExpected !== "" ? Number(rawExpected) : undefined;

  let expectedDisplay: string | undefined;
  if (expectedNumber != null && Number.isFinite(expectedNumber)) {
    expectedDisplay = `¥${expectedNumber.toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  } else if (typeof rawExpected === "string") {
    expectedDisplay = rawExpected;
  }

  const prob = typeof api.probability === "number" ? api.probability : undefined;

  let weightedDisplay: string | undefined;
  if (expectedNumber != null && Number.isFinite(expectedNumber) && prob != null) {
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
    ...(api.createdAt ? { createdAt: api.createdAt } : {}),
    ...(api.updatedAt ? { updatedAt: api.updatedAt } : {}),
    ...(api.owner?.username ? { ownerUsername: api.owner.username } : {}),
  };
}

function buildAuthHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function fetchOpportunityDetail(
  opportunityId: number,
  accessToken: string,
) {
  const response = await fetch(buildApiUrl(`/opportunities/${opportunityId}`), {
    headers: buildAuthHeaders(accessToken),
  });
  if (!response.ok) {
    throw new Error(`商机详情加载失败：${response.status}`);
  }
  const data = (await response.json()) as ApiOpportunity;
  return mapApiOpportunityToDemo(data);
}

export async function fetchOpportunityList(accessToken: string) {
  const response = await fetch(buildApiUrl("/opportunities"), {
    headers: buildAuthHeaders(accessToken),
  });
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as
    | OpportunityListResponse
    | ApiOpportunity[];
  const mapped: DemoOpportunity[] = Array.isArray(data)
    ? data.map((item) => mapApiOpportunityToDemo(item))
    : (Array.isArray(data.items) ? data.items : []).map((item) =>
        mapApiOpportunityToDemo(item),
      );
  return mapped;
}
