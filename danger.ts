// Demo file for Scrutiny scanner

const apiKey = 'sk-test-1234567890'
const password = 'hunter2'
const secret = 'this-is-a-secret'

function dangerousCommand(userInput: string) {
  exec(userInput)
}

function evaluateInput(source: string) {
  eval(source)
}

export function runDanger() {
  console.log('Scrutiny demo file loaded')
  dangerousCommand('ls -la')
  evaluateInput("console.log('unsafe')")
}
