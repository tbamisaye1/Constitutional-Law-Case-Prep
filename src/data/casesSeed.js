/**
 * Case library + note layers. Body content comes from the Bronner HTML guide seed.
 * Author: Tobi Bamisaye
 */

import { GUIDE_LIBRARY_CASES } from './bronnerGuideSeed'

export const CASE_NOTE_LAYERS = [
  {
    id: 'overview',
    label: 'Understanding',
    hint: 'What happened in this case and why it matters. Improve your own framing as you go.',
  },
  {
    id: 'petitioner',
    label: 'Petitioner use',
    hint: 'How you argue this for Bronner / the defense.',
  },
  {
    id: 'respondent',
    label: 'Respondent use',
    hint: 'How the government will use it; your rebuttal notes.',
  },
]

/**
 * Built-in Notes sub-tabs. Custom tabs reuse these `kind` values.
 * `layerId` is only for text tabs (notesByCase key).
 */
export const NOTE_TAB_TEMPLATES = [
  {
    id: 'understand',
    label: 'Understand',
    kind: 'text',
    layerId: 'overview',
    hint: 'What happened in this case and why it matters. Improve your own framing as you go.',
    template: true,
  },
  { id: 'facts', label: 'Facts', kind: 'facts', template: true },
  { id: 'opinions', label: 'Opinions', kind: 'opinions', template: true },
  { id: 'cites', label: 'Cites', kind: 'cites', template: true },
  { id: 'timeline', label: 'Timelines', kind: 'timeline', template: true },
  { id: 'use', label: 'Both sides', kind: 'use', template: true },
]

/** Kinds available when adding a custom Notes tab. */
export const NOTE_TAB_KINDS = [
  { id: 'text', label: 'Text page', hint: 'Free-form notes (like Understand)' },
  { id: 'facts', label: 'Facts', hint: 'Structured precedent facts' },
  { id: 'opinions', label: 'Opinions', hint: 'Majority / concurrence / dissent cards' },
  { id: 'cites', label: 'Cites', hint: 'Cite graph for this case' },
  { id: 'timeline', label: 'Timeline', hint: 'Doctrine + procedural timelines' },
  { id: 'use', label: 'Both sides', hint: 'Petitioner / respondent note split' },
]

export function emptyLayerNotes() {
  return Object.fromEntries(CASE_NOTE_LAYERS.map((l) => [l.id, '']))
}

/** Editable case cards seeded from the Bronner guide. */
export const LIBRARY_CASES = GUIDE_LIBRARY_CASES.map((c) => ({
  id: c.id,
  name: c.name,
  cite: c.cite,
  year: c.year,
  issue: c.issue,
  tag: c.tag,
  usefulness: c.usefulness,
  headlineNote: c.headlineNote || '',
  holding: c.holding,
  rule: c.rule,
  usePetitioner: c.usePetitioner || c.guideUse || '',
  useRespondent: c.useRespondent || '',
  suggestedFile: c.suggestedFile || `${c.name}.pdf`,
}))
