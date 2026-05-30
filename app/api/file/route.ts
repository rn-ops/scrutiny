import { NextRequest, NextResponse } from 'next/server'
import { getFileContent, parseGithubRepoUrl } from '@/lib/github'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const repoUrl = body?.url
  const path = body?.path

  if (typeof repoUrl !== 'string' || !repoUrl.trim()) {
    return NextResponse.json(
      { success: false, message: 'Missing repository URL' },
      { status: 400 }
    )
  }

  if (typeof path !== 'string' || !path.trim()) {
    return NextResponse.json(
      { success: false, message: 'Missing file path' },
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
    const content = await getFileContent(repo.owner, repo.repo, path)
    return NextResponse.json({ success: true, path, content })
  } catch (error) {
    console.error('File route error:', error)
    return NextResponse.json(
      { success: false, message: 'Unable to fetch file content' },
      { status: 502 }
    )
  }
}
