import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { RoleSelect } from "./role-select";

export type StepDefinition = {
  id?: string;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  condition: string;
};

export function WorkflowStepsEditor({
  steps,
  onChange,
  disabled,
}: {
  steps: StepDefinition[];
  onChange: (steps: StepDefinition[]) => void;
  disabled?: boolean;
}) {
  const addStep = () => {
    onChange([...steps, { role: "MANAGER", condition: "" }]);
  };

  const removeStep = (index: number) => {
    onChange(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, partialData: Partial<StepDefinition>) => {
    onChange(
      steps.map((step, i) =>
        i === index ? { ...step, ...partialData } : step,
      ),
    );
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === steps.length - 1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const newSteps = [...steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[newIndex];
    newSteps[newIndex] = temp;
    onChange(newSteps);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)] px-5 py-4 text-sm leading-7 text-[var(--muted)]">
        Steps run in order. Write each condition in everyday language so non-technical reviewers can understand it easily, for example &quot;only if payment terms are included&quot;.
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={step.id || `step-${index}`}
            className="group relative flex flex-col gap-5 rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] p-5 shadow-sm transition-all hover:border-[var(--primary-soft)] hover:shadow-md sm:flex-row sm:p-6"
          >
            <div className="flex items-center gap-3 border-b border-[#e2e8f0] pb-4 sm:flex-col sm:justify-center sm:border-b-0 sm:border-r sm:pb-0 sm:pr-5">
              <button
                type="button"
                onClick={() => moveStep(index, "up")}
                disabled={disabled || index === 0}
                className="rounded-xl p-2 text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-soft)] text-sm font-semibold text-[var(--primary)]">
                {index + 1}
              </div>
              <button
                type="button"
                onClick={() => moveStep(index, "down")}
                disabled={disabled || index === steps.length - 1}
                className="rounded-xl p-2 text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium uppercase tracking-[0.1em] text-[var(--muted)]">
                  Assign Role
                </label>
                {steps.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeStep(index)}
                    disabled={disabled}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Remove</span>
                  </button>
                ) : null}
              </div>
              <div className="grid gap-4 xl:grid-cols-[minmax(220px,0.42fr)_minmax(0,1fr)]">
                <div>
                  <RoleSelect
                    value={step.role}
                    onChange={(val) =>
                      updateStep(index, { role: val as StepDefinition["role"] })
                    }
                    disabled={disabled}
                  />
                </div>
                <div>
                  <input
                    value={step.condition}
                    onChange={(e) =>
                      updateStep(index, { condition: e.target.value })
                    }
                    disabled={disabled}
                    placeholder="Optional condition (e.g. only if the amount is over 10,000)"
                    className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3.5 text-sm text-[var(--foreground)] outline-none transition-colors hover:bg-[var(--surface-soft)] focus:border-[var(--primary)] focus:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addStep}
        disabled={disabled}
        className="inline-flex w-full items-center justify-center gap-2 rounded-[24px] border border-dashed border-[var(--border)] bg-transparent px-4 py-4 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-soft)] disabled:opacity-50"
      >
        <Plus className="h-4 w-4 text-[var(--muted)]" />
        Add another step
      </button>
    </div>
  );
}
