import { Finding } from '@/lib/analyzer'

interface FileViewerProps {
  selectedFile: string | null
  fileContent: string
  isLoading: boolean
  error: string | null
  findings: Finding[]
  fileIntelligence: any | null
}

export function FileViewer({
  selectedFile,
  fileContent,
  isLoading,
  error,
  findings,
  fileIntelligence
}: FileViewerProps) {
  if (!selectedFile) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-semibold">Selected file</h2>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Pick a file from the repository list to view content and analysis.</p>
      </section>
    )
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-xl font-semibold">Selected file</h2>
      <div className="mt-4 space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{selectedFile}</p>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading file content…</p>
        ) : error ? (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>
        ) : (
          <pre className="max-h-[340px] overflow-auto rounded-2xl border border-slate-200 bg-slate-950 px-4 py-4 text-sm text-slate-100 dark:border-slate-700 font-mono">
            {fileContent || 'No content available.'}
          </pre>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
            <p className="text-sm text-slate-500 dark:text-slate-400">Findings</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{findings.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
            <p className="text-sm text-slate-500 dark:text-slate-400">Intelligence confidence</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{fileIntelligence?.confidence ?? '—'}%</p>
          </div>
        </div>

        {findings.length > 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
            <h3 className="text-lg font-semibold">Top finding</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 font-semibold">{findings[0].title}</p>
            <pre className="mt-3 overflow-auto rounded-2xl border border-slate-200 bg-slate-100 p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 font-mono">
              {findings[0].context}
            </pre>
          </div>
        ) : null}
      </div>
    </section>
  )
}
