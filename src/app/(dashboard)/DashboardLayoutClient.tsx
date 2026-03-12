"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { LoopbrainAssistantProvider } from "@/components/loopbrain/assistant-context";
import { TaskSidebar } from "@/components/tasks/task-sidebar";
import { GlobalSidebar } from "@/components/layout/GlobalSidebar";
import { LoopbrainAssistantLauncher } from "@/components/loopbrain/assistant-launcher";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { LoopbrainMode } from "@/lib/loopbrain/orchestrator-types";
import { useUserStatusContext } from "@/providers/user-status-provider";
// PHASE C2: Removed redirect-handler import - middleware handles redirects

// Lazy load Header to reduce initial bundle size and improve LCP
const Header = dynamic(() => import("@/components/layout/header").then(mod => ({ default: mod.Header })), {
  ssr: true, // Keep SSR for header since it's above the fold
});

export function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const _router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Use centralized user status context - no separate API call needed
  const { workspaceId, isFirstTime } = useUserStatusContext();
  
  // Derive Loopbrain mode from pathname for context-aware assistance
  const loopbrainMode: LoopbrainMode = pathname?.includes("/spaces")
    ? "spaces"
    : pathname?.includes("/org")
      ? "org"
      : pathname?.includes("/wiki")
        ? "spaces"
        : "dashboard";

  // This effect is kept for logout flag handling only
  useEffect(() => {
    if (status === "loading") return;
    
    // Check for logout flag - if set, redirect to login immediately and clear flag
    const logoutFlag = sessionStorage.getItem('__logout_flag__');
    if (logoutFlag === 'true') {
      // Don't redirect from People/Directory page (workspace-agnostic check)
      if (pathname.includes('/org/people') || pathname.includes('/org/directory')) {
        return;
      }
      sessionStorage.removeItem('__logout_flag__');
      window.location.href = '/login';
    }
  }, [status, pathname]);

  // Show minimal loading state - don't block entire page render
  // Render header and skeleton immediately for better perceived performance
  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 min-h-screen p-8">
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="h-8 w-64 bg-slate-900 rounded animate-pulse" />
            <div className="h-32 w-full bg-slate-900 rounded animate-pulse" />
          </div>
        </main>
      </div>
    );
  }

  if (!session) {
    return null;
  }
  
  // FIX 1: Removed workspaceId null guard that caused blank pages
  // The parent DashboardLayout already ensures workspaceId exists before rendering this component
  // UserStatusProvider provides workspaceId from session JWT, avoiding cold-start API failures

  const isOrgRoute = pathname?.includes("/org") ?? false;
  const isWorkspaceSettingsRoute =
    pathname?.includes("/settings") === true &&
    pathname?.includes("/projects/") !== true;
  const showSpacesSidebar = !isOrgRoute && !isWorkspaceSettingsRoute;

  return (
    <LoopbrainAssistantProvider>
      <div className="flex h-screen flex-col bg-background">
        <Header onMenuToggle={() => setMobileMenuOpen(true)} />
        <div className="flex flex-1 min-h-0 overflow-hidden pt-12">
          {showSpacesSidebar && (
            <aside className="hidden lg:flex">
              <GlobalSidebar />
            </aside>
          )}
          <main className="flex flex-1 flex-col min-h-0 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
      
      {showSpacesSidebar && (
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <GlobalSidebar />
          </SheetContent>
        </Sheet>
      )}
      
      <TaskSidebar />
      <LoopbrainAssistantLauncher mode={loopbrainMode} />
    </LoopbrainAssistantProvider>
  );
}

