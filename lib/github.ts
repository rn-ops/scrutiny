const GITHUB_API = 'https://api.github.com'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

export function parseGithubRepoUrl(value: string) {
  try {
    const parsed = new URL(value)
    const host = parsed.hostname.toLowerCase()
    if (host !== 'github.com' && host !== 'www.github.com') {
      return null
    }

    const segments = parsed.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/')
    if (segments.length < 2) {
      return null
    }

    const [owner, repo] = segments
    return { owner, repo }
  } catch {
    return null
  }
}

async function fetchJson(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/vnd.github+json')
  headers.set('User-Agent', 'Scrutiny')

  if (typeof GITHUB_TOKEN === 'string' && GITHUB_TOKEN.trim()) {
    headers.set('Authorization', `Bearer ${GITHUB_TOKEN}`)
  }

  const response = await fetch(url, { ...options, headers })
  if (!response.ok) {
    const body = await response.text()
    const rateLimitRemaining = response.headers.get('x-ratelimit-remaining')
    const rateLimitMessage = response.status === 403 && rateLimitRemaining === '0'
      ? ' GitHub API rate limit appears to be exceeded. Set a valid GITHUB_TOKEN in your environment to continue.'
      : ''

    throw new Error(
      `GitHub API request failed: ${response.status} ${response.statusText}.${rateLimitMessage} ${body}`.trim()
    )
  }

  return response.json()
}

export async function fetchRepoTree(owner: string, repo: string) {
  const repoMetadata = await fetchJson(`${GITHUB_API}/repos/${owner}/${repo}`)
  const branch = repoMetadata.default_branch || 'main'
  const treeData = await fetchJson(`${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`)

  if (!Array.isArray(treeData.tree)) {
    throw new Error('Unexpected repository tree format')
  }

  return treeData.tree
    .filter((entry: any) => entry.type === 'blob' && typeof entry.path === 'string')
    .map((entry: any) => entry.path)
}

export async function getFileContent(owner: string, repo: string, path: string) {
  const contentData = await fetchJson(`${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`)

  if (typeof contentData.content !== 'string' || contentData.encoding !== 'base64') {
    throw new Error('Unable to decode file content')
  }

  return Buffer.from(contentData.content, 'base64').toString('utf8')
}
