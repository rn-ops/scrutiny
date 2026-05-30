// Demo: Common Node.js security mistakes

const exec = require('child_process').exec;
const dbPassword = 'root:password123';

// ❌ Command Injection
function getUserData(userId) {
  exec(`curl https://api.example.com/users/${userId}`, (err, stdout) => {
    console.log(stdout);
  });
}

// ❌ Dynamic code evaluation
function processUserScript(scriptString) {
  eval(scriptString);
}

// ❌ Unvalidated redirects
function redirect(url) {
  return { redirect: url };
}

// ❌ Weak random for security-sensitive operations
function generateSessionId() {
  return Math.random().toString(36).substring(2, 11);
}

module.exports = {
  getUserData,
  processUserScript,
  redirect,
  generateSessionId
};
