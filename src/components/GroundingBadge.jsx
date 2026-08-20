/**
 * Shows whether an agent reply is safe to trust for legal prep.
 * grounded = quotes checked against retrieved chunks
 * abstained = model refused (good: better than inventing a holding)
 */
const LABELS = {
  grounded: 'Grounded',
  partial: 'Partial',
  abstained: 'Abstained',
  unverified: 'Unverified',
  no_evidence: 'No evidence',
}

export function GroundingBadge({ status }) {
  const key = status || 'unverified'
  return (
    <span className={`grounding-badge grounding-${key} mono`} title={key}>
      {LABELS[key] || key}
    </span>
  )
}
