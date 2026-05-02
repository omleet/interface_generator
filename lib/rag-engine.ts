import { ADMINLTE_KNOWLEDGE, createSearchText, type KnowledgeItem } from './knowledge-base'

export interface RAGResult {
  item: KnowledgeItem
  score: number
}

export interface RAGIndexProgress {
  status: 'loading' | 'ready' | 'error'
  progress?: number
  message?: string
}

export type ProgressCallback = (progress: RAGIndexProgress) => void

export interface RAGEngine {
  isReady: boolean
  index: () => Promise<void>
  search: (query: string, topK?: number) => Promise<RAGResult[]>
  getContext: (query: string, topK?: number) => Promise<string>
}

// ---------------------------------------------------------------------------
// BM25 index
// ---------------------------------------------------------------------------
// For a small, hand-curated knowledge base (≈37 items with explicit tags and
// descriptions), BM25 over tokenized fields outperforms semantic embeddings:
// it is deterministic, fast, debuggable, and ships zero ML dependencies.
//
// Field weighting is achieved by giving `name` and `tags` extra IDF-weighted
// bonuses on top of the base BM25 score over the full `searchText`.
// ---------------------------------------------------------------------------

interface BM25Doc {
  item: KnowledgeItem
  searchText: string
  tokens: string[]
  termFreq: Map<string, number>
  length: number
  nameTokens: Set<string>
  tagTokens: Set<string>
}

const BM25_K1 = 1.5
const BM25_B = 0.75
const NAME_BOOST = 2.0
const TAG_BOOST = 1.0

let docs: BM25Doc[] = []
let avgDocLen = 0
let idf: Map<string, number> = new Map()
let isIndexed = false

function tokenize(text: string): string[] {
  if (!text) return []
  return text
    .toLowerCase()
    .normalize('NFKD')
    // Strip combining diacritics so "gráficos" tokenizes the same as "graficos".
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9-]+/)
    .filter((t) => t.length >= 2 && t.length <= 40)
}

function buildIndex(): void {
  docs = ADMINLTE_KNOWLEDGE.map((item) => {
    const searchText = createSearchText(item)
    const tokens = tokenize(searchText)

    const termFreq = new Map<string, number>()
    for (const t of tokens) termFreq.set(t, (termFreq.get(t) ?? 0) + 1)

    return {
      item,
      searchText,
      tokens,
      termFreq,
      length: tokens.length,
      nameTokens: new Set(tokenize(item.name)),
      tagTokens: new Set(tokenize(item.tags.join(' '))),
    }
  })

  avgDocLen = docs.length === 0 ? 0 : docs.reduce((s, d) => s + d.length, 0) / docs.length

  const docFreq = new Map<string, number>()
  for (const d of docs) {
    for (const term of new Set(d.tokens)) {
      docFreq.set(term, (docFreq.get(term) ?? 0) + 1)
    }
  }

  const N = docs.length
  idf = new Map()
  for (const [term, df] of docFreq) {
    // BM25+ smoothing: log((N - df + 0.5) / (df + 0.5) + 1) is always ≥ 0.
    idf.set(term, Math.log((N - df + 0.5) / (df + 0.5) + 1))
  }
}

function bm25Score(queryTokens: string[], doc: BM25Doc): number {
  let score = 0
  for (const q of queryTokens) {
    const termIdf = idf.get(q)
    if (termIdf === undefined) continue

    const tf = doc.termFreq.get(q) ?? 0
    if (tf > 0) {
      const norm =
        (tf * (BM25_K1 + 1)) /
        (tf + BM25_K1 * (1 - BM25_B + BM25_B * (avgDocLen === 0 ? 1 : doc.length / avgDocLen)))
      score += termIdf * norm
    }

    // Field-weighted boost: presence (not frequency) in name/tags adds extra
    // weight, scaled by IDF so common stopwords contribute little.
    if (doc.nameTokens.has(q)) score += termIdf * NAME_BOOST
    if (doc.tagTokens.has(q)) score += termIdf * TAG_BOOST
  }
  return score
}

