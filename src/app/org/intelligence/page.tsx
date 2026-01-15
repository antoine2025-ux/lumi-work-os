import { IntelligencePageClient } from "@/components/org/IntelligencePageClient";

export default function OrgIntelligencePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Intelligence</h1>
        <p className="text-sm text-muted-foreground">
          Derived insights from Org data. No manual inputs.
        </p>
      </div>
      <IntelligencePageClient />
    </div>
  );
}

