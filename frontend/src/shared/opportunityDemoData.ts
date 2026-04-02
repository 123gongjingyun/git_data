import {
  getCustomerNameFromProjectKey,
  getProjectKeyFromOpportunity,
  getProjectNameFromOpportunity,
} from "./projectNaming";
import {
  getDefaultSharedTeamMemberUsername,
  getSharedTeamMemberLabel,
  getSharedTeamMemberOptions,
  loadSharedTeamMembers,
} from "./teamDirectory";

export type ApprovalStatus = "approved" | "pending" | "rejected";
export type OpportunityWorkflowActionType =
  | "upload"
  | "approve"
  | "reject"
  | "assign"
  | "notify";

export interface OpportunityWorkflowRecord {
  id: string;
  nodeKey: string;
  nodeName: string;
  actionType: OpportunityWorkflowActionType;
  actionLabel: string;
  actorUsername: string;
  actorLabel: string;
  createdAt: string;
  comment?: string;
  fileName?: string;
  assignedToUsername?: string;
  assignedToLabel?: string;
 }

export interface DemoOpportunity {
  id: number;
  opportunityCode?: string;
  name: string;
  customerName?: string;
  projectKey?: string;
  projectName?: string;
  stage?: string;
  approvalStatus?: ApprovalStatus;
  techApprovalStatus?: ApprovalStatus;
  bizApprovalStatus?: ApprovalStatus;
  approvalOpinion?: string;
  requirementBriefDocName?: string;
  researchDocName?: string;
  solutionOwnerUsername?: string;
  expectedValue?: string;
  probability?: number;
  weightedValue?: string;
  expectedCloseDate?: string;
  createdAt?: string;
  updatedAt?: string;
  ownerUsername?: string;
  workflowRecords?: OpportunityWorkflowRecord[];
}

export const OPPORTUNITY_DEMO_STORAGE_KEY = "sharedDemoOpportunities";
export const OPPORTUNITY_DEMO_UPDATED_EVENT = "sharedDemoOpportunitiesUpdated";
const OPPORTUNITY_DEMO_STORAGE_VERSION_KEY = "sharedDemoOpportunitiesVersion";
const OPPORTUNITY_DEMO_STORAGE_VERSION = 3;
const OPPORTUNITY_WORKFLOW_SEQUENCE = [
  "lead_confirmation",
  "sales_leader_approval",
  "solution_leader_approval",
  "assign_solution_owner",
  "requirement_analysis",
  "final_approval",
] as const;

