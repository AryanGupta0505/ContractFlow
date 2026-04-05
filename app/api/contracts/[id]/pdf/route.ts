import { jsPDF } from "jspdf";
import { NextResponse } from "next/server";

import { getContractAccessContext } from "@/lib/contracts/access";
import { getContractById } from "@/lib/contracts/service";

type ContractRecord = Awaited<ReturnType<typeof getContractById>>;
type ContentBlock =
  | {
      kind: "heading";
      text: string;
      level: number;
    }
  | {
      kind: "paragraph";
      text: string;
    }
  | {
      kind: "list";
      ordered: boolean;
      items: string[];
    };

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 54;
const contentWidth = pageWidth - margin * 2;
const footerY = pageHeight - 32;
const contentTop = 64;
const contentBottom = pageHeight - 80;

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function normalizeParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function stripInlineHtml(text: string) {
  return decodeHtmlEntities(
    text
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?(strong|b|em|i|u|span)[^>]*>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+\n/g, "\n")
      .replace(/\n\s+/g, "\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim(),
  );
}

function parseHtmlContentBlocks(html: string | null | undefined) {
  if (!html?.trim()) {
    return [] as ContentBlock[];
  }

  const normalizedHtml = html
    .replace(/\r/g, "")
    .replace(/<\/p>\s*<p[^>]*>/gi, "</p>\n<p>")
    .replace(/<\/div>\s*<div[^>]*>/gi, "</div>\n<div>")
    .replace(/<\/h([1-6])>\s*<h/gi, (_, level) => `</h${level}>\n<h`);

  const matches =
    normalizedHtml.match(/<(h[1-6]|p|div|ol|ul)[^>]*>[\s\S]*?<\/\1>/gi) ?? [];

  return matches
    .map((block): ContentBlock | null => {
      const headingMatch = block.match(/^<h([1-6])[^>]*>([\s\S]*?)<\/h[1-6]>$/i);

      if (headingMatch) {
        const text = stripInlineHtml(headingMatch[2]);
        return text
          ? {
              kind: "heading",
              text,
              level: Number(headingMatch[1]),
            }
          : null;
      }

      const listMatch = block.match(/^<(ol|ul)[^>]*>([\s\S]*?)<\/\1>$/i);

      if (listMatch) {
        const items = Array.from(listMatch[2].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
          .map((match) => stripInlineHtml(match[1]))
          .filter(Boolean);

        return items.length
          ? {
              kind: "list",
              ordered: listMatch[1].toLowerCase() === "ol",
              items,
            }
          : null;
      }

      const paragraphMatch = block.match(/^<(p|div)[^>]*>([\s\S]*?)<\/\1>$/i);

      if (paragraphMatch) {
        const text = stripInlineHtml(paragraphMatch[2]);
        return text
          ? {
              kind: "paragraph",
              text,
            }
          : null;
      }

      return null;
    })
    .filter((block): block is ContentBlock => Boolean(block));
}

function cleanRenderedBlocks(contract: ContractRecord) {
  if (!contract) {
    return [];
  }

  const htmlBlocks = parseHtmlContentBlocks(contract.contentHtml);

  if (!htmlBlocks.length) {
    return normalizeParagraphs(contract.content || "No content available.").map((text) => ({
      kind: isHeading(text) ? "heading" : "paragraph",
      text,
      ...(isHeading(text) ? { level: 2 } : {}),
    })) as ContentBlock[];
  }

  const normalizedTitle = contract.title.trim().toLowerCase();

  return htmlBlocks.filter((block, index) => {
    if (index === 0 && block.kind !== "list" && block.text.trim().toLowerCase() === normalizedTitle) {
      return false;
    }

    return !(block.kind === "heading" && /^executive summary$/i.test(block.text));
  });
}

function isHeading(text: string) {
  return /^\d+[\.\)]\s/.test(text) || /^[A-Z][A-Z\s,&/-]{5,}$/.test(text.trim());
}

function createPdfShell(pdf: jsPDF, organizationName: string) {
  const totalPages = pdf.getNumberOfPages();

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    pdf.setPage(pageNumber);

    pdf.setDrawColor(178, 169, 154);
    pdf.setLineWidth(1);
    pdf.rect(30, 30, pageWidth - 60, pageHeight - 60);

    pdf.setDrawColor(196, 188, 176);
    pdf.line(margin, 44, pageWidth - margin, 44);
    pdf.line(margin, pageHeight - 48, pageWidth - margin, pageHeight - 48);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(104, 96, 86);
    pdf.text(organizationName.toUpperCase(), margin, 22);

    pdf.setFont("times", "normal");
    pdf.setFontSize(9);
    pdf.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, footerY, {
      align: "right",
    });
  }
}