// ---------------------------------------------------------------------------
// Query expansion (PT → EN translation + structural synonyms).
// Carried over from the previous implementation: with curated tags the KB is
// already synonym-rich, but expansion still helps when prompts use PT or
// alternative wording.
// ---------------------------------------------------------------------------

const PT_EN_TERMS: Array<[RegExp, string]> = [
  [/\bgr[áa]ficos?\b/gi, 'chart'],
  [/\bvisualiza[çc][ãa]o\b/gi, 'visualization'],
  [/\btabelas?\b/gi, 'table'],
  [/\blistas?\b/gi, 'list'],
  [/\bcart[õo]es?\b/gi, 'card'],
  [/\bcaixas?\b/gi, 'box'],
  [/\bpain[ée]is?\b/gi, 'panel'],
  [/\bpainel\b/gi, 'dashboard panel'],
  [/\bbot[õo]es?\b/gi, 'button'],
  [/\bformul[áa]rios?\b/gi, 'form'],
  [/\bcampos?\b/gi, 'input field'],
  [/\bsensores?\b/gi, 'sensor'],
  [/\btens[ãa]o\b/gi, 'voltage'],
  [/\bcorrente\b/gi, 'current'],
  [/\btemperaturas?\b/gi, 'temperature'],
  [/\bumidade\b/gi, 'humidity'],
  [/\bmedi[çc][ãa]o\b/gi, 'measurement reading'],
  [/\bmedi[çc][õo]es\b/gi, 'measurements readings'],
  [/\balertas?\b/gi, 'alert notification'],
  [/\busu[áa]rios?\b/gi, 'user'],
  [/\brelat[óo]rios?\b/gi, 'report'],
  [/\bestat[íi]sticas?\b/gi, 'statistics metrics'],
  [/\bm[ée]tricas?\b/gi, 'metric KPI'],
  [/\bequipamentos?\b/gi, 'equipment device'],
  [/\bdispositivos?\b/gi, 'device'],
  [/\btempo real\b/gi, 'real-time live'],
  [/\bmonitora(?:r|mento|gem)\b/gi, 'monitor real-time'],
  [/\bbarra lateral\b/gi, 'sidebar'],
  [/\bcabe[çc]alho\b/gi, 'header navbar'],
  [/\brodap[ée]\b/gi, 'footer'],
]

function translatePtToEn(query: string): string {
  let out = query
  for (const [re, en] of PT_EN_TERMS) out = out.replace(re, en)
  return out
}

function expandQuery(query: string): string[] {
  const expansions: string[] = [query]

  const translated = translatePtToEn(query)
  if (translated !== query) expansions.push(translated)

  const lower = translated.toLowerCase()

  if (lower.includes('chart') || lower.includes('graph')) {
    expansions.push(translated.replace(/chart|graph/gi, 'visualization data plot'))
  }
  if (lower.includes('table') || lower.includes('list')) {
    expansions.push(translated.replace(/table|list/gi, 'datatable grid rows'))
  }
  if (lower.includes('card') || lower.includes('widget')) {
    expansions.push(translated.replace(/card|widget/gi, 'info-box small-box panel'))
  }
  if (lower.includes('form') || lower.includes('input')) {
    expansions.push(translated.replace(/form|input/gi, 'field form-group controls'))
  }
  if (lower.includes('dashboard') || lower.includes('overview')) {
    expansions.push(translated + ' stats metrics KPIs summary')
  }
  if (lower.includes('monitor') || lower.includes('sensor')) {
    expansions.push(translated + ' real-time live data update chart info-box small-box')
  }

  expansions.push(`AdminLTE components for: ${translated}`)

  return [...new Set(expansions)]
}

