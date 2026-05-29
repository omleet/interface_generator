'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { flushSync } from 'react-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LLMSettings } from '@/components/llm-settings'
import { PromptInput } from '@/components/prompt-input'
import { CodePreview } from '@/components/code-preview'
import { CodeViewer } from '@/components/code-viewer'
import { RAGStatus, StreamlitRAGStatusBadge } from '@/components/rag-status'
import { GenerationStatus, type GenerationState } from '@/components/generation-status'
import { OutputModeSelector, type OutputMode } from '@/components/output-mode-selector'
import { PythonCodeViewer } from '@/components/python-code-viewer'
import { PythonPreview } from '@/components/python-preview'
import {
  type LLMConfig,
  DEFAULT_CONFIGS,
  getDefaultModel,
} from '@/lib/llm-client'
import { createRAGEngine, type RAGEngine, getIndexedCount, type RAGIndexProgress } from '@/lib/rag-engine'
import {
  createStreamlitRAGEngine,
  type StreamlitRAGEngine,
  type StreamlitRAGProgress,
} from '@/lib/streamlit-rag-engine'
import {
  createExamplesRAGEngine,
  type ExamplesRAGEngine,
} from '@/lib/streamlit-examples-rag-engine'
import {
  generateDashboard,
  generatePlan,
  amendPlan,
  createPreviewHtml,
  type GeneratedCode,
} from '@/lib/code-generator'
import {
  generateStreamlit,
  generatePythonPlan,
  amendPythonPlan,
  type GeneratedPythonCode,
} from '@/lib/python-generator'
import { LayoutDashboard, Eye, Pencil } from 'lucide-react'
import { GrapesJsEditor } from '@/components/grapesjs-editor'

