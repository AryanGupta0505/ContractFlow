"use client";

import { Copy, Download, ExternalLink, Share2 } from "lucide-react";
import { useState } from "react";

export function ContractShareActions({ contractId }: { contractId: string }) {
  const [shareState, setShareState] = useState<"idle" | "shared" | "copied">("idle");
  const pdfPath = `/api/contracts/${contractId}/pdf`;

  async function handleShare() {
    const absoluteUrl = `${window.location.origin}${pdfPath}`;

    try {
      const response = await fetch(pdfPath);

      if (!response.ok) {
        throw new Error("Unable to load contract PDF.");
      }

      const pdfBlob = await response.blob();
      const file = new File([pdfBlob], `contract-${contractId}.pdf`, {
        type: "application/pdf",
      });

      if (
        navigator.share &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: "Contract PDF",
          text: "Sharing contract PDF and link.",
          url: absoluteUrl,
          files: [file],
        });
        setShareState("shared");
      } else if (navigator.share) {
        await navigator.share({
          title: "Contract PDF",
          text: "Sharing contract link.",
          url: absoluteUrl,
        });
        setShareState("shared");
      } else {
        await navigator.clipboard.writeText(absoluteUrl);
        setShareState("copied");
      }
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "AbortError"
      ) {
        return;
      }

      await navigator.clipboard.writeText(absoluteUrl);
      setShareState("copied");
    }

    window.setTimeout(() => setShareState("idle"), 1800);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={pdfPath}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
      >
        <ExternalLink className="h-4 w-4" />
        Open PDF
      </a>
      <a
        href={pdfPath}
        download
        className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
      >
        <Download className="h-4 w-4" />
        Download PDF
      </a>
      <button
        type="button"
        onClick={() => void handleShare()}
        className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-medium text-white hover:bg-[var(--primary-strong)]"
      >
        {shareState === "copied" ? <Copy className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
        {shareState === "shared"
          ? "Shared"
          : shareState === "copied"
            ? "Link copied"
            : "Share contract"}
      </button>
    </div>
  );
}
