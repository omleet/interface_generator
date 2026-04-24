import { NextRequest, NextResponse } from 'next/server'

const OLLAMA_CLOUD_BASE = 'https://ollama.com'

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-ollama-api-key') ?? ''

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing API key. Pass it in the x-ollama-api-key header.' },
      { status: 401 }
    )
  }

  try {
    const upstream = await fetch(`${OLLAMA_CLOUD_BASE}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    })

    // The tags endpoint may return HTML (e.g. a login page) on auth failure
    // rather than JSON, so read as text first and parse defensively.
    const rawText = await upstream.text()

    if (!upstream.ok) {
      let parsed: unknown = rawText
      try {
        parsed = JSON.parse(rawText)
      } catch {
        // keep raw text
      }
      return NextResponse.json(
        {
          error: `Ollama Cloud ${upstream.status} ${upstream.statusText}`,
          upstreamStatus: upstream.status,
          upstreamBody: parsed,
        },
        { status: upstream.status },
      )
    }

    try {
      const body = JSON.parse(rawText)
      return NextResponse.json(body)
    } catch {
      return NextResponse.json(
        { error: 'Ollama Cloud returned a non-JSON response.', upstreamBody: rawText },
        { status: 502 },
      )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Proxy error: ${message}` }, { status: 502 })
  }
}
