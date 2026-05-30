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
  code: string
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

export const explanations: Record<string, { why: string; impact: string; fix: string }> = {
  'Command Injection': {
    why: 'exec() allows running shell commands directly. User input in these commands is dangerous.',
    impact: 'Attackers can execute arbitrary system commands, potentially compromising your entire system.',
    fix: 'Avoid exec(). Use safe APIs (child_process.execFile) with arguments array, never shell=true.'
  },
  'Dynamic Evaluation': {
    why: 'eval() executes code as a string. This is extremely dangerous with user input.',
    impact: 'Any data passed to eval() can execute malicious code with full application privileges.',
    fix: 'Never use eval(). Use JSON.parse() for data, Function() constructor only with sanitized input, or refactor.'
  },
  'Hardcoded Secret': {
    why: 'Secrets (API keys, passwords, tokens) in code are exposed in version control and built artifacts.',
    impact: 'Attackers can use leaked credentials to impersonate your app, access data, or cause damage.',
    fix: 'Move secrets to environment variables or a secrets manager. Add them to .gitignore. Rotate any exposed keys.'
  }
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
            matched,
            code: line.trim()
          })
        }
      })
    })
  })

  return findings
}
