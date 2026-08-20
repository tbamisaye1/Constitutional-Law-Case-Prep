/**
 * Small presentational pieces used across pages.
 * Keep one idea per component so files stay short and easy to learn from.
 */

export function Tag({ children, tone }) {
  const className = tone ? `tag tag-${tone}` : 'tag'
  return <span className={className}>{children}</span>
}

export function Callout({ label, tone = 'note', children }) {
  return (
    <div className={`callout callout-${tone}`}>
      <span className="callout-lab mono">{label}</span>
      <div className="callout-body">{children}</div>
    </div>
  )
}

export function CaseCard({ title, cite, issue, children }) {
  const border = issue === 2 ? 'case-card-q2' : 'case-card-q1'
  return (
    <article className={`case-card ${border}`}>
      <div className="case-card-head">
        {cite ? <span className="mono cite">{cite}</span> : null}
        <h3>{title}</h3>
      </div>
      {children}
    </article>
  )
}
