import { NextRequest, NextResponse } from "next/server"
import { blogPrisma } from "@/lib/blog-db"

const prisma = blogPrisma

/**
 * POST /api/migrations/blog
 * Run blog migration manually
 * 
 * This endpoint allows running migrations after deployment
 * when migrations can't run during build (e.g., database not accessible from build environment)
 * 
 * Security: In production, you may want to add authentication/authorization
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication check here
    // const authHeader = request.headers.get("authorization")
    // if (authHeader !== `Bearer ${process.env.MIGRATION_SECRET}`) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    console.log("[MIGRATIONS] Starting blog migration...")

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

    // Run migration SQL
    console.log("[MIGRATIONS] Creating blog_posts table...")

    await prisma.$executeRawUnsafe(`
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
    `)

    console.log("[MIGRATIONS] Blog migration completed successfully")

    return NextResponse.json({
      success: true,
      message: "Blog migration completed successfully",
    })
  } catch (error) {
    console.error("[MIGRATIONS] Error running blog migration:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    )
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
  } catch (error) {
    console.error("[MIGRATIONS] Error checking blog migration:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        migrated: false,
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}

