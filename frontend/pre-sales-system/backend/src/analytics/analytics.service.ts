import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfDay, subDays, subMonths, subWeeks, subYears } from 'date-fns';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  private getStartDate(timeRange: string): Date {
    const now = new Date();
    switch (timeRange) {
      case 'week':
        return subWeeks(now, 1);
      case 'month':
        return subMonths(now, 1);
      case 'quarter':
        return subMonths(now, 3);
      case 'year':
        return subYears(now, 1);
      default:
        return subMonths(now, 1);
    }
  }

  async getDashboardStats(timeRange: string) {
    const startDate = this.getStartDate(timeRange);
    const previousStartDate = this.getStartDate(timeRange);

    const [currentOpportunities, previousOpportunities] = await Promise.all([
      this.prisma.opportunity.count({
        where: { createdAt: { gte: startDate } },
      }),
      this.prisma.opportunity.count({
        where: { createdAt: { gte: previousStartDate, lt: startDate } },
      }),
    ]);

    const [currentWon, previousWon] = await Promise.all([
      this.prisma.opportunity.aggregate({
        where: { createdAt: { gte: startDate }, status: 'WON' },
        _sum: { expectedValue: true },
      }),
      this.prisma.opportunity.aggregate({
        where: { createdAt: { gte: previousStartDate, lt: startDate }, status: 'WON' },
        _sum: { expectedValue: true },
      }),
    ]);

    const currentValue = currentWon._sum.expectedValue || 0;
    const previousValue = previousWon._sum.expectedValue || 0;

    return {
      totalOpportunities: currentOpportunities,
      totalValue: currentValue,
      avgCycle: 45, // 需要根据实际业务计算
      successRate: currentOpportunities > 0 ? 60 : 0, // 需要根据实际业务计算
      opportunityGrowth: previousOpportunities > 0 
        ? ((currentOpportunities - previousOpportunities) / previousOpportunities) * 100 
        : 0,
      valueGrowth: previousValue > 0 
        ? ((currentValue - previousValue) / previousValue) * 100 
        : 0,
      cycleGrowth: -8, // 需要根据实际业务计算
      successGrowth: 5, // 需要根据实际业务计算
    };
  }

  async getFunnelData(timeRange: string) {
    const startDate = this.getStartDate(timeRange);

    const funnelData = [
      { stage: '线索', count: 0, value: 0 },
      { stage: '资质合格', count: 0, value: 0 },
      { stage: '活跃商机', count: 0, value: 0 },
      { stage: '方案提交', count: 0, value: 0 },
      { stage: '商务谈判', count: 0, value: 0 },
      { stage: '最终签约', count: 0, value: 0 },
    ];

    const opportunities = await this.prisma.opportunity.findMany({
      where: { createdAt: { gte: startDate } },
      select: { status: true, expectedValue: true },
    });

    opportunities.forEach((opp) => {
      let index = 0;
      switch (opp.status) {
        case 'LEAD':
          index = 0;
          break;
        case 'QUALIFIED':
          index = 1;
          break;
        case 'ACTIVE':
          index = 2;
          break;
        case 'WON':
          index = 5;
          break;
        default:
          index = 0;
      }
      funnelData[index].count++;
      funnelData[index].value += opp.expectedValue || 0;
    });

    return { data: funnelData };
  }

  async getTrendData(timeRange: string) {
    const startDate = this.getStartDate(timeRange);
    const months: string[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      months.push(date.toISOString().slice(0, 7));
    }

    const trendData = await Promise.all(
      months.map(async (month) => {
        const monthStart = new Date(`${month}-01`);
        const monthEnd = new Date(
          new Date(month).getFullYear(),
          new Date(month).getMonth() + 1,
          0
        );

        const opportunities = await this.prisma.opportunity.findMany({
          where: {
            createdAt: { gte: monthStart, lte: monthEnd },
          },
          select: { status: true, expectedValue: true },
        });

        const won = opportunities.filter((o) => o.status === 'WON');
        const lost = opportunities.filter((o) => o.status === 'LOST');
        const active = opportunities.filter((o) => !['WON', 'LOST'].includes(o.status));

        return {
          month,
          opportunities: opportunities.length,
          won: won.length,
          lost: lost.length,
          active: active.length,
          value: won.reduce((sum, o) => sum + (o.expectedValue || 0), 0),
        };
      })
    );

    return { data: trendData };
  }

  async getDistributionData(timeRange: string) {
    const startDate = this.getStartDate(timeRange);

    const projects = await this.prisma.project.findMany({
      where: { createdAt: { gte: startDate } },
      select: { industry: true, expectedValue: true },
    });

    const distribution = projects.reduce((acc: any, project) => {
      const industry = project.industry || '其他';
      if (!acc[industry]) {
        acc[industry] = 0;
      }
      acc[industry] += project.expectedValue || 0;
      return acc;
    }, {});

    const data = Object.entries(distribution).map(([name, value]) => ({
      name,
      value: value as number,
    }));

    return { data };
  }

  async getProjectProgress(timeRange: string) {
    const startDate = this.getStartDate(timeRange);

    const users = await this.prisma.user.findMany({
      where: {
        opportunities: {
          some: {
            createdAt: { gte: startDate },
          },
        },
      },
      select: {
        id: true,
        realName: true,
        _count: {
          select: {
            opportunities: true,
          },
        },
      },
    });

    const teamPerformance = await Promise.all(
      users.map(async (user) => {
        const opportunities = await this.prisma.opportunity.findMany({
          where: {
            createdBy: user.id,
            createdAt: { gte: startDate },
          },
          select: { status: true, expectedValue: true },
        });

        const won = opportunities.filter((o) => o.status === 'WON');
        const lost = opportunities.filter((o) => o.status === 'LOST');
        const active = opportunities.filter((o) => !['WON', 'LOST'].includes(o.status));

        return {
          id: user.id,
          name: user.realName || '未知',
          opportunities: opportunities.length,
          won: won.length,
          lost: lost.length,
          active: active.length,
          value: won.reduce((sum, o) => sum + (o.expectedValue || 0), 0),
          successRate: opportunities.length > 0 ? (won.length / opportunities.length) * 100 : 0,
        };
      })
    );

    return { data: teamPerformance.sort((a, b) => b.value - a.value) };
  }
}
