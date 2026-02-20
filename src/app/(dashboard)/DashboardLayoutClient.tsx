"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { LoopbrainAssistantProvider } from "@/components/loopbrain/assistant-context";
import { TaskSidebar } from "@/components/tasks/task-sidebar";
import { Sidebar } from "@/components/layout/sidebar";
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
  const router = useRouter();
  const pathname = usePathname();
  const [isFirstTime, setIsFirstTime] = useState(false);
  
  // Determine if we should show the Spaces sidebar
  // Only show on Spaces routes, not on Org or Goals/OKRs pages
  const showSpacesSidebar = pathname?.includes('/spaces') || pathname?.includes('/wiki');
  
  // Use React Query for user status - automatic caching and no sequential delays
  const { data: userStatus, isLoading: isLoadingWorkspace } = useQuery({
    queryKey: ['user-status'],
    queryFn: async () => {
      const response = await fetch('/api/auth/user-status');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch user status');
      }
      return response.json();
    },
    enabled: status === 'authenticated',
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Don't retry if no workspace (redirect instead)
      if (error?.message?.includes('No workspace')) return false;
      return failureCount < 2;
    },
  });

  // PHASE A2: Removed sessionStorage workspaceId workaround - use only userStatus
  const workspaceId = userStatus?.workspaceId || null;

  // PHASE C2: Removed workspace redirect logic - middleware handles all redirects now
  // Keep only first-time state tracking
  useEffect(() => {
    if (userStatus) {
      setIsFirstTime(userStatus.isFirstTime || false);
    }
  }, [userStatus]);

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
      <div className="flex min-h-screen flex-col bg-[#020617]">
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
  
  // Still loading workspace status -- show skeleton while we wait.
  if (isLoadingWorkspace) {
    return (
      <div className="flex min-h-screen flex-col bg-[#020617]">
        <Header />
        <main className="flex-1 min-h-screen">
          <div className="p-8">
            <div className="max-w-7xl mx-auto space-y-4">
              <div className="h-8 w-64 bg-slate-900 rounded animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 bg-slate-900 rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Loading finished but no workspace exists (deleted or first-time user).
  // Redirect instead of rendering a perpetual skeleton.
  if (!workspaceId) {
    if (typeof window !== "undefined") {
      // isFirstTime means user has never had a workspace → /welcome
      // Otherwise the workspace was deleted → /login for a clean session
      window.location.href = isFirstTime ? "/welcome" : "/login";
    }
    return null;
  }

  return (
    <LoopbrainAssistantProvider>
      <div className="flex h-screen flex-col bg-[#020617]">
        <Header />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {showSpacesSidebar && <Sidebar />}
          <main className="flex flex-1 flex-col min-h-0 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
      <TaskSidebar />
    </LoopbrainAssistantProvider>
  );
}

