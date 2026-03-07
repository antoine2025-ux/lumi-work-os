"use client";

import { useState } from "react";

type Props = {
  shouldShow: boolean;
};

export function OrgWelcomeOverlay({ shouldShow }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (!shouldShow || dismissed) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 transition-opacity duration-150 ${
        shouldShow && !dismissed ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Org Center"
    >
      <div
        className={`w-full max-w-md rounded-2xl border border-border bg-background p-6 text-[13px] text-foreground shadow-xl transition-all duration-150 ${
          shouldShow && !dismissed ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <h2 className="text-[16px] font-semibold text-foreground">
          Welcome to your Org Center
        </h2>
        <p className="mt-2 text-[12px] text-muted-foreground">
          This is your organization&apos;s command center. From here you can manage people, structure, roles, and insights.
        </p>

        <ul className="mt-4 space-y-2 text-[12px] text-muted-foreground">
          <li>• Add or invite people to your workspace</li>
          <li>• Define teams, departments, and roles</li>
          <li>• Explore insights about your organization</li>
        </ul>

        <button
          onClick={async () => {
            try {
              await fetch("/api/org/onboarding/complete", { method: "POST" });
              setDismissed(true);
            } catch (error) {
              console.error("[OrgWelcomeOverlay] Failed to complete onboarding:", error);
              // Still dismiss on error to avoid blocking user
              setDismissed(true);
            }
          }}
          className="focus-ring mt-5 w-full rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-blue-500"
          aria-label="Get started with Org Center"
        >
          Let&apos;s get started
        </button>
      </div>
    </div>
  );
}

