# Scrutiny: Architecture & Project Overview

Scrutiny is a local-first Next.js security scanner. It fetches a GitHub repository tree, lets users open files on demand, analyzes each opened file locally, accumulates repository context from those analyzed files, and calls Gemini only when the user clicks `Generate Insights`.

## Technology Stack

### Frontend
- Next.js 16.2.6 with App Router
- React 19.2.4 and TypeScript 5
- Tailwind CSS 4 for responsive styling and dark mode
- React Markdown and Remark GFM for Gemini markdown rendering

### Backend and Analysis
- Next.js API routes in `app/api/*/route.ts`
- `@babel/parser` for AST-backed JavaScript and TypeScript-family metadata
- Consolidated static analyzer in `lib/analyzer.ts`

### AI Integration
- Google Gemini through `@google/genai`
- AI is triggered explicitly from the UI, never during repository scan or file load

## Project Structure

```text
scrutiny/
├── app/
│   ├── api/
│   │   ├── scan/route.ts          # GitHub repo tree discovery
│   │   ├── file/route.ts          # Load selected file content
│   │   ├── context/route.ts       # Gemini insights from compact analyzer payload
│   │   └── explain/route.ts       # Legacy per-finding explanation endpoint
│   ├── components/
│   │   ├── ScrutinyDashboard.tsx  # Main UI sections and drawer trigger
│   │   └── FileIntelligenceDrawer.tsx # AST details and progressive call graph
│   ├── hooks/
│   │   └── useScrutinyWorkspace.ts # Scan, analysis, cache, and AI state
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                   # Thin composition layer
├── lib/
│   ├── analyzer.ts                # Findings, metadata, summaries, compact AI payload
│   ├── fileIntelligence.ts        # AST details, function calls, and static file references
│   └── github.ts                  # GitHub URL helpers and file retrieval
├── demo/                           # Four-file TypeScript/PHP demo
├── design/
│   ├── ARCHITECTURE.md
│   └── RECONSTRUCTION.md
├── README.md
├── package.json
└── tsconfig.json
```

## Runtime Flow

```text
User enters GitHub repository URL
        ↓
/api/scan fetches repository tree
        ↓
UI displays file list
        ↓
User opens a file
        ↓
/api/file fetches file content
        ↓
useScrutinyWorkspace runs local security analysis and file intelligence
        ↓
Findings, FileMetadata, and FileIntelligence are stored by file path
        ↓
UI renders selected-file findings, risk, metadata, module summaries, and hotspots
        ↓
File Intelligence graph grows as more files are opened
        ↓
User clicks Generate Insights
        ↓
CompactAiPayload is sent to /api/context for Gemini synthesis
```

## Analyzer Architecture

`lib/analyzer.ts` replaces the former split between scanner and file intelligence. It owns one structured analysis pipeline:

- file filtering by extension and ignored path segment
- language-routed security pattern detection
- finding construction with severity, evidence, context, scenario, and attack-chain data
- AST parsing and traversal for imports, exports, functions, classes, call graph edges, framework hints, metrics, entry points, and dependencies
- file role and responsibility inference
- module and repository summary aggregation
- compact AI payload generation

`lib/fileIntelligence.ts` supplies the selected-file AST detail view and graph inputs. It records function calls and static `fetch()` references to supported source-file paths. The dashboard combines these per-file results as the user opens files.

Primary exported types:

```ts
type AnalysisResult = {
  findings: Finding[]
  metadata: FileMetadata[]
  repoSummary: RepoSummary
}
```

Structured output types:

- `Finding` captures security evidence, matched code, severity, line, local context, and attack-chain metadata.
- `FileMetadata` captures AST-derived structure and inferred file purpose.
- `ModuleSummary` groups files by inferred purpose and rolls up dependencies, frameworks, findings, and risk.
- `RepoSummary` aggregates scanned file count, severity totals, risk score, modules, hotspots, frameworks, and dependencies.
- `CompactAiPayload` trims analyzer output into a token-conscious Gemini payload.

## State Ownership

`app/page.tsx` is intentionally small. It calls `useScrutinyWorkspace()` and passes the result to `ScrutinyDashboard`.

`app/hooks/useScrutinyWorkspace.ts` owns:

- repo URL and discovered file list
- selected file and content
- accumulated `AnalysisResult`
- `fileIntelligenceByPath`, containing the AST result for each opened file
- selected finding
- dev mode paste state
- AI insight loading, error, result, and cache state
- scan, file load, paste analysis, and insight generation handlers

`app/components/ScrutinyDashboard.tsx` owns:

- scan controls
- file browser and hotspots
- selected-file content view
- findings and local explanations
- file metadata summary
- File Intelligence drawer and accumulated call-flow graph
- repository/module intelligence summary
- `Generate Insights` panel

## Token Strategy

Scrutiny saves tokens by making AI explicit and compact:

- repository scan returns only file paths
- file load runs local analysis only
- source content is not sent to Gemini for repo insights
- findings and metadata accumulate in client state as files are opened
- function calls and static file references accumulate in `fileIntelligenceByPath`
- imported function edges resolve after the target file is opened; static HTTP file links resolve after their target is opened
- `Generate Insights` sends `CompactAiPayload`
- identical compact payloads reuse cached AI responses for the current page session
- dev mode remains low-cost and can generate separate paste-file insights when needed

## UX Priorities

The interface prioritizes screen time by user value:

1. file selection
2. findings and risk signal
3. file intelligence and module summary
4. optional AI-generated repository overview

AI is presented as synthesis over local evidence, not as a constant background explanation.
In dev mode the repository URL is not used: pasted source is analyzed locally, and AI insights remain an explicit optional action.

The four-file demo contains TypeScript modules linked by imports and a TypeScript-to-PHP static HTTP reference. Scan `demo/api.ts`, then `demo/query.ts`, then `demo/worker.php` to see unresolved targets become resolved graph links. The PHP file gets local rule findings, but Babel does not extract PHP functions.

## API Routes

- `/api/scan`: validates a GitHub URL and returns repository file paths.
- `/api/file`: fetches selected file content from GitHub.
- `/api/context`: accepts compact analyzer output and returns Gemini-generated insights.
- `/api/explain`: legacy route for per-finding Gemini explanation; the new UI does not call it.

## Environment Setup

```bash
npm install
npm run dev
```

Optional `.env.local`:

```env
GEMINI_API_KEY=your_api_key_here
GITHUB_TOKEN=optional_github_token_here
```

`GITHUB_TOKEN` improves GitHub API limits. `GEMINI_API_KEY` is required only for `Generate Insights`.
