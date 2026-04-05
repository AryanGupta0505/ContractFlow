import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

import { getContractAccessContext } from "@/lib/contracts/access";
import { contractRoles } from "@/lib/contracts/types";
import type { ContractRole } from "@/lib/contracts/types";
import type {
  WorkflowAIInput,
  WorkflowAIResponse,
  WorkflowPayload,
  WorkflowTemplateType,
} from "@/lib/workflows/types";

const geminiModelCandidates = [
  process.env.GEMINI_MODEL?.trim(),
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-flash-latest",
  "gemini-1.5-flash",
].filter(Boolean) as string[];

const maxPromptLength = 5000;
const maxNameLength = 120;
const maxConditionLength = 200;
const maxSuggestionCount = 5;
const validTemplateTypes = new Set<WorkflowTemplateType | "CUSTOM">([
  "VENDOR",
  "NDA",
  "EMPLOYMENT",
  "CUSTOM",
]);

function sanitize(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stripCodeFences(value: string) {
  return value.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
}

function buildPrompt(input: WorkflowAIInput) {
  const currentName = sanitize(input.currentWorkflow?.name);
  const currentSteps =
    input.currentWorkflow?.steps
      ?.map(
        (step, index) =>
          `Step ${index + 1}: role=${step.role}${step.condition ? `, condition=${step.condition}` : ""}`,
      )
      .join("\n") || "No current workflow provided.";

  return [
    input.mode === "suggest"
      ? "You are improving an existing contract approval workflow."
      : "You are designing a production-ready contract approval workflow.",
    "Return only valid JSON. No markdown. No explanation outside JSON.",
    "The workflow is for a multi-tenant SaaS contract lifecycle platform.",
    "Design concise but practical approval paths that feel realistic for legal/commercial operations.",
    "Use only these roles for steps: ADMIN, MANAGER, EMPLOYEE.",
    "Each step needs a role and may include a short condition string.",
    "Conditions must be written in everyday business language that non-technical reviewers can understand.",
    "Avoid code-like property paths, boolean expressions, and operators in conditions.",
    'Example: say "when payment terms are included" instead of "Contract.PaymentTerms.Exists == true".',
    "Avoid duplicate filler steps unless the prompt clearly requires them.",
    input.mode === "suggest"
      ? "Improve the current workflow. Tighten naming, reduce unnecessary steps, and suggest better conditions where useful."
      : "Create a fresh workflow from the prompt. Choose a strong workflow name and a sensible step sequence.",
    "Respond with this exact JSON shape:",
    '{"workflow":{"name":"string","steps":[{"role":"ADMIN|MANAGER|EMPLOYEE","condition":"optional string"}]},"summary":"string","suggestions":["string"],"suggestedType":"VENDOR|NDA|EMPLOYMENT|CUSTOM"}',
    `Requested contract type hint: ${input.contractType || "CUSTOM"}`,
    `User prompt: ${sanitize(input.prompt)}`,
    `Current workflow name: ${currentName || "None"}`,
    "Current workflow steps:",
    currentSteps,
  ].join("\n");
}

function normalizeWorkflowPayload(payload: unknown): WorkflowPayload {
  const workflow = (payload ?? {}) as WorkflowPayload;
  const name = sanitize(workflow.name).slice(0, maxNameLength);
  const steps = Array.isArray(workflow.steps)
    ? workflow.steps
        .map((step) => {
          const rawStep = (step ?? {}) as WorkflowPayload["steps"][number];
          const role = sanitize(rawStep.role) as ContractRole;
          const condition = sanitize(rawStep.condition).slice(0, maxConditionLength);

          if (!contractRoles.includes(role)) {
            return null;
          }

          return {
            role,
            ...(condition ? { condition } : {}),
          };
        })
        .filter(
          (
            step,
          ): step is {
            role: ContractRole;
            condition?: string;
          } => Boolean(step),
        )
    : [];

  if (!name) {
    throw new Error("AI did not return a valid workflow name.");
  }

  if (!steps.length) {
    throw new Error("AI did not return any valid workflow steps.");
  }

  return {
    name,
    steps,
  };
}

function normalizeAIResponse(payload: unknown): WorkflowAIResponse {
  const response = (payload ?? {}) as Partial<WorkflowAIResponse> & {
    workflow?: unknown;
    suggestions?: unknown;
    suggestedType?: unknown;
  };

  const workflow = normalizeWorkflowPayload(response.workflow);
  const summary = sanitize(response.summary) || "AI generated a workflow draft.";
  const suggestions = Array.isArray(response.suggestions)
    ? response.suggestions
        .map((item) => sanitize(item))
        .filter(Boolean)
        .slice(0, maxSuggestionCount)
    : [];
  const suggestedType = sanitize(response.suggestedType) as WorkflowTemplateType | "CUSTOM";

  return {
    workflow,
    summary,
    suggestions,
    suggestedType: validTemplateTypes.has(suggestedType) ? suggestedType : "CUSTOM",
  };
}

export async function POST(request: Request) {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!context.permissions.canCreate && !context.permissions.canEdit) {
    return NextResponse.json(
      { error: "You do not have permission to use AI workflow tools." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Partial<WorkflowAIInput>;
  const payload: WorkflowAIInput = {
    prompt: sanitize(body.prompt),
    mode: body.mode === "suggest" ? "suggest" : "generate",
    currentWorkflow: body.currentWorkflow,
    contractType:
      body.contractType === "VENDOR" ||
      body.contractType === "NDA" ||
      body.contractType === "EMPLOYMENT"
        ? body.contractType
        : "CUSTOM",
  };

  if (!payload.prompt) {
    return NextResponse.json(
      { error: "Tell AI what kind of workflow you want first." },
      { status: 400 },
    );
  }

  if (payload.prompt.length > maxPromptLength) {
    return NextResponse.json(
      { error: `Prompt must be ${maxPromptLength} characters or fewer.` },
      { status: 400 },
    );
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Gemini API key not configured." },
      { status: 500 },
    );
  }

  const prompt = buildPrompt(payload);

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    let content = "";
    let lastErrorMessage = "";

    for (const modelName of geminiModelCandidates) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: payload.mode === "suggest" ? 0.35 : 0.45,
            maxOutputTokens: 2200,
            responseMimeType: "application/json",
          },
          systemInstruction:
            "You design concise enterprise approval workflows for contracts. Output valid JSON only and keep step logic practical.",
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        content = stripCodeFences(sanitize(response.text()));

        if (content) {
          break;
        }
      } catch (modelError) {
        lastErrorMessage =
          modelError instanceof Error ? modelError.message : "Failed to generate workflow";
        console.error(`Gemini workflow generation failed for model ${modelName}`, modelError);
      }
    }

    if (!content) {
      return NextResponse.json(
        {
          error: lastErrorMessage || "Gemini did not return workflow content.",
        },
        { status: 500 },
      );
    }

    const normalized = normalizeAIResponse(JSON.parse(content));
    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Workflow AI generation failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate workflow suggestions.",
      },
      { status: 500 },
    );
  }
}
