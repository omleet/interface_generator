'use client'

import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Database, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import type { RAGIndexProgress } from '@/lib/rag-engine'

interface RAGStatusProps {
  status: RAGIndexProgress
  indexedCount: number
}

export function RAGStatus({ status, indexedCount }: RAGStatusProps) {
  if (status.status === 'ready') {
    return (
      <Badge variant="secondary" className="gap-1.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" title="Knowledge base includes primitives, patterns, components, widgets, charts, layouts and utilities">
        <CheckCircle2 className="h-3 w-3" />
        RAG Ready ({indexedCount} components)
      </Badge>
    )
  }

  if (status.status === 'error') {
    return (
      <Badge variant="destructive" className="gap-1.5">
        <AlertCircle className="h-3 w-3" />
        RAG Error
      </Badge>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <Badge variant="secondary" className="gap-1.5">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading RAG
      </Badge>
      <div className="flex items-center gap-2 min-w-50">
        <Database className="h-4 w-4 text-muted-foreground" />
        <Progress value={status.progress || 0} className="h-2 flex-1" />
        <span className="text-xs text-muted-foreground w-10">
          {Math.round(status.progress || 0)}%
        </span>
      </div>
    </div>
  )
}