export const DEMO_OPPORTUNITIES: DemoOpportunity[] = [
  {
    id: 1,
    opportunityCode: "OPP-000001",
    name: "【示例】某银行数字化转型项目",
    customerName: "某某银行",
    projectName: "某银行数字化转型项目",
    projectKey: "project:%E6%9F%90%E6%9F%90%E9%93%B6%E8%A1%8C%3A%3A%E6%9F%90%E9%93%B6%E8%A1%8C%E6%95%B0%E5%AD%97%E5%8C%96%E8%BD%AC%E5%9E%8B%E9%A1%B9%E7%9B%AE",
    stage: "discovery",
    approvalStatus: "pending",
    techApprovalStatus: "pending",
    bizApprovalStatus: "pending",
    requirementBriefDocName: "某银行_客户需求说明_v1.0.docx",
    expectedValue: "¥5,000,000.00",
    probability: 40,
    weightedValue: "¥2,000,000.00",
    expectedCloseDate: "2026-06-30",
    createdAt: "2026-03-01T10:00:00.000Z",
    ownerUsername: "zhangsan_sales",
  },
  {
    id: 2,
    opportunityCode: "OPP-000002",
    name: "【示例】总部统一安全接入方案",
    customerName: "某集团总部",
    projectName: "总部统一安全接入方案项目",
    projectKey: "project:%E6%9F%90%E9%9B%86%E5%9B%A2%E6%80%BB%E9%83%A8%3A%3A%E6%80%BB%E9%83%A8%E7%BB%9F%E4%B8%80%E5%AE%89%E5%85%A8%E6%8E%A5%E5%85%A5%E6%96%B9%E6%A1%88%E9%A1%B9%E7%9B%AE",
    stage: "solution_design",
    approvalStatus: "approved",
    techApprovalStatus: "approved",
    bizApprovalStatus: "approved",
    requirementBriefDocName: "总部统一安全_需求说明_v1.1.docx",
    researchDocName: "总部统一安全_需求调研纪要_v1.0.docx",
    solutionOwnerUsername: "presales_demo",
    expectedValue: "¥2,000,000.00",
    probability: 60,
    weightedValue: "¥1,200,000.00",
    expectedCloseDate: "2026-07-15",
    createdAt: "2026-03-05T09:30:00.000Z",
    ownerUsername: "presales_demo",
  },
  {
    id: 3,
    opportunityCode: "OPP-000003",
    name: "【示例】工业互联网平台升级项目",
    customerName: "示例制造企业",
    projectName: "工业互联网平台升级项目",
    projectKey: "project:%E7%A4%BA%E4%BE%8B%E5%88%B6%E9%80%A0%E4%BC%81%E4%B8%9A%3A%3A%E5%B7%A5%E4%B8%9A%E4%BA%92%E8%81%94%E7%BD%91%E5%B9%B3%E5%8F%B0%E5%8D%87%E7%BA%A7%E9%A1%B9%E7%9B%AE",
    stage: "proposal",
    approvalStatus: "pending",
    techApprovalStatus: "approved",
    bizApprovalStatus: "pending",
    requirementBriefDocName: "工业互联网平台_客户需求说明_v1.0.docx",
    expectedValue: "¥8,000,000.00",
    probability: 55,
    weightedValue: "¥4,400,000.00",
    expectedCloseDate: "2026-08-20",
    createdAt: "2026-03-10T14:15:00.000Z",
    ownerUsername: "lisi_sales",
  },
  {
    id: 4,
    opportunityCode: "OPP-000004",
    name: "【示例】智慧园区一期建设项目",
    customerName: "某地产园区",
    projectName: "智慧园区一期建设项目",
    projectKey: "project:%E6%9F%90%E5%9C%B0%E4%BA%A7%E5%9B%AD%E5%8C%BA%3A%3A%E6%99%BA%E6%85%A7%E5%9B%AD%E5%8C%BA%E4%B8%80%E6%9C%9F%E5%BB%BA%E8%AE%BE%E9%A1%B9%E7%9B%AE",
    stage: "negotiation",
    approvalStatus: "rejected",
    techApprovalStatus: "rejected",
    bizApprovalStatus: "pending",
    requirementBriefDocName: "智慧园区一期_客户需求说明_v1.0.docx",
    researchDocName: "智慧园区一期_需求调研报告_v0.9.docx",
    expectedValue: "¥10,000,000.00",
    probability: 65,
    weightedValue: "¥6,500,000.00",
    expectedCloseDate: "2026-09-30",
    createdAt: "2026-03-15T11:00:00.000Z",
    ownerUsername: "zhaoliu_sales",
  },
  {
    id: 5,
    opportunityCode: "OPP-000005",
    name: "【示例】区域医疗云平台建设项目",
    customerName: "某市卫健委",
    projectName: "区域医疗云平台建设项目",
    projectKey: "project:%E6%9F%90%E5%B8%82%E5%8D%AB%E5%81%A5%E5%A7%94%3A%3A%E5%8C%BA%E5%9F%9F%E5%8C%BB%E7%96%97%E4%BA%91%E5%B9%B3%E5%8F%B0%E5%BB%BA%E8%AE%BE%E9%A1%B9%E7%9B%AE",
    stage: "won",
    approvalStatus: "approved",
    techApprovalStatus: "approved",
    bizApprovalStatus: "approved",
    requirementBriefDocName: "区域医疗云平台_需求说明_v2.0.docx",
    researchDocName: "区域医疗云平台_调研报告_v1.2.docx",
    solutionOwnerUsername: "presales_demo",
    expectedValue: "¥12,000,000.00",
    probability: 100,
    weightedValue: "¥12,000,000.00",
    expectedCloseDate: "2026-03-18",
    createdAt: "2026-03-18T09:00:00.000Z",
    ownerUsername: "zhangsan_sales",
  },
  {
    id: 6,
    opportunityCode: "OPP-000006",
    name: "【示例】连锁零售数据中台项目",
    customerName: "某全国零售集团",
    projectName: "连锁零售数据中台项目",
    projectKey: "project:%E6%9F%90%E5%85%A8%E5%9B%BD%E9%9B%B6%E5%94%AE%E9%9B%86%E5%9B%A2%3A%3A%E8%BF%9E%E9%94%81%E9%9B%B6%E5%94%AE%E6%95%B0%E6%8D%AE%E4%B8%AD%E5%8F%B0%E9%A1%B9%E7%9B%AE",
    stage: "negotiation",
    approvalStatus: "approved",
    techApprovalStatus: "approved",
    bizApprovalStatus: "pending",
    requirementBriefDocName: "零售数据中台_需求说明_v1.3.docx",
    researchDocName: "零售数据中台_业务调研纪要_v1.0.docx",
    solutionOwnerUsername: "other_user",
    expectedValue: "¥6,500,000.00",
    probability: 75,
    weightedValue: "¥4,875,000.00",
    expectedCloseDate: "2026-11-05",
    createdAt: "2026-03-20T13:20:00.000Z",
    ownerUsername: "wangwu_sales",
  },
  {
    id: 7,
    opportunityCode: "OPP-000007",
    name: "【示例】能源集团视频融合平台项目",
    customerName: "某省能源集团",
    projectName: "能源集团视频融合平台项目",
    projectKey: "project:%E6%9F%90%E7%9C%81%E8%83%BD%E6%BA%90%E9%9B%86%E5%9B%A2%3A%3A%E8%83%BD%E6%BA%90%E9%9B%86%E5%9B%A2%E8%A7%86%E9%A2%91%E8%9E%8D%E5%90%88%E5%B9%B3%E5%8F%B0%E9%A1%B9%E7%9B%AE",
    stage: "proposal",
    approvalStatus: "pending",
    techApprovalStatus: "approved",
    bizApprovalStatus: "pending",
    requirementBriefDocName: "视频融合平台_需求说明_v1.0.docx",
    solutionOwnerUsername: "presales_demo",
    expectedValue: "¥4,800,000.00",
    probability: 50,
    weightedValue: "¥2,400,000.00",
    expectedCloseDate: "2026-12-12",
    createdAt: "2026-03-22T16:40:00.000Z",
    ownerUsername: "zhaoliu_sales",
  },
  {
    id: 8,
    opportunityCode: "OPP-000008",
    name: "【示例】省级教育云资源平台项目",
    customerName: "某省教育厅",
    projectName: "省级教育云资源平台项目",
    projectKey: "project:%E6%9F%90%E7%9C%81%E6%95%99%E8%82%B2%E5%8E%85%3A%3A%E7%9C%81%E7%BA%A7%E6%95%99%E8%82%B2%E4%BA%91%E8%B5%84%E6%BA%90%E5%B9%B3%E5%8F%B0%E9%A1%B9%E7%9B%AE",
    stage: "won",
    approvalStatus: "approved",
    techApprovalStatus: "approved",
    bizApprovalStatus: "approved",
    requirementBriefDocName: "教育云资源平台_需求说明_v1.5.docx",
    researchDocName: "教育云资源平台_调研报告_v1.1.docx",
    solutionOwnerUsername: "presales_demo",
    expectedValue: "¥9,800,000.00",
    probability: 100,
    weightedValue: "¥9,800,000.00",
    expectedCloseDate: "2026-03-20",
    createdAt: "2026-03-24T10:30:00.000Z",
    ownerUsername: "zhangsan_sales",
  },
  {
    id: 9,
    opportunityCode: "OPP-000009",
    name: "【示例】城市轨交运维协同平台项目",
    customerName: "某城市轨交集团",
    projectName: "城市轨交运维协同平台项目",
    projectKey: "project:%E6%9F%90%E5%9F%8E%E5%B8%82%E8%BD%A8%E4%BA%A4%E9%9B%86%E5%9B%A2%3A%3A%E5%9F%8E%E5%B8%82%E8%BD%A8%E4%BA%A4%E8%BF%90%E7%BB%B4%E5%8D%8F%E5%90%8C%E5%B9%B3%E5%8F%B0%E9%A1%B9%E7%9B%AE",
    stage: "negotiation",
    approvalStatus: "approved",
    techApprovalStatus: "approved",
    bizApprovalStatus: "pending",
    requirementBriefDocName: "轨交运维协同平台_需求说明_v1.0.docx",
    researchDocName: "轨交运维协同平台_调研纪要_v1.0.docx",
    solutionOwnerUsername: "other_user",
    expectedValue: "¥7,200,000.00",
    probability: 82,
    weightedValue: "¥5,904,000.00",
    expectedCloseDate: "2027-01-15",
    createdAt: "2026-03-25T09:20:00.000Z",
    ownerUsername: "zhaoliu_sales",
  },
];

