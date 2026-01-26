"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { PersonProfileClient } from "@/components/org/PersonProfileClient";
import { OrgPageHeader, resolveBackAction } from "@/components/org/OrgPageHeader";

export function PersonProfilePageClient({ personId }: { personId: string }) {
  const [editButton, setEditButton] = useState<React.ReactNode>(null);
  const searchParams = useSearchParams();
  const focusField = searchParams.get("focus") as "manager" | "team" | "title" | "availability" | null;
  const fromParam = searchParams.get("from");

  // Resolve back action based on from param or fallback to People
  const resolvedBackAction = fromParam ? resolveBackAction(fromParam) : null;
  const defaultBackAction = {
    label: "Back to People",
    href: "/org/people",
  };
  const backAction = resolvedBackAction || defaultBackAction;

  return (
    <>
      <OrgPageHeader
        title="Person Profile"
        description="View and manage person details."
        showHelp={false}
        backAction={backAction}
        actions={editButton}
      />
      <div className="px-10 pb-10">
        <PersonProfileClient 
          personId={personId} 
          onEditButtonRender={setEditButton}
          initialFocusField={focusField || undefined}
        />
      </div>
    </>
  );
}

