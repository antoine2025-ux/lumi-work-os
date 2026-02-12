/**
 * Redirect: /org/settings → /org/admin/settings
 */

import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function WorkspaceOrgSettingsRedirect({ params }: PageProps) {
  const { workspaceSlug } = await params;
  redirect(`/w/${workspaceSlug}/org/admin/settings`);
}
