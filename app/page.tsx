"use client"

import { ScrutinyDashboard } from './components/ScrutinyDashboard'
import { useScrutinyWorkspace } from './hooks/useScrutinyWorkspace'

export default function Page() {
  const workspace = useScrutinyWorkspace()

  return (
    <ScrutinyDashboard
      repoUrl={workspace.repoUrl}
      setRepoUrl={workspace.setRepoUrl}
      files={workspace.files}
      selectedFile={workspace.selectedFile}
      fileContent={workspace.fileContent}
      contentCollapsed={workspace.contentCollapsed}
      setContentCollapsed={workspace.setContentCollapsed}
      scanning={workspace.scanning}
      loadingFile={workspace.loadingFile}
      status={workspace.status}
      error={workspace.error}
      fileError={workspace.fileError}
      selectedFinding={workspace.selectedFinding}
      setSelectedFinding={workspace.setSelectedFinding}
      selectedFindings={workspace.selectedFindings}
      selectedMetadata={workspace.selectedMetadata}
      selectedExplanation={workspace.selectedExplanation}
      repoSummary={workspace.analysis.repoSummary}
      repoInsights={workspace.repoInsights}
      insightsLoading={workspace.insightsLoading}
      insightsError={workspace.insightsError}
      generateInsights={workspace.generateInsights}
      devMode={workspace.devMode}
      setDevMode={workspace.setDevMode}
      devCode={workspace.devCode}
      setDevCode={workspace.setDevCode}
      devFilePath={workspace.devFilePath}
      setDevFilePath={workspace.setDevFilePath}
      handleScan={workspace.handleScan}
      handleSelectFile={workspace.handleSelectFile}
      handleDevPasteScan={workspace.handleDevPasteScan}
    />
  )
}
