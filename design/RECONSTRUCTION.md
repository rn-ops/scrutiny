# Scrutiny: Reconstruction Guide

This guide rebuilds Scrutiny with the current architecture: one consolidated analyzer, local-first scanning, accumulated file context, and explicit Gemini insights.

## Phase 1: Project Setup

Create a Next.js app with TypeScript, Tailwind, and the App Router.

```bash
npx create-next-app@latest scrutiny --typescript --tailwind --app
cd scrutiny
npm install @babel/parser @google/genai react-markdown remark-gfm
```

Required structure:

```text
app/
  api/
    scan/route.ts
    file/route.ts
    context/route.ts
    explain/route.ts
  components/
    ScrutinyDashboard.tsx
    FileIntelligenceDrawer.tsx
  hooks/
    useScrutinyWorkspace.ts
  globals.css
  layout.tsx
  page.tsx
lib/
  analyzer.ts
  fileIntelligence.ts
  github.ts
demo/
  README.md
  api.ts
  query.ts
  worker.php
design/
  ARCHITECTURE.md
  RECONSTRUCTION.md
README.md
```

## Phase 2: GitHub Integration

Implement `lib/github.ts` with:

- GitHub URL parsing
- repository tree fetching
- selected file content fetching
- Base64 decoding for GitHub content API responses
- optional `GITHUB_TOKEN` support

Add API routes:

- `app/api/scan/route.ts` receives `{ url }` and returns file paths
- `app/api/file/route.ts` receives `{ url, path }` and returns file content

These routes should not run AI or local security analysis.

## Phase 3: Consolidated Analyzer

Create `lib/analyzer.ts` as the single analysis source. Do not split security scanning and file intelligence into separate modules.

Core exports:

```ts
export type Finding = {}
export type FileMetadata = {}
export type ModuleSummary = {}
export type RepoSummary = {}
export type AnalysisResult = {
  findings: Finding[]
  metadata: FileMetadata[]
  repoSummary: RepoSummary
}
export type CompactAiPayload = {}

export function analyzeFiles(files: Array<{ file: string; content: string }>): AnalysisResult
export function buildRepoSummary(metadata: FileMetadata[], findings: Finding[], fileCount?: number): RepoSummary
export function buildCompactAiPayload(result: AnalysisResult): CompactAiPayload
```

Analyzer responsibilities:

- filter supported source extensions
- skip ignored directories such as `node_modules`, `.git`, `dist`, `build`, and `vendor`
- route security patterns by language
- emit structured findings with severity, line, matched code, context, scenario, and attack-chain data
- parse JS/TS-family files with `@babel/parser`
- collect imports, exports, functions, classes, call graph edges, framework hints, metrics, entry points, and dependencies
- infer file purpose and responsibilities
- aggregate repo/module summaries and hotspots
- create compact AI payloads

Use `lib/fileIntelligence.ts` for selected-file AST details. It records per-file calls and static `fetch()` references to source-file paths. Do not treat these links as full data-flow analysis.

## Phase 4: Workspace Hook

Create `app/hooks/useScrutinyWorkspace.ts`.

The hook owns:

- `repoUrl`
- discovered `files`
- `selectedFile` and `fileContent`
- accumulated `AnalysisResult`
- `FileIntelligence` results keyed by opened file path
- selected finding state
- dev-mode paste state
- Gemini insight loading/result/error/cache
- scan, file selection, paste scan, and generate-insights handlers

Important behavior:

- repository scan fetches only the tree
- selecting a file fetches source and runs local `analyzeFiles`
- each analyzed file is merged into accumulated state
- each opened file adds function calls and static file references to the File Intelligence graph
- static import and HTTP route links become resolved when the target file is opened
- Gemini is not called until `Generate Insights`
- AI responses are cached by compact payload

## Phase 5: UI Components

Keep `app/page.tsx` thin:

```tsx
const workspace = useScrutinyWorkspace()
return <ScrutinyDashboard {...mappedWorkspaceProps} />
```

Create `app/components/ScrutinyDashboard.tsx` with sections for:

- scan controls and dev-mode paste input
- file browser and hotspots
- selected-file metadata and content
- File Intelligence drawer with imports, exports, functions, classes, frameworks, and call flow
- findings and local explanations
- repository/module intelligence summary
- AI insights panel with a `Generate Insights` button

Selected-file content must be width-bounded:

- outer panel uses `min-w-0`
- code viewport uses `max-w-full overflow-x-auto overflow-y-auto`
- `<pre>` uses `whitespace-pre` and `min-w-max`

This prevents long source lines from expanding the selected-file panel.

The graph links parsed function calls, imported exports, and static `fetch()` file paths. It displays unscanned targets as dashed nodes. PHP and Python targets appear as file nodes because Babel does not parse their functions.

## Phase 6: Gemini Insights

Update `app/api/context/route.ts` to accept:

```ts
{
  url: string
  mode: 'repo' | 'dev'
  analysis: CompactAiPayload
}
```

Prompt Gemini to use only the compact analyzer payload. The response should summarize:

- repository or pasted-file purpose in security terms
- highest-risk findings
- architectural hotspots from module metadata
- practical next review steps

Do not pass full source files to this route.

`app/api/explain/route.ts` can remain as a legacy per-finding explanation route, but the current UI does not need to call it.

## Phase 7: Dev Mode

Dev mode should remain useful without repository context:

- paste a file path and source code
- run local analyzer immediately
- do not require a GitHub URL
- do not call GitHub endpoints while dev mode is active
- optionally allow `Generate Insights` for that pasted file only

This keeps development and testing low-cost while preserving the same finding and metadata surfaces.

## Phase 8: Documentation

Update:

- `README.md`
- `design/ARCHITECTURE.md`
- `design/RECONSTRUCTION.md`

The docs should describe:

- the consolidated analyzer
- structured output types
- accumulated scanned-file context
- compact AI payload strategy
- explicit `Generate Insights` UX
- dev mode as a paste-only local path

## Phase 9: Validation

Run:

```bash
npm run lint
npm run build
```

Manual checks:

- repository scan returns file paths
- opening multiple files accumulates findings and metadata
- hotspots update from all opened files
- `Generate Insights` summarizes all opened files, not only the selected file
- dev mode analyzes pasted code without a repo URL
- dev mode does not call GitHub when the paste is empty
- wide source lines scroll horizontally inside selected-file content
- opening `demo/api.ts` first shows unresolved TypeScript and PHP targets
- opening `demo/query.ts` resolves the imported function edge
- opening `demo/worker.php` resolves the static HTTP file edge and adds PHP rule findings
- `Generate Insights` summarizes local findings without sending full source files
