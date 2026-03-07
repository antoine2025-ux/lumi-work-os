import { BookOpen, FileText } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface WikiPage {
  id: string;
  title: string;
  slug: string;
  updatedAt: Date;
  view_count: number | null;
}

interface WikiContributionsSectionProps {
  pages: WikiPage[];
  totalCount: number;
}

export function WikiContributionsSection({
  pages,
  totalCount,
}: WikiContributionsSectionProps) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/80 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Wiki Contributions
        {totalCount > 0 && (
          <span className="font-normal normal-case ml-1">
            ({totalCount} {totalCount === 1 ? "page" : "pages"})
          </span>
        )}
      </h3>
      {pages.length > 0 ? (
        <div className="space-y-1.5">
          {pages.map((page) => (
            <Link
              key={page.id}
              href={`/wiki/${page.slug}`}
              className="flex items-center justify-between gap-2 py-1.5 rounded hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm font-medium truncate text-foreground">
                  {page.title}
                </span>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatDistanceToNow(new Date(page.updatedAt), { addSuffix: true })}
              </span>
            </Link>
          ))}
          {totalCount > 5 && (
            <Link
              href="/wiki"
              className="block text-center text-xs text-muted-foreground hover:text-foreground pt-2 transition-colors"
            >
              View all {totalCount} contributions →
            </Link>
          )}
        </div>
      ) : (
        <div className="text-center py-4 text-xs text-muted-foreground">
          <BookOpen className="h-6 w-6 mx-auto mb-1.5 opacity-50" />
          <p>No wiki pages authored yet</p>
        </div>
      )}
    </div>
  );
}
