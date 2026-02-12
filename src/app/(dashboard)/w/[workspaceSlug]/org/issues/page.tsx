/**
 * Redirect: /org/issues → /org/admin/health
 */

import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function WorkspaceOrgIssuesRedirect({ params }: PageProps) {
  const { workspaceSlug } = await params;
  redirect(`/w/${workspaceSlug}/org/admin/health`);
}
