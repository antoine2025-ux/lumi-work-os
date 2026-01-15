"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AddTeamDrawer } from "@/components/org/AddTeamDrawer";
import { personDisplayName } from "@/lib/org/displayName";

type Team = {
  id: string;
  name: string;
  owner?: {
    id: string;
    fullName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
};

type PersonOption = {
  id: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

type DepartmentOption = {
  id: string;
  name: string;
};

export function TeamsSectionClient(props: {
  teams: Team[];
  departmentId: string;
  people: PersonOption[];
  departments: DepartmentOption[];
}) {
  const [addTeamOpen, setAddTeamOpen] = React.useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Teams</h2>
        <Button size="sm" onClick={() => setAddTeamOpen(true)}>
          Add team
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {props.teams.length === 0 && (
          <div className="text-sm text-muted-foreground">
            No teams yet. Add the first team to start structuring this department.
          </div>
        )}

        {props.teams.map((team) => (
          <div
            key={team.id}
            className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
          >
            <div>
              <div className="font-medium text-slate-100">{team.name}</div>
              <div className="text-sm text-muted-foreground">
                Owner: {personDisplayName(team.owner) ?? "Unassigned"}
              </div>
            </div>

            <Link
              href={`/org/structure/teams/${team.id}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Manage →
            </Link>
          </div>
        ))}
      </div>

      <AddTeamDrawer
        open={addTeamOpen}
        onOpenChange={setAddTeamOpen}
        people={props.people}
        departments={props.departments}
        defaultDepartmentId={props.departmentId}
      />
    </>
  );
}

