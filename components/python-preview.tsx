'use client'

import { Code2, Terminal, Copy, Check, Info } from 'lucide-react'
import { useState } from 'react'
import type { GeneratedPythonCode } from '@/lib/python-generator'

interface PythonPreviewProps {
  code: GeneratedPythonCode | null
  className?: string
}

export function PythonPreview({ code, className }: PythonPreviewProps) {
  const [copied, setCopied] = useState(false)
  const [copiedInstall, setCopiedInstall] = useState(false)
const [copiedRun, setCopiedRun] = useState(false)

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
  <div>
    <div className="flex items-center gap-2 mb-1">
      <span className="text-[10px] font-mono bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
        1. Install dependencies
      </span>
    </div>
    <div className="flex items-center gap-2">
      <div className="relative group flex-1">
        <div className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground overflow-x-auto pr-10">
          <code>{installCmd}</code>
        </div>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(installCmd)
            setCopiedInstall(true)
            setTimeout(() => setCopiedInstall(false), 2000)
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted-foreground/20 rounded transition-colors"
        >
          {copiedInstall ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          )}
        </button>
      </div>
      <div className="relative group cursor-help shrink-0">
        <Info className="h-4 w-4 text-muted-foreground" />
        <span className="absolute bottom-full right-0 mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
          Only needed for first run or missing packages.
        </span>
      </div>
    </div>
  </div>
  
  <div>
    <div className="flex items-center gap-2 mb-1">
      <span className="text-[10px] font-mono bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">
        2. Run the app
      </span>
    </div>
    <div className="relative group">
      <div className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground pr-10">
        {runCmd}
      </div>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(runCmd)
          setCopiedRun(true)
          setTimeout(() => setCopiedRun(false), 2000)
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted-foreground/20 rounded transition-colors"
      >
        {copiedRun ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
        )}
      </button>
    </div>
  </div>
</div>
        
      </div>

      <p className="text-xs text-muted-foreground text-center max-w-sm">
        Python Apps doesn't run in the browser. Download the code and run it locally.
        The App opens at{' '}
        <span className="font-mono">http://localhost:8501</span>.
      </p>
    </div>
  )
}
