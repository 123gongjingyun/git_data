import type { DemoOpportunity } from "./opportunityDemoData";

export function normalizeProjectName(rawName?: string): string {
  const plainName = (rawName || "").trim().replace(/^【示例】/, "").trim();
  if (!plainName) {
    return "未命名项目";
  }
  if (plainName.endsWith("项目")) {
    return plainName;
  }
  return `${plainName}项目`;
}

export function getProjectNameFromOpportunity(
  opportunity: Pick<DemoOpportunity, "name" | "projectName">,
): string {
  if (opportunity.projectName?.trim()) {
    return normalizeProjectName(opportunity.projectName);
  }
  return normalizeProjectName(opportunity.name);
}

export function buildProjectKey(projectName: string, customerName?: string): string {
  return `project:${encodeURIComponent(
    `${(customerName || "未绑定客户").trim()}::${normalizeProjectName(projectName)}`,
  )}`;
}

export function getCustomerNameFromProjectKey(projectKey?: string): string | undefined {
  if (!projectKey?.startsWith("project:")) {
    return undefined;
  }
  try {
    const decoded = decodeURIComponent(projectKey.slice("project:".length));
    const [customerName] = decoded.split("::");
    const normalized = (customerName || "").trim();
    return normalized || undefined;
  } catch {
    return undefined;
  }
}

export function getProjectKeyFromOpportunity(
  opportunity: Pick<
    DemoOpportunity,
    "name" | "projectName" | "projectKey" | "customerName"
  >,
): string {
  if (opportunity.projectKey?.trim()) {
    return opportunity.projectKey;
  }
  return buildProjectKey(
    getProjectNameFromOpportunity(opportunity),
    opportunity.customerName,
  );
}
