"use client"

import { useEffect, useMemo, useRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
  useReactFlow
} from 'reactflow'
import type { FileIntelligence } from '@/lib/fileIntelligence'
import 'reactflow/dist/style.css'

type FlowNodeData = {
  name: string
  filePath: string
  kind: 'function' | 'file' | 'external'
}

type DrawerProps = {
  intelligence: FileIntelligence
  scannedFiles: FileIntelligence[]
  availableFiles: string[]
  onClose: () => void
}

const MAX_FLOW_NODES = 180
const MAX_FLOW_EDGES = 320

function resolveImportedFile(importer: string, source: string, availableFiles: string[]) {
  if (!source.startsWith('.') && !source.startsWith('/')) return null

  const baseParts = source.startsWith('/') ? [] : importer.replace(/\\/g, '/').split('/').slice(0, -1)
  const parts = [...baseParts, ...source.replace(/^\//, '').split('/')]
  const normalized: string[] = []
  for (const part of parts) {
    if (!part || part === '.') continue
    if (part === '..') normalized.pop()
    else normalized.push(part)
  }

  const base = normalized.join('/')
  const candidates = [base, ...['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].map(ext => `${base}${ext}`), ...['index.ts', 'index.tsx', 'index.js', 'index.jsx'].map(name => `${base}/${name}`)]
  const knownFiles = new Set(availableFiles.map(path => path.replace(/\\/g, '/')))
  return candidates.find(path => knownFiles.has(path)) ?? null
}

function normalizePath(path: string) {
  const parts: string[] = []
  for (const part of path.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return parts.join('/')
}

function resolveFileCallPath(importer: string, source: string, availableFiles: string[]) {
  let pathname = source.split(/[?#]/, 1)[0]
  if (/^https?:\/\//i.test(pathname)) {
    try {
      pathname = new URL(pathname).pathname
    } catch {
      return null
    }
  }

  const candidate = normalizePath(pathname.startsWith('/')
    ? pathname
    : `${importer.replace(/\\/g, '/').split('/').slice(0, -1).join('/')}/${pathname}`)
  const normalizedFiles = availableFiles.map(path => normalizePath(path))
  if (normalizedFiles.includes(candidate)) return candidate

  const suffixMatches = normalizedFiles.filter(path => path.endsWith(`/${candidate}`) || path.split('/').at(-1) === candidate)
  return suffixMatches.length === 1 ? suffixMatches[0] : null
}

export function buildCallFlow(files: FileIntelligence[], selectedPath: string, availableFiles: string[] = []) {
  const orderedFiles = [...files].sort((left, right) => Number(right.filePath === selectedPath) - Number(left.filePath === selectedPath))
  const filesByPath = new Map(orderedFiles.map(file => [file.filePath.replace(/\\/g, '/'), file]))
  const knownFiles = Array.from(new Set([...availableFiles, ...orderedFiles.map(file => file.filePath)]))
  const nodesById = new Map<string, Node<FlowNodeData>>()
  const edgesById = new Map<string, Edge>()
  const functionsByFile = new Map<string, Map<string, string>>()
  const totalFunctions = orderedFiles.reduce((count, file) => count + file.functions.length, 0)
  let truncated = false

  for (const file of orderedFiles) {
    const fileFunctions = new Map<string, string>()
    for (const fn of file.functions) {
      if (nodesById.size >= MAX_FLOW_NODES) {
        truncated = true
        break
      }
      const id = `function:${file.filePath}:${fn.name}`
      fileFunctions.set(fn.name, id)
      nodesById.set(id, { id, type: 'fileFunction', position: { x: 0, y: 0 }, data: { name: fn.name, filePath: file.filePath, kind: 'function' } })
    }
    functionsByFile.set(file.filePath, fileFunctions)
  }

  for (const file of orderedFiles) {
    const localFunctions = functionsByFile.get(file.filePath) ?? new Map<string, string>()
    for (const call of file.callGraph) {
      if (edgesById.size >= MAX_FLOW_EDGES) {
        truncated = true
        break
      }

      let callerId = localFunctions.get(call.caller)
      if (!callerId && call.caller === 'root' && nodesById.size < MAX_FLOW_NODES) {
        callerId = `function:${file.filePath}:<module>`
        nodesById.set(callerId, { id: callerId, type: 'fileFunction', position: { x: 0, y: 0 }, data: { name: 'module', filePath: file.filePath, kind: 'function' } })
      }
      if (!callerId) continue

      let targetFile: string | null = null
      let targetName = call.callee
      let importedFunctionResolved = false
      if (!localFunctions.has(call.callee)) {
        for (const imported of file.imports) {
          const binding = imported.bindings.find(item => item.local === call.callee)
          if (!binding) continue
          const importedPath = resolveImportedFile(file.filePath, imported.source, knownFiles)
          if (!importedPath) continue
          targetFile = importedPath
          const importedFile = filesByPath.get(importedPath) ?? null
          const exportedName = binding.imported === 'default'
            ? importedFile?.exports.find(item => item.type === 'default')?.name
            : binding.imported
          if (exportedName && importedFile && functionsByFile.get(importedPath)?.has(exportedName)) {
            targetName = exportedName
            importedFunctionResolved = true
          } else {
            targetName = binding.local
          }
          break
        }
      }

      const targetId = targetFile
        ? importedFunctionResolved ? functionsByFile.get(targetFile)?.get(targetName) : undefined
        : localFunctions.get(call.callee)
      const resolvedTargetId = targetId ?? `external:${targetFile ?? file.filePath}:${targetName}`
      if (!nodesById.has(resolvedTargetId)) {
        if (nodesById.size >= MAX_FLOW_NODES) {
          truncated = true
          continue
        }
        nodesById.set(resolvedTargetId, {
          id: resolvedTargetId,
          type: 'fileFunction',
          position: { x: 0, y: 0 },
          data: { name: targetName, filePath: targetFile ?? file.filePath, kind: 'external' }
        })
      }

      const edgeId = `${callerId}->${resolvedTargetId}`
      if (!edgesById.has(edgeId)) {
        edgesById.set(edgeId, {
          id: edgeId,
          source: callerId,
          target: resolvedTargetId,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
          style: targetId ? { stroke: '#38bdf8', strokeWidth: 1.6 } : { stroke: '#f59e0b', strokeDasharray: '5 4' }
        })
      }
    }
  }

  for (const file of orderedFiles) {
    const localFunctions = functionsByFile.get(file.filePath) ?? new Map<string, string>()
    for (const fileCall of file.fileCalls) {
      if (edgesById.size >= MAX_FLOW_EDGES) {
        truncated = true
        break
      }

      let callerId = localFunctions.get(fileCall.caller)
      if (!callerId && fileCall.caller === 'root' && nodesById.size < MAX_FLOW_NODES) {
        callerId = `function:${file.filePath}:<module>`
        nodesById.set(callerId, { id: callerId, type: 'fileFunction', position: { x: 0, y: 0 }, data: { name: 'module', filePath: file.filePath, kind: 'function' } })
      }
      if (!callerId) continue

      const targetPath = resolveFileCallPath(file.filePath, fileCall.path, knownFiles)
      const analyzedTarget = targetPath ? filesByPath.get(targetPath) : null
      const targetId = targetPath ? `file:${targetPath}` : `external:${file.filePath}:${fileCall.path}`
      if (!nodesById.has(targetId)) {
        if (nodesById.size >= MAX_FLOW_NODES) {
          truncated = true
          continue
        }
        const nodePath = targetPath ?? fileCall.path
        nodesById.set(targetId, {
          id: targetId,
          type: 'fileFunction',
          position: { x: 0, y: 0 },
          data: {
            name: nodePath.split('/').pop() ?? nodePath,
            filePath: nodePath,
            kind: analyzedTarget ? 'file' : 'external'
          }
        })
      }

      const edgeId = `${callerId}->${targetId}`
      if (!edgesById.has(edgeId)) {
        edgesById.set(edgeId, {
          id: edgeId,
          source: callerId,
          target: targetId,
          type: 'smoothstep',
          label: 'HTTP',
          markerEnd: { type: MarkerType.ArrowClosed },
          style: analyzedTarget ? { stroke: '#34d399', strokeWidth: 1.8 } : { stroke: '#f59e0b', strokeDasharray: '5 4' }
        })
      }
    }
  }

  const nodes = Array.from(nodesById.values())
  const edges = Array.from(edgesById.values())
  const incoming = new Map(nodes.map(node => [node.id, 0]))
  const outgoing = new Map<string, string[]>()
  for (const edge of edges) {
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1)
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target])
  }

  const rank = new Map<string, number>()
  const queue = nodes.filter(node => incoming.get(node.id) === 0).map(node => node.id)
  for (const id of queue) rank.set(id, 0)
  for (let index = 0; index < queue.length; index++) {
    const source = queue[index]
    const nextRank = (rank.get(source) ?? 0) + 1
    for (const target of outgoing.get(source) ?? []) {
      if (rank.has(target)) continue
      rank.set(target, nextRank)
      queue.push(target)
    }
  }
  const cycleRank = Math.max(0, ...rank.values()) + 1
  for (const node of nodes) {
    if (!rank.has(node.id)) rank.set(node.id, cycleRank)
  }

  const columns = new Map<number, Node<FlowNodeData>[]>()
  for (const node of nodes) {
    const column = rank.get(node.id) ?? 0
    columns.set(column, [...(columns.get(column) ?? []), node])
  }
  const laidOutNodes = nodes.map(node => {
    const column = rank.get(node.id) ?? 0
    const row = (columns.get(column) ?? []).findIndex(item => item.id === node.id)
    return { ...node, position: { x: column * 250, y: row * 105 } }
  })

  return { nodes: laidOutNodes, edges, totalFunctions, truncated }
}

function FlowNode({ data }: NodeProps<FlowNodeData>) {
  return (
    <div className={`min-w-[170px] rounded-md border px-3 py-2 shadow-sm ${data.kind === 'external' ? 'border-amber-500/60 bg-amber-950 text-amber-100' : data.kind === 'file' ? 'border-emerald-500/60 bg-emerald-950 text-emerald-100' : 'border-cyan-500/50 bg-slate-900 text-slate-100'}`}>
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-slate-400 !bg-slate-200" />
      <p className="truncate text-sm font-semibold">{data.name}</p>
      <p className="mt-1 max-w-[220px] truncate text-[10px] text-slate-400">{data.kind === 'external' ? `Not scanned or unresolved · ${data.filePath}` : data.kind === 'file' ? `Analyzed endpoint · ${data.filePath}` : data.filePath}</p>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-slate-400 !bg-slate-200" />
    </div>
  )
}

const nodeTypes = { fileFunction: FlowNode }

function CallFlowCanvas({ nodes, edges }: { nodes: Node<FlowNodeData>[]; edges: Edge[] }) {
  const { fitView } = useReactFlow()

  useEffect(() => {
    void fitView({ padding: 0.18, duration: 180 })
  }, [edges, fitView, nodes])

  return (
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} minZoom={0.2} maxZoom={1.5} nodesDraggable={false} nodesConnectable={false} elementsSelectable>
      <Background color="#334155" gap={22} />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable nodeColor={node => {
        const kind = (node.data as FlowNodeData).kind
        return kind === 'external' ? '#f59e0b' : kind === 'file' ? '#34d399' : '#38bdf8'
      }} maskColor="rgba(2, 6, 23, 0.75)" />
    </ReactFlow>
  )
}

function InfoList({ title, values, renderValue }: {
  title: string
  values: string[]
  renderValue?: (value: string) => string
}) {
  return (
    <section className="min-w-0 rounded-md border border-slate-800 bg-slate-900/80 p-3">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</h3>
      {values.length ? (
        <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto text-xs text-slate-200">
          {values.map((value, index) => <li key={`${title}-${index}`} className="break-words">{renderValue?.(value) ?? value}</li>)}
        </ul>
      ) : <p className="mt-2 text-xs text-slate-500">None detected</p>}
    </section>
  )
}

export function FileIntelligenceDrawer({ intelligence, scannedFiles, availableFiles, onClose }: DrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const flow = useMemo(() => buildCallFlow(scannedFiles, intelligence.filePath, availableFiles), [availableFiles, intelligence.filePath, scannedFiles])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const functions = intelligence.functions.map(item => `${item.name}() · line ${item.line}${item.isAsync ? ' · async' : ''}`)
  const exports = intelligence.exports.map(item => `${item.name} · ${item.type} · line ${item.line}`)
  const classes = intelligence.classes.map(item => `${item.name}${item.extends ? ` extends ${item.extends}` : ''} · ${item.methods.length} methods`)
  const frameworks = intelligence.frameworkHints.map(item => `${item.framework} · ${Math.round(item.confidence * 100)}% confidence`)
  const imports = intelligence.imports.map(item => `${item.source} → ${item.bindings.map(binding => `${binding.imported} as ${binding.local}`).join(', ') || 'side effect'}`)

  return (
    <div className="fixed inset-0 z-[80]">
      <button type="button" aria-label="Close File Intelligence" onClick={onClose} className="absolute inset-0 h-full w-full bg-slate-950/65 backdrop-blur-[2px]" />
      <aside role="dialog" aria-modal="true" aria-labelledby="file-intelligence-title" className="absolute inset-y-0 right-0 flex w-full max-w-[min(100vw,56rem)] flex-col border-l border-slate-800 bg-slate-950 text-slate-100 shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300">File Intelligence</p>
            <h2 id="file-intelligence-title" className="mt-1 truncate font-mono text-sm font-semibold">{intelligence.filePath}</h2>
            <p className="mt-1 text-xs text-slate-400">{intelligence.modulePurpose} · {intelligence.confidence}% confidence · {intelligence.astStatus}</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} className="shrink-0 rounded-md border border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400">Close</button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
          {intelligence.astStatus !== 'analyzed' ? (
            <p className="rounded-md border border-amber-900 bg-amber-950/50 px-3 py-2 text-xs text-amber-100">
              {intelligence.astStatus === 'unsupported' ? 'AST structure is available for JavaScript and TypeScript files. Responsibilities are heuristic for this file type.' : 'The source could not be parsed. Some AST details may be missing.'}
            </p>
          ) : null}

          <section>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Overview</h3>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] text-slate-300">{intelligence.metrics.linesOfCode} LOC</span>
            </div>
            <p className="mt-2 text-sm text-slate-200">{intelligence.modulePurpose}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['Functions', intelligence.metrics.functionCount],
                ['Imports', intelligence.metrics.importCount],
                ['Exports', intelligence.metrics.exportCount],
                ['Classes', intelligence.metrics.classCount]
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-slate-800 bg-slate-900 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-1 text-lg font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <InfoList title="Responsibilities" values={intelligence.responsibilities} />
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoList title="Imports and bindings" values={imports} />
            <InfoList title="Exports" values={exports} />
            <InfoList title="Functions" values={functions} />
            <InfoList title="Classes" values={classes} />
            <InfoList title="Entry points" values={intelligence.entryPoints} />
            <InfoList title="Framework signals" values={frameworks} />
            <InfoList title="Dependencies" values={intelligence.dependencies} />
            <InfoList title="Detected patterns" values={intelligence.findings} />
          </div>

          <section>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Call Flow</h3>
                <p className="mt-1 text-xs text-slate-400">Built from {scannedFiles.length} analyzed file{scannedFiles.length === 1 ? '' : 's'}. The graph grows as you open more files.</p>
              </div>
              <span className="text-[10px] text-slate-500">{flow.totalFunctions} functions · {flow.edges.length} links</span>
            </div>
            {flow.truncated ? <p className="mt-2 text-[10px] text-amber-300">The graph is capped to keep the view responsive.</p> : null}
            {flow.nodes.length ? (
              <div className="mt-3 h-[430px] overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
                <ReactFlowProvider>
                  <CallFlowCanvas nodes={flow.nodes} edges={flow.edges} />
                </ReactFlowProvider>
              </div>
            ) : (
              <p className="mt-3 rounded-md border border-dashed border-slate-800 p-5 text-sm text-slate-400">No function calls were extracted yet. Analyze JavaScript or TypeScript files with function calls to build this graph.</p>
            )}
            <p className="mt-2 text-[10px] text-slate-500">Blue edges show function calls. Green edges show analyzed HTTP file targets. Dashed edges point to files not scanned yet or unresolved calls.</p>
          </section>
        </div>
      </aside>
    </div>
  )
}
