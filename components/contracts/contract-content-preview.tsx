"use client";

import { useState } from "react";

type ContractContentPreviewProps = {
  html: string | null;
  text: string;
  initialBlocks?: number;
  blocksPerPage?: number;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function textToBlocks(text: string) {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`);
}

function htmlToBlocks(html: string) {
  if (typeof window === "undefined") {
    return [html];
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const container = document.body.firstElementChild;

  if (!container) {
    return [];
  }

  const blocks = Array.from(container.childNodes)
    .map((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        return (node as HTMLElement).outerHTML;
      }

      const content = node.textContent?.trim() || "";
      return content ? `<p>${escapeHtml(content)}</p>` : "";
    })
    .filter(Boolean);

  return blocks.length ? blocks : [html];
}

export function ContractContentPreview({
  html,
  text,
  initialBlocks = 6,
  blocksPerPage = 4,
}: ContractContentPreviewProps) {
  const [visibleCount, setVisibleCount] = useState(initialBlocks);
  const blocks = html ? htmlToBlocks(html) : textToBlocks(text);

  if (!blocks.length) {
    return (
      <div className="mt-8 whitespace-pre-wrap font-[Georgia,Times_New_Roman,serif] text-[15px] leading-8 text-[var(--foreground)]">
        No contract body saved yet.
      </div>
    );
  }

  const visibleBlocks = blocks.slice(0, visibleCount);
  const hasMore = visibleCount < blocks.length;

  return (
    <div className="mt-8">
      <article
        className="font-[Georgia,Times_New_Roman,serif] text-[15px] leading-8 text-[var(--foreground)] [&_h1]:mb-5 [&_h1]:mt-8 [&_h1]:border-b [&_h1]:border-[rgba(15,23,42,0.08)] [&_h1]:pb-3 [&_h1]:text-[2rem] [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:mt-7 [&_h2]:text-[1.35rem] [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-item [&_ol]:mb-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4 [&_p]:text-justify [&_ul]:mb-5 [&_ul]:list-disc [&_ul]:pl-6"
        dangerouslySetInnerHTML={{ __html: visibleBlocks.join("") }}
      />

      {hasMore ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((current) => current + blocksPerPage)}
            className="inline-flex items-center rounded-2xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-soft)]"
          >
            View more
          </button>
        </div>
      ) : null}
    </div>
  );
}
