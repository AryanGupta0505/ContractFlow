import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

import { getContractAccessContext } from "@/lib/contracts/access";
import { contractGenerationTypes, type GenerateContractInput } from "@/lib/contracts/types";

const maxFieldLength = 4000;
const maxDraftLength = 60000;
const contractCompletionMarker = "END OF CONTRACT";
const reviewCompletionMarker = "END OF REVIEW NOTES";
const geminiModelCandidates = [
  process.env.GEMINI_MODEL?.trim(),
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-flash-latest",
  "gemini-1.5-flash",
].filter(Boolean) as string[];

function getGenerationConfig(mode: GenerateContractInput["mode"]) {
  if (mode === "suggest") {
    return {
      temperature: 0.35,
      maxOutputTokens: 5000,
    };
  }

  if (mode === "merge" || mode === "improve") {
    return {
      temperature: 0.3,
      maxOutputTokens: 7000,
    };
  }

  return {
    temperature: 0.4,
    maxOutputTokens: 6000,
  };
}

function sanitize(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeGeneratedContractText(text: string) {
  return text
    .replace(/```[\w-]*\n?/g, "")
    .replace(/```/g, "")
    .replace(/^title:\s*/i, "")
    .replace(/^contract title:\s*/i, "")
    .replace(/^parties:\s*/i, "")
    .replace(/^purpose:\s*/i, "")
    .replace(/^description:\s*/i, "")
    .replace(/^\s+|\s+$/g, "");
}

function stripCompletionMarkers(text: string) {
  return text
    .replace(new RegExp(`\\n*${contractCompletionMarker}\\s*$`, "i"), "")
    .replace(new RegExp(`\\n*${reviewCompletionMarker}\\s*$`, "i"), "")
    .trim();
}

function isShortSingleLineHeading(block: string) {
  const normalized = block.replace(/\s+/g, " ").trim();

  return (
    !normalized.includes("\n") &&
    normalized.length > 0 &&
    normalized.length <= 120 &&
    !/[.!?]$/.test(normalized)
  );
}

function textToContractHtml(text: string) {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks
    .map((block, index) => {
      if (
        index === 0 &&
        (block === block.toUpperCase() ||
          /agreement|contract|nda|employment|services/i.test(block))
      ) {
        return `<h1>${escapeHtml(block)}</h1>`;
      }

      if (/^\d+(\.\d+)*\.\s/.test(block) && isShortSingleLineHeading(block)) {
        return `<h2>${escapeHtml(block)}</h2>`;
      }

      if (
        /^(schedule|exhibit|annex)\s+[a-z0-9]/i.test(block) &&
        isShortSingleLineHeading(block)
      ) {
        return `<h2>${escapeHtml(block)}</h2>`;
      }

      if (/^in witness whereof/i.test(block) && isShortSingleLineHeading(block)) {
        return `<h2>${escapeHtml(block)}</h2>`;
      }

      if (/^(whereas|now therefore)/i.test(block)) {
        return `<p><strong>${escapeHtml(block)}</strong></p>`;
      }

      return `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`;
    })
    .join("");
}

function buildPrompt(input: GenerateContractInput) {
  const clauses = sanitize(input.additionalClauses);
  const paymentTerms = sanitize(input.paymentTerms);
  const currentDraft = sanitize(input.currentDraft);
  const mergeInstructions = sanitize(input.mergeInstructions);
  const isImproveMode = input.mode === "improve" && Boolean(currentDraft);
  const isSuggestMode = input.mode === "suggest";
  const isMergeMode = input.mode === "merge" && Boolean(currentDraft);

  return [
    isSuggestMode
      ? "Review the draft details and provide concise legal drafting suggestions."
      : isMergeMode
        ? "Integrate the supplied drafting suggestions into the current contract draft and return the full revised contract."
      : isImproveMode
        ? "Improve and expand the following legal-style contract draft in plain English."
        : "Generate a formal, comprehensive legal-style contract in plain English.",
    "Use a professional tone suitable for a business contract.",
    isSuggestMode
      ? "Return a short, practical set of drafting suggestions with section headings and recommended clauses. Do not write the full contract."
      : "Return only the contract body with no commentary, no markdown fences, and no prefatory notes.",
    isSuggestMode
      ? "Structure it with: Missing sections, risk notes, stronger clause ideas, and drafting improvements."
      : "Make the contract complete and detailed, not a short summary or memo.",
    isSuggestMode
      ? "Do not rewrite the draft. Provide practical advice that can be merged into the document."
      : "Do not output field labels such as Title:, Parties:, Purpose:, or Signature Block:. Write final contract language ready to save.",
    isSuggestMode
      ? `Finish the response with a final line exactly: ${reviewCompletionMarker}`
      : `Finish the response with a final line exactly: ${contractCompletionMarker}`,
    isSuggestMode
      ? ""
      : "Begin with the formal agreement title on its own line, followed by an opening recital paragraph in contract prose.",
    isMergeMode || isImproveMode
      ? "Return the COMPLETE revised contract from the title through the final signature block. Do not omit unchanged sections, do not summarize existing clauses, and do not stop after showing only the edited parts."
      : "",
    isMergeMode
      ? "Preserve all existing sections unless a suggestion clearly changes them. If a suggestion affects one clause, still reproduce the entire agreement with that clause updated in place."
      : "",
    isSuggestMode
      ? ""
      : "Structure it with:",
    isSuggestMode ? "" : "- A title",
    isSuggestMode ? "" : "- Introductory parties section",
    isSuggestMode ? "" : "- Recitals / purpose",
    isSuggestMode ? "" : "- Numbered clauses",
    isSuggestMode ? "" : "- Section headings in formal legal style",
    isSuggestMode ? "" : "- Definitions where useful",
    isSuggestMode ? "" : "- Commercial obligations and service/payment mechanics where relevant",
    isSuggestMode ? "" : "- Term and termination",
    isSuggestMode ? "" : "- Confidentiality where relevant",
    isSuggestMode ? "" : "- Liability / indemnity where relevant",
    isSuggestMode ? "" : "- Notices, assignment, amendment, and boilerplate where relevant",
    isSuggestMode ? "" : "- Governing law and dispute resolution",
    isSuggestMode ? "" : "- Signature block",
    isSuggestMode ? "" : "- Enough detail to resemble a real business contract for counsel review",
    "",
    `Contract title: ${input.title}`,
    `Contract type: ${input.type}`,
    `Party A: ${input.partyA}`,
    `Party B: ${input.partyB}`,
    `Purpose: ${input.description}`,
    `Duration: ${input.duration}`,
    paymentTerms ? `Payment terms: ${paymentTerms}` : "Payment terms: Not specified.",
    clauses ? `Additional clauses to include: ${clauses}` : "Additional clauses: None specified.",
    isImproveMode
      ? `Current draft to improve and complete:\n${currentDraft}`
      : "",
    isMergeMode
      ? `Current draft into which suggestions must be merged in the correct places:\n${currentDraft}`
      : "",
    isMergeMode && mergeInstructions
      ? `Suggestions to integrate into the draft:\n${mergeInstructions}`
      : "",
    isSuggestMode && currentDraft
      ? `Current manual draft for review:\n${currentDraft}`
      : "",
  ].join("\n");
}

export async function POST(request: Request) {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!context.permissions.canCreate && !context.permissions.canEdit) {
    return NextResponse.json(
      { error: "You do not have permission to use AI contract drafting tools." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Partial<GenerateContractInput>;
  const payload: GenerateContractInput = {
    title: sanitize(body.title),
    type: body.type as GenerateContractInput["type"],
    partyA: sanitize(body.partyA),
    partyB: sanitize(body.partyB),
    description: sanitize(body.description),
    duration: sanitize(body.duration),
    paymentTerms: sanitize(body.paymentTerms),
    additionalClauses: sanitize(body.additionalClauses),
    currentDraft: sanitize(body.currentDraft),
    mergeInstructions: sanitize(body.mergeInstructions),
    mode:
      body.mode === "improve"
        ? "improve"
        : body.mode === "merge"
          ? "merge"
        : body.mode === "suggest"
          ? "suggest"
          : "generate",
  };

  if (
    !payload.title ||
    !payload.partyA ||
    !payload.partyB ||
    !payload.description ||
    !payload.duration
  ) {
    return NextResponse.json(
      { error: "Title, parties, description, and duration are required." },
      { status: 400 },
    );
  }

  if (!contractGenerationTypes.includes(payload.type)) {
    return NextResponse.json({ error: "Please select a valid contract type." }, { status: 400 });
  }

  const oversizedField = [
    payload.title,
    payload.partyA,
    payload.partyB,
    payload.description,
    payload.duration,
    payload.paymentTerms || "",
    payload.additionalClauses || "",
  ].find((value) => value.length > maxFieldLength);

  if (oversizedField) {
    return NextResponse.json(
      { error: `Each field must be ${maxFieldLength} characters or fewer.` },
      { status: 400 },
    );
  }

  if ((payload.currentDraft || "").length > maxDraftLength) {
    return NextResponse.json(
      { error: `Current draft must be ${maxDraftLength} characters or fewer.` },
      { status: 400 },
    );
  }

  if ((payload.mergeInstructions || "").length > maxDraftLength) {
    return NextResponse.json(
      { error: `Merge instructions must be ${maxDraftLength} characters or fewer.` },
      { status: 400 },
    );
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Gemini API key not configured" },
      { status: 500 },
    );
  }

  const prompt = buildPrompt(payload);
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    let content = "";
    let lastErrorMessage = "";
    let receivedCompleteContract = false;

    for (const modelName of geminiModelCandidates) {
      try {
        let assembledContent = "";
        let generationConfig = getGenerationConfig(payload.mode);

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
                    ? `Continue the review notes from exactly where they stopped. Do not repeat earlier text. Finish with ${reviewCompletionMarker}.`
                    : `Continue the contract from exactly where it stopped. Do not repeat earlier text. Return only the remaining contract language and finish with ${contractCompletionMarker}.`,
                ].join("\n");

          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig,
            systemInstruction:
              "You draft polished commercial contracts. Produce formal ready-to-save contract language with substantive clauses and realistic legal prose. Avoid templates, placeholders, bullet-point outlines, markdown fences, and commentary. For merge or improve tasks, always return the full contract, not a partial edit excerpt.",
          });

          const result = await model.generateContent(requestPrompt);
          const response = await result.response;
          const chunk = normalizeGeneratedContractText(sanitize(response.text()));

          if (!chunk) {
            break;
          }

          assembledContent = assembledContent
            ? `${assembledContent}\n\n${chunk}`
            : chunk;

          if (
            payload.mode === "suggest" &&
            assembledContent.includes(reviewCompletionMarker)
          ) {
            content = stripCompletionMarkers(assembledContent);
            break;
          }

          if (
            payload.mode !== "suggest" &&
            assembledContent.includes(contractCompletionMarker)
          ) {
            content = stripCompletionMarkers(assembledContent);
            receivedCompleteContract = true;
            break;
          }

          if (attempt < 2) {
            generationConfig = {
              ...generationConfig,
              maxOutputTokens: Math.min(generationConfig.maxOutputTokens + 1500, 9000),
            };
          }
        }

        if (!content && assembledContent && payload.mode === "suggest") {
          content = stripCompletionMarkers(assembledContent);
        }

        if (content) {
          break;
        }
      } catch (modelError) {
        lastErrorMessage =
          modelError instanceof Error ? modelError.message : "Failed to generate contract";
        console.error(`Gemini contract generation failed for model ${modelName}`, modelError);
      }
    }

    if (!content) {
      return NextResponse.json(
        {
          error:
            lastErrorMessage || "Gemini did not return any contract content.",
        },
        { status: 500 },
      );
    }

    if (payload.mode === "suggest" && /[:(,\-]$/.test(content)) {
      return NextResponse.json(
        {
          error:
            "AI returned incomplete review notes. Please try again.",
        },
        { status: 502 },
      );
    }

    if (
      payload.mode !== "suggest" &&
      !receivedCompleteContract
    ) {
      return NextResponse.json(
        {
          error:
            "AI returned an incomplete contract draft. Please try again.",
        },
        { status: 502 },
      );
    }

    if (
      (payload.mode === "merge" || payload.mode === "improve") &&
      payload.currentDraft &&
      content.length < Math.max(1200, Math.floor(payload.currentDraft.length * 0.65))
    ) {
      return NextResponse.json(
        {
          error:
            "AI returned an incomplete revised contract. Please try again with a shorter draft or more targeted suggestions.",
        },
        { status: 502 },
      );
    }

    const summary =
      payload.mode === "suggest"
        ? `AI drafting suggestions for a ${payload.type} agreement between ${payload.partyA} and ${payload.partyB}.`
        : payload.mode === "merge"
          ? `Merged draft with AI revisions for a ${payload.type} agreement between ${payload.partyA} and ${payload.partyB}.`
          : `${payload.type} draft between ${payload.partyA} and ${payload.partyB} for ${payload.duration}.`;

    return NextResponse.json({
      content,
      html: textToContractHtml(content),
      summary,
      promptPreview: prompt,
      metadata: [payload.type.toLowerCase(), "ai-generated"],
      parties: [payload.partyA, payload.partyB],
    });
  } catch (error) {
    console.error("Gemini contract generation failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate contract",
      },
      { status: 500 },
    );
  }
}
