import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { chatPrep } from '../api/client'
import { groundingStatusFromReply } from './samplePrompts'
import { MATTER } from '../data/seed'
import {
  appendAskAiTurn,
  clearAskAiLastView,
  clearAskAiMemoryStore,
  lastViewFromMemory,
  memoryIsFull,
  memoryIsNearFull,
  readAskAiMemory,
  resolveAskAiLastView,
  writeAskAiLastView,
  writeAskAiMemory,
} from './askAiMemory'
import { prepNotesForAskAi } from '../lib/annotationSearch'
import { queryWantsNotes } from '../lib/notebookSearch'
import { expandInstantCaseQuery, queryMentionsInstantCase } from '../data/caseAtBar'
import { getCaseLibraryStore, useCaseLibrary } from '../hooks/useCaseLibrary'

/** Turn locally matched note chunks into evidence cards Ask AI can show/open. */
function evidenceFromClientNotes(notes) {
  return (notes || []).map((n, i) => {
    const text = String(n.text || '').trim()
    const section = n.section_name ? String(n.section_name) : ''
    const title = String(n.title || 'Note').trim() || 'Note'
    const sourceType =
      n.source_type === 'annotation' || n.source_type === 'user_note'
        ? n.source_type
        : 'notebook'
    const label =
      sourceType === 'annotation'
        ? section
          ? `${title} (Annotation · ${section})`
          : `${title} (Annotation)`
        : section
          ? `${title} (Notes · ${section})`
          : `${title} (Notes)`
    return {
      id: `note-local-${i}`,
      source: label,
      page: n.page != null && Number(n.page) > 0 ? Number(n.page) : null,
      source_type: sourceType,
      preview: text.slice(0, 220),
      notes_path: n.notes_path || null,
    }
  })
}

function mergeEvidence(clientNotes, serverEvidence) {
  const fromNotes = evidenceFromClientNotes(clientNotes)
  const seen = new Set(
    fromNotes.map((e) => `${e.source_type}|${e.notes_path}|${e.preview}`)
  )
  const rest = []
  for (const ev of serverEvidence || []) {
    const key = `${ev.source_type}|${ev.notes_path || ''}|${ev.preview || ''}`
    if (seen.has(key)) continue
    // Prefer the local annotation card when the server echoed the same note.
    if (
      (ev.source_type === 'annotation' ||
        ev.source_type === 'notebook' ||
        ev.source_type === 'user_note') &&
      fromNotes.some(
        (n) =>
          n.notes_path &&
          ev.notes_path &&
          n.notes_path === ev.notes_path
      )
    ) {
      continue
    }
    rest.push(ev)
  }
  return [...fromNotes, ...rest]
}

/**
 * Selection context for the Ask AI bubble.
 * Calls POST /chat (retrieve → reason → verify) when the backend is running.
 *
 * grounding_source:
 *   documents — FAISS RAG only (default)
 *   web_plus  — uploaded articles + OpenRouter web search
 *
 * includeNotes: when on (or when the prompt clearly asks for "my notes"),
 * matching notebook pages, PDF annotations, and case-library note tabs are
 * searched in this browser and sent with /chat. Never uploaded silently.
 *
 * advancedResponses: when on, /chat uses the stronger GPT mini (gpt-5-mini)
 * instead of the cheap default. Flip this for hard questions.
 *
 * memory: prior user/assistant turns for this browser tab (sessionStorage).
 */

const AiUiContext = createContext(null)
const INCLUDE_NOTES_KEY = 'case-prep-ask-ai-include-notes'
const ADVANCED_KEY = 'case-prep-ask-ai-advanced'

function readIncludeNotes() {
  try {
    const raw = localStorage.getItem(INCLUDE_NOTES_KEY)
    // Default on so "where did I write…" searches annotations without a toggle hunt.
    if (raw == null) return true
    return raw === '1'
  } catch {
    return true
  }
}

function readAdvancedResponses() {
  try {
    return localStorage.getItem(ADVANCED_KEY) === '1'
  } catch {
    return false
  }
}

