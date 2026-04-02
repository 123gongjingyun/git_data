import { Injectable } from "@nestjs/common";
import { ListOpportunitiesQuery } from "./opportunities.service";

interface MockCustomer {
  id: number;
  name: string;
}

interface MockOwner {
  id: number;
  username: string;
}

export interface MockOpportunity {
  id: number;
  name: string;
  stage: string;
  expectedValue?: string;
  expectedCloseDate?: string;
  probability?: number;
  customer?: MockCustomer | null;
  owner?: MockOwner | null;
  createdAt: string;
}

@Injectable()
export class MockOpportunitiesService {
  private readonly mockData: MockOpportunity[] = [
    {
      id: 1,
      name: "【Mock】某银行数字化转型项目",
      stage: "discovery",
      expectedValue: "5000000.00",
      expectedCloseDate: "2026-06-30",
      probability: 40,
      customer: { id: 1, name: "示例客户 A 公司" },
      owner: { id: 1, username: "presales_demo" },
      createdAt: "2026-03-01T10:00:00.000Z",
    },
    {
      id: 2,
      name: "【Mock】总部统一安全接入方案",
      stage: "solution_design",
      expectedValue: "2000000.00",
      expectedCloseDate: "2026-07-15",
      probability: 60,
      customer: { id: 2, name: "示例客户 B 集团" },
      owner: { id: 2, username: "presales_demo" },
      createdAt: "2026-03-05T09:30:00.000Z",
    },
    {
      id: 3,
      name: "【Mock】工业互联网平台升级项目",
      stage: "proposal",
      expectedValue: "8000000.00",
      expectedCloseDate: "2026-08-20",
      probability: 55,
      customer: { id: 3, name: "示例客户 C 制造企业" },
      owner: { id: 3, username: "other_user" },
      createdAt: "2026-03-10T14:15:00.000Z",
    },
  ];

  async findAll(query: ListOpportunitiesQuery) {
    let items = this.mockData;

    if (query.stage) {
      items = items.filter((o) => o.stage === query.stage);
    }

    const page = 1;
    const pageSize = items.length;

    return {
      items,
      total: items.length,
      page,
      pageSize,
    };
  }
}
