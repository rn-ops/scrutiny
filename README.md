# Scrutiny

Scrutiny is a local-first security scanner for GitHub repositories. It fetches a repository tree, lets you open files one at a time, runs static analysis in the browser, and generates Gemini insights only when you explicitly ask for them.

## Features

- GitHub repository file selection and on-demand file loading
- Single analyzer pipeline in `lib/analyzer.ts`
- Structured outputs for `Finding`, `FileMetadata`, `RepoSummary`, and `ModuleSummary`
- Security findings plus AST-derived imports, exports, functions, classes, call graph edges, framework hints, module roles, and responsibilities
- Accumulated repo context from every file opened so far
- Compact AI payloads that avoid sending full source files to Gemini
- Cached AI insights keyed by the compact analysis payload
- Dev mode for low-cost paste-only local analysis
- Selected-file viewer with horizontal bounds and scrollbars for wide source lines

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For AI insights, add a Gemini key to `.env.local`:

```env
GEMINI_API_KEY=your_api_key_here
GITHUB_TOKEN=optional_github_token_here
```

`GITHUB_TOKEN` is optional, but useful for higher GitHub API limits and private repositories.

## Usage

1. Paste a GitHub repository URL and click `Scan Repo`.
2. Select files from the repository list. Each opened file is analyzed locally and added to the accumulated repo context.
3. Review selected-file findings, risk score, inferred metadata, module summaries, and hotspots.
4. Click `Generate Insights` when you want Gemini to summarize all files scanned so far.
5. Toggle `Dev Mode` to paste a single file and run local analysis without repository context.

Gemini is not called during repo scan or file load. The AI route receives only compact structured metadata and findings when `Generate Insights` is clicked.

## Analyzer

`lib/analyzer.ts` replaces the previous scanner and file-intelligence split. The pipeline:

- filters supported source files
- scans security patterns by language
- parses JavaScript and TypeScript-family files with Babel AST recovery
- extracts metadata and framework signals
- builds module and repository summaries
- emits a compact AI payload through `buildCompactAiPayload`

The main exported types are:

- `Finding`
- `FileMetadata`
- `ModuleSummary`
- `RepoSummary`
- `AnalysisResult`
- `CompactAiPayload`

## Project Structure

- `app/page.tsx` - small page composition layer
- `app/hooks/useScrutinyWorkspace.ts` - scan, analyze, cache, and insight state
- `app/components/ScrutinyDashboard.tsx` - UI sections for controls, file selection, findings, metadata, and insights
- `app/api/scan/route.ts` - GitHub repository tree endpoint
- `app/api/file/route.ts` - file content endpoint
- `app/api/context/route.ts` - Gemini insights endpoint for compact analyzer payloads
- `app/api/explain/route.ts` - legacy per-finding explanation endpoint
- `lib/analyzer.ts` - consolidated analyzer and structured output definitions
- `lib/github.ts` - GitHub URL parsing and content retrieval helpers

## Token Strategy

Scrutiny keeps AI usage explicit and compact:

- repo scanning fetches only file paths
- file selection fetches source and runs local analysis only
- scanned findings and metadata are retained in client state
- `Generate Insights` sends summarized findings and metadata, not full source
- identical compact payloads reuse cached AI output
- dev mode remains useful without AI and can generate separate paste-file insights when needed

## Design Rationale

The UI gives the most space to the work users repeat most: selecting files, seeing risk signals, reading selected-file content, and understanding local metadata. AI output is still available, but sits after local evidence so it feels like a deliberate synthesis step rather than a constant token-consuming narrator.
