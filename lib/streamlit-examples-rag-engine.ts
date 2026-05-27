// ---------------------------------------------------------------------------
// Streamlit Dashboard Examples RAG Engine
// ---------------------------------------------------------------------------
// Indexes curated, hand-crafted dashboard boilerplate examples
// (fetched via /api/streamlit-examples, which serves them inline).
//
// Each entry contains the full Python source of a complete Streamlit
// dashboard, making it ideal for few-shot prompting: the LLM sees real,
// tested patterns for KPI cards, Plotly charts, filterable tables,
// real-time monitors, multi-page admin panels, and financial dashboards.
//
// This engine is complementary to the streamlit-rag-engine (which indexes
// the official llms.txt API reference). Together they give the generator:
//   • llms.txt       → "what API exists and its signature"
//   • dashboard-examples → "how real dashboard apps are structured"
// ---------------------------------------------------------------------------

export interface ExampleEntry {
  title: string
  description: string
  content: string // full Python source
  format: 'py'
  url: string
  tags: string[]
}

export interface ExampleRAGResult {
  entry: ExampleEntry
  score: number
}

export interface ExampleRAGProgress {
  status: 'idle' | 'fetching' | 'indexing' | 'ready' | 'error'
  progress?: number
  message?: string
  indexedCount?: number
}

export type ExampleProgressCallback = (progress: ExampleRAGProgress) => void

export interface ExamplesRAGEngine {
  isReady: boolean
  indexedCount: number
  index: () => Promise<void>
  search: (query: string, topK?: number) => ExampleRAGResult[]
  getContext: (query: string, topK?: number) => string
}

// ---------------------------------------------------------------------------
// BM25 constants
// ---------------------------------------------------------------------------
const K1 = 1.5
const B = 0.75
const TITLE_BOOST = 2.5
const TAG_BOOST = 3.0

// ---------------------------------------------------------------------------
// Module-level singleton — persists across re-renders / hot reloads
// ---------------------------------------------------------------------------
let _docs: BM25Doc[] = []
let _avgDocLen = 0
let _idf: Map<string, number> = new Map()
let _isIndexed = false
let _indexedCount = 0

interface BM25Doc {
  entry: ExampleEntry
  tokens: string[]
  termFreq: Map<string, number>
  length: number
  titleTokens: Set<string>
  tagTokens: Set<string>
}

// ---------------------------------------------------------------------------
// Tokenizer — strips code noise (import lines, punctuation) for BM25
// ---------------------------------------------------------------------------
function tokenize(text: string): string[] {
  if (!text) return []
  return text
    .toLowerCase()
    .replace(/^import\s+\S+.*$/gm, ' ')     // strip bare import lines
    .replace(/^from\s+\S+\s+import.*$/gm, ' ') // strip from...import lines
    .replace(/[^a-z0-9_]+/g, ' ')
    .split(' ')
    .filter((t) => t.length >= 2 && t.length <= 50)
}

// ---------------------------------------------------------------------------
// BM25 index builder
// ---------------------------------------------------------------------------
function buildIndex(entries: ExampleEntry[]): void {
  _docs = entries.map((entry) => {
    // Weight: title + description + tags get extra emphasis; code is included
    // but treated as lower-signal (the tokenizer already strips import noise)
    const combined = [
      entry.title,
      entry.description,
      entry.tags.join(' '),
      entry.content,
    ].join(' ')
    const tokens = tokenize(combined)
    const termFreq = new Map<string, number>()
    for (const t of tokens) termFreq.set(t, (termFreq.get(t) ?? 0) + 1)

    return {
      entry,
      tokens,
      termFreq,
      length: tokens.length,
      titleTokens: new Set(tokenize(entry.title + ' ' + entry.description)),
      tagTokens: new Set(entry.tags.map((t) => t.toLowerCase())),
    }
  })

  _avgDocLen =
    _docs.length === 0 ? 0 : _docs.reduce((s, d) => s + d.length, 0) / _docs.length

  // IDF
  const docFreq = new Map<string, number>()
  for (const d of _docs) {
    for (const term of new Set(d.tokens)) {
      docFreq.set(term, (docFreq.get(term) ?? 0) + 1)
    }
  }
  const N = _docs.length
  _idf = new Map()
  for (const [term, df] of docFreq) {
    _idf.set(term, Math.log((N - df + 0.5) / (df + 0.5) + 1))
  }

  _isIndexed = true
  _indexedCount = _docs.length
}

function bm25Score(queryTokens: string[], doc: BM25Doc): number {
  let score = 0
  for (const q of queryTokens) {
    const termIdf = _idf.get(q)
    if (termIdf === undefined) continue

    const tf = doc.termFreq.get(q) ?? 0
    if (tf > 0) {
      const norm =
        (tf * (K1 + 1)) /
        (tf + K1 * (1 - B + B * (_avgDocLen === 0 ? 1 : doc.length / _avgDocLen)))
      score += termIdf * norm
    }

    // Boost for title/description match
    if (doc.titleTokens.has(q)) score += termIdf * TITLE_BOOST
    // Boost for explicit tag match
    if (doc.tagTokens.has(q)) score += termIdf * TAG_BOOST
  }
  return score
}

