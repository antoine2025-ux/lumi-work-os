
import { OrgExportsScreen } from "@/components/org/activity/OrgExportsScreen";

type ExportsSectionProps = {
  workspaceId?: string;
};

/**
 * Org Center → Activity & exports → Exports tab.
 *
 * Wraps the existing OrgExportsScreen inside the new Org Center layout.
 */
export function ExportsSection({ workspaceId }: ExportsSectionProps) {
  if (!workspaceId) {
    return (
      <section className="rounded-2xl border border-border bg-background p-4 text-xs text-muted-foreground">
        No organization selected.
      </section>
    );
  }

  // OrgExportsScreen is a client component, so we can use it directly
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-background p-2 shadow-sm">
      <OrgExportsScreen />
      <p className="px-2 pb-1 text-[11px] text-muted-foreground">
        When no exports have been requested yet, you&apos;ll see an empty list here until the first
        job is created.
      </p>
    </section>
  );
}
