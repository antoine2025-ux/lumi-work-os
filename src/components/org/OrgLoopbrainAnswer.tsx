"use client";

import React from "react";

type OrgLoopbrainAnswerProps = {
  answer: string | null;
  loading: boolean;
  error: string | null;
  className?: string;
};

/**
 * OrgLoopbrainAnswer
 *
 * - Shows loading/error states consistently
 * - Splits main answer from referenced-context footer (if present)
 * - Keeps layout minimal but readable
 */
export function OrgLoopbrainAnswer({
  answer,
  loading,
  error,
  className,
}: OrgLoopbrainAnswerProps) {
  if (loading) {
    return (
      <div
        className={
          "flex min-h-[80px] items-center justify-center rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground " +
          (className ?? "")
        }
      >
        Loopbrain is thinking about your org…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={
          "rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive " +
          (className ?? "")
        }
      >
        {error}
      </div>
    );
  }

  if (!answer) {
    return (
      <div
        className={
          "rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground " +
          (className ?? "")
        }
      >
        Ask Loopbrain a question about your org to see insights here.
      </div>
    );
  }

  // Split answer into main body + referenced-context footer (if present)
  const footerIndex = answer.lastIndexOf("\n---");
  let mainBody = answer;
  let footer = "";

  if (footerIndex !== -1) {
    mainBody = answer.slice(0, footerIndex).trim();
    footer = answer.slice(footerIndex).trim();
  }

  return (
    <div
      className={
        "flex max-h-[260px] flex-col gap-2 overflow-auto rounded-md border bg-muted/20 p-3 text-xs leading-relaxed " +
        (className ?? "")
      }
    >
      <div className="whitespace-pre-wrap text-foreground">
        {mainBody || "No answer content."}
      </div>

      {footer && (
        <div className="mt-1 border-t pt-2 text-[11px] text-muted-foreground">
          <div className="mb-1 font-medium uppercase tracking-wide">
            Referenced context
          </div>
          <pre className="max-h-[120px] overflow-auto whitespace-pre-wrap">
            {footer}
          </pre>
        </div>
      )}
    </div>
  );
}

