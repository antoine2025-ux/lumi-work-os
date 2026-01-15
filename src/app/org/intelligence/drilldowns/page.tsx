import { IntelligenceDrilldownsClient } from "@/components/org/IntelligenceDrilldownsClient";

export default function IntelligenceDrilldownsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Drilldowns</h1>
        <p className="text-sm text-muted-foreground">
          Focused views of the most important intelligence signals.
        </p>
      </div>
      <IntelligenceDrilldownsClient />
    </div>
  );
}

