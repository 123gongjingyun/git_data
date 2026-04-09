import type { DemoOpportunity } from "../../shared/opportunityDemoData";
import {
  getProjectKeyFromOpportunity,
  getProjectNameFromOpportunity,
} from "../../shared/projectNaming";

function parseAmount(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const cleaned = value.replace(/[¥,]/g, "");
  const num = Number(cleaned);
  return Number.isNaN(num) ? undefined : num;
}

export function buildOpportunityEditorFormValues(record: DemoOpportunity) {
  return {
    name: record.name,
    customerName: record.customerName,
    projectBindingMode: "existing" as const,
    existingProjectKey: getProjectKeyFromOpportunity(record),
    newProjectName: record.projectName || getProjectNameFromOpportunity(record),
    ownerUsername: record.ownerUsername,
    stage: record.stage || "discovery",
    expectedValue:
      parseAmount(record.expectedValue) != null
        ? String(parseAmount(record.expectedValue))
        : undefined,
    probability: record.probability != null ? record.probability : undefined,
    expectedCloseDate: record.expectedCloseDate,
  };
}
