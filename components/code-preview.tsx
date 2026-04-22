'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Maximize2, Minimize2, RefreshCw } from 'lucide-react'

interface CodePreviewProps {
  html: string
  className?: string
}

export function CodePreview({ html, className }: CodePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [key, setKey] = useState(0)

  useEffect(() => {
    if (iframeRef.current && html) {
      const doc = iframeRef.current.contentDocument
      if (doc) {
        doc.open()
        doc.write(html)
        doc.close()
      }
    }
  }, [html, key])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      iframeRef.current?.parentElement?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const refresh = () => {
    setKey((k) => k + 1)
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  if (!html) {
    return (
      <div className={`flex items-center justify-center bg-muted/50 rounded-lg ${className}`}>
        <p className="text-muted-foreground text-sm">
          Preview will appear here after generation
        </p>
      </div>
    )
  }

  return (
    <div className={`relative bg-white rounded-lg overflow-hidden border ${className}`}>
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-white/90 backdrop-blur-sm"
          onClick={refresh}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-white/90 backdrop-blur-sm"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>
      <iframe
        key={key}
        ref={iframeRef}
        title="Dashboard Preview"
        className="w-full h-full"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  )
}
