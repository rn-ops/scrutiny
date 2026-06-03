import { parse } from '@babel/parser'
import { Finding } from '@/lib/scanner'

export type ImportMeta = {
  source: string
  alias: string | null
  type: 'default' | 'namespace' | 'named' | 'require' | 'side-effect' | 'unknown'
  line: number
  specifiers: string[]
}

export type ExportMeta = {
  name: string
  line: number
  type: 'default' | 'named' | 'module.exports' | 'exports' | 'unknown'
  alias?: string | null
}

export type FunctionMeta = {
  name: string
  line: number
  params: string[]
  exported: boolean
  calls: string[]
  isAsync: boolean
  isArrow: boolean
  type: 'function' | 'arrow' | 'method' | 'unknown'
}

export type ClassMeta = {
  name: string
  line: number
  extends?: string
  exported: boolean
  methods: string[]
}

export type FrameworkHint = {
  framework: string
  confidence: number
  reason: string[]
}

export type ComplexityMetrics = {
  linesOfCode: number
  functionCount: number
  classCount: number
  importCount: number
  exportCount: number
}

export type CallEdge = {
  caller: string
  callee: string
  type: 'call' | 'method' | 'constructor' | 'unknown'
}

export type FileIntelligence = {
  filePath: string
  fileType: string
  imports: ImportMeta[]
  exports: ExportMeta[]
  functions: FunctionMeta[]
  classes: ClassMeta[]
  callGraph: CallEdge[]
  frameworkHints: FrameworkHint[]
  findings: string[]
  modulePurpose: string
  responsibilities: string[]
  confidence: number
  metrics: ComplexityMetrics
  entryPoints: string[]
  dependencies: string[]
}

function normalizeItems<T>(items: Array<T | null | undefined>) {
  return Array.from(new Set(items.filter(Boolean) as T[]))
}

function getFileType(path: string) {
  const ext = path.slice(path.lastIndexOf('.'))
  return ext || 'unknown'
}

function parseSource(content: string) {
  try {
    return parse(content, {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        'classProperties',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'dynamicImport',
        'optionalChaining',
        'nullishCoalescingOperator',
        'decorators-legacy'
      ],
      allowReturnOutsideFunction: true,
      errorRecovery: true
    })
  } catch {
    try {
      return parse(content, {
        sourceType: 'script',
        plugins: [
          'jsx',
          'classProperties',
          'dynamicImport',
          'optionalChaining',
          'nullishCoalescingOperator'
        ],
        allowReturnOutsideFunction: true,
        errorRecovery: true
      })
    } catch {
      return null
    }
  }
}

function isObjectWithType(value: unknown): value is { type: string } {
  return typeof value === 'object' && value !== null && 'type' in value
}

function visit(node: any, visitors: Record<string, (node: any, state: any) => void>, state: any) {
  if (!node || typeof node !== 'object') return
  const visitor = visitors[node.type]
  if (visitor) visitor(node, state)

  for (const key of Object.keys(node)) {
    const value = node[key]
    if (Array.isArray(value)) {
      for (const child of value) {
        if (isObjectWithType(child)) {
          visit(child, visitors, state)
        }
      }
    } else if (isObjectWithType(value)) {
      visit(value, visitors, state)
    }
  }
}

function extractParamNames(params: any[]): string[] {
  return params.map(param => {
    if (!param) return ''
    if (param.type === 'Identifier') return param.name
    if (param.type === 'AssignmentPattern' && param.left.type === 'Identifier') return param.left.name
    if (param.type === 'RestElement' && param.argument.type === 'Identifier') return `...${param.argument.name}`
    if (param.type === 'ObjectPattern') return '{...}'
    if (param.type === 'ArrayPattern') return '[...]'
    return ''
  }).filter(Boolean)
}

function getCalleeName(callee: any): string | null {
  if (!callee) return null
  if (callee.type === 'Identifier') return callee.name
  if (callee.type === 'MemberExpression') {
    if (callee.property?.type === 'Identifier') return callee.property.name
    if (callee.property?.type === 'Literal') return String(callee.property.value)
  }
  return null
}

