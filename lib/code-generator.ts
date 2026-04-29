import type { LLMConfig, LLMMessage } from './llm-client'
import { generateCompletion } from './llm-client'
import type { RAGEngine } from './rag-engine'

// ─── Shared CDN sources ───────────────────────────────────────────────────────
// Single source of truth for the AdminLTE 3 stack used by EVERY surface that
// renders generated dashboards: the export wrapper, the GrapesJS canvas, and
// the basic-layout reference inside the knowledge base. Keep them in sync to
// guarantee identical rendering between preview, editor and exported ZIP.
//
// AdminLTE 3.2's adminlte.min.css already bundles Bootstrap 4 styles, so we
// do NOT load bootstrap.min.css separately — doing so would cause specificity
// fights for components like .form-control, .btn, .modal-*.
export const ADMINLTE_CDN_STYLES: readonly string[] = [
  'https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/css/adminlte.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
]

// Bootstrap JS (4.6) IS loaded — the bundle includes Popper, which AdminLTE
// needs for tooltips, dropdowns and modals.
export const ADMINLTE_CDN_SCRIPTS: readonly string[] = [
  'https://code.jquery.com/jquery-3.6.0.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/js/adminlte.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
]

export interface GeneratedCode {
  html: string
  css: string
  js: string
  fullHtml: string
  dependencies: string[]
}

export interface GenerationCallbacks {
  onToken: (token: string) => void
  onComplete: (code: GeneratedCode) => void
  onError: (error: Error) => void
  onRefinementStart?: () => void
}

// ─── System Prompt ────────────────────────────────────────────────────────────
// Structured with XML delimiters for better adherence in local models.
// Few-shot example included to anchor style and output format.

