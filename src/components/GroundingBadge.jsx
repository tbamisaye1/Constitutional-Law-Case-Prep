/**
 * Shows whether an agent reply is grounded in uploaded articles and/or the web.
 */
const LABELS_ARTICLES = {
  grounded: 'From articles',
  partial: 'Partial match',
  abstained: 'Not in articles',
  unverified: 'Check sources',
  no_evidence: 'No articles indexed',
}

const LABELS_WEB = {
  grounded: 'Articles + web',
  partial: 'Partial (mixed)',
  abstained: 'No sources',
  unverified: 'Check sources',
  no_evidence: 'No sources',
}

const LABELS_DEFAULT = {
  grounded: 'Grounded',
  partial: 'Partial',
  abstained: 'Abstained',
  unverified: 'Unverified',
  no_evidence: 'No evidence',
}

export function GroundingBadge({ status, articleMode = false, webPlus = false }) {
  const key = status || 'unverified'
  let labels = LABELS_DEFAULT
  if (webPlus) labels = LABELS_WEB
  else if (articleMode) labels = LABELS_ARTICLES
  return (
    <span className={`grounding-badge grounding-${key} mono`} title={key}>
      {labels[key] || key}
    </span>
  )
}