export const MOCK_SALES_OWNERS: { username: string; label: string }[] = [
  { username: "zhangsan_sales", label: "张三（金融行业负责人）" },
  { username: "lisi_sales", label: "李四（制造行业销售）" },
  { username: "wangwu_sales", label: "王五（电商行业负责人）" },
  { username: "zhaoliu_sales", label: "赵六（园区行业负责人）" },
  { username: "presales_demo", label: "示例售前（presales_demo）" },
  { username: "other_user", label: "其他售前（other_user）" },
];

const PLACEHOLDER_CUSTOMER_NAMES = new Set(["待补充客户", "未绑定客户"]);

function getActionableWorkflowRecords(
  records: OpportunityWorkflowRecord[],
): OpportunityWorkflowRecord[] {
  const allowedActionMap: Record<string, OpportunityWorkflowActionType[]> = {
    lead_confirmation: ["upload"],
    sales_leader_approval: ["approve", "reject"],
    solution_leader_approval: ["approve", "reject"],
    assign_solution_owner: ["assign"],
    requirement_analysis: ["upload"],
    final_approval: ["approve", "reject"],
  };
  const orderMap = new Map(
    OPPORTUNITY_WORKFLOW_SEQUENCE.map((nodeKey, index) => [nodeKey, index]),
  );

  return records
    .filter((record) => {
      const allowedActions = allowedActionMap[record.nodeKey];
      return Boolean(allowedActions?.includes(record.actionType));
    })
    .slice()
    .sort((a, b) => {
      const aNodeKey = a.nodeKey as (typeof OPPORTUNITY_WORKFLOW_SEQUENCE)[number];
      const bNodeKey = b.nodeKey as (typeof OPPORTUNITY_WORKFLOW_SEQUENCE)[number];
      const nodeOrder =
        (orderMap.get(aNodeKey) ?? Number.MAX_SAFE_INTEGER) -
        (orderMap.get(bNodeKey) ?? Number.MAX_SAFE_INTEGER);
      if (nodeOrder !== 0) {
        return nodeOrder;
      }
      return a.createdAt.localeCompare(b.createdAt);
    })
    .reduce<OpportunityWorkflowRecord[]>((acc, record) => {
      const existingIndex = acc.findIndex(
        (item) => item.nodeKey === record.nodeKey,
      );
      if (existingIndex >= 0) {
        acc[existingIndex] = record;
      } else {
        acc.push(record);
      }
      return acc;
    }, []);
}

