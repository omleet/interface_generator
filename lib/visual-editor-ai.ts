/**
 * AI assistant helpers for the GrapesJS-based visual editor.
 *
 * We keep the same JSON edit-operations protocol used by the old custom
 * visual editor — it's been proven reliable across local LLMs, and is much
 * more deterministic than asking the model to return the whole page back.
 *
 * The editor component (components/grapesjs-editor.tsx) is responsible for
 * pumping the page HTML in here and feeding the resulting HTML back into
 * GrapesJS via editor.setComponents(...).
 */

import { generateCompletion, type LLMConfig, type LLMMessage } from './llm-client'

export interface InventoryItem {
  selector: string
  tag: string
  text: string
  classes: string[]
}

export type EditOperation =
  | { op: 'set_text'; selector: string; text: string }
  | { op: 'set_attribute'; selector: string; name: string; value: string }
  | { op: 'add_class'; selector: string; class: string }
  | { op: 'remove_class'; selector: string; class: string }
  | { op: 'set_style'; selector: string; property: string; value: string }
  | { op: 'remove'; selector: string }
  | { op: 'replace_html'; selector: string; html: string }
  | { op: 'append_html'; selector: string; html: string }
  | { op: 'prepend_html'; selector: string; html: string }

export interface ApplyResult {
  html: string
  applied: number
  failed: string[]
  summary: string[]
}

// ─── Build a compact inventory the model can reference ─────────────────────
// Annotates the source HTML with data-ve-id markers on the structural
// elements users are most likely to reference by name ("the sales card",
// "the sidebar brand"...). Returns both the compact list and the annotated
// HTML — the model only sees the list, but we need the annotated HTML to
// resolve [data-ve-id="..."] selectors on apply.

export function buildPageInventory(html: string): {
  inventory: InventoryItem[]
  annotatedHtml: string
} {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const inventory: InventoryItem[] = []
    let counter = 0

    const pick = (selector: string) => {
      let nodes: NodeListOf<Element>
      try {
        nodes = doc.querySelectorAll(selector)
      } catch {
        return
      }
      nodes.forEach((el) => {
        if (el.hasAttribute('data-ve-id')) return

        const veId = `ve${++counter}`
        el.setAttribute('data-ve-id', veId)

        const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90)
        const classes = Array.from(el.classList).slice(0, 5)

        inventory.push({
          selector: `[data-ve-id="${veId}"]`,
          tag: el.tagName.toLowerCase(),
          text,
          classes,
        })
      })
    }

    // Text-bearing first — users usually reference these by name
    pick('.main-sidebar .brand-text')
    pick('.main-sidebar .brand-link')
    pick('.main-sidebar .nav-link')
    pick('.main-header .nav-link')
    pick('.main-header .navbar-brand')
    pick('.content-header h1')
    pick('.content-header .breadcrumb-item')
    pick('.small-box h3')
    pick('.small-box p')
    pick('.info-box-text')
    pick('.info-box-number')
    pick('.widget-user-username')
    pick('.widget-user-desc')
    pick('.card-header .card-title')
    pick('.card .card-body h1, .card .card-body h2, .card .card-body h3, .card .card-body h4, .card .card-body h5')
    pick('.alert')
    pick('.btn-primary, .btn-success, .btn-danger, .btn-warning, .btn-info')
    pick('.badge')
    // Structural containers — for add/remove operations
    pick('.small-box')
    pick('.info-box')
    pick('.card')
    pick('.row')

    return {
      inventory: inventory.slice(0, 80),
      annotatedHtml: doc.documentElement.outerHTML,
    }
  } catch {
    return { inventory: [], annotatedHtml: html }
  }
}

// ─── Apply a list of ops to the annotated HTML ─────────────────────────────

function describeTarget(el: Element): string {
  const tag = el.tagName.toLowerCase()
  const cls = Array.from(el.classList).slice(0, 2).join('.')
  return cls ? `${tag}.${cls}` : tag
}

