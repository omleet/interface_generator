import { NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Streamlit LLM Examples endpoint
// ---------------------------------------------------------------------------
// Fetches ready-to-run boilerplate examples from the official
// streamlit/llm-examples GitHub repo. These files are full working apps
// that serve as high-quality few-shot examples for the RAG pipeline.
//
// Files are fetched directly from raw.githubusercontent.com to avoid
// GitHub API rate limits.
// ---------------------------------------------------------------------------

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/streamlit/llm-examples/main'

interface ExampleFile {
  /** Logical name used as the RAG entry title */
  name: string
  /** Path inside the repo */
  path: string
  /** Human-readable description of what the example demonstrates */
  description: string
  /** Tags for BM25 matching */
  tags: string[]
}

// Exhaustive list of known files in the repo (avoids needing the GitHub API)
const EXAMPLE_FILES: ExampleFile[] = [
  {
    name: 'Streamlit Chatbot',
    path: 'Chatbot.py',
    description:
      'Full chatbot app with OpenAI. Shows st.chat_message, st.chat_input, st.session_state message history, sidebar API key input.',
    tags: ['chatbot', 'chat', 'openai', 'session_state', 'chat_message', 'chat_input', 'llm', 'ai'],
  },
  {
    name: 'File Q&A with Anthropic',
    path: 'pages/1_File_Q&A.py',
    description:
      'Upload a text file and ask questions about it using Anthropic Claude. Shows st.file_uploader, disabled widgets, conditional logic.',
    tags: ['file', 'upload', 'qa', 'anthropic', 'file_uploader', 'text_input', 'conditional'],
  },
  {
    name: 'Chat with Internet Search (LangChain)',
    path: 'pages/2_Chat_with_search.py',
    description:
      'Chatbot that can search the web using LangChain + DuckDuckGo. Shows StreamlitCallbackHandler, agent streaming, chat history.',
    tags: [
      'chat',
      'search',
      'langchain',
      'agent',
      'streaming',
      'callback',
      'duckduckgo',
      'internet',
    ],
  },
  {
    name: 'LangChain Quickstart App',
    path: 'pages/3_Langchain_Quickstart.py',
    description:
      'Minimal LangChain + OpenAI app inside an st.form. Shows st.form, st.form_submit_button, st.text_area, st.info for output.',
    tags: ['langchain', 'openai', 'form', 'form_submit_button', 'text_area', 'quickstart'],
  },
  {
    name: 'LangChain PromptTemplate',
    path: 'pages/4_Langchain_PromptTemplate.py',
    description:
      'Blog outline generator using LangChain PromptTemplate. Shows sidebar text_input, st.form, template-based prompting.',
    tags: [
      'langchain',
      'prompt',
      'template',
      'prompttemplate',
      'sidebar',
      'form',
      'text_input',
      'openai',
    ],
  },
  {
    name: 'Chat with User Feedback',
    path: 'pages/5_Chat_with_user_feedback.py',
    description:
      'Chatbot with thumbs-up/down feedback collection via streamlit-feedback. Shows chat UI, feedback widgets, dynamic keys.',
    tags: ['chat', 'feedback', 'thumbs', 'rating', 'streamlit_feedback', 'openai', 'session_state'],
  },
]

export interface ExampleEntry {
  title: string
  description: string
  content: string // the full Python source
  format: 'py'
  url: string
  tags: string[]
}

export async function GET() {
  const results: ExampleEntry[] = []
  const errors: string[] = []

  // Fetch all examples in parallel
  const fetches = EXAMPLE_FILES.map(async (ex) => {
    const url = `${GITHUB_RAW_BASE}/${ex.path}`
    try {
      const res = await fetch(url, {
        next: { revalidate: 86400 }, // cache for 24 h — examples change rarely
      })
      if (!res.ok) {
        errors.push(`${ex.name}: HTTP ${res.status}`)
        return
      }
      const code = await res.text()
      if (!code.trim()) {
        errors.push(`${ex.name}: empty response`)
        return
      }
      results.push({
        title: ex.name,
        description: ex.description,
        content: code,
        format: 'py',
        url: `https://github.com/streamlit/llm-examples/blob/main/${ex.path}`,
        tags: ex.tags,
      })
    } catch (err) {
      errors.push(`${ex.name}: ${err instanceof Error ? err.message : 'unknown error'}`)
    }
  })

  await Promise.all(fetches)

  if (results.length === 0) {
    return NextResponse.json(
      { error: 'All example fetches failed', details: errors },
      { status: 502 },
    )
  }

  return NextResponse.json(results, {
    headers: {
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'X-Examples-Fetched': String(results.length),
      'X-Examples-Errors': errors.join('; ') || 'none',
    },
  })
}
