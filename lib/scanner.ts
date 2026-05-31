// lib/scanner.ts

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type Pattern = {
  type: string
  severity: Severity
  regex: RegExp
}

export type Finding = {
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
}

// ─────────────────────────────────────────────
// FILE FILTERING
// ─────────────────────────────────────────────

const ALLOWED_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx',
  '.py', '.php', '.c', '.cpp',
  '.h', '.hpp', '.java', '.cs'
]);

const IGNORED_PATH_SEGMENTS = [
  'node_modules/',
  '.git/',
  'dist/',
  'build/',
  'vendor/'
];

// ─────────────────────────────────────────────
// LANGUAGE → PATTERN ROUTING
// Maps each file extension to the pattern types that apply to it.
// This prevents cross-language false positives (e.g. PHP patterns firing on C files).
// ─────────────────────────────────────────────

const EXTENSION_PATTERN_MAP: Record<string, string[]> = {
  '.js': [
    'Hardcoded Secret',
    'JS/TS Command Injection',
    'JS/TS Command Injection (shell:true)',
    'JS/TS Command Injection (template literal)',
    'JS/TS Dynamic Evaluation',
    'JS/TS Insecure InnerHTML',
    'JS/TS Insecure InnerHTML (dangerouslySetInnerHTML)',
    'JS/TS Insecure InnerHTML (document.write)',
    'JS/TS Prototype Pollution',
  ],
  '.jsx': [
    'Hardcoded Secret',
    'JS/TS Command Injection',
    'JS/TS Command Injection (shell:true)',
    'JS/TS Command Injection (template literal)',
    'JS/TS Dynamic Evaluation',
    'JS/TS Insecure InnerHTML',
    'JS/TS Insecure InnerHTML (dangerouslySetInnerHTML)',
    'JS/TS Insecure InnerHTML (document.write)',
    'JS/TS Prototype Pollution',
  ],
  '.ts': [
    'Hardcoded Secret',
    'JS/TS Command Injection',
    'JS/TS Command Injection (shell:true)',
    'JS/TS Command Injection (template literal)',
    'JS/TS Dynamic Evaluation',
    'JS/TS Insecure InnerHTML',
    'JS/TS Insecure InnerHTML (dangerouslySetInnerHTML)',
    'JS/TS Insecure InnerHTML (document.write)',
    'JS/TS Prototype Pollution',
  ],
  '.tsx': [
    'Hardcoded Secret',
    'JS/TS Command Injection',
    'JS/TS Command Injection (shell:true)',
    'JS/TS Command Injection (template literal)',
    'JS/TS Dynamic Evaluation',
    'JS/TS Insecure InnerHTML',
    'JS/TS Insecure InnerHTML (dangerouslySetInnerHTML)',
    'JS/TS Insecure InnerHTML (document.write)',
    'JS/TS Prototype Pollution',
  ],
  '.py': [
    'Hardcoded Secret',
    'Python Command Injection',
    'Python Command Injection (shell=True)',
    'Python Insecure Deserialization',
    'Python Insecure Deserialization (PyYAML)',
    'Python Dynamic Evaluation',
    'Python SQL Injection Risk',
    'Python SSTI Risk',
    'Python Path Traversal',
  ],
  '.php': [
    'Hardcoded Secret',
    'PHP Command Injection',
    'PHP SQL Injection Risk',
    'PHP SQL Injection Risk (user input)',
    'PHP Local File Inclusion',
    'PHP Variable Injection',
    'PHP Insecure Deserialization',
    'PHP Dynamic Evaluation',
  ],
  '.c': [
    'Hardcoded Secret',
    'C/C++ Buffer Overflow Risk',
    'C/C++ Format String',
    'C/C++ Integer Overflow Risk',
  ],
  '.cpp': [
    'Hardcoded Secret',
    'C/C++ Buffer Overflow Risk',
    'C/C++ Format String',
    'C/C++ Integer Overflow Risk',
  ],
  '.h': [
    'Hardcoded Secret',
    'C/C++ Buffer Overflow Risk',
    'C/C++ Format String',
  ],
  '.hpp': [
    'Hardcoded Secret',
    'C/C++ Buffer Overflow Risk',
    'C/C++ Format String',
  ],
  '.java': [
    'Hardcoded Secret',
    'Java/C# Command Injection',
    'Java Path Traversal',
    'Java SQL Injection Risk',
  ],
  '.cs': [
    'Hardcoded Secret',
    'Java/C# Command Injection',
    'C# SQL Injection Risk',
    'C# Path Traversal',
  ],
};