export function AiUiProvider({ children }) {
  const lib = useCaseLibrary()
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState({ top: 80, left: 80 })
  const [ctx, setCtx] = useState({
    surface: 'guide',
    selection: '',
    matter_id: MATTER.id,
    case_id: null,
    page: null,
    side: 'both',
    source_file: '',
    file_id: null,
  })
  const [groundingSource, setGroundingSource] = useState('documents')
  const [includeNotes, setIncludeNotesState] = useState(readIncludeNotes)
  const [advancedResponses, setAdvancedResponsesState] = useState(readAdvancedResponses)
  const [memory, setMemory] = useState(() => readAskAiMemory())
  const [prompt, setPrompt] = useState(() => resolveAskAiLastView()?.prompt || '')
  const [loading, setLoading] = useState(false)
  const [reply, setReply] = useState(() => resolveAskAiLastView()?.reply || null)

  const persistMemory = useCallback((next) => {
    setMemory(next)
    writeAskAiMemory(next)
  }, [])

  const persistReply = useCallback((nextReply, nextPrompt) => {
    setReply(nextReply)
    writeAskAiLastView(nextPrompt, nextReply)
  }, [])

  const setIncludeNotes = useCallback((next) => {
    const on = Boolean(next)
    setIncludeNotesState(on)
    try {
      localStorage.setItem(INCLUDE_NOTES_KEY, on ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [])

  const setAdvancedResponses = useCallback((next) => {
    const on = Boolean(next)
    setAdvancedResponsesState(on)
    try {
      localStorage.setItem(ADVANCED_KEY, on ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [])

  const openRef = useRef(false)
  openRef.current = open

  const restoreFromMemory = useCallback(
    (assistantIndex = -1) => {
      const saved =
        assistantIndex < 0
          ? resolveAskAiLastView(memory)
          : lastViewFromMemory(memory, assistantIndex)
      if (!saved?.reply) return false
      setReply(saved.reply)
      if (saved.prompt) setPrompt(saved.prompt)
      writeAskAiLastView(saved.prompt, saved.reply)
      return true
    },
    [memory]
  )

  const openBubble = useCallback((partial, position) => {
    setCtx((prev) => ({
      ...prev,
      matter_id: MATTER.id,
      source_file: '',
      file_id: null,
      ...partial,
    }))
    if (position) setAnchor(position)
    // Keep / rebuild the last answer when reopening. Closing used to wipe
    // reply/prompt even though chat memory was still in sessionStorage.
    if (!openRef.current && !reply) {
      const saved = resolveAskAiLastView(memory)
      if (saved?.reply) {
        setReply(saved.reply)
        if (saved.prompt) setPrompt(saved.prompt)
        writeAskAiLastView(saved.prompt, saved.reply)
      }
    }
    setOpen(true)
  }, [reply, memory])

  const closeBubble = useCallback(() => {
    setOpen(false)
    setLoading(false)
  }, [])

  const switchGroundingSource = useCallback((next) => {
    const mode = next === 'web_plus' ? 'web_plus' : 'documents'
    setGroundingSource(mode)
    setReply(null)
    clearAskAiLastView()
    setLoading(false)
  }, [])

  const clearMemory = useCallback(() => {
    clearAskAiMemoryStore()
    setMemory([])
    setReply(null)
    setLoading(false)
    setPrompt('')
  }, [])

  const runPrompt = useCallback(
    async (userPrompt) => {
      const user_prompt = (userPrompt ?? prompt).trim()
      if (!user_prompt) return
      setPrompt(user_prompt)
      setLoading(true)
      setReply(null)
      // Keep the previous last-view in sessionStorage until the new reply
      // lands, so closing mid-request still restores the prior answer.

      const historyForApi = memory.map((t) => ({
        role: t.role,
        content: t.content,
      }))

      const wantsInstantCase = queryMentionsInstantCase(user_prompt)
      const wantsNotes =
        includeNotes || queryWantsNotes(user_prompt) || wantsInstantCase
      if (wantsNotes && !includeNotes) setIncludeNotes(true)

      // "Instant case" → Bronner record aliases for local note/annotation search.
      const notesQuery = expandInstantCaseQuery(user_prompt)

      const collectNotes = () => {
        if (!wantsNotes) return []
        // Prefer the live store so a just-finished recover is visible immediately.
        const store = getCaseLibraryStore() || {}
        return prepNotesForAskAi(notesQuery, {
          annotations: store.annotations || lib.annotations || [],
          cases: store.cases || lib.cases || [],
          filesMeta: store.filesMeta || lib.filesMeta || [],
          notesByCase: store.notesByCase || lib.notesByCase || {},
          noteTabs: store.noteTabs || lib.noteTabs || [],
          totalLimit: 8,
        })
      }

      let notes = collectNotes()
      // Annotations live in this browser. If the Costanzo merge left them
      // missing locally, pull from the server once and search again.
      if (wantsNotes && notes.length === 0 && typeof lib.recoverFromServer === 'function') {
        try {
          await lib.recoverFromServer()
        } catch {
          /* offline — keep going with corpus */
        }
        notes = collectNotes()
      }

      try {
        const modelTier = advancedResponses ? 'advanced' : 'standard'
        const data = await chatPrep(
          user_prompt,
          ctx.matter_id || MATTER.id,
          groundingSource,
          ctx.selection || '',
          {
            source_file: ctx.source_file || '',
            page: ctx.page,
            history: historyForApi,
            notes,
            model_tier: modelTier,
          }
        )
        const status = groundingStatusFromReply(data.grounding_status, data.reply)
        const replyText = data.reply || ''
        const evidence = mergeEvidence(notes, data.evidence)
        const nextMemory = appendAskAiTurn(
          appendAskAiTurn(memory, { role: 'user', content: user_prompt }),
          { role: 'assistant', content: replyText }
        )
        persistMemory(nextMemory)
        const usedTier = data.model_tier === 'advanced' ? 'advanced' : modelTier
        const groundingNotes = [
          data.grounding_notes,
          notes.length
            ? `Matched ${notes.length} note/annotation chunk(s) in this browser.`
            : wantsNotes
              ? 'No matching notes/annotations in this browser yet — open Costanzo or hit Sync, then ask again.'
              : '',
        ]
          .filter(Boolean)
          .join(' ')
        persistReply(
          {
            grounding_status: status,
            grounding_source: data.grounding_source || groundingSource,
            model_tier: usedTier,
            text: replyText,
            grounding_notes: groundingNotes,
            evidence,
            claims_verified: data.claims_verified,
            claims_total: data.claims_total,
            notes_used: notes.length,
          },
          user_prompt
        )
      } catch (err) {
        // Still surface local note hits when the API fails.
        const evidence = mergeEvidence(notes, [])
        persistReply(
          {
            grounding_status: evidence.length ? 'partial' : 'no_evidence',
            grounding_source: groundingSource,
            text: formatAskAiFailure(err, groundingSource),
            grounding_notes: notes.length
              ? `Matched ${notes.length} local note/annotation chunk(s) even though Ask AI failed.`
              : '',
            evidence,
            notes_used: notes.length,
          },
          user_prompt
        )
      } finally {
        setLoading(false)
      }
    },
    [
      ctx.matter_id,
      ctx.selection,
      ctx.source_file,
      ctx.page,
      prompt,
      groundingSource,
      includeNotes,
      advancedResponses,
      memory,
      persistMemory,
      persistReply,
      lib.annotations,
      lib.cases,
      lib.filesMeta,
      lib.notesByCase,
      lib.noteTabs,
    ]
  )

  const askAi = useCallback(() => runPrompt(prompt), [prompt, runPrompt])

  const clearReply = useCallback(() => {
    setReply(null)
    clearAskAiLastView()
    setLoading(false)
    setPrompt('')
  }, [])

  const value = useMemo(
    () => ({
      open,
      anchor,
      ctx,
      setCtx,
      groundingSource,
      switchGroundingSource,
      includeNotes,
      setIncludeNotes,
      advancedResponses,
      setAdvancedResponses,
      prompt,
      setPrompt,
      loading,
      reply,
      memory,
      memoryNearFull: memoryIsNearFull(memory),
      memoryFull: memoryIsFull(memory),
      openBubble,
      closeBubble,
      askAi,
      runPrompt,
      clearReply,
      clearMemory,
      restoreFromMemory,
    }),
    [
      open,
      anchor,
      ctx,
      groundingSource,
      switchGroundingSource,
      includeNotes,
      setIncludeNotes,
      advancedResponses,
      setAdvancedResponses,
      prompt,
      loading,
      reply,
      memory,
      openBubble,
      closeBubble,
      askAi,
      runPrompt,
      clearReply,
      clearMemory,
      restoreFromMemory,
    ]
  )

  return <AiUiContext.Provider value={value}>{children}</AiUiContext.Provider>
}

export function useAiUi() {
  const v = useContext(AiUiContext)
  if (!v) throw new Error('useAiUi must be used inside AiUiProvider')
  return v
}

/**
 * Production timeouts used to dump local uvicorn instructions. Say what
 * actually failed instead.
 */
export function formatAskAiFailure(err, groundingSource = 'documents') {
  const raw = String(err?.message || err || 'Request failed')
  const lower = raw.toLowerCase()
  const web = groundingSource === 'web_plus'
  const timedOut =
    lower.includes('function_invocation_timeout') ||
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('504')

  if (timedOut) {
    return (
      'Ask AI timed out on the server.\n\n' +
      (web
        ? 'Web mode (corpus + live search) often needs more than a minute. Switch to Uploaded docs, or ask a shorter question, then try again.'
        : 'The agent took too long. Try a shorter question, or retry in a moment.') +
      `\n\nDetail: ${raw.slice(0, 280)}`
    )
  }

  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return (
      'Could not reach the agent backend (network).\n\n' +
      'If you are developing locally, start it with:\n' +
      'uvicorn app.main:app --reload --port 8000\n' +
      'Then: python demo/bootstrap_moot_index.py (once, for indexed cases)'
    )
  }

  return `Ask AI failed.\n\n${raw.slice(0, 600)}`
}
