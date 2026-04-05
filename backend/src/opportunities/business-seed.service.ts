import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../domain/entities/customer.entity";
import { Lead, type LeadSource, type LeadStatus } from "../domain/entities/lead.entity";
import {
  Opportunity,
  type ApprovalSummaryStatus,
  type OpportunityStage,
} from "../domain/entities/opportunity.entity";
import {
  SolutionVersion,
  type SolutionStatus,
} from "../domain/entities/solution-version.entity";
import { User } from "../domain/entities/user.entity";
import { UsersService } from "../users/users.service";

interface SeedOpportunityInput {
  name: string;
  customerName: string;
  customerIndustry: string;
  customerLevel: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  leadTitle: string;
  leadStatus: LeadStatus;
  leadSource: LeadSource;
  stage: OpportunityStage;
  expectedValue: string;
  expectedCloseDate: string;
  probability: number;
  approvalStatus: ApprovalSummaryStatus;
  bizApprovalStatus?: "pending" | "approved" | "rejected" | null;
  techApprovalStatus?: "pending" | "approved" | "rejected" | null;
  requirementBriefDocName?: string | null;
  researchDocName?: string | null;
  solutionOwnerUsername?: string | null;
  approvalOpinion?: string | null;
  ownerUsername: string;
  solution: {
    name: string;
    versionTag: string;
    status: SolutionStatus;
    approvalStatus: ApprovalSummaryStatus;
    summary: string;
    createdByUsername: string;
  };
}

