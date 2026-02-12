"use client";

import { useState } from "react";
import { TimeOffSection } from "./time-off-section";
import { RequestTimeOffDialog } from "./request-time-off-dialog";
import type { TimeOffData } from "@/lib/org/profile/get-time-off";

interface TimeOffSectionWrapperProps {
  timeOff: TimeOffData;
  userId: string;
}

export function TimeOffSectionWrapper({
  timeOff,
  userId,
}: TimeOffSectionWrapperProps) {
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);

  return (
    <>
      <TimeOffSection
        upcomingAbsences={timeOff.upcomingAbsences}
        pendingRequests={timeOff.pendingRequests}
        remainingPTO={timeOff.remainingPTO}
        usedPTO={timeOff.usedPTO}
        totalPTO={timeOff.totalPTO}
        onRequestTimeOff={() => setRequestDialogOpen(true)}
      />
      <RequestTimeOffDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        personId={userId}
      />
    </>
  );
}