export function applyOperations(annotatedHtml: string, ops: unknown[]): ApplyResult {
  const failed: string[] = []
  const summary: string[] = []
  let applied = 0

  try {
    const doc = new DOMParser().parseFromString(annotatedHtml, 'text/html')

    for (const raw of ops) {
      if (!raw || typeof raw !== 'object' || !('op' in raw)) {
        failed.push('Invalid operation shape')
        continue
      }
      const op = raw as EditOperation
      const selector = 'selector' in op ? String(op.selector || '') : ''

      try {
        let target: Element | null = null
        try {
          target = selector ? doc.querySelector(selector) : null
        } catch {
          target = null
        }
        if (!target) {
          failed.push(`${op.op}: selector "${selector}" not found`)
          continue
        }

        switch (op.op) {
          case 'set_text':
            target.textContent = String(op.text ?? '')
            summary.push(`set text on ${describeTarget(target)}`)
            applied++
            break
          case 'set_attribute':
            target.setAttribute(String(op.name), String(op.value ?? ''))
            summary.push(`set ${op.name} on ${describeTarget(target)}`)
            applied++
            break
          case 'add_class':
            target.classList.add(String(op.class))
            summary.push(`added .${op.class} to ${describeTarget(target)}`)
            applied++
            break
          case 'remove_class':
            target.classList.remove(String(op.class))
            summary.push(`removed .${op.class} from ${describeTarget(target)}`)
            applied++
            break
          case 'set_style': {
            const el = target as HTMLElement
            el.style.setProperty(String(op.property), String(op.value ?? ''))
            summary.push(`${op.property}: ${op.value} on ${describeTarget(target)}`)
            applied++
            break
          }
          case 'remove':
            summary.push(`removed ${describeTarget(target)}`)
            target.parentNode?.removeChild(target)
            applied++
            break
          case 'replace_html':
            summary.push(`replaced ${describeTarget(target)}`)
            target.outerHTML = String(op.html || '')
            applied++
            break
          case 'append_html':
            target.insertAdjacentHTML('beforeend', String(op.html || ''))
            summary.push(`appended into ${describeTarget(target)}`)
            applied++
            break
          case 'prepend_html':
            target.insertAdjacentHTML('afterbegin', String(op.html || ''))
            summary.push(`prepended into ${describeTarget(target)}`)
            applied++
            break
          default:
            failed.push(`Unknown operation "${(op as { op: string }).op}"`)
        }
      } catch (err) {
        failed.push(`${op.op}: ${err instanceof Error ? err.message : 'exception'}`)
      }
    }

    // Clean up inventory markers — they must NOT leak back into the saved document
    doc.querySelectorAll('[data-ve-id]').forEach((el) => el.removeAttribute('data-ve-id'))

    return { html: doc.documentElement.outerHTML, applied, failed, summary }
  } catch {
    return { html: annotatedHtml, applied: 0, failed: ['Failed to parse document'], summary: [] }
  }
}

// ─── System prompt for the full-page AI assistant ──────────────────────────

