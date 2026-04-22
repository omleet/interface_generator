export type LLMProvider = 'ollama' | 'ollama-cloud' | 'lmstudio'

export type QualityMode = 'fast' | 'quality'

export interface LLMConfig {
  provider: LLMProvider
  baseUrl: string
  model: string
  qualityMode?: QualityMode
  // Required for ollama-cloud. Sent as `Authorization: Bearer <apiKey>`.
  // The same API key works for both the /api/tags listing and the
  // /api/chat streaming endpoint. For local providers this is ignored.
  apiKey?: string
}

export interface SamplingParams {
  temperature: number
  top_p: number
  repeat_penalty: number
  num_predict: number
  // Ollama's total context window. Must be >= input tokens + num_predict,
  // otherwise the user's request is silently truncated and the model generates
  // boilerplate with empty content. Default in Ollama is only 2048 which is
  // way too small once we include a system prompt + RAG references.
  num_ctx: number
}

export const SAMPLING_PRESETS: Record<QualityMode, SamplingParams> = {
  fast: {
    // Lower than before (was 0.4). 0.4 was high enough that weaker models
    // occasionally drifted and produced an empty wrapper. 0.3 keeps it snappy
    // but much more deterministic for HTML generation.
    temperature: 0.3,
    top_p: 0.9,
    repeat_penalty: 1.05,
    // Bumped from 4000 — a full AdminLTE dashboard with charts + tables can
    // easily hit 4k tokens and get cut mid-page.
    num_predict: 5500,
    // Bumped from 8192. System prompt (~1200 tok) + RAG context (~3500 tok)
    // + user request was flirting with the 8k window, causing Ollama to
    // silently truncate the request and return boilerplate.
    num_ctx: 10240,
  },
  quality: {
    temperature: 0.15,
    top_p: 0.85,
    repeat_penalty: 1.1,
    num_predict: 6000,
    num_ctx: 12288,
  },
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMStreamCallback {
  onToken: (token: string) => void
  onComplete: (fullResponse: string) => void
  onError: (error: Error) => void
}

export const DEFAULT_CONFIGS: Record<LLMProvider, Omit<LLMConfig, 'model'>> = {
  ollama: {
    provider: 'ollama',
    baseUrl: 'http://127.0.0.1:11434',
    qualityMode: 'fast',
  },
  'ollama-cloud': {
    provider: 'ollama-cloud',
    baseUrl: 'https://ollama.com',
    qualityMode: 'fast',
  },
  lmstudio: {
    provider: 'lmstudio',
    baseUrl: 'http://127.0.0.1:1234',
    qualityMode: 'fast',
  },
}

export const SUGGESTED_MODELS: Record<LLMProvider, string[]> = {
  ollama: [
    'llama3.2:latest',
    'llama3.1:latest',
    'codellama:latest',
    'mistral:latest',
    'qwen2.5-coder:latest',
    'deepseek-coder:latest',
  ],
  // These are just placeholders shown when no API key is set yet — once the
  // user enters their key we replace this list with the actual /api/tags
  // response from ollama.com. Any cloud model name works (e.g. "gpt-oss:120b-cloud",
  // "glm-4.6:cloud", "qwen3-coder:480b-cloud", etc.).
  'ollama-cloud': [
    'gpt-oss:120b-cloud',
    'qwen3-coder:480b-cloud',
    'deepseek-v3.1:671b-cloud',
    'glm-4.6:cloud',
  ],
  lmstudio: [
    'lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF',
    'lmstudio-community/Qwen2.5-Coder-7B-Instruct-GGUF',
    'local-model',
  ],
}

// Helper: providers that speak the Ollama REST protocol (local or cloud).
// Both hit /api/tags and /api/chat — only difference is the Authorization header.
function isOllamaProtocol(provider: LLMProvider): boolean {
  return provider === 'ollama' || provider === 'ollama-cloud'
}

function buildAuthHeaders(config: LLMConfig): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.provider === 'ollama-cloud' && config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`
  }
  return headers
}

export async function testConnection(config: LLMConfig): Promise<{ success: boolean; error?: string; models?: string[] }> {
  try {
    if (isOllamaProtocol(config.provider)) {
      // Cloud requires an API key; fail fast with a clear message instead of a 401.
      if (config.provider === 'ollama-cloud' && !config.apiKey) {
        return { success: false, error: 'Missing API key. Create one at ollama.com and paste it in settings.' }
      }
      const response = await fetch(`${config.baseUrl}/api/tags`, {
        method: 'GET',
        headers: buildAuthHeaders(config),
        signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return { success: false, error: 'Invalid or missing API key for Ollama Cloud.' }
        }
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` }
      }
      const data = await response.json()
      const models = data.models?.map((m: { name: string }) => m.name) || []
      return { success: true, models }
    } else {
      // LM Studio uses OpenAI-compatible API
      const response = await fetch(`${config.baseUrl}/v1/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })
      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` }
      }
      const data = await response.json()
      const models = data.data?.map((m: { id: string }) => m.id) || []
      return { success: true, models }
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        return { success: false, error: 'Connection timeout. Make sure the LLM server is running.' }
      }
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        return { 
          success: false, 
          error: `Cannot connect to ${config.provider}. Check if CORS is enabled and the server is running.` 
        }
      }
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Unknown error' }
  }
}

