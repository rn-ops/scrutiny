"use client"

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ReactNode } from 'react'
import type { FileMetadata, Finding, RepoSummary } from '@/lib/analyzer'

type Explanation = { why: string; impact: string; fix: string } | null

type DashboardProps = {
  repoUrl: string
  setRepoUrl: (value: string) => void
  files: string[]
  selectedFile: string | null
  fileContent: string
  contentCollapsed: boolean
  setContentCollapsed: (value: boolean | ((previous: boolean) => boolean)) => void
  scanning: boolean
  loadingFile: boolean
  status: string
  error: string | null
  fileError: string | null
  selectedFinding: Finding | null
  setSelectedFinding: (finding: Finding | null) => void
  selectedFindings: Finding[]
  selectedMetadata: FileMetadata | null
  selectedExplanation: Explanation
  repoSummary: RepoSummary
  repoInsights: string | null
  insightsLoading: boolean
  insightsError: string | null
  generateInsights: () => void
  devMode: boolean
  setDevMode: (value: boolean) => void
  devCode: string
  setDevCode: (value: string) => void
  devFilePath: string
  setDevFilePath: (value: string) => void
  handleScan: () => void
  handleSelectFile: (file: string) => void
  handleDevPasteScan: () => void
}

const severityStyles: Record<Finding['severity'], string> = {
  CRITICAL: 'border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950 dark:text-red-100',
  HIGH: 'border-orange-300 bg-orange-50 text-orange-950 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-100',
  MEDIUM: 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100',
  LOW: 'border-teal-300 bg-teal-50 text-teal-950 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-100'
}

function RiskOverview({ summary }: { summary: RepoSummary }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Files opened" value={summary.scannedFileCount} subtext={`${summary.fileCount} discovered`} />
      <Metric label="Risk score" value={summary.riskScore} subtext="Critical 10, high 5, medium 2, low 1" />
      <Metric label="Findings" value={summary.findingCount} subtext={`${summary.severityCounts.CRITICAL} critical, ${summary.severityCounts.HIGH} high`} />
      <Metric label="Modules" value={summary.modules.length} subtext={summary.frameworks.slice(0, 3).join(', ') || 'No framework signal yet'} />
    </section>
  )
}

function Metric({ label, value, subtext }: { label: string; value: number; subtext: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-slate-100">{value}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtext}</p>
    </div>
  )
}

