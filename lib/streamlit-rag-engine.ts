// ---------------------------------------------------------------------------
// Streamlit RAG Engine
// ---------------------------------------------------------------------------
// Fetches the official Streamlit documentation index from
// https://docs.streamlit.io/llms.txt and builds a BM25 search
// index over it. Each entry has: title, content, format, url, demo (optional).
//
// This engine is intentionally independent of the AdminLTE RAG engine so that
// HTML and Python generation each use their own, purpose-built knowledge base.
// ---------------------------------------------------------------------------

export interface StreamlitDocEntry {
  title: string
  content: string
  format: 'md' | 'rst'
  url: string
  demo?: string
}

export interface StreamlitRAGResult {
  entry: StreamlitDocEntry
  score: number
}

export interface StreamlitRAGProgress {
  status: 'idle' | 'fetching' | 'indexing' | 'ready' | 'error'
  progress?: number
  message?: string
  indexedCount?: number
}

export type StreamlitProgressCallback = (progress: StreamlitRAGProgress) => void

export interface StreamlitRAGEngine {
  isReady: boolean
  indexedCount: number
  index: () => Promise<void>
  search: (query: string, topK?: number) => StreamlitRAGResult[]
  getContext: (query: string, topK?: number) => string
}

// ---------------------------------------------------------------------------
// BM25 constants
// ---------------------------------------------------------------------------
const K1 = 1.5
const B = 0.75
const TITLE_BOOST = 3.0
const DEMO_BOOST = 2.0

// ---------------------------------------------------------------------------
// Module-level singleton state (persists across re-renders / hot reloads)
// ---------------------------------------------------------------------------
let _docs: BM25Doc[] = []
let _avgDocLen = 0
let _idf: Map<string, number> = new Map()
let _isIndexed = false
let _indexedCount = 0

interface BM25Doc {
  entry: StreamlitDocEntry
  tokens: string[]
  termFreq: Map<string, number>
  length: number
  titleTokens: Set<string>
  hasDemoCode: boolean
}

// ---------------------------------------------------------------------------
// Tokenizer — strips punctuation, lowercases, removes very short tokens
// ---------------------------------------------------------------------------
function tokenize(text: string): string[] {
  if (!text) return []
  return text
    .toLowerCase()
    .replace(/```[\s\S]*?```/g, ' ') // strip code fences from content for tokenization
    .replace(/[^a-z0-9_]+/g, ' ')
    .split(' ')
    .filter((t) => t.length >= 2 && t.length <= 40)
}

