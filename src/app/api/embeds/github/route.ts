import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { handleApiError } from '@/lib/api-errors'
import { EmbedUrlSchema } from '@/lib/validations/embeds'

export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['MEMBER'] })

    const body = EmbedUrlSchema.parse(await request.json())
    const { url } = body

    // Extract owner and repo from GitHub URL
    const githubMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (!githubMatch) {
      return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 })
    }

    const [, owner, repo] = githubMatch
    const isIssue = url.includes('/issues/')
    const isPullRequest = url.includes('/pull/')
    const isFile = url.includes('/blob/')

    let embedData: {
      title: string
      description: string
      thumbnail?: string
      metadata: {
        owner: string
        repo: string
        type: string
        number?: string
        path?: string
      }
    } = {
      title: `${owner}/${repo}`,
      description: 'GitHub repository',
      thumbnail: `https://github.com/${owner}/${repo}/raw/main/README.md`,
      metadata: {
        owner,
        repo,
        type: 'repository'
      }
    }

    if (isIssue) {
      const issueNumber = url.match(/issues\/(\d+)/)?.[1]
      embedData = {
        title: `Issue #${issueNumber}`,
        description: `GitHub issue in ${owner}/${repo}`,
        metadata: {
          owner,
          repo,
          number: issueNumber,
          type: 'issue'
        }
      }
    } else if (isPullRequest) {
      const prNumber = url.match(/pull\/(\d+)/)?.[1]
      embedData = {
        title: `Pull Request #${prNumber}`,
        description: `GitHub pull request in ${owner}/${repo}`,
        metadata: {
          owner,
          repo,
          number: prNumber,
          type: 'pull_request'
        }
      }
    } else if (isFile) {
      const filePath = url.match(/blob\/[^\/]+\/(.+)/)?.[1]
      embedData = {
        title: filePath || 'GitHub file',
        description: `File in ${owner}/${repo}`,
        metadata: {
          owner,
          repo,
          path: filePath,
          type: 'file'
        }
      }
    }

    return NextResponse.json(embedData)
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
