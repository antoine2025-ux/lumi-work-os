"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Link,
  Quote,
  Minus,
} from "lucide-react";

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onContentChange?: (content: string) => void;
}

export function MarkdownToolbar({ textareaRef, onContentChange }: MarkdownToolbarProps) {
  const insertAtCursor = (before: string, after: string = "", placeholder: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Save current scroll position and selection
    const scrollTop = textarea.scrollTop;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = textarea.value;
    const selectedText = currentValue.substring(start, end);
    const textToInsert = selectedText || placeholder;

    const newText =
      currentValue.substring(0, start) +
      before +
      textToInsert +
      after +
      currentValue.substring(end);

    // Calculate new cursor position
    const newCursorPos = start + before.length + textToInsert.length + after.length;

    // Update React state - this will trigger re-render with new value
    if (onContentChange) {
      onContentChange(newText);
    }

    // After React updates, restore cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.scrollTop = scrollTop;
      }
    }, 0);
  };

  const formatBold = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.blur(); // Remove focus from button
    insertAtCursor("**", "**", "bold text");
  };

  const formatItalic = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.blur();
    insertAtCursor("*", "*", "italic text");
  };

  const formatHeading = (level: number) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.blur();
    const prefix = "#".repeat(level) + " ";
    insertAtCursor(prefix, "", `Heading ${level}`);
  };

  const formatCode = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.blur();
    insertAtCursor("`", "`", "code");
  };

  const formatCodeBlock = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.blur();
    insertAtCursor("```\n", "\n```", "code block");
  };

  const formatLink = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.blur();
    insertAtCursor("[", "](url)", "link text");
  };

  const formatList = (ordered: boolean = false) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.blur();
    if (ordered) {
      insertAtCursor("1. ", "", "List item");
    } else {
      insertAtCursor("- ", "", "List item");
    }
  };

  const formatQuote = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.blur();
    insertAtCursor("> ", "", "Quote");
  };

  const formatHr = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.blur();
    insertAtCursor("\n---\n", "");
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-600 bg-slate-800 rounded-t-lg">
      <div className="flex items-center gap-1 border-r border-slate-600 pr-2 mr-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={formatBold}
          className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-700"
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={formatItalic}
          className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-700"
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 border-r border-slate-600 pr-2 mr-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={formatHeading(1)}
          className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-700"
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={formatHeading(2)}
          className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-700"
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={formatHeading(3)}
          className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-700"
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 border-r border-slate-600 pr-2 mr-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={formatList(false)}
          className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-700"
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={formatList(true)}
          className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-700"
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 border-r border-slate-600 pr-2 mr-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={formatCode}
          className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-700"
          title="Inline Code"
        >
          <Code className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={formatCodeBlock}
          className="h-8 px-2 text-slate-300 hover:text-white hover:bg-slate-700"
          title="Code Block"
        >
          <Code className="w-4 h-4 mr-1" />
          Block
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={formatLink}
          className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-700"
          title="Link"
        >
          <Link className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={formatQuote}
          className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-700"
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={formatHr}
          className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-700"
          title="Horizontal Rule"
        >
          <Minus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

