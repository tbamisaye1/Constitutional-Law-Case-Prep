import { Sparkles, X } from 'lucide-react'
import { GroundingBadge } from '../GroundingBadge'
import { useAiUi } from '../../ai/AiUiContext'

const QUICK = [
  { id: 'explain', label: 'Explain', prompt: 'Explain this in plain language for OA prep.' },
  { id: 'steelman', label: 'Steelman other side', prompt: 'Steelman the opposing side’s use of this passage.' },
  { id: 'where', label: 'Where noted?', prompt: 'Where in my notes / facts / guide is this already captured?' },
  { id: 'compare', label: 'Compare Carpenter', prompt: 'How does this relate to Carpenter? Watch for overclaim.' },
]

/**
 * Floating AI bubble: highlight → ask → (later) grounded agent reply.
 * UI only for now; askAi is a stub.
 */
export function AiSelectionBubble() {
  const {
    open,
    anchor,
    ctx,
    setCtx,
    prompt,
    setPrompt,
    loading,
    reply,
    closeBubble,
    askAi,
  } = useAiUi()

  if (!open) return null

  return (
    <div
      className="ai-bubble"
      style={{ top: Math.min(anchor.top, window.innerHeight - 320), left: Math.min(anchor.left, window.innerWidth - 360) }}
      role="dialog"
      aria-label="Ask AI about selection"
    >
      <div className="ai-bubble-head">
        <span className="ai-bubble-title">
          <Sparkles size={14} /> Ask AI
        </span>
        <button type="button" className="icon-btn soft" aria-label="Close" onClick={closeBubble}>
          <X size={14} />
        </button>
      </div>

      <div className="ai-bubble-meta mono">
        <span>{ctx.surface}</span>
        {ctx.case_id ? <span>· {ctx.case_id}</span> : null}
        {ctx.page != null && ctx.page !== '' ? <span>· {String(ctx.page)}</span> : null}
      </div>

      <div className="ai-side-row" role="group" aria-label="Side">
        {['both', 'petitioner', 'respondent'].map((s) => (
          <button
            key={s}
            type="button"
            className={ctx.side === s ? 'on' : ''}
            onClick={() => setCtx((c) => ({ ...c, side: s }))}
          >
            {s}
          </button>
        ))}
      </div>

      {ctx.selection ? (
        <blockquote className="ai-bubble-quote">“{ctx.selection.slice(0, 220)}{ctx.selection.length > 220 ? '…' : ''}”</blockquote>
      ) : (
        <p className="ai-bubble-empty">No text selected. Ask about the current page or case anyway.</p>
      )}

      <div className="ai-quick-row">
        {QUICK.map((q) => (
          <button key={q.id} type="button" className="ai-quick" onClick={() => setPrompt(q.prompt)}>
            {q.label}
          </button>
        ))}
      </div>

      <textarea
        className="ai-bubble-input"
        rows={3}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="What do you want to know or draft?"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            askAi()
          }
        }}
      />

      <div className="ai-bubble-actions">
        <button type="button" className="btn-ink" disabled={loading || !prompt.trim()} onClick={askAi}>
          {loading ? 'Thinking…' : 'Ask'}
        </button>
        <span className="mono ai-kbd">⌘↵</span>
      </div>

      {reply ? (
        <div className="ai-bubble-reply">
          <div className="ai-bubble-reply-head">
            <GroundingBadge status={reply.grounding_status} />
            {reply.stub ? <span className="mono ai-stub">UI stub</span> : null}
          </div>
          <pre className="ai-bubble-reply-text">{reply.text}</pre>
          {reply.proposed_actions?.length ? (
            <div className="ai-propose-row">
              {reply.proposed_actions.map((a) => (
                <button key={a.id} type="button" className="btn-soft" disabled={!a.enabled} title="Wired when agent tools land">
                  {a.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
