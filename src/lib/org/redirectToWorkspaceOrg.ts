/**
 * Redirect from legacy /org routes to workspace-scoped /w/[workspaceSlug]/org routes.
 * Used by Phase 2.5 redirect pages so old links and navigation resolve correctly.
 */

import { redirect } from "next/navigation";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { prisma } from "@/lib/db";

/**
 * Resolves the current user's workspace slug for redirects.
 * Returns null if not authenticated or no workspace (caller should redirect to /login or /welcome).
 */
export async function getWorkspaceSlugForRedirect(): Promise<string | null> {
  try {
    const auth = await getUnifiedAuth();
    if (!auth.isAuthenticated || !auth.workspaceId) return null;
    const workspace = await prisma.workspace.findUnique({
      where: { id: auth.workspaceId },
      select: { slug: true },
    });
    return workspace?.slug ?? null;
  } catch {
    return null;
  }
}

/**
 * Redirects to the workspace-scoped org path.
 * - Not authenticated / no workspace → redirect to /login
 * - subPath: e.g. "activity", "admin/health", "structure/teams/abc" (no leading slash)
 */
export async function redirectToWorkspaceOrg(subPath?: string): Promise<never> {
  const slug = await getWorkspaceSlugForRedirect();
  if (!slug) {
    redirect("/login");
  }
  const path = subPath ? `/w/${slug}/org/${subPath}` : `/w/${slug}/org`;
  redirect(path);
}

/**
 * Redirects to a workspace path (e.g. /w/[slug]/settings) with optional search.
 * Use for non-org routes like workspace settings.
 */
export async function redirectToWorkspacePath(
  pathSuffix: string,
  search?: string
): Promise<never> {
  const slug = await getWorkspaceSlugForRedirect();
  if (!slug) {
    redirect("/login");
  }
  const path = `/w/${slug}/${pathSuffix}${search ? `?${search}` : ""}`;
  redirect(path);
}
