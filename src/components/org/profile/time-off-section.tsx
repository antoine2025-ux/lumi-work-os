import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="border-[#1e293b] bg-[#0B1220]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-slate-50">
            <Calendar className="h-5 w-5" />
            Time Off & Availability
          </CardTitle>
          {onRequestTimeOff && (
            <Button
              size="sm"
              onClick={onRequestTimeOff}
              className="border-slate-600 text-slate-300"
            >
              <Plus className="h-4 w-4 mr-2" />
              Request Time Off
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 rounded-lg bg-[#020617] border border-[#1e293b]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-200">
              PTO Balance
            </span>
            <span className="text-2xl font-bold text-slate-50">
              {remainingPTO} days
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Used: {usedPTO} days</span>
            <span>Total: {totalPTO} days/year</span>
          </div>
          <div className="mt-2 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#243B7D] transition-all"
              style={{ width: `${Math.min(usedPct, 100)}%` }}
            />
          </div>
        </div>

        <div className="space-y-3">
          {pendingRequests.length > 0 && (
            <>
              <div className="text-sm font-medium flex items-center gap-2 text-slate-200">
                <Clock className="h-4 w-4" />
                Pending Requests
              </div>
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

          <div className="text-sm font-medium flex items-center gap-2 text-slate-200">
            <Clock className="h-4 w-4" />
            Upcoming Absences
          </div>

          {upcomingAbsences.length > 0 ? (
            <div className="space-y-2">
              {upcomingAbsences.map((absence) => (
                <div
                  key={absence.id}
                  className="p-3 rounded-lg border border-[#1e293b] bg-[#020617]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-slate-200 mb-1">
                        {getTypeDisplay(absence.type)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {format(new Date(absence.startDate), "MMM d")} -{" "}
                        {format(new Date(absence.endDate), "MMM d, yyyy")}
                        <span className="ml-2">
                          ({absence.daysCount}{" "}
                          {absence.daysCount === 1 ? "day" : "days"})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-sm text-slate-500">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No upcoming time off scheduled</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