const SEEDED_OPPORTUNITIES: SeedOpportunityInput[] = [
  {
    name: "某银行数字化转型项目",
    customerName: "某某银行",
    customerIndustry: "金融行业",
    customerLevel: "A",
    contactName: "刘总",
    contactEmail: "liu.zong@bank.example.com",
    contactPhone: "13800000001",
    leadTitle: "某某银行 CRM 升级线索",
    leadStatus: "converted",
    leadSource: "crm",
    stage: "discovery",
    expectedValue: "5000000.00",
    expectedCloseDate: "2026-06-30",
    probability: 40,
    approvalStatus: "pending",
    bizApprovalStatus: "pending",
    techApprovalStatus: "pending",
    requirementBriefDocName: "某银行_客户需求说明_v1.0.docx",
    ownerUsername: "zhangsan_sales",
    solution: {
      name: "某银行数字化转型项目解决方案",
      versionTag: "v1.0",
      status: "draft",
      approvalStatus: "draft",
      summary: "聚焦客户主数据整合、统一客户画像与移动营销场景。",
      createdByUsername: "presales_demo",
    },
  },
  {
    name: "总部统一安全接入方案",
    customerName: "某集团总部",
    customerIndustry: "大型企业",
    customerLevel: "A",
    contactName: "周主任",
    contactEmail: "zhou.office@hq.example.com",
    contactPhone: "13800000002",
    leadTitle: "集团总部安全接入改造",
    leadStatus: "converted",
    leadSource: "crm",
    stage: "solution_design",
    expectedValue: "2000000.00",
    expectedCloseDate: "2026-07-15",
    probability: 60,
    approvalStatus: "approved",
    bizApprovalStatus: "approved",
    techApprovalStatus: "approved",
    requirementBriefDocName: "总部统一安全_需求说明_v1.1.docx",
    researchDocName: "总部统一安全_需求调研纪要_v1.0.docx",
    solutionOwnerUsername: "presales_demo",
    ownerUsername: "zhangsan_sales",
    solution: {
      name: "总部统一安全接入方案",
      versionTag: "v1.1",
      status: "approved",
      approvalStatus: "approved",
      summary: "统一远程办公、零信任接入与总部边界安全策略。",
      createdByUsername: "presales_demo",
    },
  },
  {
    name: "工业互联网平台升级项目",
    customerName: "示例制造企业",
    customerIndustry: "制造行业",
    customerLevel: "B",
    contactName: "孙工",
    contactEmail: "sun.gong@factory.example.com",
    contactPhone: "13800000003",
    leadTitle: "工厂工业互联网平台升级",
    leadStatus: "converted",
    leadSource: "manual",
    stage: "proposal",
    expectedValue: "8000000.00",
    expectedCloseDate: "2026-08-20",
    probability: 55,
    approvalStatus: "pending",
    bizApprovalStatus: "approved",
    techApprovalStatus: "approved",
    requirementBriefDocName: "工业互联网平台_客户需求说明_v1.0.docx",
    researchDocName: "工业互联网平台_调研纪要_v1.0.docx",
    solutionOwnerUsername: "presales_demo",
    ownerUsername: "lisi_sales",
    solution: {
      name: "工业互联网平台升级方案",
      versionTag: "v2.0",
      status: "in_review",
      approvalStatus: "in_review",
      summary: "围绕设备接入、工艺可视化与生产指标看板进行升级。",
      createdByUsername: "presales_demo",
    },
  },
  {
    name: "智慧园区一期建设项目",
    customerName: "某地产园区",
    customerIndustry: "园区行业",
    customerLevel: "B",
    contactName: "唐经理",
    contactEmail: "tang.manager@park.example.com",
    contactPhone: "13800000004",
    leadTitle: "园区一期智慧化建设",
    leadStatus: "converted",
    leadSource: "import",
    stage: "negotiation",
    expectedValue: "10000000.00",
    expectedCloseDate: "2026-09-30",
    probability: 65,
    approvalStatus: "rejected",
    bizApprovalStatus: "approved",
    techApprovalStatus: "rejected",
    requirementBriefDocName: "智慧园区一期_客户需求说明_v1.0.docx",
    researchDocName: "智慧园区一期_需求调研报告_v0.9.docx",
    approvalOpinion: "现阶段商务条款与交付边界尚未达成一致。",
    ownerUsername: "zhaoliu_sales",
    solution: {
      name: "智慧园区一期建设方案",
      versionTag: "v0.9",
      status: "rejected",
      approvalStatus: "rejected",
      summary: "一期聚焦园区安防、访客和停车联动，暂缓二期扩展模块。",
      createdByUsername: "other_user",
    },
  },
  {
    name: "区域医疗云平台建设项目",
    customerName: "某市卫健委",
    customerIndustry: "医疗行业",
    customerLevel: "A",
    contactName: "韩处长",
    contactEmail: "han.office@health.example.com",
    contactPhone: "13800000005",
    leadTitle: "区域医疗云平台建设",
    leadStatus: "converted",
    leadSource: "crm",
    stage: "won",
    expectedValue: "12000000.00",
    expectedCloseDate: "2026-03-18",
    probability: 100,
    approvalStatus: "approved",
    bizApprovalStatus: "approved",
    techApprovalStatus: "approved",
    requirementBriefDocName: "区域医疗云平台_需求说明_v2.0.docx",
    researchDocName: "区域医疗云平台_调研报告_v1.2.docx",
    solutionOwnerUsername: "presales_demo",
    approvalOpinion: "方案评审通过，进入合同签署与项目交付准备。",
    ownerUsername: "zhangsan_sales",
    solution: {
      name: "区域医疗云平台总集成方案",
      versionTag: "v2.0",
      status: "approved",
      approvalStatus: "approved",
      summary: "完成区域医疗资源汇聚、交换平台与统一运维监控方案。",
      createdByUsername: "presales_demo",
    },
  },
  {
    name: "连锁零售数据中台项目",
    customerName: "某全国零售集团",
    customerIndustry: "零售行业",
    customerLevel: "A",
    contactName: "钱总监",
    contactEmail: "qian.data@retail.example.com",
    contactPhone: "13800000006",
    leadTitle: "零售集团数据中台建设",
    leadStatus: "converted",
    leadSource: "manual",
    stage: "negotiation",
    expectedValue: "6500000.00",
    expectedCloseDate: "2026-11-05",
    probability: 75,
    approvalStatus: "approved",
    bizApprovalStatus: "approved",
    techApprovalStatus: "approved",
    requirementBriefDocName: "零售数据中台_需求说明_v1.3.docx",
    researchDocName: "零售数据中台_业务调研纪要_v1.0.docx",
    solutionOwnerUsername: "other_user",
    ownerUsername: "wangwu_sales",
    solution: {
      name: "连锁零售数据中台建设方案",
      versionTag: "v1.3",
      status: "approved",
      approvalStatus: "approved",
      summary: "围绕会员、商品、订单三大域建设统一数据中台。",
      createdByUsername: "other_user",
    },
  },
  {
    name: "能源集团视频融合平台项目",
    customerName: "某省能源集团",
    customerIndustry: "能源行业",
    customerLevel: "B",
    contactName: "曹主任",
    contactEmail: "cao.video@energy.example.com",
    contactPhone: "13800000007",
    leadTitle: "能源集团视频融合平台",
    leadStatus: "converted",
    leadSource: "crm",
    stage: "proposal",
    expectedValue: "4800000.00",
    expectedCloseDate: "2026-12-12",
    probability: 50,
    approvalStatus: "pending",
    bizApprovalStatus: "approved",
    techApprovalStatus: "approved",
    requirementBriefDocName: "视频融合平台_需求说明_v1.0.docx",
    solutionOwnerUsername: "presales_demo",
    ownerUsername: "zhaoliu_sales",
    solution: {
      name: "能源集团视频融合平台方案",
      versionTag: "v1.0",
      status: "in_review",
      approvalStatus: "in_review",
      summary: "融合前端点位接入、AI 告警联动与综合安防门户。",
      createdByUsername: "presales_demo",
    },
  },
  {
    name: "省级教育云资源平台项目",
    customerName: "某省教育厅",
    customerIndustry: "教育行业",
    customerLevel: "A",
    contactName: "沈老师",
    contactEmail: "shen.edu@edu.example.com",
    contactPhone: "13800000008",
    leadTitle: "教育云资源平台建设",
    leadStatus: "converted",
    leadSource: "import",
    stage: "won",
    expectedValue: "9800000.00",
    expectedCloseDate: "2026-03-20",
    probability: 100,
    approvalStatus: "approved",
    bizApprovalStatus: "approved",
    techApprovalStatus: "approved",
    requirementBriefDocName: "教育云资源平台_需求说明_v1.5.docx",
    researchDocName: "教育云资源平台_调研报告_v1.1.docx",
    solutionOwnerUsername: "presales_demo",
    approvalOpinion: "中标确认，进入签约与项目启动阶段。",
    ownerUsername: "zhangsan_sales",
    solution: {
      name: "省级教育云资源平台实施方案",
      versionTag: "v1.5",
      status: "approved",
      approvalStatus: "approved",
      summary: "整合省级资源中心、区县节点与内容分发能力。",
      createdByUsername: "presales_demo",
    },
  },
  {
    name: "城市轨交运维协同平台项目",
    customerName: "某城市轨交集团",
    customerIndustry: "轨交行业",
    customerLevel: "A",
    contactName: "彭总",
    contactEmail: "peng.rail@metro.example.com",
    contactPhone: "13800000009",
    leadTitle: "轨交运维协同平台升级",
    leadStatus: "converted",
    leadSource: "crm",
    stage: "negotiation",
    expectedValue: "7200000.00",
    expectedCloseDate: "2027-01-15",
    probability: 82,
    approvalStatus: "approved",
    bizApprovalStatus: "approved",
    techApprovalStatus: "approved",
    requirementBriefDocName: "轨交运维协同平台_需求说明_v1.0.docx",
    researchDocName: "轨交运维协同平台_调研纪要_v1.0.docx",
    solutionOwnerUsername: "other_user",
    approvalOpinion: "业务、技术审批已闭环，转入商务谈判与合同准备。",
    ownerUsername: "zhaoliu_sales",
    solution: {
      name: "城市轨交运维协同平台方案",
      versionTag: "v1.0",
      status: "approved",
      approvalStatus: "approved",
      summary: "覆盖运维协同、工单闭环与设备台账联动能力。",
      createdByUsername: "other_user",
    },
  },
  {
    name: "城市生命线监测平台项目",
    customerName: "某市城运中心",
    customerIndustry: "城市治理",
    customerLevel: "A",
    contactName: "罗主任",
    contactEmail: "luo.city@gov.example.com",
    contactPhone: "13800000010",
    leadTitle: "城市生命线监测建设",
    leadStatus: "converted",
    leadSource: "manual",
    stage: "solution_design",
    expectedValue: "8800000.00",
    expectedCloseDate: "2026-10-28",
    probability: 68,
    approvalStatus: "pending",
    bizApprovalStatus: "approved",
    techApprovalStatus: "pending",
    requirementBriefDocName: "城市生命线监测_需求说明_v1.0.docx",
    solutionOwnerUsername: "presales_demo",
    ownerUsername: "wangwu_sales",
    solution: {
      name: "城市生命线监测平台方案",
      versionTag: "v1.0",
      status: "in_review",
      approvalStatus: "pending",
      summary: "一期覆盖燃气、供水和桥隧三类生命线对象监测。",
      createdByUsername: "presales_demo",
    },
  },
];