// ---------------------------------------------------------------------------
// Portuguese → English expansion (mirrors streamlit-rag-engine.ts)
// ---------------------------------------------------------------------------
const PT_EN: Array<[RegExp, string]> = [
  // Dashboard / visualização
  [/\bdashboard\b/gi, 'dashboard admin panel overview'],
  [/\bpainel\b/gi, 'dashboard admin panel'],
  [/\brelat[oó]rio\b/gi, 'dashboard report chart metrics'],
  [/\bm[eé]trica|indicador\b/gi, 'metric kpi indicator'],
  [/\bgr[aá]fico\b/gi, 'chart plotly bar line scatter'],
  [/\btabela|dados\b/gi, 'table dataframe filter data'],
  [/\bfiltro\b/gi, 'filter sidebar selectbox multiselect slider'],
  [/\bvendas\b/gi, 'sales revenue kpi metric'],
  [/\breceita\b/gi, 'revenue financial kpi'],
  // Charts
  [/\bbarras?\b/gi, 'bar chart bar_chart plotly'],
  [/\blinha|linhas\b/gi, 'line chart line_chart plotly'],
  [/\bpizza|torta|donut\b/gi, 'pie donut chart plotly'],
  [/\bdispers[aã]o\b/gi, 'scatter plot plotly'],
  [/\bcandlestick|vela\b/gi, 'candlestick ohlc financial plotly'],
  [/\bhist[oó]grama\b/gi, 'histogram distribution plotly'],
  [/\bmapa\b/gi, 'map folium plotly geo'],
  // Tempo real
  [/\btempo.?real|ao.?vivo\b/gi, 'realtime live auto-refresh monitoring'],
  [/\bmonitor(amento)?\b/gi, 'monitoring realtime live gauge'],
  // Navegação / admin
  [/\bnavega[çc][ãa]o|p[aá]ginas?\b/gi, 'multipage navigation sidebar radio'],
  [/\blogin|autentica[çc][ãa]o\b/gi, 'login session_state admin'],
  [/\bfinance|a[çc][oõ]es\b/gi, 'finance stock financial candlestick portfolio'],
  // UI básico
  [/\bupload\b/gi, 'upload file_uploader'],
  [/\bformul[áa]rio\b/gi, 'form submit'],
  [/\bficheiro|arquivo\b/gi, 'file upload'],
  [/\bdownload\b/gi, 'download csv button'],
]

function expandQuery(query: string): string[] {
  let translated = query
  for (const [re, en] of PT_EN) translated = translated.replace(re, en)
  const results = [query]
  if (translated !== query) results.push(translated)
  return [...new Set(results)]
}

function queryTokens(query: string): string[] {
  const all = expandQuery(query).flatMap(tokenize)
  return [...new Set(all)]
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
function search(query: string, topK = 3): ExampleRAGResult[] {
  if (!_isIndexed || _docs.length === 0) return []
  const tokens = queryTokens(query)
  if (tokens.length === 0) return []

  const scored: ExampleRAGResult[] = []
  for (const d of _docs) {
    const score = bm25Score(tokens, d)
    if (score > 0) scored.push({ entry: d.entry, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK)
}

// ---------------------------------------------------------------------------
// Context builder — formats results for prompt injection
// ---------------------------------------------------------------------------
function getContext(query: string, topK = 2): string {
  const results = search(query, topK)
  if (results.length === 0) return ''

  const sections = results.map(
    (r) =>
      `### ${r.entry.title}\n` +
      `${r.entry.description}\n\n` +
      `\`\`\`python\n${r.entry.content.trim()}\n\`\`\`\n` +
      `Source: ${r.entry.url}\n`,
  )

  return (
    '# Streamlit Working Examples\n' +
    'The following are complete, tested Streamlit apps from the official llm-examples repo.\n' +
    'Use them as structural reference — adapt the patterns to the user request.\n\n' +
    sections.join('\n---\n\n')
  )
}

// ---------------------------------------------------------------------------
// Indexer
// ---------------------------------------------------------------------------
async function indexExamples(onProgress?: ExampleProgressCallback): Promise<void> {
  if (_isIndexed) {
    onProgress?.({
      status: 'ready',
      progress: 100,
      message: 'Streamlit examples ready',
      indexedCount: _indexedCount,
    })
    return
  }

  onProgress?.({ status: 'fetching', progress: 5, message: 'Fetching Streamlit examples…' })

  let entries: ExampleEntry[]
  try {
    const res = await fetch('/api/streamlit-examples')
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error ?? `HTTP ${res.status}`)
    }
    entries = await res.json()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error'
    onProgress?.({ status: 'error', message: `Failed to fetch examples: ${msg}` })
    throw err
  }

  onProgress?.({
    status: 'indexing',
    progress: 60,
    message: `Indexing ${entries.length} examples…`,
  })

  buildIndex(entries)

  onProgress?.({
    status: 'ready',
    progress: 100,
    message: 'Streamlit examples ready',
    indexedCount: _indexedCount,
  })
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------
export async function createExamplesRAGEngine(
  onProgress?: ExampleProgressCallback,
): Promise<ExamplesRAGEngine> {
  return {
    get isReady() {
      return _isIndexed
    },
    get indexedCount() {
      return _indexedCount
    },
    index: async () => {
      await indexExamples(onProgress)
    },
    search: (query, topK = 3) => search(query, topK),
    getContext: (query, topK = 2) => getContext(query, topK),
  }
}

export function isExamplesRAGReady(): boolean {
  return _isIndexed
}

export function getExamplesIndexedCount(): number {
  return _indexedCount
}
