/**
 * Workspace-Scoped Org Intelligence Page
 */

import { IntelligencePageClient } from "@/components/org/IntelligencePageClient";

export const dynamic = "force-dynamic";

export default function WorkspaceOrgIntelligencePage() {
  return (
    <div className="space-y-6 px-10 pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">Intelligence</h1>
        <p className="text-sm text-slate-400">
          Derived insights from Org data. No manual inputs.
        </p>
      </div>
      <IntelligencePageClient />
    </div>
  );
}
