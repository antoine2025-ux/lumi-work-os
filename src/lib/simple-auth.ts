import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/server/authOptions'
import { prisma } from '@/lib/db'

/** Typed shape of Prisma (and Prisma-like) errors used for error narrowing. */
interface PrismaLikeError {
  code?: string
  message?: string
  meta?: unknown
}

/** Error subtype that carries Prisma error metadata. */
interface ErrorWithCode extends Error {
  code?: string
  meta?: unknown
}

// Note: Direct PostgreSQL connection via 'pg' library has issues connecting from host to Docker
// Prisma should work for most operations, so we'll rely on Prisma with better error messages

export interface AuthUser {
  id: string
  email: string
  name: string
  image?: string | null
  workspaceId: string
  isFirstTime: boolean
}

/**
 * Simple authentication - works in development and production
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    // Get NextAuth session
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.email) {
      return null
    }

    let user
    let workspaceMembership = null
    let workspace = null

    try {
      // Try Prisma first
      user = await prisma.user.upsert({
        where: { email: session.user.email! },
        update: { name: session.user.name },
        create: {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.name || '',
          emailVerified: new Date(),
        }
      })

      // Check if user has any workspace membership
      // Use select to avoid querying customRoleId which may not exist in database
      workspaceMembership = await prisma.workspaceMember.findFirst({
        where: { userId: user.id },
        select: {
          id: true,
          workspaceId: true,
          userId: true,
          role: true,
          joinedAt: true,
          // Exclude customRoleId and customRole relation - they may not exist in database
        }
      })

      if (workspaceMembership) {
        workspace = await prisma.workspace.findUnique({
          where: { id: workspaceMembership.workspaceId },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            logo: true,
            ownerId: true,
            createdAt: true,
            updatedAt: true,
            // Exclude orgCenterOnboardingCompletedAt - may not exist in database
          }
        })
      }
    } catch (prismaError: unknown) {
      // Prisma failed - fall back to direct SQL query via Docker
      const prismaErr = prismaError instanceof Error ? prismaError : new Error(String(prismaError));
      console.warn('[getAuthUser] Prisma failed, using direct SQL fallback:', prismaErr.message)
      
      try {
        const { execSync } = await import('child_process')
        
        // Get user from database - use -A flag to avoid pipe delimiter issues
        const escapedEmail = session.user.email.replace(/'/g, "''")
        const userQuery = `SELECT id, email, name FROM users WHERE email = '${escapedEmail}';`
        const userResult = execSync(
          `docker compose exec -T postgres psql -U lumi_user -d lumi_work_os -t -A -c ${JSON.stringify(userQuery)}`,
          { encoding: 'utf-8', cwd: process.cwd(), maxBuffer: 1024 * 1024 }
        ).trim()
        
        if (!userResult || userResult.includes('ERROR')) {
          console.error('[getAuthUser] User not found in database:', userResult)
          return null
        }
        
        // With -A flag, results are tab-separated, not pipe-separated
        const parts = userResult.split('\t').map(s => s.trim())
        const userId = parts[0]
        const email = parts[1] || session.user.email
        const name = parts[2] || session.user.name || ''
        user = { id: userId, email, name }
        
        // Check for workspace membership - use proper SQL escaping with -A flag
        const escapedUserId = userId.replace(/'/g, "''")
        const membershipQuery = `SELECT "workspaceId" FROM workspace_members WHERE "userId" = '${escapedUserId}' LIMIT 1;`
        const membershipResult = execSync(
          `docker compose exec -T postgres psql -U lumi_user -d lumi_work_os -t -A -c ${JSON.stringify(membershipQuery)}`,
          { encoding: 'utf-8', cwd: process.cwd(), maxBuffer: 1024 * 1024 }
        ).trim()
        
        if (membershipResult && !membershipResult.includes('ERROR')) {
          const workspaceId = membershipResult.trim()
          const escapedWorkspaceId = workspaceId.replace(/'/g, "''")
          const workspaceQuery = `SELECT id, name FROM workspaces WHERE id = '${escapedWorkspaceId}';`
          const workspaceResult = execSync(
            `docker compose exec -T postgres psql -U lumi_user -d lumi_work_os -t -A -c ${JSON.stringify(workspaceQuery)}`,
            { encoding: 'utf-8', cwd: process.cwd(), maxBuffer: 1024 * 1024 }
          ).trim()
          
          if (workspaceResult && !workspaceResult.includes('ERROR')) {
            // With -A flag, results are tab-separated
            const parts = workspaceResult.split('\t').map(s => s.trim())
            const wsId = parts[0]
            const wsName = parts[1] || 'Workspace'
            workspace = { id: wsId, name: wsName }
            workspaceMembership = { workspaceId: wsId }
          }
        }
      } catch (sqlError: unknown) {
        const sqlErr = sqlError instanceof Error ? sqlError : new Error(String(sqlError));
        console.error('[getAuthUser] SQL fallback also failed:', sqlErr.message)
        // Even if SQL fails, return user info from session if we have it
        if (session?.user?.id && session?.user?.email) {
          return {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name || '',
            image: session.user.image,
            workspaceId: '', // Can't determine workspace without DB access
            isFirstTime: true
          }
        }
        return null
      }
    }

    if (!workspaceMembership) {
      // First-time user - they need to create a workspace
      return {
        id: user.id,
        email: user.email,
        name: user.name || '',
        image: session.user.image,
        workspaceId: workspace?.id || '',
        isFirstTime: true
      }
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name || '',
      image: session.user.image,
      workspaceId: workspace?.id || '',
      isFirstTime: false
    }
  } catch (error) {
    console.error('Auth error:', error)
    return null
  }
}

/**
 * Create workspace for first-time user
 */
