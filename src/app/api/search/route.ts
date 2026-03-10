import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { prisma } from "@/lib/db";

export type SearchResultItem = {
  id: string;
  title: string;
  subtitle: string;
  type: "wiki" | "project" | "task" | "person";
  url: string;
};

export type SearchResponse = {
  wiki: SearchResultItem[];
  projects: SearchResultItem[];
  tasks: SearchResultItem[];
  people: SearchResultItem[];
};

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);
    if (!auth.isAuthenticated || !auth.user?.userId || !auth.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["VIEWER"],
    });

    setWorkspaceContext(auth.workspaceId);

    const query = request.nextUrl.searchParams.get("q");
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(limitParam ?? "20", 10) || 20, 1), 50);

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        wiki: [],
        projects: [],
        tasks: [],
        people: [],
      } satisfies SearchResponse);
    }

    const searchTerm = query.trim().toLowerCase();

    // Fetch workspace slug for URLs
    const workspace = await prisma.workspace.findUnique({
      where: { id: auth.workspaceId },
      select: { slug: true },
    });
    const workspaceSlug = workspace?.slug ?? "default";

    const perTypeLimit = Math.ceil(limit / 4);

    const [wikiPages, projects, tasks, people] = await Promise.all([
      prisma.wikiPage.findMany({
        where: {
          workspaceId: auth.workspaceId,
          isPublished: true,
          OR: [
            { title: { contains: searchTerm, mode: "insensitive" } },
            { content: { contains: searchTerm, mode: "insensitive" } },
            { excerpt: { contains: searchTerm, mode: "insensitive" } },
            { tags: { hasSome: [searchTerm] } },
          ],
        },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          category: true,
        },
        take: perTypeLimit,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.project.findMany({
        where: {
          workspaceId: auth.workspaceId,
          isArchived: false,
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { description: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
        },
        take: perTypeLimit,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.task.findMany({
        where: {
          workspaceId: auth.workspaceId,
          OR: [
            { title: { contains: searchTerm, mode: "insensitive" } },
            { description: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          projectId: true,
          project: {
            select: { id: true, name: true },
          },
        },
        take: perTypeLimit,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.orgPosition.findMany({
        where: {
          workspaceId: auth.workspaceId,
          isActive: true,
          userId: { not: null },
          OR: [
            { title: { contains: searchTerm, mode: "insensitive" } },
            {
              user: {
                OR: [
                  { name: { contains: searchTerm, mode: "insensitive" } },
                  { email: { contains: searchTerm, mode: "insensitive" } },
                ],
              },
            },
          ],
        },
        select: {
          id: true,
          title: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          team: {
            select: { name: true },
          },
        },
        take: perTypeLimit,
      }),
    ]);

    const wiki: SearchResultItem[] = wikiPages.map((page) => ({
      id: page.id,
      title: page.title,
      subtitle: page.excerpt ?? `Category: ${page.category}`,
      type: "wiki" as const,
      url: `/wiki/${page.slug}`,
    }));

    const projectItems: SearchResultItem[] = projects.map((p) => ({
      id: p.id,
      title: p.name,
      subtitle: p.description ?? `Status: ${p.status}`,
      type: "project" as const,
      url: `/w/${workspaceSlug}/projects/${p.id}`,
    }));

    const taskItems: SearchResultItem[] = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      subtitle: `${t.project.name} · ${t.status} · ${t.priority}`,
      type: "task" as const,
      url: `/w/${workspaceSlug}/projects/${t.projectId}?task=${t.id}`,
    }));

    const peopleItems: SearchResultItem[] = people
      .filter((p) => p.user !== null)
      .map((p) => ({
        id: p.user!.id,
        title: p.user!.name ?? p.user!.email,
        subtitle: [p.title, p.team?.name].filter(Boolean).join(" · ") || p.user!.email,
        type: "person" as const,
        url: `/w/${workspaceSlug}/org/people/${p.user!.id}`,
      }));

    return NextResponse.json({
      wiki,
      projects: projectItems,
      tasks: taskItems,
      people: peopleItems,
    } satisfies SearchResponse);
  } catch (error) {
    return handleApiError(error, request);
  }
}
