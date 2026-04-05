import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

import { getContractAccessContext } from "@/lib/contracts/access";
import type { TemplateAIInput, TemplateAIResponse, TemplateType } from "@/lib/templates/types";

const geminiModelCandidates = [
  process.env.GEMINI_MODEL?.trim(),
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-flash-latest",
  "gemini-1.5-flash",
].filter(Boolean) as string[];

const allowedTypes = new Set<TemplateType>(["NDA", "VENDOR", "EMPLOYMENT", "CUSTOM"]);
const maxPromptLength = 5000;
const templateCompletionMarker = "END OF TEMPLATE";
const suggestionCompletionMarker = "END OF SUGGESTIONS";

function sanitize(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function stripCodeFences(value: string) {
  return value.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
}

function extractPlaceholderTokens(...sources: Array<string | undefined>) {
  const matches = new Set<string>(["{{partyA}}", "{{partyB}}", "{{duration}}", "{{paymentTerms}}"]);

  for (const source of sources) {
    const value = sanitize(source);

    for (const match of value.matchAll(/\{\{\s*[a-zA-Z0-9_.-]+\s*\}\}/g)) {
      matches.add(match[0].replace(/\s+/g, ""));
    }
  }

  return Array.from(matches);
}

function isShortSingleLineHeading(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();

  return (
    normalized.length > 0 &&
    normalized.length <= 120 &&
    !normalized.includes("\n") &&
    !/[.!?]$/.test(normalized)
  );
}

function extractJsonObject(value: string) {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return value;
  }

  return value.slice(start, end + 1);
}

function repairBrokenJson(value: string) {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      result += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      if (inString) {
        let lookAhead = index + 1;

        while (lookAhead < value.length && /\s/.test(value[lookAhead] ?? "")) {
          lookAhead += 1;
        }

        const nextChar = value[lookAhead];

        if (
          nextChar &&
          nextChar !== "," &&
          nextChar !== "}" &&
          nextChar !== "]" &&
          nextChar !== ":"
        ) {
          result += '\\"';
          continue;
        }
      }

      inString = !inString;
      result += char;
      continue;
    }

    if (inString) {
      if (char === "\n") {
        result += "\\n";
        continue;
      }

      if (char === "\r") {
        result += "\\r";
        continue;
      }

      if (char === "\t") {
        result += "\\t";
        continue;
      }
    }

    result += char;
  }

  return result;
}

function parseJsonResponse(value: string) {
  const normalized = extractJsonObject(stripCodeFences(value));

  try {
    return JSON.parse(normalized);
  } catch {
    return JSON.parse(repairBrokenJson(normalized));
  }
}

function textToTemplateHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => {
      const normalizedBlock = block.replace(/^#{1,6}\s+/, "").trim();

      if (index === 0 && isShortSingleLineHeading(normalizedBlock)) {
        return `<h1>${escapeHtml(normalizedBlock)}</h1>`;
      }

      if (/^#{1}\s+/.test(block) && isShortSingleLineHeading(normalizedBlock)) {
        return `<h1>${escapeHtml(normalizedBlock)}</h1>`;
      }

      if (/^#{2,6}\s+/.test(block) && isShortSingleLineHeading(normalizedBlock)) {
        return `<h2>${escapeHtml(normalizedBlock)}</h2>`;
      }

      if (/^\d+(\.\d+)*\.\s/.test(normalizedBlock) && isShortSingleLineHeading(normalizedBlock)) {
        return `<h2>${escapeHtml(normalizedBlock)}</h2>`;
      }

      return `<p>${escapeHtml(normalizedBlock).replace(/\n/g, "<br />")}</p>`;
    })
    .join("");
}