function hydrateOpportunityStateFromWorkflowRecords(
  opportunity: DemoOpportunity,
  records: OpportunityWorkflowRecord[],
): DemoOpportunity {
  const recordByNodeKey = new Map(records.map((record) => [record.nodeKey, record]));
  const leadRecord = recordByNodeKey.get("lead_confirmation");
  const salesApprovalRecord = recordByNodeKey.get("sales_leader_approval");
  const solutionApprovalRecord = recordByNodeKey.get("solution_leader_approval");
  const assignRecord = recordByNodeKey.get("assign_solution_owner");
  const researchRecord = recordByNodeKey.get("requirement_analysis");
  const finalApprovalRecord = recordByNodeKey.get("final_approval");

  return {
    ...opportunity,
    requirementBriefDocName:
      leadRecord?.fileName || opportunity.requirementBriefDocName,
    bizApprovalStatus:
      salesApprovalRecord?.actionType === "approve"
        ? "approved"
        : salesApprovalRecord?.actionType === "reject"
          ? "rejected"
          : opportunity.bizApprovalStatus,
    techApprovalStatus:
      solutionApprovalRecord?.actionType === "approve"
        ? "approved"
        : solutionApprovalRecord?.actionType === "reject"
          ? "rejected"
          : opportunity.techApprovalStatus,
    solutionOwnerUsername:
      assignRecord?.assignedToUsername || opportunity.solutionOwnerUsername,
    researchDocName: researchRecord?.fileName || opportunity.researchDocName,
    approvalStatus:
      finalApprovalRecord?.actionType === "approve"
        ? "approved"
        : finalApprovalRecord?.actionType === "reject"
          ? "rejected"
          : opportunity.approvalStatus,
    approvalOpinion:
      finalApprovalRecord?.comment || opportunity.approvalOpinion,
  };
}

