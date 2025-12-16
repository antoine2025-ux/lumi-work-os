"use client";

import { OrgExportsScreen } from "@/app/(dashboard)/org/[orgId]/activity/exports/page";

type ExportsSectionProps = {
  orgId?: string;
};

/**
 * Org Center → Activity & exports → Exports tab.
 *
 * Wraps the existing OrgExportsScreen inside the new Org Center layout.
 */
export function ExportsSection({ orgId }: ExportsSectionProps) {
  if (!orgId) {
    return (
      <section className="rounded-2xl border border-[#111827] bg-[#020617] p-4 text-xs text-slate-400">
        No organization selected.
      </section>
    );
  }

  // OrgExportsScreen is a client component, so we can use it directly
  return (
    <section className="space-y-3 rounded-2xl border border-[#111827] bg-[#020617] p-2 shadow-sm">
      <OrgExportsScreen orgId={orgId} />
      <p className="px-2 pb-1 text-[11px] text-slate-500">
        When no exports have been requested yet, you&apos;ll see an empty list here until the first
        job is created.
      </p>
    </section>
  );
}
