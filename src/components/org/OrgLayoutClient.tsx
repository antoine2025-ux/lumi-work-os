"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { OrgSidebar } from "@/components/org/OrgSidebar";
import { OrgDebugPanel } from "@/components/org/OrgDebugPanel";
import { OrgPageTransition } from "@/components/org/OrgPageTransition";

// Lazy load Header to reduce initial bundle size and improve LCP
// Disable SSR to prevent Radix UI hydration mismatches (random ID generation)
const Header = dynamic(() => import("@/components/layout/header").then(mod => ({ default: mod.Header })), {
  ssr: false,
});

type OrgLayoutClientProps = {
  children: ReactNode;
  beta?: boolean;
  showHeader?: boolean;
};

export function OrgLayoutClient({ children, beta = false, showHeader = true }: OrgLayoutClientProps) {
  const pathname = usePathname();
  
  return (
    <div className="flex min-h-screen flex-col bg-[#020617]">
      {/* Global Loopwell header: logo + blue pill tabs + avatar */}
      {/* Only render if showHeader is true (default) - skip when nested in dashboard layout */}
      {showHeader && <Header />}

      {/* Org shell: sidebar + content */}
      <div className="flex flex-1">
        <OrgSidebar beta={beta} />
        <main className="relative flex-1 overflow-y-auto bg-[#020617]">
          {/* Smooth page transitions - doesn't block data load */}
          <OrgPageTransition key={pathname}>
            {children}
          </OrgPageTransition>
          {/* Dev-only debug HUD: only appears when ?debugOrg=1 or similar */}
          <Suspense fallback={null}>
            <OrgDebugPanel />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

