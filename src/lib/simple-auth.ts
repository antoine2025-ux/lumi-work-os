import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

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
      workspaceMembership = await prisma.workspaceMember.findFirst({
        where: { userId: user.id }
      })

      if (workspaceMembership) {
        workspace = await prisma.workspace.findUnique({
          where: { id: workspaceMembership.workspaceId }
        })
      }
    } catch (prismaError: any) {
      // Prisma failed - fall back to direct SQL query via Docker
      console.warn('[getAuthUser] Prisma failed, using direct SQL fallback:', prismaError.message)
      
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
      } catch (sqlError: any) {
        console.error('[getAuthUser] SQL fallback also failed:', sqlError.message)
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

    let isFirstTime = false

    if (!workspaceMembership) {
      // First-time user - they need to create a workspace
      isFirstTime = true
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
    } catch (prismaError: any) {
      console.error('[createUserWorkspace] Prisma upsert failed, trying raw SQL:', prismaError.message)
      
      // If Prisma fails due to schema mismatch, use raw SQL
      if (prismaError.code === 'P2022' || prismaError.message?.includes('does not exist')) {
        // Use raw SQL to insert/update user with only existing columns
        // Escape single quotes in user input
        const escapedEmail = userData.email.replace(/'/g, "''")
        const escapedName = (userData.name || null)?.replace(/'/g, "''") || 'NULL'
        const escapedImage = (userData.image || null)?.replace(/'/g, "''") || 'NULL'
        const escapedId = userData.id.replace(/'/g, "''")
        
        const result = await prisma.$queryRawUnsafe<Array<{
          id: string
          email: string
          name: string | null
          image: string | null
          emailVerified: Date | null
          createdAt: Date
          updatedAt: Date
          themePreference: string | null
        }>>(`
          INSERT INTO users (id, email, name, image, "emailVerified", "createdAt", "updatedAt", "themePreference")
          VALUES ('${escapedId}', '${escapedEmail}', ${escapedName === 'NULL' ? 'NULL' : `'${escapedName}'`}, ${escapedImage === 'NULL' ? 'NULL' : `'${escapedImage}'`}, NOW(), NOW(), NOW(), 'default')
          ON CONFLICT (email) 
          DO UPDATE SET 
            name = EXCLUDED.name,
            image = EXCLUDED.image,
            "updatedAt" = NOW()
          RETURNING id, email, name, image, "emailVerified", "createdAt", "updatedAt", "themePreference"
        `)
        
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
        throw prismaError
      }
    }

    // Create workspace - try Prisma first, fall back to raw SQL
    let workspace
    try {
      workspace = await prisma.workspace.create({
        data: {
          name: workspaceData.name,
          slug: workspaceData.slug,
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
    } catch (prismaError: any) {
      console.error('[createUserWorkspace] Prisma workspace.create failed, trying raw SQL:', prismaError.message)
      
      // If Prisma fails due to schema mismatch, use raw SQL
      if (prismaError.code === 'P2022' || prismaError.message?.includes('does not exist')) {
        // Use raw SQL to create workspace with only existing columns
        // Generate CUID-like ID
        const { randomBytes } = await import('crypto')
        const workspaceId = 'c' + Date.now().toString(36) + randomBytes(4).toString('hex')
        const escapedName = workspaceData.name.replace(/'/g, "''")
        const escapedSlug = workspaceData.slug.replace(/'/g, "''")
        const escapedDescription = (workspaceData.description || null)?.replace(/'/g, "''") || 'NULL'
        const escapedOwnerId = user.id.replace(/'/g, "''")
        
        const result = await prisma.$queryRawUnsafe<Array<{
          id: string
          name: string
          slug: string
          description: string | null
          logo: string | null
          createdAt: Date
          updatedAt: Date
          ownerId: string
        }>>(`
          INSERT INTO workspaces (id, name, slug, description, "ownerId", "createdAt", "updatedAt")
          VALUES ('${workspaceId}', '${escapedName}', '${escapedSlug}', ${escapedDescription === 'NULL' ? 'NULL' : `'${escapedDescription}'`}, '${escapedOwnerId}', NOW(), NOW())
          RETURNING id, name, slug, description, logo, "createdAt", "updatedAt", "ownerId"
        `)
        
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
        throw prismaError
      }
    }

    // Add user as OWNER - try Prisma first, fall back to raw SQL
    try {
      const membership = await prisma.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: 'OWNER',
          joinedAt: new Date(),
        }
      })
    } catch (prismaError: any) {
      console.error('[createUserWorkspace] Prisma workspaceMember.create failed, trying raw SQL:', prismaError.message)
      
      // If Prisma fails due to schema mismatch, use raw SQL
      if (prismaError.code === 'P2022' || prismaError.message?.includes('does not exist')) {
        // Use raw SQL to create workspace member with only existing columns
        // Generate CUID-like ID
        const { randomBytes } = await import('crypto')
        const membershipId = 'c' + Date.now().toString(36) + randomBytes(4).toString('hex')
        const escapedUserId = user.id.replace(/'/g, "''")
        const escapedWorkspaceId = workspace.id.replace(/'/g, "''")
        
        try {
          await prisma.$executeRawUnsafe(`
            INSERT INTO workspace_members (id, "userId", "workspaceId", role, "joinedAt")
            VALUES ('${membershipId}', '${escapedUserId}', '${escapedWorkspaceId}', 'OWNER', NOW())
            ON CONFLICT ("workspaceId", "userId") DO NOTHING
          `)
          
        } catch (rawSQLError: any) {
          console.error('[createUserWorkspace] Raw SQL workspaceMember.create also failed:', rawSQLError.message)
          // Don't throw - workspace is already created, member can be added later via manual fix
          console.warn('[createUserWorkspace] Workspace created but member creation failed. Workspace ID:', workspace.id)
        }
      } else {
        // For other errors, log but don't throw
        console.warn('[createUserWorkspace] Workspace created but member creation failed. Workspace ID:', workspace.id)
      }
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
    console.error('[createUserWorkspace] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      userData,
      workspaceData
    })
    throw error
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
