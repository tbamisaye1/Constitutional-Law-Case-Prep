/**
 * Case-research seed: opinions, precedent facts, cites, timelines.
 * Bulk content comes from the Bronner HTML guide; structure stays editable.
 */

import {
  GUIDE_CASE_FACTS,
  GUIDE_DOCTRINE_TIMELINE,
  GUIDE_OPINIONS,
  GUIDE_RECORD_TIMELINE,
} from './bronnerGuideSeed'

export const USEFULNESS = [
  { id: 'core', label: 'Core for matter' },
  { id: 'useful', label: 'Useful' },
  { id: 'background', label: 'Background' },
  { id: 'trap', label: 'Trap / distinguish' },
]

export const OPINION_KINDS = [
  { id: 'majority', label: 'Majority' },
  { id: 'concurrence', label: 'Concurrence' },
  { id: 'dissent', label: 'Dissent' },
]

export const SEED_OPINIONS = GUIDE_OPINIONS
export const SEED_CASE_FACTS = GUIDE_CASE_FACTS

/** Cross-cites you can expand; starter edges from how the guide links doctrine. */
export const SEED_CITES = [
  {
    id: 'cite-carp-katz',
    fromCaseId: 'carpenter',
    toCaseId: 'katz',
    pin: '',
    quote: 'The Fourth Amendment protects people, not places.',
    context: 'Carpenter sits inside the Katz frame before the CSLI / third-party fight.',
    why: 'Shared starting point for Q1.',
  },
  {
    id: 'cite-carp-jones',
    fromCaseId: 'carpenter',
    toCaseId: 'jones',
    pin: '',
    quote: '',
    context: 'Carpenter draws on the Jones concurrences for whole-of-movements privacy.',
    why: 'Bridge to duration / mosaic for 93-day cameras.',
  },
  {
    id: 'cite-tug-carp',
    fromCaseId: 'tuggle',
    toCaseId: 'carpenter',
    pin: '',
    quote: '',
    context: 'Tuggle confines Carpenter and still upholds long pole-camera surveillance.',
    why: 'Government ally; know the distinguish line.',
  },
  {
    id: 'cite-ys-mill',
    fromCaseId: 'youngstown',
    toCaseId: 'milligan',
    pin: '',
    quote: '',
    context: 'Youngstown method + Milligan open-courts companion for Q2.',
    why: 'Pair for military custody of an LPR when courts are open.',
  },
  {
    id: 'cite-hamdi-mathews',
    fromCaseId: 'hamdi',
    toCaseId: 'mathews',
    pin: '',
    quote: '',
    context: 'Hamdi applies Mathews balancing to detention process.',
    why: 'Process template both sides use.',
  },
]

export const SEED_DOCTRINE_TIMELINE = GUIDE_DOCTRINE_TIMELINE

export const SEED_PROCEDURAL_TIMELINE = [
  {
    id: 'pr-carp-1',
    kind: 'procedural',
    year: '2011',
    caseId: 'carpenter',
    issue: 1,
    label: 'Investigation / CSLI orders',
    note: 'Historical CSLI obtained under SCA standard.',
  },
  {
    id: 'pr-carp-2',
    kind: 'procedural',
    year: '2016',
    caseId: 'carpenter',
    issue: 1,
    label: 'Sixth Circuit',
    note: 'Affirms under third-party doctrine.',
  },
  {
    id: 'pr-carp-3',
    kind: 'procedural',
    year: '2018',
    caseId: 'carpenter',
    issue: 1,
    label: 'SCOTUS opinion',
    note: 'Historical CSLI access is a search.',
  },
]

/** Bronner matter chronology (not case-law doctrine). kind: record */
export const SEED_RECORD_TIMELINE = GUIDE_RECORD_TIMELINE.map((t) => ({
  id: t.id,
  kind: 'record',
  year: t.date,
  caseId: null,
  issue: 0,
  label: t.date,
  note: t.note,
}))
