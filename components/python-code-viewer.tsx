'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Check, Copy, Download, FileCode2, FileText } from 'lucide-react'
import type { GeneratedPythonCode } from '@/lib/python-generator'
import { exportPythonAsZip, copyToClipboard, downloadPythonFile } from '@/lib/python-file-exporter'

interface PythonCodeViewerProps {
  code: GeneratedPythonCode | null
  streamingContent?: string
  isStreaming?: boolean
  userPrompt?: string
  generationTimeMs?: number
}

export function PythonCodeViewer({
  code,
  streamingContent,
  isStreaming,
  userPrompt,
  generationTimeMs,
}: PythonCodeViewerProps) {
  const [activeTab, setActiveTab] = useState<'python' | 'requirements'>('python')
  const [copiedTab, setCopiedTab] = useState<string | null>(null)
  const scrollRef = useRef<HTMLPreElement>(null)

  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming && scrollRef.current) {
      const scrollArea = scrollRef.current.closest('[data-radix-scroll-area-viewport]')
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight
      }
    }
  }, [streamingContent, isStreaming])

  const handleCopy = async (content: string, tab: string) => {
    await copyToClipboard(content)
    setCopiedTab(tab)
    setTimeout(() => setCopiedTab(null), 2000)
  }

  const handleDownloadPython = () => {
    if (code?.python) {
      downloadPythonFile(code.python)
    }
  }

  const handleExportZip = async () => {
    if (code) {
      await exportPythonAsZip(code, {
        userPrompt: userPrompt || 'Streamlit generation',
        generationTimeMs,
      })
    }
  }

  // The content to display: streaming raw text, or the finished python code
  const displayContent = isStreaming ? (streamingContent ?? '') : (code?.python ?? '')

  if (!displayContent && !isStreaming) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
        <FileCode2 className="h-12 w-12 opacity-50" />
        <p className="text-sm">Generated Python code will appear here</p>
      </div>
    )
  }

  const tabContent = activeTab === 'requirements' && code
    ? code.requirements
    : displayContent

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-2 gap-2 flex-wrap">
        {/* Tab pills */}
        <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('python')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === 'python'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileCode2 className="h-3.5 w-3.5" />
            main.py
          </button>
          {code && (
            <button
              type="button"
              onClick={() => setActiveTab('requirements')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeTab === 'requirements'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              requirements.txt
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCopy(tabContent, activeTab)}
            disabled={!tabContent || isStreaming}
            className="h-8"
          >
            {copiedTab === activeTab ? (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copy
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPython}
            disabled={!code?.python || isStreaming}
            className="h-8"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            .py
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportZip}
            disabled={!code?.python || isStreaming}
            className="h-8"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            ZIP
          </Button>
        </div>
      </div>

      {/* Code area — min-h-0 lets the flex parent shrink; overflow-x-auto on pre enables horizontal scroll */}
      <ScrollArea className="flex-1 min-h-0">
        <pre
          ref={scrollRef}
          className="text-xs leading-relaxed p-4 font-mono whitespace-pre overflow-x-auto text-foreground min-w-0"
        >
          {isStreaming && activeTab === 'python'
            ? (streamingContent ?? '')
            : tabContent}
          {isStreaming && activeTab === 'python' && (
            <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" aria-hidden="true" />
          )}
        </pre>
      </ScrollArea>

      {/* Footer info */}
      {code && !isStreaming && (
        <div className="border-t px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span>{code.python.split('\n').length} lines</span>
          {generationTimeMs && (
            <span>Generated in {(generationTimeMs / 1000).toFixed(1)}s</span>
          )}
          <span className="ml-auto">
            Run: <code className="font-mono bg-muted px-1 rounded">pip install streamlit pandas plotly &amp;&amp; streamlit run app.py</code>
          </span>
        </div>
      )}
    </div>
  )
}
