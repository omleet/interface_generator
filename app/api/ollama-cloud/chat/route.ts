import { NextRequest } from 'next/server'

const OLLAMA_CLOUD_BASE = 'https://ollama.com'

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-ollama-api-key') ?? ''

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Missing API key. Pass it in the x-ollama-api-key header.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Strip the `-cloud` suffix from model names. The suffix is only used when
  // addressing cloud models through a LOCAL Ollama instance (e.g. `ollama run
  // gpt-oss:120b-cloud`). When hitting ollama.com's API directly, the real
  // model name is just `gpt-oss:120b` — sending the `-cloud` variant yields a
  // 404 "model not found" that gets confusingly displayed as a connection error.
  const normalizedBody =
    body && typeof body === 'object' && 'model' in (body as Record<string, unknown>)
      ? {
          ...(body as Record<string, unknown>),
          model: String((body as Record<string, unknown>).model ?? '').replace(/-cloud$/, ''),
        }
      : body

  try {
    const upstream = await fetch(`${OLLAMA_CLOUD_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(normalizedBody),
    })

    if (!upstream.ok) {
      // Forward the real upstream error body verbatim so the client can
      // surface the actual reason (invalid key, unknown model, rate-limited…).
      const errorText = await upstream.text()
      const wrapped = JSON.stringify({
        error: `Ollama Cloud ${upstream.status} ${upstream.statusText}`,
        upstreamStatus: upstream.status,
        upstreamBody: errorText,
      })
      return new Response(wrapped, {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Stream the response directly back to the client
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: `Proxy error: ${message}` }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
