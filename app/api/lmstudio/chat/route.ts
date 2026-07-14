import { NextRequest } from 'next/server'

const DEFAULT_BASE_URL = 'http://127.0.0.1:1234'

export async function POST(req: NextRequest) {
  const baseUrl = req.headers.get('x-llm-base-url') || DEFAULT_BASE_URL

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const upstream = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!upstream.ok) {
      const errorText = await upstream.text()
      const wrapped = JSON.stringify({
        error: `LM Studio ${upstream.status} ${upstream.statusText}`,
        upstreamStatus: upstream.status,
        upstreamBody: errorText,
      })
      return new Response(wrapped, {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Stream the SSE response straight through to the client.
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: `Cannot reach LM Studio at ${baseUrl} from the server. Is it running? — ${message}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