const SYSTEM_PROMPT = `<role>
You are an expert AdminLTE 3 dashboard developer. You write complete, production-ready HTML files using EXCLUSIVELY AdminLTE 3.2, Bootstrap 4.6, Chart.js, jQuery 3.6 and Font Awesome 6. Every file you output runs correctly in a browser without modification.
</role>

<output_format>
Output ONLY raw HTML — no markdown, no explanation, no code fences, no preamble.
The very first character of your response must be < from <!DOCTYPE html>.
The very last character must be > from </html>.
</output_format>

<framework_lock>
This dashboard is AdminLTE 3 + Bootstrap 4 ONLY. You must NEVER use any other UI framework, even if you know one. The page renders inside an environment where only AdminLTE 3.2, Bootstrap 4.6, jQuery 3.6, Chart.js and Font Awesome 6 are loaded — anything else will simply not render.

FORBIDDEN frameworks and indicators (DO NOT use any of these — if you are tempted to write them, use the Bootstrap 4 equivalent instead):
- Tailwind CSS — no utility classes like flex, items-center, justify-between, gap-4, px-4, py-2, mx-auto with numeric scale, bg-blue-500, text-white text-sm, rounded-lg, shadow-md, grid-cols-3, space-x-2, w-full, min-h-screen.
- Tailwind CDN — never include <script src="https://cdn.tailwindcss.com"> or any tailwind link tag.
- Bootstrap 5 — never use data-bs-toggle, data-bs-target, data-bs-dismiss, data-bs-parent, data-bs-ride. Use the Bootstrap 4 form: data-toggle, data-target, data-dismiss, data-parent, data-ride.
- Bootstrap 5 spacing — never use ms-*, me-*, ps-*, pe-* utilities. Use Bootstrap 4: ml-*, mr-*, pl-*, pr-*.
- Bootstrap 5 form-floating, btn-close, accordion, offcanvas. Use Bootstrap 4 equivalents.
- AdminLTE 4 — never use AdminLTE 4 classes or its Bootstrap 5 layer. Generate AdminLTE 3 only.
- Material UI / MUI / Material Design / Materialize / Material icons (mat-icon, md-*).
- Tabler, CoreUI, Metronic, Vuexy, SB Admin, Light Bootstrap Dashboard, Argon, Volt, Soft UI, Now UI.
- Chakra UI, Ant Design, Semantic UI, Bulma, Foundation.
- React, Vue, Angular, Svelte syntax — output is plain HTML, not JSX.
- Inline <style> attributes for layout/colour/spacing — use Bootstrap 4 utility classes.

ALLOWED Bootstrap 4 / AdminLTE 3 vocabulary you SHOULD use:
- Layout: container, container-fluid, row, col-12, col-sm-*, col-md-*, col-lg-*, col-xl-*, d-flex, flex-row, flex-column, justify-content-*, align-items-*, ml-*, mr-*, pl-*, pr-*, mt-*, mb-*, p-*, m-*.
- Cards: card, card-header, card-title, card-tools, card-body, card-footer, card-primary, card-outline.
- AdminLTE widgets: info-box, info-box-icon, info-box-content, info-box-text, info-box-number, small-box, small-box-footer, content-wrapper, content-header, content, main-header, main-sidebar, main-footer, brand-link, brand-text, sidebar-dark-primary, nav-sidebar, nav-treeview.
- Colours (BG): bg-primary, bg-secondary, bg-success, bg-info, bg-warning, bg-danger, bg-light, bg-dark, bg-gradient-primary..., bg-navy, bg-purple, bg-fuchsia, bg-pink, bg-maroon, bg-orange, bg-lime, bg-teal, bg-olive.
- Tables: table, table-striped, table-hover, table-bordered, table-sm, thead-light, thead-dark.
- Forms: form-group, form-control, form-control-sm, input-group, input-group-prepend, input-group-append, custom-control, custom-checkbox, custom-switch.
- Buttons: btn, btn-primary..., btn-outline-*, btn-sm, btn-lg, btn-block, btn-group.
- Modals: modal, modal-dialog, modal-content, modal-header, modal-body, modal-footer with data-toggle="modal" data-target="#id" and data-dismiss="modal".
</framework_lock>

<core_principles>
1. MODULARITY — compose atomic elements into components into layouts:
   primitives (buttons, badges, icons) → components (cards, info-boxes, tables) → patterns (dashboard rows, CRUD tables) → layout (sidebar + navbar + content-wrapper)

2. CONSISTENCY — same spacing (Bootstrap 4 utilities), same color tokens (bg-primary / bg-success / bg-warning / bg-danger / bg-info), same icon family (Font Awesome 6: fas / far / fab)

3. RESPONSIVENESS — Bootstrap 4 grid mobile-first: col-xl-* / col-lg-* / col-md-* / col-sm-* / col-*

4. COMPLETENESS — every canvas referenced in JS must exist in HTML; every function must be defined; no TODO or placeholder code
</core_principles>

<html_rules>
- Group related sections with comments: <!-- Stats Row -->, <!-- Main Chart -->, <!-- Device Table -->
- Semantic IDs on JS targets: id="temperatureChart", id="deviceTable"
- 2-space indentation throughout
- Use realistic sample data relevant to the domain — never "Lorem ipsum" or generic placeholders
</html_rules>

<css_rules>
- Prefer AdminLTE/Bootstrap 4 utility classes over custom CSS
- Custom CSS only for truly unique requirements, in a single <style> block inside <head>
- Never include Tailwind directives (@tailwind, @apply) or Bootstrap 5 utility names
</css_rules>

<javascript_rules>
- All scripts go before </body>
- Initialize after DOM ready ($(function() { ... }) or DOMContentLoaded)
- Check canvas/element existence before initializing: const ctx = document.getElementById('myChart'); if (ctx) { new Chart(ctx, ...) }
- Use descriptive variable names; add comments for complex logic
- Include proper try/catch where appropriate
- Never depend on libraries that are not loaded by the template (no DataTables, no Select2, no SweetAlert, no Moment, no ApexCharts, no Highcharts) — use plain Bootstrap 4 + Chart.js only.
</javascript_rules>

<component_patterns>
Stats row: info-box or small-box in col-lg-3 col-md-6 col-12 grid
Charts: Card wrapper with optional time-range controls + Chart.js canvas
Tables: styled Bootstrap 4 table (table table-striped table-hover) with status badges and action buttons. Do NOT use DataTables — only plain Bootstrap tables.
Forms: form-group wrappers, input-group icons, validation feedback, buttons in card-footer
</component_patterns>

<constraints>
NEVER:
- Output markdown code fences (\`\`\`html or \`\`\`)
- Add text before <!DOCTYPE html> or after </html>
- Use placeholder text (lorem ipsum, "Sample text", "Content here")
- Leave incomplete, broken, or TODO code
- Mix Bootstrap 3, Bootstrap 5 or AdminLTE 4 classes/attributes with Bootstrap 4 / AdminLTE 3
- Reference a chart canvas ID in JS without a matching element in HTML
- Include any framework other than AdminLTE 3.2 + Bootstrap 4.6 + jQuery 3.6 + Chart.js + Font Awesome 6
- Include DataTables, Select2, SweetAlert, Moment, Toastr, ApexCharts, Highcharts, ECharts, FullCalendar — they are NOT loaded.

ALWAYS:
- Use CDN links for the allowed libraries (AdminLTE 3.2, Bootstrap 4.6, jQuery 3.6, Chart.js latest, FA 6)
- Make all interactive elements functional with realistic data
- Guard every Chart.js initialization with an element existence check
- Close every HTML tag
- Use Bootstrap 4 attributes (data-toggle, data-target, data-dismiss) — never the Bootstrap 5 data-bs-* form
</constraints>

<example>
<!-- This is a minimal stats card row — follow this pattern for consistency -->
<div class="row">
  <div class="col-lg-3 col-md-6 col-12">
    <div class="info-box">
      <span class="info-box-icon bg-info elevation-1"><i class="fas fa-thermometer-half"></i></span>
      <div class="info-box-content">
        <span class="info-box-text">Temperature</span>
        <span class="info-box-number">24.5 °C</span>
      </div>
    </div>
  </div>
  <!-- repeat for other metrics -->
</div>
</example>`

