import type { ContractGenerationType } from "@/lib/contracts/types";

const workflowTypeKeywords: Record<
  Exclude<ContractGenerationType, "CUSTOM">,
  string[]
> = {
  NDA: ["nda", "non-disclosure", "confidentiality", "confidential"],
  VENDOR: [
    "vendor",
    "supplier",
    "procurement",
    "msa",
    "services",
    "service",
    "commercial",
  ],
  EMPLOYMENT: [
    "employment",
    "employee",
    "offer",
    "onboarding",
    "hiring",
    "hr",
    "people ops",
    "people",
    "recruiting",
  ],
};

export function inferContractTypeFromMetadata(metadata: string[]) {
  const explicitType = metadata.find((item) =>
    item.toLowerCase().startsWith("contract-type:"),
  );

  if (!explicitType) {
    return null;
  }

  const value = explicitType.split(":")[1]?.trim().toUpperCase();

  if (value === "NDA" || value === "VENDOR" || value === "EMPLOYMENT") {
    return value;
  }

  return null;
}

export function inferContractTypeFromSignals(signals: string): ContractGenerationType {
  const normalizedSignals = signals.toLowerCase();

  for (const [type, keywords] of Object.entries(workflowTypeKeywords)) {
    if (keywords.some((keyword) => normalizedSignals.includes(keyword))) {
      return type as Exclude<ContractGenerationType, "CUSTOM">;
    }
  }

  return "CUSTOM";
}

export function getWorkflowKeywordsForType(type: ContractGenerationType) {
  if (type === "CUSTOM") {
    return [];
  }

  return workflowTypeKeywords[type];
}

export function matchWorkflowByType<T extends { id: string; name: string }>(
  type: ContractGenerationType,
  workflows: T[],
) {
  const keywords = getWorkflowKeywordsForType(type);

  if (!keywords.length) {
    return null;
  }

  const ranked = workflows
    .map((workflow) => {
      const name = workflow.name.toLowerCase();
      const score = keywords.reduce((total, keyword) => {
        return total + (name.includes(keyword) ? keyword.length : 0);
      }, 0);

      return {
        workflow,
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.workflow.name.localeCompare(right.workflow.name),
    );

  return ranked[0]?.workflow ?? null;
}