function normalizeWorkflowState(opportunity: DemoOpportunity): DemoOpportunity {
  // Keep workflow status aligned with explicit node records / explicit fields only.
  // Avoid auto-promoting later nodes based on loosely related fields, which causes
  // the progress strip to diverge from the approval record history.
  return { ...opportunity };
}

function buildWorkflowRecordTimestamp(base: string | undefined, hourOffset: number) {
  const baseDate = base ? new Date(base) : new Date();
  const nextDate = new Date(baseDate);
  nextDate.setHours(nextDate.getHours() + hourOffset);
  return nextDate.toISOString();
}

function getManagerUsername(keyword?: string) {
  const members = loadSharedTeamMembers().filter(
    (member) =>
      member.status === "活跃" && ["经理", "管理员"].includes(member.roleLabel),
  );
  const normalizedKeyword = keyword?.trim();
  const matched = normalizedKeyword
    ? members.find((member) =>
        `${member.teamRole || ""}${member.name}${member.username}`.includes(
          normalizedKeyword,
        ),
      )
    : members[0];
  return matched?.username || "manager_demo";
}

function buildDefaultWorkflowRecords(
  opportunity: DemoOpportunity,
): OpportunityWorkflowRecord[] {
  const records: OpportunityWorkflowRecord[] = [];
  const salesOwnerUsername =
    opportunity.ownerUsername || getDefaultSharedTeamMemberUsername("sales") || "sales_demo";
  const solutionOwnerUsername =
    opportunity.solutionOwnerUsername ||
    getDefaultSharedTeamMemberUsername("presales") ||
    "presales_demo";
  const salesLeaderUsername = getManagerUsername("销售");
  const solutionManagerUsername =
    getManagerUsername("售前") || getManagerUsername("解决方案");

  if (opportunity.requirementBriefDocName) {
    records.push({
      id: `seed_upload_requirement_${opportunity.id}`,
      nodeKey: "lead_confirmation",
      nodeName: "线索确认",
      actionType: "upload",
      actionLabel: "上传需求说明",
      actorUsername: salesOwnerUsername,
      actorLabel: getSharedTeamMemberLabel(salesOwnerUsername),
      createdAt: buildWorkflowRecordTimestamp(opportunity.createdAt, 1),
      fileName: opportunity.requirementBriefDocName,
      comment: "已补齐客户背景、需求说明和预期金额。",
    });
  }

  const hasLaterThanSalesStep = Boolean(
    opportunity.techApprovalStatus === "approved" ||
      opportunity.techApprovalStatus === "rejected" ||
      opportunity.solutionOwnerUsername ||
      opportunity.researchDocName ||
      opportunity.approvalStatus === "approved" ||
      opportunity.approvalStatus === "rejected",
  );
  const canEnterSalesApproval = records.some(
    (record) => record.nodeKey === "lead_confirmation",
  );
  if (canEnterSalesApproval && opportunity.bizApprovalStatus === "rejected") {
    records.push({
      id: `seed_sales_reject_${opportunity.id}`,
      nodeKey: "sales_leader_approval",
      nodeName: "销售领导审批",
      actionType: "reject",
      actionLabel: "审批驳回",
      actorUsername: salesLeaderUsername,
      actorLabel: getSharedTeamMemberLabel(salesLeaderUsername),
      createdAt: buildWorkflowRecordTimestamp(opportunity.createdAt, 2),
      comment: "暂不建议继续投入售前资源。",
    });
    return records;
  }
  if (
    canEnterSalesApproval &&
    (opportunity.bizApprovalStatus === "approved" || hasLaterThanSalesStep)
  ) {
    records.push({
      id: `seed_sales_approve_${opportunity.id}`,
      nodeKey: "sales_leader_approval",
      nodeName: "销售领导审批",
      actionType: "approve",
      actionLabel: "审批通过",
      actorUsername: salesLeaderUsername,
      actorLabel: getSharedTeamMemberLabel(salesLeaderUsername),
      createdAt: buildWorkflowRecordTimestamp(opportunity.createdAt, 2),
      comment: "销售侧初筛通过，进入售前投入阶段。",
    });
  }

  const hasLaterThanSolutionStep = Boolean(
    opportunity.solutionOwnerUsername ||
      opportunity.researchDocName ||
      opportunity.approvalStatus === "approved" ||
      opportunity.approvalStatus === "rejected",
  );
  const canEnterSolutionApproval = records.some(
    (record) =>
      record.nodeKey === "sales_leader_approval" &&
      record.actionType === "approve",
  );
  if (
    canEnterSolutionApproval &&
    opportunity.techApprovalStatus === "rejected"
  ) {
    records.push({
      id: `seed_solution_reject_${opportunity.id}`,
      nodeKey: "solution_leader_approval",
      nodeName: "解决方案领导审批",
      actionType: "reject",
      actionLabel: "审批驳回",
      actorUsername: solutionManagerUsername,
      actorLabel: getSharedTeamMemberLabel(solutionManagerUsername),
      createdAt: buildWorkflowRecordTimestamp(opportunity.createdAt, 3),
      comment: "当前调研或承接安排尚不满足继续推进条件。",
    });
    return records;
  }
  if (
    canEnterSolutionApproval &&
    (opportunity.techApprovalStatus === "approved" || hasLaterThanSolutionStep)
  ) {
    records.push({
      id: `seed_solution_approve_${opportunity.id}`,
      nodeKey: "solution_leader_approval",
      nodeName: "解决方案领导审批",
      actionType: "approve",
      actionLabel: "审批通过",
      actorUsername: solutionManagerUsername,
      actorLabel: getSharedTeamMemberLabel(solutionManagerUsername),
      createdAt: buildWorkflowRecordTimestamp(opportunity.createdAt, 3),
      comment: "确认售前承接安排及调研结果可进入后续节点。",
    });
  }

  const canAssignSolutionOwner = records.some(
    (record) =>
      record.nodeKey === "solution_leader_approval" &&
      record.actionType === "approve",
  );
  if (canAssignSolutionOwner && opportunity.solutionOwnerUsername) {
    records.push({
      id: `seed_assign_solution_${opportunity.id}`,
      nodeKey: "assign_solution_owner",
      nodeName: "分配解决方案负责人",
      actionType: "assign",
      actionLabel: "已分配承接售前",
      actorUsername: solutionManagerUsername,
      actorLabel: getSharedTeamMemberLabel(solutionManagerUsername),
      createdAt: buildWorkflowRecordTimestamp(opportunity.createdAt, 4),
      assignedToUsername: solutionOwnerUsername,
      assignedToLabel: getSharedTeamMemberLabel(solutionOwnerUsername),
    });
  }

  const hasLaterThanResearchStep = Boolean(
    opportunity.approvalStatus === "approved" ||
      opportunity.approvalStatus === "rejected",
  );
  const canUploadResearch = records.some(
    (record) => record.nodeKey === "assign_solution_owner",
  );
  if (
    canUploadResearch &&
    (opportunity.researchDocName || hasLaterThanResearchStep)
  ) {
    records.push({
      id: `seed_upload_research_${opportunity.id}`,
      nodeKey: "requirement_analysis",
      nodeName: "需求分析",
      actionType: "upload",
      actionLabel: "上传调研文档",
      actorUsername: solutionOwnerUsername,
      actorLabel: getSharedTeamMemberLabel(solutionOwnerUsername),
      createdAt: buildWorkflowRecordTimestamp(opportunity.createdAt, 5),
      fileName:
        opportunity.researchDocName ||
        `${getProjectNameFromOpportunity(opportunity)}_需求调研报告.docx`,
      comment: "已完成详细需求分析并上传调研文档。",
    });
  }

  const canFinalApprove = records.some(
    (record) => record.nodeKey === "requirement_analysis",
  );
  if (canFinalApprove && opportunity.approvalStatus === "approved") {
    records.push({
      id: `seed_final_approve_${opportunity.id}`,
      nodeKey: "final_approval",
      nodeName: "最终审批",
      actionType: "approve",
      actionLabel: "最终审批通过",
      actorUsername: salesLeaderUsername,
      actorLabel: getSharedTeamMemberLabel(salesLeaderUsername),
      createdAt: buildWorkflowRecordTimestamp(opportunity.createdAt, 7),
      comment: opportunity.approvalOpinion || "审批通过，转入后续方案阶段。",
    });
  } else if (canFinalApprove && opportunity.approvalStatus === "rejected") {
    records.push({
      id: `seed_final_reject_${opportunity.id}`,
      nodeKey: "final_approval",
      nodeName: "最终审批",
      actionType: "reject",
      actionLabel: "最终审批驳回",
      actorUsername: salesLeaderUsername,
      actorLabel: getSharedTeamMemberLabel(salesLeaderUsername),
      createdAt: buildWorkflowRecordTimestamp(opportunity.createdAt, 7),
      comment: opportunity.approvalOpinion || "最终审批未通过，流程终止。",
    });
  }

  return records;
}