function buildFullPageSystemPrompt(
  inventory: InventoryItem[],
  classVocabulary: string[],
): string {
  const inventoryForPrompt = inventory.map((i) => ({
    selector: i.selector,
    tag: i.tag,
    ...(i.text ? { text: i.text } : {}),
    ...(i.classes.length ? { classes: i.classes } : {}),
  }))

  return `You are a precise dashboard editor. Apply the user's change by outputting a JSON array of edit operations.

PAGE INVENTORY — every element you can reference is listed below with a unique "selector":
${JSON.stringify(inventoryForPrompt, null, 2)}

PAGE CLASS VOCABULARY (AdminLTE + Bootstrap utilities actually used on this page):
${classVocabulary.join(', ') || '(none detected)'}

OPERATIONS (output zero or more):
- {"op":"set_text","selector":"SEL","text":"new text"}  → replace text content
- {"op":"set_attribute","selector":"SEL","name":"href","value":"#"}  → set any attribute
- {"op":"add_class","selector":"SEL","class":"NAME"}  → add a CSS class
- {"op":"remove_class","selector":"SEL","class":"NAME"}  → remove a CSS class
- {"op":"set_style","selector":"SEL","property":"background-color","value":"#2563eb"}  → inline style
- {"op":"remove","selector":"SEL"}  → delete the element
- {"op":"append_html","selector":"SEL","html":"<div>...</div>"}  → add as last child
- {"op":"prepend_html","selector":"SEL","html":"<div>...</div>"}  → add as first child
- {"op":"replace_html","selector":"SEL","html":"<div>...</div>"}  → replace the element

STRICT RULES:
1. Output ONLY a valid JSON array. No markdown fences. No explanations.
2. Start your response with [ and end with ].
3. Prefer selectors from the inventory. You may also use plain CSS selectors (e.g. ".main-header", ".card:nth-of-type(1)").
4. Keep operations minimal — one op per change.
5. If the change cannot be applied, output exactly: []

UI CONSISTENCY (critical — keep the AdminLTE look and feel):
- AdminLTE 3 (Bootstrap 4 + Font Awesome 6 + Chart.js) is already loaded.
- When adding new HTML (append_html / prepend_html / replace_html), reuse classes from the vocabulary above.
- Match the structure of existing siblings. Adding a stats card? Use <div class="col-lg-3 col-6"><div class="small-box bg-info">...</div></div> with the same inner structure.
- Icons are Font Awesome: <i class="fas fa-..."></i>.
- Do NOT add <style>, <link> or external resources. Do NOT invent icon classes.
- Do NOT use inline "style" for colours/spacing — use utility classes (.bg-primary, .text-white, .p-3, .mt-2, .d-flex, .text-center).
- Use set_style only for one-off visual tweaks no utility class covers.

EXAMPLES:
User: "Change the sidebar brand to Acme Corp"
Response: [{"op":"set_text","selector":"[data-ve-id=\\"ve1\\"]","text":"Acme Corp"}]

User: "Make the first card background primary"
Response: [{"op":"add_class","selector":".card:nth-of-type(1)","class":"bg-primary"},{"op":"add_class","selector":".card:nth-of-type(1)","class":"text-white"}]

User: "Add a new stats card showing Visitors: 1,240 to the main row"
Response: [{"op":"append_html","selector":".row","html":"<div class=\\"col-lg-3 col-6\\"><div class=\\"small-box bg-info\\"><div class=\\"inner\\"><h3>1,240</h3><p>Visitors</p></div><div class=\\"icon\\"><i class=\\"fas fa-users\\"></i></div><a href=\\"#\\" class=\\"small-box-footer\\">More info <i class=\\"fas fa-arrow-circle-right\\"></i></a></div></div>"}]

User: "Remove all alerts"
Response: [{"op":"remove","selector":".alert"}]`
}

// ─── Public entry point ────────────────────────────────────────────────────
// Ask the LLM to produce edit ops, apply them, return the new HTML.

export interface AskAIResult {
  success: boolean
  html: string          // always present — the old html on failure, new on success
  summary: string[]     // human-readable list of applied ops
  failed: string[]      // human-readable list of ops that did not apply
  error?: string        // set when the call itself failed
}

