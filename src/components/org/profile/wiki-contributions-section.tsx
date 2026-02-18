import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, FileText } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

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
    <Card className="border-[#1e293b] bg-[#0B1220]">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-slate-50">
          <BookOpen className="h-5 w-5" />
          Wiki Contributions
          {totalCount > 0 && (
            <span className="ml-auto text-sm font-normal text-slate-500">
              {totalCount} {totalCount === 1 ? "page" : "pages"}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pages.length > 0 ? (
          <div className="space-y-2">
            {pages.map((page) => (
              <Link
                key={page.id}
                href={`/wiki/${page.slug}`}
                className="flex items-center justify-between p-3 rounded-lg border border-[#1e293b] bg-[#020617] hover:bg-[#0f172a] transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-slate-400" />
                  <span className="text-sm font-medium truncate text-slate-200 group-hover:text-slate-100">
                    {page.title}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3 text-xs text-slate-500">
                  {page.view_count != null && page.view_count > 0 && (
                    <span>{page.view_count} views</span>
                  )}
                  <span>{format(new Date(page.updatedAt), "MMM d, yyyy")}</span>
                </div>
              </Link>
            ))}
            {totalCount > 5 && (
              <Link
                href="/wiki"
                className="block text-center text-sm text-slate-500 hover:text-slate-300 pt-2 transition-colors"
              >
                View all {totalCount} contributions →
              </Link>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-slate-500">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No wiki pages authored yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
