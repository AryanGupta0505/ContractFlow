"use client";

import { useEffect, useRef } from "react";
import {
  AlignLeft,
  Bold,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Underline,
  Undo2,
} from "lucide-react";

type ContractEditorProps = {
  value: string;
  onChange: (nextValue: string) => void;
  disabled?: boolean;
};

const editorActions = [
  { label: "H1", icon: Heading1, command: "formatBlock", value: "h1" },
  { label: "H2", icon: Heading2, command: "formatBlock", value: "h2" },
  { label: "Body", icon: AlignLeft, command: "formatBlock", value: "p" },
  { label: "Bold", icon: Bold, command: "bold" },
  { label: "Italic", icon: Italic, command: "italic" },
  { label: "Underline", icon: Underline, command: "underline" },
  { label: "Bullets", icon: List, command: "insertUnorderedList" },
  { label: "Numbered", icon: ListOrdered, command: "insertOrderedList" },
  { label: "Undo", icon: Undo2, command: "undo" },
  { label: "Redo", icon: Redo2, command: "redo" },
] as const;

function hasCommandValue(
  action: (typeof editorActions)[number],
): action is (typeof editorActions)[number] & { value: string } {
  return "value" in action;
}

export function htmlToPlainText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(p|div|h1|h2|h3|li|section)>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function textToHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => {
      if (/^\d+\.\s/.test(paragraph)) {
        return `<h2>${paragraph}</h2>`;
      }

      return `<p>${paragraph.replace(/\n/g, "<br />")}</p>`;
    })
    .join("");
}

export function ContractEditor({
  value,
  onChange,
  disabled = false,
}: ContractEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  function runCommand(command: string, commandValue?: string) {
    if (disabled) {
      return;
    }

    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current?.innerHTML || "");
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] bg-[linear-gradient(180deg,#f8fafc_0%,#eef3fb_100%)] p-3">
        {editorActions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.label}
              type="button"
              disabled={disabled}
              onClick={() =>
                runCommand(action.command, hasCommandValue(action) ? action.value : undefined)
              }
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-soft)] disabled:opacity-50"
            >
              <Icon className="h-4 w-4" />
              {action.label}
            </button>
          );
        })}
      </div>

      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        className="min-h-[540px] w-full rounded-b-[28px] bg-[linear-gradient(180deg,#fffdfa_0%,#fff 14%,#fff 100%)] px-8 py-10 font-[Georgia,Times_New_Roman,serif] text-[15px] leading-8 text-[var(--foreground)] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] [&_h1]:mb-4 [&_h1]:mt-8 [&_h1]:border-b [&_h1]:border-[rgba(15,23,42,0.08)] [&_h1]:pb-3 [&_h1]:text-[2rem] [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:mt-7 [&_h2]:text-[1.3rem] [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-item [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4 [&_p]:text-justify [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6"
      />
    </div>
  );
}
