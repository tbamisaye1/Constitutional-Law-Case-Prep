import { useState } from 'react'
import { Callout } from '../components/CaseCard'
import { GroundingBadge } from '../components/GroundingBadge'
import { chatPrep } from '../api/client'

/**
 * Optional agent room with visible grounding status.
 * Empty corpus → abstain (good). Never treat a fluent reply as gospel for OA.
 */
export function AgentPage() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  async function onAsk(e) {
    e.preventDefault()
    if (!question.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await chatPrep(question.trim())
      setResult(data)
    } catch (err) {
      setError(err.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', marginBottom: 8 }}>Agent (optional)</h1>
      <p style={{ color: 'var(--ink-2)', maxWidth: '66ch' }}>
        While reading, highlight text and use the <strong>Ask AI</strong> bubble (or the floating
        button). This page is the deeper chat room with grounding status when the backend is running.
      </p>

      <Callout label="Verify before OA" tone="note">
        <p style={{ margin: 0 }}>
          Replies are only as good as the indexed corpus. Check quotes and cites yourself before
          relying on them in oral argument.
        </p>
      </Callout>

      <form className="agent-form" onSubmit={onAsk}>
        <label className="mono agent-label" htmlFor="agent-q">
          Question
        </label>
        <textarea
          id="agent-q"
          rows={4}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What did Tuggle hold about pole-camera duration? Quote the opinion."
        />
        <button type="submit" className="agent-ask" disabled={loading}>
          {loading ? 'Running…' : 'Ask (grounded)'}
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
            <GroundingBadge status={result.grounding_status} />
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
                    <span className="mono">
                      [{ev.id}] {ev.source_type} · {ev.source}
                      {ev.page != null ? ` p.${ev.page}` : ''}
                    </span>
                    <div>{ev.preview}</div>
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
