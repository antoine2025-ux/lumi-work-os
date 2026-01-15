"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PersonProfileClient } from "@/components/org/PersonProfileClient";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { cn } from "@/lib/utils";

export function PersonProfilePageClient({ personId }: { personId: string }) {
  const [editButton, setEditButton] = useState<React.ReactNode>(null);
  const searchParams = useSearchParams();
  const focusField = searchParams.get("focus") as "manager" | "team" | "title" | "availability" | null;

  return (
    <>
      <OrgPageHeader
        breadcrumb="ORG / PEOPLE"
        title="Person Profile"
        description="View and manage person details."
        showHelp={false}
        backLink={
          <Link
            href="/org/people"
            className={cn(
              "inline-flex items-center gap-1.5",
              "text-[12px] text-slate-500 hover:text-slate-300",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            )}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to People
          </Link>
        }
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

