"use client"

import { useMemo, useState } from 'react'
import {
  analyzeFiles,
  buildCompactAiPayload,
  buildRepoSummary,
  explanations,
  type AnalysisResult,
  type FileMetadata,
  type Finding
} from '@/lib/analyzer'

const emptyAnalysis: AnalysisResult = {
  findings: [],
  metadata: [],
  repoSummary: buildRepoSummary([], [], 0)
}

function cacheKeyFromPayload(payload: unknown) {
  const raw = JSON.stringify(payload)
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0
  }
  return `${raw.length}:${hash}`
}

function mergeAnalysis(previous: AnalysisResult, next: AnalysisResult, fileCount: number) {
  const metadataByFile = new Map<string, FileMetadata>()
  previous.metadata.forEach(item => metadataByFile.set(item.filePath, item))
  next.metadata.forEach(item => metadataByFile.set(item.filePath, item))

  const findingById = new Map<string, Finding>()
  previous.findings.forEach(item => findingById.set(item.id, item))
  next.findings.forEach(item => findingById.set(item.id, item))

  const metadata = Array.from(metadataByFile.values())
  const findings = Array.from(findingById.values())
  return {
    metadata,
    findings,
    repoSummary: buildRepoSummary(metadata, findings, fileCount || metadata.length)
  }
}

export function useScrutinyWorkspace() {
  const [repoUrl, setRepoUrl] = useState('')
  const [files, setFiles] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [contentCollapsed, setContentCollapsed] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [loadingFile, setLoadingFile] = useState(false)
  const [status, setStatus] = useState('Waiting for repository...')
  const [error, setError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult>(emptyAnalysis)
  const [repoInsights, setRepoInsights] = useState<string | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState<string | null>(null)
  const [insightsCache, setInsightsCache] = useState<Record<string, string>>({})
  const [devMode, setDevMode] = useState(false)
  const [devCode, setDevCode] = useState('')
  const [devFilePath, setDevFilePath] = useState('pasted-file.js')

  const selectedMetadata = useMemo(
    () => analysis.metadata.find(item => item.filePath === selectedFile) ?? null,
    [analysis.metadata, selectedFile]
  )

  const selectedFindings = useMemo(
    () => analysis.findings.filter(item => item.file === selectedFile),
    [analysis.findings, selectedFile]
  )

  const selectedExplanation = selectedFinding ? explanations[selectedFinding.title] : null

  const resetScanState = () => {
    setError(null)
    setFileError(null)
    setSelectedFile(null)
    setSelectedFinding(null)
    setFileContent('')
    setFiles([])
    setAnalysis(emptyAnalysis)
    setRepoInsights(null)
    setInsightsError(null)
  }

  const analyzeAndStore = (file: string, content: string, knownFileCount = files.length) => {
    const next = analyzeFiles([{ file, content }])
    setAnalysis(previous => mergeAnalysis(previous, next, knownFileCount || previous.repoSummary.fileCount || 1))
    return next
  }

  const handleDevPasteScan = () => {
    const file = devFilePath.trim() || 'pasted-file.js'
    setError(null)
    setFileError(null)
    setSelectedFinding(null)
    setRepoInsights(null)
    setInsightsError(null)
    setFiles([])
    setSelectedFile(file)
    setFileContent(devCode)
    setStatus(`Loaded pasted file ${file}`)
    setAnalysis(analyzeFiles([{ file, content: devCode }]))
  }

  const handleScan = async () => {
    if (devMode && devCode.trim()) {
      handleDevPasteScan()
      return
    }

    resetScanState()
    if (!repoUrl.trim()) {
      setError('Please paste a GitHub repository URL.')
      setStatus('Waiting for repository...')
      return
    }

    setScanning(true)
    setStatus('Scanning repository tree...')

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
        return
      }

      const discovered = payload.files ?? []
      setFiles(discovered)
      setAnalysis({ ...emptyAnalysis, repoSummary: buildRepoSummary([], [], discovered.length) })
      setStatus(`Found ${discovered.length} files. Open files to analyze them locally.`)
    } catch {
      setError('Unable to reach the scan endpoint. Check the URL and try again.')
      setStatus('Scan failed')
    } finally {
      setScanning(false)
    }
  }

  const handleSelectFile = async (path: string) => {
    setSelectedFile(path)
    setSelectedFinding(null)
    setFileError(null)
    setFileContent('')
    setContentCollapsed(false)

    if (devMode) return
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

      const content = payload.content ?? ''
      setFileContent(content)
      analyzeAndStore(path, content, files.length)
      setStatus(`Analyzed ${path}`)
    } catch {
      setFileError('Unable to reach the file endpoint. Try again.')
      setStatus('File load failed')
    } finally {
      setLoadingFile(false)
    }
  }

  const generateInsights = async () => {
    if (analysis.metadata.length === 0) {
      setInsightsError('Open at least one file before generating insights.')
      return
    }

    const compactPayload = buildCompactAiPayload(analysis)
    const cacheKey = cacheKeyFromPayload({ repoUrl, devMode, compactPayload })
    if (insightsCache[cacheKey]) {
      setRepoInsights(insightsCache[cacheKey])
      setInsightsError(null)
      return
    }

    setInsightsLoading(true)
    setInsightsError(null)

    try {
      const response = await fetch('/api/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: devMode ? `dev:${devFilePath}` : repoUrl.trim(),
          analysis: compactPayload,
          mode: devMode ? 'dev' : 'repo'
        })
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        setInsightsError(payload.message || 'Failed to generate insights.')
        return
      }
      setRepoInsights(payload.context)
      setInsightsCache(previous => ({ ...previous, [cacheKey]: payload.context }))
    } catch {
      setInsightsError('Unable to reach the insights endpoint.')
    } finally {
      setInsightsLoading(false)
    }
  }

  return {
    repoUrl,
    setRepoUrl,
    files,
    selectedFile,
    fileContent,
    contentCollapsed,
    setContentCollapsed,
    scanning,
    loadingFile,
    status,
    error,
    fileError,
    selectedFinding,
    setSelectedFinding,
    selectedFindings,
    selectedMetadata,
    selectedExplanation,
    analysis,
    repoInsights,
    insightsLoading,
    insightsError,
    generateInsights,
    devMode,
    setDevMode,
    devCode,
    setDevCode,
    devFilePath,
    setDevFilePath,
    handleScan,
    handleSelectFile,
    handleDevPasteScan
  }
}