function drawWrappedText(pdf: jsPDF, text: string, y: number, options?: {
  font?: "times" | "helvetica" | "courier";
  style?: "normal" | "bold" | "italic" | "bolditalic";
  size?: number;
  color?: [number, number, number];
  lineHeight?: number;
  indent?: number;
}) {
  const font = options?.font ?? "times";
  const style = options?.style ?? "normal";
  const size = options?.size ?? 11;
  const color = options?.color ?? [32, 35, 40];
  const lineHeight = options?.lineHeight ?? 15;
  const indent = options?.indent ?? 0;
  const lines = pdf.splitTextToSize(text, contentWidth - indent) as string[];

  pdf.setFont(font, style);
  pdf.setFontSize(size);
  pdf.setTextColor(color[0], color[1], color[2]);
  pdf.text(lines, margin + indent, y, { baseline: "top" });

  return y + lines.length * lineHeight;
}

function ensurePage(pdf: jsPDF, y: number, requiredHeight: number) {
  if (y + requiredHeight <= contentBottom) {
    return y;
  }

  pdf.addPage("a4", "portrait");
  return contentTop;
}

function addPage(pdf: jsPDF) {
  pdf.addPage("a4", "portrait");
  return contentTop;
}

function drawTextLines(
  pdf: jsPDF,
  lines: string[],
  y: number,
  options?: {
    font?: "times" | "helvetica" | "courier";
    style?: "normal" | "bold" | "italic" | "bolditalic";
    size?: number;
    color?: [number, number, number];
    lineHeight?: number;
    x?: number;
  },
) {
  const font = options?.font ?? "times";
  const style = options?.style ?? "normal";
  const size = options?.size ?? 11;
  const color = options?.color ?? [32, 35, 40];
  const lineHeight = options?.lineHeight ?? 15;
  const x = options?.x ?? margin;

  pdf.setFont(font, style);
  pdf.setFontSize(size);
  pdf.setTextColor(color[0], color[1], color[2]);

  let cursorY = y;

  for (const line of lines) {
    if (cursorY + lineHeight > contentBottom) {
      cursorY = addPage(pdf);
      pdf.setFont(font, style);
      pdf.setFontSize(size);
      pdf.setTextColor(color[0], color[1], color[2]);
    }

    pdf.text(line, x, cursorY, { baseline: "top" });
    cursorY += lineHeight;
  }

  return cursorY;
}

function drawParagraphBlock(
  pdf: jsPDF,
  text: string,
  y: number,
  options?: {
    indent?: number;
    size?: number;
    lineHeight?: number;
    color?: [number, number, number];
  },
) {
  const indent = options?.indent ?? 0;
  const size = options?.size ?? 11;
  const lineHeight = options?.lineHeight ?? 16;
  const color = options?.color ?? [34, 36, 42];
  const lines = pdf.splitTextToSize(text, contentWidth - indent) as string[];

  return drawTextLines(pdf, lines, y, {
    font: "times",
    style: "normal",
    size,
    color,
    lineHeight,
    x: margin + indent,
  });
}

function drawHeadingBlock(
  pdf: jsPDF,
  text: string,
  y: number,
  level: number,
) {
  const size = level <= 2 ? 12 : 11;
  const lineHeight = size >= 12 ? 24 : 20;
  const lines = pdf.splitTextToSize(text, contentWidth) as string[];
  let cursorY = ensurePage(pdf, y, lines.length * lineHeight + 18);

  pdf.setDrawColor(214, 218, 226);
  pdf.line(margin, cursorY - 4, pageWidth - margin, cursorY - 4);
  cursorY += 8;

  pdf.setFont("times", "bold");
  pdf.setFontSize(size);
  pdf.setTextColor(18, 22, 28);

  for (const line of lines) {
    if (cursorY + lineHeight > contentBottom) {
      cursorY = addPage(pdf);
      pdf.setDrawColor(214, 218, 226);
      pdf.line(margin, cursorY - 4, pageWidth - margin, cursorY - 4);
      cursorY += 8;
      pdf.setFont("times", "bold");
      pdf.setFontSize(size);
      pdf.setTextColor(18, 22, 28);
    }

    pdf.text(line, margin, cursorY, { baseline: "top", maxWidth: contentWidth });
    cursorY += lineHeight;
  }

  return cursorY;
}

