import { requireBlogAdmin } from "@/lib/blog-admin-auth"

// Mark as dynamic since we use cookies for auth
export const dynamic = 'force-dynamic'

export default async function BlogAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Protect all admin routes by checking cookie in layout
  await requireBlogAdmin()

  return <>{children}</>
}

