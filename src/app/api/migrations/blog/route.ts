import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'

// Use DIRECT_URL for migrations (bypasses connection pooler)
const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL

if (!databaseUrl) {
  console.error("[MIGRATIONS] No DATABASE_URL or DIRECT_URL found")
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
})

/**
 * POST /api/migrations/blog
 * Run blog migration manually
 *
 * This endpoint allows running migrations after deployment
 * when migrations can't run during build (e.g., database not accessible from build environment)
 *
 * Requires OWNER role in workspace.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!auth.workspaceId) {
      return NextResponse.json({ error: 'No workspace context' }, { status: 401 })
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['OWNER']
    })
    setWorkspaceContext(auth.workspaceId)

    // Check if table already exists
    const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'blog_posts'
      ) as exists
    `

    if (tableExists[0]?.exists) {
      return NextResponse.json({
        success: true,
        message: "blog_posts table already exists",
        skipped: true,
      })
    }

    // Run migration SQL (static DDL - no user input, safe to use $executeRaw)
    console.log("[MIGRATIONS] Creating blog_posts table...")

    await prisma.$executeRaw`
      -- CreateEnum
      DO $$ BEGIN
        CREATE TYPE "BlogPostStatus" AS ENUM ('DRAFT', 'PUBLISHED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      -- CreateEnum
      DO $$ BEGIN
        CREATE TYPE "BlogPostCategory" AS ENUM ('NEWS', 'PRODUCT', 'CONTEXTUAL_AI', 'LOOPWELL');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      -- CreateTable
      CREATE TABLE IF NOT EXISTS "blog_posts" (
          "id" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "slug" TEXT NOT NULL,
          "excerpt" TEXT NOT NULL,
          "content" TEXT NOT NULL,
          "category" "BlogPostCategory" NOT NULL DEFAULT 'NEWS',
          "status" "BlogPostStatus" NOT NULL DEFAULT 'DRAFT',
          "publishedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,

          CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
      );

      -- CreateIndex
      CREATE UNIQUE INDEX IF NOT EXISTS "blog_posts_slug_key" ON "blog_posts"("slug");
      CREATE INDEX IF NOT EXISTS "blog_posts_slug_idx" ON "blog_posts"("slug");
      CREATE INDEX IF NOT EXISTS "blog_posts_status_idx" ON "blog_posts"("status");
      CREATE INDEX IF NOT EXISTS "blog_posts_category_idx" ON "blog_posts"("category");
      CREATE INDEX IF NOT EXISTS "blog_posts_publishedAt_idx" ON "blog_posts"("publishedAt" DESC);
    `

    return NextResponse.json({
      success: true,
      message: "Blog migration completed successfully",
    })
  } catch (error: unknown) {
    return handleApiError(error, request)
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * GET /api/migrations/blog
 * Check if blog migration has been applied
 */
export async function GET() {
  try {
    const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'blog_posts'
      ) as exists
    `

    return NextResponse.json({
      migrated: tableExists[0]?.exists || false,
      tableExists: tableExists[0]?.exists || false,
    })
  } catch (error: unknown) {
    console.error("[MIGRATIONS] Error checking blog migration:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        migrated: false,
        error: errorMessage,
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
