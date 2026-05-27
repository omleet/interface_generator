import type { LLMConfig, LLMMessage } from './llm-client'
import { generateCompletion } from './llm-client'
import type { StreamlitRAGEngine } from './streamlit-rag-engine'
import type { ExamplesRAGEngine } from './streamlit-examples-rag-engine'
import { getComponentContext, detectRequiredComponents } from './streamlit-components-knowledge'

// ─── Generation Cache ─────────────────────────────────────────────────────────
// Caches completed generations in localStorage keyed by hash(prompt + model).
// Avoids redundant LLM calls for identical prompts during development/testing.
// Cache entries expire after CACHE_TTL_MS (default: 2 hours).

const CACHE_PREFIX = 'igcache_py_'
const CACHE_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

interface CacheEntry {
  code: GeneratedPythonCode
  ts: number
}

function hashKey(prompt: string, model: string): string {
  // Simple djb2-style hash — good enough for a local cache key
  let h = 5381
  const s = prompt + '|' + model
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i)
    h = h >>> 0 // keep 32-bit unsigned
  }
  return h.toString(36)
}

function cacheGet(prompt: string, model: string): GeneratedPythonCode | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + hashKey(prompt, model))
    if (!raw) return null
    const entry: CacheEntry = JSON.parse(raw)
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + hashKey(prompt, model))
      return null
    }
    return entry.code
  } catch {
    return null
  }
}

function cacheSet(prompt: string, model: string, code: GeneratedPythonCode): void {
  try {
    const entry: CacheEntry = { code, ts: Date.now() }
    localStorage.setItem(CACHE_PREFIX + hashKey(prompt, model), JSON.stringify(entry))
  } catch {
    // localStorage might be full or unavailable — silently ignore
  }
}