// ---------------------------------------------------------------------------
// BM25 index builder
// ---------------------------------------------------------------------------
function buildIndex(entries: StreamlitDocEntry[]): void {
  _docs = entries.map((entry) => {
    // Combine all text fields for the search text
    const combined = [entry.title, entry.content, entry.demo ?? ''].join(' ')
    const tokens = tokenize(combined)
    const termFreq = new Map<string, number>()
    for (const t of tokens) termFreq.set(t, (termFreq.get(t) ?? 0) + 1)

    return {
      entry,
      tokens,
      termFreq,
      length: tokens.length,
      titleTokens: new Set(tokenize(entry.title)),
      hasDemoCode: !!entry.demo && entry.demo.length > 20,
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

    if (doc.titleTokens.has(q)) score += termIdf * TITLE_BOOST
  }
  // Entries that include runnable demo code are more useful — boost them
  if (doc.hasDemoCode && score > 0) score *= DEMO_BOOST
  return score
}

// ---------------------------------------------------------------------------
// Portuguese → English expansion (Streamlit / Python domain)
// ---------------------------------------------------------------------------
const PT_EN: Array<[RegExp, string]> = [
  [/\bgr[áa]ficos?\b/gi, 'chart echart plot'],
  [/\btabelas?\b/gi, 'table rows columns'],
  [/\blistas?\b/gi, 'list item expansion'],
  [/\bcart[õo]es?\b/gi, 'card'],
  [/\bbot[õo]es?\b/gi, 'button click'],
  [/\bformul[áa]rios?\b/gi, 'form input select'],
  [/\bdi[áa]logo\b/gi, 'dialog'],
  [/\bnotifica[çc][ãa]o\b/gi, 'notify notification'],
  [/\bbarra\s+lateral\b/gi, 'drawer sidebar'],
  [/\bcabe[çc]alho\b/gi, 'header'],
  [/\brodap[ée]\b/gi, 'footer'],
  [/\bprogresso\b/gi, 'progress linear circular'],
  [/\bcarregamento\b/gi, 'loading spinner'],
  [/\btempo\s+real\b/gi, 'timer update refresh'],
  [/\bpagina[çc][ãa]o\b/gi, 'pagination page'],
  [/\busu[áa]rios?\b/gi, 'user'],
  [/\bmapa\b/gi, 'leaflet map'],
  [/\bupload\b/gi, 'upload file'],
  [/\bdownload\b/gi, 'download'],
  [/\bdarkmode|modo\s+escuro\b/gi, 'dark mode'],
  [/\bimagem\b/gi, 'image'],
  [/\bnavega[çc][ãa]o\b/gi, 'tabs navigation link'],
  [/\bprocurar|pesquisar\b/gi, 'search input filter'],
  [/\bslider|deslizador\b/gi, 'slider range'],
  [/\bcheckbox|caixa\s+de\s+sele[çc][ãa]o\b/gi, 'checkbox'],
  [/\bswitch|interruptor\b/gi, 'switch toggle'],
  [/\bselect|seletor\b/gi, 'select dropdown'],
  [/\bdata\b/gi, 'date'],
  [/\bhora\b/gi, 'time'],
  [/\bcores?\b/gi, 'color'],
  [/\bgrade|grelha\b/gi, 'grid'],
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
function search(query: string, topK = 8): StreamlitRAGResult[] {
  if (!_isIndexed || _docs.length === 0) return []
  const tokens = queryTokens(query)
  if (tokens.length === 0) return []

  const scored: StreamlitRAGResult[] = []
  for (const d of _docs) {
    const score = bm25Score(tokens, d)
    if (score > 0) scored.push({ entry: d.entry, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK)
}

// ---------------------------------------------------------------------------
// Context builder — formats results into a prompt-injectable string
// ---------------------------------------------------------------------------
function getContext(query: string, topK = 8): string {
  const results = search(query, topK)
  if (results.length === 0) return ''

  const sections: string[] = []

  // Separate entries with demo code from reference-only entries
  const withDemo = results.filter((r) => r.entry.demo && r.entry.demo.length > 20)
  const refOnly = results.filter((r) => !r.entry.demo || r.entry.demo.length <= 20)

  if (withDemo.length > 0) {
    sections.push(
      '## Streamlit Working Examples\n' +
        'These are copy-paste-ready code snippets from the official Streamlit documentation:\n\n' +
        withDemo
          .slice(0, 5)
          .map(
            (r) =>
              `### ${r.entry.title}\n` +
              `${r.entry.content.slice(0, 300).replace(/\n+/g, ' ')}\n` +
              `\`\`\`python\n${r.entry.demo!.trim()}\n\`\`\`\n`,
          )
          .join('\n'),
    )
  }

  if (refOnly.length > 0) {
    sections.push(
      '## Streamlit API Reference\n' +
        refOnly
          .slice(0, 4)
          .map(
            (r) =>
              `### ${r.entry.title}\n` +
              `${r.entry.content.slice(0, 400).replace(/\n+/g, ' ')}\n`,
          )
          .join('\n'),
    )
  }

  return (
    '# Streamlit Documentation Context\n' +
    'Use the following official Streamlit documentation snippets to generate accurate, runnable code:\n\n' +
    sections.join('\n\n---\n\n')
  )
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------
export async function createStreamlitRAGEngine(
  onProgress?: StreamlitProgressCallback,
): Promise<StreamlitRAGEngine> {
  return {
    get isReady() {
      return _isIndexed
    },
    get indexedCount() {
      return _indexedCount
    },
    index: async () => {
      await indexStreamlit(onProgress)
    },
    search: (query, topK = 8) => search(query, topK),
    getContext: (query, topK = 8) => getContext(query, topK),
  }
}

async function indexStreamlit(onProgress?: StreamlitProgressCallback): Promise<void> {
  if (_isIndexed) {
    onProgress?.({
      status: 'ready',
      progress: 100,
      message: 'Streamlit docs ready',
      indexedCount: _indexedCount,
    })
    return
  }

  onProgress?.({ status: 'fetching', progress: 5, message: 'Fetching Streamlit docs…' })

  let entries: StreamlitDocEntry[]
  try {
    // Fetch via the Next.js API proxy (/api/streamlit-docs) to avoid CORS.
    // The proxy fetches from docs.streamlit.io server-side and caches for 1 hour.
    const res = await fetch('/api/streamlit-docs')
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error ?? `HTTP ${res.status}`)
    }
    entries = await res.json()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error'
    onProgress?.({ status: 'error', message: `Failed to fetch Streamlit docs: ${msg}` })
    throw err
  }

  onProgress?.({
    status: 'indexing',
    progress: 60,
    message: `Indexing ${entries.length} entries…`,
  })

  buildIndex(entries)

  onProgress?.({
    status: 'ready',
    progress: 100,
    message: `Streamlit docs ready`,
    indexedCount: _indexedCount,
  })
}

export function isStreamlitRAGReady(): boolean {
  return _isIndexed
}

export function getStreamlitIndexedCount(): number {
  return _indexedCount
}
