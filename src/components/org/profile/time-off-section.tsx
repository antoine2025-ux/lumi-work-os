import { Button } from "@/components/ui/button";
import { Calendar, Clock, Plus } from "lucide-react";
import { format } from "date-fns";
import { PendingRequestRow } from "./pending-request-row";
import type { PendingLeaveRequest } from "@/lib/org/profile/get-time-off";

interface Absence {
  id: string;
  startDate: Date;
  endDate: Date;
  type: string;
  status: string;
  daysCount: number;
}

interface TimeOffSectionProps {
  upcomingAbsences: Absence[];
  pendingRequests?: PendingLeaveRequest[];
  remainingPTO: number;
  usedPTO: number;
  totalPTO: number;
  onRequestTimeOff?: () => void;
}

const REASON_LABELS: Record<string, string> = {
  VACATION: "Vacation",
  SICK_LEAVE: "Sick Leave",
  PARENTAL_LEAVE: "Parental Leave",
  SABBATICAL: "Sabbatical",
  JURY_DUTY: "Jury Duty",
  BEREAVEMENT: "Bereavement",
  TRAINING: "Training",
  OTHER: "Personal",
};

function getTypeDisplay(type: string): string {
  return REASON_LABELS[type] ?? type;
}

export function TimeOffSection({
  upcomingAbsences,
  pendingRequests = [],
  remainingPTO,
  usedPTO,
  totalPTO,
  onRequestTimeOff,
}: TimeOffSectionProps) {
  const usedPct = totalPTO > 0 ? (usedPTO / totalPTO) * 100 : 0;

  return (
    <div className="rounded-lg border border-border/50 bg-card/80 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Time Off & Availability
        </h3>
        {onRequestTimeOff && (
          <Button
            size="sm"
            onClick={onRequestTimeOff}
            className="h-7 text-xs border-slate-600 text-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3 mr-1.5" />
            Request
          </Button>
        )}
      </div>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              PTO Balance
            </span>
            <span className="text-xl font-bold text-foreground">
              {remainingPTO} days
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Used: {usedPTO}</span>
            <span>Total: {totalPTO}/year</span>
          </div>
          <div className="h-2 bg-slate-700/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${Math.min(usedPct, 100)}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {pendingRequests.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pending Requests
              </p>
              <div className="space-y-2">
                {pendingRequests.map((req) => (
                  <PendingRequestRow
                    key={req.id}
                    id={req.id}
                    startDate={req.startDate}
                    endDate={req.endDate}
                    leaveType={req.leaveType}
                    daysCount={req.daysCount}
                    status={req.status}
                  />
                ))}
              </div>
            </>
          )}

          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Upcoming Absences
          </p>

          {upcomingAbsences.length > 0 ? (
            <div className="space-y-1.5">
              {upcomingAbsences.map((absence) => (
                <div key={absence.id} className="py-1.5">
                  <div className="font-medium text-sm text-foreground">
                    {getTypeDisplay(absence.type)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(absence.startDate), "MMM d")} -{" "}
                    {format(new Date(absence.endDate), "MMM d, yyyy")}
                    <span className="ml-1.5">
                      ({absence.daysCount}{" "}
                      {absence.daysCount === 1 ? "day" : "days"})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-muted-foreground">
              <Calendar className="h-6 w-6 mx-auto mb-1.5 opacity-50" />
              <p>No upcoming time off</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
