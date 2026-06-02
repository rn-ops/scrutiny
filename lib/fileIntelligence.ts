import { Finding } from '@/lib/scanner'

export type FileIntelligence = {
  filePath: string
  fileType: string
  imports: string[]
  exports: string[]
  functions: string[]
  classes: string[]
  callGraph: Array<{ caller: string; callee: string }>
  frameworkHints: string[]
  findings: string[]
  modulePurpose: string
  responsibilities: string[]
  confidence: number
}

function normalizeItems(items: Array<string | null | undefined>) {
  return Array.from(new Set(items.filter(Boolean).map(item => item!.trim())))
}

function getFileType(path: string) {
  const ext = path.slice(path.lastIndexOf('.'))
  return ext || 'unknown'
}

function extractImports(content: string) {
  const imports: string[] = []
  const importRegex = /import\s+(?:[^'"\n]+\s+from\s+)?['"]([^'"]+)['"]/g
  const requireRegex = /require\(['"]([^'"]+)['"]\)/g

  let match: RegExpExecArray | null
  while ((match = importRegex.exec(content))) {
    imports.push(match[1])
  }
  while ((match = requireRegex.exec(content))) {
    imports.push(match[1])
  }
  return normalizeItems(imports)
}

function extractExports(content: string) {
  const exports: string[] = []
  const exportRegex = /export\s+(?:default\s+)?(?:const|let|var|function|class)\s+([A-Za-z_\$][A-Za-z0-9_\$]*)/g
  const moduleExportsRegex = /module\.exports\s*=\s*([A-Za-z_\$][A-Za-z0-9_\$]*)/g
  const exportsMemberRegex = /exports\.([A-Za-z_\$][A-Za-z0-9_\$]*)\s*=/g

  let match: RegExpExecArray | null
  while ((match = exportRegex.exec(content))) {
    exports.push(match[1])
  }
  while ((match = moduleExportsRegex.exec(content))) {
    exports.push(match[1])
  }
  while ((match = exportsMemberRegex.exec(content))) {
    exports.push(match[1])
  }
  return normalizeItems(exports)
}

function extractFunctions(content: string) {
  const names: string[] = []
  const functionRegex = /(?:async\s+)?function\s+([A-Za-z_\$][A-Za-z0-9_\$]*)\s*\(/g
  const arrowRegex = /(?:const|let|var)\s+([A-Za-z_\$][A-Za-z0-9_\$]*)\s*=\s*(?:async\s*)?(?:\([^\)]*\)|[A-Za-z_\$][A-Za-z0-9_\$]*)\s*=>/g
  const methodRegex = /([A-Za-z_\$][A-Za-z0-9_\$]*)\s*\([^\)]*\)\s*\{/g

  let match: RegExpExecArray | null
  while ((match = functionRegex.exec(content))) {
    names.push(match[1])
  }
  while ((match = arrowRegex.exec(content))) {
    names.push(match[1])
  }

  const lines = content.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('function') || trimmed.startsWith('class') || trimmed.startsWith('if') || trimmed.startsWith('for') || trimmed.startsWith('while')) {
      continue
    }
    const methodMatch = methodRegex.exec(line)
    if (methodMatch) {
      const name = methodMatch[1]
      if (!name.startsWith('if') && !name.startsWith('for') && !name.startsWith('while')) {
        names.push(name)
      }
    }
  }

  return normalizeItems(names)
}

function extractClasses(content: string) {
  const classes: string[] = []
  const classRegex = /class\s+([A-Za-z_\$][A-Za-z0-9_\$]*)/g
  let match: RegExpExecArray | null
  while ((match = classRegex.exec(content))) {
    classes.push(match[1])
  }
  return normalizeItems(classes)
}

function detectFrameworkHints(content: string, imports: string[]) {
  const hints = new Set<string>()
  const normalized = content.toLowerCase()

  if (imports.some(i => i.includes('express')) || /\bexpress\b/.test(normalized)) hints.add('Express')
  if (imports.some(i => i === 'react' || i.includes('react/')) || /\buseState\b|\buseEffect\b/.test(content)) hints.add('React')
  if (imports.some(i => i.includes('next')) || /\bnext\b/.test(normalized)) hints.add('Next.js')
  if (imports.some(i => i.includes('mongoose')) || /\bmongoose\b/.test(normalized)) hints.add('Mongoose')
  if (imports.some(i => i.includes('axios')) || /\baxios\b/.test(normalized)) hints.add('Axios')
  if (imports.some(i => i.includes('jsonwebtoken')) || /\bjsonwebtoken\b/.test(normalized) || /\bjwt\b/.test(normalized)) hints.add('jsonwebtoken')
  if (imports.some(i => i.includes('bcrypt')) || /\bbcrypt\b/.test(normalized)) hints.add('bcrypt')
  if (imports.some(i => i.includes('sequelize')) || /\bsequelize\b/.test(normalized)) hints.add('Sequelize')
  if (/\bhttp\b/.test(normalized)) hints.add('HTTP')

  return Array.from(hints)
}

