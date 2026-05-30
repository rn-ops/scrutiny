'use client'

import { useMemo, useState } from 'react'
import { scanFiles, Finding } from '@/lib/scanner'

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

  const fileCount = files.length
  const findings = useMemo(() => {
    if (!selectedFile || !fileContent) {
      return []
    }

    return scanFiles([{ file: selectedFile, content: fileContent }])
  }, [selectedFile, fileContent])

  const handleScan = async () => {
    setError(null)
    setFileError(null)
    setSelectedFile(null)
    setFileContent('')
    setFiles([])

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
                    {files.slice(0, 20).map((file) => (
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
              {files.length > 20 ? (
                <p className="mt-4 text-xs text-slate-500 dark:text-slate-500">
                  Showing first 20 of {files.length} files.
                </p>
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
                          <div key={`${finding.file}-${finding.line}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{finding.severity}</p>
                            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{finding.title}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Line {finding.line}</p>
                            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">Matched: <span className="font-mono">{finding.matched}</span></p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">No suspicious strings found in this file.</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  Click a file to load its contents.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
