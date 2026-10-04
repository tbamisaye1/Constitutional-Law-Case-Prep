import { describe, expect, it } from 'vitest'
import {
  flattenCaseLibraryNotes,
  searchCases,
  searchWorkspace,
} from './workspaceSearch'

const CASES = [
  { id: 'hamdi', name: 'Hamdi v. Rumsfeld', cite: '542 U.S. 507', issue: 2 },
  { id: 'case-padilla', name: 'Padilla v. Rumsfeld', cite: '', issue: 2 },
]

const NOTE_TABS = [
  { id: 'tab-enemy', caseId: 'hamdi', label: 'Enemy Combatant', kind: 'text' },
]

const NOTES_BY_CASE = {
  hamdi: {
    overview: '<p>Short seed</p>',
    'tab-enemy':
      '<h2>Enemy Combatant</h2><p>The Court found Hamdi was not a POW and required courts to examine the Executive’s enemy-combatant classification.</p>',
    respondent:
      '<p>but because he is an enemy combatant they can detain him</p>',
  },
}

const CASE_FACTS = [
  {
    id: 'cf-1',
    caseId: 'case-padilla',
    text: 'José Padilla was designated an enemy combatant and held in military detention.',
    note: '',
  },
]

const NOTEBOOK = {
  tree: [
    {
      id: 'grp',
      kind: 'group',
      name: 'Bronner',
      children: [{ id: 'sec-pod', name: 'Podcasts', kind: 'section' }],
    },
  ],
  pagesBySection: {
    'sec-pod': [
      {
        id: 'pg-hamdi',
        title: 'Hamdi v Rumsfield',
        html: '<p>Military tribunals that determine someone an enemy combatant.</p>',
      },
    ],
  },
}

describe('workspaceSearch', () => {
  it('indexes custom case-library tabs like Enemy Combatant', () => {
    const rows = flattenCaseLibraryNotes({
      notesByCase: NOTES_BY_CASE,
      noteTabs: NOTE_TABS,
      cases: CASES,
    })
    expect(rows.some((r) => r.title === 'Enemy Combatant')).toBe(true)
    const hit = rows.find((r) => r.title === 'Enemy Combatant')
    expect(hit.path).toContain('case=hamdi')
    expect(hit.path).toContain('tab=tab-enemy')
    expect(hit.text.toLowerCase()).toContain('enemy-combatant')
  })

  it('finds Enemy across case notes, facts, and notebook', () => {
    const hits = searchWorkspace('Enemy', {
      notebook: NOTEBOOK,
      notesByCase: NOTES_BY_CASE,
      noteTabs: NOTE_TABS,
      caseFacts: CASE_FACTS,
      cases: CASES,
      limit: 12,
    })
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.some((h) => h.kind === 'case_note' && h.title === 'Enemy Combatant')).toBe(true)
    expect(hits.some((h) => h.kind === 'case_fact')).toBe(true)
    expect(hits.some((h) => h.kind === 'notebook')).toBe(true)
  })

  it('searches user-added cases by name', () => {
    const hits = searchCases('Padilla', CASES)
    expect(hits.map((c) => c.id)).toContain('case-padilla')
  })
})
