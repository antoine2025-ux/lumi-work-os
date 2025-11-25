"use client";

import { useState, useEffect } from "react";
import { RichTextEditor } from "@/components/wiki/rich-text-editor";
import TurndownService from "turndown";
import { marked } from "marked";

interface MarkdownWysiwygEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

// Initialize Turndown service for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "*",
  strongDelimiter: "**",
  linkStyle: "inlined",
  linkReferenceStyle: "full",
});

// Configure Turndown to handle code blocks properly
turndownService.addRule("codeBlock", {
  filter: function (node) {
    return (
      node.nodeName === "PRE" &&
      node.firstChild &&
      node.firstChild.nodeName === "CODE"
    );
  },
  replacement: function (content, node) {
    const codeNode = node as HTMLElement;
    const codeElement = codeNode.querySelector("code");
    const language = codeElement?.className?.replace("language-", "") || "";
    const code = codeElement?.textContent || "";
    return `\n\`\`\`${language}\n${code}\n\`\`\`\n\n`;
  },
});

// Add rule for paragraphs to ensure proper spacing
turndownService.addRule("paragraph", {
  filter: "p",
  replacement: function (content) {
    return content.trim() ? `\n\n${content.trim()}\n\n` : "\n\n";
  },
});

// Add rule for line breaks
turndownService.addRule("lineBreak", {
  filter: "br",
  replacement: function () {
    return "\n";
  },
});

export function MarkdownWysiwygEditor({
  content,
  onChange,
  placeholder = "Start writing...",
}: MarkdownWysiwygEditorProps) {
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastContent, setLastContent] = useState<string>("");

  // Convert markdown to HTML when content prop changes (from outside)
  useEffect(() => {
    // Only update if content actually changed from outside (not from our own onChange)
    if (content !== lastContent) {
      try {
        const html = marked(content || "", { breaks: true, gfm: true });
        setHtmlContent(html);
        setLastContent(content);
        setIsInitialized(true);
      } catch (error) {
        console.error("Error converting markdown to HTML:", error);
        setHtmlContent(content || "");
        setLastContent(content);
        setIsInitialized(true);
      }
    }
  }, [content, lastContent]);

  // Handle HTML content changes from the editor
  const handleHtmlChange = (html: string) => {
    setHtmlContent(html);
    
    // Convert HTML back to markdown
    try {
      const markdown = turndownService.turndown(html);
      // Only update if markdown actually changed
      if (markdown !== lastContent) {
        setLastContent(markdown);
        onChange(markdown);
      }
    } catch (error) {
      console.error("Error converting HTML to markdown:", error);
      // Fallback: try to extract text content
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;
      const textContent = tempDiv.textContent || "";
      if (textContent !== lastContent) {
        setLastContent(textContent);
        onChange(textContent);
      }
    }
  };

  return (
    <div className="border border-slate-600 rounded-lg bg-slate-900 overflow-hidden">
      <div className="prose prose-invert prose-lg max-w-none dark">
        <RichTextEditor
          content={htmlContent}
          onChange={handleHtmlChange}
          placeholder={placeholder}
          editable={true}
          showToolbar={true}
          className="min-h-[600px] prose prose-invert prose-lg max-w-none
            prose-headings:text-white prose-headings:font-bold prose-headings:mt-8 prose-headings:mb-4
            prose-p:text-slate-300 prose-p:mb-6 prose-p:leading-relaxed prose-p:text-lg
            prose-strong:text-white prose-strong:font-semibold
            prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
            prose-code:text-slate-200 prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
            prose-pre:bg-slate-800 prose-pre:text-slate-100 prose-pre:p-4 prose-pre:rounded-lg prose-pre:mb-8
            prose-blockquote:text-slate-400 prose-blockquote:border-l-4 prose-blockquote:border-slate-600 prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:mb-8
            prose-ul:text-slate-300 prose-ol:text-slate-300 prose-li:text-slate-300 prose-li:mb-3"
        />
      </div>
    </div>
  );
}

