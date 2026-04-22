import type { LLMConfig, LLMMessage } from './llm-client'
import { generateCompletion } from './llm-client'
import type { RAGEngine } from './rag-engine'

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
You are an expert AdminLTE 3 dashboard developer. You write complete, production-ready HTML files using AdminLTE 3, Bootstrap 4, Chart.js, and Font Awesome 6. Every file you output runs correctly in a browser without modification.
</role>

<output_format>
Output ONLY raw HTML — no markdown, no explanation, no code fences, no preamble.
The very first character of your response must be < from <!DOCTYPE html>.
The very last character must be > from </html>.
</output_format>

<core_principles>
1. MODULARITY — compose atomic elements into components into layouts:
   primitives (buttons, badges, icons) → components (cards, info-boxes, tables) → patterns (dashboard rows, CRUD tables) → layout (sidebar + navbar + content-wrapper)

2. CONSISTENCY — same spacing (Bootstrap utilities), same color tokens (bg-primary / bg-success / bg-warning / bg-danger / bg-info), same icon family (Font Awesome 6: fas / far / fab)

3. RESPONSIVENESS — Bootstrap grid mobile-first: col-xl-* / col-lg-* / col-md-* / col-sm-* / col-*

4. COMPLETENESS — every canvas referenced in JS must exist in HTML; every function must be defined; no TODO or placeholder code
</core_principles>

<html_rules>
- Group related sections with comments: <!-- Stats Row -->, <!-- Main Chart -->, <!-- Device Table -->
- Semantic IDs on JS targets: id="temperatureChart", id="deviceTable"
- 2-space indentation throughout
- Use realistic sample data relevant to the domain — never "Lorem ipsum" or generic placeholders
</html_rules>

<css_rules>
- Prefer AdminLTE/Bootstrap utility classes over custom CSS
- Custom CSS only for truly unique requirements, in a single <style> block inside <head>
</css_rules>

<javascript_rules>
- All scripts go before </body>
- Initialize after DOM ready ($(function() { ... }) or DOMContentLoaded)
- Check canvas/element existence before initializing: const ctx = document.getElementById('myChart'); if (ctx) { new Chart(ctx, ...) }
- Use descriptive variable names; add comments for complex logic
- Include proper try/catch where appropriate
</javascript_rules>

<component_patterns>
Stats row: info-box or small-box in col-lg-3 col-md-6 col-12 grid
Charts: Card wrapper with optional time-range controls + Chart.js canvas
Tables: DataTables or styled Bootstrap table with search, pagination, badge status, action buttons
Forms: form-group wrappers, input-group icons, validation feedback, buttons in card-footer
</component_patterns>

<constraints>
NEVER:
- Output markdown code fences (\`\`\`html or \`\`\`)
- Add text before <!DOCTYPE html> or after </html>
- Use placeholder text (lorem ipsum, "Sample text", "Content here")
- Leave incomplete, broken, or TODO code
- Mix Bootstrap 3 and Bootstrap 4 classes
- Reference a chart canvas ID in JS without a matching element in HTML

ALWAYS:
- Use CDN links for all libraries (AdminLTE 3.2, Bootstrap 4.6, jQuery 3.6, Chart.js latest, FA 6)
- Make all interactive elements functional with realistic data
- Guard every Chart.js initialization with an element existence check
- Close every HTML tag
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
Review the following AdminLTE dashboard HTML and fix ALL issues from this checklist:

<checklist>
1. If <div class="wrapper"> is empty or missing key sections, FILL IT with:
   - main-header navbar, main-sidebar with nav items, content-header with title+breadcrumb,
   - a row of 4 info-box/small-box widgets with realistic metrics,
   - at least one Chart.js <canvas> with realistic sample data and full init code,
   - at least one data table with 5+ realistic rows,
   - main-footer.
2. Every Chart.js canvas referenced in JavaScript (getElementById / querySelector) must have a matching element in HTML with that exact id
3. No unclosed HTML tags — every <div>, <section>, <tbody> etc. must be closed
4. No truncated or incomplete JavaScript — every function body must be complete
5. No placeholder text ("Lorem ipsum", "Sample", "TODO", "Content here")
6. The document must end with </body></html> — not cut off mid-element
7. All interactive controls (buttons, toggles, filters) must have functional JS handlers
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

  return { isComplete: issues.length === 0, issues }
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
6. At least ONE data table (Bootstrap or DataTables) with 5+ realistic rows of sample data and status badges.
7. A main-footer.
The <div class="wrapper"> MUST NOT be empty. Every section above is REQUIRED.
</mandatory_sections>`.trim()

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
  // Get relevant context from RAG — topK=4 (was 6) to keep the window smaller.
  let context = ''
  if (ragEngine.isReady) {
    try {
      context = await ragEngine.getContext(prompt, 4)
      context = truncateContext(context, MAX_RAG_CONTEXT_CHARS)
    } catch {
      // Continue without context if RAG fails
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
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Generated Dashboard</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/css/adminlte.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="hold-transition sidebar-mini">
<div class="wrapper">
  ${content}
</div>
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/js/adminlte.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</body>
</html>`
}

export function createPreviewHtml(code: GeneratedCode): string {
  const disableIFrameScript = `
<script>
  // Disable AdminLTE IFrame plugin to prevent errors
  window.addEventListener('load', function() {
    if (window.$ && $.fn.IFrame) {
      $.fn.IFrame = function() { return this; };
    }
  });
  
  // Wrap chart initialization to be safer
  document.addEventListener('DOMContentLoaded', function() {
    if (window.Chart) {
      var originalChart = window.Chart;
      window.Chart = function(ctx, config) {
        if (!ctx) {
          console.warn('Chart: canvas element not found');
          return null;
        }
        try {
          return new originalChart(ctx, config);
        } catch (e) {
          console.warn('Chart initialization error:', e);
          return null;
        }
      };
      window.Chart.prototype = originalChart.prototype;
      Object.keys(originalChart).forEach(function(key) {
        window.Chart[key] = originalChart[key];
      });
    }
  });
</script>
`

  let html = code?.fullHtml
  if (!html || typeof html !== 'string') return ''

  if (html.includes('</head>')) {
    html = html.replace('</head>', disableIFrameScript + '</head>')
  } else if (html.includes('</body>')) {
    html = html.replace('</body>', disableIFrameScript + '</body>')
  }

  return html
}

