import { getStoredAccessToken } from "./approvalInstances";
import { buildApiUrl } from "./api";
import {
  type DemoOpportunity,
  saveSharedDemoOpportunities,
} from "./opportunityDemoData";

export interface ApiOpportunity {
  id: number;
  name: string;
  stage?: string;
  approvalStatus?: "approved" | "pending" | "rejected" | null;
  bizApprovalStatus?: "approved" | "pending" | "rejected" | null;
  techApprovalStatus?: "approved" | "pending" | "rejected" | null;
  expectedValue?: string;
  expectedCloseDate?: string;
  probability?: number;
  createdAt?: string;
  approvalOpinion?: string | null;
  requirementBriefDocName?: string | null;
  researchDocName?: string | null;
  solutionOwnerUsername?: string | null;
  customer?: {
    name?: string | null;
  } | null;
  owner?: {
    username?: string | null;
  } | null;
}

export interface OpportunityListResponse {
  items?: ApiOpportunity[];
}

function formatCurrencyAmount(rawValue?: string) {
  const numericValue =
    rawValue != null && rawValue !== "" ? Number(rawValue) : undefined;
  if (numericValue != null && Number.isFinite(numericValue)) {
    return `¥${numericValue.toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return rawValue;
}

export function mapApiOpportunityToDemo(api: ApiOpportunity): DemoOpportunity {
  const expectedValue = formatCurrencyAmount(api.expectedValue);
  const numericExpectedValue =
    api.expectedValue != null && api.expectedValue !== ""
      ? Number(api.expectedValue)
      : undefined;
  const weightedValue =
    numericExpectedValue != null &&
    Number.isFinite(numericExpectedValue) &&
    typeof api.probability === "number"
      ? `¥${((numericExpectedValue * api.probability) / 100).toLocaleString(
          "zh-CN",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
        )}`
      : undefined;

  return {
    id: api.id,
    opportunityCode: `OPP-${String(api.id).padStart(6, "0")}`,
    name: api.name,
    customerName: api.customer?.name || undefined,
    stage: api.stage,
    approvalStatus: api.approvalStatus || undefined,
    bizApprovalStatus: api.bizApprovalStatus || undefined,
    techApprovalStatus: api.techApprovalStatus || undefined,
    approvalOpinion: api.approvalOpinion || undefined,
    requirementBriefDocName: api.requirementBriefDocName || undefined,
    researchDocName: api.researchDocName || undefined,
    solutionOwnerUsername: api.solutionOwnerUsername || undefined,
    expectedValue,
    probability:
      typeof api.probability === "number" ? api.probability : undefined,
    weightedValue,
    expectedCloseDate: api.expectedCloseDate || undefined,
    createdAt: api.createdAt || undefined,
    ownerUsername: api.owner?.username || undefined,
  };
}

export async function syncSharedOpportunitiesFromApi(
  accessToken?: string | null,
): Promise<DemoOpportunity[] | null> {
  const token = accessToken || getStoredAccessToken();
  if (!token) {
    return null;
  }

  try {
    const response = await fetch(buildApiUrl("/opportunities?page=1&pageSize=100"), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as OpportunityListResponse | ApiOpportunity[];
    const items = Array.isArray(data)
      ? data
      : Array.isArray(data.items)
        ? data.items
        : [];
    const mapped = items.map((item) => mapApiOpportunityToDemo(item));
    saveSharedDemoOpportunities(mapped);
    return mapped;
  } catch {
    return null;
  }
}
