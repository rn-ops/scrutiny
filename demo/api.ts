import { exec } from 'node:child_process'
import { buildUserQuery } from './query'

const apiKey = 'demo-only-api-key-12345'

type Request = {
  query: { id: string; file: string }
  body: { expression: string; html: string }
}

export function loadUser(request: Request) {
  return buildUserQuery(request.query.id)
}

export function runExpression(request: Request) {
  return eval(request.body.expression)
}

export function convertFile(request: Request) {
  exec(`convert ${request.query.file}`)
}

export function renderPreview(request: Request, element: HTMLElement) {
  element.innerHTML = request.body.html
}
