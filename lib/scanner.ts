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
}

export const patterns: Pattern[] = [
  // Assignments matching literal strings exclusively, filtering trailing code blocks
  { 
    type: 'Hardcoded Secret', 
    severity: 'HIGH', 
    regex: /\b(?:secret|password|api[_-]?key|token|passwd|private[_-]?key)\s*=\s*['"`]([A-Za-z0-9_\-\.\~\+\/]{8,})['"`]/i 
  },
  { type: 'JS/TS Command Injection', severity: 'CRITICAL', regex: /\b(?:exec|execSync|spawn|spawnSync)\s*\(/ },
  { type: 'JS/TS Dynamic Evaluation', severity: 'HIGH', regex: /\beval\s*\(/ },
  { type: 'JS/TS Insecure InnerHTML', severity: 'HIGH', regex: /\.innerHTML\s*=/ },
  { type: 'Python Command Injection', severity: 'CRITICAL', regex: /\b(?:os\.system|subprocess\.(?:Popen|run|call))\s*\(/ },
  { type: 'Python Insecure Deserialization', severity: 'CRITICAL', regex: /\bpickle\.loads\s*\(/ },
  { type: 'Python Dynamic Evaluation', severity: 'HIGH', regex: /\b(?:eval|exec)\s*\(/ },
  { type: 'PHP Command Injection', severity: 'CRITICAL', regex: /\b(?:exec|shell_exec|system|passthru|popen)\s*\(/ },
  { type: 'PHP SQL Injection Risk', severity: 'CRITICAL', regex: /\bmysqli_query\s*\(\s*[^,]+,\s*['"`].*\$.*['"`]\s*\)/ },
  { type: 'PHP Dynamic Evaluation', severity: 'HIGH', regex: /\b(?:eval|assert)\s*\(/ },
  { type: 'C/C++ Buffer Overflow Risk', severity: 'HIGH', regex: /\b(?:strcpy|strcat|sprintf|gets)\s*\(/ },
  { type: 'Java/C# Command Injection', severity: 'CRITICAL', regex: /\b(?:Runtime\.getRuntime\(\)\.exec|ProcessBuilder|Process\.Start)\s*\(/ }
];

export const explanations: Record<string, { why: string; impact: string; fix: string }> = {
  'Hardcoded Secret': {
    why: 'Secrets in code are exposed in version control and built artifacts.',
    impact: 'Attackers use leaked credentials to impersonate apps or access internal databases.',
    fix: 'Extract configurations into environment variables or use safe secrets managers.'
  },
  'JS/TS Command Injection': {
    why: 'Node exec routines interpret parameters within shell environments directly.',
    impact: 'Attackers can execute rogue system execution paths via unvalidated string fields.',
    fix: 'Utilize child_process.execFile or switch functions over to fixed string arguments.'
  },
  'JS/TS Dynamic Evaluation': {
    why: 'eval() translates string streams directly into runnable application logic scripts.',
    impact: 'Malicious inputs execute unauthorized script tasks inside engine application windows.',
    fix: 'Use JSON.parse() for structured data translations or leverage strict conditional maps.'
  },
  'JS/TS Insecure InnerHTML': {
    why: 'Assigning dynamic variable configurations directly to innerHTML values skips safe encoding rules.',
    impact: 'Enables Cross-Site Scripting (XSS). Attackers extract internal cookies and tokens.',
    fix: 'Transition logic paths over to element.textContent or process data utilizing DOMPurify.'
  },
  'Python Command Injection': {
    why: 'Invoking environment steps with active shell execution properties breaks input boundaries.',
    impact: 'Attackers chain execution commands via sequence characters like semicolons.',
    fix: 'Isolate instructions inside structural string arrays and ensure shell=False configurations.'
  },
  'Python Insecure Deserialization': {
    why: 'The pickle module executes arbitrary functions embedded directly within serialized data payloads.',
    impact: 'Triggers absolute Remote Code Execution (RCE) operations immediately upon ingestion.',
    fix: 'Refuse outside pickle files entirely and switch object serializations over to standard JSON structures.'
  },
  'Python Dynamic Evaluation': {
    why: 'Global execution utilities translate plain string strings into executable runtime statements.',
    impact: 'Enables arbitrary runtime mutations, unexpected file modifications, and variable injection.',
    fix: 'Enforce structural data validations cleanly via ast.literal_eval syntax.'
  },
  'PHP Command Injection': {
    why: 'Direct operational functions trigger instruction queries across target server operating systems.',
    impact: 'Attackers run arbitrary scripts, deploy reverse shells, or intercept local server data.',
    fix: 'Sanitize arguments via escapeshellarg() or migrate infrastructure dependencies away from shells.'
  },
  'PHP SQL Injection Risk': {
    why: 'Concatenating live runtime variables into base SQL statements alters context parsing maps.',
    impact: 'Attackers bypass authorization checks and extract information out of system databases.',
    fix: 'Enforce prepared statements using PDO interfaces or clean parameters via binding hooks.'
  },
  'PHP Dynamic Evaluation': {
    why: 'Dynamic eval instructions parse text inputs straight into executable PHP code blocks.',
    impact: 'Enables complete application exploitation, remote script runs, and resource damage.',
    fix: 'Use lookup tables to match input values against explicit functions instead of evaluating code dynamically.'
  },
  'C/C++ Buffer Overflow Risk': {
    why: 'Standard C-string calls manage arrays without validating buffer bounds.',
    impact: 'Overflowed buffers corrupt memory addresses, altering registers and instruction paths.',
    fix: 'Swap insecure targets with bounded safely counterparts like strncpy or snprintf.'
  },
  'Java/C# Command Injection': {
    why: 'Starting underlying sub-processes manually bypasses managed environment protections.',
    impact: 'External terminal injections execute dangerous system utilities natively on host servers.',
    fix: 'Pass string inputs exclusively as discrete array parameters using ProcessBuilder components.'
  }
};

function formatCodeSnippet(line: string, maxLength = 120): string {
  const trimmed = line.trim();
  return trimmed.length > maxLength 
    ? `${trimmed.substring(0, maxLength)}... [truncated]` 
    : trimmed;
}

export function scanFiles(files: Array<{ file: string; content: string }>): Finding[] {
  const findings: Finding[] = [];

  for (let f = 0; f < files.length; f++) {
    const { file, content } = files[f];
    const lines = content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes('scan-ignore')) {
        continue;
      }

      for (let p = 0; p < patterns.length; p++) {
        const pattern = patterns[p];
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
            matched: match[0].trim(), // Fixed Bug: Target the array element index string safely
            code: formatCodeSnippet(line),
            context: contextSnippet
          });
          
          break; 
        }
      }
    }
  }

  return findings;
}