function clearWorkflowManagedState(opportunity: DemoOpportunity): DemoOpportunity {
  return {
    ...opportunity,
    approvalStatus: "pending",
    techApprovalStatus: "pending",
    bizApprovalStatus: "pending",
    approvalOpinion: undefined,
    requirementBriefDocName: undefined,
    researchDocName: undefined,
    solutionOwnerUsername: undefined,
  };
}

function normalizeWorkflowRecords(
  records: OpportunityWorkflowRecord[],
): OpportunityWorkflowRecord[] {
  return getActionableWorkflowRecords(records);
}

function getWorkflowRecordSignature(
  records: OpportunityWorkflowRecord[],
): string[] {
  return records.map((record) => `${record.nodeKey}:${record.actionType}`);
}

function isMeaningfulText(value?: string): value is string {
  return Boolean(value && value.trim());
}

function isMeaningfulCustomerName(value?: string): value is string {
  return Boolean(
    value &&
      value.trim() &&
      !PLACEHOLDER_CUSTOMER_NAMES.has(value.trim()),
  );
}

function findDefaultOpportunity(opportunity: DemoOpportunity): DemoOpportunity | undefined {
  return DEMO_OPPORTUNITIES.find((item) => {
    if (isMeaningfulText(opportunity.projectKey) && item.projectKey === opportunity.projectKey) {
      return true;
    }
    if (isMeaningfulText(opportunity.projectName) && item.projectName === opportunity.projectName) {
      return true;
    }
    return item.name === opportunity.name;
  });
}

