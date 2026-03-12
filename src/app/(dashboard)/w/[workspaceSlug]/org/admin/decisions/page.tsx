import { redirect } from "next/navigation"

export default async function AdminDecisionsPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params
  redirect(`/w/${workspaceSlug}/org/admin`)
}
