import {
  type DemoOpportunity,
  getSalesOwnerLabel,
} from "./opportunityDemoData";
import { getProjectNameFromOpportunity } from "./projectNaming";

export interface SolutionItem {
  key: string;
  opportunityId?: number;
  solutionVersionId?: number;
  name: string;
  project: string;
  owner: string;
  version: string;
  type: string;
  status: "approved" | "reviewing" | "draft" | "rejected";
  createdAt: string;
  actions: string[];
  fileName?: string;
}

export interface BidItem {
  key: string;
  projectName: string;
  customer: string;
  salesOwner: string;
  preSalesOwner: string;
  tenderNo: string;
  progress: string;
  openDate: string;
  amount: string;
  status: "ongoing" | "won" | "lost";
  fileName?: string;
}

export type SignatureStatus = "unsigned" | "pending" | "signed";

export interface ContractItem {
  key: string;
  name: string;
  projectName: string;
  customer: string;
  salesOwner: string;
  preSalesOwner: string;
  amount: string;
  paymentTerm: string;
  signDate: string;
  status: "draft" | "reviewing" | "signed" | "executing";
  signatureStatus: SignatureStatus;
}

export interface KnowledgeDoc {
  key: string;
  name: string;
  category: string;
  author: string;
  updatedAt: string;
  size: string;
  isFavorite?: boolean;
  isHot?: boolean;
}

function formatWanAmount(value?: string): string {
  if (!value) return "¥0万";
  const cleaned = value.replace(/[¥,]/g, "");
  const numberValue = Number(cleaned);
  if (!Number.isFinite(numberValue)) return value;
  return `¥${Math.max(0, Math.round(numberValue / 10000)).toLocaleString("zh-CN")}万`;
}

function getPreSalesOwnerLabel(opportunity: DemoOpportunity): string {
  return getSalesOwnerLabel(opportunity.solutionOwnerUsername || opportunity.ownerUsername);
}

export function deriveSolutionsFromOpportunities(
  opportunities: DemoOpportunity[],
): SolutionItem[] {
  return opportunities.map((opportunity) => {
    const stage = opportunity.stage || "discovery";
    const status: SolutionItem["status"] =
      stage === "won"
        ? "approved"
        : opportunity.approvalStatus === "rejected"
          ? "rejected"
          : stage === "discovery"
            ? "draft"
            : opportunity.approvalStatus === "approved"
              ? "approved"
              : "reviewing";
    const projectName = getProjectNameFromOpportunity(opportunity);
    return {
      key: `solution-${opportunity.id}`,
      opportunityId: opportunity.id,
      name: `${projectName}解决方案`,
      project: projectName,
      owner: getPreSalesOwnerLabel(opportunity),
      version: `v${Math.max(1, opportunity.id)}.0`,
      type: stage === "bidding" ? "投标方案" : "解决方案",
      status,
      createdAt:
        opportunity.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      actions:
        status === "draft"
          ? ["查看", "下载", "编辑"]
          : status === "reviewing"
            ? ["查看", "下载", "审批"]
            : ["查看", "下载"],
      fileName:
        opportunity.researchDocName ||
        opportunity.requirementBriefDocName ||
        `${projectName}_解决方案.docx`,
    };
  });
}

export function deriveBidsFromOpportunities(
  opportunities: DemoOpportunity[],
): BidItem[] {
  return opportunities
    .filter((opportunity) => {
      const stage = opportunity.stage || "";
      return ["proposal", "bidding", "negotiation", "won", "lost"].includes(stage);
    })
    .map((opportunity) => {
      const projectName = getProjectNameFromOpportunity(opportunity);
      const stage = opportunity.stage || "";
      const status: BidItem["status"] =
        stage === "won" ? "won" : stage === "lost" ? "lost" : "ongoing";
      return {
        key: `bid-${opportunity.id}`,
        projectName,
        customer: opportunity.customerName || "-",
        salesOwner: getSalesOwnerLabel(opportunity.ownerUsername),
        preSalesOwner: getPreSalesOwnerLabel(opportunity),
        tenderNo: `ZN${new Date().getFullYear()}${String(opportunity.id).padStart(4, "0")}`,
        progress:
          status === "won" ? "已完成" : status === "lost" ? "未中标" : "标书制作",
        openDate:
          opportunity.expectedCloseDate || new Date().toISOString().slice(0, 10),
        amount: formatWanAmount(opportunity.expectedValue),
        status,
        fileName: `${projectName}_标书.docx`,
      };
    });
}

export function deriveContractsFromOpportunities(
  opportunities: DemoOpportunity[],
): ContractItem[] {
  return opportunities
    .filter((opportunity) => {
      const stage = opportunity.stage || "";
      return ["negotiation", "won"].includes(stage);
    })
    .map((opportunity) => {
      const projectName = getProjectNameFromOpportunity(opportunity);
      const signed = opportunity.stage === "won";
      return {
        key: `contract-${opportunity.id}`,
        name: `${projectName}合同`,
        projectName,
        customer: opportunity.customerName || "-",
        salesOwner: getSalesOwnerLabel(opportunity.ownerUsername),
        preSalesOwner: getPreSalesOwnerLabel(opportunity),
        amount: formatWanAmount(opportunity.expectedValue),
        paymentTerm: signed ? "分期付款" : "待商务确认",
        signDate:
          opportunity.expectedCloseDate || new Date().toISOString().slice(0, 10),
        status: signed ? "signed" : "reviewing",
        signatureStatus: signed ? "signed" : "unsigned",
      };
    });
}

export function deriveKnowledgeDocsFromOpportunities(
  opportunities: DemoOpportunity[],
): KnowledgeDoc[] {
  return opportunities.flatMap((opportunity) => {
    const projectName = getProjectNameFromOpportunity(opportunity);
    const updatedAt =
      opportunity.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    const docs: KnowledgeDoc[] = [
      {
        key: `knowledge-solution-${opportunity.id}`,
        name: `${projectName}解决方案说明`,
        category: "解决方案知识库 / 通用解决方案",
        author: getPreSalesOwnerLabel(opportunity),
        updatedAt,
        size: "1.8MB",
        isHot: opportunity.stage === "proposal" || opportunity.stage === "bidding",
      },
    ];
    if (opportunity.requirementBriefDocName) {
      docs.push({
        key: `knowledge-requirement-${opportunity.id}`,
        name: opportunity.requirementBriefDocName,
        category: "经验知识库 / 文档模板",
        author: getSalesOwnerLabel(opportunity.ownerUsername),
        updatedAt,
        size: "1.2MB",
      });
    }
    if (opportunity.researchDocName) {
      docs.push({
        key: `knowledge-research-${opportunity.id}`,
        name: opportunity.researchDocName,
        category: "解决方案知识库 / 场景解决方案",
        author: getPreSalesOwnerLabel(opportunity),
        updatedAt,
        size: "2.1MB",
        isFavorite: true,
      });
    }
    return docs;
  });
}

export function mergeByKey<T extends { key: string }>(
  base: T[],
  overrides: T[],
): T[] {
  const overrideMap = new Map(overrides.map((item) => [item.key, item]));
  const mergedBase = base.map((item) => overrideMap.get(item.key) || item);
  const extraItems = overrides.filter(
    (item) => !base.some((baseItem) => baseItem.key === item.key),
  );
  return [...extraItems, ...mergedBase];
}
