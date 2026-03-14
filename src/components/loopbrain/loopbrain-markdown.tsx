/**
 * LoopbrainMarkdown
 *
 * Shared ReactMarkdown wrapper with Linear/Notion-style rendering for Loopbrain chat messages.
 * Provides polished dark-mode styling for tables, typography, code blocks, and lists.
 */

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

interface LoopbrainMarkdownProps {
  content: string
  size?: "sm" | "base"
  className?: string
}

export function LoopbrainMarkdown({
  content,
  size = "base",
  className,
}: LoopbrainMarkdownProps) {
  const isSm = size === "sm"

  return (
    <div className={cn("loopbrain-markdown", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Tables (GFM support with Linear/Notion styling)
          table: ({ children }) => (
            <div className="w-full overflow-x-auto my-4">
              <table className="w-full text-sm border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-border">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">
              {children}
            </th>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-sm border-b border-border/50">{children}</td>
          ),

          // Typography
          h1: ({ children }) => (
            <h1
              className={cn(
                "font-semibold mt-6 mb-3 first:mt-0",
                isSm ? "text-lg" : "text-xl"
              )}
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              className={cn(
                "font-semibold mt-5 mb-2",
                isSm ? "text-base" : "text-lg"
              )}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              className={cn(
                "font-semibold mt-4 mb-2 text-muted-foreground",
                isSm ? "text-sm" : "text-base"
              )}
            >
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold mt-3 mb-2 text-muted-foreground">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-sm leading-relaxed mb-3 last:mb-0">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-muted-foreground">{children}</em>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="space-y-1.5 my-3 ml-1 [&>li]:pl-1 [&>li]:before:content-['•'] [&>li]:before:text-purple-400 [&>li]:before:mr-2 [&>li]:before:font-bold">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-1.5 my-3 ml-1 list-decimal list-inside">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-sm leading-relaxed">{children}</li>
          ),

          // Code
          code: ({ children, className }) => {
            // Check if this is inside a pre block (code fence)
            const isInline = !className?.includes("language-")
            if (isInline) {
              return (
                <code className="bg-muted/70 px-1.5 py-0.5 rounded-md text-xs font-mono text-purple-400 border border-border/50">
                  {children}
                </code>
              )
            }
            // Block code (inside pre)
            return (
              <code className="text-xs font-mono leading-relaxed">{children}</code>
            )
          },
          pre: ({ children }) => (
            <pre className="bg-muted/50 p-4 rounded-lg border border-border my-4 overflow-x-auto">
              {children}
            </pre>
          ),

          // Blockquote (callouts/tips)
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-purple-500/50 pl-4 py-1 my-3 text-sm text-muted-foreground italic">
              {children}
            </blockquote>
          ),

          // Links
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-purple-400 hover:text-purple-300 underline-offset-2 hover:underline transition-colors"
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              {children}
            </a>
          ),

          // Horizontal rule
          hr: () => <hr className="my-6 border-border/50" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
