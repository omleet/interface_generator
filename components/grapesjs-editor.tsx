'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import grapesjs, { type Editor } from 'grapesjs'
import 'grapesjs/dist/css/grapes.min.css'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  X,
  Save,
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  Send,
  Loader2,
  Sparkles,
  Bot,
  User,
  CheckCircle2,
  AlertCircle,
  Blocks,
  Layers,
  Palette,
  Settings2,
  Eye,
  Edit,
  XCircle,
  ExternalLink,
} from 'lucide-react'

import {
  DEFAULT_CONFIGS,
  getDefaultModel,
  type LLMConfig,
} from '@/lib/llm-client'
import { type GeneratedCode } from '@/lib/code-generator'
import { ADMINLTE_BLOCKS, ADMINLTE_CATEGORIES } from '@/lib/grapesjs-blocks'
import { askAI, askAIForFragment } from '@/lib/visual-editor-ai'

// ─── Types ─────────────────────────────────────────────────────────────────

interface GrapesJsEditorProps {
  code: GeneratedCode
  onSave: (code: GeneratedCode) => void
  onClose: () => void
  llmConfig?: LLMConfig
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  status?: 'success' | 'error'
  details?: string[]
}

type LeftPanel = 'blocks' | 'layers'
type RightPanel = 'styles' | 'traits'
type DeviceName = 'Desktop' | 'Tablet' | 'Mobile'

// ─── Helper: sanitise the HTML before handing it to GrapesJS ──────────────
// GrapesJS' drop-detection (DropLocationDeterminer.getChildrenDim) iterates
// over childNodes and calls .matches() on them. HTML comments, <script> tags
// and stray text nodes at the wrapper level cause the dreaded
// "TypeError: Illegal invocation" because .matches() is called on a non-
// Element node. We strip those before passing content to the editor. The
// originals are preserved separately and re-injected on save.

function sanitiseCanvasHtml(html: string): string {
  if (!html) return ''
  try {
    const doc = new DOMParser().parseFromString(`<div id="__root__">${html}</div>`, 'text/html')
    const root = doc.getElementById('__root__')
    if (!root) return html
    // Strip <script> tags — they're loaded globally via canvas.scripts
    root.querySelectorAll('script, noscript').forEach((el) => el.remove())
    // Strip HTML comments (TreeWalker, since they're not queryable)
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_COMMENT)
    const comments: ChildNode[] = []
    let current = walker.nextNode()
    while (current) {
      comments.push(current as ChildNode)
      current = walker.nextNode()
    }
    comments.forEach((c) => c.parentNode?.removeChild(c))
    return root.innerHTML
  } catch {
    return html
  }
}

// ─── Helper: rebuild the full HTML document after edits ────────────────────
// GrapesJS gives us the body inner HTML + the stylesheet. We need to merge
// these into a complete AdminLTE document so the preview / download still
// has all CDN links and scripts.

function rebuildFullHtml(originalFullHtml: string, bodyHtml: string, css: string): string {
  try {
    const doc = new DOMParser().parseFromString(originalFullHtml, 'text/html')
    const body = doc.body
    if (body) {
      // Preserve original scripts from the body. GrapesJS' getHtml() strips
      // <script> tags because it treats them as non-renderable.
      const scripts = Array.from(body.querySelectorAll('script'))
        .map((s) => s.outerHTML)
        .join('\n')
      body.innerHTML = bodyHtml + '\n' + scripts
    }

    // Update or inject our custom stylesheet
    const head = doc.head
    if (head) {
      let styleEl = head.querySelector('style[data-grapesjs]')
      if (!styleEl) {
        styleEl = doc.createElement('style')
        styleEl.setAttribute('data-grapesjs', 'true')
        head.appendChild(styleEl)
      }
      styleEl.textContent = css
    }

    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
  } catch {
    // Fall back to minimal wrapping if parsing fails
    return originalFullHtml
  }
}

// ─── Component ─────────────────────────────────────────────────────────────

