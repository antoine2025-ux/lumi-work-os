import { redirect } from "next/navigation"

export default async function ResponsibilityPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params
  redirect(`/w/${workspaceSlug}/org/positions`)
}
