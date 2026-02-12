import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, MapPin, Briefcase } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { EditEmploymentDialog } from "./edit-employment-dialog";

interface EmploymentDetailsSectionProps {
  positionId?: string;
  userId?: string;
  workspaceId?: string;
  startDate?: Date | null;
  employmentType?: string | null;
  location?: string | null;
  timezone?: string | null;
  canEdit?: boolean;
}

export function EmploymentDetailsSection({
  positionId,
  userId,
  workspaceId,
  startDate,
  employmentType,
  location,
  timezone,
  canEdit = false,
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
    <Card className="border-[#1e293b] bg-[#0B1220]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-slate-50">
            <Briefcase className="h-5 w-5" />
            Employment Details
          </CardTitle>
          {canEdit && positionId && userId && workspaceId && (
            <EditEmploymentDialog
              positionId={positionId}
              userId={userId}
              workspaceId={workspaceId}
              currentData={{ startDate, employmentType, location, timezone }}
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-200">Start Date</div>
            <div className="text-sm text-slate-400">
              {startDate ? (
                <>
                  {format(new Date(startDate), "MMM d, yyyy")}
                  <span className="ml-2 text-xs text-slate-500">({tenure})</span>
                </>
              ) : (
                "Not specified"
              )}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Clock className="h-4 w-4 text-muted-foreground mt-1" />
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-200">
              Employment Type
            </div>
            <div className="text-sm text-slate-400">
              {displayEmploymentType}
            </div>
          </div>
        </div>

        {(location || timezone) && (
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-200">Location</div>
              <div className="text-sm text-slate-400">
                {location || "Remote"}
                {timezone && (
                  <span className="ml-2 text-xs text-slate-500">
                    ({timezone})
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
