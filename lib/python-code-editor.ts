/**
 * python-code-editor.ts
 *
 * Chat-based editing of generated Python / Streamlit code.
 * Sends the current code + a natural-language instruction to the LLM and
 * streams back the full updated Python source.
 *
 * Intentionally kept separate from python-generator.ts so it can be imported
 * only from the PythonCodeViewer component without polluting the main flow.
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

// ─── System prompt ─────────────────────────────────────────────────────────────

const EDITOR_SYSTEM_PROMPT = `You are an expert Streamlit developer helping the user modify existing Python code.

RULES — follow every single one:
1. Output ONLY the complete, updated Python source code — no markdown fences, no explanation, no preamble.
2. Preserve all code that the user did NOT ask to change. Do not remove or restructure unrelated sections.
3. Apply ONLY the specific change requested. If the request is ambiguous, make the most conservative interpretation.
4. The first line of your output MUST be a Python import statement.
5. Keep the existing import block; add new imports only when strictly required by the change.
6. Never switch the UI framework — if the original uses Streamlit, keep Streamlit.
7. If the instruction is unclear or impossible to apply safely, output the original code unchanged.`

// ─── Main function ─────────────────────────────────────────────────────────────

/**
 * Sends the current Python code and the full chat history to the LLM,
 * streaming back the updated Python source.
 *
 * @param currentCode   The Python code currently shown in the viewer.
 * @param history       All previous (user + assistant) chat turns for context.
 * @param instruction   The latest user instruction.
 * @param llmConfig     LLM provider config (same object used by the generator).
 * @param callbacks     Streaming callbacks: onToken, onComplete, onError.
 * @param signal        Optional AbortSignal to cancel the request.
 */
export async function editPythonCode(
  currentCode: string,
  history: ChatMessage[],
  instruction: string,
  llmConfig: LLMConfig,
  callbacks: EditCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  // Build the message list:
  //  • system  — editor persona + rules
  //  • user    — the current code (anchor)
  //  • [N previous turns from history, excluding the anchor]
  //  • user    — the new instruction
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

  // The new instruction
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
        // Strip accidental markdown fences the model might emit
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