// ─── Refinement prompt ────────────────────────────────────────────────────────

const REFINEMENT_SYSTEM_PROMPT = `<role>
You are a senior code reviewer specialising in AdminLTE 3 HTML dashboards.
You receive a generated HTML dashboard and must fix any issues you find.
Output ONLY the corrected raw HTML — no markdown, no explanations.
</role>

<output_format>
Output ONLY raw HTML starting with <!DOCTYPE html> and ending with </html>.
</output_format>`

function buildRefinementUserMessage(html: string): string {
  return `<task>
Review the following AdminLTE dashboard HTML and fix ALL issues from this checklist. Output ONLY the corrected HTML — start with <!DOCTYPE html>, end with </html>.

<checklist>
1. If <div class="wrapper"> is empty or missing key sections, FILL IT with:
   - main-header navbar, main-sidebar with nav items, content-header with title+breadcrumb,
   - a row of 4 info-box/small-box widgets with realistic metrics,
   - at least one Chart.js <canvas> with realistic sample data and full init code,
   - at least one data table with 5+ realistic rows (use a styled Bootstrap 4 table — NOT DataTables),
   - main-footer.
2. Every Chart.js canvas referenced in JavaScript (getElementById / querySelector) must have a matching element in HTML with that exact id.
3. No unclosed HTML tags — every <div>, <section>, <tbody> etc. must be closed.
4. No truncated or incomplete JavaScript — every function body must be complete.
5. No placeholder text ("Lorem ipsum", "Sample", "TODO", "Content here").
6. The document must end with </body></html> — not cut off mid-element.
7. All interactive controls (buttons, toggles, filters) must have functional JS handlers.

8. FRAMEWORK PURITY — convert any foreign-framework code to AdminLTE 3 + Bootstrap 4:
   - Remove any <script src="https://cdn.tailwindcss.com"> tag and any other Tailwind / Material / Bootstrap-5 / AdminLTE-4 link or script.
   - Replace Tailwind utility classes with Bootstrap 4 equivalents:
     flex → d-flex, items-center → align-items-center, justify-between → justify-content-between, gap-N → use mr-N / mt-N / spacing utilities, w-full → w-100, min-h-screen → min-vh-100, grid grid-cols-N → row + col-md-(12/N), space-x-N → mr-N siblings, rounded → rounded, shadow → shadow, text-white → text-white, text-sm → small, bg-blue-500 → bg-primary, bg-green-500 → bg-success, bg-red-500 → bg-danger, bg-yellow-500 → bg-warning.
   - Replace Bootstrap 5 attributes data-bs-toggle, data-bs-target, data-bs-dismiss, data-bs-parent, data-bs-ride with Bootstrap 4 forms data-toggle, data-target, data-dismiss, data-parent, data-ride.
   - Replace Bootstrap 5 spacing ms-N → ml-N, me-N → mr-N, ps-N → pl-N, pe-N → pr-N (apply per side, including responsive variants like ms-md-2 → ml-md-2).
   - Replace Material / mat-icon / md-* with Font Awesome (fas/far/fab) icons.
   - Remove DataTables / Select2 / SweetAlert / Moment / ApexCharts / Highcharts code — use plain Bootstrap tables and Chart.js instead.
9. The final document MUST load only: AdminLTE 3.2 CSS+JS, Bootstrap 4.6 CSS+JS bundle, jQuery 3.6, Font Awesome 6, Chart.js. No other CSS or JS sources are allowed.
</checklist>

Return the complete corrected HTML. If the code has no issues, return it unchanged.
</task>

<html_to_review>
${html}
</html_to_review>`
}

