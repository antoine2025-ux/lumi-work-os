"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  content: string;
}

// Check if content is HTML (contains HTML tags)
function isHTML(str: string): boolean {
  const htmlRegex = /<\/?[a-z][\s\S]*>/i;
  return htmlRegex.test(str);
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  // If content appears to be HTML, render it as HTML
  // Otherwise render as markdown
  if (isHTML(content) && !content.includes('```') && !content.startsWith('#')) {
    return (
      <div 
        className="prose prose-invert prose-lg max-w-none
          prose-headings:text-white prose-headings:font-bold prose-headings:mt-12 prose-headings:mb-6 prose-headings:leading-tight
          prose-h1:text-4xl prose-h1:mt-0 prose-h1:mb-8
          prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6
          prose-h3:text-2xl prose-h3:mt-10 prose-h3:mb-4
          prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-10 prose-p:text-lg prose-p:font-normal
          prose-strong:text-white prose-strong:font-semibold
          prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-a:font-medium
          prose-ul:text-slate-300 prose-ul:mb-8 prose-ul:ml-6
          prose-ol:text-slate-300 prose-ol:mb-8 prose-ol:ml-6
          prose-li:text-slate-300 prose-li:mb-3 prose-li:leading-relaxed
          prose-code:text-slate-200 prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
          prose-pre:bg-slate-800 prose-pre:mb-8 prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
          prose-blockquote:text-slate-400 prose-blockquote:border-l-4 prose-blockquote:border-slate-600 prose-blockquote:pl-6 prose-blockquote:mb-8 prose-blockquote:italic
          prose-hr:border-slate-700 prose-hr:my-12"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  // Render as markdown
  return (
    <div className="prose prose-invert prose-lg max-w-none
      prose-headings:text-white prose-headings:font-bold prose-headings:mt-12 prose-headings:mb-6 prose-headings:leading-tight
      prose-h1:text-4xl prose-h1:mt-0 prose-h1:mb-8
      prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6
      prose-h3:text-2xl prose-h3:mt-10 prose-h3:mb-4
      prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-10 prose-p:text-lg prose-p:font-normal
      prose-strong:text-white prose-strong:font-semibold
      prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-a:font-medium
      prose-ul:text-slate-300 prose-ul:mb-8 prose-ul:ml-6
      prose-ol:text-slate-300 prose-ol:mb-8 prose-ol:ml-6
      prose-li:text-slate-300 prose-li:mb-3 prose-li:leading-relaxed
      prose-code:text-slate-200 prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
      prose-pre:bg-slate-800 prose-pre:mb-8 prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
      prose-blockquote:text-slate-400 prose-blockquote:border-l-4 prose-blockquote:border-slate-600 prose-blockquote:pl-6 prose-blockquote:mb-8 prose-blockquote:italic
      prose-hr:border-slate-700 prose-hr:my-12">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="text-slate-300 leading-relaxed mb-10 text-lg font-normal">{children}</p>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

