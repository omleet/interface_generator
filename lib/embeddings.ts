import { pipeline, FeatureExtractionPipeline, env } from '@huggingface/transformers'

// Configure transformers.js for browser
env.allowLocalModels = false
env.useBrowserCache = true

let embeddingPipeline: FeatureExtractionPipeline | null = null
let loadingPromise: Promise<FeatureExtractionPipeline> | null = null

export interface EmbeddingProgress {
  status: 'loading' | 'ready' | 'error'
  progress?: number
  message?: string
}

export type ProgressCallback = (progress: EmbeddingProgress) => void

export async function initEmbeddings(onProgress?: ProgressCallback): Promise<void> {
  if (embeddingPipeline) {
    onProgress?.({ status: 'ready', message: 'Model already loaded' })
    return
  }

  if (loadingPromise) {
    await loadingPromise
    return
  }

  onProgress?.({ status: 'loading', progress: 0, message: 'Loading embedding model...' })

  loadingPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    progress_callback: (progress: { progress?: number; status?: string; file?: string }) => {
      if (progress.progress !== undefined) {
        onProgress?.({
          status: 'loading',
          progress: progress.progress,
          message: `Loading: ${progress.file || 'model'}`,
        })
      }
    },
  }) as Promise<FeatureExtractionPipeline>

  try {
    embeddingPipeline = await loadingPromise
    onProgress?.({ status: 'ready', progress: 100, message: 'Model loaded' })
  } catch (error) {
    loadingPromise = null
    onProgress?.({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to load model',
    })
    throw error
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!embeddingPipeline) {
    await initEmbeddings()
  }

  if (!embeddingPipeline) {
    throw new Error('Embedding pipeline not initialized')
  }

  const output = await embeddingPipeline(text, {
    pooling: 'mean',
    normalize: true,
  })

  // Convert to array
  return Array.from(output.data as Float32Array)
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = []
  for (const text of texts) {
    const embedding = await generateEmbedding(text)
    embeddings.push(embedding)
  }
  return embeddings
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)

  if (normA === 0 || normB === 0) return 0

  return dotProduct / (normA * normB)
}

export function isEmbeddingsReady(): boolean {
  return embeddingPipeline !== null
}