function drawListBlock(
  pdf: jsPDF,
  items: string[],
  ordered: boolean,
  y: number,
) {
  let cursorY = y;

  for (const [index, item] of items.entries()) {
    const bullet = ordered ? `${index + 1}.` : "\u2022";
    const itemLines = pdf.splitTextToSize(item, contentWidth - 28) as string[];
    cursorY = ensurePage(pdf, cursorY, 20);

    pdf.setFont("times", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(34, 36, 42);

    if (cursorY + 16 > contentBottom) {
      cursorY = addPage(pdf);
      pdf.setFont("times", "normal");
      pdf.setFontSize(11);
      pdf.setTextColor(34, 36, 42);
    }

    pdf.text(bullet, margin + 8, cursorY + 1, { baseline: "top" });
    cursorY = drawTextLines(pdf, itemLines, cursorY, {
      font: "times",
      style: "normal",
      size: 11,
      color: [34, 36, 42],
      lineHeight: 16,
      x: margin + 24,
    });
    cursorY += 4;
  }

  return cursorY;
}

function drawSignaturePartyBlock(
  pdf: jsPDF,
  input: {
    label: string;
    partyName: string;
    x: number;
    y: number;
    width: number;
  },
) {
  const { label, partyName, x, y, width } = input;
  const lineGap = 22;

  pdf.setFont("times", "bold");
  pdf.setFontSize(10.5);
  pdf.setTextColor(28, 30, 36);
  pdf.text(label.toUpperCase(), x, y);

  const firstLineY = y + 34;
  const secondLineY = firstLineY + lineGap;
  const thirdLineY = secondLineY + lineGap;

  pdf.setDrawColor(110, 110, 110);
  pdf.setLineWidth(1);
  pdf.line(x, firstLineY, x + width, firstLineY);
  pdf.line(x, secondLineY, x + width, secondLineY);
  pdf.line(x, thirdLineY, x + width, thirdLineY);

  pdf.setFont("times", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(92, 92, 92);
  const partyNameLines = pdf.splitTextToSize(`Name: ${partyName}`, width - 4) as string[];
  pdf.text(partyNameLines, x, firstLineY - 6, { baseline: "bottom" });
  pdf.text("Title / Capacity", x, secondLineY - 6);
  pdf.text("Date", x, thirdLineY - 6);

  return thirdLineY + 24;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const contract = await getContractById(context.organizationId, id);

  if (!contract) {
    return NextResponse.json({ error: "Contract not found." }, { status: 404 });
  }

  const pdf = new jsPDF({
    unit: "pt",
    format: "a4",
    orientation: "portrait",
  });

  const sections = cleanRenderedBlocks(contract);
  let y = 64;

  pdf.setFont("times", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(22, 25, 30);
  const titleLines = pdf.splitTextToSize(contract.title.toUpperCase(), contentWidth - 36) as string[];
  const metaText = `Date: ${formatLongDate(contract.createdAt)}   |   Status: ${contract.status}`;
  const metaLines = pdf.splitTextToSize(metaText, contentWidth - 36) as string[];
  const titleTop = y + 44;
  const titleLineHeight = 24;
  const metaTop = titleTop + titleLines.length * titleLineHeight + 10;
  const titleBlockHeight = metaTop - y + metaLines.length * 14 + 18;

  pdf.setFillColor(248, 245, 238);
  pdf.roundedRect(margin, y, contentWidth, titleBlockHeight, 12, 12, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(117, 102, 83);
  pdf.text("CONFIDENTIAL LEGAL AGREEMENT", margin + 18, y + 20);

  pdf.setFont("times", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(22, 25, 30);
  pdf.text(titleLines, margin + 18, titleTop, { baseline: "top" });

  pdf.setFont("times", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(74, 76, 82);
  pdf.text(metaLines, margin + 18, metaTop, { baseline: "top" });

  y += titleBlockHeight + 26;

  y = drawWrappedText(
    pdf,
    `This Agreement is entered into by and between ${
      contract.parties.join(" and ") || "the parties identified in the contract record"
    }, and is maintained within ${context.organizationName} by ${contract.createdBy.name}.`,
    y,
    {
      font: "times",
      style: "italic",
      size: 11,
      color: [58, 60, 66],
      lineHeight: 16,
    },
  );

  y += 16;

  for (const section of sections) {
    if (section.kind === "heading") {
      y = drawHeadingBlock(pdf, section.text, y, section.level);
      y += 8;
      continue;
    }

    if (section.kind === "list") {
      y = drawListBlock(pdf, section.items, section.ordered, y);
      y += 8;
      continue;
    }

    y = drawParagraphBlock(pdf, section.text.replace(/\n/g, " "), y, {
      size: 11,
      lineHeight: 16,
      color: [34, 36, 42],
      indent: 8,
    });
    y += 10;
  }

  const signatureParties =
    contract.parties.length >= 2
      ? contract.parties.slice(0, 2)
      : [context.organizationName, contract.createdBy.name];
  y = ensurePage(pdf, y, 190);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(101, 90, 76);
  pdf.text("AUTHORIZED SIGNATURES", margin, y + 8);

  const signatureStartY = y + 34;
  const signatureWidth = contentWidth;
  let signatureCursorY = drawSignaturePartyBlock(pdf, {
    label: "For the Company",
    partyName: signatureParties[0] || context.organizationName,
    x: margin,
    y: signatureStartY,
    width: signatureWidth,
  });

  signatureCursorY += 14;

  drawSignaturePartyBlock(pdf, {
    label: "For the Counterparty",
    partyName: signatureParties[1] || contract.createdBy.name,
    x: margin,
    y: signatureCursorY,
    width: signatureWidth,
  });

  createPdfShell(pdf, context.organizationName);

  const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${contract.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "contract"}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
