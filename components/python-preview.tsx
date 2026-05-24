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

  const installCmd = 'pip install streamlit pandas plotly'
  const runCmd = 'streamlit run app.py'

  const handleCopyCmd = async () => {
    await navigator.clipboard.writeText(`${installCmd} && ${runCmd}`)
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

  // Extract the app title from ui.run(title='...') if present
  const titleMatch = code.python.match(/ui\.run\s*\([^)]*title\s*=\s*['"]([^'"]+)['"]/i)
  const appTitle = titleMatch?.[1] ?? 'Streamlit App'

  // Extract port
  const portMatch = code.python.match(/ui\.run\s*\([^)]*port\s*=\s*(\d+)/i)
  const port = portMatch?.[1] ?? '8501'

  // Rough count of UI elements
  const uiCalls = (code.python.match(/\bui\.\w+\s*\(/g) ?? []).length

  return (
    <div className={`flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-8 gap-6 ${className ?? ''}`}>
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
          <p className="text-xs text-muted-foreground">lines of code</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{uiCalls}</p>
          <p className="text-xs text-muted-foreground">UI elements</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{port}</p>
          <p className="text-xs text-muted-foreground">port</p>
        </div>
      </div>

      {/* How to run */}
      <div className="w-full max-w-md rounded-lg border bg-background p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Terminal className="h-4 w-4" />
          <span>How to run</span>
        </div>
        <div className="space-y-2">
          <div className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
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
        Python apps cannot run in the browser. Download the code and run it locally.
        The app will open at{' '}
        <span className="font-mono">http://localhost:{port}</span>.
      </p>
    </div>
  )
}
