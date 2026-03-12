import Link from "next/link";

type Manager = { name: string; userId: string; title: string | null };
type Report = { name: string; userId: string; title: string | null };

interface ReportsToSectionProps {
  workspaceSlug: string;
  manager: Manager | null;
  directReports: Report[];
}

export function ReportsToSection({
  workspaceSlug,
  manager,
  directReports,
}: ReportsToSectionProps) {
  return (
    <div className="space-y-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Reports to
            </p>
            {manager ? (
              <Link
                href={`/w/${workspaceSlug}/org/people/${manager.userId}`}
                className="flex items-center gap-2 rounded p-1.5 hover:bg-muted/30 transition-colors min-w-0"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[10px] font-medium text-foreground">
                  {manager.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-foreground truncate">{manager.name}</p>
                  {manager.title && (
                    <p className="text-xs text-muted-foreground truncate">{manager.title}</p>
                  )}
                </div>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground py-0.5">No manager assigned</p>
            )}
          </div>

          {directReports.length > 0 && (
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Direct reports ({directReports.length})
              </p>
              <div className="space-y-1">
                {directReports.slice(0, 2).map((report) => (
                  <Link
                    key={report.userId}
                    href={`/w/${workspaceSlug}/org/people/${report.userId}`}
                    className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-muted/30 transition-colors min-w-0"
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[9px] font-medium text-foreground">
                      {report.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-xs text-foreground truncate flex-1 min-w-0">{report.name}</p>
                  </Link>
                ))}
                {directReports.length > 2 && (
                  <p className="text-xs text-muted-foreground pl-1.5 py-0.5">
                    +{directReports.length - 2} more
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
  );
}
