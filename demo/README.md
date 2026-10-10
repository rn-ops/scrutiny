# Scrutiny Multilingual Demo

This directory contains four files: this guide and three intentionally vulnerable source files. The demo uses TypeScript and PHP. The TypeScript API imports a query function and calls a PHP worker route.

## Vulnerabilities

- `api.ts`: hardcoded API key, dynamic evaluation, command injection, unsafe HTML insertion, and an HTTP call to `worker.php`.
- `query.ts`: user input is placed into a SQL string. The current analyzer has no TypeScript SQL rule, so this is an expected missed finding.
- `worker.php`: request-based SQL injection, command injection, local file inclusion, and unsafe deserialization.

The examples use fake values. Do not run this code. It is intentionally insecure and exists only to test scanner behavior.

## Try it

For repository mode, publish this directory in a GitHub repository and scan that repository URL. Scrutiny fetches paths first. Select the files in this order:

1. Open `demo/api.ts`. The graph shows the local `buildUserQuery` call and the PHP route as unresolved because those files are not analyzed yet.
2. Open `demo/query.ts`. The graph resolves the imported function call to its definition.
3. Open `demo/worker.php`. The graph resolves the HTTP file link to the analyzed PHP file. The analyzer reports PHP rule findings. PHP AST details are not available because Babel does not parse PHP.
4. Select **Generate Insights** to ask Gemini for a summary of the local findings and metadata. Gemini does not receive the full source files.

The graph links imported JavaScript/TypeScript functions and static `fetch()` URLs that end in a supported source-file extension. It does not infer arbitrary runtime calls or prove that an HTTP route is active.

Paste one source file at a time in Dev Mode to test local analysis without GitHub.

Expected findings depend on the rules in `lib/analyzer.ts`. A missing result is useful feedback: this fixture is a regression aid, not proof that the scanner detects every vulnerability.