function buildGeneratePrompt(input: TemplateAIInput) {
  const placeholders = extractPlaceholderTokens(input.prompt, input.currentContent);

  return [
    "You create reusable contract templates for a SaaS contract workflow platform.",
    "The output must be a template, not a final contract.",
    "Use placeholder tokens directly in the text where data should be filled later.",
    `Required placeholders to preserve when relevant: ${placeholders.join(", ")}.`,
    "If the user prompt includes additional placeholders, keep those exact placeholder tokens in the draft.",
    "Cover every major requirement explicitly mentioned in the user prompt.",
    "Write realistic legal/commercial template language with sections and clauses.",
    "Prefer complete, production-usable agreements over short summaries.",
    "Return plain text in exactly this structure:",
    "TITLE: <template name>",
    "SUMMARY: <one short sentence>",
    "SUGGESTIONS:",
    "- <suggestion 1>",
    "- <suggestion 2>",
    "CONTENT:",
    "<full template body>",
    templateCompletionMarker,
    "Do not use markdown fences.",
    `Template type: ${input.type}`,
    `Existing name hint: ${sanitize(input.currentName) || "None"}`,
    `User prompt: ${sanitize(input.prompt)}`,
  ].join("\n");
}

function buildSuggestionPrompt(input: TemplateAIInput) {
  const placeholders = extractPlaceholderTokens(input.prompt, input.currentContent);

  return [
    "You review reusable contract templates for a SaaS contract workflow platform.",
    "Do not rewrite the full template.",
    "Do not generate a new contract body.",
    "Read the existing template draft and suggest practical improvements.",
    "Focus on structure, missing clauses, placeholder coverage, clarity, and workflow readiness.",
    `Important placeholders already in scope: ${placeholders.join(", ")}.`,
    "Return plain text in exactly this structure:",
    "SUMMARY: <one short sentence>",
    "SUGGESTIONS:",
    "- <suggestion 1>",
    "- <suggestion 2>",
    suggestionCompletionMarker,
    "Do not use markdown fences.",
    `Template type: ${input.type}`,
    `Existing name hint: ${sanitize(input.currentName) || "None"}`,
    `User intent: ${sanitize(input.prompt) || "No additional prompt provided."}`,
    "Existing template draft:",
    sanitize(input.currentContent) || "No existing template content provided.",
  ].join("\n");
}

function buildMergePrompt(input: TemplateAIInput) {
  const placeholders = extractPlaceholderTokens(
    input.prompt,
    input.currentContent,
    input.mergeInstructions,
  );

  return [
    "You revise reusable contract templates for a SaaS contract workflow platform.",
    "You are given the current template draft and a list of improvement suggestions.",
    "Apply the suggestions at the correct places in the template and return the complete revised template.",
    "Preserve the overall intent, placeholders, and sections unless a suggestion clearly improves them.",
    "The output must remain a reusable template, not a final contract.",
    `Required placeholders to preserve when relevant: ${placeholders.join(", ")}.`,
    "Return plain text in exactly this structure:",
    "TITLE: <template name>",
    "SUMMARY: <one short sentence>",
    "SUGGESTIONS:",
    "- <suggestion 1>",
    "- <suggestion 2>",
    "CONTENT:",
    "<full revised template body>",
    templateCompletionMarker,
    "Do not use markdown fences.",
    `Template type: ${input.type}`,
    `Existing name hint: ${sanitize(input.currentName) || "None"}`,
    `Original user intent: ${sanitize(input.prompt) || "No additional prompt provided."}`,
    "Current template draft:",
    sanitize(input.currentContent) || "No current template draft provided.",
    "Suggestions to merge into the draft:",
    sanitize(input.mergeInstructions) || "No suggestions provided.",
  ].join("\n");
}

function extractNamedSection(text: string, label: string, nextLabels: string[]) {
  const pattern = new RegExp(
    `${label}:\\s*([\\s\\S]*?)(?=\\n(?:${nextLabels.join("|")}):|\\nEND OF TEMPLATE|\\nEND OF SUGGESTIONS|$)`,
    "i",
  );
  const match = text.match(pattern);
  return sanitize(match?.[1]);
}