@Injectable()
export class BusinessSeedService implements OnModuleInit {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(Opportunity)
    private readonly opportunityRepository: Repository<Opportunity>,
    @InjectRepository(SolutionVersion)
    private readonly solutionVersionRepository: Repository<SolutionVersion>,
  ) {}

  async onModuleInit() {
    await this.ensureBusinessSeeds();
  }

  async ensureBusinessSeeds() {
    await this.usersService.ensureSeedUsers();

    for (const item of SEEDED_OPPORTUNITIES) {
      const customer = await this.upsertCustomer(item);
      const lead = await this.upsertLead(item, customer);
      const owner = await this.findUserByUsername(item.ownerUsername);
      const solutionCreator = await this.findUserByUsername(
        item.solution.createdByUsername,
      );

      const existingOpportunity = await this.opportunityRepository.findOne({
        where: {
          name: item.name,
          customer: { id: customer.id },
        },
        relations: ["customer"],
      });

      const opportunity = existingOpportunity
        ? existingOpportunity
        : this.opportunityRepository.create();

      opportunity.name = item.name;
      opportunity.description = `${item.customerName}${item.leadTitle}`;
      opportunity.stage = item.stage;
      opportunity.expectedValue = item.expectedValue;
      opportunity.expectedCloseDate = item.expectedCloseDate;
      opportunity.probability = item.probability;
      opportunity.approvalStatus = item.approvalStatus;
      opportunity.bizApprovalStatus = item.bizApprovalStatus ?? null;
      opportunity.techApprovalStatus = item.techApprovalStatus ?? null;
      opportunity.requirementBriefDocName = item.requirementBriefDocName ?? null;
      opportunity.researchDocName = item.researchDocName ?? null;
      opportunity.solutionOwnerUsername = item.solutionOwnerUsername ?? null;
      opportunity.approvalOpinion = item.approvalOpinion ?? null;
      opportunity.customer = customer;
      opportunity.lead = lead;
      opportunity.owner = owner;

      const savedOpportunity = await this.opportunityRepository.save(opportunity);

      const existingSolution = await this.solutionVersionRepository.findOne({
        where: {
          opportunity: { id: savedOpportunity.id },
          versionTag: item.solution.versionTag,
        },
        relations: ["opportunity"],
      });

      const solution = existingSolution
        ? existingSolution
        : this.solutionVersionRepository.create();
      solution.name = item.solution.name;
      solution.versionTag = item.solution.versionTag;
      solution.status = item.solution.status;
      solution.approvalStatus = item.solution.approvalStatus;
      solution.summary = item.solution.summary;
      solution.opportunity = savedOpportunity;
      solution.createdBy = solutionCreator;
      await this.solutionVersionRepository.save(solution);
    }
  }

  private async upsertCustomer(item: SeedOpportunityInput) {
    const existing = await this.customerRepository.findOne({
      where: { name: item.customerName },
    });
    const customer = existing ?? this.customerRepository.create();
    customer.name = item.customerName;
    customer.industry = item.customerIndustry;
    customer.level = item.customerLevel;
    customer.contactName = item.contactName;
    customer.contactEmail = item.contactEmail;
    customer.contactPhone = item.contactPhone;
    customer.crmId = `CRM-${item.customerName}`;
    return this.customerRepository.save(customer);
  }

  private async upsertLead(item: SeedOpportunityInput, customer: Customer) {
    const existing = await this.leadRepository.findOne({
      where: {
        title: item.leadTitle,
        customer: { id: customer.id },
      },
      relations: ["customer"],
    });
    const lead = existing ?? this.leadRepository.create();
    lead.title = item.leadTitle;
    lead.description = `${item.customerName}${item.leadTitle}`;
    lead.status = item.leadStatus;
    lead.source = item.leadSource;
    lead.estimatedValue = item.expectedValue;
    lead.customer = customer;
    return this.leadRepository.save(lead);
  }

  private async findUserByUsername(username: string) {
    const user = await this.userRepository.findOne({
      where: { username },
    });
    if (!user) {
      throw new Error(`缺少业务种子用户：${username}`);
    }
    return user;
  }
}
