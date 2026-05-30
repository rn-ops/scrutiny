// lib/scanner.ts

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type Pattern = {
  type: string
  severity: Severity
  // Using explicit regex with capture groups ensures high accuracy
  regex: RegExp
}

export type Finding = {
  file: string
  line: number
  severity: Severity
  title: string
  matched: string
  code: string
  context: string // context is for later if i decide to send it to the AI
}

export const patterns: Pattern[] = [
  // False Positive: Word boundaries (\b) prevent false positives on terms 
  // like "execute" or "evaluator"
  { type: 'Command Injection', severity: 'CRITICAL', regex: /\bexec\s*\(/ },
  { type: 'Dynamic Evaluation', severity: 'HIGH', regex: /\beval\s*\(/ },
  // Only hardcoded values: Assignment regex checks ensure we only catch actual hardcoded values
  // e.g., const token = "xyz"
  { type: 'Hardcoded Secret', severity: 'HIGH', regex: /\b(?:secret|password|api[_-]?key|token)\s*=\s*['"`][^'"`]{4,}['"`]/i }
]

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

/**
 * Truncation for large files: Cleanly truncates massive lines (like minified files) to keep reports scannable.
 */
function formatCodeSnippet(line: string, maxLength = 120): string {
  const trimmed = line.trim()
  return trimmed.length > maxLength 
    ? `${trimmed.substring(0, maxLength)}... [truncated]` 
    : trimmed
}

export function scanFiles(files: Array<{ file: string; content: string }>): Finding[] {
  const findings: Finding[] = []

  // Optimization: Classic for loops outperform forEach over large files
  // Though the main bottlenecks are GitHub API, Network, Gemini & UI rendering.
  for (let f = 0; f < files.length; f++) {
    const { file, content } = files[f]
    
    // Fallback split handles both Windows (\r\n) and Unix (\n) line endings cleanly
    const lines = content.split(/\r?\n/)

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Scan Ignore Feature: Allow developers to skip lines using inline comments
      if (line.includes('scan-ignore')) {
        continue
      }

      for (let p = 0; p < patterns.length; p++) {
        const pattern = patterns[p]
        
        // Reset regex index state for safety
        pattern.regex.lastIndex = 0 
        const match = pattern.regex.exec(line)

        if (match) {
          // Generates a 5-line sliding context window centering the current line
          // Why? Because later: exec(userInput) is weak alone 
          // But:
          // const userInput = req.body.cmd 
          // exec(userInput)
          // is more informative for the AI to understand the risk and provide better recommendations
          // + And if I use Gemini later, I can send finding.context instead of the whole file content
          const contextSnippet = lines
            .slice(
              Math.max(0, i - 2),
              Math.min(lines.length, i + 3)
            )
            .join('\n')

          findings.push({
            file,
            line: i + 1,
            severity: pattern.severity,
            title: pattern.type,
            matched: match[0].trim(),
            code: formatCodeSnippet(line),
            context: contextSnippet
          })
          
          break 
        }
      }
    }
  }

  return findings
}
