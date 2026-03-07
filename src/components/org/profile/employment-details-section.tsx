import { Calendar, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface EmploymentDetailsSectionProps {
  startDate?: Date | null;
  employmentType?: string | null;
}

export function EmploymentDetailsSection({
  startDate,
  employmentType,
}: EmploymentDetailsSectionProps) {
  const tenure = startDate
    ? formatDistanceToNow(new Date(startDate), { addSuffix: true })
    : null;

  const displayEmploymentType = employmentType
    ? employmentType
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join("-")
    : "Not specified";

  return (
    <div className="flex items-start gap-2 min-w-0">
      <div className="min-w-0 flex-1 space-y-1.5 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
          <div className="min-w-0 overflow-hidden">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Start Date</div>
            <div className="text-sm text-foreground truncate">
              {startDate ? (
                <>
                  {format(new Date(startDate), "MMM d, yyyy")}
                  <span className="ml-1 text-xs text-muted-foreground">({tenure})</span>
                </>
              ) : (
                "Not specified"
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
          <div className="min-w-0 overflow-hidden">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Employment Type</div>
            <div className="text-sm text-foreground truncate">{displayEmploymentType}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
