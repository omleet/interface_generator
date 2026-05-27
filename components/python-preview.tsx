'use client'

import { Code2, Terminal, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import type { GeneratedPythonCode } from '@/lib/python-generator'

interface PythonPreviewProps {
  code: GeneratedPythonCode | null
  className?: string
}

export function PythonPreview({ code, className }: PythonPreviewProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyCmd = async () => {
    const reqs = code?.requirements ?? 'streamlit pandas plotly'
    const pkgs = reqs.split('\n').map(l => l.split('>=')[0].trim()).filter(Boolean).join(' ')
    await navigator.clipboard.writeText(`pip install ${pkgs} && streamlit run app.py`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!code) {
    return (
      <div className={`flex items-center justify-center bg-muted/50 rounded-lg ${className ?? ''}`}>
        <p className="text-muted-foreground text-sm">Preview will appear here after generation</p>
      </div>
    )
  }

  // ── FIX: Extract title from st.set_page_config (was using NiceGUI ui.run regex) ──
  const titleMatch = code.python.match(/set_page_config\s*\([^)]*page_title\s*=\s*['"]([^'"]+)['"]/i)
  const appTitle = titleMatch?.[1] ?? 'Streamlit App'

  // ── FIX: Count st.* calls (was counting ui.* calls) ──
  const stCalls = (code.python.match(/\bst\.\w+\s*\(/g) ?? []).length

  // ── Count plotly charts ──
  const chartCount = (code.python.match(/st\.plotly_chart\s*\(/g) ?? []).length

  // ── Count dataframes ──
  const dfCount = (code.python.match(/st\.dataframe\s*\(/g) ?? []).length

  // Build install command from actual requirements
  const pkgs = code.requirements
    .split('\n')
    .map(l => l.split('>=')[0].trim())
    .filter(Boolean)
    .join(' ')
  const installCmd = `pip install ${pkgs}`
  const runCmd = 'streamlit run app.py'

  return (
    <div className={`flex flex-col items-center justify-center bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-8 gap-6 ${className ?? ''}`}>
      {/* Icon + title */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="rounded-full bg-blue-100 dark:bg-blue-900/40 p-4">
          <Code2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{appTitle}</h3>
          <p className="text-sm text-muted-foreground">Python + Streamlit application</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-6 text-center">
        <div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{code.python.split('\n').length}</p>
          <p className="text-xs text-muted-foreground">lines</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stCalls}</p>
          <p className="text-xs text-muted-foreground">st.* widgets</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{chartCount}</p>
          <p className="text-xs text-muted-foreground">charts</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{dfCount}</p>
          <p className="text-xs text-muted-foreground">dataframes</p>
        </div>
      </div>

      {/* How to run */}
      <div className="w-full max-w-md rounded-lg border bg-background p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Terminal className="h-4 w-4" />
          <span>How to run</span>
        </div>
        <div className="space-y-2">
          <div className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground break-all">
            {installCmd}
            
          </div>
           
          <div className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
            {runCmd}
          </div>
        </div>
        <button
          type="button"
          onClick={handleCopyCmd}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-500" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy commands</span>
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-muted-foreground text-center max-w-sm">
        Python Apps doesn't run in the browser. Download the code and run it locally.
        The App opens at{' '}
        <span className="font-mono">http://localhost:8501</span>.
      </p>
    </div>
  )
}