export function getSalesOwnerLabel(username?: string): string {
  if (!username) {
    return "-";
  }
  const sharedLabel = getSharedTeamMemberLabel(username);
  if (sharedLabel !== username) {
    return sharedLabel;
  }
  const found = MOCK_SALES_OWNERS.find((owner) => owner.username === username);
  return found?.label || username;
}

export function getSelectableOwnerOptions(
  role: "sales" | "presales" | "all" = "all",
): { value: string; label: string }[] {
  const sharedOptions = getSharedTeamMemberOptions(role);
  const fallbackOptions =
    role === "presales"
      ? MOCK_SALES_OWNERS.filter((owner) =>
          ["presales_demo", "other_user"].includes(owner.username),
        )
      : role === "sales"
        ? MOCK_SALES_OWNERS.filter((owner) =>
            !["presales_demo", "other_user"].includes(owner.username),
          )
        : MOCK_SALES_OWNERS;
  const merged = new Map<string, string>();
  [...sharedOptions, ...fallbackOptions.map((item) => ({ value: item.username, label: item.label }))].forEach(
    (item) => {
      merged.set(item.value, item.label);
    },
  );
  return Array.from(merged.entries()).map(([value, label]) => ({ value, label }));
}

function normalizeDemoOpportunity(
  opportunity: DemoOpportunity,
  forceWorkflowRebuild = false,
): DemoOpportunity {
  const defaultOpportunity = findDefaultOpportunity(opportunity);
  const explicitOpportunity = {
    ...defaultOpportunity,
    ...opportunity,
  };
  const actionableWorkflowRecords =
    !forceWorkflowRebuild && Array.isArray(opportunity.workflowRecords)
      ? normalizeWorkflowRecords(opportunity.workflowRecords)
      : [];
  const hydratedOpportunity = hydrateOpportunityStateFromWorkflowRecords(
    explicitOpportunity,
    actionableWorkflowRecords,
  );
  const ownerUsername =
    hydratedOpportunity.ownerUsername || getDefaultSharedTeamMemberUsername("sales");
  const solutionOwnerUsername =
    hydratedOpportunity.solutionOwnerUsername ||
    defaultOpportunity?.solutionOwnerUsername ||
    getDefaultSharedTeamMemberUsername("presales") ||
    ownerUsername;
  const customerNameFromProjectKey = getCustomerNameFromProjectKey(hydratedOpportunity.projectKey);
  const fallbackCustomerName = isMeaningfulCustomerName(defaultOpportunity?.customerName)
    ? defaultOpportunity?.customerName
    : getCustomerNameFromProjectKey(defaultOpportunity?.projectKey);
  const customerName = isMeaningfulCustomerName(hydratedOpportunity.customerName)
    ? hydratedOpportunity.customerName
    : isMeaningfulCustomerName(customerNameFromProjectKey)
      ? customerNameFromProjectKey
      : fallbackCustomerName;
  const projectName = getProjectNameFromOpportunity({
    ...defaultOpportunity,
    ...hydratedOpportunity,
  });
  const projectKey = getProjectKeyFromOpportunity({
    ...defaultOpportunity,
    ...hydratedOpportunity,
    customerName,
    projectName,
  });
  const normalizedWorkflowState = normalizeWorkflowState({
    ...defaultOpportunity,
    ...hydratedOpportunity,
    customerName: customerName || "待补充客户",
    ownerUsername,
    solutionOwnerUsername,
    projectName,
    projectKey,
  });
  const defaultWorkflowRecords = buildDefaultWorkflowRecords(normalizedWorkflowState);
  const workflowRecords =
    !forceWorkflowRebuild &&
    actionableWorkflowRecords.length > 0 &&
    JSON.stringify(getWorkflowRecordSignature(actionableWorkflowRecords)) ===
      JSON.stringify(getWorkflowRecordSignature(defaultWorkflowRecords))
      ? actionableWorkflowRecords
      : defaultWorkflowRecords;
  const workflowHydratedOpportunity = hydrateOpportunityStateFromWorkflowRecords(
    clearWorkflowManagedState({
      ...defaultOpportunity,
      ...normalizedWorkflowState,
      customerName: customerName || "待补充客户",
      ownerUsername,
      projectName,
      projectKey,
    }),
    workflowRecords,
  );
  return {
    ...defaultOpportunity,
    ...workflowHydratedOpportunity,
    customerName: customerName || "待补充客户",
    ownerUsername,
    projectName,
    projectKey,
    workflowRecords,
  };
}