function ScanControls(props: DashboardProps) {
  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-3 lg:flex-row">
        <input
          value={props.repoUrl}
          onChange={event => props.setRepoUrl(event.target.value)}
          type="text"
          placeholder="https://github.com/owner/repo"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <button
          onClick={props.handleScan}
          disabled={props.scanning}
          className="h-11 rounded-lg bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950"
        >
          {props.scanning ? 'Scanning...' : props.devMode ? 'Scan Paste' : 'Scan Repo'}
        </button>
        <button
          type="button"
          onClick={() => props.setDevMode(!props.devMode)}
          className="h-11 rounded-lg border border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          {props.devMode ? 'Repo Mode' : 'Dev Mode'}
        </button>
      </div>

      {props.devMode ? (
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <input
            value={props.devFilePath}
            onChange={event => props.setDevFilePath(event.target.value)}
            placeholder="pasted-file.js"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <textarea
            value={props.devCode}
            onChange={event => props.setDevCode(event.target.value)}
            rows={7}
            placeholder="Paste source code here."
            className="min-h-[180px] rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={props.handleDevPasteScan}
            className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-950"
          >
            Analyze Pasted File
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-slate-700 dark:text-slate-300">{props.status}</span>
        {props.loadingFile ? <span className="font-semibold text-slate-500 dark:text-slate-400">Loading file...</span> : null}
      </div>
      {props.error ? <Notice>{props.error}</Notice> : null}
    </section>
  )
}

function FileBrowser({ files, selectedFile, devMode, handleSelectFile, hotspots }: {
  files: string[]
  selectedFile: string | null
  devMode: boolean
  handleSelectFile: (file: string) => void
  hotspots: RepoSummary['hotspots']
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">File Selection</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-100">Repository files</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">{files.length}</span>
      </div>

      <div className="mt-4 max-h-[520px] space-y-1 overflow-y-auto pr-1">
        {files.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{devMode ? 'Paste mode is active.' : 'Scan a repository to list files.'}</p>
        ) : files.slice(0, 80).map(file => (
          <button
            key={file}
            onClick={() => handleSelectFile(file)}
            className={`w-full truncate rounded-md px-3 py-2 text-left font-mono text-xs transition ${
              selectedFile === file
                ? 'bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950'
                : 'bg-slate-50 text-slate-800 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
            title={file}
          >
            {file}
          </button>
        ))}
      </div>

      {hotspots.length > 0 ? (
        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="text-xs uppercase tracking-[0.18em] text-red-600 dark:text-red-300">Hotspots</p>
          <div className="mt-3 space-y-2">
            {hotspots.map(hotspot => (
              <button
                key={hotspot.file}
                onClick={() => handleSelectFile(hotspot.file)}
                className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-left dark:border-red-900 dark:bg-red-950"
              >
                <p className="truncate font-mono text-xs text-red-950 dark:text-red-100">{hotspot.file}</p>
                <p className="text-xs text-red-700 dark:text-red-300">{hotspot.count} findings, risk {hotspot.riskScore}</p>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function SelectedFilePanel(props: Pick<DashboardProps, 'selectedFile' | 'fileContent' | 'contentCollapsed' | 'setContentCollapsed' | 'fileError' | 'selectedMetadata'>) {
  return (
    <section id="selected-file" className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Selected File</p>
        <h2 className="break-all font-mono text-sm font-semibold text-slate-950 dark:text-slate-100">{props.selectedFile ?? 'None'}</h2>
      </div>

      {props.fileError ? <div className="mt-4"><Notice>{props.fileError}</Notice></div> : null}
      {props.selectedMetadata ? <MetadataSummary metadata={props.selectedMetadata} /> : null}

      {props.fileContent ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">File content</span>
            <button
              type="button"
              onClick={() => props.setContentCollapsed(!props.contentCollapsed)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              {props.contentCollapsed ? 'Show' : 'Hide'}
            </button>
          </div>
          {!props.contentCollapsed ? (
            <div className="max-w-full overflow-hidden p-3">
              <div className="max-h-[430px] max-w-full overflow-x-auto overflow-y-auto rounded-md bg-white p-3 dark:bg-slate-950">
                <pre className="inline-block min-w-max whitespace-pre font-mono text-xs leading-5 text-slate-900 dark:text-slate-100">{props.fileContent}</pre>
              </div>
            </div>
          ) : (
            <p className="p-4 text-sm text-slate-500 dark:text-slate-400">File content hidden.</p>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Open a file to inspect code, metadata, and findings.
        </div>
      )}
    </section>
  )
}

function MetadataSummary({ metadata }: { metadata: FileMetadata }) {
  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-3">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs text-slate-500 dark:text-slate-400">Purpose</p>
        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{metadata.modulePurpose}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Confidence {metadata.confidence}%</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs text-slate-500 dark:text-slate-400">Structure</p>
        <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{metadata.metrics.functionCount} functions, {metadata.metrics.classCount} classes</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{metadata.metrics.linesOfCode} lines of code</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs text-slate-500 dark:text-slate-400">Signals</p>
        <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{metadata.frameworkHints.map(hint => hint.framework).join(', ') || 'No framework signal'}</p>
        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{metadata.responsibilities.join(', ')}</p>
      </div>
    </div>
  )
}

function FindingsPanel({ findings, selectedFinding, setSelectedFinding, explanation }: {
  findings: Finding[]
  selectedFinding: Finding | null
  setSelectedFinding: (finding: Finding | null) => void
  explanation: Explanation
}) {
  return (
    <section id="findings" className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Findings</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-100">Risk signals</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">{findings.length}</span>
      </div>

      <div className="mt-4 space-y-3">
        {findings.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">No findings in the selected file yet.</p>
        ) : findings.map(finding => (
          <button
            key={finding.id}
            onClick={() => setSelectedFinding(finding)}
            className={`w-full rounded-lg border p-3 text-left transition ${selectedFinding?.id === finding.id ? severityStyles[finding.severity] : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'}`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">{finding.severity}</p>
                <p className="mt-1 font-semibold">{finding.title}</p>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">line {finding.line}</span>
            </div>
            <p className="mt-3 overflow-x-auto rounded-md bg-white px-2 py-1 font-mono text-xs dark:bg-slate-950">{finding.code}</p>
          </button>
        ))}
      </div>

      {selectedFinding ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {explanation ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">Local Explanation</p>
              <p className="mt-3"><strong>Why:</strong> {explanation.why}</p>
              <p className="mt-2"><strong>Impact:</strong> {explanation.impact}</p>
              <p className="mt-2"><strong>Fix:</strong> {explanation.fix}</p>
            </div>
          ) : null}
          {selectedFinding.attackChain ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Attack Chain</p>
              <div className="mt-3 space-y-2 text-slate-800 dark:text-slate-200">
                <p><strong>Entry:</strong> {selectedFinding.attackChain.entry}{selectedFinding.attackChain.entryEvidence ? ` (${selectedFinding.attackChain.entryEvidence})` : ''}</p>
                <p><strong>Sink:</strong> {selectedFinding.attackChain.sink}{selectedFinding.attackChain.sinkEvidence ? ` (${selectedFinding.attackChain.sinkEvidence})` : ''}</p>
                <p><strong>Impact:</strong> {selectedFinding.attackChain.impact}</p>
              </div>
              {selectedFinding.scenario ? <p className="mt-3 text-slate-600 dark:text-slate-300">{selectedFinding.scenario}</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function RepoIntelligence({ summary }: { summary: RepoSummary }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Intelligence Summary</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {summary.modules.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Open files to build module-level metadata.</p>
        ) : summary.modules.map(module => (
          <div key={module.purpose} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-950 dark:text-slate-100">{module.purpose}</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{module.fileCount} files, {module.findingCount} findings</p>
              </div>
              <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-950 dark:text-slate-200">risk {module.riskScore}</span>
            </div>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">Findings: {module.topFindings.join(', ') || 'none'}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Dependencies: {module.dependencies.slice(0, 4).join(', ') || 'none'}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function InsightsPanel({ repoInsights, insightsLoading, insightsError, generateInsights, scannedCount, devMode }: {
  repoInsights: string | null
  insightsLoading: boolean
  insightsError: string | null
  generateInsights: () => void
  scannedCount: number
  devMode: boolean
}) {
  return (
    <section id="repo-context" className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">AI Repo Overview</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-100">{devMode ? 'Paste insights' : 'Scanned-file insights'}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Uses compact findings and metadata from {scannedCount} opened file{scannedCount === 1 ? '' : 's'}.</p>
        </div>
        <button
          type="button"
          onClick={generateInsights}
          disabled={insightsLoading || scannedCount === 0}
          className="h-11 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950"
        >
          {insightsLoading ? 'Generating...' : 'Generate Insights'}
        </button>
      </div>

      {insightsError ? <div className="mt-4"><Notice>{insightsError}</Notice></div> : null}
      {repoInsights ? (
        <div className="prose prose-sm mt-4 max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{repoInsights}</ReactMarkdown>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Generate insights when you want Gemini to summarize the files analyzed so far.
        </div>
      )}
    </section>
  )
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
      {children}
    </div>
  )
}

export function ScrutinyDashboard(props: DashboardProps) {
  return (
    <div className="relative min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <main className="mx-auto flex w-full max-w-[105rem] flex-col gap-4 px-5 py-10 lg:px-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight text-slate-950 dark:text-slate-50">Scrutiny</h1>
          <p className="max-w-2xl text-base text-slate-600 dark:text-slate-400">Local-first security scanning with AI insights only when you ask for them.</p>
        </header>

        <ScanControls {...props} />
        <RiskOverview summary={props.repoSummary} />

        <div className="grid min-w-0 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <FileBrowser
            files={props.files}
            selectedFile={props.selectedFile}
            devMode={props.devMode}
            handleSelectFile={props.handleSelectFile}
            hotspots={props.repoSummary.hotspots}
          />
          <div className="min-w-0 space-y-4">
            <SelectedFilePanel
              selectedFile={props.selectedFile}
              fileContent={props.fileContent}
              contentCollapsed={props.contentCollapsed}
              setContentCollapsed={props.setContentCollapsed}
              fileError={props.fileError}
              selectedMetadata={props.selectedMetadata}
            />
            <FindingsPanel
              findings={props.selectedFindings}
              selectedFinding={props.selectedFinding}
              setSelectedFinding={props.setSelectedFinding}
              explanation={props.selectedExplanation}
            />
          </div>
        </div>

        <RepoIntelligence summary={props.repoSummary} />
        <InsightsPanel
          repoInsights={props.repoInsights}
          insightsLoading={props.insightsLoading}
          insightsError={props.insightsError}
          generateInsights={props.generateInsights}
          scannedCount={props.repoSummary.scannedFileCount}
          devMode={props.devMode}
        />
      </main>
    </div>
  )
}
