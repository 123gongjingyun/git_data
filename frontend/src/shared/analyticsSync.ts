import type { DemoOpportunity } from "./opportunityDemoData";

export interface MonthlyPerformancePoint {
  key: string;
  monthKey: string;
  monthLabel: string;
  newAmount: number;
  signedAmount: number;
}

export function parseCurrencyAmount(value?: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[¥,]/g, "");
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : 0;
}

export function formatWanAmount(value: number): string {
  return `${Math.round(value / 10000).toLocaleString("zh-CN")}万`;
}

export function formatWanValue(value: number): string {
  return `${(value / 10000).toFixed(value >= 1000000 ? 0 : 1)}万`;
}

export function getMonthKey(dateLike?: string): string {
  if (!dateLike) return "";
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function buildRecentMonthKeys(count: number): string[] {
  const now = new Date();
  return Array.from({ length: count }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - index - 1), 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });
}

export function formatMonthLabel(monthKey: string): string {
  const [, month] = monthKey.split("-");
  return `${Number(month)}月`;
}

export function getCurrentMonthKey(): string {
  return getMonthKey(new Date().toISOString());
}

export function getCurrentMonthSignedAmount(
  opportunities: DemoOpportunity[],
): number {
  const currentMonthKey = getCurrentMonthKey();
  return opportunities
    .filter(
      (opportunity) =>
        opportunity.stage === "won" &&
        getMonthKey(opportunity.expectedCloseDate) === currentMonthKey,
    )
    .reduce(
      (sum, opportunity) => sum + parseCurrencyAmount(opportunity.expectedValue),
      0,
    );
}

export function buildMonthlyPerformanceTrend(
  opportunities: DemoOpportunity[],
  count = 6,
): MonthlyPerformancePoint[] {
  const monthKeys = buildRecentMonthKeys(count);
  return monthKeys.map((monthKey) => ({
    key: monthKey,
    monthKey,
    monthLabel: formatMonthLabel(monthKey),
    newAmount: opportunities
      .filter((item) => getMonthKey(item.createdAt) === monthKey)
      .reduce((sum, item) => sum + parseCurrencyAmount(item.expectedValue), 0),
    signedAmount: opportunities
      .filter(
        (item) =>
          item.stage === "won" &&
          getMonthKey(item.expectedCloseDate) === monthKey,
      )
      .reduce((sum, item) => sum + parseCurrencyAmount(item.expectedValue), 0),
  }));
}