function normalizeDemoOpportunities(
  opportunities: DemoOpportunity[],
  forceWorkflowRebuild = false,
): DemoOpportunity[] {
  return opportunities.map((opportunity) =>
    normalizeDemoOpportunity(opportunity, forceWorkflowRebuild),
  );
}

export function loadSharedDemoOpportunities(): DemoOpportunity[] {
  if (typeof window === "undefined") {
    return normalizeDemoOpportunities(DEMO_OPPORTUNITIES);
  }
  try {
    const storedVersion = Number(
      window.localStorage.getItem(OPPORTUNITY_DEMO_STORAGE_VERSION_KEY) || "0",
    );
    const raw = window.localStorage.getItem(OPPORTUNITY_DEMO_STORAGE_KEY);
    if (!raw) {
      return normalizeDemoOpportunities(DEMO_OPPORTUNITIES);
    }
    const shouldForceWorkflowRebuild =
      storedVersion < OPPORTUNITY_DEMO_STORAGE_VERSION;
    const parsed = normalizeDemoOpportunities(
      JSON.parse(raw) as DemoOpportunity[],
      shouldForceWorkflowRebuild,
    );
    if (Array.isArray(parsed) && parsed.length > 0) {
      const parsedIds = new Set(parsed.map((item) => item.id));
      const missingDefaults = normalizeDemoOpportunities(DEMO_OPPORTUNITIES).filter(
        (item) => !parsedIds.has(item.id),
      );
      const merged = [...parsed, ...missingDefaults];
      if (
        storedVersion < OPPORTUNITY_DEMO_STORAGE_VERSION ||
        JSON.stringify(merged) !== JSON.stringify(JSON.parse(raw) as DemoOpportunity[])
      ) {
        saveSharedDemoOpportunities(merged);
      }
      return merged;
    }
  } catch {
    // ignore parse/storage errors and fall back to demo data
  }
  return normalizeDemoOpportunities(DEMO_OPPORTUNITIES);
}

export function saveSharedDemoOpportunities(opportunities: DemoOpportunity[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const normalized = normalizeDemoOpportunities(opportunities);
    window.localStorage.setItem(
      OPPORTUNITY_DEMO_STORAGE_KEY,
      JSON.stringify(normalized),
    );
    window.localStorage.setItem(
      OPPORTUNITY_DEMO_STORAGE_VERSION_KEY,
      String(OPPORTUNITY_DEMO_STORAGE_VERSION),
    );
    window.dispatchEvent(
      new CustomEvent(OPPORTUNITY_DEMO_UPDATED_EVENT, {
        detail: normalized,
      }),
    );
  } catch {
    // best-effort only
  }
}
