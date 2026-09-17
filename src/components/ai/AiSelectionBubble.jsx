import { useEffect, useRef } from 'react'
import { Sparkles, X } from 'lucide-react'
import { GroundingBadge } from '../GroundingBadge'
import { useAiUi } from '../../ai/AiUiContext'
import {
  SAMPLE_PROMPT_GROUPS,
  WEB_SAMPLE_PROMPT_GROUPS,
  SELECTION_QUICK,
  WEB_SELECTION_QUICK,
  formatReplyForDisplay,
} from '../../ai/samplePrompts'

/**
 * Floating AI bubble.
 * Mode switch: Uploaded articles (RAG only) | Web (corpus + OpenRouter search).
 */
export function AiSelectionBubble() {
  const {
    open,
    ctx,
    setCtx,
    groundingSource,
    switchGroundingSource,
    prompt,
    setPrompt,
    loading,
    reply,
    closeBubble,
    askAi,
    runPrompt,
    clearReply,
  } = useAiUi()

  const focusRef = useRef(null)
  const webPlus = groundingSource === 'web_plus'

  const hasSelection = Boolean(ctx.selection?.trim())
  const showSamples = !hasSelection && !loading && !reply
  const sampleGroups = webPlus ? WEB_SAMPLE_PROMPT_GROUPS : SAMPLE_PROMPT_GROUPS
  const quickActions = webPlus ? WEB_SELECTION_QUICK : SELECTION_QUICK

  useEffect(() => {
    if (!open || (!loading && !reply)) return
    requestAnimationFrame(() => {
      focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [open, loading, reply])

  if (!open) return null

  const corpusEvidence = (reply?.evidence || []).filter((ev) => ev.source_type !== 'web')
  const webEvidence = (reply?.evidence || []).filter((ev) => ev.source_type === 'web')

  return (
    <div
      className="ai-bubble"
      role="dialog"
      aria-label={webPlus ? 'Ask AI with uploaded articles and web search' : 'Ask AI about uploaded articles'}
    >
      <div className="ai-bubble-header">
        <span className="ai-bubble-title">
          <Sparkles size={14} /> Ask AI
        </span>
        <button type="button" className="icon-btn soft" aria-label="Close" onClick={closeBubble}>
          <X size={14} />
        </button>
      </div>

      <div className="ai-bubble-scroll">
        <div className="ai-mode-row" role="tablist" aria-label="Ask AI mode">
          <button
            type="button"
            role="tab"
            aria-selected={!webPlus}
            className={!webPlus ? 'on' : ''}
            onClick={() => switchGroundingSource('documents')}
          >
            Uploaded articles
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={webPlus}
            className={webPlus ? 'on' : ''}
            onClick={() => switchGroundingSource('web_plus')}
          >
            Web
          </button>
        </div>

        <p className="ai-bubble-policy">
          {webPlus ? (
            <>
              <strong>Uploaded articles + web.</strong> Prefers your PDFs; searches the web when the
              corpus is thin or you ask for outside definitions and background.
            </>
          ) : (
            <>
              <strong>Uploaded articles only.</strong> Answers cite retrieved passages; refuses if the
              corpus is not enough.
            </>
          )}
        </p>

        {hasSelection ? (
          <>
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
            <blockquote className="ai-bubble-quote">
              “{ctx.selection.slice(0, 220)}
              {ctx.selection.length > 220 ? '…' : ''}”
            </blockquote>
            <div className="ai-quick-row">
              {quickActions.map((q) => (
                <button key={q.id} type="button" className="ai-quick" onClick={() => setPrompt(q.prompt)}>
                  {q.label}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {showSamples ? (
          <>
            <p className="ai-bubble-empty">
              {webPlus
                ? 'Try a sample — definitions can use web search.'
                : 'Try a sample question — no law background needed.'}
            </p>
            <div className="ai-samples">
              {sampleGroups.map((group) => (
                <div key={group.label} className="ai-sample-group">
                  <div className="ai-sample-label mono">{group.label}</div>
                  {group.hint ? <p className="ai-sample-hint">{group.hint}</p> : null}
                  {group.questions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      className="ai-sample-chip"
                      disabled={loading}
                      onClick={() => runPrompt(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        ) : null}

        {loading ? (
          <div className="ai-bubble-loading" ref={focusRef} aria-live="polite">
            <div className="ai-sample-label mono">Working</div>
            {prompt ? <p className="ai-bubble-loading-q">{prompt}</p> : null}
            <p className="ai-bubble-loading-status">
              {webPlus
                ? 'Checking uploaded articles, then web search if needed…'
                : 'Retrieving passages from uploaded articles and generating a grounded answer…'}
            </p>
          </div>
        ) : null}

        {reply && !loading ? (
          <div className="ai-bubble-reply" ref={focusRef} aria-live="polite">
            <div className="ai-bubble-reply-head">
              <GroundingBadge
                status={reply.grounding_status}
                articleMode={!webPlus}
                webPlus={webPlus || reply.grounding_source === 'web_plus'}
              />
              {reply.claims_total != null ? (
                <span className="mono ai-stub">
                  quotes {reply.claims_verified}/{reply.claims_total}
                </span>
              ) : null}
            </div>
            {prompt ? <p className="ai-bubble-asked">Q: {prompt}</p> : null}
            {reply.grounding_notes ? <p className="ai-bubble-notes">{reply.grounding_notes}</p> : null}

            {corpusEvidence.length ? (
              <div className="ai-bubble-evidence ai-bubble-evidence-first">
                <div className="ai-sample-label mono">Retrieved from uploaded articles</div>
                {corpusEvidence.slice(0, 4).map((ev) => (
                  <div key={ev.id} className="ai-ev-card">
                    <div className="mono ai-ev-src">
                      [{ev.id}] {ev.source}
                      {ev.page != null ? ` · p.${ev.page}` : ''}
                    </div>
                    <p>{ev.preview}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {webEvidence.length ? (
              <div className="ai-bubble-evidence">
                <div className="ai-sample-label mono">From the web</div>
                {webEvidence.slice(0, 4).map((ev) => (
                  <div key={ev.id} className="ai-ev-card">
                    <div className="mono ai-ev-src">
                      [{ev.id}] {ev.source}
                    </div>
                    {ev.url ? (
                      <a className="ai-ev-url" href={ev.url} target="_blank" rel="noreferrer">
                        {ev.url}
                      </a>
                    ) : null}
                    <p>{ev.preview}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <pre className="ai-bubble-reply-text">{formatReplyForDisplay(reply.text)}</pre>
          </div>
        ) : null}
      </div>

      <div className="ai-bubble-footer">
        <textarea
          className="ai-bubble-input"
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            webPlus
              ? 'Ask from your articles and the web…'
              : 'Ask from your uploaded articles…'
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              askAi()
            }
          }}
        />

        <div className="ai-bubble-actions">
          <button type="button" className="btn-ink" disabled={loading || !prompt.trim()} onClick={askAi}>
            {loading ? 'Searching…' : 'Ask'}
          </button>
          {reply && !loading ? (
            <button type="button" className="btn-soft" onClick={clearReply}>
              New question
            </button>
          ) : null}
          <span className="mono ai-kbd">⌘↵</span>
        </div>
      </div>
    </div>
  )
}
