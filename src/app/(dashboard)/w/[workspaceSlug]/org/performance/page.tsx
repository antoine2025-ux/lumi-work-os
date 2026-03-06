import { redirect } from "next/navigation"

export default async function PerformancePage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params
  redirect(`/w/${workspaceSlug}/org/profile`)
}
