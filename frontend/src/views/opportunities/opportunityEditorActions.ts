import { getNextOpportunityCode } from "../../shared/opportunityCode";
import {
  buildProjectKey,
  getProjectNameFromOpportunity,
  normalizeProjectName,
} from "../../shared/projectNaming";
import type { DemoOpportunity } from "../../shared/opportunityDemoData";

interface EditorValues {
  name: string;
  customerName?: string;
  projectBindingMode: "existing" | "new";
  existingProjectKey?: string;
  newProjectName?: string;
  stage: string;
  expectedValue?: string;
  probability?: number;
  expectedCloseDate?: string;
  ownerUsername?: string;
}

export function buildOpportunityFromEditorInput(params: {
  values: EditorValues;
  opportunities: DemoOpportunity[];
  projectOptions: Array<{ value: string; label: string }>;
  editingOpportunity: DemoOpportunity | null;
  currentUsername?: string | null;
}) {
  const { values, opportunities, projectOptions, editingOpportunity, currentUsername } =
    params;
  const {
    name,
    customerName: formCustomer,
    projectBindingMode,
    existingProjectKey,
    newProjectName,
    stage: formStage,
    expectedValue: formExpectedValue,
    probability: formProbability,
    expectedCloseDate,
    ownerUsername: formOwnerUsername,
  } = values;

  const now = new Date().toISOString();
  const maxId = opportunities.reduce((max, o) => (o.id > max ? o.id : max), 0);
  const newId = maxId + 1;
  const nextOpportunityCode = getNextOpportunityCode(
    opportunities.map((item) => item.opportunityCode),
  );

  const rawExpected = formExpectedValue ? Number(formExpectedValue) : undefined;
  let expectedDisplay: string | undefined;
  if (rawExpected != null && Number.isFinite(rawExpected)) {
    expectedDisplay = `¥${rawExpected.toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  let probabilityNumber: number | undefined;
  if (formProbability !== undefined && formProbability !== null) {
    const num = Number(formProbability);
    if (!Number.isNaN(num)) {
      probabilityNumber = num;
    }
  }

  let weightedDisplay: string | undefined;
  if (
    rawExpected != null &&
    Number.isFinite(rawExpected) &&
    probabilityNumber != null
  ) {
    const weighted = (rawExpected * probabilityNumber) / 100;
    weightedDisplay = `¥${weighted.toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  const trimmedCustomer = formCustomer?.trim() || undefined;
  const resolvedProjectName =
    projectBindingMode === "existing"
      ? projectOptions.find((item) => item.value === existingProjectKey)?.label ||
        getProjectNameFromOpportunity({
          name,
          customerName: trimmedCustomer,
        } as DemoOpportunity)
      : normalizeProjectName(newProjectName || name);
  const resolvedProjectKey =
    projectBindingMode === "existing" && existingProjectKey
      ? existingProjectKey
      : buildProjectKey(resolvedProjectName, trimmedCustomer);

  if (editingOpportunity) {
    return {
      mode: "edit" as const,
      targetId: editingOpportunity.id,
      patch: {
        name,
        customerName: trimmedCustomer,
        projectName: resolvedProjectName,
        projectKey: resolvedProjectKey,
        stage: formStage,
        expectedValue: expectedDisplay,
        expectedCloseDate: expectedCloseDate || undefined,
        probability: probabilityNumber,
        weightedValue: weightedDisplay,
        ownerUsername:
          formOwnerUsername && formOwnerUsername.trim().length > 0
            ? formOwnerUsername
            : editingOpportunity.ownerUsername,
        opportunityCode: editingOpportunity.opportunityCode || nextOpportunityCode,
      } satisfies Partial<DemoOpportunity>,
    };
  }

  return {
    mode: "create" as const,
    newOpportunity: {
      id: newId,
      opportunityCode: nextOpportunityCode,
      name,
      customerName: trimmedCustomer,
      projectName: resolvedProjectName,
      projectKey: resolvedProjectKey,
      stage: formStage,
      expectedValue: expectedDisplay,
      expectedCloseDate: expectedCloseDate || undefined,
      probability: probabilityNumber,
      weightedValue: weightedDisplay,
      createdAt: now,
      ownerUsername:
        (formOwnerUsername &&
          formOwnerUsername.trim().length > 0 &&
          formOwnerUsername) ||
        currentUsername ||
        undefined,
    } satisfies DemoOpportunity,
  };
}
