"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { personDisplayName } from "@/lib/org/displayName";

type Department = {
  id: string;
  name: string;
} | null;

type TeamPageClientProps = {
  team: {
    id: string;
    name: string;
    department: Department;
    owner?: {
      id: string;
      fullName: string | null;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    } | null;
  };
  departments: Array<{ id: string; name: string }>;
};

export function TeamPageClient({ team, departments }: TeamPageClientProps) {
  const router = useRouter();
  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState<string>(
    team.department?.id || "__none__"
  );
  const [isUpdating, setIsUpdating] = React.useState(false);

  const handleDepartmentChange = async (newDepartmentId: string) => {
    setSelectedDepartmentId(newDepartmentId);
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/org/teams/${team.id}/department`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          departmentId: newDepartmentId === "__none__" ? null : newDepartmentId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to update department");
      }

      // Refresh the page to update the data
      router.refresh();
    } catch (error: any) {
      console.error("Failed to update department:", error);
      // Revert the selection on error
      setSelectedDepartmentId(team.department?.id || "__none__");
      alert(error.message || "Failed to update department. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="px-10 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 space-y-4 lg:col-span-1">
          <div>
            <div className="text-sm text-muted-foreground">Team owner</div>
            <div className="mt-1 font-medium text-slate-100">
              {personDisplayName(team.owner) ?? "Unassigned"}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-2">Department</div>
            <Select
              value={selectedDepartmentId}
              onValueChange={handleDepartmentChange}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue placeholder="No department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None (Unassigned)</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {team.department && selectedDepartmentId === team.department.id && (
              <div className="mt-2">
                <Link
                  href={`/org/structure/departments/${team.department.id}`}
                  className="text-sm text-muted-foreground hover:underline"
                >
                  View department →
                </Link>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">
            Team Details
          </h2>
        </Card>
      </div>
    </div>
  );
}

