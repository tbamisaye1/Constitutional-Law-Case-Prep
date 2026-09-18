import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Callout } from '../components/CaseCard'
import { GroundingBadge } from '../components/GroundingBadge'
import { chatPrep, downloadIngestFile } from '../api/client'
import { useCaseLibrary } from '../hooks/useCaseLibrary'
import { openEvidencePdf } from '../lib/openEvidencePdf'

/**
 * Optional agent room with visible grounding status.
 * Main flow: floating Ask AI bubble on every page (see AiSelectionBubble).
 */
export function AgentPage() {
  const navigate = useNavigate()
  const lib = useCaseLibrary()
  const [question, setQuestion] = useState('')
  const [groundingSource, setGroundingSource] = useState('documents')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [openingId, setOpeningId] = useState('')

  const webPlus = groundingSource === 'web_plus'

  async function onAsk(e) {
    e.preventDefault()
    if (!question.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await chatPrep(question.trim(), 'bronner-2026', groundingSource)
      setResult(data)
    } catch (err) {
      setError(err.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  async function onOpenEvidence(ev) {
    if (!ev || ev.source_type === 'web') return
    setOpeningId(ev.id)
    try {
      await openEvidencePdf({ evidence: ev, lib, navigate, downloadIngestFile })
    } finally {
      setOpeningId('')
    }
  }

  return (
    <section>
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', marginBottom: 8 }}>Agent (optional)</h1>
      <p style={{ color: 'var(--ink-2)', maxWidth: '66ch' }}>
        Use the floating <strong>Ask AI</strong> button on any page for sample questions and grounded
        answers. This page is a full-width chat room with the same backend.
      </p>

      <Callout label="Verify before OA" tone="note">
        <p style={{ margin: 0 }}>
          Uploaded articles mode stays corpus-only. Web mode prefers your PDFs and can also search the
          web. Check quotes and cites yourself before relying on them in oral argument.
        </p>
      </Callout>

      <form className="agent-form" onSubmit={onAsk}>
        <div className="ai-mode-row" role="tablist" aria-label="Ask AI mode" style={{ marginBottom: 12, maxWidth: 420 }}>
          <button
            type="button"
            role="tab"
            aria-selected={!webPlus}
            className={!webPlus ? 'on' : ''}
            onClick={() => {
              setGroundingSource('documents')
              setResult(null)
            }}
          >
            Uploaded articles
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={webPlus}
            className={webPlus ? 'on' : ''}
            onClick={() => {
              setGroundingSource('web_plus')
              setResult(null)
            }}
          >
            Web
          </button>
        </div>

        <label className="mono agent-label" htmlFor="agent-q">
          Question
        </label>
        <textarea
          id="agent-q"
          rows={4}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={
            webPlus
              ? 'Ask from your articles and the web…'
              : 'Ask in plain English — or use the floating Ask AI button for sample prompts.'
          }
        />
        <button type="submit" className="agent-ask" disabled={loading}>
          {loading ? 'Running…' : webPlus ? 'Ask (articles + web)' : 'Ask (grounded)'}
        </button>
      </form>

      {error ? (
        <Callout label="Error" tone="warn">
          <p style={{ margin: 0 }}>{error}</p>
        </Callout>
      ) : null}

      {result ? (
        <div className="agent-result">
          <div className="agent-result-head">
            <GroundingBadge
              status={result.grounding_status}
              articleMode={!webPlus}
              webPlus={webPlus || result.grounding_source === 'web_plus'}
            />
            <span className="mono agent-meta">
              claims {result.claims_verified}/{result.claims_total} verified
            </span>
          </div>
          {result.grounding_notes ? (
            <p className="agent-notes">{result.grounding_notes}</p>
          ) : null}
          <pre className="agent-reply">{result.reply}</pre>
          {result.evidence?.length ? (
            <div className="agent-evidence">
              <h3>Evidence used</h3>
              <ul>
                {result.evidence.map((ev) => (
                  <li key={ev.id}>
                    {ev.source_type === 'web' ? (
                      <>
                        <span className="mono">
                          [{ev.id}] {ev.source_type} · {ev.source}
                          {ev.page != null ? ` p.${ev.page}` : ''}
                        </span>
                        {ev.url ? (
                          <div>
                            <a href={ev.url} target="_blank" rel="noreferrer">
                              {ev.url}
                            </a>
                          </div>
                        ) : null}
                        <div>{ev.preview}</div>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="ai-ev-card"
                        disabled={Boolean(openingId)}
                        onClick={() => onOpenEvidence(ev)}
                        style={{ width: '100%', textAlign: 'left' }}
                      >
                        <span className="mono">
                          [{ev.id}] {ev.source_type} · {ev.source}
                          {ev.page != null ? ` p.${ev.page}` : ''}
                        </span>
                        <div>{ev.preview}</div>
                        <span className="mono ai-ev-open">
                          {openingId === ev.id ? 'Opening…' : 'Open in viewer →'}
                        </span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
