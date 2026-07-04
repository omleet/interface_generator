/**
 * python-code-editor.ts
 *
 * Chat-based editing and traceback-driven error correction for generated
 * Python / Streamlit code.
 *
 * Two modes:
 *  1. editPythonCode   — natural-language instruction → updated code
 *  2. fixPythonError   — Python traceback paste → corrected code
 *
 * Kept separate from python-generator.ts to avoid polluting the main flow.
 */

import type { LLMConfig, LLMMessage } from './llm-client'
import { generateCompletion } from './llm-client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface EditCallbacks {
  onToken: (token: string) => void
  onComplete: (updatedCode: string) => void
  onError: (error: Error) => void
}

// ─── Heuristic: is the user pasting a traceback? ─────────────────────────────
// Returns true when the text looks like a Python error traceback so the UI can
// route it to fixPythonError instead of editPythonCode.
export function looksLikeTraceback(text: string): boolean {
  const t = text.trim()
  // Common traceback patterns
  return (
    /Traceback \(most recent call last\)/i.test(t) ||
    /^\s+File ".*", line \d+/m.test(t) ||
    /^(ValueError|TypeError|AttributeError|ImportError|ModuleNotFoundError|NameError|KeyError|IndexError|RuntimeError|StreamlitAPIException|StreamlitDuplicateElementId|SyntaxError|IndentationError|ZeroDivisionError|FileNotFoundError|PermissionError|OSError|Exception):/m.test(t)
  )
}

// ─── System prompts ──────────────────────────────────────────────────────────

const EDITOR_SYSTEM_PROMPT = `You are an expert Streamlit developer helping the user modify existing Python code.

RULES — follow every single one:
1. Output ONLY the complete, updated Python source code — no markdown fences, no explanation, no preamble.
2. Preserve all code that the user did NOT ask to change. Do not remove or restructure unrelated sections.
3. Apply ONLY the specific change requested. If the request is ambiguous, make the most conservative interpretation.
4. The first line of your output MUST be a Python import statement.
5. Keep the existing import block; add new imports only when strictly required by the change.
6. Never switch the UI framework — if the original uses Streamlit, keep Streamlit.
7. If the instruction is unclear or impossible to apply safely, output the original code unchanged.
8. NEVER generate authentication or login code (st.auth_login, st.experimental_user, etc.) unless the user explicitly asks.
9. If pd.date_range(periods=N) is used, every column in the same DataFrame must have exactly N elements.`

const ERROR_FIX_SYSTEM_PROMPT = `You are a senior Streamlit debugger. The user will give you a Python traceback and the current source code.
Your job: identify the root cause and return the COMPLETE corrected Python source.

OUTPUT FORMAT:
- Output ONLY raw Python code — no markdown fences, no explanation, no preamble.
- First line must be a Python import statement.
- Return the ENTIRE file, not just the changed section.
- Preserve all logic that is not related to the error.

COMMON STREAMLIT / PANDAS FIXES:
- ValueError "Length mismatch": count list elements vs pd.date_range(periods=N). Make them equal.
- AttributeError on st.*: remove any non-existent Streamlit API calls (st.auth_login, st.experimental_user, etc.).
- StreamlitDuplicateElementId: add unique key= to every widget that appears more than once.
- TypeError on px.*: use color_discrete_sequence= for string columns, color_continuous_scale= for numeric columns.
- NameError: add the missing import at the top of the file.
- SyntaxError / IndentationError: fix the reported line and verify surrounding context.
- ValueError "Value of 'x' is not the name of a column": only use column names that exist in the DataFrame.
- FutureWarning on pd.date_range freq: replace 'H'→'h', 'T'→'min', 'S'→'s', 'A'→'YE', 'M'→'ME', 'Q'→'QE'.
- st.form_submit_button outside st.form: wrap in "with st.form(key='...'):".
- ModuleNotFoundError: replace missing third-party module with a standard-library or pandas/plotly equivalent.

AUTHENTICATION / LOGIN:
- NEVER generate any authentication or login code unless the user explicitly asked for it.
- If the traceback is caused by a non-existent auth API (st.auth_login, st.experimental_user, etc.), remove those lines entirely and replace with plain content.`

// ─── Edit function (natural-language instruction) ─────────────────────────────

/**
 * Sends the current Python code and the full chat history to the LLM,
 * streaming back the updated Python source.
 */
export async function editPythonCode(
  currentCode: string,
  history: ChatMessage[],
  instruction: string,
  llmConfig: LLMConfig,
  callbacks: EditCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const messages: LLMMessage[] = [
    { role: 'system', content: EDITOR_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Here is the current Python code you will edit:\n\n${currentCode}`,
    },
  ]

  // Replay the previous edit history so the model has context on what was already changed
  for (const msg of history) {
    messages.push({ role: msg.role, content: msg.content })
  }

  messages.push({ role: 'user', content: instruction })

  let accumulated = ''

  await generateCompletion(
    llmConfig,
    messages,
    {
      onToken: (token) => {
        accumulated += token
        callbacks.onToken(token)
      },
      onComplete: () => {
        const clean = stripFences(accumulated)
        callbacks.onComplete(clean)
      },
      onError: callbacks.onError,
    },
    signal,
  )
}

// ─── Error fix function (traceback → corrected code) ─────────────────────────

/**
 * Given a Python traceback pasted by the user, asks the LLM to identify the
 * root cause and return a fully corrected version of the current code.
 *
 * @param currentCode   The Python code that produced the error.
 * @param traceback     The complete traceback text pasted by the user.
 * @param history       Previous chat turns (for context across multiple fix rounds).
 * @param llmConfig     LLM provider config.
 * @param callbacks     Streaming callbacks: onToken, onComplete, onError.
 * @param signal        Optional AbortSignal to cancel the request.
 */
export async function fixPythonError(
  currentCode: string,
  traceback: string,
  history: ChatMessage[],
  llmConfig: LLMConfig,
  callbacks: EditCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const messages: LLMMessage[] = [
    { role: 'system', content: ERROR_FIX_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `<current_code>\n${currentCode}\n</current_code>`,
    },
    {
      role: 'assistant',
      content: 'I have read the current code. Please share the traceback.',
    },
  ]

  // Include previous fix rounds for multi-turn error correction
  for (const msg of history) {
    messages.push({ role: msg.role, content: msg.content })
  }

  messages.push({
    role: 'user',
    content: `<traceback>\n${traceback.trim()}\n</traceback>\n\nIdentify the root cause and return the complete corrected Python code.`,
  })

  let accumulated = ''

  await generateCompletion(
    llmConfig,
    messages,
    {
      onToken: (token) => {
        accumulated += token
        callbacks.onToken(token)
      },
      onComplete: () => {
        const clean = stripFences(accumulated)
        callbacks.onComplete(clean)
      },
      onError: callbacks.onError,
    },
    signal,
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Remove leading/trailing ```python … ``` or ``` … ``` fences if present. */
function stripFences(raw: string): string {
  return raw
    .replace(/^```(?:python)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
}