export async function createUserWorkspace(userData: {
  id: string
  email: string
  name: string
  image?: string | null
}, workspaceData: {
  name: string
  slug: string
  description: string
  teamSize?: string
  industry?: string
}): Promise<AuthUser> {
  try {
    // First ensure the user exists in the database
    // Try Prisma upsert first, fall back to raw SQL if it fails
    let user
    try {
      // Try Prisma upsert first
      user = await prisma.user.upsert({
        where: { email: userData.email },
        update: { 
          name: userData.name,
          image: userData.image
        },
        create: {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          image: userData.image,
          emailVerified: new Date(),
        },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          themePreference: true,
        }
      })
    } catch (prismaError: unknown) {
      const prismaErr = prismaError as PrismaLikeError;
      console.error('[createUserWorkspace] Prisma upsert failed, trying raw SQL:', prismaErr.message)

      // If Prisma fails because the table does not exist, do not fall back to raw SQL
      // (raw SQL will fail the same way). Throw a clear message so the user can run migrations.
      const tableMissing =
        prismaErr.code === 'P2021' ||
        prismaErr.code === 'P2022' ||
        (prismaErr.message?.includes('does not exist') && prismaErr.message?.includes('users'));

      if (tableMissing) {
        const schemaHint = new Error(
          'Database schema is not initialized. The "users" table is missing. Run: npm run db:push (or npx prisma migrate deploy) then try again.'
        ) as ErrorWithCode;
        schemaHint.code = prismaErr.code;
        throw schemaHint;
      }

      // Legacy: other schema mismatch (e.g. column missing) – use raw SQL
      if (prismaErr.code === 'P2022' || prismaErr.message?.includes('does not exist')) {
        // Use raw SQL to insert/update user with only existing columns
        const result = await prisma.$queryRawUnsafe<Array<{
          id: string
          email: string
          name: string | null
          image: string | null
          emailVerified: Date | null
          createdAt: Date
          updatedAt: Date
          themePreference: string | null
        }>>(
          'INSERT INTO users (id, email, name, image, "emailVerified", "createdAt", "updatedAt", "themePreference") VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW(), \'default\') ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, image = EXCLUDED.image, "updatedAt" = NOW() RETURNING id, email, name, image, "emailVerified", "createdAt", "updatedAt", "themePreference"',
          userData.id,
          userData.email,
          userData.name ?? null,
          userData.image ?? null
        )
        
        if (result && result.length > 0) {
          user = {
            id: result[0].id,
            email: result[0].email,
            name: result[0].name,
            image: result[0].image,
            emailVerified: result[0].emailVerified,
            createdAt: result[0].createdAt,
            updatedAt: result[0].updatedAt,
            themePreference: result[0].themePreference,
          }
        } else {
          // If no result, fetch the user we just created
          user = await prisma.user.findUnique({
            where: { email: userData.email },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              emailVerified: true,
              createdAt: true,
              updatedAt: true,
              themePreference: true,
            }
          })
        }
        
        if (!user) {
          throw new Error('Failed to create or retrieve user after raw SQL insert')
        }
      } else {
        // For other errors, throw as-is
        throw prismaError as Error
      }
    }

    // Create workspace - first ensure slug is unique
    let workspace
    
    // Check if slug already exists and make it unique if needed
    let finalSlug = workspaceData.slug
    let counter = 1
    const maxAttempts = 100 // Prevent infinite loop
    while (counter < maxAttempts) {
      try {
        const existingWorkspace = await prisma.workspace.findUnique({
          where: { slug: finalSlug },
          select: { id: true }
        })
        if (!existingWorkspace) break
        finalSlug = `${workspaceData.slug}-${counter}`
        counter++
      } catch (slugCheckError) {
        console.warn('[createUserWorkspace] Error checking slug uniqueness:', slugCheckError)
        // If we can't check, add a random suffix to be safe
        finalSlug = `${workspaceData.slug}-${Date.now().toString(36).slice(-4)}`
        break
      }
    }
    
    console.log('[createUserWorkspace] Using slug:', finalSlug)
    try {
      workspace = await prisma.workspace.create({
        data: {
          name: workspaceData.name,
          slug: finalSlug,
          description: workspaceData.description,
          ownerId: user.id,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logo: true,
          createdAt: true,
          updatedAt: true,
          ownerId: true,
        }
      })
    } catch (prismaError: unknown) {
      const prismaErr2 = prismaError as PrismaLikeError;
      console.error('[createUserWorkspace] Prisma workspace.create failed, trying raw SQL:', prismaErr2.message)

      // If Prisma fails due to schema mismatch, use raw SQL
      if (prismaErr2.code === 'P2022' || prismaErr2.message?.includes('does not exist')) {
        // Use raw SQL to create workspace with only existing columns
        // Generate CUID-like ID
        const { randomBytes } = await import('crypto')
        const workspaceId = 'c' + Date.now().toString(36) + randomBytes(4).toString('hex')
        const result = await prisma.$queryRawUnsafe<Array<{
          id: string
          name: string
          slug: string
          description: string | null
          logo: string | null
          createdAt: Date
          updatedAt: Date
          ownerId: string
        }>>(
          'INSERT INTO workspaces (id, name, slug, description, "ownerId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id, name, slug, description, logo, "createdAt", "updatedAt", "ownerId"',
          workspaceId,
          workspaceData.name,
          workspaceData.slug,
          workspaceData.description ?? null,
          user.id
        )
        
        if (result && result.length > 0) {
          workspace = {
            id: result[0].id,
            name: result[0].name,
            slug: result[0].slug,
            description: result[0].description,
            logo: result[0].logo,
            createdAt: result[0].createdAt,
            updatedAt: result[0].updatedAt,
            ownerId: result[0].ownerId,
          }
        } else {
          // If no result, fetch the workspace we just created
          workspace = await prisma.workspace.findUnique({
            where: { slug: workspaceData.slug },
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              logo: true,
              createdAt: true,
              updatedAt: true,
              ownerId: true,
            }
          })
        }
        
        if (!workspace) {
          throw new Error('Failed to create or retrieve workspace after raw SQL insert')
        }
        
      } else {
        // For other errors, throw as-is
        throw prismaError as Error
      }
    }

    // Add user as OWNER - use raw SQL directly to avoid Prisma schema validation issues
    // The database schema may be out of sync with Prisma schema (e.g., customRoleId column missing)
    // Using raw SQL bypasses Prisma's schema validation and works with the actual database structure
    try {
      // Generate CUID-like ID for membership
      const { randomBytes } = await import('crypto')
      const membershipId = 'c' + Date.now().toString(36) + randomBytes(4).toString('hex')
      // Use raw SQL to create workspace member with only existing columns
      // This avoids Prisma schema validation issues when schema is out of sync
      await prisma.$executeRawUnsafe(
        'INSERT INTO workspace_members (id, "userId", "workspaceId", role, "joinedAt") VALUES ($1, $2, $3, \'OWNER\', NOW()) ON CONFLICT ("workspaceId", "userId") DO NOTHING',
        membershipId,
        user.id,
        workspace.id
      )
      
      console.log('[createUserWorkspace] WorkspaceMember created successfully via raw SQL')
    } catch (rawSQLError: unknown) {
      const sqlErr2 = rawSQLError as { message?: string; code?: string };
      console.error('[createUserWorkspace] Raw SQL workspaceMember.create failed:', sqlErr2.message)
      console.error('[createUserWorkspace] Raw SQL error code:', sqlErr2.code)
      // Don't throw - workspace is already created, member can be added later via manual fix
      // This is a non-critical error - the workspace exists, membership can be fixed manually if needed
      console.warn('[createUserWorkspace] Workspace created but member creation failed. Workspace ID:', workspace.id)
      console.warn('[createUserWorkspace] User can still access workspace, but membership record may need manual creation')
    }

    // Return the auth user data
    return {
      id: user.id,
      email: user.email,
      name: user.name || userData.name,
      image: user.image,
      workspaceId: workspace.id,
      isFirstTime: false
    }
  } catch (error) {
    console.error('[createUserWorkspace] Error creating workspace:', error)
    
    // Extract serializable error details
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorName = error instanceof Error ? error.name : 'Unknown'
    const prismaErr3 = error as PrismaLikeError;
    const errorCode = prismaErr3.code

    console.error('[createUserWorkspace] Error details:', {
      message: errorMessage,
      name: errorName,
      code: errorCode,
      prismaCode: prismaErr3.code,
      prismaMeta: prismaErr3.meta ? JSON.stringify(prismaErr3.meta) : undefined,
      stack: error instanceof Error ? error.stack : undefined,
      userData: { id: userData.id, email: userData.email },
      workspaceData: { name: workspaceData.name, slug: workspaceData.slug }
    })

    // Create a new Error with serializable properties to avoid circular reference issues
    const serializableError = new Error(errorMessage) as ErrorWithCode;
    serializableError.code = errorCode;
    serializableError.name = errorName;
    if (prismaErr3.meta) {
      serializableError.meta = prismaErr3.meta;
    }
    throw serializableError
  }
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser()
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}
