// /lib/github.ts

/* GitHub free token usage: 
*  1 request to fetch the repo metadata
*  + 1 request to fetch the tree
*  + 1 request per file content (up to 40 files) 
*  = up to 40 requests per full scan.
*/

const GITHUB_API = 'https://api.github.com'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

/* Parse GitHub URLs in the format: https://github.com/owner/repo
 *  Takes a string input, attempts to parse it as a URL, checks if the hostname is github.com, and
 *  then extracts the owner and repository name from the path segments.
 *  If the URL is valid and matches the expected format, it returns an object containing the owner and repo.
 *  Otherwise, it returns null.
 */
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

/* Making authenticated requests to the GitHub API.
 *  It sets the headers, including the Accept header for GitHub's API versioning and the User-Agent header.
 *  If a GITHUB_TOKEN is provided in the environment variables,
 *    it adds an Authorization header with the token.
 *  The function then performs the fetch request and checks if the response is successful.
 *  If not, it reads the response body
 *    and throws an error with details about the failure, including any rate limit information if applicable.
 *  If the request is successful,
 *    it returns the parsed JSON response.
 */ 
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


/* Fetching the repository tree.
 *  Takes the owner and repository name as parameters, retrieves the default branch, and
 *  then fetches the tree structure of the repository recursively.
 *  It filters the tree to return only file paths (blobs) and returns an array of those paths.
 */
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

/* Fetch the content of the specific file. 
 *  It constructs the API URL using the owner, repository name, and file path, 
 *  makes an authenticated request to retrieve the file content, 
 *  checks if the content is encoded in base64,
 *    decodes it, and returns the content as a UTF-8 string. 
 *    If the content cannot be decoded, it throws an error.
 */
export async function getFileContent(owner: string, repo: string, path: string) {
  const contentData = await fetchJson(`${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`)

  if (typeof contentData.content !== 'string' || contentData.encoding !== 'base64') {
    throw new Error('Unable to decode file content')
  }

  return Buffer.from(contentData.content, 'base64').toString('utf8')
}
