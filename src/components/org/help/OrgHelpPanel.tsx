"use client";

import { useState, useEffect, useRef } from "react";
import { OrgHelpArticleContent } from "./OrgHelpArticleContent";

type ArticleId = "getting-started" | "roles" | "structure" | "insights";

type Article = {
  id: ArticleId;
  title: string;
  description: string;
};

const ARTICLES: Article[] = [
  {
    id: "getting-started",
    title: "Getting started with Org Center",
    description: "Learn the basics of managing your organization",
  },
  {
    id: "roles",
    title: "Understanding roles & permissions",
    description: "How roles work and what each role can do",
  },
  {
    id: "structure",
    title: "How to structure your organization",
    description: "Teams, departments, and roles explained",
  },
  {
    id: "insights",
    title: "Understanding Org Insights",
    description: "What insights tell you about your organization",
  },
];

type OrgHelpPanelProps = {
  open: boolean;
  onClose: () => void;
};

export function OrgHelpPanel({ open, onClose }: OrgHelpPanelProps) {
  const [view, setView] = useState<"list" | "article">("list");
  const [selectedArticle, setSelectedArticle] = useState<ArticleId | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Reset to list view when drawer closes
  useEffect(() => {
    if (!open) {
      setView("list");
      setSelectedArticle(null);
    }
  }, [open]);

  // Focus management: focus appropriate element when view changes
  useEffect(() => {
    if (open) {
      // Small delay to ensure drawer is rendered
      const timer = setTimeout(() => {
        if (view === "list" && closeButtonRef.current) {
          closeButtonRef.current.focus();
        } else if (view === "article" && backButtonRef.current) {
          // Focus the back button when article view opens
          backButtonRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, view]);

  // Keyboard handling: ESC key closes drawer
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (view === "article") {
          // If in article view, go back to list first
          setView("list");
          setSelectedArticle(null);
        } else {
          // If in list view, close drawer
          onClose();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, view, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const handleArticleClick = (articleId: ArticleId) => {
    setSelectedArticle(articleId);
    setView("article");
  };

  const handleBackToList = () => {
    setView("list");
    setSelectedArticle(null);
  };

  const currentArticle = selectedArticle ? ARTICLES.find((a) => a.id === selectedArticle) : null;

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end bg-black/40 transition-opacity duration-150 ${
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={view === "list" ? "help-dialog-title" : "article-title"}
    >
      <div
        ref={drawerRef}
        className={`h-full w-full max-w-md border-l border-border bg-background shadow-xl transition-all duration-150 flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 border-b border-border bg-background p-6 pb-4">
          {view === "list" ? (
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-semibold text-foreground" id="help-dialog-title">
                  Learn more
                </h2>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Read documentation to better understand roles, structure, and org insights.
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-slate-700 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                aria-label="Close org help"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <button
                ref={backButtonRef}
                type="button"
                onClick={handleBackToList}
                className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-slate-700 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                aria-label="Back to Learn more"
              >
                ← All articles
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-slate-700 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                aria-label="Close org help"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto p-6 pt-4 text-[13px] text-foreground">
          {view === "list" ? (
            <ul className="space-y-3 text-[12px]">
              {ARTICLES.map((article) => (
                <li key={article.id}>
                  <button
                    type="button"
                    onClick={() => handleArticleClick(article.id)}
                    className="w-full text-left rounded-lg border border-border bg-background/60 px-4 py-3 text-blue-400 transition-colors hover:bg-card hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  >
                    <div className="font-medium">{article.title}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{article.description}</div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            currentArticle && (
              <div>
                <h1 className="mb-4 text-2xl font-semibold text-foreground" id="article-title">
                  {currentArticle.title}
                </h1>
                <div aria-labelledby="article-title">
                  <OrgHelpArticleContent articleId={currentArticle.id} />
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