function buildCallGraph(content: string, functions: string[]) {
  const edges = new Set<string>()
  const lines = content.split(/\r?\n/)
  let currentFn = 'root'
  const functionDecl = /(?:async\s+)?function\s+([A-Za-z_\$][A-Za-z0-9_\$]*)\s*\(|(?:const|let|var)\s+([A-Za-z_\$][A-Za-z0-9_\$]*)\s*=\s*(?:async\s*)?(?:\([^\)]*\)|[A-Za-z_\$][A-Za-z0-9_\$]*)\s*=>/g

  for (const line of lines) {
    const decl = functionDecl.exec(line)
    functionDecl.lastIndex = 0
    if (decl) {
      const name = decl[1] || decl[2]
      if (name) currentFn = name
      continue
    }

    for (const fn of functions) {
      if (fn === currentFn) continue
      const callRegex = new RegExp(`\\b${fn}\\s*\\(`)
      if (callRegex.test(line)) {
        edges.add(`${currentFn}::${fn}`)
      }
    }
  }

  return Array.from(edges).map(edge => {
    const [caller, callee] = edge.split('::')
    return { caller, callee }
  })
}

function inferModulePurpose(filePath: string, content: string, imports: string[], frameworkHints: string[]) {
  const name = filePath.toLowerCase()
  const lower = content.toLowerCase()

  if ((imports.some(i => i.includes('jsonwebtoken')) || /\bjwt\b/.test(lower) || /\btoken\b/.test(lower)) && /\blogin\b|\bauth\b|\bsignup\b/.test(lower)) {
    return 'Authentication Module'
  }
  if (imports.some(i => i.includes('bcrypt')) && /\blogin\b|\buser\b|\bpassword\b/.test(lower)) {
    return 'Authentication Module'
  }
  if (imports.some(i => i.includes('mongoose')) || /\bschema\b/.test(lower) || /\bmodel\b/.test(lower)) {
    return 'Database Layer'
  }
  if (frameworkHints.includes('Express') && /\brouter\b|\brequest\b|\bresponse\b|\bhandler\b/.test(lower)) {
    return 'API Controller'
  }
  if (imports.some(i => i.includes('axios')) || /\bfetch\b/.test(lower) || /\brequest\b/.test(lower)) {
    return 'External API Client'
  }
  if (frameworkHints.includes('React') || /\buseState\b|\buseEffect\b/.test(content)) {
    return 'React Component'
  }
  if (name.includes('auth') || name.includes('login') || name.includes('session')) {
    return 'Authentication Module'
  }
  if (name.includes('service') || name.includes('client')) {
    return 'Service Layer'
  }
  if (name.includes('controller') || name.includes('route')) {
    return 'API Controller'
  }

  return 'General Utility'
}

function inferResponsibilities(modulePurpose: string, imports: string[], content: string[]) {
  const responsibilities: string[] = []

  if (modulePurpose === 'Authentication Module') {
    responsibilities.push('User Authentication')
    responsibilities.push('Session Validation')
    if (imports.some(i => i.includes('bcrypt'))) responsibilities.push('Password Verification')
    if (imports.some(i => i.includes('jsonwebtoken'))) responsibilities.push('Token Generation')
    if (imports.some(i => i.includes('jsonwebtoken'))) responsibilities.push('Token Validation')
  }
  if (modulePurpose === 'Database Layer') {
    responsibilities.push('Data Modeling')
    responsibilities.push('Query Execution')
    responsibilities.push('Schema Management')
  }
  if (modulePurpose === 'API Controller') {
    responsibilities.push('Request Handling')
    responsibilities.push('Response Formatting')
    responsibilities.push('Routing')
  }
  if (modulePurpose === 'External API Client') {
    responsibilities.push('External Request Orchestration')
    responsibilities.push('Response Parsing')
    responsibilities.push('Retry/Error Handling')
  }
  if (modulePurpose === 'React Component') {
    responsibilities.push('UI Rendering')
    responsibilities.push('State Management')
    responsibilities.push('Event Handling')
  }
  if (modulePurpose === 'General Utility') {
    responsibilities.push('Helper Functions')
    responsibilities.push('Shared Logic')
  }

  if (imports.some(i => i.includes('express')) && !responsibilities.includes('Routing')) {
    responsibilities.push('Routing')
  }

  return normalizeItems(responsibilities)
}

export function buildFileIntelligence(filePath: string | null, content: string, findings: Finding[]) {
  if (!filePath || !content) return null

  const fileType = getFileType(filePath)
  const imports = extractImports(content)
  const exports = extractExports(content)
  const functions = extractFunctions(content)
  const classes = extractClasses(content)
  const callGraph = buildCallGraph(content, functions)
  const frameworkHints = detectFrameworkHints(content, imports)
  const findingsTitles = normalizeItems(findings.map(f => f.title))
  const modulePurpose = inferModulePurpose(filePath, content, imports, frameworkHints)
  const responsibilities = inferResponsibilities(modulePurpose, imports, content.split(/\r?\n/))
  const confidence = Math.min(100, 40 + Math.min(50, imports.length * 8 + functions.length * 4 + frameworkHints.length * 6))

  return {
    filePath,
    fileType,
    imports,
    exports,
    functions,
    classes,
    callGraph,
    frameworkHints,
    findings: findingsTitles,
    modulePurpose,
    responsibilities,
    confidence
  }
}
