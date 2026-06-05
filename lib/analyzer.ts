import { parse } from '@babel/parser'

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export type AttackChain = {
  entry: string
  entryEvidence?: string
  sink: string
  sinkEvidence?: string
  impact: string
  location: string
}

export type Finding = {
  id: string
  file: string
  line: number
  severity: Severity
  title: string
  matched: string
  code: string
  context: string
  securityStory?: string[]
  storyConfidence?: 'Low' | 'Medium' | 'High'
  scenario?: string
  attackChain?: AttackChain
}

export type ImportMeta = {
  source: string
  alias: string | null
  type: 'default' | 'namespace' | 'named' | 'require' | 'side-effect' | 'unknown'
  line: number
  specifiers: string[]
}

export type ExportMeta = {
  name: string
  line: number
  type: 'default' | 'named' | 'module.exports' | 'exports' | 'unknown'
  alias?: string | null
}

export type FunctionMeta = {
  name: string
  line: number
  params: string[]
  exported: boolean
  calls: string[]
  isAsync: boolean
  isArrow: boolean
  type: 'function' | 'arrow' | 'method' | 'unknown'
}

export type ClassMeta = {
  name: string
  line: number
  extends?: string
  exported: boolean
  methods: string[]
}

export type FrameworkHint = {
  framework: string
  confidence: number
  reason: string[]
}

export type ComplexityMetrics = {
  linesOfCode: number
  functionCount: number
  classCount: number
  importCount: number
  exportCount: number
}

export type CallEdge = {
  caller: string
  callee: string
  type: 'call' | 'method' | 'constructor' | 'unknown'
}

export type FileMetadata = {
  filePath: string
  fileType: string
  imports: ImportMeta[]
  exports: ExportMeta[]
  functions: FunctionMeta[]
  classes: ClassMeta[]
  callGraph: CallEdge[]
  frameworkHints: FrameworkHint[]
  findings: string[]
  modulePurpose: string
  responsibilities: string[]
  confidence: number
  metrics: ComplexityMetrics
  entryPoints: string[]
  dependencies: string[]
}

export type ModuleSummary = {
  purpose: string
  files: string[]
  fileCount: number
  findingCount: number
  topFindings: string[]
  dependencies: string[]
  frameworks: string[]
  riskScore: number
}

export type RepoSummary = {
  fileCount: number
  scannedFileCount: number
  findingCount: number
  severityCounts: Record<Severity, number>
  riskScore: number
  modules: ModuleSummary[]
  hotspots: Array<{ file: string; count: number; riskScore: number }>
  frameworks: string[]
  dependencies: string[]
}

export type AnalysisResult = {
  findings: Finding[]
  metadata: FileMetadata[]
  repoSummary: RepoSummary
}

export type CompactAiPayload = {
  repo: Pick<RepoSummary, 'fileCount' | 'scannedFileCount' | 'findingCount' | 'severityCounts' | 'riskScore' | 'frameworks' | 'hotspots'>
  modules: Array<Pick<ModuleSummary, 'purpose' | 'fileCount' | 'findingCount' | 'topFindings' | 'dependencies' | 'frameworks' | 'riskScore'>>
  files: Array<{
    path: string
    purpose: string
    risk: number
    metrics: ComplexityMetrics
    entryPoints: string[]
    frameworks: string[]
    dependencies: string[]
    findings: Array<Pick<Finding, 'title' | 'severity' | 'line' | 'code'>>
  }>
}

type Pattern = {
  type: string
  severity: Severity
  regex: RegExp
}

const ALLOWED_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.py', '.php', '.c', '.cpp', '.h', '.hpp', '.java', '.cs'
])

const IGNORED_PATH_SEGMENTS = ['node_modules/', '.git/', 'dist/', 'build/', 'vendor/']

const EXTENSION_PATTERN_MAP: Record<string, string[]> = {
  '.js': ['Hardcoded Secret', 'JS/TS Command Injection', 'JS/TS Command Injection (shell:true)', 'JS/TS Command Injection (template literal)', 'JS/TS Dynamic Evaluation', 'JS/TS Insecure InnerHTML', 'JS/TS Insecure InnerHTML (dangerouslySetInnerHTML)', 'JS/TS Insecure InnerHTML (document.write)', 'JS/TS Prototype Pollution'],
  '.jsx': ['Hardcoded Secret', 'JS/TS Command Injection', 'JS/TS Command Injection (shell:true)', 'JS/TS Command Injection (template literal)', 'JS/TS Dynamic Evaluation', 'JS/TS Insecure InnerHTML', 'JS/TS Insecure InnerHTML (dangerouslySetInnerHTML)', 'JS/TS Insecure InnerHTML (document.write)', 'JS/TS Prototype Pollution'],
  '.ts': ['Hardcoded Secret', 'JS/TS Command Injection', 'JS/TS Command Injection (shell:true)', 'JS/TS Command Injection (template literal)', 'JS/TS Dynamic Evaluation', 'JS/TS Insecure InnerHTML', 'JS/TS Insecure InnerHTML (dangerouslySetInnerHTML)', 'JS/TS Insecure InnerHTML (document.write)', 'JS/TS Prototype Pollution'],
  '.tsx': ['Hardcoded Secret', 'JS/TS Command Injection', 'JS/TS Command Injection (shell:true)', 'JS/TS Command Injection (template literal)', 'JS/TS Dynamic Evaluation', 'JS/TS Insecure InnerHTML', 'JS/TS Insecure InnerHTML (dangerouslySetInnerHTML)', 'JS/TS Insecure InnerHTML (document.write)', 'JS/TS Prototype Pollution'],
  '.py': ['Hardcoded Secret', 'Python Command Injection', 'Python Command Injection (shell=True)', 'Python Insecure Deserialization', 'Python Insecure Deserialization (PyYAML)', 'Python Dynamic Evaluation', 'Python SQL Injection Risk', 'Python SSTI Risk', 'Python Path Traversal'],
  '.php': ['Hardcoded Secret', 'PHP Command Injection', 'PHP SQL Injection Risk', 'PHP SQL Injection Risk (user input)', 'PHP Local File Inclusion', 'PHP Variable Injection', 'PHP Insecure Deserialization', 'PHP Dynamic Evaluation'],
  '.c': ['Hardcoded Secret', 'C/C++ Buffer Overflow Risk', 'C/C++ Format String', 'C/C++ Integer Overflow Risk'],
  '.cpp': ['Hardcoded Secret', 'C/C++ Buffer Overflow Risk', 'C/C++ Format String', 'C/C++ Integer Overflow Risk'],
  '.h': ['Hardcoded Secret', 'C/C++ Buffer Overflow Risk', 'C/C++ Format String'],
  '.hpp': ['Hardcoded Secret', 'C/C++ Buffer Overflow Risk', 'C/C++ Format String'],
  '.java': ['Hardcoded Secret', 'Java/C# Command Injection', 'Java Path Traversal', 'Java SQL Injection Risk'],
  '.cs': ['Hardcoded Secret', 'Java/C# Command Injection', 'C# SQL Injection Risk', 'C# Path Traversal']
}

