# Scrutiny Multilingual Demo

This directory contains four files: this guide and three intentionally vulnerable source files. The TypeScript files form a small import/call relationship. The PHP file represents a separate worker in the same example service.

## Vulnerabilities

- `api.ts`: hardcoded API key, dynamic evaluation, command injection, and unsafe HTML insertion.
- `query.ts`: user input is placed into a SQL string. The current analyzer has no TypeScript SQL rule, so this is an expected missed finding.
- `worker.php`: request-based SQL injection, command injection, local file inclusion, and unsafe deserialization.

The examples use fake values. Do not run this code. It is intentionally insecure and exists only to test scanner behavior.

## Try it

For repository mode, publish this directory in a GitHub repository and scan that repository URL. Scrutiny fetches paths first. Select the demo files one by one to run local rules. Paste one file at a time into Dev Mode to test local analysis without GitHub.

Expected findings depend on the rules in `lib/analyzer.ts`. A missing result is useful feedback: this fixture is a regression aid, not proof that the scanner detects every vulnerability.