function expandedQueryTokens(query: string): string[] {
  const expansions = expandQuery(query)
  const tokens = new Set<string>()
  for (const exp of expansions) {
    for (const t of tokenize(exp)) tokens.add(t)
  }
  return Array.from(tokens)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function createRAGEngine(onProgress?: ProgressCallback): Promise<RAGEngine> {
  return {
    get isReady() {
      return isIndexed
    },
    index: async () => {
      await indexKnowledgeBase(onProgress)
    },
    search: async (query: string, topK = 7) => {
      return searchKnowledgeBase(query, topK)
    },
    getContext: async (query: string, topK = 7) => {
      return getContextForPrompt(query, topK)
    },
  }
}

async function indexKnowledgeBase(onProgress?: ProgressCallback): Promise<void> {
  if (isIndexed) {
    onProgress?.({ status: 'ready', progress: 100, message: 'Knowledge base ready' })
    return
  }

  onProgress?.({ status: 'loading', progress: 10, message: 'Building keyword index…' })

  // BM25 indexing is pure CPU work over ~37 items; effectively instant.
  buildIndex()

  isIndexed = true
  onProgress?.({
    status: 'ready',
    progress: 100,
    message: `Indexed ${docs.length} components`,
  })
}

async function searchKnowledgeBase(query: string, topK: number): Promise<RAGResult[]> {
  if (!isIndexed) {
    throw new Error('Knowledge base not indexed. Call index() first.')
  }
  if (docs.length === 0) return []

  const queryTokens = expandedQueryTokens(query)
  if (queryTokens.length === 0) return []

  const scored: RAGResult[] = []
  for (const d of docs) {
    const score = bm25Score(queryTokens, d)
    if (score > 0) scored.push({ item: d.item, score })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK)
}

async function getContextForPrompt(query: string, topK: number): Promise<string> {
  // Pull a wider net so the categorizer below has enough material to pick from.
  const results = await searchKnowledgeBase(query, Math.max(topK, 10))

  if (results.length === 0) {
    return ''
  }

  const categorized: Record<string, RAGResult[]> = {
    primitive: [],
    pattern: [],
    component: [],
    widget: [],
    chart: [],
    layout: [],
    utility: [],
  }

  for (const result of results) {
    const cat = result.item.category
    if (categorized[cat]) categorized[cat].push(result)
  }

  const sections: string[] = []

  const formatItem = (result: RAGResult): string => {
    const item = result.item
    let context = `### ${item.name}\n`
    context += `**Purpose**: ${item.description}\n`

    if (item.composableWith && item.composableWith.length > 0) {
      context += `**Combines well with**: ${item.composableWith.join(', ')}\n`
    }

    if (item.html) {
      context += `\n\`\`\`html\n${item.html}\n\`\`\`\n`
    }

    if (item.js) {
      context += `\n\`\`\`javascript\n${item.js}\n\`\`\`\n`
    }

    return context
  }

  if (categorized.primitive.length > 0) {
    sections.push(
      `## Building Blocks (Primitives)\nUse these atomic elements to compose larger components:\n\n${categorized.primitive
        .slice(0, 3)
        .map(formatItem)
        .join('\n')}`,
    )
  }

  if (categorized.pattern.length > 0) {
    sections.push(
      `## Composition Patterns\nFollow these patterns for consistent, professional layouts:\n\n${categorized.pattern
        .slice(0, 2)
        .map(formatItem)
        .join('\n')}`,
    )
  }

  const specifics = [
    ...categorized.widget,
    ...categorized.component,
    ...categorized.chart,
  ].slice(0, 3)

  if (specifics.length > 0) {
    sections.push(
      `## Relevant Components\nUse these specific components as needed:\n\n${specifics.map(formatItem).join('\n')}`,
    )
  }

  if (categorized.layout.length > 0) {
    sections.push(`## Layout Structure\n\n${categorized.layout.slice(0, 1).map(formatItem).join('\n')}`)
  }

  if (categorized.utility.length > 0) {
    sections.push(`## Utilities\n\n${categorized.utility.slice(0, 1).map(formatItem).join('\n')}`)
  }

  return `# AdminLTE Component Reference\n\nUse these components and patterns to build the requested interface. Compose primitives into larger structures following the patterns shown.\n\n${sections.join(
    '\n\n---\n\n',
  )}`
}

export function isRAGReady(): boolean {
  return isIndexed
}

export function getIndexedCount(): number {
  return docs.length
}
