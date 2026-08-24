/**
 * Shows whether an agent reply is grounded in uploaded articles.
 */
const LABELS = {
  grounded: 'From articles',
  partial: 'Partial match',
  abstained: 'Not in articles',
  unverified: 'Check sources',
  no_evidence: 'No articles indexed',
}

const LABELS_DEFAULT = {
  grounded: 'Grounded',
  partial: 'Partial',
  abstained: 'Abstained',
  unverified: 'Unverified',
  no_evidence: 'No evidence',
}

export function GroundingBadge({ status, articleMode = false }) {
  const key = status || 'unverified'
  const labels = articleMode ? LABELS : LABELS_DEFAULT
  return (
    <span className={`grounding-badge grounding-${key} mono`} title={key}>
      {labels[key] || key}
    </span>
  )
}
