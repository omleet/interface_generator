'use client'

import { Code2, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

export type OutputMode = 'html' | 'python'

interface OutputModeSelectorProps {
  value: OutputMode
  onChange: (mode: OutputMode) => void
  disabled?: boolean
}

export function OutputModeSelector({ value, onChange, disabled }: OutputModeSelectorProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('html')}
        className={cn(
          'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          value === 'html'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        )}
        aria-pressed={value === 'html'}
        title="Generate HTML + CSS + JavaScript (AdminLTE)"
      >
        
        <span>HTML + CSS + JS</span>
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('python')}
        className={cn(
          'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          value === 'python'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        )}
        aria-pressed={value === 'python'}
        title="Generate Python (Streamlit)"
      >
        
        <span>Python (Streamlit)</span>
      </button>
    </div>
  )
}
