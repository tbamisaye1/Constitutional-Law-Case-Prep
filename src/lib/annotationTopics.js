/**
 * Per-article topic tags on annotations (highlights, page notes, general notes).
 *
 * Vocabulary for a PDF is inferred from topics already used on that fileId.
 * Labels are free text, normalized, and multi-select per annotation.
 */

export const MAX_TOPIC_LABEL_LENGTH = 40

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeTopicLabel(raw) {
  const cleaned = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TOPIC_LABEL_LENGTH)
  return cleaned
}

/**
 * Prefer the spelling already used on this article when the user types a
 * case-insensitive match (Hamdi vs hamdi).
 *
 * @param {string} label
 * @param {string[]} vocabulary
 */
export function canonicalizeTopicLabel(label, vocabulary = []) {
  const normalized = normalizeTopicLabel(label)
  if (!normalized) return ''
  const lower = normalized.toLowerCase()
  const existing = (vocabulary || []).find((v) => String(v).toLowerCase() === lower)
  return existing || normalized
}

/**
 * @param {unknown} value
 * @param {string[]} [vocabulary]
 * @returns {string[]}
 */
export function normalizeTopicsList(value, vocabulary = []) {
  if (!Array.isArray(value)) return []
  const out = []
  const seen = new Set()
  for (const raw of value) {
    const label = canonicalizeTopicLabel(raw, vocabulary)
    if (!label) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(label)
  }
  return out
}

/**
 * Unique topic labels from a list of annotations, sorted A→Z.
 *
 * @param {Array<{ topics?: unknown }>} annotations
 * @returns {string[]}
 */
export function topicsInList(annotations) {
  const seen = new Map()
  for (const a of annotations || []) {
    for (const label of normalizeTopicsList(a.topics)) {
      const key = label.toLowerCase()
      if (!seen.has(key)) seen.set(key, label)
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

/**
 * Unique topic labels used on annotations for one article, sorted A→Z.
 *
 * @param {Array<{ fileId?: string|null, topics?: unknown }>} annotations
 * @param {string|null|undefined} fileId
 * @returns {string[]}
 */
export function topicsForFile(annotations, fileId) {
  if (!fileId) return []
  return topicsInList((annotations || []).filter((a) => a?.fileId === fileId))
}

/**
 * @param {unknown} topics
 * @param {string} label
 */
export function annotationHasTopic(topics, label) {
  const want = normalizeTopicLabel(label).toLowerCase()
  if (!want) return false
  return normalizeTopicsList(topics).some((t) => t.toLowerCase() === want)
}

/**
 * @param {unknown} topics
 * @param {string} label
 * @param {string[]} [vocabulary]
 * @returns {string[]}
 */
export function addTopic(topics, label, vocabulary = []) {
  const next = canonicalizeTopicLabel(label, vocabulary)
  if (!next) return normalizeTopicsList(topics, vocabulary)
  return normalizeTopicsList([...(Array.isArray(topics) ? topics : []), next], vocabulary)
}

/**
 * @param {unknown} topics
 * @param {string} label
 * @returns {string[]}
 */
export function removeTopic(topics, label) {
  const want = normalizeTopicLabel(label).toLowerCase()
  if (!want) return normalizeTopicsList(topics)
  return normalizeTopicsList(topics).filter((t) => t.toLowerCase() !== want)
}

/**
 * @param {unknown} topics
 * @param {string} label
 * @param {string[]} [vocabulary]
 * @returns {string[]}
 */
export function toggleTopic(topics, label, vocabulary = []) {
  if (annotationHasTopic(topics, label)) return removeTopic(topics, label)
  return addTopic(topics, label, vocabulary)
}

/**
 * True when any annotation in the list carries at least one topic.
 * @param {Array<{ topics?: unknown }>} annotations
 */
export function anyAnnotationHasTopics(annotations) {
  return (annotations || []).some((a) => normalizeTopicsList(a?.topics).length > 0)
}

/**
 * Primary topic for export grouping (first label), or empty string if untagged.
 * @param {{ topics?: unknown }} annotation
 * @param {string[]} [vocabulary]
 */
export function primaryTopic(annotation, vocabulary = []) {
  const list = normalizeTopicsList(annotation?.topics, vocabulary)
  return list[0] || ''
}
