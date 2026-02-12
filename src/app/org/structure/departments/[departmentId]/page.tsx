/**
 * Legacy org department detail — redirects to workspace-scoped structure/departments/[departmentId].
 */

import { redirect } from "next/navigation";
import { getWorkspaceSlugForRedirect } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ departmentId: string }>;
}

export default async function OldOrgDepartmentPage({ params }: PageProps) {
  const { departmentId } = await params;
  const slug = await getWorkspaceSlugForRedirect();
  if (!slug) redirect("/login");
  redirect(`/w/${slug}/org/structure/departments/${departmentId}`);
}
