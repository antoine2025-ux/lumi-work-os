import { redirect } from "next/navigation"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { prisma } from "@/lib/db"

export const dynamic = 'force-dynamic'

/**
 * /spaces/home redirects to the workspace-scoped Spaces home.
 * The actual Spaces dashboard lives at /w/[workspaceSlug]/spaces/home.
 */
export default async function SpacesHomeRedirectPage() {
  const auth = await getUnifiedAuth()

  if (!auth.isAuthenticated || !auth.workspaceId) {
    redirect("/home")
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: auth.workspaceId },
    select: { slug: true },
  })

  if (!workspace?.slug) {
    redirect("/home")
  }

  redirect(`/w/${workspace.slug}/spaces/home`)
}
