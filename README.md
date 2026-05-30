# Scrutiny

Scrutiny is a Next.js app for scanning GitHub repositories and surfacing suspicious code patterns, risk hotspots, and context-aware findings. It combines offline pattern scanning with on-demand Gemini AI explanations.

## Features

- GitHub repo scan UI for repository file trees and individual file inspection
- Offline pattern scanner for common security risks:
  - Command injection
  - Dynamic evaluation (`eval`)
  - Hardcoded secrets
- Rich finding metadata with matched code snippet, line number, severity, and explanation
- Risk score and hotspot summary cards for quick repository triage
- Gemini AI-powered repo context summary and explain-on-demand for selected findings

## Tech Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- `react-markdown` + `remark-gfm`
- Google Gemini API via `@google/genai` / `@google/generative-ai`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env.local` file at the project root and add your Gemini key:

```env
GEMINI_API_KEY=your_api_key_here
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Usage

- Enter a GitHub repository URL in the app and trigger a scan
- Browse the file tree and select files to view findings
- Click on a finding to see offline explanation details
- Use the `Explain with AI` button for Gemini-generated analysis

## Notes

- The scanner currently uses static regex patterns in `lib/scanner.ts`.
- AI explanation features require a valid `GEMINI_API_KEY`.
- The repo is designed as a *learning-focused tool* for security-first code discovery and UI experimentation.

## Project Structure

- `app/page.tsx` - main scanner UI and interactions
- `app/api/scan/route.ts` - GitHub file tree and scan endpoint
- `app/api/context/route.ts` - GitHub repo context summary endpoint
- `app/api/explain/route.ts` - Gemini explain-on-demand endpoint
- `lib/scanner.ts` - pattern scanner and offline finding logic
- `types/finding.ts` - finding metadata shapes