// ─── Validation ───────────────────────────────────────────────────────────────

interface ValidationResult {
  isComplete: boolean
  issues: string[]
}

function validateHtml(html: string): ValidationResult {
  const issues: string[] = []

  if (!html.includes('</body>') || !html.includes('</html>')) {
    issues.push('HTML is truncated — missing </body> or </html>')
  }

  // Detect the "empty wrapper" failure mode: the model emitted the AdminLTE
  // skeleton but didn't fill the body. Measure meaningful markup inside <body>.
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) {
    const bodyContent = bodyMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .trim()

    // Count substantive structural elements (cards, rows, tables, charts...)
    const structuralElements =
      (bodyContent.match(/<(div|section|article|table|canvas|nav|aside|header|footer)\b/gi) ?? []).length

    if (bodyContent.length < 400 || structuralElements < 8) {
      issues.push(
        'Body is nearly empty — the dashboard has no real content inside <div class="wrapper">. ' +
          'Required sections are missing.',
      )
    }
  }

  // Only check canvas IDs when Chart.js is actually used
  const hasChartJs = html.includes('new Chart(')
  if (hasChartJs) {
    // Extract all IDs referenced as the first arg of new Chart(...)
    // Matches: new Chart('myId', ...) and new Chart(document.getElementById('myId'), ...)
    const chartIdMatches = [
      ...html.matchAll(/new\s+Chart\s*\(\s*['"]([^'"]+)['"]/g),
      ...html.matchAll(/new\s+Chart\s*\(\s*document\.getElementById\s*\(\s*['"]([^'"]+)['"]\s*\)/g),
    ]
    const chartCanvasIds = [...new Set(chartIdMatches.map((m) => m[1]))]

    for (const id of chartCanvasIds) {
      const elementPattern = new RegExp(`id=["']${id}["']`)
      if (!elementPattern.test(html)) {
        issues.push(`Canvas id="${id}" referenced in new Chart() but missing in HTML`)
      }
    }
  }

  // Check for obvious truncation signals — unclosed tag at the very end
  if (/(<(div|section|main|article|tbody|ul|ol)\b[^>]*>)\s*$/.test(html.slice(-200))) {
    issues.push('HTML appears to end with an unclosed opening tag')
  }

  // Foreign-framework drift — flag so the refinement pass can fix what the
  // regex normaliser can't (entire Tailwind layouts, Material widgets, etc.).
  const drift = detectFrameworkDrift(html)
  if (drift.length > 0) {
    issues.push('Foreign framework drift detected: ' + drift.join(', '))
  }

  return { isComplete: issues.length === 0, issues }
}

// Returns a short list of the foreign-framework signals we found in the HTML,
// or an empty array if it's clean. Used both for validation and for the
// post-processing log so users can see when normalisation kicked in.
function detectFrameworkDrift(html: string): string[] {
  const drift: string[] = []
  if (/cdn\.tailwindcss\.com/i.test(html)) drift.push('Tailwind CDN script')
  if (/@tailwind\b|@apply\b/.test(html)) drift.push('Tailwind directives')
  if (/\bdata-bs-(toggle|target|dismiss|parent|ride|slide|theme)\b/.test(html)) {
    drift.push('Bootstrap 5 data-bs-* attributes')
  }
  if (/\bclass="[^"]*\b(?:ms|me|ps|pe)-(?:[0-5]|auto|sm-|md-|lg-|xl-)/.test(html)) {
    drift.push('Bootstrap 5 ms-/me-/ps-/pe- spacing')
  }
  // Tailwind utility signature — a coloured bg with the numeric scale
  if (/\bbg-(?:red|blue|green|yellow|indigo|purple|pink|gray|slate|zinc|neutral|stone|orange|amber|lime|emerald|teal|cyan|sky|violet|fuchsia|rose)-(?:50|100|200|300|400|500|600|700|800|900)\b/.test(html)) {
    drift.push('Tailwind colour scale (bg-*-500)')
  }
  // Tailwind layout tokens that don't exist in Bootstrap 4
  if (/\bclass="[^"]*\b(?:min-h-screen|min-w-screen|h-screen|w-screen|grid-cols-\d|space-[xy]-\d|inset-\d|ring-\d)\b/.test(html)) {
    drift.push('Tailwind layout utilities')
  }
  if (/\bmat-icon\b|\bmd-icon\b/.test(html)) drift.push('Material icons')
  return drift
}