/** Clears all cached Python generations (call from settings/debug UI if needed) */
export function clearGenerationCache(): void {
  try {
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(CACHE_PREFIX)) toRemove.push(k)
    }
    toRemove.forEach((k) => localStorage.removeItem(k))
  } catch {
    // ignore
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeneratedPythonCode {
  /** The complete Python source code (app.py) */
  python: string
  /** requirements.txt content */
  requirements: string
}

export interface PythonGenerationCallbacks {
  onToken: (token: string) => void
  onComplete: (code: GeneratedPythonCode) => void
  onError: (error: Error) => void
  onRefinementStart?: () => void
  /** Called when the validator finds issues before each refinement pass.
   *  The UI can display these as warnings, even if they are auto-corrected. */
  onValidationIssues?: (issues: string[], pass: number) => void
}

export interface PythonPlanCallbacks {
  onToken: (token: string) => void
  onComplete: (plan: string) => void
  onError: (error: Error) => void
}

// ─── System prompts ───────────────────────────────────────────────────────────

const PYTHON_SYSTEM_PROMPT = `You are an expert Streamlit developer. Output ONLY raw Python code — no markdown fences, no explanation.
First line MUST be an import. Use Streamlit EXCLUSIVELY (no Flask, Gradio, Dash, FastAPI).

STRUCTURE (always follow this order):
  import streamlit as st; import pandas as pd; import plotly.express as px  # + others as needed
  st.set_page_config(page_title='...', page_icon='📊', layout='wide')       # MUST be first st.* call
  DATA = [{'col': val, ...}, ...]                                             # inline realistic data
  df = pd.DataFrame(DATA)
  with st.sidebar: st.header('Filters'); filter_val = st.selectbox(...)      # navigation + filters
  st.title('...'); st.caption('...')
  col1,col2,col3,col4 = st.columns(4); col1.metric('KPI','value','+delta')   # 4 KPI metrics
  tab1,tab2 = st.tabs(['📈 Charts','📋 Data'])
  with tab1: fig = px.bar(df,...); st.plotly_chart(fig, use_container_width=True)
  with tab2: st.dataframe(df, use_container_width=True, hide_index=True)

API RULES (violations raise errors at runtime):
- Widgets inside loops or tabs MUST have unique key=: st.button('X', key=f'btn_{i}')
- px.bar/line/area/pie + categorical color → color_discrete_map={} or color_discrete_sequence=px.colors.qualitative.Set2
- px.scatter + numeric color → color_continuous_scale='Blues'  (NEVER mix these)
- color_discrete_sequence= must be a LIST, never a string like 'Set2'
- All px.* column args (x=,y=,color=,size=) must exist in the DataFrame
- df.map() not applymap(); pd.concat() not df.append(); st.rerun() not experimental_rerun()
- Pandas freq: 'h','min','s','ME','YE','QE' — never 'H','T','A','M','Q'
- global keyword only inside def blocks — never at module level
- st.form_submit_button() only inside with st.form(): block
- Every st.button() must trigger a visible action (st.success/toast/balloons)
- Session state: always guard reads: if 'key' not in st.session_state: st.session_state.key = default

QUALITY:
- 6–10 rows of realistic domain-specific data in every dataframe
- No TODO, no placeholder, no Lorem ipsum — complete working app only
- No "if __name__ == '__main__':" block

EXAMPLE (Sales Dashboard):
import streamlit as st
import pandas as pd
import plotly.express as px

st.set_page_config(page_title='Sales Dashboard', page_icon='📊', layout='wide')

ORDERS = [
    {'id':1,'customer':'Acme Corp','product':'Server Rack','amount':4200,'status':'Delivered'},
    {'id':2,'customer':'Globex Ltd','product':'Workstation','amount':1850,'status':'Pending'},
    {'id':3,'customer':'Initech','product':'Network Switch','amount':3100,'status':'Shipped'},
    {'id':4,'customer':'Umbrella','product':'Storage Array','amount':7600,'status':'Delivered'},
    {'id':5,'customer':'Cyberdyne','product':'GPU Cluster','amount':12400,'status':'Processing'},
    {'id':6,'customer':'Stark Industries','product':'UPS System','amount':5300,'status':'Delivered'},
]
MONTHLY = pd.DataFrame({'Month':['Jan','Feb','Mar','Apr','May','Jun'],'Revenue':[12500,18300,15600,21200,19800,24100],'Orders':[42,61,53,70,66,80]})
df = pd.DataFrame(ORDERS)

with st.sidebar:
    st.title('📊 Dashboard'); st.divider()
    status_filter = st.selectbox('Status', ['All','Delivered','Pending','Shipped','Processing'], key='status')
    if st.button('🎉 Celebrate!', key='celebrate'): st.balloons()

st.title('Sales Dashboard'); st.caption('Real-time overview')
c1,c2,c3,c4 = st.columns(4)
c1.metric('Revenue','$81,550','+14%'); c2.metric('Orders','124','+6%')
c3.metric('Delivered','89','+9%'); c4.metric('Avg Order','$658','+7%')

tab1,tab2 = st.tabs(['📈 Charts','📋 Orders'])
with tab1:
    ca,cb = st.columns(2)
    with ca:
        fig1 = px.bar(MONTHLY, x='Month', y='Revenue', title='Monthly Revenue', color='Revenue', color_continuous_scale='Blues')
        st.plotly_chart(fig1, use_container_width=True)
    with cb:
        sc = df['status'].value_counts().reset_index(); sc.columns=['Status','Count']
        fig2 = px.pie(sc, names='Status', values='Count', title='By Status')
        st.plotly_chart(fig2, use_container_width=True)
with tab2:
    filtered = df if status_filter=='All' else df[df['status']==status_filter]
    st.dataframe(filtered, use_container_width=True, hide_index=True)
    st.caption(f'{len(filtered)} of {len(df)} orders')`

// ─── Refinement prompt ────────────────────────────────────────────────────────

const PYTHON_REFINEMENT_SYSTEM_PROMPT = `<role>
You are a senior Streamlit code reviewer and debugger. You receive a Python/Streamlit application that may have runtime errors and must return a fully corrected version that runs without errors.
Output ONLY the corrected Python code — no markdown, no explanations, no code fences.
</role>

<output_format>
Output ONLY raw Python code. The first line must be an import statement (e.g. import streamlit as st).
NEVER output markdown fences (triple backticks). NEVER add explanations before or after the code.
</output_format>

<critical_rules>
- Return the COMPLETE file — never truncate or summarise sections.
- Do NOT change logic, data, or layout that is not broken. Only fix the reported issues.
- If a third-party component is used (st_folium, AgGrid, st_echarts, option_menu, etc.) keep its exact API — do not replace it with a core Streamlit widget.
- Every widget that appears more than once must have a unique key= argument.
- st.set_page_config() must be the VERY FIRST st.* call in the file.
- All dict keys must be properly quoted: {'name': 'John'} not {'name: 'John'}.
- Parentheses, brackets, and braces must balance across the whole file.
</critical_rules>`

function buildPythonRefinementUserMessage(
  code: string,
  issues: string[],
  componentsContext?: string,
  originalPrompt?: string,
): string {
  const issueList = issues.length > 0
    ? issues.map((i, n) => `${n + 1}. ${i}`).join('\n')
    : 'None detected by static analysis — do a full review anyway.'

  const componentSection = componentsContext
    ? `\n<third_party_component_apis>\n${componentsContext}\n</third_party_component_apis>\n`
    : ''

  const promptSection = originalPrompt
    ? `\n<original_user_request>\n${originalPrompt.trim()}\n</original_user_request>\nThe fixed code must still fulfil the original request above. Do not change logic or layout that is already correct — only fix the reported issues.\n`
    : ''

  return `<task>
Fix ALL runtime errors and API misuse in the following Streamlit Python application.
The static analyser found these issues:
${issueList}
${promptSection}${componentSection}
Also check and fix EVERY item in this checklist:

<checklist>
IMPORTS & STRUCTURE:
1. First line must be "import streamlit as st".
2. "import pandas as pd" and "import plotly.express as px" must be present if used.
3. st.set_page_config() must be the VERY FIRST st.* call — before any st.title(), st.sidebar, etc.
4. No "if __name__ == '__main__':" block needed.

API CALL SIGNATURES (fix any mismatch):
5. st.metric(label='...', value='...', delta='...') — all keyword arguments.
6. st.columns(N) returns a list; unpack: col1, col2 = st.columns(2).
7. st.dataframe(df, use_container_width=True) — pass a DataFrame, not a list.
8. st.selectbox(label, options=[...]) — options must be a list; first item is the default.
9. st.plotly_chart(fig, use_container_width=True) — fig must be a plotly Figure object.
10. st.form_submit_button() must be called INSIDE a st.form() context.
11. st.session_state — initialise every key with "if 'key' not in st.session_state:" before reading it.

COMPLETENESS:
12. Every st.button() must have an if-block that does something (st.success, st.toast, st.balloons).
13. No TODO, placeholder, or incomplete stub code.
14. Every st.dataframe() must have at least 5 realistic rows.
15. Every plotly chart must have realistic data from a DataFrame.

PYTHON SYNTAX (the code MUST parse — fix every one of these):
16. Every dict key must have a matching closing quote: write {'name': 'John'} — NEVER {'name: 'John'} (missing closing quote on the key is a frequent bug; check every dict literal).
17. Every opening ' or " must have a matching closing quote of the same kind before the next : , } ] or newline.
18. f-strings (f"..." / f'...') must have balanced braces and balanced quotes.
19. Triple-quoted strings must be closed with the same triple sequence they opened with.
20. Parentheses (), brackets [], and braces {} must balance across the whole file.
21. Do a final pass: mentally run ast.parse() on the file — if it would raise SyntaxError, fix the line.

CURRENT API (replace any removed/deprecated symbol — they raise AttributeError at runtime):
22. Replace Styler.applymap(...) with .map(...) — applymap was removed from Styler in pandas 2.1+.
23. Replace DataFrame.applymap(...) with DataFrame.map(...) — deprecated in pandas 2.1+.
24. Replace df.append(...) with pd.concat([df, other], ignore_index=True) — DataFrame.append was removed in pandas 2.0.
25. Replace st.experimental_rerun() with st.rerun(); replace st.experimental_*_query_params() with st.query_params.

UNIQUE WIDGET KEYS (Streamlit raises StreamlitDuplicateElementId when two widgets of the same type get the same auto-ID):
25a. PLOTLY COLUMN EXISTENCE (raises ValueError at runtime):
    - Before every px.* call, verify that ALL column names passed to x=, y=, color=, size=, hover_data=, facet_col=, facet_row=, animation_frame=, text=, and any other column-referencing argument actually exist in the DataFrame.
    - Check against df.columns immediately before the chart call.
    - If a column name was invented or mis-spelled, either correct it to the real column name that exists in the DataFrame, or remove the argument.
    - Never reference a column that is not present in the DataFrame passed to the chart; Plotly will raise ValueError: Value of 'x' is not the name of a column.
    - Pattern to follow: define the DataFrame first, then reference only its actual column names in the px.* call.

25b. PLOTLY COLOR PARAMETER MISMATCH (raises TypeError at runtime):
    - If color='SomeColumn' where the column contains strings/categories: use color_discrete_sequence= or color_discrete_map=. NEVER color_continuous_scale=.
    - If color='SomeColumn' where the column contains numbers: use color_continuous_scale=. NEVER color_discrete_sequence= or color_discrete_map=.
    - px.bar, px.line, px.area, px.box, px.violin, px.pie always need color_discrete_* when color= is used.
    - Fix by inspecting the DataFrame column values near the px.* call and choosing the correct parameter.
    - NEVER pass a palette name as a plain string to color_discrete_sequence= — it must be a list. Wrong: color_discrete_sequence='Set2'. Right: color_discrete_sequence=px.colors.qualitative.Set2 or color_discrete_sequence=['#e74c3c', '#2ecc71'].

25c. NEVER use \`global\` outside a def body. If the generated code has \`global x\` inside an if/for/while block, remove the statement (at module level all names are already global) or move the mutable value into st.session_state.

25d. PANDAS FREQUENCY ALIASES (raises FutureWarning / ValueError in pandas 2.2+):
    - NEVER use the deprecated aliases: 'H' (hour), 'T' (minute), 'S' (second), 'A' (year-end), 'BM', 'CBM', 'SM'.
    - ALWAYS use the current aliases: 'h' (hour), 'min' (minute), 's' (second), 'ms' (millisecond), 'YE' (year-end), 'ME' (month-end), 'QE' (quarter-end).
    - Applies everywhere a frequency string is passed: pd.date_range(freq=), df.resample(rule=), pd.Grouper(freq=), pd.period_range(freq=), etc.
    - Quick mapping: 'H'→'h', 'T'→'min', 'S'→'s', 'A'→'YE', 'M'→'ME', 'Q'→'QE'.

26. EVERY st.button, st.download_button, st.checkbox, st.radio, st.selectbox, st.multiselect, st.slider, st.select_slider, st.text_input, st.text_area, st.number_input, st.date_input, st.time_input, st.file_uploader, st.color_picker, st.toggle and st.form_submit_button MUST have a unique key='...' argument. If the same widget type appears more than once in the file (same label or not), each occurrence needs a distinct key.
27. Buttons inside loops MUST use a key derived from the loop variable, e.g. st.button('Edit', key=f'edit_{row["id"]}').
</checklist>

Return the complete corrected Python. Start immediately with the first import line.
</task>

<code_to_fix>
${code}
</code_to_fix>`
}

// ─── Validation ───────────────────────────────────────────────────────────────

interface PythonValidationResult {
  isComplete: boolean
  issues: string[]
}

function validatePython(code: string): PythonValidationResult {
  const issues: string[] = []

  if (!code.includes('import streamlit')) {
    issues.push('Missing Streamlit import (import streamlit as st)')
  }

  if (!code.includes('st.set_page_config(')) {
    issues.push('Missing st.set_page_config() call')
  }

  const lines = code.split('\n')
  let firstStCall = -1
  let pageConfigLine = -1
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (pageConfigLine === -1 && trimmed.includes('st.set_page_config(')) {
      pageConfigLine = i
    }
    if (
      firstStCall === -1 &&
      /st\.(title|header|subheader|markdown|write|sidebar|columns|tabs|metric|dataframe|button|selectbox)/.test(trimmed) &&
      !trimmed.includes('st.set_page_config')
    ) {
      firstStCall = i
    }
  }
  if (pageConfigLine > -1 && firstStCall > -1 && firstStCall < pageConfigLine) {
    issues.push('st.set_page_config() must be called BEFORE any other st.* call')
  }

  if (code.includes('```')) {
    issues.push('Output contains markdown code fences — must be stripped')
  }

  if (/\bTODO\b|\bFIXME\b|\bplaceholder\b/i.test(code)) {
    issues.push('Contains TODO, FIXME, or placeholder text')
  }

  const forbidden = [
    'from nicegui', 'import nicegui',
    'import flask', 'from flask',
    'import gradio', 'from gradio',
    'import dash', 'from dash',
    'import panel', 'from panel',
  ]
  for (const f of forbidden) {
    if (code.toLowerCase().includes(f)) {
      issues.push(`Forbidden framework import: ${f}`)
    }
  }

  const sessionStateReads = code.match(/st\.session_state\.(\w+)/g) || []
  const sessionStateInits = code.match(/['"]\w+['"]\s+(?:not\s+)?in\s+st\.session_state/g) || []
  if (sessionStateReads.length > 0 && sessionStateInits.length === 0) {
    issues.push('st.session_state keys are read without an initialisation guard (if "key" not in st.session_state:)')
  }

  issues.push(...detectPythonSyntaxIssues(code))
  issues.push(...detectDeprecatedApis(code))
  issues.push(...detectDuplicateWidgetKeys(code))
  issues.push(...detectGlobalOutsideDef(code))
  issues.push(...detectPlotlyColorMismatch(code))
  issues.push(...detectThirdPartyApiMisuse(code))
  issues.push(...detectRuntimePatternIssues(code))

  return { isComplete: issues.length === 0, issues }
}


// ─── Plotly color mismatch detection ─────────────────────────────────────────
// Catches the common LLM mistake of using color_continuous_scale= with a
// categorical column, or color_discrete_sequence= with a numeric column.
// These both cause TypeError at runtime in plotly.express.
function detectPlotlyColorMismatch(code: string): string[] {
  const issues: string[] = []
  const calls = findPxCalls(code)

  for (const { fn, argsStart, argsEnd } of calls) {
    const args = code.slice(argsStart, argsEnd)
    const colorM = /\bcolor\s*=\s*(['"])(\w[\w\s]*?)\1/.exec(args)
    if (!colorM) continue

    const colName = colorM[2]
    const hasCont = /\bcolor_continuous_scale\s*=/.test(args)
    const hasDiscSeq = /\bcolor_discrete_sequence\s*=/.test(args)
    const hasDiscMap = /\bcolor_discrete_map\s*=/.test(args)

    if (!hasCont && !hasDiscSeq && !hasDiscMap) continue

    const colType = inferColumnType(colName, code)
    const isDiscreteFn = DISCRETE_ONLY_PX_FUNCS.has(fn)

    if ((colType === 'categorical' || (colType === 'unknown' && isDiscreteFn)) && hasCont) {
      issues.push(
        `px.${fn}() uses color='${colName}' (categorical/text) with color_continuous_scale= — ` +
        `this raises TypeError. Use color_discrete_sequence= or color_discrete_map= instead.`,
      )
    }
    if (colType === 'numeric' && (hasDiscSeq || hasDiscMap) && !hasCont) {
      issues.push(
        `px.${fn}() uses color='${colName}' (numeric) with color_discrete_sequence=/color_discrete_map= — ` +
        `use color_continuous_scale='Blues' (or another named scale) instead.`,
      )
    }
  }

  return issues
}

// ─── global-outside-def detection ────────────────────────────────────────────
// Detects `global` statements at module level (inside if/for/while/try blocks
// but NOT inside def bodies). These raise SyntaxWarning in Python 3.12+ and
// are semantically meaningless — module-level names are already global.
function detectGlobalOutsideDef(code: string): string[] {
  const issues: string[] = []
  const lines = code.split('\n')
  const badLines: number[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const stripped = line.trim()
    if (!stripped.startsWith('global ')) continue

    const indent = line.length - line.trimStart().length
    let inDef = false
    for (let j = i - 1; j >= 0; j--) {
      const prev = lines[j]
      const prevStripped = prev.trim()
      if (!prevStripped) continue
      const prevIndent = prev.length - prev.trimStart().length
      if (prevIndent < indent) {
        inDef = /^def\s+\w+/.test(prevStripped)
        break
      }
    }

    if (!inDef) badLines.push(i + 1)
  }

  if (badLines.length > 0) {
    issues.push(
      `'global' keyword used outside a def block on line(s): ${badLines.slice(0, 5).join(', ')}. ` +
      `'global' is only valid inside function bodies — at module level all names are already global. Remove the statement.`,
    )
  }

  return issues
}


// Catches common LLM mistakes when generating code that uses third-party
// community components whose APIs are not in the official llms.txt.
function detectThirdPartyApiMisuse(code: string): string[] {
  const issues: string[] = []
  if (code.includes('st_folium') && !code.includes('folium.Map')) {
    issues.push('Uses st_folium() but no folium.Map() is created. st_folium() requires a folium.Map instance as its first argument.')
  }
  if (code.includes('AgGrid(') && !/(pd\.DataFrame|read_csv|read_excel|read_json)/.test(code)) {
    issues.push('Uses AgGrid() but no DataFrame is visible. AgGrid() requires a pandas DataFrame as its first argument.')
  }
  if (code.includes('st_echarts(') && !code.includes("'series'") && !code.includes('"series"')) {
    issues.push("Uses st_echarts() but the options dict has no 'series' key. ECharts options must include a 'series' array.")
  }
  if (code.includes('option_menu(') && !code.includes('options=')) {
    issues.push("Uses option_menu() without an 'options=' argument. option_menu() requires options=['...'] as a keyword argument.")
  }
  if (code.includes('agraph(') && (!code.includes('nodes=') || !code.includes('edges='))) {
    issues.push('Uses agraph() without nodes= or edges=. agraph() requires both nodes=[Node(...)] and edges=[Edge(...)] keyword arguments.')
  }
  if (code.includes('st.pydeck_chart(') && !code.includes('pdk.Deck(')) {
    issues.push('Uses st.pydeck_chart() but no pdk.Deck() is created. st.pydeck_chart() requires a pdk.Deck instance.')
  }
  return issues
}

// ─── Runtime pattern issues ────────────────────────────────────────────
// Catches patterns that pass syntax checks but fail at runtime.
function detectRuntimePatternIssues(code: string): string[] {
  const issues: string[] = []

  // st.form_submit_button outside a st.form context manager
  if (code.includes('st.form_submit_button(') && !code.includes('st.form(')) {
    issues.push('st.form_submit_button() is used without a st.form() context manager. Wrap the form content in "with st.form(key=\'...\'): ..."')
  }

  // Unguarded st.rerun() that can cause infinite loops
  if (
    (code.match(/st\.rerun\(\)/g) || []).length > 2 &&
    !code.includes('if ') &&
    !code.includes('elif ')
  ) {
    issues.push('Multiple st.rerun() calls without conditional guards — may cause an infinite rerun loop. Wrap each st.rerun() in an if/elif condition.')
  }

  // DataFrame column reference mismatch for inline constructors
  const dfConstructors = [...code.matchAll(/pd\.DataFrame\(\{([^}]{1,400})\}/g)]
  for (const m of dfConstructors) {
    const keys = [...m[1].matchAll(/['"]([A-Za-z_]\w*)['"]\s*:/g)].map((k) => k[1])
    if (keys.length === 0) continue
    const nearby = code.slice(m.index!, m.index! + 600)
    const refs = [...nearby.matchAll(/(?:groupby|sort_values|pivot|pivot_table)\(['"]([A-Za-z_]\w*)['"]\)/g)].map((r) => r[1])
    for (const ref of refs) {
      if (!keys.includes(ref)) {
        issues.push(`DataFrame column '${ref}' referenced but not in the DataFrame constructor. Available: ${keys.join(', ')}.`)
      }
    }
  }

  // st.download_button inside a loop without f-string key
  if (
    /for\s+\w+\s+in\s+[\w.()]+:\s*[\s\S]{0,200}st\.download_button/.test(code) &&
    !/st\.download_button\([^)]*key\s*=\s*f['"]/.test(code)
  ) {
    issues.push("st.download_button() inside a loop must use an f-string key= derived from the loop variable, e.g. key=f'download_{i}'.")
  }

  return issues
}

// ─── Duplicate widget detection ───────────────────────────────────────────────
// Streamlit raises StreamlitDuplicateElementId when two widgets of the same
// type are created with identical parameters and no explicit `key=`. We scan
// each widget call, hash its first positional arg (label) + presence of key,
// and flag any (type, label) pair that appears more than once without unique keys.
const WIDGET_FUNCS = [
  'button', 'download_button', 'link_button', 'checkbox', 'radio', 'selectbox',
  'multiselect', 'slider', 'select_slider', 'text_input', 'text_area',
  'number_input', 'date_input', 'time_input', 'file_uploader', 'color_picker',
  'toggle', 'form_submit_button', 'camera_input', 'chat_input',
]

interface WidgetCall {
  fn: string
  start: number
  end: number     // index just after closing ')'
  argsStart: number
  argsEnd: number
  hasKey: boolean
  label: string
}

function findWidgetCalls(code: string): WidgetCall[] {
  const calls: WidgetCall[] = []
  const re = new RegExp(`(?:st|[A-Za-z_]\\w*)\\.(${WIDGET_FUNCS.join('|')})\\s*\\(`, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(code))) {
    const fn = m[1]
    const argsStart = m.index + m[0].length
    // Find matching close paren, tracking strings + brackets
    let depth = 1
    let i = argsStart
    let inStr: string | null = null
    let strTriple = false
    while (i < code.length && depth > 0) {
      const c = code[i]
      if (inStr) {
        if (c === '\\') { i += 2; continue }
        if (strTriple && code.slice(i, i + 3) === inStr) { i += 3; inStr = null; strTriple = false; continue }
        if (!strTriple && c === inStr) { inStr = null; i++; continue }
        i++; continue
      }
      if (c === '#') { while (i < code.length && code[i] !== '\n') i++; continue }
      if (c === '"' || c === "'") {
        if (code.slice(i, i + 3) === c.repeat(3)) { inStr = c.repeat(3); strTriple = true; i += 3; continue }
        inStr = c; i++; continue
      }
      if (c === '(' || c === '[' || c === '{') depth++
      else if (c === ')' || c === ']' || c === '}') depth--
      i++
    }
    const argsEnd = i - 1
    const args = code.slice(argsStart, argsEnd)
    const hasKey = /(?:^|[,(\s])key\s*=/.test(args)
    // Extract first positional arg as label (string literal if possible)
    const labelMatch = args.match(/^\s*([fr]?['"])([^'"]*)\1/)
    const label = labelMatch ? labelMatch[2] : args.split(',')[0].trim().slice(0, 40)
    calls.push({ fn, start: m.index, end: i, argsStart, argsEnd, hasKey, label })
  }
  return calls
}

function detectDuplicateWidgetKeys(code: string): string[] {
  const calls = findWidgetCalls(code)
  const groups = new Map<string, WidgetCall[]>()
  for (const c of calls) {
    if (c.hasKey) continue
    const sig = `${c.fn}::${c.label}`
    if (!groups.has(sig)) groups.set(sig, [])
    groups.get(sig)!.push(c)
  }
  const issues: string[] = []
  for (const [sig, list] of groups) {
    if (list.length > 1) {
      const [fn, label] = sig.split('::')
      issues.push(
        `Duplicate st.${fn}(...) with label "${label}" appears ${list.length} times without unique key= — will raise StreamlitDuplicateElementId. Add a unique key='...' to each occurrence.`,
      )
    }
  }

  // Also detect duplicate EXPLICIT key= string values — e.g. key='save_btn'
  // appearing in two different tabs/columns. These are not caught above because
  // hasKey=true skips them, but Streamlit still raises StreamlitDuplicateElementKey.
  const explicitKeyCounts = new Map<string, number>()
  const keyPattern = /\bkey\s*=\s*(['"])([^'"]+)\1/g
  let km: RegExpExecArray | null
  while ((km = keyPattern.exec(code)) !== null) {
    const val = km[2]
    explicitKeyCounts.set(val, (explicitKeyCounts.get(val) ?? 0) + 1)
  }
  for (const [keyVal, count] of explicitKeyCounts) {
    if (count > 1) {
      issues.push(
        `Explicit key='${keyVal}' appears ${count} times — will raise StreamlitDuplicateElementKey. Each widget key must be globally unique; rename duplicate occurrences (e.g. '${keyVal}_2', '${keyVal}_3').`,
      )
    }
  }

  return issues
}

// ─── Deprecated / removed API detection ───────────────────────────────────────
// Catches calls that worked on older pandas/streamlit but raise AttributeError
// or DeprecationWarning on current releases. The autoFixCommonErrors pass
// rewrites the easy cases (.applymap → .map); anything left here means the
// generated code still references a removed symbol and should be refined.
function detectDeprecatedApis(code: string): string[] {
  const issues: string[] = []

  if (/\.applymap\s*\(/.test(code)) {
    issues.push(
      "Uses removed pandas API '.applymap(...)' — on Styler it was removed in pandas 2.1; on DataFrame it is deprecated. Use '.map(...)' instead.",
    )
  }
  if (/\bdf\.append\s*\(/.test(code) || /\)\.append\s*\(\s*\{/.test(code)) {
    issues.push(
      "Uses removed pandas API 'DataFrame.append(...)' (removed in pandas 2.0). Use 'pd.concat([df, other], ignore_index=True)' instead.",
    )
  }
  if (/st\.experimental_rerun\s*\(/.test(code)) {
    issues.push("Uses removed Streamlit API 'st.experimental_rerun()'. Use 'st.rerun()' instead.")
  }
  if (/st\.experimental_(get|set)_query_params\s*\(/.test(code)) {
    issues.push("Uses removed Streamlit API 'st.experimental_*_query_params()'. Use 'st.query_params' instead.")
  }

  return issues
}

// ─── Python syntax validation ─────────────────────────────────────────────────
// Lightweight static checks that catch the most common LLM-introduced syntax
// errors (unclosed quotes in dict keys, unbalanced brackets, broken f-strings)
// without actually running a Python parser.

function detectPythonSyntaxIssues(code: string): string[] {
  const issues: string[] = []
  const rawLines = code.split('\n')

  // 1) Unclosed quote in dict keys: { 'name: 'John' } or , "name: "John"
  //    A well-formed key always closes its quote before the colon. We flag any
  //    occurrence of `<quote><identifier>:` where the closing quote is missing.
  const dictKeyBug = /(?:[{,(]|^)\s*(['"])([A-Za-z_]\w*)\s*:(?!=)/gm
  const dictKeyOffenders = new Set<number>()
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]
    // Skip pure comment lines
    if (/^\s*#/.test(line)) continue
    dictKeyBug.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = dictKeyBug.exec(line)) !== null) {
      const quote = m[1]
      const key = m[2]
      // A well-formed key would be `'name':` — so the substring `<quote><key><quote>:` would match.
      const wellFormed = `${quote}${key}${quote}`
      const colonIdx = m.index + m[0].length - 1
      const before = line.slice(0, colonIdx).trimEnd()
      if (!before.endsWith(wellFormed)) {
        dictKeyOffenders.add(i + 1)
      }
    }
  }
  if (dictKeyOffenders.size > 0) {
    const sample = [...dictKeyOffenders].slice(0, 5).join(', ')
    issues.push(
      `Unclosed quote in dict key (missing closing ' or " before ":"), e.g. {'name: 'John'} — check line(s): ${sample}`,
    )
  }

  // 2) Per-line quote balance (single + double), ignoring escapes and comments.
  //    Triple quotes span multiple lines, so we track them across the file.
  let inTripleSingle = false
  let inTripleDouble = false
  const quoteOffenders: number[] = []
  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i]

    // Strip line comments outside of strings (rough — good enough for QC)
    if (!inTripleSingle && !inTripleDouble) {
      const hashIdx = findUnquotedHash(line)
      if (hashIdx !== -1) line = line.slice(0, hashIdx)
    }

    // Walk the line and toggle triple-quote state
    let j = 0
    let singles = 0
    let doubles = 0
    while (j < line.length) {
      const c = line[j]
      const next3 = line.slice(j, j + 3)
      if (!inTripleDouble && next3 === "'''") {
        inTripleSingle = !inTripleSingle
        j += 3
        continue
      }
      if (!inTripleSingle && next3 === '"""') {
        inTripleDouble = !inTripleDouble
        j += 3
        continue
      }
      if (inTripleSingle || inTripleDouble) {
        j += 1
        continue
      }
      if (c === '\\') {
        j += 2
        continue
      }
      if (c === "'") singles += 1
      else if (c === '"') doubles += 1
      j += 1
    }
    if (!inTripleSingle && !inTripleDouble) {
      if (singles % 2 !== 0 || doubles % 2 !== 0) {
        quoteOffenders.push(i + 1)
      }
    }
  }
  if (quoteOffenders.length > 0) {
    issues.push(
      `Unbalanced single/double quotes on line(s): ${quoteOffenders.slice(0, 5).join(', ')}`,
    )
  }
  if (inTripleSingle || inTripleDouble) {
    issues.push('Unclosed triple-quoted string somewhere in the file')
  }

  // 3) Global bracket balance (excludes contents inside strings/comments,
  //    approximated by stripping them line by line).
  const stripped = stripStringsAndComments(code)
  const counts = { '(': 0, ')': 0, '[': 0, ']': 0, '{': 0, '}': 0 } as Record<string, number>
  for (const ch of stripped) {
    if (ch in counts) counts[ch] += 1
  }
  if (counts['('] !== counts[')']) {
    issues.push(`Unbalanced parentheses: ${counts['(']} '(' vs ${counts[')']} ')'`)
  }
  if (counts['['] !== counts[']']) {
    issues.push(`Unbalanced brackets: ${counts['[']} '[' vs ${counts[']']} ']'`)
  }
  if (counts['{'] !== counts['}']) {
    issues.push(`Unbalanced braces: ${counts['{']} '{' vs ${counts['}']} '}'`)
  }

  return issues
}

function findUnquotedHash(line: string): number {
  let inS = false
  let inD = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '\\') { i += 1; continue }
    if (!inD && c === "'") inS = !inS
    else if (!inS && c === '"') inD = !inD
    else if (!inS && !inD && c === '#') return i
  }
  return -1
}

function stripStringsAndComments(code: string): string {
  let out = ''
  let i = 0
  let inS = false
  let inD = false
  let inTS = false
  let inTD = false
  while (i < code.length) {
    const c = code[i]
    const next3 = code.slice(i, i + 3)
    if (!inS && !inD && !inTD && next3 === "'''") { inTS = !inTS; i += 3; continue }
    if (!inS && !inD && !inTS && next3 === '"""') { inTD = !inTD; i += 3; continue }
    if (inTS || inTD) { i += 1; continue }
    if (c === '\\') { i += 2; continue }
    if (!inD && c === "'") { inS = !inS; i += 1; continue }
    if (!inS && c === '"') { inD = !inD; i += 1; continue }
    if (inS || inD) { i += 1; continue }
    if (c === '#') {
      // skip to end of line
      while (i < code.length && code[i] !== '\n') i += 1
      continue
    }
    out += c
    i += 1
  }
  return out
}

// ─── Post-processing ──────────────────────────────────────────────────────────

function stripCodeFences(code: string): string {
  let out = code.replace(/^```[\w\s]*\n?/i, '')
  out = out.replace(/\n?```\s*$/i, '')
  return out.trim()
}

function stripPreamble(code: string): string {
  const firstImport = code.search(/^(import streamlit|import pandas|import plotly|#)/m)
  if (firstImport > 0) {
    return code.slice(firstImport).trim()
  }
  return code
}

// ─── Fix: global keyword outside def ─────────────────────────────────────────
// Python only allows `global` inside function bodies (def blocks). When the LLM
// emits `global x` inside an if/for/while block at module level it produces a
// SyntaxWarning on Python 3.12+ that can become a hard error. At module level
// every name is already global, so the statement is unnecessary and can be safely
// removed. We keep the line as a comment so the intent is visible.
function fixGlobalOutsideDef(code: string): string {
  const lines = code.split('\n')
  const result: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const stripped = line.trim()

    if (!stripped.startsWith('global ')) {
      result.push(line)
      continue
    }

    const indent = line.length - line.trimStart().length

    // Walk backwards to find the nearest enclosing block at lower indent.
    // If that block is a `def`, the global statement is valid — keep it.
    let inDef = false
    for (let j = i - 1; j >= 0; j--) {
      const prev = lines[j]
      const prevStripped = prev.trim()
      if (!prevStripped) continue                  // skip blank lines
      const prevIndent = prev.length - prev.trimStart().length
      if (prevIndent < indent) {
        inDef = /^def\s+\w+/.test(prevStripped)
        break
      }
    }

    if (inDef) {
      result.push(line)                            // valid inside def — keep
    } else {
      // Module-level global is invalid/redundant — comment it out
      result.push(line.replace(stripped, `# (removed invalid global) ${stripped}`))
    }
  }

  return result.join('\n')
}

// ─── Fix: duplicate explicit widget keys ─────────────────────────────────────
// The LLM sometimes emits key='save_btn' in two separate tabs or columns.
// Streamlit raises StreamlitDuplicateElementKey when the same key string
// appears more than once. We rename duplicate occurrences by appending _2, _3…
function fixDuplicateExplicitKeys(code: string): string {
  const seen = new Map<string, number>()
  return code.replace(
    /(\bkey\s*=\s*)(['"])([^'"]+)\2/g,
    (_match, prefix, quote, keyVal) => {
      const count = (seen.get(keyVal) ?? 0) + 1
      seen.set(keyVal, count)
      if (count > 1) {
        return `${prefix}${quote}${keyVal}_${count}${quote}`
      }
      return `${prefix}${quote}${keyVal}${quote}`
    },
  )
}


// ─── Fix: missing Python imports ─────────────────────────────────────────────
// Scans the generated code for known usage patterns (pd., px., np., etc.) and
// injects the corresponding import line when it is missing. Runs first in the
// post-processing pipeline so downstream checks have correct imports.
const IMPORT_RULES: Array<[RegExp, string]> = [
  [/\bst\./, 'import streamlit as st'],
  [/\bpd\./, 'import pandas as pd'],
  [/\bpx\./, 'import plotly.express as px'],
  [/\bgo\./, 'import plotly.graph_objects as go'],
  [/\bnp\./, 'import numpy as np'],
  [/\balt\./, 'import altair as alt'],
  [/\bplt\./, 'import matplotlib.pyplot as plt'],
  [/(?<!\.)random\./, 'import random'],
  [/\bjson\./, 'import json'],
  [/\bdatetime\./, 'import datetime'],
  [/(?<!\.)time\.(?:sleep|time|strftime)\b/, 'import time'],
  [/\bmath\./, 'import math'],
  [/\bos\.(?:path|environ|listdir|getcwd)\b/, 'import os'],
  [/\bcalendar\./, 'import calendar'],
  [/\bcsv\./, 'import csv'],
  [/\bio\.(?:BytesIO|StringIO)\b/, 'import io'],
  [/\bbase64\./, 'import base64'],
  [/\bcollections\.(?:Counter|defaultdict|OrderedDict)\b/, 'import collections'],
  [/\bitertools\./, 'import itertools'],
  [/\bfunctools\./, 'import functools'],
  [/\bPath\s*\(/, 'from pathlib import Path'],
  [/(?<!\w)re\.(?:search|match|findall|sub|compile)\b/, 'import re'],
]

function ensureRequiredImports(code: string): string {
  const lines = code.split('\n')

  const existingImports = new Set<string>()
  for (const line of lines) {
    const s = line.trim()
    if (s.startsWith('import ') || s.startsWith('from ')) existingImports.add(s)
  }

  // Use non-import code for pattern matching to avoid matching import lines themselves
  const nonImportCode = lines
    .filter((l) => { const s = l.trim(); return !s.startsWith('import ') && !s.startsWith('from ') })
    .join('\n')

  const missing: string[] = []
  for (const [pattern, importLine] of IMPORT_RULES) {
    if (existingImports.has(importLine)) continue
    if (!pattern.test(nonImportCode)) continue
    const moduleName = importLine.split(/\s+/)[1].split('.')[0]
    const alreadyPresent = [...existingImports].some((imp) => imp.includes(moduleName))
    if (!alreadyPresent) missing.push(importLine)
  }

  if (missing.length === 0) return code

  let lastImportIdx = -1
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i].trim()
    if (s.startsWith('import ') || s.startsWith('from ')) lastImportIdx = i
  }

  const insertAt = lastImportIdx >= 0 ? lastImportIdx + 1 : 0
  lines.splice(insertAt, 0, ...missing)
  return lines.join('\n')
}

// ─── Fix: Plotly Express color parameter compatibility ────────────────────────
// TypeError: px.bar() got unexpected keyword argument 'color_continuous_scale'
// occurs when color= points to a categorical (string) column.
// color_continuous_scale → only valid for NUMERIC color columns.
// color_discrete_sequence / color_discrete_map → only valid for CATEGORICAL columns.

const DISCRETE_ONLY_PX_FUNCS = new Set([
  'bar', 'line', 'area', 'box', 'violin', 'strip', 'histogram',
  'pie', 'funnel', 'timeline', 'ecdf',
])

function findPxCalls(code: string): Array<{ fn: string; argsStart: number; argsEnd: number }> {
  const calls: Array<{ fn: string; argsStart: number; argsEnd: number }> = []
  const re = /\bpx\.(\w+)\s*\(/g
  let m: RegExpExecArray | null
  while ((m = re.exec(code)) !== null) {
    const fn = m[1]
    const argsStart = m.index + m[0].length
    let depth = 1
    let i = argsStart
    let inStr: string | null = null
    while (i < code.length && depth > 0) {
      const c = code[i]
      if (inStr) {
        if (c === '\\') { i += 2; continue }
        if (code.slice(i, i + inStr.length) === inStr) { i += inStr.length; inStr = null; continue }
        i++; continue
      }
      if (c === '"' || c === "'") {
        const triple = code.slice(i, i + 3)
        inStr = (triple === '"""' || triple === "'''") ? triple : c
        i += inStr.length; continue
      }
      if (c === '(') depth++
      else if (c === ')') depth--
      i++
    }
    calls.push({ fn, argsStart, argsEnd: i - 1 })
  }
  return calls
}

function inferColumnType(colName: string, code: string): 'categorical' | 'numeric' | 'unknown' {
  const escaped = colName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pat = new RegExp(`['"]${escaped}['"]\\s*:\\s*\\[([^\\]]+)\\]`)
  const m = pat.exec(code)
  if (!m) return 'unknown'
  const values = m[1].trim()
  if (/['"][^'"]+['"]/.test(values)) return 'categorical'
  if (/\b\d+\.?\d*\b/.test(values) && !/['"]/.test(values)) return 'numeric'
  return 'unknown'
}

function fixColorParams(
  args: string,
  fn: string,
  colType: 'categorical' | 'numeric' | 'unknown',
): string {
  const hasCont = /\bcolor_continuous_scale\s*=/.test(args)
  const hasDiscSeq = /\bcolor_discrete_sequence\s*=/.test(args)
  const hasDiscMap = /\bcolor_discrete_map\s*=/.test(args)

  if (!hasCont && !hasDiscSeq && !hasDiscMap) return args

  const treatAsDiscrete =
    colType === 'categorical' ||
    (colType === 'unknown' && DISCRETE_ONLY_PX_FUNCS.has(fn))
  const treatAsContinuous = colType === 'numeric'

  if (treatAsDiscrete && hasCont) {
    if (!hasDiscSeq && !hasDiscMap) {
      args = args.replace(
        /\bcolor_continuous_scale\s*=\s*(['"][\w_]+['"]|\w+)/,
        "color_discrete_sequence=px.colors.qualitative.Set2",
      )
    } else {
      args = args.replace(/,?\s*\bcolor_continuous_scale\s*=\s*(['"][\w_]+['"]|\w+)/, '')
    }
  } else if (treatAsContinuous && hasDiscSeq && !hasCont) {
    args = args.replace(
      /\bcolor_discrete_sequence\s*=\s*(\[[^\]]+\]|\w+)/,
      "color_continuous_scale='Blues'",
    )
  } else if (treatAsContinuous && hasDiscMap && !hasCont) {
    args = args.replace(
      /\bcolor_discrete_map\s*=\s*(\{[^}]+\}|\w+)/,
      "color_continuous_scale='Blues'",
    )
  } else if (!treatAsDiscrete && !treatAsContinuous && hasCont && hasDiscSeq) {
    args = args.replace(/,?\s*\bcolor_continuous_scale\s*=\s*(['"][\w_]+['"]|\w+)/, '')
  }

  return args
}

function fixPlotlyColorArgs(code: string): string {
  const calls = findPxCalls(code)
  if (calls.length === 0) return code

  let result = code
  for (let ci = calls.length - 1; ci >= 0; ci--) {
    const { fn, argsStart, argsEnd } = calls[ci]
    const argsText = result.slice(argsStart, argsEnd)
    const colorM = /\bcolor\s*=\s*(['"])([\w\s]+)\1/.exec(argsText)
    if (!colorM) continue
    const colName = colorM[2]
    const colType = inferColumnType(colName, result)
    const fixedArgs = fixColorParams(argsText, fn, colType)
    if (fixedArgs !== argsText) {
      result = result.slice(0, argsStart) + fixedArgs + result.slice(argsEnd)
    }
  }

  return result
}


// ─── Bracket-aware use_container_width injector ───────────────────────────────
// Finds every call to `fnName(...)` and, if it lacks `use_container_width`,
// appends `, use_container_width=True` before the closing paren.
// Unlike a simple \w+ regex this handles inline expressions as first argument:
//   st.plotly_chart(px.bar(df, x='a', y='b'), key='k')  →  adds kwarg correctly
function injectUseContainerWidth(code: string, fnName: string): string {
  const escapedFn = fnName.replace(/\./g, '\\.')
  const re = new RegExp(`${escapedFn}\\s*\\(`, 'g')
  let result = code
  let offset = 0
  let m: RegExpExecArray | null
  const pattern = new RegExp(escapedFn + '\\s*\\(', 'g')
  while ((m = pattern.exec(code)) !== null) {
    const callStart = m.index + offset
    const argsStart = callStart + m[0].length
    // Walk forward with bracket depth to find the matching close paren
    let depth = 1
    let i = argsStart
    let inStr: string | null = null
    while (i < result.length && depth > 0) {
      const c = result[i]
      if (inStr) {
        if (c === '\\') { i += 2; continue }
        if (result.slice(i, i + inStr.length) === inStr) { i += inStr.length; inStr = null; continue }
        i++; continue
      }
      if (c === '"' || c === "'") {
        const triple = result.slice(i, i + 3)
        inStr = (triple === '"""' || triple === "'''") ? triple : c
        i += inStr.length; continue
      }
      if (c === '(' || c === '[' || c === '{') depth++
      else if (c === ')' || c === ']' || c === '}') depth--
      i++
    }
    const closeIdx = i - 1 // index of the matching ')'
    const argsText = result.slice(argsStart, closeIdx)

    // Skip if already has use_container_width
    if (/use_container_width/.test(argsText)) continue
    // Skip empty calls — no arguments at all
    if (argsText.trim() === '') continue

    const insertion = ', use_container_width=True'
    result = result.slice(0, closeIdx) + insertion + result.slice(closeIdx)
    offset += insertion.length
  }
  return result
}

function autoFixCommonErrors(code: string): string {
  let out = code

  // 1. Inject any missing standard imports (pd., np., px., etc.) first so that
  //    downstream checks operate on syntactically complete import blocks.
  out = ensureRequiredImports(out)

  // Remove NiceGUI/other framework imports
  out = out.replace(/^from nicegui import.*$/gm, '')
  out = out.replace(/^import nicegui.*$/gm, '')

  // Remove if __name__ == '__main__': blocks (not needed in Streamlit)
  out = out.replace(/^if __name__\s+(?:==|in)\s+[^:]+:\s*\n([ \t]+.*\n?)*/gm, '')

  // Fix deprecated pandas API:
  //   Styler.applymap()    → Styler.map()        (removed in pandas 2.1+)
  //   DataFrame.applymap() → DataFrame.map()     (deprecated in pandas 2.1+)
  // Both spellings are safely rewritten to `.map(`.
  out = out.replace(/\.applymap\(/g, '.map(')

  // Fix deprecated pandas frequency aliases (pandas 2.2+ raises FutureWarning/ValueError).
  // Only replace when the alias appears as a complete quoted string value, e.g. freq='H'
  // or rule="T", to avoid touching unrelated strings that happen to contain these letters.
  out = out.replace(/(?<=freq\s*=\s*['"])H(?=['"])/g, 'h')
  out = out.replace(/(?<=freq\s*=\s*['"])T(?=['"])/g, 'min')
  out = out.replace(/(?<=freq\s*=\s*['"])S(?=['"])/g, 's')
  out = out.replace(/(?<=freq\s*=\s*['"])A(?=['"])/g, 'YE')
  out = out.replace(/(?<=freq\s*=\s*['"])M(?=['"])/g, 'ME')
  out = out.replace(/(?<=freq\s*=\s*['"])Q(?=['"])/g, 'QE')
  out = out.replace(/(?<=rule\s*=\s*['"])H(?=['"])/g, 'h')
  out = out.replace(/(?<=rule\s*=\s*['"])T(?=['"])/g, 'min')
  out = out.replace(/(?<=rule\s*=\s*['"])S(?=['"])/g, 's')
  out = out.replace(/(?<=rule\s*=\s*['"])A(?=['"])/g, 'YE')
  out = out.replace(/(?<=rule\s*=\s*['"])M(?=['"])/g, 'ME')
  out = out.replace(/(?<=rule\s*=\s*['"])Q(?=['"])/g, 'QE')

  // Fix color_discrete_sequence='SomePaletteName' (string instead of list).
  // Converts the bare string to the corresponding px.colors.qualitative list, or a
  // safe default, so Plotly doesn't iterate over individual characters as colours.
  out = out.replace(
    /\bcolor_discrete_sequence\s*=\s*['"](\w+)['"]/g,
    (match, name) => {
      const knownQualitative = new Set([
        'Plotly','D3','G10','T10','Alphabet','Dark24','Light24',
        'Set1','Set2','Set3','Pastel1','Pastel2','Paired',
        'Antique','Bold','Pastel','Prism','Safe','Vivid',
      ])
      if (knownQualitative.has(name)) {
        return `color_discrete_sequence=px.colors.qualitative.${name}`
      }
      // Unknown string — replace with a safe default list
      return `color_discrete_sequence=px.colors.qualitative.Set2`
    },
  )

  // Fix st.plotly_chart / st.dataframe missing use_container_width=True.
  // Uses a bracket-aware parser instead of a simple \w+ regex so it also
  // handles inline expressions like st.plotly_chart(px.bar(...), ...).
  out = injectUseContainerWidth(out, 'st.plotly_chart')
  out = injectUseContainerWidth(out, 'st.dataframe')

  // 2. Fix Plotly Express color= / color_*_scale mismatches before refinement.
  out = fixPlotlyColorArgs(out)

  // Remove `global` statements outside def bodies — invalid at module level
  // in Python 3.12+ and never needed (module-level names are already global).
  out = fixGlobalOutsideDef(out)

  // Inject unique key='...' into every widget call that lacks one.
  // Prevents StreamlitDuplicateElementId at runtime.
  out = injectUniqueWidgetKeys(out)

  // Rename duplicate explicit key= values (same string in multiple widgets).
  // Must run AFTER injectUniqueWidgetKeys so auto-injected keys are also covered.
  out = fixDuplicateExplicitKeys(out)

  return out
}

function injectUniqueWidgetKeys(code: string): string {
  const calls = findWidgetCalls(code)
  if (calls.length === 0) return code
  // Process from last to first so indices stay valid
  const counters = new Map<string, number>()
  let out = code
  for (let i = calls.length - 1; i >= 0; i--) {
    const c = calls[i]
    if (c.hasKey) continue
    const n = (counters.get(c.fn) ?? 0) + 1
    counters.set(c.fn, n)
    // Build a stable unique key
    const slug = (c.label || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 32) || 'auto'
    const keyVal = `auto_${c.fn}_${slug}_${c.start}`
    const argsStr = out.slice(c.argsStart, c.argsEnd)
    const trimmed = argsStr.replace(/\s*$/, '')
    const sep = trimmed.length === 0 ? '' : (trimmed.endsWith(',') ? ' ' : ', ')
    const newArgs = trimmed + sep + `key='${keyVal}'`
    out = out.slice(0, c.argsStart) + newArgs + out.slice(c.argsEnd)
  }
  return out
}

function amplifyPythonPrompt(prompt: string): string {
  const trimmed = prompt.trim()
  const isShort = trimmed.split(/\s+/).length < 15

  const mandatorySections = `
<mandatory_sections>
The Streamlit app MUST include ALL of the following, filled with realistic, domain-specific data:
1. st.set_page_config() as the very first st.* call.
2. A sidebar with at least one filter (st.selectbox or st.radio) and a title.
3. At least 4 KPI metric boxes using st.metric() in a st.columns() row.
4. At least TWO plotly charts (px.bar, px.line, px.pie, or px.scatter) shown with st.plotly_chart().
5. At least ONE st.dataframe() with 6+ realistic rows and use_container_width=True.
6. At least one interactive st.button() with a visible result (st.success, st.toast, or st.balloons).
7. Use st.tabs() to organise content into sections.
</mandatory_sections>`.trim()

  if (!isShort) {
    return `${trimmed}\n\n${mandatorySections}`
  }

  return `${trimmed}

<inference_guidance>
The request above is intentionally brief. Infer sensible, domain-specific defaults and build a complete, rich Streamlit application. Choose realistic metric names, units, ranges, and data that match the domain.
</inference_guidance>

${mandatorySections}`
}

const MAX_RAG_CONTEXT_CHARS = 6000

function truncateContext(context: string, maxChars: number): string {
  if (context.length <= maxChars) return context
  const truncated = context.slice(0, maxChars)
  const lastSectionEnd = truncated.lastIndexOf('\n---\n')
  const cutAt = lastSectionEnd > maxChars * 0.5 ? lastSectionEnd : truncated.lastIndexOf('\n\n')
  return (cutAt > 0 ? truncated.slice(0, cutAt) : truncated) + '\n\n# [context truncated]'
}

// ─── Planning ─────────────────────────────────────────────────────────────────

const PYTHON_PLANNING_SYSTEM_PROMPT = `<role>
You are an expert Streamlit application architect. Your job is to produce a clear, structured implementation plan for a Streamlit Python application BEFORE any code is written.
</role>

<output_format>
Output a concise, structured plan in plain text (no markdown code fences, no Python). Use numbered sections and bullet points. Cover:

1. OVERVIEW — one sentence describing the app's purpose.
2. PAGE CONFIG — page_title, page_icon, layout setting.
3. SIDEBAR — navigation/filter widgets and what they control.
4. KPI METRICS — list each st.metric() with label, sample value, and delta.
5. CHARTS — for each chart: type (bar/line/pie/scatter), title, x-axis, y-axis, and sample data description.
6. TABLES — for each dataframe: title, column headers, row count, and what each row represents.
7. INTERACTIVITY — buttons, forms, and what they trigger.
8. COLOUR/STYLE — plotly color_continuous_scale or color_discrete_map choices.
9. DATA — confirm all data is realistic and domain-specific, built from inline Python lists.
</output_format>

<constraints>
- Streamlit ONLY.
- Do not propose any other web framework (Flask, Gradio, Dash, etc.).
</constraints>`

const PYTHON_PLAN_AMENDMENT_SYSTEM_PROMPT = `<role>
You are an expert Streamlit application architect acting as a plan editor. You receive an existing structured implementation plan and a user instruction describing what to change. Apply ONLY the requested change and return the complete updated plan.
</role>

<rules>
1. Identify which numbered section(s) the instruction refers to.
2. Modify ONLY the section(s) explicitly mentioned. Leave all others unchanged.
3. Return the COMPLETE plan — all sections, in order.
4. No commentary, preamble, or explanation — output the plan text only.
5. Maintain numbered sections and bullet points format.
</rules>`

export async function generatePythonPlan(
  prompt: string,
  config: LLMConfig,
  ragEngine: StreamlitRAGEngine | null,
  callbacks: PythonPlanCallbacks,
  signal?: AbortSignal,
  examplesEngine?: ExamplesRAGEngine | null,
): Promise<void> {
  let context = ''
  if (ragEngine?.isReady) {
    try {
      context = ragEngine.getContext(prompt, 3)
      context = truncateContext(context, 4000)
    } catch {
      // plan without context is still useful
    }
  }

  let examplesContext = ''
  if (examplesEngine?.isReady) {
    try {
      examplesContext = examplesEngine.getContext(prompt, 1)
      examplesContext = truncateContext(examplesContext, 3000)
    } catch {
      // non-fatal
    }
  }

  const messages: LLMMessage[] = [
    { role: 'system', content: PYTHON_PLANNING_SYSTEM_PROMPT },
  ]

  const combinedContext = [
    context && `<api_reference>\n${context}\n</api_reference>`,
    examplesContext && `<working_examples>\n${examplesContext}\n</working_examples>`,
  ]
    .filter(Boolean)
    .join('\n\n')

  if (combinedContext) {
    messages.push({
      role: 'user',
      content: `<domain_context>\n${combinedContext}\n</domain_context>`,
    })
    messages.push({
      role: 'assistant',
      content: 'Understood. I have the API reference and working examples ready.',
    })
  }

  messages.push({
    role: 'user',
    content: `<request>
Create a comprehensive implementation plan for the following Streamlit Python application:

${prompt.trim()}
</request>

Write the plan now. Do not write any Python code — only the structured plan text.`,
  })

  let fullPlan = ''
  await generateCompletion(
    config,
    messages,
    {
      onToken: (token) => {
        fullPlan += token
        callbacks.onToken(token)
      },
      onComplete: () => {
        callbacks.onComplete(fullPlan.trim())
      },
      onError: callbacks.onError,
    },
    signal,
  )
}

export async function amendPythonPlan(
  instruction: string,
  currentPlan: string,
  config: LLMConfig,
  callbacks: PythonPlanCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const messages: LLMMessage[] = [
    { role: 'system', content: PYTHON_PLAN_AMENDMENT_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `<existing_plan>
${currentPlan.trim()}
</existing_plan>

<instruction>
${instruction.trim()}
</instruction>

Apply only the requested change. Return the complete updated plan now.`,
    },
  ]

  let fullPlan = ''
  await generateCompletion(
    config,
    messages,
    {
      onToken: (token) => {
        fullPlan += token
        callbacks.onToken(token)
      },
      onComplete: () => {
        callbacks.onComplete(fullPlan.trim())
      },
      onError: callbacks.onError,
    },
    signal,
  )
}

// ─── Main generation function ─────────────────────────────────────────────────

export async function generateStreamlit(
  prompt: string,
  config: LLMConfig,
  ragEngine: StreamlitRAGEngine | null,
  callbacks: PythonGenerationCallbacks,
  signal?: AbortSignal,
  examplesEngine?: ExamplesRAGEngine | null,
): Promise<void> {
  // ── Cache lookup ─────────────────────────────────────────────────────────
  const cached = cacheGet(prompt, config.model)
  if (cached) {
    console.debug('[generateStreamlit] cache hit — returning cached result')
    callbacks.onToken('// ✓ Loaded from cache\n')
    callbacks.onComplete(cached)
    return
  }

  let context = ''
  if (ragEngine?.isReady) {
    try {
      context = ragEngine.getContext(prompt, 8)
      context = truncateContext(context, MAX_RAG_CONTEXT_CHARS)
    } catch (err) {
      console.warn('[generateStreamlit] RAG lookup failed, generating without context:', err)
    }
  }

  // Fetch few-shot structural examples (top-2 most relevant working apps)
  let examplesContext = ''
  if (examplesEngine?.isReady) {
    try {
      examplesContext = examplesEngine.getContext(prompt, 2)
      examplesContext = truncateContext(examplesContext, 5000)
    } catch (err) {
      console.warn('[generateStreamlit] Examples RAG lookup failed:', err)
    }
  }

  const amplifiedPrompt = amplifyPythonPrompt(prompt)

  const messages: LLMMessage[] = [
    { role: 'system', content: PYTHON_SYSTEM_PROMPT },
  ]

  // Inject API reference first (what exists), then working examples (how to use it)
  if (context) {
    messages.push({
      role: 'user',
      content: `<domain_reference>\n${context}\n</domain_reference>`,
    })
    messages.push({
      role: 'assistant',
      content: 'Understood. I have the API reference ready.',
    })
  }

  if (examplesContext) {
    messages.push({
      role: 'user',
      content: `<working_examples>\n${examplesContext}\n</working_examples>`,
    })
    messages.push({
      role: 'assistant',
      content: 'Understood. I have working reference apps to guide the structure and patterns.',
    })
  }

  // Inject third-party component docs if the prompt implies non-core functionality
  const componentsContext = getComponentContext(prompt, 3)
  if (componentsContext) {
    messages.push({
      role: 'user',
      content: `<third_party_components>\n${componentsContext}\n</third_party_components>`,
    })
    messages.push({
      role: 'assistant',
      content: 'Understood. I have the third-party component APIs and working examples available.',
    })
  }

  messages.push({
    role: 'user',
    content: `<request>
Create a COMPLETE Streamlit Python application for the following requirements:

${amplifiedPrompt}
</request>

<reminder>
- Output ONLY raw Python code. No markdown fences. No explanations.
- First lines: import streamlit as st / import pandas as pd / import plotly.express as px
- Call st.set_page_config() FIRST, before any other st.* call.
- Use st.plotly_chart(fig, use_container_width=True) for all charts.
- Use st.dataframe(df, use_container_width=True, hide_index=True) for tables.
- Every st.button() must be inside an if block that does something visible.
- No "if __name__ == '__main__':" block.
</reminder>`,
  })

  let fullResponse = ''

  await generateCompletion(
    config,
    messages,
    {
      onToken: (token) => {
        fullResponse += token
        callbacks.onToken(token)
      },
      onComplete: async () => {
        if (signal?.aborted) return

        try {
          let finalCode = stripCodeFences(fullResponse.trim())
          finalCode = stripPreamble(finalCode)
          finalCode = autoFixCommonErrors(finalCode)

          const validation = validatePython(finalCode)

          if (!validation.isComplete && !signal?.aborted) {
            callbacks.onRefinementStart?.()
            callbacks.onValidationIssues?.(validation.issues, 1)

            // Fetch component docs relevant to the original prompt so the
            // refinement LLM knows the correct third-party APIs
            const refineComponentsCtx = getComponentContext(prompt, 2)

            // ── Pass 1 ──────────────────────────────────────────────────
            const pass1Messages: LLMMessage[] = [
              { role: 'system', content: PYTHON_REFINEMENT_SYSTEM_PROMPT },
              {
                role: 'user',
                content: buildPythonRefinementUserMessage(
                  finalCode,
                  validation.issues,
                  refineComponentsCtx || undefined,
                  prompt,
                ),
              },
            ]

            let pass1Response = ''
            await generateCompletion(
              config,
              pass1Messages,
              {
                onToken: (token) => {
                  pass1Response += token
                  callbacks.onToken(token)
                },
                onComplete: () => {
                  const candidate = autoFixCommonErrors(
                    stripPreamble(stripCodeFences(pass1Response.trim()))
                  )
                  if (candidate.length > 200 && candidate.includes('import streamlit')) {
                    finalCode = candidate
                  }
                },
                onError: () => { /* fall through with auto-fixed original */ },
              },
              signal,
            )

            // ── Validate pass-1 result; run pass 2 only if still broken ──
            if (!signal?.aborted) {
              const pass1Validation = validatePython(finalCode)
              const remainingIssues = pass1Validation.issues.filter(
                (iss) => !validation.issues.includes(iss)
                  ? true                            // new issue introduced
                  : !pass1Validation.isComplete,    // old issue not fixed
              )

              // Log refinement outcome for debugging (visible in browser console)
              console.debug(
                '[refinement] pass-1 result:',
                pass1Validation.isComplete ? 'CLEAN' : `${pass1Validation.issues.length} issue(s) remain`,
                pass1Validation.issues,
              )

              if (!pass1Validation.isComplete && !signal?.aborted) {
                callbacks.onValidationIssues?.(pass1Validation.issues, 2)
                // ── Pass 2 — focused on remaining issues only ─────────
                const pass2Messages: LLMMessage[] = [
                  { role: 'system', content: PYTHON_REFINEMENT_SYSTEM_PROMPT },
                  {
                    role: 'user',
                    content: buildPythonRefinementUserMessage(
                      finalCode,
                      pass1Validation.issues,
                      refineComponentsCtx || undefined,
                      prompt,
                    ),
                  },
                ]

                let pass2Response = ''
                await generateCompletion(
                  config,
                  pass2Messages,
                  {
                    onToken: (token) => {
                      pass2Response += token
                      callbacks.onToken(token)
                    },
                    onComplete: () => {
                      const candidate2 = autoFixCommonErrors(
                        stripPreamble(stripCodeFences(pass2Response.trim()))
                      )
                      if (candidate2.length > 200 && candidate2.includes('import streamlit')) {
                        finalCode = candidate2
                      }
                    },
                    onError: () => { /* fall through with pass-1 result */ },
                  },
                  signal,
                )

                console.debug(
                  '[refinement] pass-2 result:',
                  validatePython(finalCode).isComplete ? 'CLEAN' : 'still has issues',
                )
              }
            }
          }

          if (signal?.aborted) return

          // buildRequirements already merges detectRequiredComponents internally
          const code = parsePythonCode(finalCode)
          // Persist to cache so identical prompts return instantly
          cacheSet(prompt, config.model, code)
          callbacks.onComplete(code)
        } catch (error) {
          if (signal?.aborted) return
          callbacks.onError(
            error instanceof Error ? error : new Error('Failed to parse generated Python code'),
          )
        }
      },
      onError: callbacks.onError,
    },
    signal,
  )
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

function parsePythonCode(raw: string): GeneratedPythonCode {
  const python = raw.trim()
  const requirements = buildRequirements(python)
  return { python, requirements }
}

// ─── Package detection rules ──────────────────────────────────────────────────
// Each entry: [import pattern, requirements.txt line]
// Ordered from most specific to most general to avoid false positives.
const PACKAGE_RULES: Array<[RegExp, string]> = [
  // Core data / viz
  [/import plotly|from plotly/, 'plotly>=5.0.0'],
  [/import altair|from altair/, 'altair>=5.0.0'],
  [/import numpy|from numpy/, 'numpy>=1.24.0'],
  [/import matplotlib|from matplotlib/, 'matplotlib>=3.7.0'],
  [/import seaborn|from seaborn/, 'seaborn>=0.13.0'],
  [/import scipy|from scipy/, 'scipy>=1.11.0'],
  // ML
  [/import sklearn|from sklearn/, 'scikit-learn>=1.3.0'],
  [/import xgboost|from xgboost/, 'xgboost>=2.0.0'],
  [/import lightgbm|from lightgbm/, 'lightgbm>=4.0.0'],
  [/import torch|from torch/, 'torch>=2.0.0'],
  [/import tensorflow|from tensorflow/, 'tensorflow>=2.13.0'],
  // HTTP / data
  [/import requests|from requests/, 'requests>=2.31.0'],
  [/import httpx|from httpx/, 'httpx>=0.25.0'],
  [/import aiohttp|from aiohttp/, 'aiohttp>=3.9.0'],
  [/import sqlalchemy|from sqlalchemy/, 'sqlalchemy>=2.0.0'],
  [/import pydantic|from pydantic/, 'pydantic>=2.0.0'],
  [/import openpyxl|from openpyxl/, 'openpyxl>=3.1.0'],
  [/import xlrd|from xlrd/, 'xlrd>=2.0.1'],
  [/import pyarrow|from pyarrow/, 'pyarrow>=14.0.0'],
  // Geo / maps
  [/import folium|from folium/, 'folium>=0.15.0'],
  [/import pydeck|from pydeck/, 'pydeck>=0.8.0'],
  // NLP
  [/import openai|from openai/, 'openai>=1.0.0'],
  [/import anthropic|from anthropic/, 'anthropic>=0.20.0'],
  [/from langchain|import langchain/, 'langchain>=0.1.0'],
  [/import tiktoken|from tiktoken/, 'tiktoken>=0.5.0'],
  // Utils
  [/import dotenv|from dotenv/, 'python-dotenv>=1.0.0'],
  [/import PIL|from PIL/, 'Pillow>=10.0.0'],
  [/import cv2|from cv2/, 'opencv-python>=4.8.0'],
  [/import yaml|from yaml/, 'PyYAML>=6.0'],
  [/import toml|from toml/, 'toml>=0.10.2'],
]

function buildRequirements(python: string): string {
  // Always include core deps
  const base: string[] = ['streamlit>=1.35.0', 'pandas>=2.0.0']

  // Detect standard library packages from import patterns
  const detected: string[] = []
  for (const [pattern, req] of PACKAGE_RULES) {
    if (pattern.test(python)) detected.push(req)
  }

  // Detect third-party Streamlit components (st_folium, AgGrid, etc.)
  // by cross-referencing the components knowledge base
  const componentReqs = detectRequiredComponents(python)

  // Merge all, deduplicating by package name prefix (before >=)
  const all = [...base, ...detected, ...componentReqs]
  const seen = new Map<string, string>()
  for (const line of all) {
    const pkg = line.split('>=')[0].split('==')[0].trim().toLowerCase()
    if (!seen.has(pkg)) seen.set(pkg, line)
  }

  return [...seen.values()].join('\n')
}