// Timeout (ms) with no activity before cancelling the stream.
// Local LLMs can take a while to load the model into memory on the first request
// (cold start), so we use a generous timeout. The watchdog is also reset on any
// bytes received from the network, not just on successfully parsed tokens.
const STREAM_INACTIVITY_TIMEOUT_MS = 180_000

export async function generateCompletion(
  config: LLMConfig,
  messages: LLMMessage[],
  callbacks: LLMStreamCallback,
  externalSignal?: AbortSignal,
): Promise<void> {
  const controller = new AbortController()

  // Propagate external cancellation (e.g. user clicking "Cancel") into our
  // internal controller so the underlying fetch is aborted.
  let cancelledByUser = false
  const onExternalAbort = () => {
    cancelledByUser = true
    controller.abort()
  }
  if (externalSignal) {
    if (externalSignal.aborted) {
      cancelledByUser = true
      controller.abort()
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true })
    }
  }

  // Inactivity watchdog: cancel if no activity for STREAM_INACTIVITY_TIMEOUT_MS.
  // The timer is reset both on successfully parsed tokens AND on any raw bytes
  // arriving from the server (so model-loading/keep-alive traffic counts as activity).
  let inactivityTimer: ReturnType<typeof setTimeout> | null = null
  const timeoutSeconds = Math.round(STREAM_INACTIVITY_TIMEOUT_MS / 1000)
  const resetTimer = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer)
    inactivityTimer = setTimeout(() => {
      controller.abort()
      callbacks.onError(new Error(
        `Stream timed out — no activity for ${timeoutSeconds} seconds. ` +
        `The local LLM may still be loading the model, overloaded, or stuck. ` +
        `Try a smaller model, shorten your prompt, or restart the LLM server.`
      ))
    }, STREAM_INACTIVITY_TIMEOUT_MS)
  }

  const wrappedCallbacks: LLMStreamCallback & { onActivity: () => void } = {
    onToken: (token) => {
      resetTimer()
      callbacks.onToken(token)
    },
    onComplete: (full) => {
      if (inactivityTimer) clearTimeout(inactivityTimer)
      callbacks.onComplete(full)
    },
    onError: (err) => {
      if (inactivityTimer) clearTimeout(inactivityTimer)
      callbacks.onError(err)
    },
    // Called on every raw chunk from the network, even before any token parses.
    onActivity: () => {
      resetTimer()
    },
  }

  resetTimer() // start the watchdog before the fetch

  try {
    if (isOllamaProtocol(config.provider)) {
      await generateWithOllama(config, messages, wrappedCallbacks, controller.signal)
    } else {
      await generateWithLMStudio(config, messages, wrappedCallbacks, controller.signal)
    }
  } catch (error) {
    if (inactivityTimer) clearTimeout(inactivityTimer)
    if (cancelledByUser) return // silent — the caller asked to cancel
    if (error instanceof Error) {
      if (error.name === 'AbortError') return // already handled by watchdog/cancel
      callbacks.onError(error)
    } else {
      callbacks.onError(new Error('Unknown error during generation'))
    }
  } finally {
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort)
    }
  }
}