// Mechanically convert the most common foreign-framework signals to their
// AdminLTE 3 + Bootstrap 4 equivalents. This is deliberately conservative —
// only safe 1:1 swaps. Anything more complex is left for the refinement pass.
function normaliseFramework(html: string): string {
  let out = html

  // Strip Tailwind CDN script and Tailwind config blocks.
  out = out.replace(
    /<script[^>]*src=["']https?:\/\/cdn\.tailwindcss\.com[^"']*["'][^>]*>\s*<\/script>/gi,
    '',
  )
  out = out.replace(/<script>\s*tailwind\.config\s*=[\s\S]*?<\/script>/gi, '')
  // Drop @tailwind / @apply directives inside <style>
  out = out.replace(/@tailwind\s+[a-z-]+\s*;?/gi, '')
  out = out.replace(/@apply\s+[^;}]+;?/gi, '')

  // Bootstrap 5 → Bootstrap 4 attribute renames (only inside attributes,
  // never inside script/text content).
  out = out.replace(
    /(\s)data-bs-(toggle|target|dismiss|parent|ride|slide|slide-to|theme|backdrop|keyboard|placement|trigger|content|html|delay|offset|fallback-placements|boundary|reference|popper-config)=/g,
    (_m, ws: string, name: string) => `${ws}data-${name === 'theme' ? 'theme' : name}=`,
  )
  // btn-close (BS5) → close (BS4)
  out = out.replace(/class="([^"]*)\bbtn-close\b([^"]*)"/g, 'class="$1close$2"')

  // Bootstrap 5 spacing → Bootstrap 4 spacing (ms→ml, me→mr, ps→pl, pe→pr).
  // Apply per side and per breakpoint variant. Only inside class="..." values.
  out = out.replace(/\bclass="([^"]+)"/g, (_m, cls: string) => {
    const fixed = cls
      .replace(/\bms-(sm|md|lg|xl)-/g, 'ml-$1-')
      .replace(/\bme-(sm|md|lg|xl)-/g, 'mr-$1-')
      .replace(/\bps-(sm|md|lg|xl)-/g, 'pl-$1-')
      .replace(/\bpe-(sm|md|lg|xl)-/g, 'pr-$1-')
      .replace(/\bms-(\d|auto)\b/g, 'ml-$1')
      .replace(/\bme-(\d|auto)\b/g, 'mr-$1')
      .replace(/\bps-(\d|auto)\b/g, 'pl-$1')
      .replace(/\bpe-(\d|auto)\b/g, 'pr-$1')
    return `class="${fixed}"`
  })

  // Common Tailwind colour-scale → Bootstrap 4 contextual colours. We only
  // touch the unmistakable cases inside class="..." values.
  const tailwindBgToBootstrap: Array<[RegExp, string]> = [
    [/\bbg-(?:blue|sky|indigo|cyan)-(?:[5-9]00)\b/g, 'bg-primary'],
    [/\bbg-(?:green|emerald|teal|lime)-(?:[5-9]00)\b/g, 'bg-success'],
    [/\bbg-(?:red|rose|pink|fuchsia)-(?:[5-9]00)\b/g, 'bg-danger'],
    [/\bbg-(?:yellow|amber|orange)-(?:[5-9]00)\b/g, 'bg-warning'],
    [/\bbg-(?:gray|slate|zinc|neutral|stone)-(?:[5-9]00)\b/g, 'bg-secondary'],
  ]
  out = out.replace(/\bclass="([^"]+)"/g, (_m, cls: string) => {
    let fixed = cls
    for (const [re, repl] of tailwindBgToBootstrap) fixed = fixed.replace(re, repl)
    // Tailwind layout utilities → Bootstrap 4 equivalents
    fixed = fixed
      .replace(/\bmin-h-screen\b/g, 'min-vh-100')
      .replace(/\bh-screen\b/g, 'vh-100')
      .replace(/\bw-screen\b/g, 'vw-100')
      .replace(/\bw-full\b/g, 'w-100')
      .replace(/\bh-full\b/g, 'h-100')
      .replace(/\bflex\b(?!\-)/g, 'd-flex')
      .replace(/\bitems-center\b/g, 'align-items-center')
      .replace(/\bitems-start\b/g, 'align-items-start')
      .replace(/\bitems-end\b/g, 'align-items-end')
      .replace(/\bjustify-center\b/g, 'justify-content-center')
      .replace(/\bjustify-between\b/g, 'justify-content-between')
      .replace(/\bjustify-start\b/g, 'justify-content-start')
      .replace(/\bjustify-end\b/g, 'justify-content-end')
      .replace(/\bjustify-around\b/g, 'justify-content-around')
      .replace(/\bflex-col\b/g, 'flex-column')
      .replace(/\btext-(xs|sm)\b/g, 'small')
      .replace(/\brounded-(?:lg|xl|2xl|3xl|md|sm)\b/g, 'rounded')
      .replace(/\bshadow-(?:sm|md|lg|xl|2xl)\b/g, 'shadow')
    return `class="${fixed}"`
  })

  return out
}

