'use client'

import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Database, Loader2, CheckCircle2, AlertCircle, BookOpen } from 'lucide-react'
import type { RAGIndexProgress } from '@/lib/rag-engine'
import type { StreamlitRAGProgress } from '@/lib/streamlit-rag-engine'

interface RAGStatusProps {
  status: RAGIndexProgress
  indexedCount: number
}

export function RAGStatus({ status, indexedCount }: RAGStatusProps) {
  if (status.status === 'ready') {
    return (
      <Badge
        variant="secondary"
        className="gap-1.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
        title="Knowledge base includes primitives, patterns, components, widgets, charts, layouts and utilities"
      >
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

// ---------------------------------------------------------------------------
// Streamlit RAG status badge — shown when output mode is Python
// ---------------------------------------------------------------------------

interface StreamlitRAGStatusBadgeProps {
  status: StreamlitRAGProgress
}

export function StreamlitRAGStatusBadge({ status }: StreamlitRAGStatusBadgeProps) {
  if (status.status === 'ready') {
    return (
      <Badge
        variant="secondary"
        className="gap-1.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
        title="Streamlit official docs indexed for RAG-augmented Python generation"
      >
        <CheckCircle2 className="h-3 w-3" />
        Streamlit Docs ({status.indexedCount ?? 0} entries)
      </Badge>
    )
  }

  if (status.status === 'error') {
    return (
      <Badge
        variant="secondary"
        className="gap-1.5 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"
        title={status.message ?? 'Failed to fetch Streamlit docs'}
      >
        <AlertCircle className="h-3 w-3" />
        Streamlit Docs Unavailable
      </Badge>
    )
  }

  if (status.status === 'idle') {
    return (
      <Badge variant="secondary" className="gap-1.5 text-muted-foreground">
        <BookOpen className="h-3 w-3" />
        Streamlit Docs
      </Badge>
    )
  }

  // fetching or indexing
  return (
    <div className="flex items-center gap-3">
      <Badge variant="secondary" className="gap-1.5">
        <Loader2 className="h-3 w-3 animate-spin" />
        {status.status === 'fetching' ? 'Fetching Streamlit Docs…' : 'Indexing…'}
      </Badge>
      <div className="flex items-center gap-2 min-w-40">
        <BookOpen className="h-4 w-4 text-muted-foreground" />
        <Progress value={status.progress || 0} className="h-2 flex-1" />
        <span className="text-xs text-muted-foreground w-8">
          {Math.round(status.progress || 0)}%
        </span>
      </div>
    </div>
  )
}
