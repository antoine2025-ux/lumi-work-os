"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Plus } from "lucide-react";
import { PositionForm } from "@/components/org/position-form-simple";

interface Team {
  id: string;
  name: string;
  departmentId?: string;
  department?: { id: string; name: string };
}

interface Position {
  id: string;
  title: string | null;
  level: number;
  teamId: string | null;
  teamName: string | null;
}

interface PositionsClientProps {
  positions: Position[];
  teams: Team[];
  workspaceId: string;
}

export function PositionsClient({ positions, teams, workspaceId }: PositionsClientProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleSuccess() {
    setDialogOpen(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div />
        <Button
          className="bg-[#243B7D] hover:bg-[#1e3a6e] text-white"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Position
        </Button>
      </div>

      {positions.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {positions.map((pos) => (
            <Card key={pos.id} className="border-[#1e293b] bg-[#0B1220]">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-slate-50 text-base">
                  <span className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    {pos.title ?? "Untitled"}
                  </span>
                  <Badge variant="outline" className="border-slate-600 text-slate-400">
                    L{pos.level}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">
                  {pos.teamName ?? "No team assigned"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-[#1e293b] bg-[#0B1220]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Briefcase className="h-12 w-12 text-slate-500 mb-4" />
            <p className="text-slate-500 mb-4">No positions defined yet</p>
            <Button
              className="bg-[#243B7D] hover:bg-[#1e3a6e] text-white"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Position
            </Button>
          </CardContent>
        </Card>
      )}

      <PositionForm
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={handleSuccess}
        workspaceId={workspaceId}
        teams={teams}
      />
    </>
  );
}
