'use client'

import { Progress } from "@/components/ui/progress"

interface BatchState {
  currentBatchIndex: number
  totalBatches: number
}

interface AudioProgress {
  completed: number
  total: number
}

interface AudioProgressDisplayProps {
  isGeneratingAudio: boolean
  audioProgress: AudioProgress
  batchState: BatchState
  generationStatusMessage: string
  currentProviderName?: string
}

export function AudioProgressDisplay({
  isGeneratingAudio,
  audioProgress,
  batchState,
  generationStatusMessage,
  currentProviderName
}: AudioProgressDisplayProps) {
  if (!isGeneratingAudio) return null

  return (
    <div className="space-y-2 p-4 bg-blue-900/20 border border-blue-600 rounded-lg">
      <div className="flex justify-between text-sm text-white">
        <span>Generating Audio with {currentProviderName}</span>
        <span>
          {Math.round((audioProgress.completed / audioProgress.total) * 100)}%
        </span>
      </div>
      <Progress value={audioProgress.total > 0 ? (audioProgress.completed / audioProgress.total) * 100 : 0} className="h-2" />
      <div className="text-xs text-gray-300 text-center">
        {generationStatusMessage || 'Please wait...'}
      </div>
      <div className="text-xs text-gray-400 text-center">
        Batch {batchState.currentBatchIndex + 1} of {batchState.totalBatches} • 
        {audioProgress.completed}/{audioProgress.total} chunks completed
      </div>
    </div>
  )
} 