function parseSuggestionLines(block: string) {
  return block
    .split("\n")
    .map((line) => line.replace(/^\s*[-*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 6);
}

function normalizeGenerateTextResponse(raw: string, fallbackName?: string): TemplateAIResponse {
  const cleaned = stripCodeFences(raw);
  const name =
    extractNamedSection(cleaned, "TITLE", ["SUMMARY", "SUGGESTIONS", "CONTENT"]) ||
    sanitize(fallbackName);
  const summary =
    extractNamedSection(cleaned, "SUMMARY", ["SUGGESTIONS", "CONTENT"]) ||
    "AI drafted a reusable contract template.";
  const suggestions = parseSuggestionLines(
    extractNamedSection(cleaned, "SUGGESTIONS", ["CONTENT", "SUMMARY", "TITLE"]),
  );
  const content =
    extractNamedSection(cleaned, "CONTENT", ["SUMMARY", "SUGGESTIONS", "TITLE"]) ||
    cleaned.replace(/^TITLE:.*$/im, "")
      .replace(/^SUMMARY:.*$/im, "")
      .replace(/^SUGGESTIONS:[\s\S]*?(?=\nCONTENT:|\nEND OF TEMPLATE|$)/im, "")
      .replace(/^CONTENT:\s*/im, "")
      .replace(/\nEND OF TEMPLATE\s*$/i, "")
      .trim();

  if (!name) {
    throw new Error("AI did not return a valid template name.");
  }

  if (!content) {
    throw new Error("AI did not return any template content.");
  }

  return {
    name: name.slice(0, 120),
    contentHtml: textToTemplateHtml(content),
    summary,
    suggestions,
  };
}

function normalizeSuggestionTextResponse(raw: string): TemplateAIResponse {
  const cleaned = stripCodeFences(raw);
  const summary =
    extractNamedSection(cleaned, "SUMMARY", ["SUGGESTIONS"]) ||
    "AI reviewed the current template draft and suggested targeted improvements.";
  const suggestions = parseSuggestionLines(extractNamedSection(cleaned, "SUGGESTIONS", ["SUMMARY"]));

  if (!suggestions.length) {
    throw new Error("AI did not return any suggestions for the current draft.");
  }

  return {
    summary,
    suggestions,
  };
}

function normalizeGenerateResponse(payload: unknown, fallbackName?: string): TemplateAIResponse {
  const response = (payload ?? {}) as {
    name?: unknown;
    content?: unknown;
    summary?: unknown;
    suggestions?: unknown;
  };

  const name = (sanitize(response.name) || sanitize(fallbackName)).slice(0, 120);
  const content = sanitize(response.content);
  const summary = sanitize(response.summary) || "AI drafted a reusable contract template.";
  const suggestions = Array.isArray(response.suggestions)
    ? response.suggestions
        .map((item) => sanitize(item))
        .filter(Boolean)
        .slice(0, 5)
    : [];

  if (!name) {
    throw new Error("AI did not return a valid template name.");
  }

  if (!content) {
    throw new Error("AI did not return any template content.");
  }

  return {
    name,
    contentHtml: textToTemplateHtml(content),
    summary,
    suggestions,
  };
}

function normalizeSuggestionResponse(payload: unknown): TemplateAIResponse {
  const response = (payload ?? {}) as {
    summary?: unknown;
    suggestions?: unknown;
  };

  const summary =
    sanitize(response.summary) ||
    "AI reviewed the current template draft and suggested targeted improvements.";
  const suggestions = Array.isArray(response.suggestions)
    ? response.suggestions
        .map((item) => sanitize(item))
        .filter(Boolean)
        .slice(0, 6)
    : [];

  if (!suggestions.length) {
    throw new Error("AI did not return any suggestions for the current draft.");
  }

  return {
    summary,
    suggestions,
  };
}

export async function POST(request: Request) {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (context.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only admins can use AI template tools." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Partial<TemplateAIInput>;
  const payload: TemplateAIInput = {
    mode: body.mode === "suggest" ? "suggest" : body.mode === "merge" ? "merge" : "generate",
    prompt: sanitize(body.prompt),
    type: allowedTypes.has(body.type as TemplateType) ? (body.type as TemplateType) : "CUSTOM",
    currentName: sanitize(body.currentName),
    currentContent: sanitize(body.currentContent),
    mergeInstructions: sanitize(body.mergeInstructions),
  };

  if (payload.mode === "generate" && !payload.prompt) {
    return NextResponse.json(
      { error: "Describe the template you want AI to draft first." },
      { status: 400 },
    );
  }

  if (payload.prompt.length > maxPromptLength) {
    return NextResponse.json(
      { error: `Prompt must be ${maxPromptLength} characters or fewer.` },
      { status: 400 },
    );
  }

  if ((payload.mode === "suggest" || payload.mode === "merge") && !payload.currentContent) {
    return NextResponse.json(
      { error: "Write or generate some template content first so AI can review it." },
      { status: 400 },
    );
  }

  if (payload.mode === "merge" && !payload.mergeInstructions) {
    return NextResponse.json(
      { error: "Generate suggestions first so AI knows what to merge into the draft." },
      { status: 400 },
    );
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "Gemini API key not configured." }, { status: 500 });
  }

  const prompt =
    payload.mode === "suggest"
      ? buildSuggestionPrompt(payload)
      : payload.mode === "merge"
        ? buildMergePrompt(payload)
        : buildGeneratePrompt(payload);

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    let content = "";
    let lastErrorMessage = "";

    for (const modelName of geminiModelCandidates) {
      try {
        let assembledContent = "";

        for (let attempt = 0; attempt < 3; attempt += 1) {
          const requestPrompt =
            attempt === 0
              ? prompt
              : [
                  prompt,
                  "",
                  "Partial response already generated:",
                  assembledContent,
                  "",
                  payload.mode === "suggest"
                    ? `Continue the suggestions from exactly where they stopped. Do not repeat earlier text. Finish with ${suggestionCompletionMarker}.`
                    : `Continue the template from exactly where it stopped. Do not repeat earlier text. Finish with ${templateCompletionMarker}.`,
                ].join("\n");

          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              temperature:
                payload.mode === "suggest" ? 0.35 : payload.mode === "merge" ? 0.3 : 0.4,
              maxOutputTokens:
                payload.mode === "suggest" ? 2200 : payload.mode === "merge" ? 6500 : 7000,
            },
            systemInstruction:
              "You draft polished reusable contract templates with natural legal language and placeholder-friendly structure. Follow the requested output structure exactly and avoid markdown fences.",
          });

          const result = await model.generateContent(requestPrompt);
          const response = await result.response;
          const chunk = stripCodeFences(sanitize(response.text()));

          if (!chunk) {
            break;
          }

          assembledContent = assembledContent ? `${assembledContent}\n\n${chunk}` : chunk;

          if (
            payload.mode === "suggest" &&
            assembledContent.includes(suggestionCompletionMarker)
          ) {
            content = assembledContent;
            break;
          }

          if (
            payload.mode !== "suggest" &&
            assembledContent.includes(templateCompletionMarker)
          ) {
            content = assembledContent;
            break;
          }
        }

        if (!content && assembledContent) {
          content = assembledContent;
        }

        if (content) {
          break;
        }
      } catch (modelError) {
        lastErrorMessage =
          modelError instanceof Error ? modelError.message : "Failed to generate template";
        console.error(`Gemini template generation failed for model ${modelName}`, modelError);
      }
    }

    if (!content) {
      return NextResponse.json(
        { error: lastErrorMessage || "Gemini did not return template content." },
        { status: 500 },
      );
    }

    try {
      return NextResponse.json(
        payload.mode === "suggest"
          ? normalizeSuggestionTextResponse(content)
          : normalizeGenerateTextResponse(content, payload.currentName),
      );
    } catch {
      const parsed = parseJsonResponse(content);
      return NextResponse.json(
        payload.mode === "suggest"
          ? normalizeSuggestionResponse(parsed)
          : normalizeGenerateResponse(parsed, payload.currentName),
      );
    }
  } catch (error) {
    console.error("Template AI generation failed", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate template." },
      { status: 500 },
    );
  }
}
