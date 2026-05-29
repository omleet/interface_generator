'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Check,
  Copy,
  Download,
  FileCode2,
  FileText,
  MessageSquare,
  X,
  Send,
  StopCircle,
  RotateCcw,
  ChevronLeft,
} from 'lucide-react'
import type { GeneratedPythonCode } from '@/lib/python-generator'
import { exportPythonAsZip, copyToClipboard, downloadPythonFile } from '@/lib/python-file-exporter'
import type { LLMConfig } from '@/lib/llm-client'
import { editPythonCode, type ChatMessage } from '@/lib/python-code-editor'

// ─── Props ────────────────────────────────────────────────────────────────────

interface PythonCodeViewerProps {
  code: GeneratedPythonCode | null
  streamingContent?: string
  isStreaming?: boolean
  userPrompt?: string
  generationTimeMs?: number
  /** LLM config forwarded from the parent so the editor can call the same LLM */
  llmConfig?: LLMConfig
  /** Called when the user confirms an edited version, so the parent can update its state */
  onCodeEdited?: (updated: GeneratedPythonCode) => void
}

// ─── Chat bubble ──────────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: ChatMessage & { isStreaming?: boolean } }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap wrap-break-word ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm font-mono'
        }`}
      >
        {msg.content}
        {msg.isStreaming && (
          <span
            className="inline-block w-1.5 h-3 bg-current opacity-70 animate-pulse ml-0.5 align-middle"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PythonCodeViewer({
  code,
  streamingContent,
  isStreaming,
  userPrompt,
  generationTimeMs,
  llmConfig,
  onCodeEdited,
}: PythonCodeViewerProps) {
  // ── Viewer state ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'python' | 'requirements'>('python')
  const [copiedTab, setCopiedTab] = useState<string | null>(null)
  const scrollRef = useRef<HTMLPreElement>(null)

  // ── Edit-chat state ───────────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  /** The code that the edit session is modifying (starts from code.python) */
  const [editingCode, setEditingCode] = useState<string>('')
  /** Streamed tokens from the LLM while editing */
  const [editStreaming, setEditStreaming] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [editError, setEditError] = useState<string>('')
  const [instruction, setInstruction] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Auto-scroll during generation ─────────────────────────────────────────
  useEffect(() => {
    if (isStreaming && scrollRef.current) {
      const scrollArea = scrollRef.current.closest('[data-radix-scroll-area-viewport]')
      if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight
    }
  }, [streamingContent, isStreaming])

  // Auto-scroll chat to bottom whenever a new message appears or tokens stream
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, editStreaming])

  // Focus textarea when edit mode opens
  useEffect(() => {
    if (editMode) {
      setTimeout(() => textareaRef.current?.focus(), 80)
    }
  }, [editMode])

  // ── Copy / download helpers ────────────────────────────────────────────────
  const handleCopy = async (content: string, tab: string) => {
    await copyToClipboard(content)
    setCopiedTab(tab)
    setTimeout(() => setCopiedTab(null), 2000)
  }

  const handleDownloadPython = () => {
    const src = editMode ? editingCode : code?.python
    if (src) downloadPythonFile(src)
  }

  const handleExportZip = async () => {
    if (!code) return
    const exportable: GeneratedPythonCode = editMode
      ? { ...code, python: editingCode }
      : code
    await exportPythonAsZip(exportable, {
      userPrompt: userPrompt || 'Streamlit generation',
      generationTimeMs,
    })
  }

  // ── Edit-mode helpers ──────────────────────────────────────────────────────
  const openEditMode = useCallback(() => {
    if (!code?.python) return
    setEditingCode(code.python)
    setChatHistory([])
    setEditStreaming('')
    setEditError('')
    setInstruction('')
    setEditMode(true)
  }, [code])

  const closeEditMode = useCallback(() => {
    abortRef.current?.abort()
    setEditMode(false)
  }, [])

  const handleSendInstruction = useCallback(async () => {
    const trimmed = instruction.trim()
    if (!trimmed || !llmConfig || isEditing) return

    setEditError('')
    const userMsg: ChatMessage = { role: 'user', content: trimmed }
    setChatHistory((prev) => [...prev, userMsg])
    setInstruction('')
    setEditStreaming('')
    setIsEditing(true)

    const controller = new AbortController()
    abortRef.current = controller

    let accumulated = ''

    try {
      await editPythonCode(
        editingCode,
        chatHistory,
        trimmed,
        llmConfig,
        {
          onToken: (token) => {
            accumulated += token
            setEditStreaming(accumulated)
          },
          onComplete: (updatedCode) => {
            setEditStreaming('')
            setEditingCode(updatedCode)
            const assistantMsg: ChatMessage = {
              role: 'assistant',
              content: '✓ Code updated. You can continue asking for changes, or close the editor to apply.',
            }
            setChatHistory((prev) => [...prev, assistantMsg])
            setIsEditing(false)
            // Propagate to parent
            if (onCodeEdited && code) {
              onCodeEdited({ ...code, python: updatedCode })
            }
          },
          onError: (error) => {
            setEditStreaming('')
            setEditError(error.message)
            setIsEditing(false)
          },
        },
        controller.signal,
      )
    } catch {
      setEditStreaming('')
      setIsEditing(false)
    }
  }, [instruction, llmConfig, isEditing, editingCode, chatHistory, onCodeEdited, code])

  const handleCancelEdit = useCallback(() => {
    abortRef.current?.abort()
    setEditStreaming('')
    setIsEditing(false)
  }, [])

  const handleResetEdits = useCallback(() => {
    if (!code?.python) return
    abortRef.current?.abort()
    setEditingCode(code.python)
    setChatHistory([])
    setEditStreaming('')
    setEditError('')
    setIsEditing(false)
  }, [code])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendInstruction()
    }
  }

  // ── Derived display content ────────────────────────────────────────────────
  const displayContent = isStreaming ? (streamingContent ?? '') : (code?.python ?? '')
  const viewerCode = editMode ? editingCode : displayContent

  const tabContent =
    activeTab === 'requirements' && code ? code.requirements : viewerCode

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!displayContent && !isStreaming) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
        <FileCode2 className="h-12 w-12 opacity-50" />
        <p className="text-sm">Generated Python code will appear here</p>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b px-4 py-2 gap-2 flex-wrap">
        {/* Tab pills — always visible; in edit mode shows which code you're viewing */}
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
            {editMode ? 'main.py (editing)' : 'main.py'}
          </button>
          {code && !editMode && (
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
        <div className="flex gap-2 flex-wrap">
          {/* Edit mode toggle — only shown when code is ready and llmConfig is available */}
          {code?.python && !isStreaming && llmConfig && (
            editMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetEdits}
                  disabled={isEditing}
                  className="h-8 text-muted-foreground"
                  title="Reset all edits to the original generated code"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Reset
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeEditMode}
                  className="h-8"
                  title="Close the edit panel"
                >
                  <ChevronLeft className="mr-1.5 h-3.5 w-3.5" />
                  Done
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={openEditMode}
                className="h-8"
                title="Open chat to request code changes"
              >
                <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            )
          )}

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
            disabled={(!code?.python && !editingCode) || isStreaming}
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

      {/* ── Body: split when editMode is active ─────────────────────────── */}
      <div className={`flex flex-1 min-h-0 ${editMode ? 'flex-row' : 'flex-col'}`}>

        {/* Code area */}
        <ScrollArea className={`${editMode ? 'w-1/2 border-r' : 'flex-1'} min-h-0`}>
          <pre
            ref={scrollRef}
            className="text-xs leading-relaxed p-4 font-mono whitespace-pre overflow-x-auto text-foreground min-w-0"
          >
            {editMode
              /* In edit mode always show the current editing code (or streaming tokens) */
              ? (editStreaming || editingCode)
              /* Normal mode */
              : isStreaming && activeTab === 'python'
                ? (streamingContent ?? '')
                : tabContent}
            {isStreaming && activeTab === 'python' && !editMode && (
              <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" aria-hidden="true" />
            )}
            {editMode && isEditing && !editStreaming && (
              <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" aria-hidden="true" />
            )}
          </pre>
        </ScrollArea>

        {/* ── Chat panel (only in edit mode) ────────────────────────────── */}
        {editMode && (
          <div className="w-1/2 flex flex-col min-h-0">
            {/* Chat header */}
            <div className="px-3 py-2 border-b bg-muted/30 flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                Ask for changes
              </span>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 min-h-0 px-3 py-2">
              {chatHistory.length === 0 && !isEditing && (
                <p className="text-xs text-muted-foreground text-center mt-4 leading-relaxed px-2">
                  Describe what you want to change in the code.<br />
                  <span className="opacity-60">e.g. "Fix a code-related error" or "Add a sidebar filter for year" or "Use a bar chart instead of a line chart"</span>
                </p>
              )}
              {chatHistory.map((msg, i) => (
                <ChatBubble key={i} msg={msg} />
              ))}
              {isEditing && editStreaming && (
                <ChatBubble
                  msg={{ role: 'assistant', content: '⟳ Updating code…', isStreaming: true } as ChatMessage & { isStreaming: boolean }}
                />
              )}
              {isEditing && !editStreaming && (
                <ChatBubble
                  msg={{ role: 'assistant', content: '⟳ Thinking…', isStreaming: true } as ChatMessage & { isStreaming: boolean }}
                />
              )}
              {editError && (
                <div className="mt-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                  {editError}
                </div>
              )}
              <div ref={chatBottomRef} />
            </ScrollArea>

            {/* Input area */}
            <div className="border-t p-2 flex gap-2 items-end bg-background">
              <textarea
                ref={textareaRef}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isEditing}
                placeholder="Describe the change… (Enter to send, Shift+Enter for newline)"
                rows={2}
                className="flex-1 resize rounded-md border bg-muted/40 px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
              {isEditing ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="h-8 shrink-0"
                  title="Cancel"
                >
                  <StopCircle className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleSendInstruction}
                  disabled={!instruction.trim() || !llmConfig}
                  className="h-8 shrink-0"
                  title="Send (Enter)"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      {code && !isStreaming && (
        <div className="border-t px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span>{(editMode ? editingCode : code.python).split('\n').length} lines</span>
          {editMode && editingCode !== code.python && (
            <span className="text-amber-500 font-medium">● edited</span>
          )}
          {generationTimeMs && !editMode && (
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