export async function askAI(
  userMessage: string,
  currentHtml: string,
  llmConfig: LLMConfig,
): Promise<AskAIResult> {
  const { inventory, annotatedHtml } = buildPageInventory(currentHtml)

  if (inventory.length === 0) {
    return {
      success: false,
      html: currentHtml,
      summary: [],
      failed: [],
      error: 'Could not parse the page structure.',
    }
  }

  // Collect the actual classes used on this page so the model has a concrete
  // vocabulary when generating new HTML
  const classVocabulary = Array.from(new Set(inventory.flatMap((i) => i.classes)))
    .filter((c) => !c.startsWith('__ve') && !c.startsWith('data-ve'))
    .slice(0, 40)

  const messages: LLMMessage[] = [
    { role: 'system', content: buildFullPageSystemPrompt(inventory, classVocabulary) },
    { role: 'user', content: userMessage },
  ]

  return new Promise<AskAIResult>((resolve) => {
    let fullResponse = ''

    generateCompletion(llmConfig, messages, {
      onToken: (t) => {
        fullResponse += t
      },
      onComplete: () => {
        let cleaned = fullResponse.trim()
        // Strip markdown fences
        if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
        else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
        if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
        cleaned = cleaned.trim()

        // Extract JSON array even if the model added preamble
        const arrStart = cleaned.indexOf('[')
        const arrEnd = cleaned.lastIndexOf(']')
        if (arrStart >= 0 && arrEnd > arrStart) {
          cleaned = cleaned.slice(arrStart, arrEnd + 1)
        }

        if (!cleaned) {
          resolve({
            success: false,
            html: currentHtml,
            summary: [],
            failed: [],
            error: 'Model returned an empty response.',
          })
          return
        }

        let ops: unknown[]
        try {
          ops = JSON.parse(cleaned)
          if (!Array.isArray(ops)) throw new Error('not an array')
        } catch {
          resolve({
            success: false,
            html: currentHtml,
            summary: [],
            failed: [],
            error: 'Model returned invalid JSON.',
          })
          return
        }

        if (ops.length === 0) {
          resolve({
            success: false,
            html: currentHtml,
            summary: [],
            failed: [],
            error: 'Model returned no operations — the change could not be mapped to edits.',
          })
          return
        }

        const result = applyOperations(annotatedHtml, ops)
        resolve({
          success: result.applied > 0,
          html: result.html,
          summary: result.summary,
          failed: result.failed,
          ...(result.applied === 0 && { error: 'No operations applied successfully.' }),
        })
      },
      onError: (err) => {
        resolve({
          success: false,
          html: currentHtml,
          summary: [],
          failed: [],
          error: err.message,
        })
      },
    })
  })
}

// ─── Element-level fragment editor ─────────────────────────────────────────
// When the user has a GrapesJS component selected, we send the fragment
// only. Smaller input, smaller output, much higher success rate on weak LLMs.

export async function askAIForFragment(
  userMessage: string,
  fragmentHtml: string,
  llmConfig: LLMConfig,
): Promise<{ success: boolean; html: string; error?: string }> {
  const systemPrompt = `You are a precise HTML editor working on an AdminLTE dashboard (Bootstrap 4, Font Awesome 6, Chart.js all loaded). The user selected this element:

\`\`\`html
${fragmentHtml}
\`\`\`

RULES:
1. Output ONLY the modified fragment with the requested change applied.
2. Do NOT wrap in <!DOCTYPE>, <html>, <head>, or <body>.
3. Preserve every existing class, id, attribute, and nested element not mentioned in the change.
4. No markdown fences, no explanations.

UI CONSISTENCY:
- Reuse the same class patterns as the original (.card / .small-box / .info-box / .btn-* / .badge / .nav-*).
- Do NOT invent CSS classes, add <style> blocks, or use inline "style" for layout/colour (use utility classes: .bg-primary, .text-white, .p-3, .mt-2, .d-flex).
- Icons are Font Awesome: <i class="fas fa-..."></i>.`

  return new Promise((resolve) => {
    let fullResponse = ''
    generateCompletion(
      llmConfig,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      {
        onToken: (t) => {
          fullResponse += t
        },
        onComplete: () => {
          let cleaned = fullResponse.trim()
          if (cleaned.startsWith('```html')) cleaned = cleaned.slice(7)
          else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
          if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
          cleaned = cleaned.trim()

          if (!cleaned || cleaned.length < 5) {
            resolve({
              success: false,
              html: fragmentHtml,
              error: 'Model returned an empty response.',
            })
            return
          }
          resolve({ success: true, html: cleaned })
        },
        onError: (err) => {
          resolve({ success: false, html: fragmentHtml, error: err.message })
        },
      },
    )
  })
}