function normalizePathName(source: string) {
  return source.replace(/\.tsx?$|\.jsx?$/i, '').replace(/^\.\//, '').replace(/^\//, '')
}

function addFrameworkHint(map: Map<string, FrameworkHint>, framework: string, confidence: number, reason: string) {
  const existing = map.get(framework)
  if (!existing) {
    map.set(framework, { framework, confidence, reason: [reason] })
    return
  }
  existing.reason.push(reason)
  existing.confidence = Math.min(1, existing.confidence + confidence * 0.6)
}

function inferFileRole(filePath: string, content: string, imports: ImportMeta[], frameworkHints: FrameworkHint[], entryPoints: string[]) {
  const name = filePath.toLowerCase()
  const lower = content.toLowerCase()
  const hasJwt = imports.some(i => i.source.includes('jsonwebtoken')) || /\bjwt\b/.test(lower)
  const hasBcrypt = imports.some(i => i.source.includes('bcrypt'))
  const hasExpress = frameworkHints.some(h => h.framework === 'Express')
  const hasReact = frameworkHints.some(h => h.framework === 'React')

  if (name.includes('auth') || name.includes('login') || name.includes('session') || hasJwt || hasBcrypt || /\btoken\b/.test(lower)) {
    return 'Authentication Module'
  }
  if (name.includes('controller') || name.includes('route') || hasExpress && /\brouter\b/.test(lower)) {
    return 'API Controller'
  }
  if (name.includes('service') || /\bservice\b/.test(lower)) {
    return 'Service Layer'
  }
  if (name.includes('repository') || name.includes('repo') || /\bschema\b|\bmodel\b/.test(lower)) {
    return 'Data Access Layer'
  }
  if (hasReact || name.endsWith('.tsx') || name.endsWith('.jsx') || /\buseState\b|\buseEffect\b/.test(content)) {
    return 'UI Component'
  }
  if (entryPoints.some(ep => /login|auth|signup/.test(ep.toLowerCase()))) {
    return 'Authentication Module'
  }
  if (entryPoints.length > 0 && name.includes('page')) {
    return 'UI Component'
  }
  return 'General Utility'
}

function inferResponsibilities(modulePurpose: string, imports: ImportMeta[], frameworkHints: FrameworkHint[]) {
  const responsibilities: string[] = []

  if (modulePurpose === 'Authentication Module') {
    responsibilities.push('User Authentication')
    responsibilities.push('Session Validation')
    if (imports.some(i => i.source.includes('bcrypt'))) responsibilities.push('Password Verification')
    if (imports.some(i => i.source.includes('jsonwebtoken'))) responsibilities.push('Token Generation')
    if (imports.some(i => i.source.includes('jsonwebtoken'))) responsibilities.push('Token Validation')
  }
  if (modulePurpose === 'Database Layer') {
    responsibilities.push('Data Modeling')
    responsibilities.push('Query Execution')
    responsibilities.push('Schema Management')
  }
  if (modulePurpose === 'API Controller') {
    responsibilities.push('Request Handling')
    responsibilities.push('Response Formatting')
    responsibilities.push('Routing')
  }
  if (modulePurpose === 'External API Client') {
    responsibilities.push('External Request Orchestration')
    responsibilities.push('Response Parsing')
    responsibilities.push('Retry/Error Handling')
  }
  if (modulePurpose === 'React Component') {
    responsibilities.push('UI Rendering')
    responsibilities.push('State Management')
    responsibilities.push('Event Handling')
  }
  if (modulePurpose === 'General Utility') {
    responsibilities.push('Helper Functions')
    responsibilities.push('Shared Logic')
  }

  if (imports.some(i => i.source.includes('express')) && !responsibilities.includes('Routing')) {
    responsibilities.push('Routing')
  }

  if (frameworkHints.some(h => h.framework === 'Next.js')) {
    responsibilities.push('Page Rendering')
  }

  return normalizeItems(responsibilities)
}

export function buildFileIntelligence(filePath: string | null, content: string, findings: Finding[]) {
  if (!filePath || !content) return null

  const ast = parseSource(content)
  const fileType = getFileType(filePath)
  const imports: ImportMeta[] = []
  const exports: ExportMeta[] = []
  const functions: FunctionMeta[] = []
  const classes: ClassMeta[] = []
  const callEdges = new Set<string>()
  const entryPoints = new Set<string>()
  const dependencies = new Set<string>()
  const frameworkHintsMap = new Map<string, FrameworkHint>()
  const exportedNames = new Set<string>()
  const scopeStack: string[] = ['root']

  const addFunction = (meta: FunctionMeta) => {
    const existing = functions.find(fn => fn.name === meta.name)
    if (existing) {
      existing.exported = existing.exported || meta.exported
      existing.calls = Array.from(new Set([...existing.calls, ...meta.calls]))
      existing.isAsync = existing.isAsync || meta.isAsync
      existing.params = Array.from(new Set([...existing.params, ...meta.params]))
      return
    }
    functions.push(meta)
  }

  const addClass = (meta: ClassMeta) => {
    const existing = classes.find(cls => cls.name === meta.name)
    if (existing) {
      existing.exported = existing.exported || meta.exported
      existing.methods = Array.from(new Set([...existing.methods, ...meta.methods]))
      return
    }
    classes.push(meta)
  }

  const addImport = (meta: ImportMeta) => {
    const exists = imports.some(i => i.source === meta.source && i.alias === meta.alias && i.line === meta.line)
    if (!exists) imports.push(meta)
  }

  const addExport = (meta: ExportMeta) => {
    const exists = exports.some(e => e.name === meta.name && e.line === meta.line)
    if (!exists) exports.push(meta)
  }

  const addEdge = (caller: string, callee: string, type: CallEdge['type'] = 'call') => {
    if (!caller || !callee || caller === callee) return
    callEdges.add(`${caller}::${callee}::${type}`)
  }

  const recordDependency = (source: string) => {
    if (source.startsWith('.') || source.startsWith('/')) {
      dependencies.add(normalizePathName(source))
    }
  }

  const recordExportName = (name: string) => {
    if (name) exportedNames.add(name)
  }

  const recordEntryPoint = (name: string) => {
    if (name) entryPoints.add(name)
  }

  if (ast) {
    visit(ast, {
      ImportDeclaration(node: any) {
        const source = node.source.value
        const line = node.loc?.start?.line ?? 0
        const specifiers: string[] = []
        let type: ImportMeta['type'] = 'side-effect'
        let alias: string | null = null

        for (const specifier of node.specifiers) {
          if (specifier.type === 'ImportDefaultSpecifier') {
            type = 'default'
            alias = specifier.local.name
            specifiers.push(specifier.local.name)
          } else if (specifier.type === 'ImportNamespaceSpecifier') {
            type = 'namespace'
            alias = specifier.local.name
            specifiers.push('*')
          } else if (specifier.type === 'ImportSpecifier') {
            if (type === 'side-effect') type = 'named'
            specifiers.push(specifier.imported.name)
            alias = alias || specifier.local.name
          }
        }

        addImport({ source, alias, type, line, specifiers })
        recordDependency(source)
        if (source.includes('express')) addFrameworkHint(frameworkHintsMap, 'Express', 0.4, 'express import')
        if (source.includes('react')) addFrameworkHint(frameworkHintsMap, 'React', 0.4, 'react import')
        if (source.includes('next')) addFrameworkHint(frameworkHintsMap, 'Next.js', 0.4, 'next import')
        if (source.includes('mongoose')) addFrameworkHint(frameworkHintsMap, 'Mongoose', 0.4, 'mongoose import')
        if (source.includes('axios')) addFrameworkHint(frameworkHintsMap, 'Axios', 0.4, 'axios import')
        if (source.includes('jsonwebtoken')) addFrameworkHint(frameworkHintsMap, 'jsonwebtoken', 0.5, 'jsonwebtoken import')
        if (source.includes('bcrypt')) addFrameworkHint(frameworkHintsMap, 'bcrypt', 0.5, 'bcrypt import')
        if (source.includes('sequelize')) addFrameworkHint(frameworkHintsMap, 'Sequelize', 0.4, 'sequelize import')
      },
      VariableDeclarator(node: any, state: any) {
        if (node.init?.type === 'CallExpression' && node.init.callee.type === 'Identifier' && node.init.callee.name === 'require' && node.init.arguments.length) {
          const arg = node.init.arguments[0]
          if (arg?.type === 'StringLiteral') {
            const source = arg.value
            const line = node.loc?.start?.line ?? 0
            const specifiers: string[] = []
            let alias: string | null = null
            if (node.id.type === 'Identifier') {
              alias = node.id.name
              specifiers.push(node.id.name)
            } else if (node.id.type === 'ObjectPattern') {
              for (const prop of node.id.properties) {
                if (prop.key?.name) specifiers.push(prop.key.name)
              }
            }
            addImport({ source, alias, type: 'require', line, specifiers })
            recordDependency(source)
            if (source.includes('express')) addFrameworkHint(frameworkHintsMap, 'Express', 0.4, 'express require')
          }
        }
      },
      ExportNamedDeclaration(node: any) {
        if (node.declaration) {
          const declaration = node.declaration
          if (declaration.type === 'FunctionDeclaration' && declaration.id?.name) {
            recordExportName(declaration.id.name)
            addFunction({
              name: declaration.id.name,
              line: declaration.loc?.start?.line ?? 0,
              params: extractParamNames(declaration.params),
              exported: true,
              calls: [],
              isAsync: declaration.async || false,
              isArrow: false,
              type: 'function'
            })
            addExport({ name: declaration.id.name, line: declaration.loc?.start?.line ?? 0, type: 'named' })
          }
          if (declaration.type === 'ClassDeclaration' && declaration.id?.name) {
            recordExportName(declaration.id.name)
            addClass({
              name: declaration.id.name,
              line: declaration.loc?.start?.line ?? 0,
              extends: declaration.superClass?.name,
              exported: true,
              methods: []
            })
            addExport({ name: declaration.id.name, line: declaration.loc?.start?.line ?? 0, type: 'named' })
          }
          if (declaration.type === 'VariableDeclaration') {
            for (const decl of declaration.declarations) {
              if (decl.id?.name) {
                recordExportName(decl.id.name)
                addExport({ name: decl.id.name, line: decl.loc?.start?.line ?? 0, type: 'named' })
                if (decl.init && (decl.init.type === 'ArrowFunctionExpression' || decl.init.type === 'FunctionExpression')) {
                  addFunction({
                    name: decl.id.name,
                    line: decl.loc?.start?.line ?? 0,
                    params: extractParamNames(decl.init.params),
                    exported: true,
                    calls: [],
                    isAsync: decl.init.async || false,
                    isArrow: decl.init.type === 'ArrowFunctionExpression',
                    type: 'arrow'
                  })
                }
              }
            }
          }
        }
        if (node.specifiers?.length) {
          for (const specifier of node.specifiers) {
            if (specifier.exported?.name) {
              addExport({ name: specifier.exported.name, line: specifier.loc?.start?.line ?? 0, type: 'named', alias: specifier.local?.name ?? null })
            }
          }
        }
      },
      ExportDefaultDeclaration(node: any) {
        const declaration = node.declaration
        if (declaration.type === 'FunctionDeclaration' && declaration.id?.name) {
          const name = declaration.id.name
          recordExportName(name)
          addFunction({
            name,
            line: declaration.loc?.start?.line ?? 0,
            params: extractParamNames(declaration.params),
            exported: true,
            calls: [],
            isAsync: declaration.async || false,
            isArrow: false,
            type: 'function'
          })
          addExport({ name, line: declaration.loc?.start?.line ?? 0, type: 'default' })
          recordEntryPoint(name)
        } else if (declaration.type === 'Identifier') {
          addExport({ name: declaration.name, line: declaration.loc?.start?.line ?? 0, type: 'default' })
          recordEntryPoint(declaration.name)
        } else if (declaration.type === 'ClassDeclaration' && declaration.id?.name) {
          const name = declaration.id.name
          addClass({
            name,
            line: declaration.loc?.start?.line ?? 0,
            extends: declaration.superClass?.name,
            exported: true,
            methods: []
          })
          addExport({ name, line: declaration.loc?.start?.line ?? 0, type: 'default' })
          recordEntryPoint(name)
        }
      },
      FunctionDeclaration(node: any) {
        if (!node.id?.name) return
        const name = node.id.name
        addFunction({
          name,
          line: node.loc?.start?.line ?? 0,
          params: extractParamNames(node.params),
          exported: exportedNames.has(name),
          calls: [],
          isAsync: node.async || false,
          isArrow: false,
          type: 'function'
        })
      },
      ArrowFunctionExpression(node: any, state: any) {
        if (state.parent?.type === 'VariableDeclarator' && state.parent.id?.name) {
          addFunction({
            name: state.parent.id.name,
            line: state.parent.loc?.start?.line ?? 0,
            params: extractParamNames(node.params),
            exported: exportedNames.has(state.parent.id.name),
            calls: [],
            isAsync: node.async || false,
            isArrow: true,
            type: 'arrow'
          })
        }
      },
      FunctionExpression(node: any, state: any) {
        if (state.parent?.type === 'VariableDeclarator' && state.parent.id?.name) {
          addFunction({
            name: state.parent.id.name,
            line: state.parent.loc?.start?.line ?? 0,
            params: extractParamNames(node.params),
            exported: exportedNames.has(state.parent.id.name),
            calls: [],
            isAsync: node.async || false,
            isArrow: false,
            type: 'function'
          })
        }
      },
      ClassDeclaration(node: any) {
        if (!node.id?.name) return
        addClass({
          name: node.id.name,
          line: node.loc?.start?.line ?? 0,
          extends: node.superClass?.name,
          exported: exportedNames.has(node.id.name),
          methods: []
        })
      },
      ClassMethod(node: any, state: any) {
        const className = state.enclosingClass
        if (!className || !node.key?.name) return
        const cls = classes.find(item => item.name === className)
        if (cls && !cls.methods.includes(node.key.name)) {
          cls.methods.push(node.key.name)
        }
        const methodName = `${className}.${node.key.name}`
        addFunction({
          name: methodName,
          line: node.loc?.start?.line ?? 0,
          params: extractParamNames(node.params),
          exported: false,
          calls: [],
          isAsync: node.async || false,
          isArrow: false,
          type: 'method'
        })
        scopeStack.push(methodName)
      },
      ObjectMethod(node: any, state: any) {
        if (!node.key?.name) return
        const name = node.key.name
        addFunction({
          name,
          line: node.loc?.start?.line ?? 0,
          params: extractParamNames(node.params),
          exported: false,
          calls: [],
          isAsync: node.async || false,
          isArrow: false,
          type: 'method'
        })
        scopeStack.push(name)
      },
      CallExpression(node: any) {
        const caller = scopeStack[scopeStack.length - 1] || 'root'
        const calleeName = getCalleeName(node.callee)
        if (calleeName) {
          addEdge(caller, calleeName, 'call')
        }

        if (node.callee.type === 'MemberExpression' && node.callee.property?.name) {
          const method = node.callee.property.name
          const objectName = node.callee.object?.name
          if (objectName === 'router' && ['get', 'post', 'put', 'delete', 'patch', 'use'].includes(method)) {
            const handler = node.arguments[1] || node.arguments[0]
            if (handler?.type === 'Identifier') {
              recordEntryPoint(handler.name)
            }
            addFrameworkHint(frameworkHintsMap, 'Express', 0.2, `router.${method} usage`)
          }
          if (objectName === 'app' && ['get', 'post', 'put', 'delete', 'patch', 'use'].includes(method)) {
            const handler = node.arguments[1] || node.arguments[0]
            if (handler?.type === 'Identifier') {
              recordEntryPoint(handler.name)
            }
            addFrameworkHint(frameworkHintsMap, 'Express', 0.2, `app.${method} usage`)
          }
        }
      }
    }, { parent: null, enclosingClass: null })
  }

  // Backfill function calls into their metadata
  for (const edge of Array.from(callEdges)) {
    const [caller, callee, type] = edge.split('::')
    const fn = functions.find(item => item.name === caller)
    if (fn && callee) {
      fn.calls = Array.from(new Set([...fn.calls, callee]))
    }
  }

  const importedSources = imports.map(i => i.source)
  const findingTitles = normalizeItems(findings.map(f => f.title))
  const modulePurpose = inferFileRole(filePath, content, imports, Array.from(frameworkHintsMap.values()), Array.from(entryPoints))
  const responsibilities = inferResponsibilities(modulePurpose, imports, Array.from(frameworkHintsMap.values()))
  const metrics = {
    linesOfCode: content.split(/\r?\n/).filter(line => line.trim()).length,
    functionCount: functions.length,
    classCount: classes.length,
    importCount: imports.length,
    exportCount: exports.length
  }
  const confidence = Math.min(100, 40 + Math.min(50, imports.length * 8 + functions.length * 4 + frameworkHintsMap.size * 6))

  return {
    filePath,
    fileType,
    imports,
    exports,
    functions,
    classes,
    callGraph: Array.from(callEdges).map(edge => {
      const [caller, callee, type] = edge.split('::')
      return { caller, callee, type: (type as CallEdge['type']) || 'unknown' }
    }),
    frameworkHints: Array.from(frameworkHintsMap.values()),
    findings: findingTitles,
    modulePurpose,
    responsibilities,
    confidence,
    metrics,
    entryPoints: Array.from(entryPoints),
    dependencies: Array.from(dependencies)
  }
}
