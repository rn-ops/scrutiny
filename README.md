# Scrutiny

Scrutiny is a Next.js GitHub repository scanner that combines offline pattern-based security detection with AST-backed file intelligence and optional Gemini AI assistance.

## Features

- GitHub repo scan UI with file tree explorer and file selection
- Offline vulnerability scanning across multiple languages using `lib/scanner.ts`
- AST-backed File Intelligence panel for imported modules, functions, classes, call flow, and inferred responsibilities
- Scroll-to-line navigation from intelligence metadata into file content
- Gemini AI-powered repository context summary and per-finding explanations
- Dev mode paste-only scanning that disables repo context generation for quick local analysis
- Risk score and hotspot summary cards for fast triage

## Technology Stack

### Frontend
- **Next.js 16.2.6** with App Router
- **React 19.2.4** + TypeScript 5
- **Tailwind CSS 4** for responsive styling and dark mode
- **React Flow** for call graph visualization
- **React Markdown** + **Remark GFM** for rendering Gemini responses

### Backend and Analysis
- **Next.js API routes** in `app/api/*/route.ts`
- **Node.js runtime** via Next.js server functions
- **@babel/parser** for AST-based file and module metadata extraction

### AI Integration
- **Google Gemini** via `@google/genai` and `@google/generative-ai`

### Package Management
- **npm**

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env.local` file at the project root and add your Gemini key. Optionally add `GITHUB_TOKEN` for higher GitHub API quota:

```env
GEMINI_API_KEY=your_api_key_here
GITHUB_TOKEN=your_github_token_here
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Usage

- Enter a GitHub repository URL and start a scan
- Browse the supported file list and select a file to analyze
- View findings, matched code context, and risk details
- Open the File Intelligence panel for AST-derived file metadata and inferred module purpose
- Click a function in File Intelligence to jump to its source line
- Enable dev mode to paste source code directly and skip repo context generation
- Use AI explanation for deeper per-finding analysis when Gemini is enabled

## Notes

- The scanner uses static patterns in `lib/scanner.ts` and supports multiple languages.
- File Intelligence is powered by `lib/fileIntelligence.ts` and uses AST extraction to infer imports, functions, classes, call graph edges, and responsibilities.
- Gemini AI features require a valid `GEMINI_API_KEY`.
- `GITHUB_TOKEN` is optional but recommended for private repos and higher rate limits.

## Project Structure

- `app/page.tsx` - main scanner UI, file selection, findings, and File Intelligence panel
- `app/api/scan/route.ts` - GitHub repo tree scanning endpoint
- `app/api/file/route.ts` - selected file content endpoint
- `app/api/context/route.ts` - Gemini repository context summary endpoint
- `app/api/explain/route.ts` - Gemini per-finding explanation endpoint
- `lib/github.ts` - GitHub URL parsing and content retrieval helpers
- `lib/scanner.ts` - offline vulnerability scanner and finding engine
- `lib/fileIntelligence.ts` - AST-backed file metadata extraction and inference
- `types/finding.ts` - finding and story type definitions
