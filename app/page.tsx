"use client"

import { useMemo, useState, useEffect } from 'react'
import { scanFiles, Finding, explanations } from '@/lib/scanner'
import { buildFileIntelligence, FileIntelligence } from '@/lib/fileIntelligence'
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ReactFlow from 'reactflow'
import 'reactflow/dist/style.css'

export default function Page() {
  const [repoUrl, setRepoUrl] = useState('')
  const [files, setFiles] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [contentCollapsed, setContentCollapsed] = useState(false)
  const [fileIntelligenceOpen, setFileIntelligenceOpen] = useState(false)
  const [skipRepoContext, setSkipRepoContext] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [loadingFile, setLoadingFile] = useState(false)
  const [status, setStatus] = useState('Waiting for repository...')
  const [error, setError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null)
  const [allDiscoveredFindings, setAllDiscoveredFindings] = useState<Finding[]>([])
  const [repoContext, setRepoContext] = useState<string | null>(null)
  const [loadingContext, setLoadingContext] = useState(false)
  const [aiExplanation, setAiExplanation] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiCache, setAiCache] = useState<Record<string, string>>({})
  const [catClicks, setCatClicks] = useState(0)
  const [devMode, setDevMode] = useState(false)
  const [devCode, setDevCode] = useState('')
  const [devFilePath, setDevFilePath] = useState('pasted-file.js')
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const [bubbleVisible, setBubbleVisible] = useState(false)

  const [sidebarOpen, setSidebarOpen] = useState(true)

  const scrollToSection = (id: string) => {
    if (typeof document === 'undefined') return
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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
  const getAiCacheKey = (finding: Finding) => `${finding.title}:${finding.code}`

  const fileIntelligence = useMemo<FileIntelligence | null>(() => {
    return buildFileIntelligence(selectedFile, fileContent, findings)
  }, [selectedFile, fileContent, findings])

  const fileIntelligenceNodes = useMemo(() => {
    if (!fileIntelligence?.callGraph?.length) return []
    const uniqueNames = Array.from(new Set(fileIntelligence.callGraph.flatMap(edge => [edge.caller, edge.callee])))
    return uniqueNames.map((name, index) => ({
      id: name,
      position: { x: (index % 3) * 220, y: Math.floor(index / 3) * 140 },
      data: { label: name },
      style: { borderRadius: 16, padding: 10, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a' }
    }))
  }, [fileIntelligence?.callGraph])

  const fileIntelligenceEdges = useMemo(() => {
    if (!fileIntelligence?.callGraph?.length) return []
    return fileIntelligence.callGraph.map((edge, index) => ({
      id: `edge-${index}`,
      source: edge.caller,
      target: edge.callee,
      animated: true,
      style: { stroke: '#fb923c' }
    }))
  }, [fileIntelligence?.callGraph])

  const defaultEdgeOptions = useMemo(() => ({ animated: true, style: { stroke: '#fb923c' } }), [])

  const inferImportDomain = (importPath: string) => {
    if (importPath.startsWith('.') || importPath.startsWith('/')) return 'local'
    if (importPath.includes('react')) return 'UI'
    if (importPath.includes('next')) return 'framework'
    if (importPath.includes('express') || importPath.includes('axios') || importPath.includes('http')) return 'network'
    if (importPath.includes('jsonwebtoken') || importPath.includes('bcrypt')) return 'auth'
    return 'dependency'
  }

  const inferFunctionRole = (fnName: string) => {
    const lower = fnName.toLowerCase()
    if (lower.includes('render') || lower.includes('component')) return 'UI render / component'
    if (lower.includes('handle') || lower.includes('on')) return 'Event or request handler'
    if (lower.includes('fetch') || lower.includes('load') || lower.includes('get')) return 'Data retrieval'
    if (lower.includes('save') || lower.includes('set') || lower.includes('update')) return 'State or persistence updater'
    if (lower.includes('validate') || lower.includes('check')) return 'Validation / guard'
    return 'Utility helper'
  }

  const renderCallTree = (graph: Array<{ caller: string; callee: string }>) => {
    if (!graph.length) {
      return 'No call flow detected.'
    }

    const callers = graph.reduce<Record<string, string[]>>((acc, edge) => {
      acc[edge.caller] = [...(acc[edge.caller] || []), edge.callee]
      return acc
    }, {})

    const roots = graph.map(edge => edge.caller).filter(caller => !graph.some(edge => edge.callee === caller))
    const renderNode = (name: string, prefix = ''): string => {
      const children = callers[name] ?? []
      if (!children.length) return `${prefix}${name}`
      return `${prefix}${name}\n${children.map((child, index) => renderNode(child, `${prefix}${index === children.length - 1 ? '└── ' : '├── '}`)).join('\n')}`
    }

    const uniqueRoots = Array.from(new Set(roots.length ? roots : graph.map(edge => edge.caller)))
    return uniqueRoots.map(root => renderNode(root)).join('\n')
  }

  const buildNodes = (graph: Array<{ caller: string; callee: string }>) => {
    const uniqueNames = Array.from(new Set(graph.flatMap(edge => [edge.caller, edge.callee])))
    return uniqueNames.map((name, index) => ({ id: name, position: { x: (index % 4) * 160, y: Math.floor(index / 4) * 120 }, data: { label: name } }))
  }

  const buildEdges = (graph: Array<{ caller: string; callee: string }>) => {
    return graph.map((edge, index) => ({ id: `edge-${index}`, source: edge.caller, target: edge.callee }))
  }

  useEffect(() => {
    if (!selectedFile || !fileContent) {
      setFileIntelligenceOpen(false)
    }
  }, [selectedFile, fileContent])

  const securityStoryStyles: Record<Finding['severity'], string> = {
    CRITICAL: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950',
    HIGH: 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950',
    MEDIUM: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950',
    LOW: 'border-teal-200 bg-teal-50 dark:border-teal-900 dark:bg-teal-950'
  }

  const getSecurityStoryClasses = (severity: Finding['severity']) => securityStoryStyles[severity] ?? securityStoryStyles.MEDIUM
  const selectedSecurityStory = selectedFinding?.securityStory ?? []
  const selectedAttackChain = selectedFinding?.attackChain

  const handleCatClick = () => {
    setCatClicks((prev) => {
      const next = prev + 1
      if (next >= 5) {
        setDevMode(true)
        setSkipRepoContext(true)
      }
      return next
    })
  }

  useEffect(() => {
    if (devMode) {
      setSkipRepoContext(true)
    }
  }, [devMode])

  const handleDevPasteScan = () => {
    setError(null)
    setFileError(null)
    setSelectedFinding(null)
    setAiExplanation(null)
    setAiError(null)
    setFiles([])
    setSelectedFile(devFilePath || 'pasted-file.js')
    setFileContent(devCode)
    setRepoContext(null)
    setAllDiscoveredFindings([])
    setFileIntelligenceOpen(false)
    setStatus(`Loaded pasted file ${devFilePath}`)
  }

  useEffect(() => {
    if (selectedFinding) {
      const key = getAiCacheKey(selectedFinding)
      setAiExplanation(aiCache[key] ?? null)
      setAiError(null)
    } else {
      setAiExplanation(null)
      setAiError(null)
    }
  }, [selectedFinding, aiCache])

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setCursorPos({ x: event.clientX, y: event.clientY })
    }

    if (devMode && scanning) {
      document.body.style.cursor = 'none'
      window.addEventListener('mousemove', handleMouseMove)
    }

    return () => {
      document.body.style.cursor = ''
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [devMode, scanning])

  useEffect(() => {
    if (!devMode || !scanning) {
      setBubbleVisible(false)
      return
    }

    const interval = window.setInterval(() => {
      setBubbleVisible(true)
      window.setTimeout(() => setBubbleVisible(false), 900)
    }, 3200)

    return () => {
      window.clearInterval(interval)
      setBubbleVisible(false)
    }
  }, [devMode, scanning])

  useEffect(() => {
    if (fileContent) {
      setContentCollapsed(false)
    }
  }, [fileContent])

  const getSnippet = (finding: Finding) => {
    const lines = fileContent.split('\n')
    const lineIndex = finding.line - 1
    const snippet = lines.slice(Math.max(0, lineIndex - 3), Math.min(lines.length, lineIndex + 4))
    return snippet.join('\n')
  }

  const handleAiExplain = async () => {
    if (!selectedFinding) {
      return
    }

    const cacheKey = getAiCacheKey(selectedFinding)
    if (aiCache[cacheKey]) {
      setAiExplanation(aiCache[cacheKey])
      setAiError(null)
      return
    }

    setAiLoading(true)
    setAiError(null)

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedFinding.title,
          file: selectedFinding.file,
          line: selectedFinding.line,
          code: selectedFinding.code,
          snippet: getSnippet(selectedFinding)
        })
      })

      const payload = await response.json()
      if (!response.ok || !payload.success) {
        setAiError(payload.message || 'Failed to get AI explanation')
        return
      }

      setAiExplanation(payload.explanation)
      setAiCache((prev) => ({ ...prev, [cacheKey]: payload.explanation }))
    } catch (error) {
      console.error('AI explain error:', error)
      setAiError('Unable to reach AI explain endpoint.')
    } finally {
      setAiLoading(false)
    }
  }
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
    setSelectedFinding(null)
    setFileContent('')
    setFiles([])
    setAllDiscoveredFindings([])
    setRepoContext(null)
    setAiExplanation(null)
    setAiError(null)

    if (devMode && devCode.trim()) {
      handleDevPasteScan()
      return
    }

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

      if (skipRepoContext || devMode) {
        setLoadingContext(false)
        setRepoContext(null)
      } else {
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
    setSelectedFinding(null)
    setAiExplanation(null)
    setAiError(null)
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
    <div className="relative min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900 dark:from-slate-950 dark:to-slate-900 dark:text-slate-100">
      <main className="mx-auto flex w-full max-w-[105rem] flex-col gap-4 px-6 py-14 lg:px-16">
        <header className="space-y-4">
          <div className="relative">
            <h1 className="text-5xl font-bold tracking-tight text-slate-950 dark:text-slate-50">Scrutiny</h1>
            <button
              type="button"
              onClick={handleCatClick}
              className="absolute top-2 right-0 text-2xl opacity-90 transition hover:scale-110 focus:outline-none"
              aria-label="Neko easter egg"
            >
              {devMode ? 'ᓚᘏᗢ' : 'ฅ^•ﻌ•^ฅ'}
            </button>
          </div>
          <p className="max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-400">
            Understand code. Discover risks. Contribute confidently.
          </p>
          {devMode ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <span className="font-semibold">Developer mode enabled</span>
              <span className="text-xs">ᓚᘏᗢ</span>
            </div>
          ) : catClicks > 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Cat clicks: {catClicks}/5</p>
          ) : null}
        </header>

        {/* Collapsible sidebar index (thin) */}
        <div className="hidden md:block">
          <div className="fixed left-6 top-1/3 z-50">
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle index"
                className="rounded-full bg-white/90 dark:bg-slate-900/80 p-2 shadow"
              >
                {sidebarOpen ? '◀' : '▶'}
              </button>
              {sidebarOpen ? (
                <div className="mt-2 w-44 rounded-2xl bg-white/90 dark:bg-slate-900/80 p-2 shadow-lg">
                  <nav className="flex flex-col gap-1">
                    <button onClick={() => scrollToSection('selected-file')} className="w-full text-left text-sm px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">Selected file</button>
                    <button onClick={() => scrollToSection('findings')} className="w-full text-left text-sm px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">Findings</button>
                    <button onClick={() => scrollToSection('repo-context')} className="w-full text-left text-sm px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">Repository Context</button>
                    <button onClick={() => scrollToSection('ai-explain')} className="w-full text-left text-sm px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">AI Explanation</button>
                  </nav>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <input
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              type="text"
              placeholder="https://github.com/owner/repo"
              className="flex-1 rounded-2xl border border-slate-300 bg-slate-50 px-5 py-3 text-base text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700/50"
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={handleScan}
                disabled={scanning}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-8 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {scanning ? 'Scanning...' : 'Scan'}
              </button>
              <button
                type="button"
                onClick={() => setSkipRepoContext((prev) => !prev)}
                disabled={scanning}
                className={`inline-flex h-12 items-center justify-center rounded-2xl border px-5 text-sm font-semibold transition ${
                  skipRepoContext
                    ? 'border-red-300 bg-red-50 text-red-900 hover:bg-red-100 dark:border-red-700 dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-900'
                    : 'border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {skipRepoContext ? 'Repo context off' : 'Disable repo context'}
              </button>
            </div>
          </div>

          {devMode ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">Dev mode activated</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Repo context generation is disabled. Paste code below to scan a single file locally.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  DEV MODE
                </span>
              </div>
              <div className="grid gap-4">
                <input
                  value={devFilePath}
                  onChange={(event) => setDevFilePath(event.target.value)}
                  placeholder="pasted-file.js"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200/50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700/50"
                />
                <textarea
                  value={devCode}
                  onChange={(event) => setDevCode(event.target.value)}
                  rows={6}
                  placeholder="Paste source code here to scan it directly."
                  className="min-h-[160px] w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm font-mono text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200/50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700/50"
                />
                <button
                  type="button"
                  onClick={handleDevPasteScan}
                  disabled={scanning}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-8 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  Scan pasted file
                </button>
              </div>
            </div>
          ) : null}

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
                  <p className="font-mono text-sm text-slate-500 dark:text-slate-500 whitespace-pre-line"> 
                    {devMode ? 'Dev mode active:\nrepo file list is disabled while scanning pasted file.' : 'No files yet. Scan a repository first.'} 
                  </p>
                ) : (
                  <div className="space-y-1">
                    {files.slice(0, 40).map((file) => (
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
              {files.length > 40 ? (
                <p className="mt-4 text-xs text-slate-500 dark:text-slate-500">
                  Showing first 40 of {files.length} files.
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

            <div id="selected-file" className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Selected file</p>
                  <p className="mt-2 font-mono text-base text-slate-900 dark:text-slate-100">{selectedFile ?? 'None'}</p>
                </div>
                {fileIntelligence ? (
                  <button
                    type="button"
                    onClick={() => setFileIntelligenceOpen((prev) => !prev)}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    {fileIntelligenceOpen ? 'Hide File Intelligence' : 'View File Intelligence'}
                  </button>
                ) : null}
              </div>

              {fileError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                  {fileError}
                </div>
              ) : null}

              {findings.length > 0 ? (
                <div id="findings" className="space-y-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 font-semibold">Findings</p>
                    <div className="mt-4 space-y-3">
                      {findings.map((finding, index) => (
                        <div 
                          key={`${finding.file}-${finding.line}-${index}`} 
                          className="relative rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 cursor-pointer transition hover:border-slate-300 dark:hover:border-slate-700" 
                          onClick={() => setSelectedFinding(finding)}
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                                {finding.severity}
                              </p>
                              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                                {finding.title}
                              </p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Line {finding.line}
                              </p>
                            </div>

                            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                              {selectedFinding === finding ? (
                                <button
                                  type="button"
                                  onClick={handleAiExplain}
                                  disabled={aiLoading}
                                  className="inline-flex h-8 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                                >
                                  {aiLoading ? 'Explaining...' : 'Explain'}
                                </button>
                              ) : null}
                            </div>
                          </div>

                          <p className="mt-4 text-sm text-slate-700 dark:text-slate-300">
                            Matched: <span className="font-mono text-xs">{finding.matched}</span>
                          </p>
                          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                            {finding.code}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedFinding && explanations[selectedFinding.title] ? (
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
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

                  {selectedAttackChain ? (
                    <div className={`rounded-2xl border p-4 ${getSecurityStoryClasses(selectedFinding.severity)}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 font-semibold">Attack Chain</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">3 Steps</p>
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Severity</p>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{selectedFinding.severity}</p>
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Potential Impact</p>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{selectedAttackChain.impact}</p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4">
                        <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">ENTRY POINT</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedAttackChain.entry}</p>
                          {selectedAttackChain.entryEvidence ? (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">({selectedAttackChain.entryEvidence})</p>
                          ) : null}
                        </div>

                        <div className="flex flex-col items-center text-center text-[11px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                          <span className="block leading-none">│</span>
                          <span className="mt-2 block">├── reaches</span>
                          <span className="mt-2 block">▼</span>
                        </div>

                        <div className="rounded-2xl border-2 border-orange-500 bg-orange-100 p-4 shadow-lg shadow-orange-200/50 dark:border-orange-400 dark:bg-orange-950">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-orange-700 dark:text-orange-300">VULNERABLE SINK</p>
                          <p className="mt-2 text-sm font-semibold text-orange-900 dark:text-orange-100">{selectedAttackChain.sink}</p>
                          {selectedAttackChain.sinkEvidence ? (
                            <p className="mt-1 text-xs text-orange-700 dark:text-orange-300">({selectedAttackChain.sinkEvidence})</p>
                          ) : null}
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{selectedAttackChain.location}</p>
                        </div>

                        <div className="flex flex-col items-center text-center text-[11px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                          <span className="block leading-none">│</span>
                          <span className="mt-2 block">├── enables</span>
                          <span className="mt-2 block">▼</span>
                        </div>

                        <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">IMPACT</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedAttackChain.impact}</p>
                        </div>
                      </div>

                      {selectedFinding.scenario ? (
                        <div className="mt-4 rounded-2xl border border-slate-300 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-950">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-semibold">Scenario</p>
                          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{selectedFinding.scenario}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : selectedFinding?.securityStory ? (
                    <div className={`rounded-2xl border p-4 ${getSecurityStoryClasses(selectedFinding.severity)}`}>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 font-semibold">Security Story</p>
                        <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">Confidence: {selectedFinding.storyConfidence ?? 'Medium'}</p>
                      </div>
                      <div className="mt-4 space-y-3 text-sm text-slate-900 dark:text-slate-100">
                        {selectedSecurityStory.map((step, index) => (
                          <div key={`${step}-${index}`} className="space-y-1">
                            <div>{step}</div>
                            {index !== selectedSecurityStory.length - 1 ? (
                              <div className="text-slate-500 dark:text-slate-400">↓</div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      {selectedFinding.scenario ? (
                        <div className="mt-4 rounded-2xl border border-slate-300 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-950">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-semibold">Scenario</p>
                          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{selectedFinding.scenario}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
                    <p className="text-xs uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400 font-semibold">Risk Score</p>
                    <p className="mt-2 text-3xl font-bold text-orange-900 dark:text-orange-100">{riskScore}</p>
                    <p className="mt-1 text-xs text-orange-700 dark:text-orange-200">
                      {findings.filter(f => f.severity === 'CRITICAL').length} Critical &bull; {findings.filter(f => f.severity === 'HIGH').length} High &bull; {findings.filter(f => f.severity === 'MEDIUM').length} Medium &bull; {findings.filter(f => f.severity === 'LOW').length} Low
                    </p>
                  </div>
                </div>
              ) : null}

              {fileContent ? (
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    <div>
                      <div>File content</div>
                      <div className="text-xs font-normal text-slate-500 dark:text-slate-400">{selectedFile}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setContentCollapsed(prev => !prev)}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                      {contentCollapsed ? 'Show code' : 'Hide code'}
                    </button>
                  </div>
                  {!contentCollapsed ? (
                    <div className="p-5 text-sm leading-6 text-slate-900 dark:text-slate-200">
                    <div className="max-h-[420px] max-w-full overflow-x-auto overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                      <pre className="min-w-max whitespace-pre font-mono">{fileContent}</pre>
                    </div>
                  </div>
                  ) : (
                    <div className="p-5 text-sm text-slate-500 dark:text-slate-400">File content hidden. Expand to inspect the code.</div>
                  )}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  Click a file to load its contents.
                </div>
              )}
            </div>
          </div>

          {fileIntelligenceOpen && fileIntelligence ? (
            <div className="fixed inset-y-0 right-0 z-50 w-[70%] max-w-[900px] overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">File Intelligence</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">{fileIntelligence.modulePurpose}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFileIntelligenceOpen(false)}
                  className="rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  Close
                </button>
              </div>

              <div className="mt-6 space-y-8 text-slate-900 dark:text-slate-100">
                <section>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Overview</p>
                      <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">Purpose inferred from file signals.</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      Confidence: {fileIntelligence.confidence}%
                    </span>
                  </div>
                  <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{fileIntelligence.modulePurpose}</p>
                    <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                      {fileIntelligence.findings.length > 0 ? (
                        <p>Reasoning:</p>
                      ) : null}
                      <ul className="list-disc space-y-1 pl-5">
                        {fileIntelligence.frameworkHints.map((hint) => (
                          <li key={hint}>{hint}</li>
                        ))}
                        {fileIntelligence.imports.slice(0, 4).map((imp) => (
                          <li key={imp}>{imp}</li>
                        ))}
                        {fileIntelligence.functions.slice(0, 4).map((fn) => (
                          <li key={fn}>{fn}()</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>

                <section>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Signals</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">File Name</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{fileIntelligence.filePath}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">File Type</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{fileIntelligence.fileType}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Imports</p>
                      <ul className="mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                        {fileIntelligence.imports.slice(0, 12).map((imp) => (
                          <li key={imp}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Functions</p>
                      <ul className="mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                        {fileIntelligence.functions.slice(0, 12).map((fn) => (
                          <li key={fn}>{fn}()</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {fileIntelligence.classes.length > 0 ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Classes</p>
                      <ul className="mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                        {fileIntelligence.classes.map((name) => (
                          <li key={name}>{name}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>

                <section>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Responsibilities</p>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                    <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                      {fileIntelligence.responsibilities.map((item) => (
                        <li key={item}>✓ {item}</li>
                      ))}
                    </ul>
                  </div>
                </section>

                <section>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Structure</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Import Mapping</p>
                      <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                        {fileIntelligence.imports.slice(0, 8).map((imp) => (
                          <div key={imp} className="flex items-center justify-between gap-4">
                            <span>{imp}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{inferImportDomain(imp)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Key Functions</p>
                      <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                        {fileIntelligence.functions.slice(0, 8).map((fn) => (
                          <div key={fn}>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{fn}()</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{inferFunctionRole(fn)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Call Flow</p>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                    {fileIntelligence.callGraph.length <= 3 ? (
                      <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">{renderCallTree(fileIntelligence.callGraph)}</pre>
                    ) : (
                      <div className="h-[320px]">
                        <ReactFlow
                          nodes={fileIntelligenceNodes}
                          edges={fileIntelligenceEdges}
                          fitView
                          fitViewOptions={{ padding: 0.2 }}
                          defaultEdgeOptions={defaultEdgeOptions}
                          nodesDraggable={false}
                          nodesConnectable={false}
                          panOnScroll
                        />
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          ) : null}

          {files.length > 0 ? (
            <div id="repo-context" className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
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
              ) : skipRepoContext ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  Repository context generation is disabled. Toggle "Disable repo context" before scanning to preserve Gemini tokens during development.
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

              {(aiExplanation || aiLoading || aiError) ? (
                <div id="ai-explain" className="mt-6 rounded-3xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-800 dark:bg-violet-950">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-violet-500 dark:text-violet-300">AI Explanation</p>
                      <p className="mt-2 text-xs text-violet-600 dark:text-violet-400">Detailed Gemini explanation for the selected finding</p>
                    </div>
                    {aiLoading ? (
                      <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-900 dark:text-violet-200">
                        Loading AI
                      </span>
                    ) : null}
                  </div>

                  {aiError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                      {aiError}
                    </div>
                  ) : null}

                  {aiExplanation ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert text-slate-700 dark:text-slate-300">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiExplanation}</ReactMarkdown>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </main>

      {devMode && scanning ? (
        <>
          <div
            style={{
              position: 'fixed',
              top: cursorPos.y + 18,
              left: cursorPos.x + 18,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 60,
              animation: 'spin 1.5s linear infinite'
            }}
            className="text-4xl"
            aria-hidden="true"
          >
            ᓚᘏᗢ
          </div>
          {bubbleVisible ? (
            <div
              style={{
                position: 'fixed',
                top: cursorPos.y - 18,
                left: cursorPos.x + 26,
                pointerEvents: 'none',
                zIndex: 60
              }}
              className="text-xs text-white bg-black/70 px-2 py-1 rounded-full opacity-90"
              aria-hidden="true"
            >
              nya~
            </div>
          ) : null}
          <style>{`@keyframes spin { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }`}</style>
        </>
      ) : null}
    </div>
  )
}
