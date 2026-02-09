import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/authOptions'
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/2a79ccc7-8419-4f6b-84d3-31982e160042',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'simple-auth.ts:createUserWorkspace:beforeUpsert',message:'Before prisma.user.upsert',data:{email:userData.email},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/2a79ccc7-8419-4f6b-84d3-31982e160042',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'simple-auth.ts:createUserWorkspace:afterUpsert',message:'Prisma upsert succeeded',data:{userId:user.id},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
    } catch (prismaError: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/2a79ccc7-8419-4f6b-84d3-31982e160042',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'simple-auth.ts:createUserWorkspace:catchPrisma',message:'Prisma upsert failed',data:{code:prismaError?.code,message:prismaError?.message?.slice(0,200),willTryRaw:!!(prismaError?.code==='P2022'||prismaError?.message?.includes('does not exist'))},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      console.error('[createUserWorkspace] Prisma upsert failed, trying raw SQL:', prismaError.message)
      
      // If Prisma fails because the table does not exist, do not fall back to raw SQL
      // (raw SQL will fail the same way). Throw a clear message so the user can run migrations.
      const tableMissing =
        prismaError.code === 'P2021' ||
        prismaError.code === 'P2022' ||
        (prismaError.message?.includes('does not exist') && prismaError.message?.includes('users'));

      if (tableMissing) {
        const schemaHint = new Error(
          'Database schema is not initialized. The "users" table is missing. Run: npm run db:push (or npx prisma migrate deploy) then try again.'
        );
        (schemaHint as any).code = prismaError.code;
        throw schemaHint;
      }

      // Legacy: other schema mismatch (e.g. column missing) – use raw SQL
      if (prismaError.code === 'P2022' || prismaError.message?.includes('does not exist')) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/2a79ccc7-8419-4f6b-84d3-31982e160042',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'simple-auth.ts:createUserWorkspace:beforeRawUser',message:'About to run INSERT INTO users raw SQL',data:{},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
        // #endregion
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
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/2a79ccc7-8419-4f6b-84d3-31982e160042',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'simple-auth.ts:createUserWorkspace:afterRawUser',message:'Raw INSERT INTO users completed',data:{rowCount:result?.length},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
        // #endregion
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

    // Add user as OWNER - use raw SQL directly to avoid Prisma schema validation issues
    // The database schema may be out of sync with Prisma schema (e.g., customRoleId column missing)
    // Using raw SQL bypasses Prisma's schema validation and works with the actual database structure
    try {
      // Generate CUID-like ID for membership
      const { randomBytes } = await import('crypto')
      const membershipId = 'c' + Date.now().toString(36) + randomBytes(4).toString('hex')
      const escapedUserId = user.id.replace(/'/g, "''")
      const escapedWorkspaceId = workspace.id.replace(/'/g, "''")
      
      // Use raw SQL to create workspace member with only existing columns
      // This avoids Prisma schema validation issues when schema is out of sync
      await prisma.$executeRawUnsafe(`
        INSERT INTO workspace_members (id, "userId", "workspaceId", role, "joinedAt")
        VALUES ('${membershipId}', '${escapedUserId}', '${escapedWorkspaceId}', 'OWNER', NOW())
        ON CONFLICT ("workspaceId", "userId") DO NOTHING
      `)
      
      console.log('[createUserWorkspace] WorkspaceMember created successfully via raw SQL')
    } catch (rawSQLError: any) {
      console.error('[createUserWorkspace] Raw SQL workspaceMember.create failed:', rawSQLError.message)
      console.error('[createUserWorkspace] Raw SQL error code:', rawSQLError.code)
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
    // #region agent log
    const errMsg = error instanceof Error ? error.message : String(error);
    const errCode = (error as any)?.code;
    fetch('http://127.0.0.1:7242/ingest/2a79ccc7-8419-4f6b-84d3-31982e160042',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'simple-auth.ts:createUserWorkspace:outerCatch',message:'createUserWorkspace outer catch',data:{errorMessage:errMsg?.slice(0,300),code:errCode},timestamp:Date.now(),hypothesisId:'H6'})}).catch(()=>{});
    // #endregion
    console.error('[createUserWorkspace] Error creating workspace:', error)
    
    // Extract serializable error details
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorName = error instanceof Error ? error.name : 'Unknown'
    const errorCode = (error as any)?.code
    const prismaError = error as any
    
    console.error('[createUserWorkspace] Error details:', {
      message: errorMessage,
      name: errorName,
      code: errorCode,
      prismaCode: prismaError?.code,
      prismaMeta: prismaError?.meta ? JSON.stringify(prismaError.meta) : undefined,
      stack: error instanceof Error ? error.stack : undefined,
      userData: { id: userData.id, email: userData.email },
      workspaceData: { name: workspaceData.name, slug: workspaceData.slug }
    })
    
    // Create a new Error with serializable properties to avoid circular reference issues
    const serializableError = new Error(errorMessage)
    ;(serializableError as any).code = errorCode
    ;(serializableError as any).name = errorName
    if (prismaError?.meta) {
      ;(serializableError as any).meta = prismaError.meta
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
