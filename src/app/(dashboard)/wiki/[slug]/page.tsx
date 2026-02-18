import { getUnifiedAuth } from "@/lib/unified-auth";
import { prisma } from "@/lib/db";
import WikiPageClient from "./wiki-page-client";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function WikiPage({ params }: PageProps) {
  const { slug } = await params;
  const { workspaceId, isAuthenticated } = await getUnifiedAuth();

  if (!isAuthenticated || !workspaceId) {
    return <WikiPageClient authorOrgInfo={null} />;
  }

  // Pre-fetch just enough for the author card (the client fetches full page data itself)
  const page = await prisma.wikiPage.findFirst({
    where: { slug, workspaceId },
    select: { createdById: true },
  });

  const [authorPosition, workspace] = await Promise.all([
    page?.createdById
      ? prisma.orgPosition.findFirst({
          where: {
            userId: page.createdById,
            workspaceId,
            isActive: true,
            archivedAt: null,
          },
          select: {
            title: true,
            user: { select: { id: true, name: true, image: true } },
          },
        })
      : Promise.resolve(null),
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { slug: true },
    }),
  ]);

  const authorOrgInfo =
    authorPosition?.user
      ? {
          userId: authorPosition.user.id,
          name: authorPosition.user.name,
          image: authorPosition.user.image,
          orgTitle: authorPosition.title,
          workspaceSlug: workspace?.slug ?? "",
        }
      : null;

  return <WikiPageClient authorOrgInfo={authorOrgInfo} />;
}
