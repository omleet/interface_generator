import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_BASE_URL = 'http://127.0.0.1:11434'

// The client tells us which baseUrl to hit via a header (set in settings —
// normally left as 127.0.0.1 since it means "the machine running this
// Next.js server", which is what we want regardless of which device
// (phone, PC, etc.) the browser making the *page* request is on.
export async function GET(req: NextRequest) {
  const baseUrl = req.headers.get('x-llm-base-url') || DEFAULT_BASE_URL

  try {
    const upstream = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    })

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
          error: `Ollama ${upstream.status} ${upstream.statusText}`,
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
        { error: 'Ollama returned a non-JSON response.', upstreamBody: rawText },
        { status: 502 },
      )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `Cannot reach Ollama at ${baseUrl} from the server. Is it running? — ${message}` },
      { status: 502 },
    )
  }
}
