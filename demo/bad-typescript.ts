// Demo: Common TypeScript security mistakes

import { exec } from 'child_process';

// ❌ Hardcoded API key and secrets
const API_KEY: string = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz';
const DATABASE_PASSWORD = 'SuperSecret123!';
const SECRET_KEY = 'mysecretkey';

// ❌ Command injection with user input
function executeQuery(table: string, filter: any): void {
  exec(`SELECT * FROM ${table} WHERE ${filter}`, (err, stdout) => {
    console.log(stdout);
  });
}

// ❌ Dynamic code evaluation
function compileUserExpression(expression: string): any {
  return eval(`(${expression})`);
}

// ❌ Type-unsafe string concatenation in queries
interface User {
  id: number;
  email: string;
}

function getUserById(userId: string): string {
  return `SELECT * FROM users WHERE id = '${userId}'`;
}

// ❌ Weak token generation
function generateToken(): string {
  return Math.random().toString(36).slice(2);
}

// ❌ Missing input validation
function processJSON(jsonString: string): object {
  return JSON.parse(jsonString);
}

export { executeQuery, compileUserExpression, getUserById, generateToken };
