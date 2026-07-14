import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_BASE_URL = 'http://127.0.0.1:1234'

export async function GET(req: NextRequest) {
  const baseUrl = req.headers.get('x-llm-base-url') || DEFAULT_BASE_URL

  try {
    const upstream = await fetch(`${baseUrl}/v1/models`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
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
          error: `LM Studio ${upstream.status} ${upstream.statusText}`,
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
        { error: 'LM Studio returned a non-JSON response.', upstreamBody: rawText },
        { status: 502 },
      )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `Cannot reach LM Studio at ${baseUrl} from the server. Is it running? — ${message}` },
      { status: 502 },
    )
  }
}
