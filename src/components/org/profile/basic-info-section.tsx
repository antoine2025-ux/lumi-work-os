import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";
import { EditBasicInfoDialog } from "./edit-basic-info-dialog";

interface BasicInfoSectionProps {
  displayName: string;
  displayRole: string;
  email?: string | null;
  positionId?: string;
}

export function BasicInfoSection({
  displayName,
  displayRole,
  email,
  positionId,
}: BasicInfoSectionProps) {
  return (
    <Card className="border-[#1e293b] bg-[#0B1220]">
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-full bg-[#243B7D] text-slate-100 flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-slate-50">{displayName}</h2>
            <p className="text-slate-400">{displayRole}</p>
            {email && (
              <div className="flex items-center gap-2 mt-2 text-sm text-slate-400">
                <Mail className="h-4 w-4" />
                {email}
              </div>
            )}
          </div>
          {positionId && (
            <EditBasicInfoDialog
              positionId={positionId}
              initialName={displayName}
              initialTitle={displayRole}
              email={email}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
