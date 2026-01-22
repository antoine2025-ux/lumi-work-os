"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { LoopbrainAssistantProvider } from "@/components/loopbrain/assistant-context";
import { TaskSidebar } from "@/components/tasks/task-sidebar";
import { getRedirectDecisionWithCookie, isPublicRoute } from "@/lib/redirect-handler";

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
  const [isFirstTime, setIsFirstTime] = useState(false);
  
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

  // Get workspace ID from userStatus OR sessionStorage (for redirect-stopped case)
  const workspaceIdFromStorage = typeof window !== 'undefined' ? sessionStorage.getItem('__workspace_id__') : null;
  const workspaceId = userStatus?.workspaceId || workspaceIdFromStorage || null;

  const pathname = usePathname();
  const hasRedirected = useRef(false);
  const prevPathname = useRef(pathname);

  // Handle workspace redirect
  useEffect(() => {
    // Reset redirect flag when pathname changes
    if (prevPathname.current !== pathname) {
      hasRedirected.current = false;
      prevPathname.current = pathname;
    }

    if (userStatus) {
      setIsFirstTime(userStatus.isFirstTime || false);
      // Clear workspace creation flag if workspace is found
      if (workspaceId) {
        sessionStorage.removeItem('__workspace_just_created__');
        sessionStorage.removeItem('__skip_loader__');
      }
    }

    // Skip redirect logic if already redirected
    if (hasRedirected.current) {
      return;
    }

    // Use centralized redirect handler
    const decision = getRedirectDecisionWithCookie({
      session,
      sessionStatus: status,
      workspaceId: workspaceId || null,
      isFirstTime: userStatus?.isFirstTime || false,
      pendingInvite: null, // Dashboard layout doesn't handle invites
      pathname,
      isLoading: isLoadingWorkspace,
      error: null,
    });

    if (decision.shouldRedirect && decision.target) {
      hasRedirected.current = true;
      window.location.href = decision.target;
    }
  }, [status, isLoadingWorkspace, workspaceId, userStatus, pathname, session]);

  // Auth redirect is now handled by centralized redirect handler above
  // This effect is kept for logout flag handling only
  useEffect(() => {
    if (status === "loading") return;
    
    // Check for logout flag - if set, redirect to login immediately and clear flag
    const logoutFlag = sessionStorage.getItem('__logout_flag__');
    if (logoutFlag === 'true') {
      // Don't redirect from People page
      if (pathname === '/org/people') {
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
  
  // Render immediately with loading state - don't block on workspace check
  // This allows LCP to happen much faster
  // BUT: If redirects are stopped and we have a workspace ID in storage, allow rendering
  const redirectStopped = typeof window !== 'undefined' && sessionStorage.getItem('__redirect_stopped__') === 'true';
  const hasWorkspaceInStorage = typeof window !== 'undefined' && !!sessionStorage.getItem('__workspace_id__');
  
  if ((isLoadingWorkspace || !workspaceId) && !(redirectStopped && hasWorkspaceInStorage)) {
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

  return (
    <LoopbrainAssistantProvider>
      <div className="flex min-h-screen flex-col bg-[#020617]">
        <Header />
        <main className="flex-1 min-h-screen">
          {children}
        </main>
      </div>
      <TaskSidebar />
    </LoopbrainAssistantProvider>
  );
}

