"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pencil } from "lucide-react";
import { EditBasicInfoDialog } from "./edit-basic-info-dialog";
import { EditEmploymentDialog } from "./edit-employment-dialog";

interface ProfileEditButtonProps {
  positionId: string;
  userId: string;
  workspaceId: string;
  displayName: string;
  displayRole: string;
  email?: string | null;
  employmentData: {
    startDate?: Date | null;
    employmentType?: string | null;
    location?: string | null;
    timezone?: string | null;
  };
}

export function ProfileEditButton({
  positionId,
  userId,
  workspaceId,
  displayName,
  displayRole,
  email,
  employmentData,
}: ProfileEditButtonProps) {
  const [basicOpen, setBasicOpen] = useState(false);
  const [employmentOpen, setEmploymentOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="border-slate-600 text-muted-foreground"
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setBasicOpen(true)}>
            Basic info
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEmploymentOpen(true)}>
            Employment
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditBasicInfoDialog
        positionId={positionId}
        initialName={displayName}
        initialTitle={displayRole}
        email={email}
        open={basicOpen}
        onOpenChange={setBasicOpen}
        hideTrigger
      />
      <EditEmploymentDialog
        positionId={positionId}
        userId={userId}
        workspaceId={workspaceId}
        currentData={employmentData}
        open={employmentOpen}
        onOpenChange={setEmploymentOpen}
        hideTrigger
      />
    </>
  );
}
