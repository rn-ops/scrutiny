"use client"

import { useMemo, useState, useEffect } from 'react'
import { scanFiles, Finding, explanations } from '@/lib/scanner'
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Page() {
  const [repoUrl, setRepoUrl] = useState('')
  const [files, setFiles] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [scanning, setScanning] = useState(false)
  const [loadingFile, setLoadingFile] = useState(false)
  const [status, setStatus] = useState('Waiting for repository...')
  const [error, setError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null)
  const [allDiscoveredFindings, setAllDiscoveredFindings] = useState<Finding[]>([])
  const [repoContext, setRepoContext] = useState<string | null>(null)
  const [loadingContext, setLoadingContext] = useState(false)

  const fileCount = files.length
  const findings = useMemo(() => {
    if (!selectedFile || !fileContent) {
      return []
    }

    return scanFiles([{ file: selectedFile, content: fileContent }])
  }, [selectedFile, fileContent])


  /*
  * Calculate the overall risk score based on the severity of findings
  * The risk score is not out of 100.
  * it's a raw sum: CRITICAL×10 + HIGH×5 + MEDIUM×2 + LOW×1.
  * For example, 1 CRITICAL + 2 HIGH = 20.
  */
  const riskScore = useMemo(() => {
    const severityWeights = { CRITICAL: 10, HIGH: 5, MEDIUM: 2, LOW: 1 }
    const total = findings.reduce((sum, finding) => {
      const weight = severityWeights[finding.severity as keyof typeof severityWeights] || 0
      return sum + weight
    }, 0)
    return total
  }, [findings])

  const hotspots = useMemo(() => {
    const fileMap = new Map<string, number>()
    allDiscoveredFindings.forEach(finding => {
      fileMap.set(finding.file, (fileMap.get(finding.file) ?? 0) + 1)
    })
    return Array.from(fileMap.entries())
      .map(([file, count]) => ({ file, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  }, [allDiscoveredFindings])

  useEffect(() => {
    if (findings.length > 0) {
      setAllDiscoveredFindings(prev => {
        const existing = new Set(prev.map(f => `${f.file}:${f.line}:${f.matched}`))
        const newFindings = findings.filter(f => !existing.has(`${f.file}:${f.line}:${f.matched}`))
        return [...prev, ...newFindings]
      })
    }
  }, [findings])

  const handleScan = async () => {
    setError(null)
    setFileError(null)
    setSelectedFile(null)
    setFileContent('')
    setFiles([])
    setAllDiscoveredFindings([])
    setRepoContext(null)

    if (!repoUrl.trim()) {
      setError('Please paste a GitHub repository URL.')
      setStatus('Waiting for repository...')
      return
    }

    setScanning(true)
    setStatus('Scanning repository...')

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: repoUrl.trim() })
      })

      const payload = await response.json()

      if (!response.ok || !payload.success) {
        setError(payload.message || 'Unable to fetch repository files.')
        setStatus('Scan failed')
        setFiles([])
        return
      }

      setFiles(payload.files ?? [])
      setStatus(`Found ${payload.files?.length ?? 0} files`)

      // Fetch repository context with Gemini
      setLoadingContext(true)
      try {
        const readmeResponse = await fetch('/api/file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: repoUrl.trim(), path: 'README.md' })
        })
        const readmePayload = await readmeResponse.json()
        const readme = readmePayload.success ? readmePayload.content : null

        const contextResponse = await fetch('/api/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: repoUrl.trim(),
            files: payload.files ?? [],
            readme
          })
        })

        const contextPayload = await contextResponse.json()
        if (contextPayload.success) {
          setRepoContext(contextPayload.context)
        }
      } catch (e) {
        console.error('Failed to fetch context:', e)
      } finally {
        setLoadingContext(false)
      }
    } catch {
      setError('Unable to reach the scan endpoint. Check the URL and try again.')
      setStatus('Scan failed')
      setFiles([])
    } finally {
      setScanning(false)
    }
  }

  const handleSelectFile = async (path: string) => {
    setSelectedFile(path)
    setFileError(null)
    setFileContent('')

    if (!repoUrl.trim()) {
      setFileError('Repository URL is required to load file content.')
      return
    }

    setLoadingFile(true)
    setStatus(`Loading ${path}...`)

    try {
      const response = await fetch('/api/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: repoUrl.trim(), path })
      })

      const payload = await response.json()
      if (!response.ok || !payload.success) {
        setFileError(payload.message || 'Unable to load file content.')
        setStatus('File load failed')
        return
      }

      setFileContent(payload.content ?? '')
      setStatus(`Loaded ${path}`)
    } catch {
      setFileError('Unable to reach the file endpoint. Try again.')
      setStatus('File load failed')
    } finally {
      setLoadingFile(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900 dark:from-slate-950 dark:to-slate-900 dark:text-slate-100">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12 lg:px-8">
        <header className="space-y-4">
          <div className="relative">
            <h1 className="text-5xl font-bold tracking-tight text-slate-950 dark:text-slate-50">Scrutiny</h1>
            <p className="absolute top-2 right-0 text-2xl opacity-20">ฅ^•ﻌ•^ฅ</p>
          </div>
          <p className="max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-400">
            Understand code. Discover risks. Contribute confidently.
          </p>
        </header>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <input
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              type="text"
              placeholder="https://github.com/owner/repo"
              className="flex-1 rounded-2xl border border-slate-300 bg-slate-50 px-5 py-3 text-base text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700/50"
            />
            <button
              onClick={handleScan}
              disabled={scanning}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-8 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
            >
              {scanning ? 'Scanning...' : 'Scan'}
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Scan state</p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{status}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-center dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Files discovered</p>
              <p className="mt-3 text-4xl font-bold text-slate-950 dark:text-slate-100">{fileCount}</p>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              {error}
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Repository file list</p>
              <div className="mt-4 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                {files.length === 0 ? (
                  <p className="font-mono text-sm text-slate-500 dark:text-slate-500">No files yet. Scan a repository first.</p>
                ) : (
                  <div className="space-y-1">
                    {files.slice(0, 30).map((file) => (
                      <button
                        key={file}
                        onClick={() => handleSelectFile(file)}
                        className={`w-full text-left font-mono rounded-xl px-3 py-2 transition ${
                          selectedFile === file
                            ? 'bg-slate-900 text-white dark:bg-slate-700 dark:text-slate-100'
                            : 'bg-white text-slate-900 hover:bg-slate-100 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900'
                        }`}
                      >
                        {file}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {files.length > 30 ? (
                <p className="mt-4 text-xs text-slate-500 dark:text-slate-500">
                  Showing first 30 of {files.length} files.
                </p>
              ) : null}

              {files.length > 0 ? (
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                  <p className="text-xs uppercase tracking-[0.2em] text-red-600 dark:text-red-400 font-semibold">Hotspots</p>
                  <div className="mt-3 space-y-2">
                    {hotspots.length > 0 ? (
                      hotspots.map((hotspot) => (
                        <button
                          key={hotspot.file}
                          onClick={() => handleSelectFile(hotspot.file)}
                          className="w-full text-left rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 transition"
                        >
                          <p className="font-mono text-sm text-red-900 dark:text-red-100">{hotspot.file}</p>
                          <p className="text-xs text-red-700 dark:text-red-300">{hotspot.count} finding{hotspot.count !== 1 ? 's' : ''}</p>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                        No hotspots identified yet. Open files to populate this list.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Selected file</p>
                  <p className="mt-2 font-mono text-base text-slate-900 dark:text-slate-100">{selectedFile ?? 'None'}</p>
                </div>
                {loadingFile ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Loading
                  </span>
                ) : null}
              </div>

              {fileError ? (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                  {fileError}
                </div>
              ) : null}

              {fileContent ? (
                <>
                  <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                    <pre className="whitespace-pre-wrap break-words font-mono">{fileContent}</pre>
                  </div>

                  <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Findings</p>
                    {findings.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        {findings.map((finding, index) => (
                          <div key={`${finding.file}-${finding.line}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 cursor-pointer transition hover:border-slate-300 dark:hover:border-slate-700" onClick={() => setSelectedFinding(finding)}>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{finding.severity}</p>
                            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{finding.title}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Line {finding.line}</p>
                            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">Matched: <span className="font-mono">{finding.matched}</span></p>
                            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{finding.code}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">No suspicious strings found in this file.</p>
                    )}

                    {selectedFinding && explanations[selectedFinding.title] ? (
                      <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
                        <p className="text-xs uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 font-semibold">Explanation</p>
                        <div className="mt-3 space-y-2">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Why</p>
                            <p className="mt-1 text-sm text-blue-900 dark:text-blue-100">{explanations[selectedFinding.title].why}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-red-600 dark:text-red-400">Impact</p>
                            <p className="mt-1 text-sm text-red-900 dark:text-red-100">{explanations[selectedFinding.title].impact}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-green-600 dark:text-green-400">Fix</p>
                            <p className="mt-1 text-sm text-green-900 dark:text-green-100">{explanations[selectedFinding.title].fix}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {findings.length > 0 ? (
                      <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
                        <p className="text-xs uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400 font-semibold">Risk Score</p>
                        <p className="mt-2 text-3xl font-bold text-orange-900 dark:text-orange-100">{riskScore}</p>
                        <p className="mt-1 text-xs text-orange-700 dark:text-orange-200">
                          {findings.filter(f => f.severity === 'CRITICAL').length} Critical &bull; {findings.filter(f => f.severity === 'HIGH').length} High &bull; {findings.filter(f => f.severity === 'MEDIUM').length} Medium &bull; {findings.filter(f => f.severity === 'LOW').length} Low
                        </p>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  Click a file to load its contents.
                </div>
              )}
            </div>
          </div>

          {files.length > 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Repository Context</p>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Security-minded summary powered by Gemini</p>
                </div>
                {loadingContext ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Analyzing...
                  </span>
                ) : null}
              </div>

              {repoContext ? (
                <div className="prose prose-sm max-w-none dark:prose-invert text-slate-700 dark:text-slate-300">
                  <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {repoContext}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : loadingContext ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  Generating repository context...
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  Scan a repository to generate context.
                </div>
              )}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  )
}