// ─── Prompt amplification ─────────────────────────────────────────────────────
// Short prompts (e.g. "dashboard para 4 sensores de tensão") give the model
// almost no signal. We detect short / high-level prompts and append explicit
// "infer reasonable defaults" guidance so the model actually fills the body
// with concrete components instead of emitting only boilerplate.

function amplifyPrompt(prompt: string): string {
  const trimmed = prompt.trim()
  const isShort = trimmed.split(/\s+/).length < 15

  // Always ensure the model is told exactly which sections the dashboard MUST
  // contain — this prevents the "empty wrapper" failure mode on weaker models.
  const mandatorySections = `
<mandatory_sections>
The dashboard MUST include ALL of the following, filled with realistic, domain-specific data:
1. AdminLTE main-header (top navbar) with a brand name inferred from the request.
2. AdminLTE main-sidebar with 3-5 navigation items relevant to the domain.
3. content-header with a page title (h1) and breadcrumb.
4. A row of at least 4 info-box or small-box widgets showing the most important metrics for the domain.
5. At least ONE <canvas> chart (Chart.js) visualising the main data — include realistic sample data points in the JS.
6. At least ONE styled Bootstrap 4 table (table table-striped table-hover) with 5+ realistic rows of sample data and status badges. Do NOT use DataTables.
7. A main-footer.
The <div class="wrapper"> MUST NOT be empty. Every section above is REQUIRED.
</mandatory_sections>

<framework_reminder>
Use AdminLTE 3 + Bootstrap 4 EXCLUSIVELY. Forbidden: Tailwind, Bootstrap 5, AdminLTE 4, Material UI, Tabler, CoreUI, Chakra, Ant Design.
- No data-bs-* attributes (use data-toggle / data-target / data-dismiss).
- No ms-/me-/ps-/pe-* utilities (use ml-/mr-/pl-/pr-*).
- No Tailwind classes (flex items-center justify-between gap-4 px-4 bg-blue-500 etc.).
- No <script src="https://cdn.tailwindcss.com">.
- No DataTables / Select2 / SweetAlert / ApexCharts / Highcharts — they are NOT loaded.
</framework_reminder>`.trim()

  if (!isShort) {
    return `${trimmed}\n\n${mandatorySections}`
  }

  // For short prompts, add explicit "infer defaults" guidance
  return `${trimmed}

<inference_guidance>
The request above is intentionally brief. You MUST infer sensible, domain-specific defaults and build a complete, rich dashboard — do NOT output an empty shell. Choose realistic metric names, units, ranges, timestamps, device names, statuses, and chart axes that match the domain.
</inference_guidance>

${mandatorySections}`
}

// Hard cap on RAG context to avoid blowing the model's context window.
// With num_ctx=12288 and ~6000 reserved for generation, inputs should stay
// under ~6000 tokens total. System prompt is ~1200 tokens, so RAG must fit
// in ~4000 tokens ≈ 16000 chars.
const MAX_RAG_CONTEXT_CHARS = 14000

function truncateContext(context: string, maxChars: number): string {
  if (context.length <= maxChars) return context
  const truncated = context.slice(0, maxChars)
  // Cut at the last full section to avoid dangling half-snippets
  const lastSectionEnd = truncated.lastIndexOf('\n---\n')
  const cutAt = lastSectionEnd > maxChars * 0.5 ? lastSectionEnd : truncated.lastIndexOf('\n\n')
  return (cutAt > 0 ? truncated.slice(0, cutAt) : truncated) +
    '\n\n<!-- [context truncated to fit model window] -->'
}

// ─── Main generation function ─────────────────────────────────────────────────

