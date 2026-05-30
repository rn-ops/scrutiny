'use client'

import { useState } from 'react'

export default function RepoScannerPage() {
  const [scanning, setScanning] = useState(false)
  const [selectedFinding, setSelectedFinding] = useState<number | null>(null)

  const findings = [
    {
      id: 1,
      severity: 'CRITICAL',
      title: 'Command Injection',
      file: 'src/server.ts',
      line: 48,
      description: 'User-controlled input reaches shell execution.',
      impact: 'Remote code execution. Attacker can execute arbitrary commands.',
      fix: 'Use execFile() with validated inputs. Never pass user input to exec().',
      code: 'exec(userInput)'
    },
    {
      id: 2,
      severity: 'HIGH',
      title: 'Hardcoded Secret',
      file: 'src/config.ts',
      line: 12,
      description: 'API key exposed in source code.',
      impact: 'Credential theft. Unauthorized API access and data exfiltration.',
      fix: 'Move to environment variables. Rotate the compromised key immediately.',
      code: "const API_KEY = 'sk-1234567890abcdef'"
    },
    {
      id: 3,
      severity: 'MEDIUM',
      title: 'Weak Regex Pattern',
      file: 'src/utils/validator.ts',
      line: 7,
      description: 'Email validation regex can be bypassed.',
      impact: 'Invalid data entering the system. Potential bypass of security checks.',
      fix: 'Use a proper email validation library or standard regex.',
      code: 'const emailRegex = /^[a-z]+@[a-z]+\\.[a-z]+$/'
    },
    {
      id: 4,
      severity: 'MEDIUM',
      title: 'Missing Input Validation',
      file: 'src/middleware/upload.ts',
      line: 23,
      description: 'File upload endpoint accepts any file type.',
      impact: 'Malware upload, XXE attacks, or arbitrary code execution.',
      fix: 'Whitelist file types. Validate MIME type and file extension.',
      code: 'app.post("/upload", (req) => saveFile(req.file))'
    },
    {
      id: 5,
      severity: 'LOW',
      title: 'Deprecated Dependency',
      file: 'package.json',
      line: 15,
      description: 'Using outdated version of express-validator.',
      impact: 'May miss recent security patches.',
      fix: 'Update to latest stable version: npm update express-validator',
      code: '"express-validator": "6.12.0"'
    }
  ]

  const hotspots = [
    'src/auth/login.ts',
    'src/middleware/upload.ts',
    'src/utils/parser.ts'
  ]

  const scanSteps = [
    { label: 'Fetching repository', done: true },
    { label: 'Reading files', done: true },
    { label: 'Detecting patterns', done: true },
    { label: 'Generating explanations', done: false }
  ]

  const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length
  const highCount = findings.filter(f => f.severity === 'HIGH').length
  const mediumCount = findings.filter(f => f.severity === 'MEDIUM').length
  const lowCount = findings.filter(f => f.severity === 'LOW').length

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900 dark:from-slate-950 dark:to-slate-900 dark:text-slate-100">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-12 lg:px-8">
        
        {/* Hero */}
        <header className="space-y-6">
          <div className="relative">
            <h1 className="text-5xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
              Scrutiny
            </h1>
            <p className="absolute top-1 right-0 text-2xl opacity-20">ฅ^•ﻌ•^ฅ</p>
          </div>
          <p className="max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-400">
            Understand code. Discover risks. Contribute confidently.
          </p>
        </header>

        {/* Input Section */}
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="https://github.com/owner/repo"
              className="flex-1 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-base text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700/50"
            />
            <button
              onClick={() => setScanning(!scanning)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-8 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
            >
              {scanning ? 'Scanning...' : 'Scan'}
            </button>
          </div>

          {/* Scan Progress */}
          {scanning && (
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              {scanSteps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`h-5 w-5 rounded-full ${step.done ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                  <span className={`text-sm ${step.done ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100 font-medium'}`}>
                    {step.done ? '✓' : ''} {step.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Overview Cards */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 p-6 dark:border-red-900 dark:from-red-950 dark:to-red-900/50">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-600 dark:text-red-400">Critical</p>
            <p className="mt-4 text-4xl font-bold text-red-700 dark:text-red-300">{criticalCount}</p>
          </div>
          <div className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50 p-6 dark:border-orange-900 dark:from-orange-950 dark:to-orange-900/50">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-600 dark:text-orange-400">High</p>
            <p className="mt-4 text-4xl font-bold text-orange-700 dark:text-orange-300">{highCount}</p>
          </div>
          <div className="rounded-2xl border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100/50 p-6 dark:border-yellow-900 dark:from-yellow-950 dark:to-yellow-900/50">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-yellow-600 dark:text-yellow-400">Medium</p>
            <p className="mt-4 text-4xl font-bold text-yellow-700 dark:text-yellow-300">{mediumCount}</p>
          </div>
          <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 dark:border-blue-900 dark:from-blue-950 dark:to-blue-900/50">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">Low</p>
            <p className="mt-4 text-4xl font-bold text-blue-700 dark:text-blue-300">{lowCount}</p>
          </div>
        </section>

        {/* Repository Context */}
        <section className="space-y-3 rounded-3xl border-2 border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-50">Repository Context</h2>
          <p className="text-base leading-7 text-slate-700 dark:text-slate-300">
            Node.js REST API using Express and JWT. Primary attack surface includes authentication endpoints, file uploads, and user-generated content parsing.
          </p>
        </section>

        {/* Hotspots */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-50">Security Hotspots</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {hotspots.map((hotspot, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="font-mono text-sm text-slate-700 dark:text-slate-300">{hotspot}</p>
                {idx === 2 && <p className="mt-2 text-xs opacity-30">🐾 suspicious cat detected</p>}
              </div>
            ))}
          </div>
        </section>

        {/* Findings Panel */}
        <section className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
          {/* Findings List */}
          <div className="space-y-3 rounded-3xl border-2 border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 text-lg font-semibold text-slate-950 dark:text-slate-50">Detected Findings</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {findings.map((finding) => (
                <button
                  key={finding.id}
                  onClick={() => setSelectedFinding(finding.id)}
                  className={`w-full rounded-xl border-2 p-3 text-left transition ${
                    selectedFinding === finding.id
                      ? 'border-slate-500 bg-slate-100 dark:border-slate-600 dark:bg-slate-800'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-xs font-bold uppercase tracking-[0.2em] ${
                        finding.severity === 'CRITICAL' ? 'text-red-600 dark:text-red-400' :
                        finding.severity === 'HIGH' ? 'text-orange-600 dark:text-orange-400' :
                        finding.severity === 'MEDIUM' ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-blue-600 dark:text-blue-400'
                      }`}>
                        {finding.severity}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{finding.title}</p>
                      <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">{finding.file}:{finding.line}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Finding Details */}
          {selectedFinding ? (
            <div className="space-y-6 rounded-3xl border-2 border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
              {(() => {
                const finding = findings.find(f => f.id === selectedFinding)!
                return (
                  <>
                    <div>
                      <p className={`text-xs font-bold uppercase tracking-[0.2em] ${
                        finding.severity === 'CRITICAL' ? 'text-red-600 dark:text-red-400' :
                        finding.severity === 'HIGH' ? 'text-orange-600 dark:text-orange-400' :
                        finding.severity === 'MEDIUM' ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-blue-600 dark:text-blue-400'
                      }`}>
                        {finding.severity}
                      </p>
                      <h3 className="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-50">{finding.title}</h3>
                    </div>

                    <div className="space-y-2 border-t border-slate-200 pt-6 dark:border-slate-800">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">File</p>
                      <p className="font-mono text-sm text-slate-900 dark:text-slate-100">{finding.file}</p>
                      <p className="font-mono text-sm text-slate-900 dark:text-slate-100">Line {finding.line}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                      {finding.code}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Why is this risky?</p>
                      <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{finding.description}</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Potential impact</p>
                      <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{finding.impact}</p>
                    </div>

                    <div className="rounded-2xl border-2 border-green-200 bg-green-50/50 p-4 dark:border-green-900 dark:bg-green-950/30">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-700 dark:text-green-400">Recommended fix</p>
                      <p className="mt-2 text-sm leading-6 text-green-900 dark:text-green-200">{finding.fix}</p>
                    </div>
                  </>
                )
              })()}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-slate-500 dark:text-slate-400">Select a finding to view details</p>
              <p className="mt-4 text-4xl">🐈</p>
            </div>
          )}
        </section>

        {/* Priority Fixes */}
        <section className="space-y-4 rounded-3xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 p-8 dark:border-green-900 dark:from-green-950 dark:to-green-900/50">
          <h2 className="text-xl font-semibold text-green-950 dark:text-green-100">Priority Fixes</h2>
          <ol className="space-y-3">
            {[
              'Remove hardcoded credentials from src/config.ts',
              'Replace exec() calls with execFile() in src/server.ts',
              'Add file type validation to upload middleware',
              'Update vulnerable dependencies'
            ].map((fix, idx) => (
              <li key={idx} className="flex gap-3 text-green-900 dark:text-green-100">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-200 text-xs font-bold dark:bg-green-900">
                  {idx + 1}
                </span>
                <span className="pt-0.5">{fix}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-200 pt-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <p>Scrutiny v0.1 • ฅ^•ﻌ•^ฅ</p>
        </footer>
      </main>
    </div>
  )
}
