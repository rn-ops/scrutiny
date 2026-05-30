# Demo Code Examples

This folder contains intentionally vulnerable code examples in multiple programming languages. Each file demonstrates common security mistakes and bad practices that developers might encounter.

## Files

- **bad-node.js** - Node.js: Command injection, hardcoded secrets, eval(), weak random
- **bad-typescript.ts** - TypeScript: SQL injection, eval(), hardcoded credentials, type-unsafe patterns
- **bad-python.py** - Python: SQL injection, OS command injection, unsafe pickle deserialization, eval()
- **bad-php.php** - PHP: SQL injection, command injection, RFI, weak hashing, no CSRF protection
- **bad-c.c** - C: Buffer overflow, format string bugs, use-after-free, integer overflow
- **bad-cpp.cpp** - C++: Buffer overflow, command injection, memory leaks, weak random
- **BadJava.java** - Java: SQL injection, command injection, unsafe deserialization, XSS, resource leaks
- **bad-csharp.cs** - C#: SQL injection, command injection, path traversal, unvalidated redirects, XSS

## Purpose

These files are designed to:

1. Test the Scrutiny scanner against real-world patterns
2. Serve as educational examples for security-conscious development
3. Demonstrate how similar vulnerabilities manifest across different languages
4. Provide a baseline for improving scanner detection capabilities

## Common Themes

Across all languages, you'll find:

- **Hardcoded Secrets** - API keys, passwords, database credentials
- **Injection Attacks** - SQL, command, OS-level injection
- **Unsafe Dynamic Code** - eval(), exec(), system(), Runtime.exec()
- **Resource Management** - Memory leaks, file handle leaks, use-after-free
- **Input Validation** - Missing or insufficient checks on user input
- **Weak Cryptography** - Weak random, hardcoded keys/IVs, weak hashing

## Usage

You can use these files to test the scanner:

```bash
# Point Scrutiny at a GitHub repo containing these files, or
# Place them in a local directory and test the scanner locally
```

Each file includes comments (❌) marking the problematic sections.

## Disclaimer

This code is intentionally insecure. **Do not use any of these patterns in production code.** These examples are for educational and testing purposes only.
