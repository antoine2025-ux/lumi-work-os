// src/app/org/dev/page.tsx

import Link from "next/link";

export default function OrgDevHome() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-semibold">Org — Developer Tools</h1>

      <p className="text-muted-foreground text-sm">
        Internal developer-only pages for inspecting org data & Loopbrain readiness.
      </p>

      <div className="space-y-3">
        <div>
          <Link
            href="/org/dev/loopbrain-status"
            className="text-primary underline text-sm"
          >
            → Loopbrain Org Status (QA Panel)
          </Link>
        </div>

        {/* More dev tools will appear here later */}
      </div>
    </main>
  );
}