type ExtendedCallbacks = LLMStreamCallback & { onActivity?: () => void }

async function generateWithOllama(
  config: LLMConfig,
  messages: LLMMessage[],
  callbacks: ExtendedCallbacks,
  signal: AbortSignal
): Promise<void> {
  const response = await fetch(`${config.baseUrl}/api/chat`, {
    method: 'POST',
    headers: buildAuthHeaders(config),
    body: JSON.stringify({
      model: config.model,
      messages: messages,
      stream: true,
      options: SAMPLING_PRESETS[config.qualityMode ?? 'fast'],
    }),
    signal,
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        config.provider === 'ollama-cloud'
          ? 'Ollama Cloud rejected the API key (401/403). Check it in settings.'
          : `Ollama error: ${response.status} ${response.statusText}`
      )
    }
    const label = config.provider === 'ollama-cloud' ? 'Ollama Cloud' : 'Ollama'
    throw new Error(`${label} error: ${response.status} ${response.statusText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No response body')
  }

  const decoder = new TextDecoder()
  let fullResponse = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    // Any network activity counts toward resetting the inactivity watchdog,
    // even if the chunk doesn't contain a complete JSON line yet.
    callbacks.onActivity?.()

    buffer += decoder.decode(value, { stream: true })
    
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue
      
      try {
        const data = JSON.parse(trimmedLine)
        if (data.message?.content) {
          fullResponse += data.message.content
          callbacks.onToken(data.message.content)

          // Early exit: HTML document is complete — no need to wait for num_predict limit
          if (fullResponse.includes('</html>')) {
            reader.cancel()
            callbacks.onComplete(fullResponse)
            return
          }
        }
        if (data.done) {
          callbacks.onComplete(fullResponse)
          return
        }
      } catch {
        // Skip invalid JSON lines
      }
    }
  }

  if (buffer.trim()) {
    try {
      const data = JSON.parse(buffer.trim())
      if (data.message?.content) {
        fullResponse += data.message.content
        callbacks.onToken(data.message.content)
      }
    } catch {
      // Skip invalid JSON
    }
  }

  callbacks.onComplete(fullResponse)
}

async function generateWithLMStudio(
  config: LLMConfig,
  messages: LLMMessage[],
  callbacks: ExtendedCallbacks,
  signal: AbortSignal
): Promise<void> {
  const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: messages,
      stream: true,
      temperature: SAMPLING_PRESETS[config.qualityMode ?? 'fast'].temperature,
      top_p: SAMPLING_PRESETS[config.qualityMode ?? 'fast'].top_p,
      max_tokens: SAMPLING_PRESETS[config.qualityMode ?? 'fast'].num_predict,
    }),
    signal,
  })

  if (!response.ok) {
    throw new Error(`LM Studio error: ${response.status} ${response.statusText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No response body')
  }

  const decoder = new TextDecoder()
  let fullResponse = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    // Any network activity counts toward resetting the inactivity watchdog.
    callbacks.onActivity?.()

    // Append new chunk to buffer
    buffer += decoder.decode(value, { stream: true })
    
    // Process complete lines from buffer
    const lines = buffer.split('\n')
    // Keep the last potentially incomplete line in the buffer
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue
      
      if (trimmedLine.startsWith('data: ')) {
        const data = trimmedLine.slice(6)
        if (data === '[DONE]') {
          callbacks.onComplete(fullResponse)
          return
        }
        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) {
            fullResponse += content
            callbacks.onToken(content)

            // Early exit: HTML document is complete
            if (fullResponse.includes('</html>')) {
              reader.cancel()
              callbacks.onComplete(fullResponse)
              return
            }
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  // Process any remaining content in buffer
  if (buffer.trim()) {
    const trimmedLine = buffer.trim()
    if (trimmedLine.startsWith('data: ')) {
      const data = trimmedLine.slice(6)
      if (data !== '[DONE]') {
        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) {
            fullResponse += content
            callbacks.onToken(content)
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  callbacks.onComplete(fullResponse)
}

export function getDefaultModel(provider: LLMProvider): string {
  return SUGGESTED_MODELS[provider][0]
}
