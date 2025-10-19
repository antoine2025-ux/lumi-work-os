import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Extract owner and repo from GitHub URL
    const githubMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (!githubMatch) {
      return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 })
    }

    const [, owner, repo] = githubMatch
    const isIssue = url.includes('/issues/')
    const isPullRequest = url.includes('/pull/')
    const isFile = url.includes('/blob/')

    // For now, we'll return basic metadata
    // In a real implementation, you'd call GitHub's API to get repository/issue/PR details
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
  } catch (error) {
    console.error('GitHub embed error:', error)
    return NextResponse.json({ error: 'Failed to process GitHub embed' }, { status: 500 })
  }
}