export default function DashboardGenerator() {
  // ─── LLM Configuration ────────────────────────────────────────────────────
  const [llmConfig, setLLMConfig] = useState<LLMConfig>({
    ...DEFAULT_CONFIGS.ollama,
    model: getDefaultModel('ollama'),
  })

  // ─── Output Mode ──────────────────────────────────────────────────────────
  const [outputMode, setOutputMode] = useState<OutputMode>('html')

  // ─── RAG Engine (AdminLTE — HTML mode) ───────────────────────────────────────
  const [ragEngine, setRagEngine] = useState<RAGEngine | null>(null)
  const [ragStatus, setRagStatus] = useState<RAGIndexProgress>({
    status: 'loading',
    progress: 0,
    message: 'Initializing...',
  })
  const [indexedCount, setIndexedCount] = useState(0)

  // ─── Streamlit RAG Engine (Python mode) ──────────────────────────────────────
  const [streamlitRagEngine, setStreamlitRagEngine] = useState<StreamlitRAGEngine | null>(null)
  const [streamlitRagStatus, setStreamlitRagStatus] = useState<StreamlitRAGProgress>({
    status: 'idle',
    progress: 0,
    message: 'Not started',
  })

  // ─── Streamlit Examples RAG Engine (few-shot boilerplate) ─────────────────────
  const [examplesEngine, setExamplesEngine] = useState<ExamplesRAGEngine | null>(null)

  // ─── Generation State (shared between HTML and Python modes) ──────────────
  const [generationState, setGenerationState] = useState<GenerationState>('idle')
  const [generationError, setGenerationError] = useState<string>('')
  const [streamingContent, setStreamingContent] = useState<string>('')
  const [currentPrompt, setCurrentPrompt] = useState<string>('')
  const [generationTimeMs, setGenerationTimeMs] = useState<number | undefined>(undefined)
  const [validationIssues, setValidationIssues] = useState<string[]>([])
  const [validationPass, setValidationPass] = useState<number>(1)
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null)

  // ─── HTML-mode state ──────────────────────────────────────────────────────
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null)

  // ─── Python-mode state ────────────────────────────────────────────────────
  const [generatedPythonCode, setGeneratedPythonCode] = useState<GeneratedPythonCode | null>(null)

  // ─── Editor State (HTML only) ─────────────────────────────────────────────
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editableCode, setEditableCode] = useState<GeneratedCode | null>(null)

  // ─── Plan State ───────────────────────────────────────────────────────────
  const [plan, setPlan] = useState<string>('')
  const [planState, setPlanState] = useState<'idle' | 'planning' | 'ready'>('idle')
  const [isPlanLoading, setIsPlanLoading] = useState(false)

  // ─── Cancellation ─────────────────────────────────────────────────────────
  const abortControllerRef = useRef<AbortController | null>(null)

  // ─── Initialize RAG Engine (AdminLTE) ────────────────────────────────────
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

  // ─── Initialize Streamlit RAG Engine ────────────────────────────────────────
  useEffect(() => {
    const initStreamlitRAG = async () => {
      try {
        const engine = await createStreamlitRAGEngine((progress) => {
          setStreamlitRagStatus(progress)
        })
        await engine.index()
        setStreamlitRagEngine(engine)
      } catch (error) {
        setStreamlitRagStatus({
          status: 'error',
          message: error instanceof Error ? error.message : 'Failed to fetch Streamlit docs',
        })
      }
    }
    initStreamlitRAG()
  }, [])

  // ─── Initialize Streamlit Examples RAG Engine ────────────────────────────────
  useEffect(() => {
    const initExamples = async () => {
      try {
        const engine = await createExamplesRAGEngine()
        await engine.index()
        setExamplesEngine(engine)
      } catch {
        // Non-fatal: generator still works without few-shot examples
        console.warn('Failed to load Streamlit examples RAG engine')
      }
    }
    initExamples()
  }, [])

  // ─── Reset output when mode changes ──────────────────────────────────────
  const handleModeChange = useCallback((mode: OutputMode) => {
    // Cancel any in-flight generation
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setOutputMode(mode)
    setGenerationState('idle')
    setGenerationError('')
    setStreamingContent('')
    setPlan('')
    setPlanState('idle')
    setIsPlanLoading(false)
  }, [])

  // ─── Plan generation ──────────────────────────────────────────────────────
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
      if (outputMode === 'python') {
        await generatePythonPlan(prompt, llmConfig, streamlitRagEngine, planCallbacks, controller.signal, examplesEngine)
      } else {
        await generatePlan(prompt, llmConfig, ragEngine!, planCallbacks, controller.signal)
      }
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
  }, [ragEngine, streamlitRagEngine, examplesEngine, llmConfig, outputMode])

  const handleReplan = useCallback(async (prompt: string, currentPlan: string) => {
    if (!ragEngine) return

    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setPlan('')
    setPlanState('planning')
    setIsPlanLoading(true)
    setGenerationError('')

    const constraint = outputMode === 'python'
      ? 'Streamlit constraints'
      : 'AdminLTE 3 + Bootstrap 4 constraints'

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
      if (outputMode === 'python') {
        await generatePythonPlan(replanPrompt, llmConfig, streamlitRagEngine, replanCallbacks, controller.signal, examplesEngine)
      } else {
        await generatePlan(replanPrompt, llmConfig, ragEngine!, replanCallbacks, controller.signal)
      }
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
  }, [ragEngine, streamlitRagEngine, examplesEngine, llmConfig, outputMode])

  // ─── Plan amendment ───────────────────────────────────────────────────────
  const handleAmendPlan = useCallback(async (instruction: string, currentPlan: string) => {
    if (!ragEngine) return

    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setPlan('')
    setPlanState('planning')
    setIsPlanLoading(true)
    setGenerationError('')

    const amendCallbacks = {
      onToken: (token: string) => {
        if (controller.signal.aborted) return
        setPlan((prev) => prev + token)
      },
      onComplete: (updatedPlan: string) => {
        if (controller.signal.aborted) return
        setPlan(updatedPlan)
        setPlanState('ready')
        setIsPlanLoading(false)
      },
      onError: (error: Error) => {
        if (controller.signal.aborted) return
        setGenerationError(error.message)
        setPlanState('ready')
        setPlan(currentPlan)
        setIsPlanLoading(false)
      },
    }

    try {
      if (outputMode === 'python') {
        await amendPythonPlan(instruction, currentPlan, llmConfig, amendCallbacks, controller.signal)
      } else {
        await amendPlan(instruction, currentPlan, llmConfig, amendCallbacks, controller.signal)
      }
    } catch (error) {
      if (controller.signal.aborted) return
      setGenerationError(error instanceof Error ? error.message : 'Plan amendment failed')
      setPlanState('ready')
      setPlan(currentPlan)
      setIsPlanLoading(false)
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
    }
  }, [ragEngine, streamlitRagEngine, examplesEngine, llmConfig, outputMode])
  // ─── Main generation ──────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (prompt: string) => {
    if (!ragEngine) {
      setGenerationError('RAG engine not ready. Please wait.')
      setGenerationState('error')
      return
    }

    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setGenerationState('searching')
    setGenerationError('')
    setStreamingContent('')
    setGeneratedCode(null)
    setGeneratedPythonCode(null)
    setCurrentPrompt(prompt)
    setGenerationTimeMs(undefined)

    const startTime = Date.now()
    setGenerationStartTime(startTime)

    await new Promise(resolve => setTimeout(resolve, 500))
    if (controller.signal.aborted) {
      setGenerationState('cancelled')
      return
    }
    setGenerationState('generating')

    const effectivePrompt = plan.trim()
      ? `${prompt.trim()}\n\n<implementation_plan>\n${plan.trim()}\n</implementation_plan>`
      : prompt

    try {
      if (outputMode === 'python') {
        await generateStreamlit(
          effectivePrompt,
          llmConfig,
          streamlitRagEngine,
          {
            onToken: (token) => {
              if (controller.signal.aborted) return
              flushSync(() => { setStreamingContent((prev) => prev + token) })
            },
            onRefinementStart: () => {
              if (controller.signal.aborted) return
              setGenerationState('refining')
            },
            onValidationIssues: (issues, pass) => {
              if (controller.signal.aborted) return
              setValidationIssues(issues)
              setValidationPass(pass)
            },
            onComplete: (code) => {
              if (controller.signal.aborted) return
              const endTime = Date.now()
              setGenerationTimeMs(endTime - startTime)
              setGeneratedPythonCode(code)
              setGenerationState('complete')
            },
            onError: (error) => {
              if (controller.signal.aborted) return
              setGenerationError(error.message)
              setGenerationState('error')
            },
          },
          controller.signal,
          examplesEngine,
        )
      } else {
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
      }
    } catch (error) {
      if (controller.signal.aborted) return
      setGenerationError(error instanceof Error ? error.message : 'Generation failed')
      setGenerationState('error')
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
    }
  }, [ragEngine, streamlitRagEngine, examplesEngine, llmConfig, plan, outputMode])

  // ─── Cancel ───────────────────────────────────────────────────────────────
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

  // Abort on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  // ─── Editor callbacks (HTML only) ─────────────────────────────────────────
  const isGenerating =
    generationState === 'searching' ||
    generationState === 'generating' ||
    generationState === 'refining'

  const previewHtml = generatedCode ? createPreviewHtml(generatedCode) : ''

  const handleOpenEditor = useCallback(() => {
    if (generatedCode) {
      setEditableCode({ ...generatedCode })
      setIsEditorOpen(true)
    }
  }, [generatedCode])

  const handleEditorSave = useCallback((updatedCode: GeneratedCode) => {
    setGeneratedCode(updatedCode)
    setEditableCode(updatedCode)
    setIsEditorOpen(false)
  }, [])

  const handleEditorClose = useCallback(() => {
    setIsEditorOpen(false)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-y-2">
            <div className="flex items-center gap-3">
              <LayoutDashboard className="h-8 w-8 text-primary shrink-0" />
              <div>
                <h1 className="text-xl font-semibold">Interface Generator</h1>
                <p className="hidden sm:block text-sm text-muted-foreground">Generate dashboards/interfaces using LLMs</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {outputMode === 'html' ? (
                <RAGStatus status={ragStatus} indexedCount={indexedCount} />
              ) : (
                <StreamlitRAGStatusBadge status={streamlitRagStatus} />
              )}
              <LLMSettings config={llmConfig} onConfigChange={setLLMConfig} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 md:px-4 py-4 md:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Left Panel - Input */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader className="pb-1">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-lg">Describe The Interface</CardTitle>
                  <OutputModeSelector
                    value={outputMode}
                    onChange={handleModeChange}
                    disabled={isGenerating || isPlanLoading}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <PromptInput
                  onSubmit={handleSubmit}
                  onPlan={handlePlan}
                  onReplan={handleReplan}
                  onAmendPlan={handleAmendPlan}
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

            <GenerationStatus
              state={generationState}
              error={generationError}
              generationTimeMs={generationTimeMs}
              validationIssues={validationIssues}
              validationPass={validationPass}
            />

          {/* Code Viewer — responsive height so it scrolls instead of stretching the page */}
          <Card className="overflow-hidden h-75 md:h-100 lg:h-120">
            <CardContent className="p-0 h-full flex flex-col">
              {outputMode === 'python' ? (
                <PythonCodeViewer
                  code={generatedPythonCode}
                  streamingContent={streamingContent}
                  isStreaming={generationState === 'generating'}
                  userPrompt={currentPrompt}
                  generationTimeMs={generationTimeMs}
                  llmConfig={llmConfig}
                  onCodeEdited={(updated) => setGeneratedPythonCode(updated)}
                />
              ) : (
                <CodeViewer
                  code={generatedCode}
                  streamingContent={streamingContent}
                  isStreaming={generationState === 'generating'}
                  userPrompt={currentPrompt}
                  generationTimeMs={generationTimeMs}
                />
              )}
            </CardContent>
          </Card>
          </div>

          {/* Right Panel - Preview */}
          <Card className="overflow-hidden h-110 md:h-140 lg:h-175">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Preview
                </CardTitle>
                <div className="flex items-center gap-2">
                  {outputMode === 'html' && generatedCode && (
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
              {outputMode === 'python' ? (
                <PythonPreview
                  code={generatedPythonCode}
                  className="h-full"
                />
              ) : (
                <CodePreview html={previewHtml} className="h-full" />
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Visual Editor Modal (HTML only) */}
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