export async function generateDashboard(
  prompt: string,
  config: LLMConfig,
  ragEngine: RAGEngine,
  callbacks: GenerationCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  // Get relevant context from RAG — topK=7 to give the model more
  // AdminLTE primitives/patterns to work from, which reduces "improvising"
  // with classes from other frameworks. truncateContext caps the total size.
  let context = ''
  if (!ragEngine.isReady) {
    console.warn(
      '[generateDashboard] RAG engine is not ready — generating without AdminLTE reference components. ' +
        'The model will rely solely on the system prompt, which significantly increases the chance of ' +
        'output drifting toward Tailwind / Bootstrap 5 / Material classes. Wait for "RAG Ready" before ' +
        'generating to get consistent AdminLTE 3 dashboards.',
    )
  } else {
    try {
      context = await ragEngine.getContext(prompt, 7)
      context = truncateContext(context, MAX_RAG_CONTEXT_CHARS)
      if (!context) {
        console.warn(
          '[generateDashboard] RAG returned empty context for prompt: ' + JSON.stringify(prompt.slice(0, 120)),
        )
      }
    } catch (err) {
      console.warn('[generateDashboard] RAG lookup failed, generating without context:', err)
    }
  }

  const amplifiedPrompt = amplifyPrompt(prompt)

  const messages: LLMMessage[] = [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
  ]

  if (context) {
    messages.push({
      role: 'user',
      content: `<reference_components>\n${context}\n</reference_components>`,
    })
    messages.push({
      role: 'assistant',
      content: 'Understood. I will use these AdminLTE components as building blocks for the dashboard.',
    })
  }

  // Append the amplified request + strong constraint reminder at the END of
  // the conversation. Local models strongly favour the last message, so the
  // mandatory-sections list goes here to prevent empty-wrapper outputs.
  messages.push({
    role: 'user',
    content: `<request>
Create a COMPLETE AdminLTE 3 dashboard for the following requirements:

${amplifiedPrompt}
</request>

<reminder>
- Output ONLY raw HTML. Start immediately with <!DOCTYPE html>
- No markdown fences, no explanations before or after the HTML
- <div class="wrapper"> MUST be filled — never output an empty wrapper
- Include EVERY mandatory section listed above with realistic sample data
- Every Chart.js canvas referenced in JS must exist in HTML
- End the file with </body></html>
</reminder>`,
  })

  let fullResponse = ''

  await generateCompletion(config, messages, {
    onToken: (token) => {
      fullResponse += token
      callbacks.onToken(token)
    },
    onComplete: async () => {
      // Skip post-processing if the user cancelled between the last token and onComplete
      if (signal?.aborted) return

      try {
        let finalHtml = fullResponse.trim()

        // --- Framework normalisation ---
        // Mechanically rewrites foreign-framework code to AdminLTE 3 + Bootstrap 4.
        // Cheap and deterministic — runs before validation so the auto-repair
        // pass only has to deal with structural issues, not framework drift.
        finalHtml = normaliseFramework(finalHtml)

        // --- Auto-repair pass ---
        // Runs whenever validation fails, regardless of Fast/Quality mode.
        // This is critical: the most common "blank page" failure mode is the
        // model emitting only the AdminLTE skeleton with an empty <div class="wrapper">.
        // Without this pass, Fast mode would silently ship broken output.
        // Quality mode is unchanged — it still runs this whenever validation fails.
        const validation = validateHtml(finalHtml)

        if (!validation.isComplete && !signal?.aborted) {
          callbacks.onRefinementStart?.()

          const refinementMessages: LLMMessage[] = [
            { role: 'system', content: REFINEMENT_SYSTEM_PROMPT },
            { role: 'user', content: buildRefinementUserMessage(finalHtml) },
          ]

          let refinedHtml = ''
          await generateCompletion(
            config,
            refinementMessages,
            {
              onToken: (token) => {
                refinedHtml += token
                callbacks.onToken(token) // stream refinement tokens too
              },
              onComplete: () => {
                // Use refined version only if it looks like valid HTML
                const trimmed = refinedHtml.trim()
                if (trimmed.length > 500 && trimmed.includes('</html>')) {
                  finalHtml = trimmed
                }
              },
              onError: () => {
                // Fall through with original if refinement fails
              },
            },
            signal,
          )
        }

        if (signal?.aborted) return
        const code = parseGeneratedCode(finalHtml)
        callbacks.onComplete(code)
      } catch (error) {
        if (signal?.aborted) return
        callbacks.onError(error instanceof Error ? error : new Error('Failed to parse generated code'))
      }
    },
    onError: callbacks.onError,
  }, signal)
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

function parseGeneratedCode(response: string): GeneratedCode {
  let html = response.trim()

  // Strip markdown fences — handle variants like ```html, ``` html, ```HTML
  html = html.replace(/^```[\w\s]*\n?/i, '').replace(/\n?```\s*$/i, '').trim()

  // Extract <!DOCTYPE html>...</html> block if there's surrounding prose
  const doctypeMatch = html.match(/<!DOCTYPE html>[\s\S]*<\/html>/i)
  const htmlTagMatch = html.match(/<html[\s\S]*<\/html>/i)
  if (doctypeMatch) {
    html = doctypeMatch[0]
  } else if (htmlTagMatch) {
    html = htmlTagMatch[0]
  }

  // If still no valid HTML structure, wrap in a base template
  if (!html.includes('<html') && !html.includes('<!DOCTYPE')) {
    html = wrapInTemplate(html)
  }

  // Extract CSS and JS sections
  const cssMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi)
  const jsMatch = html.match(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi)

  const css = cssMatch
    ? cssMatch.map((s) => s.replace(/<\/?style[^>]*>/gi, '')).join('\n')
    : ''

  const js = jsMatch
    ? jsMatch.map((s) => s.replace(/<\/?script[^>]*>/gi, '')).join('\n')
    : ''

  // Detect dependencies
  const dependencies: string[] = []
  if (html.includes('chart.js') || html.includes('Chart(')) {
    dependencies.push('chart.js')
  }
  if (html.includes('datatables')) {
    dependencies.push('datatables')
  }

  return {
    html: extractBodyContent(html),
    css,
    js,
    fullHtml: html,
    dependencies,
  }
}

