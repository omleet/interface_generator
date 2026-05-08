'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { flushSync } from 'react-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LLMSettings } from '@/components/llm-settings'
import { PromptInput } from '@/components/prompt-input'
import { CodePreview } from '@/components/code-preview'
import { CodeViewer } from '@/components/code-viewer'
import { RAGStatus } from '@/components/rag-status'
import { GenerationStatus, type GenerationState } from '@/components/generation-status'
import {
  type LLMConfig,
  DEFAULT_CONFIGS,
  getDefaultModel,
} from '@/lib/llm-client'
import { createRAGEngine, type RAGEngine, getIndexedCount, type RAGIndexProgress } from '@/lib/rag-engine'
import { generateDashboard, generatePlan, createPreviewHtml, type GeneratedCode } from '@/lib/code-generator'
import { LayoutDashboard, Eye, Pencil } from 'lucide-react'
import { GrapesJsEditor } from '@/components/grapesjs-editor'

export default function DashboardGenerator() {
  // LLM Configuration
  const [llmConfig, setLLMConfig] = useState<LLMConfig>({
    ...DEFAULT_CONFIGS.ollama,
    model: getDefaultModel('ollama'),
  })

  // RAG Engine
  const [ragEngine, setRagEngine] = useState<RAGEngine | null>(null)
  const [ragStatus, setRagStatus] = useState<RAGIndexProgress>({
    status: 'loading',
    progress: 0,
    message: 'Initializing...',
  })
  const [indexedCount, setIndexedCount] = useState(0)

  // Generation State
  const [generationState, setGenerationState] = useState<GenerationState>('idle')
  const [generationError, setGenerationError] = useState<string>('')
  const [streamingContent, setStreamingContent] = useState<string>('')
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null)
  const [currentPrompt, setCurrentPrompt] = useState<string>('')
  const [generationTimeMs, setGenerationTimeMs] = useState<number | undefined>(undefined)
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null)
  
  // Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editableCode, setEditableCode] = useState<GeneratedCode | null>(null)

  // Plan State
  const [plan, setPlan] = useState<string>('')
  const [planState, setPlanState] = useState<'idle' | 'planning' | 'ready'>('idle')
  const [isPlanLoading, setIsPlanLoading] = useState(false)

  // Cancellation — holds the AbortController for the in-flight generation
  const abortControllerRef = useRef<AbortController | null>(null)

  // Initialize RAG Engine
  useEffect(() => {
    const initRAG = async () => {
      try {
        const engine = await createRAGEngine((progress) => {
          setRagStatus(progress)
        })
        await engine.index()
        setRagEngine(engine)
        setIndexedCount(getIndexedCount())
      } catch (error) {
        setRagStatus({
          status: 'error',
          message: error instanceof Error ? error.message : 'Failed to initialize RAG',
        })
      }
    }
    initRAG()
  }, [])

  // Handle plan generation
  const handlePlan = useCallback(async (prompt: string) => {
    if (!ragEngine) {
      setGenerationError('RAG engine not ready. Please wait.')
      setGenerationState('error')
      return
    }

    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setPlan('')
    setPlanState('planning')
    setIsPlanLoading(true)
    setGenerationError('')

    const planCallbacks = {
      onToken: (token: string) => {
        if (controller.signal.aborted) return
        setPlan((prev) => prev + token)
      },
      onComplete: (fullPlan: string) => {
        if (controller.signal.aborted) return
        setPlan(fullPlan)
        setPlanState('ready')
        setIsPlanLoading(false)
      },
      onError: (error: Error) => {
        if (controller.signal.aborted) return
        setGenerationError(error.message)
        setGenerationState('error')
        setPlanState('idle')
        setIsPlanLoading(false)
      },
    }

    try {
      await generatePlan(prompt, llmConfig, ragEngine!, planCallbacks, controller.signal)
    } catch (error) {
      if (controller.signal.aborted) return
      setGenerationError(error instanceof Error ? error.message : 'Plan generation failed')
      setGenerationState('error')
      setPlanState('idle')
      setIsPlanLoading(false)
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
    }
  }, [ragEngine, llmConfig])
  const handleReplan = useCallback(async (prompt: string, currentPlan: string) => {
    if (!ragEngine) return

    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setPlan('')
    setPlanState('planning')
    setIsPlanLoading(true)
    setGenerationError('')

    const constraint = 'AdminLTE 3 + Bootstrap 4 constraints'

    const replanPrompt = `${prompt.trim()}

<existing_plan>
${currentPlan.trim()}
</existing_plan>

Review the existing plan above carefully. Fix any issues, add missing sections, remove anything that conflicts with ${constraint}, and return an improved, complete plan.`

    const replanCallbacks = {
      onToken: (token: string) => {
        if (controller.signal.aborted) return
        setPlan((prev) => prev + token)
      },
      onComplete: (fullPlan: string) => {
        if (controller.signal.aborted) return
        setPlan(fullPlan)
        setPlanState('ready')
        setIsPlanLoading(false)
      },
      onError: (error: Error) => {
        if (controller.signal.aborted) return
        setGenerationError(error.message)
        setGenerationState('error')
        setPlanState('idle')
        setIsPlanLoading(false)
      },
    }

    try {
      await generatePlan(replanPrompt, llmConfig, ragEngine!, replanCallbacks, controller.signal)
    } catch (error) {
      if (controller.signal.aborted) return
      setGenerationError(error instanceof Error ? error.message : 'Re-verification failed')
      setGenerationState('error')
      setPlanState('idle')
      setIsPlanLoading(false)
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
    }
  }, [ragEngine, llmConfig])

  // Handle prompt submission
  const handleSubmit = useCallback(async (prompt: string) => {
    if (!ragEngine) {
      setGenerationError('RAG engine not ready. Please wait.')
      setGenerationState('error')
      return
    }

    // Abort any previous in-flight generation before starting a new one
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setGenerationState('searching')
    setGenerationError('')
    setStreamingContent('')
    setGeneratedCode(null)
    setCurrentPrompt(prompt)
    setGenerationTimeMs(undefined)
    
    const startTime = Date.now()
    setGenerationStartTime(startTime)

    // Short delay to show searching state
    await new Promise(resolve => setTimeout(resolve, 500))
    if (controller.signal.aborted) {
      setGenerationState('cancelled')
      return
    }
    setGenerationState('generating')

    // Build effective prompt: if a plan exists, prepend it for richer context
    const effectivePrompt = plan.trim()
      ? `${prompt.trim()}\n\n<implementation_plan>\n${plan.trim()}\n</implementation_plan>`
      : prompt

    try {
      await generateDashboard(
        effectivePrompt,
        llmConfig,
        ragEngine!,
        {
          onToken: (token) => {
            if (controller.signal.aborted) return
            flushSync(() => { setStreamingContent((prev) => prev + token) })
          },
          onRefinementStart: () => {
            if (controller.signal.aborted) return
            setGenerationState('refining')
          },
          onComplete: (code) => {
            if (controller.signal.aborted) return
            const endTime = Date.now()
            setGenerationTimeMs(endTime - startTime)
            setGeneratedCode(code)
            setGenerationState('complete')
          },
          onError: (error) => {
            if (controller.signal.aborted) return
            setGenerationError(error.message)
            setGenerationState('error')
          },
        },
        controller.signal,
      )
    } catch (error) {
      if (controller.signal.aborted) return
      setGenerationError(error instanceof Error ? error.message : 'Generation failed')
      setGenerationState('error')
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
    }
  }, [ragEngine, llmConfig, plan])

  // Cancel an in-flight generation or plan
  const handleCancel = useCallback(() => {
    const controller = abortControllerRef.current
    if (!controller) return
    controller.abort()
    abortControllerRef.current = null
    if (isPlanLoading) {
      setIsPlanLoading(false)
      setPlanState(plan.trim() ? 'ready' : 'idle')
    } else {
      setGenerationState('cancelled')
    }
  }, [isPlanLoading, plan])

  // Abort any in-flight generation when the page unmounts
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const isGenerating = generationState === 'searching' || generationState === 'generating' || generationState === 'refining'
  const previewHtml = generatedCode ? createPreviewHtml(generatedCode) : ''

  // Open editor with current generated code
  const handleOpenEditor = useCallback(() => {
    if (generatedCode) {
      setEditableCode({ ...generatedCode })
      setIsEditorOpen(true)
    }
  }, [generatedCode])

  // Save changes from editor
  const handleEditorSave = useCallback((updatedCode: GeneratedCode) => {
    setGeneratedCode(updatedCode)
    setEditableCode(updatedCode)
    setIsEditorOpen(false)
  }, [])

  // Close editor
  const handleEditorClose = useCallback(() => {
    setIsEditorOpen(false)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LayoutDashboard className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-semibold">Interface Generator</h1>
                <p className="text-sm text-muted-foreground">Generate dashboards/interfaces using LLMs</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <RAGStatus status={ragStatus} indexedCount={indexedCount} />
              <LLMSettings config={llmConfig} onConfigChange={setLLMConfig} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-200px)]">
          {/* Left Panel - Input */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-lg">Describe The Interface</CardTitle>
              </CardHeader>
              <CardContent>
                <PromptInput
                  onSubmit={handleSubmit}
                  onPlan={handlePlan}
                  onReplan={handleReplan}
                  onCancel={handleCancel}
                  isLoading={isGenerating}
                  isPlanLoading={isPlanLoading}
                  disabled={ragStatus.status !== 'ready'}
                  plan={plan}
                  onPlanChange={setPlan}
                  planState={planState}
                />
              </CardContent>
            </Card>

            <GenerationStatus state={generationState} error={generationError} generationTimeMs={generationTimeMs} />

            {/* Code Viewer - Below input on left side */}
            <Card className="flex-1 overflow-hidden min-h-0">
              <CardContent className="p-0 h-full max-h-125">
                <CodeViewer
                  code={generatedCode}
                  streamingContent={streamingContent}
                  isStreaming={generationState === 'generating'}
                  userPrompt={currentPrompt}
                  generationTimeMs={generationTimeMs}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Preview */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Preview
                </CardTitle>
                <div className="flex items-center gap-2">
                  {generatedCode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenEditor}
                      className="h-8"
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-60px)]">
              <CodePreview html={previewHtml} className="h-full" />
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Visual Editor Modal */}
      {isEditorOpen && editableCode && (
        <GrapesJsEditor
          code={editableCode}
          onSave={handleEditorSave}
          onClose={handleEditorClose}
          llmConfig={llmConfig}
        />
      )}
    </div>
  )
}
