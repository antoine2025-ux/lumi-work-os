"use client";

import { cn } from "@/lib/utils";

type QuickQuestion = {
  id: string;
  label: string;
  onClick: () => void;
};

type QuickQuestionChipsProps = {
  questions: QuickQuestion[];
  className?: string;
};

/**
 * Quick question chips for actionable shortcuts
 * Applies filters/sort instantly when clicked
 */
export function QuickQuestionChips({ questions, className }: QuickQuestionChipsProps) {
  if (questions.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {questions.map((question) => (
        <button
          key={question.id}
          type="button"
          onClick={question.onClick}
          className={cn(
            "inline-flex items-center",
            "rounded-full",
            "px-3 py-1.5",
            "text-xs font-medium",
            "bg-slate-800/50",
            "text-slate-300",
            "hover:bg-slate-800/70",
            "hover:text-slate-200",
            "transition-colors",
            "border border-slate-700/50"
          )}
        >
          {question.label}
        </button>
      ))}
    </div>
  );
}

