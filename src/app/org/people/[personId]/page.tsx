/**
 * Legacy person profile route — redirects to workspace-scoped profile or directory.
 * Pre-Phase 2.5 route; kept so old links and directory clicks resolve correctly.
 */

import { redirect } from "next/navigation";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";

interface PageProps {
  params: Promise<{ personId: string }>;
}

export default async function OldPersonProfilePage({ params }: PageProps) {
  const { personId } = await params;
  const auth = await getUnifiedAuth();
  if (auth.workspaceId) {
    setWorkspaceContext(auth.workspaceId);
  }

  if (!auth.isAuthenticated || !auth.workspaceId) {
    redirect("/login");
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: auth.workspaceId },
    select: { slug: true },
  });

  if (!workspace) {
    redirect("/welcome");
  }

  if (auth.user && personId === auth.user.userId) {
    redirect(`/w/${workspace.slug}/org/profile`);
  }

  const position = await prisma.orgPosition.findUnique({
    where: { id: personId },
    select: { userId: true },
  });
  if (position?.userId === auth.user?.userId) {
    redirect(`/w/${workspace.slug}/org/profile`);
  }

  redirect(`/w/${workspace.slug}/org/directory`);
}