export function GrapesJsEditor({ code, onSave, onClose, llmConfig }: GrapesJsEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const blocksRef = useRef<HTMLDivElement>(null)
  const layersRef = useRef<HTMLDivElement>(null)
  const stylesRef = useRef<HTMLDivElement>(null)
  const traitsRef = useRef<HTMLDivElement>(null)
  const selectorsRef = useRef<HTMLDivElement>(null)

  const editorRef = useRef<Editor | null>(null)
  const originalFullHtmlRef = useRef<string>(code.fullHtml)

  const [isReady, setIsReady] = useState(false)
  const [leftPanel, setLeftPanel] = useState<LeftPanel>('blocks')
  const [rightPanel, setRightPanel] = useState<RightPanel>('styles')
  const [device, setDevice] = useState<DeviceName>('Desktop')
  const [hasSelection, setHasSelection] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [isPreview, setIsPreview] = useState(false)

  // AI panel
  const [aiOpen, setAiOpen] = useState(true)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  const effectiveLLMConfig: LLMConfig =
    llmConfig || { ...DEFAULT_CONFIGS.ollama, model: getDefaultModel('ollama') }

  // ── Initialise GrapesJS ─────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current || !blocksRef.current) return
    if (editorRef.current) return // guard against React strict-mode double-mount

    const editor = grapesjs.init({
      container: canvasRef.current,
      height: '100%',
      width: 'auto',
      fromElement: false,
      storageManager: false,
      // We build our own top/side UI — GrapesJS default panels are hidden
      panels: { defaults: [] },
      // Load AdminLTE, Bootstrap and Font Awesome INSIDE the canvas iframe
      // so our blocks render identically to the real dashboard.
      canvas: {
        styles: [
          'https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/css/bootstrap.min.css',
          'https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/css/adminlte.min.css',
          'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
        ],
        scripts: [
          'https://code.jquery.com/jquery-3.6.0.min.js',
          'https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/js/bootstrap.bundle.min.js',
          'https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/js/adminlte.min.js',
          'https://cdn.jsdelivr.net/npm/chart.js',
        ],
      },
      blockManager: {
        appendTo: blocksRef.current,
        blocks: ADMINLTE_BLOCKS.map((b) => ({
          id: b.id,
          label: b.label,
          category: b.category,
          content: b.content,
          // Let GrapesJS sort categories in the order we want
          attributes: { 'data-category-order': String(ADMINLTE_CATEGORIES.indexOf(b.category)) },
        })),
      },
      layerManager: { appendTo: layersRef.current ?? undefined },
      styleManager: {
        appendTo: stylesRef.current ?? undefined,
        sectors: [
          {
            name: 'General',
            open: true,
            properties: ['display', 'position', 'float'],
          },
          {
            name: 'Dimension',
            open: true,
            properties: ['width', 'height', 'max-width', 'min-height', 'margin', 'padding'],
          },
          {
            name: 'Typography',
            open: false,
            properties: [
              'font-family',
              'font-size',
              'font-weight',
              'letter-spacing',
              'color',
              'line-height',
              'text-align',
              'text-shadow',
            ],
          },
          {
            name: 'Decorations',
            open: false,
            properties: [
              'background-color',
              'border-radius',
              'border',
              'box-shadow',
              'background',
            ],
          },
          {
            name: 'Extra',
            open: false,
            properties: ['opacity', 'transition', 'transform'],
          },
        ],
      },
      selectorManager: { appendTo: selectorsRef.current ?? undefined },
      traitManager: { appendTo: traitsRef.current ?? undefined },
      deviceManager: {
        devices: [
          { id: 'Desktop', name: 'Desktop', width: '' },
          { id: 'Tablet', name: 'Tablet', width: '768px', widthMedia: '992px' },
          { id: 'Mobile', name: 'Mobile', width: '375px', widthMedia: '575px' },
        ],
      },
      // Load the initial dashboard content (stripped of scripts + comments
      // so the drop-location detector doesn't crash on non-Element nodes).
      components: sanitiseCanvasHtml(code.html),
      style: code.css,
    })

    editorRef.current = editor

    // ── Register generic traits so the Settings panel is never empty ───
    // Every element gains ID, class and title editors. Inputs/links/images
    // gain their specific traits in addition.
    const dc = editor.DomComponents
    const defaultType = dc.getType('default')
    if (defaultType) {
      defaultType.model.prototype.defaults.traits = [
        { type: 'text', name: 'id', label: 'ID' },
        { type: 'text', name: 'title', label: 'Tooltip' },
        { type: 'text', name: 'class', label: 'CSS classes' },
      ]
    }

    // Track selection to enable "selected-element mode" in the AI
    editor.on('component:selected', () => setHasSelection(!!editor.getSelected()))
    editor.on('component:deselected', () => setHasSelection(!!editor.getSelected()))

    // Swallow the "Illegal invocation" that some AdminLTE fragments still
    // manage to trigger (e.g. SVG icons with non-standard prototypes).
    // GrapesJS recovers fine from the exception; we just don't want it
    // bubbling to the overlay.
    const origErrorHandler = window.onerror
    window.onerror = (msg, src, line, col, err) => {
      if (typeof msg === 'string' && msg.includes('Illegal invocation')) {
        console.warn('[visual-editor] Suppressed drop-detector error:', msg)
        return true
      }
      return origErrorHandler ? origErrorHandler(msg, src, line, col, err) : false
    }

    // Track undo/redo availability
    const updateUndoRedo = () => {
      const um = editor.UndoManager
      setCanUndo(um.hasUndo())
      setCanRedo(um.hasRedo())
    }
    editor.on('undo redo component:update component:add component:remove', updateUndoRedo)

    editor.on('load', () => {
      setIsReady(true)
      updateUndoRedo()
    })

    return () => {
      window.onerror = origErrorHandler
      editor.destroy()
      editorRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Device switcher ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady) return
    editorRef.current?.setDevice(device)
  }, [device, isReady])

  // ── Preview toggle — GrapesJS built-in command ──────────────────────────
  useEffect(() => {
    if (!isReady) return
    const editor = editorRef.current
    if (!editor) return
    if (isPreview) editor.runCommand('preview')
    else editor.stopCommand('preview')
  }, [isPreview, isReady])

  // ── Auto-scroll chat ────────────────────────────────────────────────────
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages, isAiLoading])

  // ── Actions ─────────────────────────────────────────────────────────────

  const handleUndo = useCallback(() => {
    editorRef.current?.UndoManager.undo()
  }, [])

  const handleRedo = useCallback(() => {
    editorRef.current?.UndoManager.redo()
  }, [])

  const handleSave = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    const bodyHtml = editor.getHtml()
    const css = editor.getCss() || ''
    const newFullHtml = rebuildFullHtml(originalFullHtmlRef.current, bodyHtml, css)
    onSave({
      ...code,
      html: bodyHtml,
      css: code.css + (code.css && css ? '\n' : '') + css,
      fullHtml: newFullHtml,
    })
  }, [code, onSave])

  // Open the current dashboard in a new browser tab as a fully-rendered
  // standalone page (all CDNs + scripts included). We write it as a blob URL
  // so the preview honours every relative asset and runs inline scripts.
  const handleOpenInNewTab = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    const bodyHtml = editor.getHtml()
    const css = editor.getCss() || ''
    const fullHtml = rebuildFullHtml(originalFullHtmlRef.current, bodyHtml, css)
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank', 'noopener,noreferrer')
    // Revoke after the new tab has had time to load.
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    if (!win) {
      // Popup blocked — fall back to alerting the user.
      // eslint-disable-next-line no-alert
      alert('Please allow pop-ups to open the preview in a new tab.')
    }
  }, [])

  // ── AI: selected-fragment mode ──────────────────────────────────────────
  const handleFragmentEdit = useCallback(
    async (userMessage: string) => {
      const editor = editorRef.current
      if (!editor) return
      const selected = editor.getSelected()
      if (!selected) return

      const fragmentHtml = selected.toHTML()
      const result = await askAIForFragment(userMessage, fragmentHtml, effectiveLLMConfig)

      if (!result.success) {
        setChatMessages((m) => [
          ...m,
          { role: 'assistant', content: result.error || 'Edit failed.', status: 'error' },
        ])
        return
      }

      // Replace the selected component with the new HTML.
      // GrapesJS will parse the HTML string into components automatically.
      selected.replaceWith(result.html)

      setChatMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: 'Updated the selected element.',
          status: 'success',
        },
      ])
    },
    [effectiveLLMConfig],
  )

  // ── AI: full-page ops mode ──────────────────────────────────────────────
  const handleFullPageEdit = useCallback(
    async (userMessage: string) => {
      const editor = editorRef.current
      if (!editor) return

      // Wrap the body HTML in a proper document so our inventory builder works
      // (it expects <html><body>...<body></html>)
      const bodyHtml = editor.getHtml()
      const wrappedHtml = `<!DOCTYPE html><html><body>${bodyHtml}</body></html>`
      const result = await askAI(userMessage, wrappedHtml, effectiveLLMConfig)

      if (result.error && !result.success) {
        setChatMessages((m) => [
          ...m,
          {
            role: 'assistant',
            content: result.error || 'Edit failed.',
            status: 'error',
            details: result.failed.length ? result.failed : undefined,
          },
        ])
        return
      }

      // Extract the new body content and push it into GrapesJS
      const newDoc = new DOMParser().parseFromString(result.html, 'text/html')
      const newBodyHtml = newDoc.body?.innerHTML || bodyHtml

      // setComponents preserves undo history
      editor.setComponents(newBodyHtml)

      setChatMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content:
            result.summary.length > 0
              ? `Applied ${result.summary.length} change${result.summary.length > 1 ? 's' : ''}.`
              : 'Change applied.',
          status: 'success',
          details: result.summary.length ? result.summary : undefined,
        },
      ])

      if (result.failed.length) {
        setChatMessages((m) => [
          ...m,
          {
            role: 'assistant',
            content: `${result.failed.length} operation${result.failed.length > 1 ? 's' : ''} could not be applied.`,
            status: 'error',
            details: result.failed,
          },
        ])
      }
    },
    [effectiveLLMConfig],
  )

  const handleChatSubmit = useCallback(async () => {
    const userMessage = chatInput.trim()
    if (!userMessage || isAiLoading) return

    const editor = editorRef.current
    if (!editor) return

    setChatMessages((m) => [...m, { role: 'user', content: userMessage }])
    setChatInput('')
    setIsAiLoading(true)

    try {
      const hasSelected = !!editor.getSelected()
      if (hasSelected) {
        await handleFragmentEdit(userMessage)
      } else {
        await handleFullPageEdit(userMessage)
      }
    } catch (error) {
      setChatMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'unknown'}`,
          status: 'error',
        },
      ])
    } finally {
      setIsAiLoading(false)
    }
  }, [chatInput, isAiLoading, handleFragmentEdit, handleFullPageEdit])

  const handleClearSelection = useCallback(() => {
    // GrapesJS accepts null to deselect at runtime, even if its TS types are strict.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(editorRef.current as any)?.select(null)
  }, [])

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="grapesjs-shell fixed inset-0 z-50 flex flex-col bg-[#fafafa] text-gray-900" style={{ colorScheme: 'light' }}>
      {/* ── Top toolbar ──────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white text-gray-900 px-4 py-2 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Close
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-1">
            <h2 className="text-sm font-semibold">Visual Editor</h2>
            {isReady ? (
              <Badge variant="outline" className="text-[10px] h-5">
                <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" />
                Ready
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] h-5">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Loading
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Undo / Redo */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Device switcher */}
          <Button
            variant={device === 'Desktop' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setDevice('Desktop')}
            title="Desktop preview"
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            variant={device === 'Tablet' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setDevice('Tablet')}
            title="Tablet preview"
          >
            <Tablet className="h-4 w-4" />
          </Button>
          <Button
            variant={device === 'Mobile' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setDevice('Mobile')}
            title="Mobile preview"
          >
            <Smartphone className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Button
            variant={isPreview ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setIsPreview((p) => !p)}
            title="Toggle preview"
          >
            {isPreview ? <Edit className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            {isPreview ? 'Edit' : 'Preview'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenInNewTab}
            disabled={!isReady}
            title="Open full preview in a new tab"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Open in new tab
          </Button>

          <Button
            variant={aiOpen ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setAiOpen((v) => !v)}
            title="Toggle AI assistant"
          >
            <Sparkles className="h-4 w-4 mr-1" />
            AI Assistant
          </Button>

          {hasSelection && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              title="Clear selection"
               className="bg-red-50 text-red-600 transition-colors hover:bg-red-100"
            >
              <XCircle className="h-4 w-4 mr-1 " />
              Clear selection
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={!isReady}>
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>
      </header>

      {/* ── Main: 3-column layout ───────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar: Blocks / Layers */}
        <aside className="w-64 border-r border-gray-200 bg-white text-gray-900 flex flex-col shrink-0">
          <Tabs
            value={leftPanel}
            onValueChange={(v) => setLeftPanel(v as LeftPanel)}
            className="flex flex-col h-full"
          >
            <TabsList className="w-fit mx-auto mt-3">
  <div className="flex bg-gray-100 rounded-lg p-1 gap-1 shadow-sm">

    <TabsTrigger
      value="blocks"
      className="text-xs flex items-center justify-center gap-1 px-3 py-1.5 rounded-md whitespace-nowrap transition-all
                 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900
                 text-gray-600 hover:text-gray-900"
    >
      <Blocks className="h-3 w-3" />
      Blocks
    </TabsTrigger>

    <TabsTrigger
      value="layers"
      className="text-xs flex items-center justify-center gap-1 px-3 py-1.5 rounded-md whitespace-nowrap transition-all
                 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900
                 text-gray-600 hover:text-gray-900"
    >
      <Layers className="h-3 w-3" />
      Layers
    </TabsTrigger>

  </div>
</TabsList>

            {/* GrapesJS mounts its managers into these refs. Each panel is kept
                rendered at all times (hidden when inactive) so GrapesJS keeps
                its DOM handles valid. */}
            <TabsContent
              value="blocks"
              forceMount
              className="data-[state=inactive]:hidden flex-1 min-h-0 mt-0"
            >
              <ScrollArea className="h-full">
                <div ref={blocksRef} className="ve-blocks p-2" />
              </ScrollArea>
            </TabsContent>

            <TabsContent
              value="layers"
              forceMount
              className="data-[state=inactive]:hidden flex-1 min-h-0 mt-0"
            >
              <ScrollArea className="h-full">
                <div ref={layersRef} className="ve-layers p-2" />
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </aside>

        {/* Canvas */}
        <main className="flex-1 bg-gray-100 min-w-0 relative">
          <div ref={canvasRef} className="h-full" />
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-sm">Loading editor&hellip;</p>
              </div>
            </div>
          )}
        </main>

        {/* Right sidebar: Styles / Traits */}
        <aside className="w-72 border-l border-gray-200 bg-white text-gray-900 flex flex-col shrink-0">
          <Tabs
            value={rightPanel}
            onValueChange={(v) => setRightPanel(v as RightPanel)}
            className="flex flex-col h-full"
          >
            <TabsList className="w-fit mx-auto mt-3">
  <div className="flex bg-gray-100 rounded-lg p-1 gap-1 shadow-sm">

    <TabsTrigger
      value="styles"
      className="text-xs flex items-center justify-center gap-1 px-3 py-1.5 rounded-md whitespace-nowrap transition-all
                 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900
                 text-gray-600 hover:text-gray-900"
    >
      <Palette className="h-3 w-3" />
      Styles
    </TabsTrigger>

    <TabsTrigger
      value="traits"
      className="text-xs flex items-center justify-center gap-1 px-3 py-1.5 rounded-md whitespace-nowrap transition-all
                 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900
                 text-gray-600 hover:text-gray-900"
    >
      <Settings2 className="h-3 w-3" />
      Settings
    </TabsTrigger>

  </div>
</TabsList>

            <TabsContent
              value="styles"
              forceMount
              className="data-[state=inactive]:hidden flex-1 min-h-0 mt-0"
            >
              <ScrollArea className="h-full">
                <div className="p-2 space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Selector
                    </p>
                    <div ref={selectorsRef} className="ve-selectors" />
                  </div>
                  <Separator />
                  <div ref={stylesRef} className="ve-styles" />
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent
              value="traits"
              forceMount
              className="data-[state=inactive]:hidden flex-1 min-h-0 mt-0"
            >
              <ScrollArea className="h-full">
                {!hasSelection && (
                  <div className="flex flex-col items-center justify-center text-center p-6 gap-2 text-muted-foreground">
                    <Settings2 className="h-8 w-8 opacity-40" />
                    <p className="text-xs">Select an element on the canvas to edit its settings.</p>
                  </div>
                )}
                <div
                  ref={traitsRef}
                  className="ve-traits p-2"
                  style={{ display: hasSelection ? 'block' : 'none' }}
                />
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </aside>
      </div>

      {/* ── AI Assistant panel (bottom) ─────────────────────────────────── */}
      {aiOpen && (
        <section className="border-t border-gray-200 bg-white text-gray-900 shrink-0 flex flex-col h-[280px]">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              <span className="text-sm font-semibold">AI Assistant</span>
              {hasSelection ? (
                <Badge variant="secondary" className="text-[10px] h-5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" />
                  Editing selection
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] h-5">
                  Full-page mode
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasSelection && (
                <Button variant="ghost" size="sm" onClick={handleClearSelection} className="bg-red-50 text-red-600 transition-colors hover:bg-red-100">
                  Clear selection
                  
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setAiOpen(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center text-xs text-muted-foreground py-6 gap-2">
                <Bot className="h-5 w-5" />
                <p className="max-w-md leading-relaxed">
                  Ask the AI to add, modify or remove anything in your dashboard.
                  Select an element first to scope edits to it, or leave nothing
                  selected to act on the full page.
                </p>
                <div className="flex flex-wrap gap-1 justify-center mt-1">
                  {[
                    'Add a sales chart',
                    'Change title to Overview',
                    'Remove the alerts',
                    'Add a 4-card stats row',
                  ].map((ex) => (
                    <Button
                      key={ex}
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px]"
                      onClick={() => setChatInput(ex)}
                    >
                      {ex}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {chatMessages.map((msg, i) => (
                <ChatBubble key={i} msg={msg} />
              ))}
              {isAiLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Thinking&hellip;
                </div>
              )}
            </div>
          </div>

          <div className="border-t px-3 py-2">
            <div className="flex items-end gap-2">
              <Textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleChatSubmit()
                  }
                }}
                placeholder={
                  hasSelection
                    ? 'Describe the change to the selected element…'
                    : 'Describe a change to the page…'
                }
                rows={2}
                className="resize-none text-sm min-h-[44px]"
                disabled={isAiLoading || !isReady}
              />
              <Button
                size="sm"
                onClick={handleChatSubmit}
                disabled={!chatInput.trim() || isAiLoading || !isReady}
              >
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* GrapesJS theme overrides — force a light colour scheme inside the
          editor shell so it stays legible regardless of the host app theme. */}
      <style jsx global>{`
        /* ── Core GrapesJS palette overrides ──────────────────────
           GrapesJS ships with a dark palette by default (.gjs-one-bg,
           .gjs-two-color, etc. bound to CSS vars). We override the vars
           so every built-in panel uses our light theme. */
        .grapesjs-shell .gjs-editor,
        .grapesjs-shell .gjs-editor-cont,
        .grapesjs-shell .gjs-pn-panel,
        .grapesjs-shell .gjs-blocks-cs,
        .grapesjs-shell .gjs-layer-manager,
        .grapesjs-shell .gjs-sm-sectors,
        .grapesjs-shell .gjs-trt-traits,
        .grapesjs-shell .gjs-clm-tags {
          --gjs-primary-color: #fafafa;        /* panel backgrounds */
          --gjs-secondary-color: #1f2937;       /* main text */
          --gjs-tertiary-color: #e5e7eb;        /* borders / inactive */
          --gjs-quaternary-color: #2563eb;      /* accents / active */
          --gjs-color-hl: #2563eb;
          --gjs-color-warn: #d97706;
          --gjs-color-main: #1f2937;
          --gjs-main-color: #1f2937;
          --gjs-main-dark-color: #111827;
          --gjs-main-light-color: #f3f4f6;
        }
        .grapesjs-shell .gjs-one-bg { background-color: #fafafa !important; }
        .grapesjs-shell .gjs-two-color { color: #1f2937 !important; }
        .grapesjs-shell .gjs-three-bg { background-color: #2563eb !important; color: #fff !important; }
        .grapesjs-shell .gjs-four-color,
        .grapesjs-shell .gjs-four-color-h:hover { color: #2563eb !important; }

        /* Block manager */
        .ve-blocks .gjs-blocks-c { gap: 8px; padding: 4px; background: #ffffff; }
        .ve-blocks .gjs-block {
          width: calc(50% - 4px);
          min-height: 72px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          color: #1f2937;
          font-size: 11px;
          padding: 8px 6px;
          transition: all 0.15s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          box-shadow: none;
        }
        .ve-blocks .gjs-block:hover {
          background: #eff6ff;
          border-color: #93c5fd;
          box-shadow: 0 2px 6px -2px rgba(37, 99, 235, 0.25);
          transform: translateY(-1px);
        }
        .ve-blocks .gjs-block__media { color: #4b5563; }
        .ve-blocks .gjs-block__media svg { width: 22px; height: 22px; }
        .ve-blocks .gjs-block-label { font-size: 10px; line-height: 1.2; text-align: center; color: #1f2937; }
        .ve-blocks .gjs-block-category {
          background: transparent;
          border: none;
          border-bottom: 1px solid #e5e7eb;
          margin-bottom: 4px;
        }
        .ve-blocks .gjs-block-category .gjs-title {
          color: #6b7280;
          background: transparent;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 10px 4px 6px;
        }
        .ve-blocks .gjs-block-category .gjs-title .gjs-caret-icon { color: inherit; }

        /* ── Layer manager ────────────────────────────────────────── */
        .ve-layers, .ve-layers .gjs-layers { background: #ffffff; }
        .ve-layers .gjs-layer, .ve-layers .gjs-layer-item {
          color: #1f2937;
          font-size: 11px;
          background: transparent;
        }
        .ve-layers .gjs-layer-title { padding: 4px 6px; }
        .ve-layers .gjs-layer-title:hover { background: #f3f4f6; }
        .ve-layers .gjs-layer.gjs-selected > .gjs-layer-item {
          background: #dbeafe;
          color: #1e3a8a;
        }
        .ve-layers .gjs-layer-caret { color: #6b7280; }

        /* ── Style manager ────────────────────────────────────────── */
        .ve-styles, .ve-styles .gjs-sm-sectors,
        .ve-traits, .ve-traits .gjs-trt-traits,
        .ve-selectors, .ve-selectors .gjs-clm-tags { background: #ffffff; }
        .ve-styles .gjs-sm-sector {
          background: transparent;
          border: none;
          border-bottom: 1px solid #e5e7eb;
        }
        .ve-styles .gjs-sm-sector .gjs-sm-title {
          color: #1f2937;
          background: transparent;
          font-size: 11px;
          font-weight: 600;
          padding: 8px 4px;
        }
        .ve-styles .gjs-sm-property,
        .ve-styles .gjs-sm-label,
        .ve-traits .gjs-trt-trait,
        .ve-traits .gjs-label,
        .ve-selectors .gjs-clm-tags,
        .ve-selectors .gjs-clm-label {
          color: #1f2937;
          font-size: 11px;
        }
        .ve-styles .gjs-sm-label { color: #6b7280; }
        .ve-styles .gjs-field,
        .ve-traits .gjs-field,
        .ve-selectors .gjs-field {
          background: #ffffff;
          border: 1px solid #d1d5db;
          color: #1f2937;
          border-radius: 4px;
          min-height: 28px;
        }
        .ve-styles .gjs-field:focus-within,
        .ve-traits .gjs-field:focus-within,
        .ve-selectors .gjs-field:focus-within {
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
        }
        .ve-styles .gjs-field input, .ve-styles .gjs-field select, .ve-styles .gjs-field textarea,
        .ve-traits .gjs-field input, .ve-traits .gjs-field select, .ve-traits .gjs-field textarea,
        .ve-selectors .gjs-field input {
          color: #1f2937;
          background: transparent;
        }

        /* ── Field chrome: arrows, selects, number steppers ───────── */
        /* Make sure the custom stepper ("ns-resize" arrows that GrapesJS
           draws on numeric inputs) actually has a visible icon and doesn't
           overlap the value. */
        .grapesjs-shell .gjs-field { position: relative; }
        .grapesjs-shell .gjs-field-arrows {
          width: 10px;
          height: 22px;
          right: 8px;
          pointer-events: auto;
          opacity: 0.6;
          transition: opacity 0.15s;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          padding: 3px 0;
        }
        .grapesjs-shell .gjs-field-arrows:hover { opacity: 1; }
        .grapesjs-shell .gjs-field-arrow-u,
        .grapesjs-shell .gjs-field-arrow-d {
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          display: block;
          cursor: pointer;
        }
        .grapesjs-shell .gjs-field-arrow-u { border-bottom: 5px solid #4b5563; }
        .grapesjs-shell .gjs-field-arrow-d { border-top: 5px solid #4b5563; }
        .grapesjs-shell .gjs-field-arrow-u:hover { border-bottom-color: #2563eb; }
        .grapesjs-shell .gjs-field-arrow-d:hover { border-top-color: #2563eb; }

        /* Number inputs: leave room for the stepper arrows */
        .grapesjs-shell .gjs-field-number input,
        .grapesjs-shell .gjs-field-integer input { padding-right: 22px; }

        /* Selects: re-enable the native caret that GrapesJS hides via
           appearance:none, by drawing our own arrow on the parent. */
        .grapesjs-shell .gjs-field-select { position: relative; }
        .grapesjs-shell .gjs-field-select::after {
          content: '';
          position: absolute;
          right: 10px;
          top: 50%;
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 5px solid #4b5563;
          transform: translateY(-50%);
          pointer-events: none;
        }
        .grapesjs-shell .gjs-field-select select { padding-right: 22px; }
        .grapesjs-shell .gjs-field-select select option {
          background: #ffffff;
          color: #1f2937;
        }

        /* Composite "unit" slots (e.g. "px", "%", "em" selectors) */
        .grapesjs-shell .gjs-input-unit {
          background: transparent;
          border: none;
          color: #6b7280;
          padding-right: 16px;
        }

        /* Colour pickers */
        .grapesjs-shell .gjs-field-color { padding-right: 28px; }
        .grapesjs-shell .gjs-field-colorp-c {
          right: 4px;
          top: 50%;
          transform: translateY(-50%);
        }
        .ve-styles .gjs-radio-item, .ve-traits .gjs-radio-item {
          background: #ffffff;
          border: 1px solid #d1d5db;
          color: #1f2937;
        }
        .ve-styles .gjs-radio-item input:checked + .gjs-radio-item-label,
        .ve-styles .gjs-radio-item.gjs-four-color {
          background: #dbeafe;
          color: #1e3a8a;
        }
        /* Selectors (class tags) */
        .ve-selectors .gjs-clm-tag {
          background: #dbeafe;
          color: #1e3a8a;
          border: 1px solid #93c5fd;
          border-radius: 4px;
        }
        .ve-selectors .gjs-clm-tag-status, .ve-selectors .gjs-clm-tag-close { color: #1e3a8a; }

        /* ── Canvas ──────────────────────────────────────────────── */
        .gjs-cv-canvas {
          background: #f3f4f6;
          top: 0;
          height: 100%;
          width: 100%;
        }
        .gjs-editor-cont { background: transparent; }
        .gjs-frame-wrapper { box-shadow: 0 4px 20px -4px rgb(0 0 0 / 0.15); }

        /* Toolbar that appears on selected component */
        .grapesjs-shell .gjs-toolbar { background: #1f2937; }
        .grapesjs-shell .gjs-toolbar-item { color: #ffffff; }
      `}</style>
    </div>
  )
}

// ─── Chat bubble ───────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="h-6 w-6 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0">
          <Bot className="h-3 w-3 text-violet-600" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : msg.status === 'error'
            ? 'bg-destructive/10 text-destructive border border-destructive/20'
            : msg.status === 'success'
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
            : 'bg-muted text-foreground'
        }`}
      >
        <div className="flex items-start gap-1.5">
          {msg.status === 'error' && (
            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
          )}
          {msg.status === 'success' && (
            <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" />
          )}
          <span className="leading-relaxed whitespace-pre-wrap">{msg.content}</span>
        </div>
        {msg.details && msg.details.length > 0 && (
          <ul className="mt-1.5 pl-4 text-[10px] opacity-80 list-disc space-y-0.5">
            {msg.details.slice(0, 6).map((d, i) => (
              <li key={i}>{d}</li>
            ))}
            {msg.details.length > 6 && (
              <li>&hellip; and {msg.details.length - 6} more</li>
            )}
          </ul>
        )}
      </div>
      {isUser && (
        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
          <User className="h-3 w-3" />
        </div>
      )}
    </div>
  )
}
