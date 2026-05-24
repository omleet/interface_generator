import { NextResponse } from 'next/server'

// Streamlit condensed reference for LLMs fetched from the official llms.txt
const STREAMLIT_LLMS_URL = 'https://docs.streamlit.io/llms.txt'

export async function GET() {
  try {
    const res = await fetch(STREAMLIT_LLMS_URL, {
      next: { revalidate: 3600 }, // cache for 1 hour on the server
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned HTTP ${res.status}` },
        { status: res.status },
      )
    }

    const text = await res.text()

    // Parse llms.txt into doc-entry objects compatible with the RAG engine.
    const entries = parseLlmsTxt(text)

    return NextResponse.json(entries, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to fetch Streamlit docs: ${message}` },
      { status: 502 },
    )
  }
}

interface DocEntry {
  title: string
  content: string
  format: 'md'
  url: string
  demo?: string
}

function parseLlmsTxt(text: string): DocEntry[] {
  const entries: DocEntry[] = []

  // Handle both ## headings (llms.txt sections) and plain URL lists
  // Streamlit llms.txt may list URLs; fall back to splitting on ## headings.
  const sections = text.split(/^## /m).filter(Boolean)

  if (sections.length > 1) {
    // Standard llms.txt with ## sections
    for (const section of sections) {
      const firstNewline = section.indexOf('\n')
      if (firstNewline === -1) continue

      const title = section.slice(0, firstNewline).trim()
      const body = section.slice(firstNewline + 1).trim()
      if (!title || !body) continue

      const codeMatch = body.match(/```python\n([\s\S]*?)```/)
      const demo = codeMatch ? codeMatch[1].trim() : undefined
      const content = body.replace(/```[\s\S]*?```/g, '').trim()

      entries.push({
        title,
        content,
        format: 'md',
        url: `https://docs.streamlit.io/develop/api-reference`,
        ...(demo ? { demo } : {}),
      })
    }
  } else {
    // Fallback: treat each non-empty line as a URL reference entry
    const lines = text.split('\n').filter((l) => l.trim())
    for (const line of lines) {
      const urlMatch = line.match(/https?:\/\/\S+/)
      if (!urlMatch) continue
      const url = urlMatch[0]
      const title = url.split('/').filter(Boolean).pop() ?? url
      entries.push({
        title: title.replace(/-/g, ' '),
        content: `Streamlit documentation: ${url}`,
        format: 'md',
        url,
      })
    }
  }

  return entries
}
