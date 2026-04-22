'use client'

import { useState, useEffect, useRef } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Check, Copy, Download, FileCode2, FileJson } from 'lucide-react'
import { copyToClipboard, downloadHtml, exportAsZip, type ExportOptions } from '@/lib/file-exporter'
import type { GeneratedCode } from '@/lib/code-generator'

interface CodeViewerProps {
  code: GeneratedCode | null
  streamingContent?: string
  isStreaming?: boolean
  userPrompt?: string
  generationTimeMs?: number
}

export function CodeViewer({ code, streamingContent, isStreaming, userPrompt, generationTimeMs }: CodeViewerProps) {
  const [copiedTab, setCopiedTab] = useState<string | null>(null)
  const scrollRef = useRef<HTMLPreElement>(null)

  // Auto-scroll to bottom when streaming content updates
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

  const handleDownloadHtml = () => {
    if (code?.fullHtml) {
      downloadHtml(code.fullHtml)
    }
  }

  const handleExportZip = async () => {
    if (code) {
      const exportOptions: ExportOptions = {
        userPrompt: userPrompt || 'Dashboard generation',
        generationTimeMs,
      }
      await exportAsZip(code, exportOptions)
    }
  }

  const displayContent = isStreaming ? streamingContent || '' : code?.fullHtml || ''

  if (!displayContent && !isStreaming) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
        <FileCode2 className="h-12 w-12 opacity-50" />
        <p className="text-sm">Generated code will appear here</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="full" className="flex-1 flex flex-col">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <TabsList>
            <TabsTrigger value="full" className="gap-2">
              <FileCode2 className="h-4 w-4" />
              Full HTML
            </TabsTrigger>
            <TabsTrigger value="html" disabled={!code?.html}>
              HTML
            </TabsTrigger>
            <TabsTrigger value="css" disabled={!code?.css}>
              CSS
            </TabsTrigger>
            <TabsTrigger value="js" disabled={!code?.js}>
              JS
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(displayContent, 'full')}
              disabled={!displayContent || isStreaming}
            >
              {copiedTab === 'full' ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadHtml}
              disabled={!code || isStreaming}
            >
              <Download className="mr-2 h-4 w-4" />
              HTML
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportZip}
              disabled={!code || isStreaming}
            >
              <FileJson className="mr-2 h-4 w-4" />
              ZIP
            </Button>
          </div>
        </div>

        <TabsContent value="full" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full max-h-[400px]">
            <pre ref={scrollRef} className="p-4 text-sm font-mono whitespace-pre-wrap break-words">
              <code>{displayContent}</code>
              {isStreaming && <span className="animate-pulse">|</span>}
            </pre>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="html" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full max-h-[400px]">
            <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words">
              <code>{code?.html || ''}</code>
            </pre>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="css" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full max-h-[400px]">
            <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words">
              <code>{code?.css || 'No custom CSS'}</code>
            </pre>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="js" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full max-h-[400px]">
            <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words">
              <code>{code?.js || 'No custom JavaScript'}</code>
            </pre>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
