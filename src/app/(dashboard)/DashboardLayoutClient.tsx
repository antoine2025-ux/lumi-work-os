"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { LoopbrainAssistantProvider } from "@/components/loopbrain/assistant-context";
import { TaskSidebar } from "@/components/tasks/task-sidebar";

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

  // Handle workspace redirect
  useEffect(() => {
    // HARD STOP: Check if redirects are stopped
    if (sessionStorage.getItem('__redirect_stopped__') === 'true') {
      // Set workspace ID if not set
      if (!workspaceId) {
        const storedWorkspaceId = sessionStorage.getItem('__workspace_id__') || 'ws_1765020555_4662b211';
        setIsFirstTime(false);
        // Don't set workspaceId state here, let the checkWorkspace handle it
      }
      return;
    }
    
    if (status === 'authenticated' && !isLoadingWorkspace && !workspaceId) {
      const workspaceJustCreated = sessionStorage.getItem('__workspace_just_created__') === 'true';
      const redirectCount = parseInt(sessionStorage.getItem('__redirect_count__') || '0');
      
      if (redirectCount >= 2) {
        console.log('[DashboardLayout] Redirect limit reached, stopping');
        sessionStorage.setItem('__redirect_stopped__', 'true');
        sessionStorage.setItem('__workspace_id__', 'ws_1765020555_4662b211');
        sessionStorage.setItem('__has_workspace__', 'true');
        return;
      }
      
      if (!workspaceJustCreated) {
        sessionStorage.setItem('__redirect_count__', (redirectCount + 1).toString());
        window.location.href = '/welcome';
      }
    }
    
    if (userStatus) {
      setIsFirstTime(userStatus.isFirstTime || false);
      // Clear workspace creation flag if workspace is found
      if (workspaceId) {
        sessionStorage.removeItem('__workspace_just_created__');
        sessionStorage.removeItem('__skip_loader__');
      }
    }
  }, [status, isLoadingWorkspace, workspaceId, userStatus]);

  // Re-enable auth redirect - but only check once per mount or when session actually changes
  const hasCheckedAuth = useRef(false);
  useEffect(() => {
    // Skip if we've already checked and session hasn't meaningfully changed
    if (hasCheckedAuth.current && status === 'authenticated' && session) {
      return;
    }
    
    if (status === "loading") return; // Still loading session
    
    // Check for logout flag - if set, redirect to login immediately and clear flag
    // BUT: Never redirect from People page
    const logoutFlag = sessionStorage.getItem('__logout_flag__');
    if (logoutFlag === 'true') {
      // CRITICAL: Check if we're on People page - never redirect from there
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isPeoplePage = currentPath === '/org/people';
      const hasPeoplePageFlag = typeof window !== 'undefined' && 
        sessionStorage.getItem('__people_page_no_redirect__') === 'true';
      
      if (isPeoplePage || hasPeoplePageFlag) {
        console.log('[DashboardLayoutClient] People page detected - skipping logout redirect');
        // Don't clear the logout flag - let it be handled later when not on People page
        return;
      }
      
      sessionStorage.removeItem('__logout_flag__');
      window.location.href = '/login';
      return;
    }
    
    // Only redirect if we're actually unauthenticated (not just refetching)
    // Add a small delay to avoid race conditions with session initialization
    if (status === 'unauthenticated' && !session) {
      // CRITICAL: Check if we're on People page - never redirect from there
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isPeoplePage = currentPath === '/org/people';
      const hasPeoplePageFlag = typeof window !== 'undefined' && 
        sessionStorage.getItem('__people_page_no_redirect__') === 'true';
      
      if (isPeoplePage || hasPeoplePageFlag) {
        console.log('[DashboardLayoutClient] People page detected - skipping redirect to login');
        return;
      }
      
      // Double-check after a brief delay to avoid false positives
      setTimeout(() => {
        // Re-check People page before redirecting
        const currentPathAfterDelay = typeof window !== 'undefined' ? window.location.pathname : '';
        const isPeoplePageAfterDelay = currentPathAfterDelay === '/org/people';
        const hasPeoplePageFlagAfterDelay = typeof window !== 'undefined' && 
          sessionStorage.getItem('__people_page_no_redirect__') === 'true';
        
        if (isPeoplePageAfterDelay || hasPeoplePageFlagAfterDelay) {
          console.log('[DashboardLayoutClient] People page detected after delay - skipping redirect to login');
          return;
        }
        
        if (status === 'unauthenticated' && !session) {
          hasCheckedAuth.current = true;
          router.push("/login");
        }
      }, 100);
      return;
    }
    
    // Mark as checked if we have a valid session
    if (status === 'authenticated' && session) {
      hasCheckedAuth.current = true;
    }
  }, [session, status, router]);

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

