import { describe, expect, it } from 'vitest'
import { scoreAnnotationRow } from './annotationScore'
import { searchAnnotations } from './annotationSearch'

const Q =
  "whre in my ntoes do i write about the intention of Congress and how the court sohuld look to that when something is excluded repreately /consittently from law then that's what COngress intends"

describe('annotationScore', () => {
  it('scores Costanzo intention note far above loose Congress noise', () => {
    const costanzo = {
      title: 'Highlight · p.2',
      sectionName: 'Costanzo v. Tillinghast',
      text: 'Quote: “The failure of Congress to alter or amend a statute, notwithstanding a consistent construction”\nHere teh court says that if COngress odesnt include/chagne a statue, then you must assume that the way it is written is presumably the particular intention',
    }
    const noise = {
      title: 'Highlight · p.3',
      sectionName: 'Instant Case',
      text: 'Quote: “Efforts to pass laws expressly forbidding the president to detain Americans indefinitely failed in both houses of Congress”',
    }
    const aumf = {
      title: 'Highlight · p.2',
      sectionName: 'Articles',
      text: 'Quote: “Authorization for Use of Military Force”\nThis was a short law Congress passed after 9/11',
    }
    const c = scoreAnnotationRow(costanzo, Q)
    const n = scoreAnnotationRow(noise, Q)
    const a = scoreAnnotationRow(aumf, Q)
    expect(c).toBeGreaterThan(n)
    expect(c).toBeGreaterThan(a)
    expect(c).toBeGreaterThan(50)
  })

  it('ranks Costanzo first in searchAnnotations', () => {
    const hits = searchAnnotations(Q, {
      annotations: [
        {
          id: 'a-noise',
          caseId: 'case-at-bar',
          page: 3,
          kind: 'highlight',
          text: '',
          quote:
            'Efforts to pass laws expressly forbidding the president to detain Americans indefinitely failed in both houses of Congress',
        },
        {
          id: 'a-costanzo',
          caseId: 'costanzo',
          fileId: 'pdf-c',
          page: 2,
          kind: 'highlight',
          text: 'Here teh court says that if COngress odesnt include/chagne a statue, then you must assume that the way it is written is presumably the particular intention',
          quote:
            'The failure of Congress to alter or amend a statute, notwithstanding a consistent construction by the department charged with its enforcement',
        },
      ],
      cases: [
        { id: 'costanzo', name: 'Costanzo v. Tillinghast' },
        { id: 'case-at-bar', name: 'Instant Case' },
      ],
      filesMeta: [{ id: 'pdf-c', name: 'costanzo.pdf', caseId: 'costanzo' }],
    })
    expect(hits[0].id).toBe('anno:a-costanzo')
    expect(hits[0].path).toContain('anno=a-costanzo')
    expect(hits[0].path).toContain('case=costanzo')
  })

  it('boosts Instant Case notes when the query says instant case', () => {
    const bronner = {
      title: 'Highlight · p.1',
      sectionName: 'Instant Case [Bronner v. USA]',
      text: 'Quote: “Petitioner Bobby Bronner was detained”\nStanding turns on whether he is in custody',
      path: '/facts?view=record',
    }
    const other = {
      title: 'Highlight · p.2',
      sectionName: 'Hamdi v. Rumsfeld',
      text: 'Quote: “A citizen-detainee seeking to challenge his classification”',
    }
    const q = 'standing in the instant case'
    expect(scoreAnnotationRow(bronner, q)).toBeGreaterThan(scoreAnnotationRow(other, q))
  })
})
