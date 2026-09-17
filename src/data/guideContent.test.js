import { describe, expect, it } from 'vitest'
import classicSections from './guideSections.classic.json'
import claritySections from './guideSections.clarity.json'

const SECTION_IDS = [
  'orient',
  'timeline',
  'rmap',
  'statutes',
  'below',
  'q1doc',
  'q1story',
  'q1cases',
  'split',
  'q1apply',
  'q2doc',
  'youngstown',
  'q2cases',
  'q2apply',
  'hinge',
  'facts',
  'gloss',
  'fixes',
]

describe('Bronner guide copy variants', () => {
  it('keeps the same section ids in classic and clarity', () => {
    expect(classicSections.map((s) => s.id)).toEqual(SECTION_IDS)
    expect(claritySections.map((s) => s.id)).toEqual(SECTION_IDS)
  })

  it('clarity glossary catalogues acronyms and governing documents', () => {
    const glossary = claritySections.find((s) => s.id === 'gloss')
    expect(glossary.title).toBe('Glossary & acronyms')

    const requiredTerms = [
      'Authorization for Use of Military Force',
      'National Defense Authorization Act',
      'Anti-Terrorist Act',
      'Protection Against Terrorism',
      'Assistant United States Attorney',
      'United States Citizenship and Immigration Services',
      'cell-site location information',
      'material support',
      'lawful permanent resident',
    ]
    for (const term of requiredTerms) {
      expect(glossary.html.toLowerCase()).toContain(term.toLowerCase())
    }
  })

  it('clarity does not confuse PAT with the PATRIOT Act', () => {
    const glossaryText = claritySections.find((s) => s.id === 'gloss').html
    expect(glossaryText).toContain('not the PATRIOT Act')
  })

  it('clarity removes the most compressed editorial phrases', () => {
    const allGuideText = claritySections.map((section) => section.html).join('\n')
    for (const phrase of [
      'Everyone recites',
      'Beautiful phrases meaning',
      'The move to copy',
      'Youngstown is the map',
    ]) {
      expect(allGuideText).not.toContain(phrase)
    }
  })
})