function extractBodyContent(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) {
    return bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '').trim()
  }
  return html
}

function wrapInTemplate(content: string): string {
  const styleTags = ADMINLTE_CDN_STYLES.map(
    (href) => `  <link rel="stylesheet" href="${href}">`,
  ).join('\n')
  const scriptTags = ADMINLTE_CDN_SCRIPTS.map(
    (src) => `<script src="${src}"></script>`,
  ).join('\n')
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Generated Dashboard</title>
${styleTags}
</head>
<body class="hold-transition sidebar-mini">
<div class="wrapper">
  ${content}
</div>
${scriptTags}
</body>
</html>`
}

// Wraps Chart.js so a missing canvas doesn't crash the page. We inject this
// into both the preview and the export so they behave identically.
const RUNTIME_GUARD_SCRIPT = `<script>
  // Make Chart.js tolerant of missing canvases — silently skip instead of throwing.
  document.addEventListener('DOMContentLoaded', function() {
    if (window.Chart && !window.Chart.__guardInstalled) {
      var OriginalChart = window.Chart;
      function GuardedChart(ctx, config) {
        if (!ctx) { console.warn('Chart: canvas element not found'); return null; }
        try { return new OriginalChart(ctx, config); }
        catch (e) { console.warn('Chart initialisation error:', e); return null; }
      }
      GuardedChart.prototype = OriginalChart.prototype;
      Object.keys(OriginalChart).forEach(function(k) { GuardedChart[k] = OriginalChart[k]; });
      GuardedChart.__guardInstalled = true;
      window.Chart = GuardedChart;
    }
    // Disable AdminLTE IFrame plugin (it crashes on some sample markup).
    if (window.$ && window.$.fn && window.$.fn.IFrame) {
      window.$.fn.IFrame = function() { return this; };
    }
  });
</script>`

// Inject the runtime guard into a complete document, before </body>. Used by
// both createPreviewHtml and the export pipeline.
export function injectRuntimeGuard(html: string): string {
  if (!html || typeof html !== 'string') return html
  if (html.includes('__guardInstalled')) return html
  if (html.includes('</body>')) {
    return html.replace('</body>', RUNTIME_GUARD_SCRIPT + '\n</body>')
  }
  if (html.includes('</head>')) {
    return html.replace('</head>', RUNTIME_GUARD_SCRIPT + '\n</head>')
  }
  return html + '\n' + RUNTIME_GUARD_SCRIPT
}

export function createPreviewHtml(code: GeneratedCode): string {
  const html = code?.fullHtml
  if (!html || typeof html !== 'string') return ''
  return injectRuntimeGuard(html)
}

