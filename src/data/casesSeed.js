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
  holding: c.holding,
  rule: c.rule,
  usePetitioner: c.usePetitioner || c.guideUse || '',
  useRespondent: c.useRespondent || '',
  suggestedFile: c.suggestedFile || `${c.name}.pdf`,
}))
