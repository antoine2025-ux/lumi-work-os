import { requireBlogAdmin } from "@/lib/blog-admin-auth"

export default async function BlogAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Protect all admin routes by checking cookie in layout
  await requireBlogAdmin()

  return <>{children}</>
}

