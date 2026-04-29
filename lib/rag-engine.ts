import { generateEmbedding, generateEmbeddings, cosineSimilarity, initEmbeddings, type ProgressCallback } from './embeddings'
import { ADMINLTE_KNOWLEDGE, createSearchText, type KnowledgeItem, type IndexedItem } from './knowledge-base'

export interface RAGResult {
  item: KnowledgeItem
  score: number
}

export interface RAGEngine {
  isReady: boolean
  index: () => Promise<void>
  search: (query: string, topK?: number) => Promise<RAGResult[]>
  getContext: (query: string, topK?: number) => Promise<string>
}

let indexedItems: IndexedItem[] = []
let isIndexed = false

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
  if (isIndexed) return

  // Initialize embeddings model
  await initEmbeddings(onProgress)

  onProgress?.({ status: 'loading', progress: 50, message: 'Indexing knowledge base...' })

  indexedItems = []
  const total = ADMINLTE_KNOWLEDGE.length

  for (let i = 0; i < ADMINLTE_KNOWLEDGE.length; i++) {
    const item = ADMINLTE_KNOWLEDGE[i]
    const searchText = createSearchText(item)
    const embedding = await generateEmbedding(searchText)

    indexedItems.push({
      ...item,
      searchText,
      embedding,
    })

    const progress = 50 + ((i + 1) / total) * 50
    onProgress?.({
      status: 'loading',
      progress,
      message: `Indexed ${i + 1}/${total} items`,
    })
  }

  isIndexed = true
  onProgress?.({ status: 'ready', progress: 100, message: 'Knowledge base ready' })
}

// --- Query Expansion ---
// Generate alternative phrasings of the query to improve recall.
// The knowledge base is indexed in English, but real prompts often arrive in
// Portuguese. We translate the most common domain terms before expanding.
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

  // If the prompt is Portuguese, add an English-translated variant.
  const translated = translatePtToEn(query)
  if (translated !== query) expansions.push(translated)

  // From here on, run synonyms against the English-translated text so that
  // Portuguese terms also benefit from the structural expansion.
  const lower = translated.toLowerCase()

  // Structural synonyms
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

  // Always add a component-focused variant
  expansions.push(`AdminLTE components for: ${translated}`)

  return [...new Set(expansions)]
}

// Compute a fused embedding by averaging multiple query embeddings
async function getFusedEmbedding(query: string): Promise<number[]> {
  const expansions = expandQuery(query)
  const embeddings = await generateEmbeddings(expansions)

  // Average the embeddings (they are already normalized)
  const dim = embeddings[0].length
  const fused = new Array(dim).fill(0)
  for (const emb of embeddings) {
    for (let i = 0; i < dim; i++) {
      fused[i] += emb[i] / embeddings.length
    }
  }
  return fused
}

// --- Maximal Marginal Relevance ---
// Balances relevance to the query with diversity among selected results
function maximalMarginalRelevance(
  queryEmbedding: number[],
  candidates: IndexedItem[],
  topK: number,
  lambda = 0.6, // 0 = pure diversity, 1 = pure relevance
): IndexedItem[] {
  if (candidates.length === 0) return []

  const selected: IndexedItem[] = []
  const remaining = [...candidates]

  while (selected.length < topK && remaining.length > 0) {
    let bestIdx = 0
    let bestScore = -Infinity

    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i]
      const relevance = item.embedding ? cosineSimilarity(queryEmbedding, item.embedding) : 0

      // Redundancy: max similarity to already-selected items
      const maxRedundancy =
        selected.length === 0
          ? 0
          : Math.max(
              ...selected.map((s) =>
                s.embedding && item.embedding ? cosineSimilarity(s.embedding, item.embedding) : 0,
              ),
            )

      const mmrScore = lambda * relevance - (1 - lambda) * maxRedundancy

      if (mmrScore > bestScore) {
        bestScore = mmrScore
        bestIdx = i
      }
    }

    selected.push(remaining[bestIdx])
    remaining.splice(bestIdx, 1)
  }

  return selected
}

async function searchKnowledgeBase(query: string, topK: number): Promise<RAGResult[]> {
  if (!isIndexed || indexedItems.length === 0) {
    throw new Error('Knowledge base not indexed. Call index() first.')
  }

  // Use fused embedding from query expansion for better recall
  const queryEmbedding = await getFusedEmbedding(query)

  // Fetch a larger candidate pool, then apply MMR for diversity
  const candidateK = Math.max(topK * 3, 20)
  const candidates = indexedItems
    .map((item) => ({ item, score: item.embedding ? cosineSimilarity(queryEmbedding, item.embedding) : 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, candidateK)
    .map((r) => r.item)

  const diverseItems = maximalMarginalRelevance(queryEmbedding, candidates, topK)

  return diverseItems.map((item) => ({
    item: {
      id: item.id,
      name: item.name,
      category: item.category,
      description: item.description,
      html: item.html,
      css: item.css,
      js: item.js,
      tags: item.tags,
      dependencies: item.dependencies,
      composableWith: item.composableWith,
    },
    score: item.embedding ? cosineSimilarity(queryEmbedding, item.embedding) : 0,
  }))
}

async function getContextForPrompt(query: string, topK: number): Promise<string> {
  // Fetch more results to categorize them
  const results = await searchKnowledgeBase(query, Math.max(topK, 10))

  if (results.length === 0) {
    return ''
  }

  // Categorize results by type for better organization
  const categorized: Record<string, RAGResult[]> = {
    primitive: [],
    pattern: [],
    component: [],
    widget: [],
    chart: [],
    layout: [],
    utility: [],
  }

  results.forEach(result => {
    const cat = result.item.category
    if (categorized[cat]) {
      categorized[cat].push(result)
    }
  })

  // Build context with priority order: primitives first (building blocks), then patterns, then specifics
  const sections: string[] = []

  // Helper to format a single item
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

  // Add primitives section (building blocks)
  if (categorized.primitive.length > 0) {
    sections.push(`## Building Blocks (Primitives)\nUse these atomic elements to compose larger components:\n\n${categorized.primitive.slice(0, 3).map(formatItem).join('\n')}`)
  }

  // Add patterns section (composition examples)
  if (categorized.pattern.length > 0) {
    sections.push(`## Composition Patterns\nFollow these patterns for consistent, professional layouts:\n\n${categorized.pattern.slice(0, 2).map(formatItem).join('\n')}`)
  }

  // Add specific components/widgets
  const specifics = [
    ...categorized.widget,
    ...categorized.component,
    ...categorized.chart,
  ].slice(0, 3)

  if (specifics.length > 0) {
    sections.push(`## Relevant Components\nUse these specific components as needed:\n\n${specifics.map(formatItem).join('\n')}`)
  }

  // Add layout if relevant
  if (categorized.layout.length > 0) {
    sections.push(`## Layout Structure\n\n${categorized.layout.slice(0, 1).map(formatItem).join('\n')}`)
  }

  // Add utilities if present
  if (categorized.utility.length > 0) {
    sections.push(`## Utilities\n\n${categorized.utility.slice(0, 1).map(formatItem).join('\n')}`)
  }

  return `# AdminLTE Component Reference\n\nUse these components and patterns to build the requested interface. Compose primitives into larger structures following the patterns shown.\n\n${sections.join('\n\n---\n\n')}`
}

export function isRAGReady(): boolean {
  return isIndexed
}

export function getIndexedCount(): number {
  return indexedItems.length
}