const patterns: Pattern[] = [
  { type: 'Hardcoded Secret', severity: 'HIGH', regex: /\b(?:secret|password|api[_-]?key|token|passwd|private[_-]?key)\s*=\s*['"`]([A-Za-z0-9_\-.~+/]{8,})['"`]/i },
  { type: 'JS/TS Command Injection', severity: 'CRITICAL', regex: /\b(?:exec|execSync|spawn|spawnSync)\s*\(/ },
  { type: 'JS/TS Command Injection (shell:true)', severity: 'CRITICAL', regex: /\bspawn\s*\([^)]*,\s*\{[^}]*shell\s*:\s*true/ },
  { type: 'JS/TS Command Injection (template literal)', severity: 'CRITICAL', regex: /\bexec(?:Sync)?\s*\(\s*`[^`]*\$\{/ },
  { type: 'JS/TS Dynamic Evaluation', severity: 'HIGH', regex: /\beval\s*\(/ },
  { type: 'JS/TS Insecure InnerHTML', severity: 'HIGH', regex: /\.innerHTML\s*=/ },
  { type: 'JS/TS Insecure InnerHTML (dangerouslySetInnerHTML)', severity: 'HIGH', regex: /dangerouslySetInnerHTML\s*=\s*\{\s*\{/ },
  { type: 'JS/TS Insecure InnerHTML (document.write)', severity: 'HIGH', regex: /document\.write\s*\(\s*(?!['"`])[^)]+\)/ },
  { type: 'JS/TS Prototype Pollution', severity: 'HIGH', regex: /\[['"`]__proto__['"`]\]|constructor\s*\[['"`]prototype['"`]\]/ },
  { type: 'Python Command Injection', severity: 'CRITICAL', regex: /\b(?:os\.system|subprocess\.(?:Popen|run|call))\s*\(/ },
  { type: 'Python Command Injection (shell=True)', severity: 'CRITICAL', regex: /subprocess\.\w+\s*\([^)]*shell\s*=\s*True/ },
  { type: 'Python Insecure Deserialization', severity: 'CRITICAL', regex: /\bpickle\.loads\s*\(/ },
  { type: 'Python Insecure Deserialization (PyYAML)', severity: 'CRITICAL', regex: /\byaml\.load\s*\((?![^)]*Loader\s*=\s*yaml\.SafeLoader)/ },
  { type: 'Python Dynamic Evaluation', severity: 'HIGH', regex: /\b(?:eval|exec)\s*\(/ },
  { type: 'Python SQL Injection Risk', severity: 'CRITICAL', regex: /\.execute\s*\(\s*(?:f['"`]|['"`][^'"]*%[sd])/ },
  { type: 'Python SSTI Risk', severity: 'HIGH', regex: /\b(?:render_template_string|Environment\b[^)]*\)\.from_string)\s*\(/ },
  { type: 'Python Path Traversal', severity: 'HIGH', regex: /\bopen\s*\(\s*(?:request\.|req\.|os\.path\.join\s*\([^)]*request)/ },
  { type: 'PHP Command Injection', severity: 'CRITICAL', regex: /\b(?:exec|shell_exec|system|passthru|popen)\s*\(/ },
  { type: 'PHP SQL Injection Risk', severity: 'CRITICAL', regex: /\bmysqli_query\s*\(\s*[^,]+,\s*['"`].*\$.*['"`]\s*\)/ },
  { type: 'PHP SQL Injection Risk (user input)', severity: 'CRITICAL', regex: /(?:query|mysqli_query)\s*\([^)]*\$_(?:GET|POST|REQUEST|COOKIE)/ },
  { type: 'PHP Local File Inclusion', severity: 'CRITICAL', regex: /\b(?:include|require)(?:_once)?\s*\(\s*\$/ },
  { type: 'PHP Variable Injection', severity: 'HIGH', regex: /\bextract\s*\(\s*\$_(?:GET|POST|REQUEST|COOKIE)/ },
  { type: 'PHP Insecure Deserialization', severity: 'CRITICAL', regex: /\bunserialize\s*\(\s*\$_(?:GET|POST|REQUEST|COOKIE)/ },
  { type: 'PHP Dynamic Evaluation', severity: 'HIGH', regex: /\b(?:eval|assert)\s*\(/ },
  { type: 'C/C++ Buffer Overflow Risk', severity: 'HIGH', regex: /\b(?:strcpy|strcat|sprintf|gets)\s*\(/ },
  { type: 'C/C++ Format String', severity: 'HIGH', regex: /\b(?:printf|fprintf|sprintf|syslog)\s*\(\s*(?!["'])/ },
  { type: 'C/C++ Integer Overflow Risk', severity: 'MEDIUM', regex: /\bmalloc\s*\(\s*\w+\s*\*\s*\w+\s*\)/ },
  { type: 'Java/C# Command Injection', severity: 'CRITICAL', regex: /\b(?:Runtime\.getRuntime\(\)\.exec|ProcessBuilder|Process\.Start)\s*\(/ },
  { type: 'Java Path Traversal', severity: 'HIGH', regex: /\b(?:new\s+File|Paths\.get|new\s+FileInputStream)\s*\(\s*(?!["'])/ },
  { type: 'Java SQL Injection Risk', severity: 'CRITICAL', regex: /\.execute(?:Query|Update)?\s*\(\s*["'][^"']*["']\s*\+/ },
  { type: 'C# SQL Injection Risk', severity: 'CRITICAL', regex: /new\s+SqlCommand\s*\(\s*(?:["'][^"']*["']\s*\+|\$["'])/ },
  { type: 'C# Path Traversal', severity: 'HIGH', regex: /\b(?:Path\.Combine|File\.Open|File\.ReadAll(?:Text|Bytes))\s*\(\s*(?!["'])/ }
]

export const explanations: Record<string, { why: string; impact: string; fix: string }> = {
  'Hardcoded Secret': { why: 'Secrets in code are exposed in version control and built artifacts.', impact: 'Attackers can reuse leaked credentials to access systems.', fix: 'Move secrets to environment variables or a secrets manager.' },
  'JS/TS Command Injection': { why: 'Shell execution APIs can interpret attacker-controlled strings.', impact: 'A crafted value can execute arbitrary server commands.', fix: 'Use execFile or spawn with fixed commands and argument arrays.' },
  'JS/TS Command Injection (shell:true)': { why: 'shell:true reintroduces shell parsing for spawned processes.', impact: 'Arguments can become command syntax.', fix: 'Remove shell:true and pass discrete arguments.' },
  'JS/TS Command Injection (template literal)': { why: 'Template literals embed input into shell strings.', impact: 'Attackers can append shell metacharacters.', fix: 'Use execFile with argument arrays.' },
  'JS/TS Dynamic Evaluation': { why: 'eval executes arbitrary strings as code.', impact: 'Input can become runtime code execution.', fix: 'Use JSON parsing or explicit dispatch maps.' },
  'JS/TS Insecure InnerHTML': { why: 'innerHTML bypasses output encoding.', impact: 'Unsanitized content can trigger XSS.', fix: 'Use textContent or sanitize HTML before insertion.' },
  'JS/TS Insecure InnerHTML (dangerouslySetInnerHTML)': { why: 'React escaping is bypassed for raw HTML.', impact: 'Unsanitized content can execute scripts.', fix: 'Sanitize with a trusted HTML sanitizer first.' },
  'JS/TS Insecure InnerHTML (document.write)': { why: 'document.write injects raw markup.', impact: 'Attackers can run browser scripts.', fix: 'Use DOM APIs and text nodes instead.' },
  'JS/TS Prototype Pollution': { why: 'Writing prototype keys changes inherited object behavior.', impact: 'Security checks or app logic can be bypassed globally.', fix: 'Block __proto__, constructor, and prototype keys before assignment.' },
  'Python Command Injection': { why: 'Command APIs can execute attacker-controlled strings.', impact: 'A crafted value can run server commands.', fix: 'Pass commands as lists and keep shell=False.' },
  'Python Command Injection (shell=True)': { why: 'shell=True sends the command through a shell.', impact: 'Metacharacters can execute extra commands.', fix: 'Remove shell=True and pass argument arrays.' },
  'Python Insecure Deserialization': { why: 'pickle can execute code during loading.', impact: 'Malicious payloads can run arbitrary code.', fix: 'Use JSON or a safe typed format for untrusted data.' },
  'Python Insecure Deserialization (PyYAML)': { why: 'yaml.load can construct unsafe Python objects.', impact: 'Payloads can trigger code execution.', fix: 'Use yaml.safe_load or SafeLoader.' },
  'Python Dynamic Evaluation': { why: 'eval and exec run strings as Python code.', impact: 'Input can become arbitrary execution.', fix: 'Use parsing, validation, and explicit operations.' },
  'Python SQL Injection Risk': { why: 'Formatted SQL strings mix query code and data.', impact: 'Attackers can alter database queries.', fix: 'Use parameterized queries.' },
  'Python SSTI Risk': { why: 'Rendering user-controlled templates exposes template execution.', impact: 'Attackers can read data or execute server-side behavior.', fix: 'Render fixed templates with escaped variables.' },
  'Python Path Traversal': { why: 'User-controlled paths can escape intended directories.', impact: 'Server files can be disclosed.', fix: 'Normalize paths and enforce an allowlisted base directory.' },
  'PHP Command Injection': { why: 'Shell helpers execute strings in a command context.', impact: 'Attackers can run OS commands.', fix: 'Avoid shell execution or escape arguments with strict allowlists.' },
  'PHP SQL Injection Risk': { why: 'Interpolated SQL mixes input and query syntax.', impact: 'Attackers can read or mutate data.', fix: 'Use prepared statements.' },
  'PHP SQL Injection Risk (user input)': { why: 'Superglobals reach query APIs directly.', impact: 'HTTP input can alter SQL.', fix: 'Validate input and use bound parameters.' },
  'PHP Local File Inclusion': { why: 'Variable include paths load attacker-selected files.', impact: 'Sensitive files or uploaded code can be executed.', fix: 'Map route names to fixed files.' },
  'PHP Variable Injection': { why: 'extract imports request keys into local variables.', impact: 'Attackers can overwrite trusted values.', fix: 'Read explicit request fields.' },
  'PHP Insecure Deserialization': { why: 'unserialize can instantiate attacker-controlled objects.', impact: 'Magic methods can trigger code paths.', fix: 'Use JSON or allowed_classes=false.' },
  'PHP Dynamic Evaluation': { why: 'eval/assert can run strings as PHP code.', impact: 'Input can execute arbitrary code.', fix: 'Use explicit logic instead of dynamic evaluation.' },
  'C/C++ Buffer Overflow Risk': { why: 'Unsafe copy APIs do not enforce buffer length.', impact: 'Memory corruption can crash or compromise the process.', fix: 'Use bounded APIs and validate lengths.' },
  'C/C++ Format String': { why: 'User input as a format string is interpreted by printf-like APIs.', impact: 'Attackers can read or write memory.', fix: 'Use fixed format strings such as "%s".' },
  'C/C++ Integer Overflow Risk': { why: 'Unchecked multiplication can wrap before allocation.', impact: 'A too-small allocation can lead to heap overflow.', fix: 'Check multiplication overflow before allocation.' },
  'Java/C# Command Injection': { why: 'Process creation APIs can run external commands.', impact: 'Attacker input can become command execution.', fix: 'Use fixed commands, strict allowlists, and argument arrays.' },
  'Java Path Traversal': { why: 'User-controlled paths can escape expected roots.', impact: 'Sensitive files can be read.', fix: 'Normalize and verify paths remain under an allowed directory.' },
  'Java SQL Injection Risk': { why: 'String concatenation in SQL mixes code and data.', impact: 'Attackers can modify queries.', fix: 'Use PreparedStatement parameters.' },
  'C# SQL Injection Risk': { why: 'Concatenated SQL command text mixes code and data.', impact: 'Attackers can access or alter database content.', fix: 'Use SqlParameter values.' },
  'C# Path Traversal': { why: 'User-controlled file paths can escape safe directories.', impact: 'Sensitive files can be exposed.', fix: 'Canonicalize and enforce an allowed root.' }
}

const SECURITY_STORIES: Record<string, string[]> = {
  'Hardcoded Secret': ['Source Code', 'Credential exposure', 'Account compromise'],
  'JS/TS Command Injection': ['User Input', 'shell execution', 'Remote Shell Access'],
  'JS/TS Command Injection (shell:true)': ['User Input', 'shell:true', 'Remote Shell Access'],
  'JS/TS Command Injection (template literal)': ['User Input', 'template shell command', 'Remote Shell Access'],
  'JS/TS Dynamic Evaluation': ['User Input', 'eval()', 'Runtime Code Execution'],
  'JS/TS Insecure InnerHTML': ['User Input', 'innerHTML', 'Cross-site Scripting'],
  'JS/TS Insecure InnerHTML (dangerouslySetInnerHTML)': ['User Input', 'dangerouslySetInnerHTML', 'Cross-site Scripting'],
  'JS/TS Insecure InnerHTML (document.write)': ['User Input', 'document.write()', 'Cross-site Scripting'],
  'JS/TS Prototype Pollution': ['User Input', '__proto__ write', 'Prototype Pollution'],
  'Python Command Injection': ['User Input', 'shell execution', 'Remote Shell Access'],
  'Python Command Injection (shell=True)': ['User Input', 'shell=True', 'Remote Shell Access'],
  'Python Insecure Deserialization': ['Serialized Payload', 'pickle.loads()', 'Remote Code Execution'],
  'Python Insecure Deserialization (PyYAML)': ['YAML Payload', 'yaml.load()', 'Remote Code Execution'],
  'Python Dynamic Evaluation': ['User Input', 'eval()/exec()', 'Runtime Code Execution'],
  'Python SQL Injection Risk': ['User Input', 'SQL string formatting', 'Data Exposure'],
  'Python SSTI Risk': ['User Input', 'template render', 'SSTI / RCE'],
  'Python Path Traversal': ['User Input', 'open(path)', 'File Disclosure'],
  'PHP Command Injection': ['User Input', 'shell execution', 'Remote Shell Access'],
  'PHP SQL Injection Risk': ['User Input', 'SQL interpolation', 'Data Exposure'],
  'PHP SQL Injection Risk (user input)': ['HTTP Input', 'SQL query', 'Data Exposure'],
  'PHP Local File Inclusion': ['User Input', 'include($path)', 'File Inclusion'],
  'PHP Variable Injection': ['HTTP Input', 'extract()', 'Variable Overwrite'],
  'PHP Insecure Deserialization': ['User Input', 'unserialize()', 'Object Injection'],
  'PHP Dynamic Evaluation': ['User Input', 'eval()', 'Runtime Code Execution'],
  'C/C++ Buffer Overflow Risk': ['Buffer Data', 'unsafe copy', 'Memory Corruption'],
  'C/C++ Format String': ['User Input', 'printf(userInput)', 'Memory Read/Write'],
  'C/C++ Integer Overflow Risk': ['Size Input', 'malloc(a*b)', 'Heap Overflow'],
  'Java/C# Command Injection': ['User Input', 'process start', 'Remote Shell Access'],
  'Java Path Traversal': ['User Input', 'new File(path)', 'File Disclosure'],
  'Java SQL Injection Risk': ['User Input', 'SQL concatenation', 'Data Exposure'],
  'C# SQL Injection Risk': ['User Input', 'SqlCommand', 'Data Exposure'],
  'C# Path Traversal': ['User Input', 'File.Open(path)', 'File Disclosure']
}

const SOURCE_PATTERNS: Array<{ regex: RegExp; label: (m: RegExpMatchArray) => string }> = [
  { regex: /\b(req\.body\.[A-Za-z0-9_]+)/, label: m => m[1] },
  { regex: /\b(req\.query\.[A-Za-z0-9_]+)/, label: m => m[1] },
  { regex: /\b(req\.params\.[A-Za-z0-9_]+)/, label: m => m[1] },
  { regex: /\b(process\.env\.[A-Za-z0-9_]+)/, label: m => m[1] },
  { regex: /\b(request\.args(?:\[[^\]]+\]|\.get\([^)]+\)))/, label: m => m[1] },
  { regex: /\b(request\.form(?:\[[^\]]+\]|\.get\([^)]+\)))/, label: m => m[1] },
  { regex: /\b(request\.json(?:\[[^\]]+\])?)/, label: m => m[1] },
  { regex: /(\$_(?:GET|POST|REQUEST|COOKIE)\[[^\]]+\])/, label: m => m[1] },
  { regex: /\b(Request\.(?:Query|Form|Params)\[[^\]]+\])/, label: m => m[1] },
  { regex: /\b(request\.getParameter\([^)]+\))/, label: m => m[1] }
]

const severityWeights: Record<Severity, number> = { CRITICAL: 10, HIGH: 5, MEDIUM: 2, LOW: 1 }

function normalizeItems<T>(items: Array<T | null | undefined>) {
  return Array.from(new Set(items.filter(Boolean) as T[]))
}

function getFileType(path: string) {
  const dotIndex = path.lastIndexOf('.')
  return dotIndex === -1 ? 'unknown' : path.slice(dotIndex).toLowerCase()
}

function shouldAnalyzeFile(filePath: string) {
  const normalized = filePath.toLowerCase().replace(/\\/g, '/')
  if (IGNORED_PATH_SEGMENTS.some(segment => normalized.includes(segment))) return false
  return ALLOWED_EXTENSIONS.has(getFileType(normalized))
}

function getPatternsForFile(filePath: string) {
  const allowedSet = new Set(EXTENSION_PATTERN_MAP[getFileType(filePath)] ?? [])
  return patterns.filter(pattern => allowedSet.has(pattern.type))
}

function formatCodeSnippet(line: string, maxLength = 120) {
  const trimmed = line.trim()
  return trimmed.length > maxLength ? `${trimmed.substring(0, maxLength)}... [truncated]` : trimmed
}

function isCommentLine(line: string) {
  const trimmed = line.trimStart()
  return trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('--') || trimmed.startsWith('{#') || trimmed.startsWith('<!--')
}

function findConcreteSource(text: string) {
  for (const sourcePattern of SOURCE_PATTERNS) {
    const match = text.match(sourcePattern.regex)
    if (match) return sourcePattern.label(match)
  }
  return null
}

function simplifySourceDescription(source: string | null) {
  if (!source) return { entry: 'User Input', evidence: undefined }
  if (/req\.query|request\.args|Request\.Query/i.test(source)) return { entry: 'User Input', evidence: 'query parameter' }
  if (/req\.body|request\.json|request\.form/i.test(source)) return { entry: 'User Input', evidence: 'request body' }
  if (/req\.params|Request\.Params|request\.getParameter/i.test(source)) return { entry: 'User Input', evidence: 'route parameter' }
  if (/process\.env/i.test(source)) return { entry: 'Environment Input', evidence: 'environment variable' }
  if (/\$_GET/i.test(source)) return { entry: 'User Input', evidence: 'GET parameter' }
  if (/\$_POST/i.test(source)) return { entry: 'User Input', evidence: 'POST parameter' }
  if (/\$_REQUEST/i.test(source)) return { entry: 'User Input', evidence: 'request parameter' }
  if (/\$_COOKIE/i.test(source)) return { entry: 'User Input', evidence: 'cookie value' }
  return { entry: 'User Input', evidence: source }
}

function extractSinkEvidence(matched: string) {
  const match = matched.match(/\b(subprocess\.\w+|dangerouslySetInnerHTML|document\.write|yaml\.load|pickle\.loads|unserialize|mysqli_query|new\s+SqlCommand|Path\.Combine|File\.Open|Runtime\.getRuntime\(\)\.exec|ProcessBuilder|Process\.Start|exec|spawn|shell_exec|system|passthru|popen|eval|assert)\b/i)
  return match ? match[1] : undefined
}

function inferConfidence(title: string, source: string | null, contextSnippet: string): 'Low' | 'Medium' | 'High' {
  if (source) return 'High'
  const contextMatch = contextSnippet.match(/(?:function\b[^{(]*|def\s+\w+|void\s+\w+|public\s+\w+\s+\w+)\s*\(([^)]+)\)/)
  if (contextMatch) return 'Medium'
  if (title === 'Hardcoded Secret' || title.includes('Insecure Deserialization') || title.includes('Local File Inclusion')) return 'Medium'
  return 'Low'
}

function buildScenario(story: string[], title: string, sourceLabel: string | null) {
  const sink = story[1] ?? title
  const outcome = story[story.length - 1] ?? 'potential impact'
  const source = sourceLabel ?? 'an unvalidated input'
  if (/exec|Process|shell|spawn/i.test(sink)) return `An attacker supplies a crafted value through ${source}. That value reaches ${sink} without validation, enabling attacker-controlled shell commands.`
  if (/eval|Runtime/i.test(sink)) return `An attacker supplies a crafted value through ${source}. The value flows into ${sink}, allowing attacker-controlled code execution.`
  if (/innerHTML|document\.write|dangerously|XSS/i.test(`${sink} ${outcome}`)) return `An attacker supplies HTML or script through ${source}. It is rendered through ${sink}, enabling cross-site scripting.`
  if (/SQL|Data Exposure/i.test(`${sink} ${outcome}`)) return `An attacker supplies a crafted value through ${source}. It is embedded in SQL via ${sink}, exposing or modifying data.`
  if (/pickle|yaml\.load|unserialize|Arbitrary|Remote Code/i.test(`${sink} ${outcome}`)) return `An attacker supplies a malicious payload through ${source}. Deserialization through ${sink} can execute attacker-controlled behavior.`
  if (/File|open\(|include/i.test(`${sink} ${outcome}`)) return `An attacker supplies a path through ${source}. The application opens it through ${sink}, potentially exposing server files.`
  return `An attacker supplies a crafted value through ${source}. It reaches ${sink} without validation, creating ${outcome.toLowerCase()}.`
}

function buildSecurityStory(title: string, matched: string, context: string, file: string, line: number) {
  const source = findConcreteSource(context) || findConcreteSource(matched)
  const story = [...(SECURITY_STORIES[title] ?? ['User Input', title, 'Potential Impact'])]
  if (source) story[0] = source
  const entry = simplifySourceDescription(source)
  const attackChain = {
    entry: entry.entry,
    entryEvidence: entry.evidence,
    sink: story[1] ?? title,
    sinkEvidence: extractSinkEvidence(matched),
    impact: story[2] ?? 'Potential Impact',
    location: `${file}:${line}`
  }
  return {
    securityStory: story,
    storyConfidence: inferConfidence(title, source, context),
    scenario: buildScenario(story, title, source),
    attackChain
  }
}

function parseSource(content: string, filePath: string) {
  const plugins = filePath.endsWith('.ts') || filePath.endsWith('.tsx')
    ? ['typescript', 'jsx', 'classProperties', 'exportDefaultFrom', 'exportNamespaceFrom', 'dynamicImport', 'optionalChaining', 'nullishCoalescingOperator', 'decorators-legacy']
    : ['jsx', 'classProperties', 'exportDefaultFrom', 'exportNamespaceFrom', 'dynamicImport', 'optionalChaining', 'nullishCoalescingOperator', 'decorators-legacy']

  try {
    return parse(content, { sourceType: 'module', plugins: plugins as any[], allowReturnOutsideFunction: true, errorRecovery: true })
  } catch {
    try {
      return parse(content, { sourceType: 'script', plugins: plugins as any[], allowReturnOutsideFunction: true, errorRecovery: true })
    } catch {
      return null
    }
  }
}

function isObjectWithType(value: unknown): value is { type: string } {
  return typeof value === 'object' && value !== null && 'type' in value
}

function visit(node: any, visitors: Record<string, (node: any, state: any) => void>, state: any) {
  if (!node || typeof node !== 'object') return
  visitors[node.type]?.(node, state)
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'start' || key === 'end') continue
    const value = node[key]
    const childState = { ...state, parent: node, enclosingClass: node.type === 'ClassDeclaration' && node.id?.name ? node.id.name : state.enclosingClass }
    if (Array.isArray(value)) value.forEach(child => isObjectWithType(child) && visit(child, visitors, childState))
    else if (isObjectWithType(value)) visit(value, visitors, childState)
  }
}

function extractParamNames(params: any[]) {
  return params.map(param => {
    if (!param) return ''
    if (param.type === 'Identifier') return param.name
    if (param.type === 'AssignmentPattern' && param.left.type === 'Identifier') return param.left.name
    if (param.type === 'RestElement' && param.argument.type === 'Identifier') return `...${param.argument.name}`
    if (param.type === 'ObjectPattern') return '{...}'
    if (param.type === 'ArrayPattern') return '[...]'
    return ''
  }).filter(Boolean)
}

function getCalleeName(callee: any) {
  if (!callee) return null
  if (callee.type === 'Identifier') return callee.name
  if (callee.type === 'MemberExpression') {
    if (callee.property?.type === 'Identifier') return callee.property.name
    if (callee.property?.type === 'StringLiteral') return String(callee.property.value)
  }
  return null
}

function normalizePathName(source: string) {
  return source.replace(/\.tsx?$|\.jsx?$/i, '').replace(/^\.\//, '').replace(/^\//, '')
}

function addFrameworkHint(map: Map<string, FrameworkHint>, framework: string, confidence: number, reason: string) {
  const existing = map.get(framework)
  if (!existing) {
    map.set(framework, { framework, confidence, reason: [reason] })
    return
  }
  existing.reason = normalizeItems([...existing.reason, reason])
  existing.confidence = Math.min(1, existing.confidence + confidence * 0.6)
}

function inferFileRole(filePath: string, content: string, imports: ImportMeta[], frameworkHints: FrameworkHint[], entryPoints: string[]) {
  const name = filePath.toLowerCase()
  const lower = content.toLowerCase()
  const hasJwt = imports.some(i => i.source.includes('jsonwebtoken')) || /\bjwt\b/.test(lower)
  const hasBcrypt = imports.some(i => i.source.includes('bcrypt'))
  const hasExpress = frameworkHints.some(h => h.framework === 'Express')
  const hasReact = frameworkHints.some(h => h.framework === 'React')
  if (name.includes('auth') || name.includes('login') || name.includes('session') || hasJwt || hasBcrypt || /\btoken\b/.test(lower)) return 'Authentication Module'
  if (name.includes('controller') || name.includes('route') || (hasExpress && /\brouter\b/.test(lower))) return 'API Controller'
  if (name.includes('service') || /\bservice\b/.test(lower)) return 'Service Layer'
  if (name.includes('repository') || name.includes('repo') || /\bschema\b|\bmodel\b/.test(lower)) return 'Data Access Layer'
  if (hasReact || name.endsWith('.tsx') || name.endsWith('.jsx') || /\buseState\b|\buseEffect\b/.test(content)) return 'UI Component'
  if (entryPoints.some(ep => /login|auth|signup/i.test(ep))) return 'Authentication Module'
  return 'General Utility'
}

function inferResponsibilities(modulePurpose: string, imports: ImportMeta[], frameworkHints: FrameworkHint[]) {
  const responsibilities: string[] = []
  if (modulePurpose === 'Authentication Module') responsibilities.push('User Authentication', 'Session Validation')
  if (modulePurpose === 'Data Access Layer') responsibilities.push('Data Modeling', 'Query Execution', 'Schema Management')
  if (modulePurpose === 'API Controller') responsibilities.push('Request Handling', 'Response Formatting', 'Routing')
  if (modulePurpose === 'Service Layer') responsibilities.push('Business Logic', 'Orchestration', 'Error Handling')
  if (modulePurpose === 'UI Component') responsibilities.push('UI Rendering', 'State Management', 'Event Handling')
  if (modulePurpose === 'General Utility') responsibilities.push('Helper Functions', 'Shared Logic')
  if (imports.some(i => i.source.includes('express')) && !responsibilities.includes('Routing')) responsibilities.push('Routing')
  if (frameworkHints.some(h => h.framework === 'Next.js')) responsibilities.push('Page Rendering')
  return normalizeItems(responsibilities)
}

function scanSecurityFindings(file: string, content: string) {
  const findings: Finding[] = []
  if (!shouldAnalyzeFile(file)) return findings
  const filePatterns = getPatternsForFile(file)
  if (!filePatterns.length) return findings
  const lines = content.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.includes('scan-ignore') || isCommentLine(line)) continue
    for (const pattern of filePatterns) {
      pattern.regex.lastIndex = 0
      const match = pattern.regex.exec(line)
      if (!match) continue
      const context = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join('\n')
      const matched = match[0].trim()
      findings.push({
        id: `${file}:${i + 1}:${pattern.type}:${matched}`,
        file,
        line: i + 1,
        severity: pattern.severity,
        title: pattern.type,
        matched,
        code: formatCodeSnippet(line),
        context,
        ...buildSecurityStory(pattern.type, matched, context, file, i + 1)
      })
      break
    }
  }
  return findings
}

function buildFileMetadata(filePath: string, content: string, findings: Finding[]): FileMetadata {
  const ast = parseSource(content, filePath)
  const imports: ImportMeta[] = []
  const exports: ExportMeta[] = []
  const functions: FunctionMeta[] = []
  const classes: ClassMeta[] = []
  const callEdges = new Set<string>()
  const entryPoints = new Set<string>()
  const dependencies = new Set<string>()
  const frameworkHintsMap = new Map<string, FrameworkHint>()
  const exportedNames = new Set<string>()
  const scopeStack: string[] = ['root']

  const addFunction = (meta: FunctionMeta) => {
    const existing = functions.find(fn => fn.name === meta.name)
    if (existing) {
      existing.exported = existing.exported || meta.exported
      existing.calls = normalizeItems([...existing.calls, ...meta.calls])
      return
    }
    functions.push(meta)
  }
  const addClass = (meta: ClassMeta) => {
    const existing = classes.find(cls => cls.name === meta.name)
    if (existing) {
      existing.exported = existing.exported || meta.exported
      existing.methods = normalizeItems([...existing.methods, ...meta.methods])
      return
    }
    classes.push(meta)
  }
  const addEdge = (caller: string, callee: string, type: CallEdge['type'] = 'call') => {
    if (caller && callee && caller !== callee) callEdges.add(`${caller}::${callee}::${type}`)
  }
  const recordDependency = (source: string) => {
    if (source.startsWith('.') || source.startsWith('/')) dependencies.add(normalizePathName(source))
  }
  const recordImportFramework = (source: string, mode: 'import' | 'require') => {
    const frameworkPatterns: Record<string, { name: string; confidence: number }> = {
      express: { name: 'Express', confidence: 0.4 },
      react: { name: 'React', confidence: 0.4 },
      next: { name: 'Next.js', confidence: 0.4 },
      mongoose: { name: 'Mongoose', confidence: 0.4 },
      axios: { name: 'Axios', confidence: 0.4 },
      jsonwebtoken: { name: 'jsonwebtoken', confidence: 0.5 },
      bcrypt: { name: 'bcrypt', confidence: 0.5 },
      sequelize: { name: 'Sequelize', confidence: 0.4 }
    }
    for (const [pattern, info] of Object.entries(frameworkPatterns)) {
      if (source.includes(pattern)) addFrameworkHint(frameworkHintsMap, info.name, info.confidence, `${pattern} ${mode}`)
    }
  }

  if (ast) {
    visit(ast, {
      ImportDeclaration(node: any) {
        const source = node.source.value
        const line = node.loc?.start?.line ?? 0
        const specifiers: string[] = []
        let type: ImportMeta['type'] = 'side-effect'
        let alias: string | null = null
        for (const specifier of node.specifiers) {
          if (specifier.type === 'ImportDefaultSpecifier') {
            type = 'default'
            alias = specifier.local.name
            specifiers.push(specifier.local.name)
          } else if (specifier.type === 'ImportNamespaceSpecifier') {
            type = 'namespace'
            alias = specifier.local.name
            specifiers.push('*')
          } else if (specifier.type === 'ImportSpecifier') {
            if (type === 'side-effect') type = 'named'
            specifiers.push(specifier.imported.name)
            alias = alias || specifier.local.name
          }
        }
        imports.push({ source, alias, type, line, specifiers })
        recordDependency(source)
        recordImportFramework(source, 'import')
      },
      VariableDeclarator(node: any) {
        if (node.init?.type === 'CallExpression' && node.init.callee.type === 'Identifier' && node.init.callee.name === 'require' && node.init.arguments.length) {
          const arg = node.init.arguments[0]
          if (arg?.type === 'StringLiteral') {
            const source = arg.value
            const specifiers = node.id.type === 'Identifier' ? [node.id.name] : node.id.properties?.map((prop: any) => prop.key?.name).filter(Boolean) ?? []
            imports.push({ source, alias: node.id.type === 'Identifier' ? node.id.name : null, type: 'require', line: node.loc?.start?.line ?? 0, specifiers })
            recordDependency(source)
            recordImportFramework(source, 'require')
          }
        }
      },
      ExportNamedDeclaration(node: any) {
        const declaration = node.declaration
        if (declaration?.id?.name) exportedNames.add(declaration.id.name)
        if (declaration?.type === 'FunctionDeclaration' && declaration.id?.name) {
          exports.push({ name: declaration.id.name, line: declaration.loc?.start?.line ?? 0, type: 'named' })
          addFunction({ name: declaration.id.name, line: declaration.loc?.start?.line ?? 0, params: extractParamNames(declaration.params), exported: true, calls: [], isAsync: declaration.async || false, isArrow: false, type: 'function' })
        }
        if (declaration?.type === 'ClassDeclaration' && declaration.id?.name) {
          exports.push({ name: declaration.id.name, line: declaration.loc?.start?.line ?? 0, type: 'named' })
          addClass({ name: declaration.id.name, line: declaration.loc?.start?.line ?? 0, extends: declaration.superClass?.name, exported: true, methods: [] })
        }
        for (const specifier of node.specifiers ?? []) {
          if (specifier.exported?.name) exports.push({ name: specifier.exported.name, line: specifier.loc?.start?.line ?? 0, type: 'named', alias: specifier.local?.name ?? null })
        }
      },
      ExportDefaultDeclaration(node: any) {
        const declaration = node.declaration
        const name = declaration?.id?.name ?? declaration?.name ?? 'default'
        exports.push({ name, line: declaration?.loc?.start?.line ?? node.loc?.start?.line ?? 0, type: 'default' })
        entryPoints.add(name)
      },
      FunctionDeclaration(node: any) {
        if (!node.id?.name) return
        addFunction({ name: node.id.name, line: node.loc?.start?.line ?? 0, params: extractParamNames(node.params), exported: exportedNames.has(node.id.name), calls: [], isAsync: node.async || false, isArrow: false, type: 'function' })
      },
      ArrowFunctionExpression(node: any, state: any) {
        if (state.parent?.type === 'VariableDeclarator' && state.parent.id?.name) {
          addFunction({ name: state.parent.id.name, line: state.parent.loc?.start?.line ?? 0, params: extractParamNames(node.params), exported: exportedNames.has(state.parent.id.name), calls: [], isAsync: node.async || false, isArrow: true, type: 'arrow' })
        }
      },
      FunctionExpression(node: any, state: any) {
        if (state.parent?.type === 'VariableDeclarator' && state.parent.id?.name) {
          addFunction({ name: state.parent.id.name, line: state.parent.loc?.start?.line ?? 0, params: extractParamNames(node.params), exported: exportedNames.has(state.parent.id.name), calls: [], isAsync: node.async || false, isArrow: false, type: 'function' })
        }
      },
      ClassDeclaration(node: any) {
        if (node.id?.name) addClass({ name: node.id.name, line: node.loc?.start?.line ?? 0, extends: node.superClass?.name, exported: exportedNames.has(node.id.name), methods: [] })
      },
      ClassMethod(node: any, state: any) {
        if (!state.enclosingClass || !node.key?.name) return
        const cls = classes.find(item => item.name === state.enclosingClass)
        if (cls && !cls.methods.includes(node.key.name)) cls.methods.push(node.key.name)
        addFunction({ name: `${state.enclosingClass}.${node.key.name}`, line: node.loc?.start?.line ?? 0, params: extractParamNames(node.params), exported: false, calls: [], isAsync: node.async || false, isArrow: false, type: 'method' })
      },
      CallExpression(node: any) {
        const caller = scopeStack[scopeStack.length - 1] || 'root'
        const calleeName = getCalleeName(node.callee)
        if (calleeName) addEdge(caller, calleeName, 'call')
        if (node.callee.type === 'MemberExpression' && node.callee.property?.name) {
          const method = node.callee.property.name
          const objectName = node.callee.object?.name
          if ((objectName === 'router' || objectName === 'app') && ['get', 'post', 'put', 'delete', 'patch', 'use'].includes(method)) {
            const handler = node.arguments[1] || node.arguments[0]
            if (handler?.type === 'Identifier') entryPoints.add(handler.name)
            addFrameworkHint(frameworkHintsMap, 'Express', 0.2, `router.${method} usage`)
          }
        }
      }
    }, { parent: null, enclosingClass: null })
  }

  const callGraph = Array.from(callEdges).map(edge => {
    const [caller, callee, type] = edge.split('::')
    return { caller, callee, type: (type as CallEdge['type']) || 'unknown' }
  })
  for (const edge of callGraph) {
    const fn = functions.find(item => item.name === edge.caller)
    if (fn) fn.calls = normalizeItems([...fn.calls, edge.callee])
  }

  const frameworkHints = Array.from(frameworkHintsMap.values())
  const modulePurpose = inferFileRole(filePath, content, imports, frameworkHints, Array.from(entryPoints))
  return {
    filePath,
    fileType: getFileType(filePath),
    imports,
    exports,
    functions,
    classes,
    callGraph,
    frameworkHints,
    findings: normalizeItems(findings.map(finding => finding.title)),
    modulePurpose,
    responsibilities: inferResponsibilities(modulePurpose, imports, frameworkHints),
    confidence: Math.min(100, 40 + Math.min(50, imports.length * 8 + functions.length * 4 + frameworkHintsMap.size * 6)),
    metrics: {
      linesOfCode: content.split(/\r?\n/).filter(line => line.trim()).length,
      functionCount: functions.length,
      classCount: classes.length,
      importCount: imports.length,
      exportCount: exports.length
    },
    entryPoints: Array.from(entryPoints),
    dependencies: Array.from(dependencies)
  }
}

export function analyzeFiles(files: Array<{ file: string; content: string }>): AnalysisResult {
  const metadata: FileMetadata[] = []
  const findings: Finding[] = []
  for (const { file, content } of files) {
    if (!file || !content || !shouldAnalyzeFile(file)) continue
    const fileFindings = scanSecurityFindings(file, content)
    findings.push(...fileFindings)
    metadata.push(buildFileMetadata(file, content, fileFindings))
  }
  return { findings, metadata, repoSummary: buildRepoSummary(metadata, findings, files.length) }
}

export function buildRepoSummary(metadata: FileMetadata[], findings: Finding[], fileCount = metadata.length): RepoSummary {
  const severityCounts: Record<Severity, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
  findings.forEach(finding => { severityCounts[finding.severity] += 1 })
  const riskScore = findings.reduce((sum, finding) => sum + severityWeights[finding.severity], 0)
  const findingsByFile = new Map<string, Finding[]>()
  findings.forEach(finding => findingsByFile.set(finding.file, [...(findingsByFile.get(finding.file) ?? []), finding]))

  const modules = Array.from(metadata.reduce((map, file) => {
    const current = map.get(file.modulePurpose) ?? { files: [] as FileMetadata[], findings: [] as Finding[] }
    current.files.push(file)
    current.findings.push(...(findingsByFile.get(file.filePath) ?? []))
    map.set(file.modulePurpose, current)
    return map
  }, new Map<string, { files: FileMetadata[]; findings: Finding[] }>()).entries()).map(([purpose, group]) => ({
    purpose,
    files: group.files.map(file => file.filePath),
    fileCount: group.files.length,
    findingCount: group.findings.length,
    topFindings: normalizeItems(group.findings.map(finding => finding.title)).slice(0, 5),
    dependencies: normalizeItems(group.files.flatMap(file => file.dependencies)).slice(0, 8),
    frameworks: normalizeItems(group.files.flatMap(file => file.frameworkHints.map(hint => hint.framework))).slice(0, 8),
    riskScore: group.findings.reduce((sum, finding) => sum + severityWeights[finding.severity], 0)
  })).sort((a, b) => b.riskScore - a.riskScore || b.findingCount - a.findingCount)

  const hotspots = Array.from(findingsByFile.entries()).map(([file, fileFindings]) => ({
    file,
    count: fileFindings.length,
    riskScore: fileFindings.reduce((sum, finding) => sum + severityWeights[finding.severity], 0)
  })).sort((a, b) => b.riskScore - a.riskScore).slice(0, 5)

  return {
    fileCount,
    scannedFileCount: metadata.length,
    findingCount: findings.length,
    severityCounts,
    riskScore,
    modules,
    hotspots,
    frameworks: normalizeItems(metadata.flatMap(file => file.frameworkHints.map(hint => hint.framework))).slice(0, 12),
    dependencies: normalizeItems(metadata.flatMap(file => file.dependencies)).slice(0, 20)
  }
}

export function buildCompactAiPayload(result: AnalysisResult): CompactAiPayload {
  const findingsByFile = new Map<string, Finding[]>()
  result.findings.forEach(finding => findingsByFile.set(finding.file, [...(findingsByFile.get(finding.file) ?? []), finding]))
  return {
    repo: {
      fileCount: result.repoSummary.fileCount,
      scannedFileCount: result.repoSummary.scannedFileCount,
      findingCount: result.repoSummary.findingCount,
      severityCounts: result.repoSummary.severityCounts,
      riskScore: result.repoSummary.riskScore,
      frameworks: result.repoSummary.frameworks,
      hotspots: result.repoSummary.hotspots
    },
    modules: result.repoSummary.modules.slice(0, 8).map(module => ({
      purpose: module.purpose,
      fileCount: module.fileCount,
      findingCount: module.findingCount,
      topFindings: module.topFindings,
      dependencies: module.dependencies.slice(0, 5),
      frameworks: module.frameworks.slice(0, 5),
      riskScore: module.riskScore
    })),
    files: result.metadata.slice(0, 25).map(file => ({
      path: file.filePath,
      purpose: file.modulePurpose,
      risk: (findingsByFile.get(file.filePath) ?? []).reduce((sum, finding) => sum + severityWeights[finding.severity], 0),
      metrics: file.metrics,
      entryPoints: file.entryPoints.slice(0, 5),
      frameworks: file.frameworkHints.map(hint => hint.framework).slice(0, 5),
      dependencies: file.dependencies.slice(0, 5),
      findings: (findingsByFile.get(file.filePath) ?? []).slice(0, 8).map(finding => ({
        title: finding.title,
        severity: finding.severity,
        line: finding.line,
        code: finding.code
      }))
    }))
  }
}
