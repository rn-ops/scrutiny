import { NextRequest, NextResponse } from 'next/server'
import { fetchRepoTree, parseGithubRepoUrl } from '@/lib/github'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const repoUrl = body?.url

  if (typeof repoUrl !== 'string' || !repoUrl.trim()) {
    return NextResponse.json(
      { success: false, message: 'Missing repository URL' },
      { status: 400 }
    )
  }

  const repo = parseGithubRepoUrl(repoUrl.trim())
  if (!repo) {
    return NextResponse.json(
      { success: false, message: 'Invalid GitHub repository URL' },
      { status: 400 }
    )
  }

  try {
    const files = await fetchRepoTree(repo.owner, repo.repo)
    return NextResponse.json({ success: true, files })
  } catch (error) {
    console.error('Scan route error:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Unable to fetch repository files' },
      { status: 502 }
    )
  }
}
