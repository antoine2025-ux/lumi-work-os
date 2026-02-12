/**
 * Legacy workspace settings route — redirects to workspace-scoped /w/[slug]/settings.
 * Preserves ?tab= for deep linking (members, invites, general, danger).
 */

import { redirect } from "next/navigation";
import { getWorkspaceSlugForRedirect } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function OldWorkspaceSettingsPage({ searchParams }: PageProps) {
  const slug = await getWorkspaceSlugForRedirect();
  if (!slug) redirect("/login");
  const params = await searchParams;
  const tab = params?.tab;
  const tabStr =
    typeof tab === "string" ? tab : Array.isArray(tab) ? tab[0] : undefined;
  const search =
    tabStr && ["members", "invites", "general", "danger"].includes(tabStr)
      ? `tab=${encodeURIComponent(tabStr)}`
      : undefined;
  const path = `/w/${slug}/settings${search ? `?${search}` : ""}`;
  redirect(path);
}