// ─────────────────────────────────────────────
// PATTERNS
// ─────────────────────────────────────────────

export const patterns: Pattern[] = [

  // ── Universal ──────────────────────────────
  {
    type: 'Hardcoded Secret',
    severity: 'HIGH',
    regex: /\b(?:secret|password|api[_-]?key|token|passwd|private[_-]?key)\s*=\s*['"`]([A-Za-z0-9_\-\.\~\+\/]{8,})['"`]/i
  },

  // ── JavaScript / TypeScript ─────────────────
  {
    type: 'JS/TS Command Injection',
    severity: 'CRITICAL',
    regex: /\b(?:exec|execSync|spawn|spawnSync)\s*\(/
  },
  {
    // spawn(..., { shell: true }) — the most commonly missed real-world pattern
    type: 'JS/TS Command Injection (shell:true)',
    severity: 'CRITICAL',
    regex: /\bspawn\s*\([^)]*,\s*\{[^}]*shell\s*:\s*true/
  },
  {
    // exec(`rm -rf ${userInput}`) — template literal injection
    type: 'JS/TS Command Injection (template literal)',
    severity: 'CRITICAL',
    regex: /\bexec(?:Sync)?\s*\(\s*`[^`]*\$\{/
  },
  {
    type: 'JS/TS Dynamic Evaluation',
    severity: 'HIGH',
    regex: /\beval\s*\(/
  },
  {
    type: 'JS/TS Insecure InnerHTML',
    severity: 'HIGH',
    regex: /\.innerHTML\s*=/
  },
  {
    // React-specific: dangerouslySetInnerHTML={{ __html: ... }}
    type: 'JS/TS Insecure InnerHTML (dangerouslySetInnerHTML)',
    severity: 'HIGH',
    regex: /dangerouslySetInnerHTML\s*=\s*\{\s*\{/
  },
  {
    // document.write with a variable (not a string literal)
    type: 'JS/TS Insecure InnerHTML (document.write)',
    severity: 'HIGH',
    regex: /document\.write\s*\(\s*(?!['"`])[^)]+\)/
  },
  {
    // obj['__proto__'] or Object.assign({}, untrusted)
    type: 'JS/TS Prototype Pollution',
    severity: 'HIGH',
    regex: /\[['"`]__proto__['"`]\]|constructor\s*\[['"`]prototype['"`]\]/
  },

  // ── Python ─────────────────────────────────
  {
    type: 'Python Command Injection',
    severity: 'CRITICAL',
    regex: /\b(?:os\.system|subprocess\.(?:Popen|run|call))\s*\(/
  },
  {
    // subprocess.run(..., shell=True) — the most common real-world mistake
    type: 'Python Command Injection (shell=True)',
    severity: 'CRITICAL',
    regex: /subprocess\.\w+\s*\([^)]*shell\s*=\s*True/
  },
  {
    type: 'Python Insecure Deserialization',
    severity: 'CRITICAL',
    regex: /\bpickle\.loads\s*\(/
  },
  {
    // yaml.load() without SafeLoader executes arbitrary Python
    type: 'Python Insecure Deserialization (PyYAML)',
    severity: 'CRITICAL',
    regex: /\byaml\.load\s*\((?![^)]*Loader\s*=\s*yaml\.SafeLoader)/
  },
  {
    type: 'Python Dynamic Evaluation',
    severity: 'HIGH',
    regex: /\b(?:eval|exec)\s*\(/
  },
  {
    // cursor.execute("SELECT ... %s" % var) or f"SELECT ... {var}"
    type: 'Python SQL Injection Risk',
    severity: 'CRITICAL',
    regex: /\.execute\s*\(\s*(?:f['"`]|['"`][^'"]*%[sd])/
  },
  {
    // render_template_string(user_input) or Environment().from_string(user_input)
    type: 'Python SSTI Risk',
    severity: 'HIGH',
    regex: /\b(?:render_template_string|Environment\b[^)]*\)\.from_string)\s*\(/
  },
  {
    // open(request.args['path']) — path traversal
    type: 'Python Path Traversal',
    severity: 'HIGH',
    regex: /\bopen\s*\(\s*(?:request\.|req\.|os\.path\.join\s*\([^)]*request)/
  },

  // ── PHP ────────────────────────────────────
  {
    type: 'PHP Command Injection',
    severity: 'CRITICAL',
    regex: /\b(?:exec|shell_exec|system|passthru|popen)\s*\(/
  },
  {
    // mysqli_query($conn, "SELECT ... $var") — original pattern
    type: 'PHP SQL Injection Risk',
    severity: 'CRITICAL',
    regex: /\bmysqli_query\s*\(\s*[^,]+,\s*['"`].*\$.*['"`]\s*\)/
  },
  {
    // query($_GET['x']) or execute with $_POST directly
    type: 'PHP SQL Injection Risk (user input)',
    severity: 'CRITICAL',
    regex: /(?:query|mysqli_query)\s*\([^)]*\$_(?:GET|POST|REQUEST|COOKIE)/
  },
  {
    // include($page) or require($_GET['file']) — local file inclusion
    type: 'PHP Local File Inclusion',
    severity: 'CRITICAL',
    regex: /\b(?:include|require)(?:_once)?\s*\(\s*\$/
  },
  {
    // extract($_POST) — injects arbitrary variables into scope
    type: 'PHP Variable Injection',
    severity: 'HIGH',
    regex: /\bextract\s*\(\s*\$_(?:GET|POST|REQUEST|COOKIE)/
  },
  {
    // unserialize($_COOKIE['data']) — object injection / RCE
    type: 'PHP Insecure Deserialization',
    severity: 'CRITICAL',
    regex: /\bunserialize\s*\(\s*\$_(?:GET|POST|REQUEST|COOKIE)/
  },
  {
    type: 'PHP Dynamic Evaluation',
    severity: 'HIGH',
    regex: /\b(?:eval|assert)\s*\(/
  },

  // ── C / C++ ────────────────────────────────
  {
    type: 'C/C++ Buffer Overflow Risk',
    severity: 'HIGH',
    regex: /\b(?:strcpy|strcat|sprintf|gets)\s*\(/
  },
  {
    // printf(userInput) — format string vulnerability
    type: 'C/C++ Format String',
    severity: 'HIGH',
    regex: /\b(?:printf|fprintf|sprintf|syslog)\s*\(\s*(?!["'])/
  },
  {
    // malloc(a * b) without overflow check
    type: 'C/C++ Integer Overflow Risk',
    severity: 'MEDIUM',
    regex: /\bmalloc\s*\(\s*\w+\s*\*\s*\w+\s*\)/
  },

  // ── Java ───────────────────────────────────
  {
    type: 'Java/C# Command Injection',
    severity: 'CRITICAL',
    regex: /\b(?:Runtime\.getRuntime\(\)\.exec|ProcessBuilder|Process\.Start)\s*\(/
  },
  {
    // new File(userInput) or Paths.get(userInput) — path traversal
    type: 'Java Path Traversal',
    severity: 'HIGH',
    regex: /\b(?:new\s+File|Paths\.get|new\s+FileInputStream)\s*\(\s*(?!["'])/
  },
  {
    // Statement.execute("SELECT ... " + userInput)
    type: 'Java SQL Injection Risk',
    severity: 'CRITICAL',
    regex: /\.execute(?:Query|Update)?\s*\(\s*["'][^"']*["']\s*\+/
  },

  // ── C# ─────────────────────────────────────
  {
    // SqlCommand("SELECT ... " + userInput)
    type: 'C# SQL Injection Risk',
    severity: 'CRITICAL',
    regex: /new\s+SqlCommand\s*\(\s*(?:["'][^"']*["']\s*\+|\$["'])/
  },
  {
    // Path.Combine or File.Open with user-controlled variable
    type: 'C# Path Traversal',
    severity: 'HIGH',
    regex: /\b(?:Path\.Combine|File\.Open|File\.ReadAll(?:Text|Bytes))\s*\(\s*(?!["'])/
  },
];

// ─────────────────────────────────────────────
// EXPLANATIONS
// ─────────────────────────────────────────────

export const explanations: Record<string, { why: string; impact: string; fix: string }> = {
  'Hardcoded Secret': {
    why: 'Secrets in code are exposed in version control and built artifacts.',
    impact: 'Attackers use leaked credentials to impersonate apps or access internal databases.',
    fix: 'Extract configurations into environment variables or use a secrets manager (e.g. Vault, AWS Secrets Manager).'
  },
  'JS/TS Command Injection': {
    why: 'Node exec routines interpret parameters within shell environments directly.',
    impact: 'Attackers can execute arbitrary system commands via unvalidated string fields.',
    fix: 'Use child_process.execFile with a fixed command and an array of arguments, never a shell string.'
  },
  'JS/TS Command Injection (shell:true)': {
    why: 'Passing shell:true to spawn re-enables shell interpretation, negating the safety of the array argument form.',
    impact: 'Any user-controlled value in the command array can inject shell metacharacters.',
    fix: 'Remove shell:true and pass all arguments as discrete array elements.'
  },
  'JS/TS Command Injection (template literal)': {
    why: 'Constructing a shell command with a template literal embeds user input directly into a shell string.',
    impact: 'Attackers inject shell metacharacters (;, &&, |) to run arbitrary commands.',
    fix: 'Use execFile with an argument array, never build shell strings from user data.'
  },
  'JS/TS Dynamic Evaluation': {
    why: 'eval() compiles and executes arbitrary strings as JavaScript.',
    impact: 'Malicious inputs execute unauthorized code inside the application process.',
    fix: 'Use JSON.parse() for data or explicit conditional maps instead of eval.'
  },
  'JS/TS Insecure InnerHTML': {
    why: 'Assigning dynamic content to innerHTML skips HTML encoding.',
    impact: 'Enables XSS. Attackers steal cookies, tokens, or perform actions as the user.',
    fix: 'Use element.textContent or sanitize with DOMPurify before innerHTML assignment.'
  },
  'JS/TS Insecure InnerHTML (dangerouslySetInnerHTML)': {
    why: 'dangerouslySetInnerHTML renders raw HTML into the DOM without React escaping.',
    impact: 'Any unsanitized user content becomes an XSS vector.',
    fix: 'Sanitize the value with DOMPurify before passing it to dangerouslySetInnerHTML.'
  },
  'JS/TS Insecure InnerHTML (document.write)': {
    why: 'document.write injects raw HTML into the page, bypassing encoding.',
    impact: 'Attackers inject scripts or markup that execute in the user\'s browser context.',
    fix: 'Use DOM APIs (createElement, textContent) instead of document.write.'
  },
  'JS/TS Prototype Pollution': {
    why: 'Writing to __proto__ or constructor.prototype affects all objects in the process.',
    impact: 'Attackers can override built-in methods or bypass security checks globally.',
    fix: 'Validate keys against an allowlist before assigning, and use Object.create(null) for pure maps.'
  },
  'Python Command Injection': {
    why: 'Invoking shell commands with string concatenation breaks input boundaries.',
    impact: 'Attackers chain commands via semicolons or other shell metacharacters.',
    fix: 'Pass arguments as a list and set shell=False (the default).'
  },
  'Python Command Injection (shell=True)': {
    why: 'shell=True passes the entire command string to /bin/sh, enabling shell injection.',
    impact: 'Any user-controlled portion of the command string becomes an injection vector.',
    fix: 'Remove shell=True and pass the command as a list: subprocess.run(["cmd", arg]).'
  },
  'Python Insecure Deserialization': {
    why: 'pickle.loads executes arbitrary Python embedded in serialized payloads.',
    impact: 'Remote Code Execution upon loading attacker-controlled data.',
    fix: 'Never deserialize untrusted pickle data. Use JSON or another safe format.'
  },
  'Python Insecure Deserialization (PyYAML)': {
    why: 'yaml.load without SafeLoader can construct arbitrary Python objects.',
    impact: 'Specially crafted YAML payloads execute arbitrary code on load.',
    fix: 'Always use yaml.safe_load() or yaml.load(data, Loader=yaml.SafeLoader).'
  },
  'Python Dynamic Evaluation': {
    why: 'eval/exec translate plain strings into executable Python statements.',
    impact: 'Arbitrary runtime mutations, file modifications, and code injection.',
    fix: 'Use ast.literal_eval for data parsing; replace logic evals with explicit maps.'
  },
  'Python SQL Injection Risk': {
    why: 'String formatting user input into SQL changes the query structure.',
    impact: 'Attackers bypass auth checks and extract or modify database contents.',
    fix: 'Use parameterized queries: cursor.execute("SELECT ... WHERE x = %s", (value,)).'
  },
  'Python SSTI Risk': {
    why: 'Rendering user-controlled strings as templates executes template directives.',
    impact: 'Attackers use template syntax to read files, env vars, or execute OS commands.',
    fix: 'Never pass user input to render_template_string. Use static template files with safe variable substitution.'
  },
  'Python Path Traversal': {
    why: 'Opening files at a user-supplied path allows access outside intended directories.',
    impact: 'Attackers read /etc/passwd, private keys, or other sensitive files.',
    fix: 'Validate and canonicalize paths with os.path.realpath and assert they start with the expected base directory.'
  },
  'PHP Command Injection': {
    why: 'Direct shell functions execute user input as OS commands.',
    impact: 'Attackers run arbitrary scripts, deploy reverse shells, or exfiltrate data.',
    fix: 'Sanitize arguments with escapeshellarg() or eliminate shell calls entirely.'
  },
  'PHP SQL Injection Risk': {
    why: 'Concatenating variables into SQL strings alters query structure.',
    impact: 'Attackers bypass auth and extract full database contents.',
    fix: 'Use prepared statements via PDO or MySQLi with bound parameters.'
  },
  'PHP SQL Injection Risk (user input)': {
    why: '$_GET/$_POST values passed directly into queries are fully attacker-controlled.',
    impact: 'Complete database compromise including reads, writes, and schema changes.',
    fix: 'Bind superglobal values as parameters, never interpolate them into query strings.'
  },
  'PHP Local File Inclusion': {
    why: 'Including a file at a user-supplied path can load arbitrary server files.',
    impact: 'Attackers read source code, config files, or include uploaded malicious PHP.',
    fix: 'Use a whitelist of allowed filenames rather than dynamic include paths.'
  },
  'PHP Variable Injection': {
    why: 'extract() on superglobals injects attacker-controlled keys as local variables.',
    impact: 'Attackers overwrite any local variable, including security flags and credentials.',
    fix: 'Never call extract() on untrusted input. Map expected keys explicitly.'
  },
  'PHP Insecure Deserialization': {
    why: 'unserialize() on user input can trigger magic methods on arbitrary classes.',
    impact: 'Object injection leading to RCE, file writes, or auth bypass.',
    fix: 'Use JSON for data exchange. If unserialize is required, validate with a strict allowlist of allowed_classes.'
  },
  'PHP Dynamic Evaluation': {
    why: 'eval parses text input directly as PHP code.',
    impact: 'Complete application exploitation, remote script execution, and data exfiltration.',
    fix: 'Replace with lookup tables that map input values to explicit functions.'
  },
  'C/C++ Buffer Overflow Risk': {
    why: 'These functions copy data without checking destination buffer size.',
    impact: 'Stack/heap corruption, control flow hijacking, arbitrary code execution.',
    fix: 'Use bounded alternatives: strncpy, strncat, snprintf, or fgets.'
  },
  'C/C++ Format String': {
    why: 'Passing user input as the format string to printf-family functions exposes format directives.',
    impact: 'Attackers read stack memory or write arbitrary values with %n.',
    fix: 'Always use a literal format string: printf("%s", userInput).'
  },
  'C/C++ Integer Overflow Risk': {
    why: 'Multiplying two untrusted integers for malloc can overflow, allocating a tiny buffer.',
    impact: 'Subsequent writes overflow the heap, enabling arbitrary code execution.',
    fix: 'Check for overflow before the multiply, or use calloc(count, size) which handles it.'
  },
  'Java/C# Command Injection': {
    why: 'Manually starting subprocesses with string input bypasses managed runtime protections.',
    impact: 'Arbitrary system command execution on the host.',
    fix: 'Pass all user-supplied values as discrete array elements to ProcessBuilder, never in a shell string.'
  },
  'Java Path Traversal': {
    why: 'Constructing file paths from user input allows directory traversal.',
    impact: 'Attackers read or overwrite arbitrary files on the server.',
    fix: 'Canonicalize with toRealPath() and verify the result starts with the intended base directory.'
  },
  'Java SQL Injection Risk': {
    why: 'Concatenating strings into SQL queries allows structural manipulation.',
    impact: 'Attackers extract, modify, or delete database contents.',
    fix: 'Use PreparedStatement with parameterized queries.'
  },
  'C# SQL Injection Risk': {
    why: 'Building SqlCommand strings by concatenation or interpolation embeds user input in SQL.',
    impact: 'Full database compromise.',
    fix: 'Use SqlParameter to bind values to queries.'
  },
  'C# Path Traversal': {
    why: 'File operations on user-supplied paths allow traversal outside the intended directory.',
    impact: 'Attackers read config files, private keys, or overwrite critical files.',
    fix: 'Use Path.GetFullPath and assert the result starts with the expected root.'
  },
};

// ─────────────────────────────────────────────
// SECURITY STORIES
// ─────────────────────────────────────────────

const SECURITY_STORIES: Record<string, string[]> = {
  'Hardcoded Secret':                                  ['🔑 Hardcoded Secret',   '📦 Source Control',      '🚨 Credential Exposure'],
  'JS/TS Command Injection':                           ['👤 User Input',         '💀 exec()',               '🖥 Shell Access'],
  'JS/TS Command Injection (shell:true)':              ['👤 User Input',         '💀 spawn(shell:true)',    '🖥 Shell Access'],
  'JS/TS Command Injection (template literal)':        ['👤 User Input',         '💀 exec(`${...}`)',       '🖥 Shell Access'],
  'JS/TS Dynamic Evaluation':                          ['👤 User Input',         '⚠ eval()',               '⚙ Runtime Execution'],
  'JS/TS Insecure InnerHTML':                          ['👤 User Input',         '⚠ innerHTML',            '🌐 DOM XSS'],
  'JS/TS Insecure InnerHTML (dangerouslySetInnerHTML)':['👤 User Input',         '⚠ dangerouslySetInnerHTML','🌐 DOM XSS'],
  'JS/TS Insecure InnerHTML (document.write)':         ['👤 User Input',         '⚠ document.write()',     '🌐 DOM XSS'],
  'JS/TS Prototype Pollution':                         ['👤 User Input',         '⚠ __proto__ write',      '☠️ Prototype Corruption'],
  'Python Command Injection':                          ['👤 User Input',         '💀 shell execution',     '🖥 Shell Access'],
  'Python Command Injection (shell=True)':             ['👤 User Input',         '💀 shell=True',          '🖥 Shell Access'],
  'Python Insecure Deserialization':                   ['📦 Serialized Payload', '⚠ pickle.loads()',       '☠️ Arbitrary Code'],
  'Python Insecure Deserialization (PyYAML)':          ['📦 YAML Payload',       '⚠ yaml.load()',          '☠️ Arbitrary Code'],
  'Python Dynamic Evaluation':                         ['👤 User Input',         '⚠ eval()/exec()',        '⚙ Runtime Execution'],
  'Python SQL Injection Risk':                         ['👤 User Input',         '💉 SQL Injection',       '🛢 Data Exposure'],
  'Python SSTI Risk':                                  ['👤 User Input',         '⚠ Template Render',      '🖥 SSTI / RCE'],
  'Python Path Traversal':                             ['👤 User Input',         '⚠ open(path)',           '📁 File Disclosure'],
  'PHP Command Injection':                             ['👤 User Input',         '💀 shell execution',     '🖥 Shell Access'],
  'PHP SQL Injection Risk':                            ['👤 User Input',         '💉 SQL Injection',       '🛢 Data Exposure'],
  'PHP SQL Injection Risk (user input)':               ['👤 $_GET/$_POST',       '💉 SQL Injection',       '🛢 Data Exposure'],
  'PHP Local File Inclusion':                          ['👤 User Input',         '⚠ include($path)',       '📁 File Inclusion'],
  'PHP Variable Injection':                            ['👤 $_POST',             '⚠ extract()',            '☠️ Variable Overwrite'],
  'PHP Insecure Deserialization':                      ['👤 User Input',         '⚠ unserialize()',        '☠️ Object Injection'],
  'PHP Dynamic Evaluation':                            ['👤 User Input',         '⚠ eval()',               '⚙ Runtime Execution'],
  'C/C++ Buffer Overflow Risk':                        ['📦 Buffer Data',        '⚠ Unsafe Copy',          '☠️ Memory Corruption'],
  'C/C++ Format String':                               ['👤 User Input',         '⚠ printf(userInput)',    '☠️ Memory Read/Write'],
  'C/C++ Integer Overflow Risk':                       ['📦 Size Input',         '⚠ malloc(a*b)',          '☠️ Heap Overflow'],
  'Java/C# Command Injection':                         ['👤 User Input',         '💀 Process Start',       '🖥 Shell Access'],
  'Java Path Traversal':                               ['👤 User Input',         '⚠ new File(path)',       '📁 File Disclosure'],
  'Java SQL Injection Risk':                           ['👤 User Input',         '💉 SQL Injection',       '🛢 Data Exposure'],
  'C# SQL Injection Risk':                             ['👤 User Input',         '💉 SQL Injection',       '🛢 Data Exposure'],
  'C# Path Traversal':                                 ['👤 User Input',         '⚠ File.Open(path)',      '📁 File Disclosure'],
};

// ─────────────────────────────────────────────
// SOURCE DETECTION
// ─────────────────────────────────────────────

const SOURCE_PATTERNS: Array<{ regex: RegExp; label: (m: RegExpMatchArray) => string }> = [
  { regex: /\b(req\.body\.[A-Za-z0-9_]+)/,    label: m => m[1] },
  { regex: /\b(req\.query\.[A-Za-z0-9_]+)/,   label: m => m[1] },
  { regex: /\b(req\.params\.[A-Za-z0-9_]+)/,  label: m => m[1] },
  { regex: /\b(body\.[A-Za-z0-9_]+)/,         label: m => m[1] },
  { regex: /\b(process\.env\.[A-Za-z0-9_]+)/, label: m => m[1] },
  // Python / Flask
  { regex: /\b(request\.args(?:\[[^\]]+\]|\.get\([^)]+\)))/,  label: m => m[1] },
  { regex: /\b(request\.form(?:\[[^\]]+\]|\.get\([^)]+\)))/,  label: m => m[1] },
  { regex: /\b(request\.json(?:\[[^\]]+\])?)/,                 label: m => m[1] },
  // PHP superglobals
  { regex: /(\$_(?:GET|POST|REQUEST|COOKIE)\[[^\]]+\])/,       label: m => m[1] },
  // C# / Java HTTP context
  { regex: /\b(Request\.(?:Query|Form|Params)\[[^\]]+\])/,     label: m => m[1] },
  { regex: /\b(request\.getParameter\([^)]+\))/,               label: m => m[1] },
];

function findConcreteSource(text: string): string | null {
  for (const sp of SOURCE_PATTERNS) {
    const match = text.match(sp.regex);
    if (match) return sp.label(match);
  }
  return null;
}

// ─────────────────────────────────────────────
// SCENARIO BUILDER
// ─────────────────────────────────────────────

function stripEmoji(label: string): string {
  return label.replace(/^[^\w$]+/, '').trim();
}

function buildScenario(story: string[], title: string, sourceLabel: string | null): string {
  const sink    = story[1] ? stripEmoji(story[1]) : title;
  const outcome = story[story.length - 1] ? stripEmoji(story[story.length - 1]) : 'potential impact';
  const src     = sourceLabel ?? 'an unvalidated input';

  if (sink.includes('exec') || sink.includes('Process') || sink.includes('shell') || sink.includes('spawn')) {
    return `An attacker supplies a crafted value through ${src}. That value reaches ${sink} without validation, enabling the server to execute attacker-controlled shell commands.`;
  }
  if (sink.includes('eval') || sink.includes('exec()') || sink.includes('Runtime')) {
    return `An attacker supplies a crafted value through ${src}. The value flows into ${sink} without sanitization, allowing the application to execute attacker-controlled code.`;
  }
  if (sink.includes('innerHTML') || sink.includes('document.write') || sink.includes('dangerously') || outcome.includes('XSS')) {
    return `An attacker supplies a crafted value through ${src}. That value is injected into the page via ${sink}, enabling cross-site scripting that can steal tokens or hijack sessions.`;
  }
  if (sink.includes('SQL') || outcome.includes('Data Exposure')) {
    return `An attacker supplies a crafted value through ${src}. The value is embedded in a SQL query via ${sink}, enabling injection that can expose or modify the entire database.`;
  }
  if (sink.includes('pickle') || sink.includes('yaml.load') || sink.includes('unserialize') || outcome.includes('Arbitrary Code')) {
    return `An attacker supplies a crafted serialized payload through ${src}. The application deserializes it via ${sink}, executing arbitrary attacker-controlled code.`;
  }
  if (outcome.includes('File') || sink.includes('open(') || sink.includes('File(') || sink.includes('include(')) {
    return `An attacker supplies a path like ../../etc/passwd through ${src}. The application opens that path via ${sink}, potentially exposing arbitrary server files.`;
  }
  if (outcome.includes('Prototype')) {
    return `An attacker supplies a crafted object through ${src} containing a __proto__ key. Writing it via ${sink} pollutes Object.prototype, potentially altering application behavior globally.`;
  }

  return `An attacker supplies a crafted value through ${src}. The value reaches ${sink} without validation, creating a potential ${outcome.toLowerCase()}.`;
}

// ─────────────────────────────────────────────
// CONFIDENCE SCORING
// ─────────────────────────────────────────────

function inferConfidence(
  title: string,
  source: string | null,
  contextSnippet: string
): 'Low' | 'Medium' | 'High' {
  // Highest confidence: named taint source present
  if (source) return 'High';

  // Medium: function parameter that feeds the sink
  const PARAM_PATTERN = /(?:function\b[^{(]*|def\s+\w+|void\s+\w+|public\s+\w+\s+\w+)\s*\(([^)]+)\)/;
  const contextMatch = contextSnippet.match(PARAM_PATTERN);
  if (contextMatch) {
    const params = contextMatch[1]
      .split(',')
      .map(p => p.trim().split(/\s+/).pop() ?? '')
      .filter(p => p.length > 1);
    const lines = contextSnippet.split('\n');
    const sinkLine = lines[Math.floor(lines.length / 2)] ?? '';
    if (params.some(p => sinkLine.includes(p))) return 'Medium';
  }

  // Medium: inherently dangerous patterns regardless of explicit source
  if (
    title === 'Hardcoded Secret' ||
    title.includes('Insecure Deserialization') ||
    title.includes('Local File Inclusion') ||
    title.includes('Variable Injection')
  ) return 'Medium';

  return 'Low';
}

// ─────────────────────────────────────────────
// SECURITY STORY ASSEMBLY
// ─────────────────────────────────────────────

function buildSecurityStory(title: string, matched: string, context: string) {
  const baseStory = SECURITY_STORIES[title] ?? ['👤 User Input', `⚠ ${title}`, '🚨 Potential Impact'];
  const source    = findConcreteSource(context) || findConcreteSource(matched);
  const story     = [...baseStory];

  if (source) story[0] = `👤 ${source}`;

  const confidence = inferConfidence(title, source, context);
  const scenario   = buildScenario(story, title, source);

  return { securityStory: story, storyConfidence: confidence, scenario };
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function formatCodeSnippet(line: string, maxLength = 120): string {
  const trimmed = line.trim();
  return trimmed.length > maxLength
    ? `${trimmed.substring(0, maxLength)}... [truncated]`
    : trimmed;
}

/**
 * Returns true if the line is a comment in any of the supported languages:
 *   //  #  *  /*  *  –– covers JS/TS, Python, C/C++, Java, PHP, C#
 */
function isCommentLine(line: string): boolean {
  const t = line.trimStart();
  return (
    t.startsWith('//') ||
    t.startsWith('#') ||
    t.startsWith('/*') ||
    t.startsWith('*') ||
    t.startsWith('--') ||    // SQL / Lua
    t.startsWith('{#') ||    // Jinja2 / Twig comment
    t.startsWith('<!--')     // HTML / template comment
  );
}

/**
 * Returns the set of pattern types applicable to a given file extension.
 */
function getPatternsForFile(filePath: string): Pattern[] {
  const dotIndex = filePath.lastIndexOf('.');
  if (dotIndex === -1) return [];

  const ext        = filePath.substring(dotIndex).toLowerCase();
  const allowedSet = new Set(EXTENSION_PATTERN_MAP[ext] ?? []);
  if (allowedSet.size === 0) return [];

  return patterns.filter(p => allowedSet.has(p.type));
}

/**
 * Returns true if the file path qualifies for security scanning.
 */
function shouldScanFile(filePath: string): boolean {
  const normalized = filePath.toLowerCase().replace(/\\/g, '/');

  for (const segment of IGNORED_PATH_SEGMENTS) {
    if (normalized.includes(segment)) return false;
  }

  const dotIndex = normalized.lastIndexOf('.');
  if (dotIndex === -1) return false;

  return ALLOWED_EXTENSIONS.has(normalized.substring(dotIndex));
}

// ─────────────────────────────────────────────
// MAIN SCAN FUNCTION
// ─────────────────────────────────────────────

export function scanFiles(files: Array<{ file: string; content: string }>): Finding[] {
  const findings: Finding[] = [];

  for (const { file, content } of files) {

    if (!shouldScanFile(file)) continue;

    // Only run patterns that are relevant to this file's language
    const filePatterns = getPatternsForFile(file);
    if (filePatterns.length === 0) continue;

    const lines = content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip scan-ignore annotations
      if (line.includes('scan-ignore')) continue;

      // Skip comment lines — reduces false positives from example code in docs/comments
      if (isCommentLine(line)) continue;

      for (const pattern of filePatterns) {
        pattern.regex.lastIndex = 0;
        const match = pattern.regex.exec(line);

        if (match) {
          const contextSnippet = lines
            .slice(Math.max(0, i - 2), Math.min(lines.length, i + 3))
            .join('\n');

          findings.push({
            file,
            line: i + 1,
            severity: pattern.severity,
            title: pattern.type,
            matched: match[0].trim(),
            code: formatCodeSnippet(line),
            context: contextSnippet,
            ...buildSecurityStory(pattern.type, match[0].trim(), contextSnippet)
          });

          // One finding per line — take the highest-priority match and move on
          break;
        }
      }
    }
  }

  return findings;
}