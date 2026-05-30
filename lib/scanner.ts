export type Pattern = {
  type: string
  severity: string
  search?: string
  regex?: RegExp
}

export type Finding = {
  file: string
  line: number
  severity: string
  title: string
  matched: string
}

export const patterns: Pattern[] = [
  { type: 'Command Injection', severity: 'CRITICAL', search: 'exec(' },
  { type: 'Dynamic Evaluation', severity: 'HIGH', search: 'eval(' },
  { type: 'Hardcoded Secret', severity: 'HIGH', regex: /secret/i, search: 'secret' },
  { type: 'Hardcoded Secret', severity: 'HIGH', regex: /password/i, search: 'password' },
  { type: 'Hardcoded Secret', severity: 'HIGH', regex: /api[_-]?key/i, search: 'api_key' },
  { type: 'Hardcoded Secret', severity: 'HIGH', regex: /token/i, search: 'token' }
]

function matchPattern(text: string, pattern: Pattern): string | null {
  if (pattern.regex) {
    const match = text.match(pattern.regex)
    return match ? match[0] : null
  }

  if (pattern.search && text.includes(pattern.search)) {
    return pattern.search
  }

  return null
}

export function scanFiles(files: Array<{ file: string; content: string }>): Finding[] {
  const findings: Finding[] = []

  files.forEach(({ file, content }) => {
    const lines = content.split('\n')

    lines.forEach((line, index) => {
      patterns.forEach((pattern) => {
        const matched = matchPattern(line, pattern)
        if (matched) {
          findings.push({
            file,
            line: index + 1,
            severity: pattern.severity,
            title: pattern.type,
            matched
          })
        }
      })
    })
  })

  return findings
}
