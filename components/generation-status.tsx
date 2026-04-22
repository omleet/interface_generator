'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle2, Sparkles, Ban } from 'lucide-react'

export type GenerationState =
  | 'idle'
  | 'searching'
  | 'generating'
  | 'refining'
  | 'complete'
  | 'error'
  | 'cancelled'

interface GenerationStatusProps {
  state: GenerationState
  error?: string
  generationTimeMs?: number
}

function formatDuration(ms: number): string {
  const totalSeconds = ms / 1000

  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)}s`
  }

  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)

  if (h > 0) {
    return `${h}h ${m}m ${s}s`
  }

  return `${m}m ${s}s`
}

export function GenerationStatus({ state, error, generationTimeMs }: GenerationStatusProps) {
  if (state === 'idle') {
    return null
  }

  if (state === 'searching') {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Searching Knowledge Base</AlertTitle>
        <AlertDescription>
          Finding relevant AdminLTE components and templates...
        </AlertDescription>
      </Alert>
    )
  }

  if (state === 'generating') {
    return (
      <Alert>
        <Sparkles className="h-4 w-4 animate-pulse" />
        <AlertTitle>Generating Dashboard</AlertTitle>
        <AlertDescription>
          The LLM is creating your dashboard. This may take a moment...
        </AlertDescription>
      </Alert>
    )
  }

  if (state === 'refining') {
    return (
      <Alert>
        <Sparkles className="h-4 w-4 animate-pulse" />
        <AlertTitle>Refining Output</AlertTitle>
        <AlertDescription>
          Running self-refinement pass — checking for missing elements and broken code...
        </AlertDescription>
      </Alert>
    )
  }

  if (state === 'complete') {
    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800 dark:text-green-200">
          Generation Complete
          {generationTimeMs !== undefined && (
            <span className="ml-2 text-sm font-normal opacity-75">
              ({formatDuration(generationTimeMs)})
            </span>
          )}
        </AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-300">
          Your dashboard is ready. Check the preview and download the code.
        </AlertDescription>
      </Alert>
    )
  }

  if (state === 'error') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Generation Error</AlertTitle>
        <AlertDescription>
          {error || 'An error occurred during generation. Please try again.'}
        </AlertDescription>
      </Alert>
    )
  }

  if (state === 'cancelled') {
    return (
      <Alert>
        <Ban className="h-4 w-4" />
        <AlertTitle>Generation Cancelled</AlertTitle>
        <AlertDescription>
          You stopped the generation. Submit the prompt again when ready.
        </AlertDescription>
      </Alert>
    )
  }

  return null
}
