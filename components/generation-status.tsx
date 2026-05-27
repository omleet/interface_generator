'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle2, Sparkles, Ban, Wrench, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

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
  /** Issues detected by the validator — displayed as collapsible warnings */
  validationIssues?: string[]
  validationPass?: number
}

function formatDuration(ms: number): string {
  const totalSeconds = ms / 1000
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}

function ValidationWarnings({ issues, pass }: { issues: string[]; pass: number }) {
  const [open, setOpen] = useState(false)
  if (issues.length === 0) return null
  return (
    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-amber-800 dark:text-amber-300 font-medium"
      >
        <span>⚠ {issues.length} issue{issues.length > 1 ? 's' : ''} auto-corrected (pass {pass})</span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && (
        <ul className="px-3 pb-2 space-y-1 text-amber-700 dark:text-amber-400 list-disc list-inside">
          {issues.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function GenerationStatus({
  state,
  error,
  generationTimeMs,
  validationIssues,
  validationPass,
}: GenerationStatusProps) {
  if (state === 'idle') return null

  if (state === 'searching') {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Searching knowledge base</AlertTitle>
        <AlertDescription>Finding relevant components and templates...</AlertDescription>
      </Alert>
    )
  }

  if (state === 'generating') {
    return (
      <Alert>
        <Sparkles className="h-4 w-4 animate-pulse" />
        <AlertTitle>Generating code</AlertTitle>
        <AlertDescription>The LLM is creating your dashboard. This may take a moment...</AlertDescription>
      </Alert>
    )
  }

  if (state === 'refining') {
    return (
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
        <Wrench className="h-4 w-4 text-blue-600 animate-pulse" />
        <AlertTitle className="text-blue-800 dark:text-blue-200">
          Refining and correcting (pass {validationPass ?? 1})
        </AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          The validator found issues and is correcting them automatically…
          {validationIssues && validationIssues.length > 0 && (
            <ValidationWarnings issues={validationIssues} pass={validationPass ?? 1} />
          )}
        </AlertDescription>
      </Alert>
    )
  }

  if (state === 'complete') {
    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800 dark:text-green-200">
          Generation complete
          {generationTimeMs !== undefined && (
            <span className="ml-2 text-sm font-normal opacity-75">({formatDuration(generationTimeMs)})</span>
          )}
        </AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-300">
          Your dashboard is ready. Check the preview and download the code.
          {validationIssues && validationIssues.length > 0 && (
            <ValidationWarnings issues={validationIssues} pass={validationPass ?? 1} />
          )}
        </AlertDescription>
      </Alert>
    )
  }

  if (state === 'error') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Generation error</AlertTitle>
        <AlertDescription>
          {error || 'An error occurred. Please try again.'}
        </AlertDescription>
      </Alert>
    )
  }

  if (state === 'cancelled') {
    return (
      <Alert>
        <Ban className="h-4 w-4" />
        <AlertTitle>Generation cancelled</AlertTitle>
        <AlertDescription>You stopped the generation. Submit the prompt again when ready.</AlertDescription>
      </Alert>
    )
  }

  return null
}
