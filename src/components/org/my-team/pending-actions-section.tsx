"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Check, X, AlertCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

interface LeaveRequestWithPerson {
  id: string;
  startDate: Date;
  endDate: Date;
  leaveType: string;
  notes: string | null;
  status: string;
  personId: string;
  person: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface PendingActionsSectionProps {
  requests: LeaveRequestWithPerson[];
  /** Workspace slug from URL - ensures approve/deny API uses correct workspace */
  workspaceSlug?: string;
}

const LEAVE_TYPE_DISPLAY: Record<string, string> = {
  VACATION: "Vacation",
  SICK: "Sick Leave",
  PERSONAL: "Personal",
  PARENTAL: "Parental Leave",
  UNPAID: "Unpaid",
};

export function PendingActionsSection({ requests, workspaceSlug }: PendingActionsSectionProps) {
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [denialReason, setDenialReason] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const handleAction = async (requestId: string, action: "approve" | "deny") => {
    if (action === "deny" && !denialReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for denying this request",
        variant: "destructive",
      });
      return;
    }

    setProcessing(requestId);

    try {
      const params = workspaceSlug ? `?workspaceSlug=${encodeURIComponent(workspaceSlug)}` : "";
      const response = await fetch(`/api/org/leave-requests/${requestId}/approve${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          denialReason: action === "deny" ? denialReason : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Action failed");
      }

      toast({
        title: action === "approve" ? "Request Approved" : "Request Denied",
        description: `Time off request has been ${action === "approve" ? "approved" : "denied"}`,
      });

      setExpandedRequest(null);
      setDenialReason("");
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to process request",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const getTypeDisplay = (type: string) =>
    LEAVE_TYPE_DISPLAY[type] ?? type;

  if (requests.length === 0) {
    return (
      <Card className="border-[#1e293b] bg-[#0B1220]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-50">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Pending Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-slate-400">No pending actions</p>
            <p className="text-sm mt-1">Time off requests will appear here for approval</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#1e293b] bg-[#0B1220]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-slate-50">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Pending Actions
          </span>
          <Badge variant="secondary" className="bg-slate-800 text-slate-300">
            {requests.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.map((request) => {
          const days =
            differenceInDays(new Date(request.endDate), new Date(request.startDate)) + 1;
          const isExpanded = expandedRequest === request.id;

          return (
            <div
              key={request.id}
              className="border border-[#1e293b] rounded-lg p-4 space-y-3 bg-[#020617] hover:bg-[#0B1220] transition-colors"
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={request.person.image ?? undefined} />
                  <AvatarFallback className="bg-[#243B7D] text-slate-100">
                    {request.person.name?.charAt(0) ?? request.person.email.charAt(0)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-slate-200">
                        {request.person.name ?? request.person.email}
                      </div>
                      <div className="text-sm text-slate-500">
                        {request.person.email}
                      </div>
                    </div>
                    <Badge variant="outline" className="border-slate-600 text-slate-400">
                      {getTypeDisplay(request.leaveType)}
                    </Badge>
                  </div>

                  <div className="mt-2 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-500" />
                      <span>
                        {format(new Date(request.startDate), "MMM d")} -{" "}
                        {format(new Date(request.endDate), "MMM d, yyyy")}
                      </span>
                      <Badge variant="secondary" className="text-xs bg-slate-800 text-slate-300">
                        {days} {days === 1 ? "day" : "days"}
                      </Badge>
                    </div>
                  </div>

                  {request.notes && (
                    <div className="mt-2 text-sm text-slate-500">
                      <span className="font-medium">Note:</span> {request.notes}
                    </div>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="space-y-2 pt-2 border-t border-[#1e293b]">
                  <label className="text-sm font-medium text-slate-300">
                    Reason for Denial
                  </label>
                  <Textarea
                    placeholder="Please explain why this request is being denied..."
                    value={denialReason}
                    onChange={(e) => setDenialReason(e.target.value)}
                    rows={3}
                    className="resize-none bg-[#020617] border-[#1e293b] text-slate-200"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => handleAction(request.id, "approve")}
                  disabled={!!processing}
                  className="flex-1 border-slate-600 bg-[#243B7D] hover:bg-[#1e3a6f] text-slate-100"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </Button>

                {isExpanded ? (
                  <>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleAction(request.id, "deny")}
                      disabled={!!processing}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Confirm Denial
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setExpandedRequest(null);
                        setDenialReason("");
                      }}
                      disabled={!!processing}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setExpandedRequest(request.id)}
                    disabled={!!processing}
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Deny
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
