-- Migration: Unified Space model
-- Sprint 1: Schema + DDL for spaces and space_members tables,
--           plus spaceId FK columns on projects and wiki_pages.
--
-- NOTE: The Prisma schema declares @@unique([workspaceId, ownerId]) on Space.
--       For personal spaces the DB enforces this as a PARTIAL unique index
--       (WHERE is_personal = true) so that users can own multiple public/private
--       spaces in the same workspace. The full Prisma unique constraint is
--       intentionally replaced with the partial form below.

-- ── 1. Enums ─────────────────────────────────────────────────────────────────

CREATE TYPE "SpaceVisibility" AS ENUM ('PERSONAL', 'PRIVATE', 'PUBLIC');
CREATE TYPE "SpaceRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- ── 2. spaces table ──────────────────────────────────────────────────────────

CREATE TABLE "spaces" (
    "id"           TEXT NOT NULL,
    "workspaceId"  TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "slug"         TEXT,
    "description"  TEXT,
    "color"        TEXT DEFAULT '#3b82f6',
    "icon"         TEXT DEFAULT 'folder',
    "visibility"   "SpaceVisibility" NOT NULL DEFAULT 'PUBLIC',
    "isPersonal"   BOOLEAN NOT NULL DEFAULT false,
    "ownerId"      TEXT NOT NULL,
    "parentId"     TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spaces_pkey" PRIMARY KEY ("id")
);

-- FK: workspaceId → workspaces.id (cascade delete)
ALTER TABLE "spaces"
    ADD CONSTRAINT "spaces_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: ownerId → users.id (cascade delete)
ALTER TABLE "spaces"
    ADD CONSTRAINT "spaces_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: parentId → spaces.id (cascade delete — self-referential hierarchy)
ALTER TABLE "spaces"
    ADD CONSTRAINT "spaces_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Regular indexes
CREATE INDEX "spaces_workspaceId_idx" ON "spaces"("workspaceId");
CREATE INDEX "spaces_parentId_idx"    ON "spaces"("parentId");
CREATE INDEX "spaces_ownerId_idx"     ON "spaces"("ownerId");

-- Partial unique index: one personal space per user per workspace.
-- This replaces the full @@unique([workspaceId, ownerId]) from the schema,
-- which would incorrectly block users from owning multiple public/private spaces.
CREATE UNIQUE INDEX "spaces_personal_unique"
    ON "spaces"("workspaceId", "ownerId")
    WHERE "isPersonal" = true;

-- ── 3. space_members table ───────────────────────────────────────────────────

CREATE TABLE "space_members" (
    "id"        TEXT NOT NULL,
    "spaceId"   TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "role"      "SpaceRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "space_members_pkey" PRIMARY KEY ("id")
);

-- Unique membership
CREATE UNIQUE INDEX "space_members_spaceId_userId_key" ON "space_members"("spaceId", "userId");

-- FK: spaceId → spaces.id (cascade delete)
ALTER TABLE "space_members"
    ADD CONSTRAINT "space_members_spaceId_fkey"
    FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: userId → users.id (cascade delete)
ALTER TABLE "space_members"
    ADD CONSTRAINT "space_members_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "space_members_userId_idx" ON "space_members"("userId");

-- ── 4. Add spaceId to projects ───────────────────────────────────────────────

ALTER TABLE "projects" ADD COLUMN "spaceId" TEXT;

ALTER TABLE "projects"
    ADD CONSTRAINT "projects_spaceId_fkey"
    FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "idx_projects_space_id" ON "projects"("spaceId");

-- ── 5. Add spaceId to wiki_pages ─────────────────────────────────────────────

ALTER TABLE "wiki_pages" ADD COLUMN "spaceId" TEXT;

ALTER TABLE "wiki_pages"
    ADD CONSTRAINT "wiki_pages_spaceId_fkey"
    FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "idx_wiki_pages_space_id" ON "wiki_pages"("spaceId");
