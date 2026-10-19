/**
 * Prep flashcards for case law, quotes, and judge Q&A drills.
 * Instant Case facts stay under /facts Memorise; this deck is the broader cite drill.
 */

export const CARD_KINDS = [
  { id: 'case_ref', label: 'Case reference' },
  { id: 'quote', label: 'Quotation' },
  { id: 'judge_qa', label: 'Judge Q&A' },
  { id: 'instant', label: 'Instant case' },
]

export const CARD_SIDES = [
  { id: 'either', label: 'Either side' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'petitioner', label: 'Petitioner' },
  { id: 'respondent', label: 'Respondent' },
]

export const SEED_CARDS = [
  {
    id: 'c-carpenter',
    kind: 'case_ref',
    side: 'either',
    label: 'Carpenter',
    cite: '585 U.S. 296 (2018)',
    front: 'What happened in Carpenter, and what did the Court hold?',
    back: 'Government obtained 127 days of cell-site location information without a warrant. Held: a search. Long-term tracking of a phone maps a person’s movements in a way that reveals the privacies of life; the third-party doctrine does not automatically greenlight that haul.',
    tags: ['q1', 'fourth'],
  },
  {
    id: 'c-katz',
    kind: 'case_ref',
    side: 'either',
    label: 'Katz',
    cite: '389 U.S. 347 (1967)',
    front: 'What is the Katz rule in one sentence?',
    back: 'The Fourth Amendment protects people, not places: a search occurs when the government invades a subjective expectation of privacy that society is prepared to recognize as reasonable (phone-booth bug on the outside of the booth).',
    tags: ['q1', 'fourth'],
  },
  {
    id: 'c-youngstown',
    kind: 'case_ref',
    side: 'either',
    label: 'Youngstown',
    cite: '343 U.S. 579 (1952)',
    front: 'State Jackson’s three categories in Youngstown.',
    back: 'Cat 1: Congress authorized — power at its maximum. Cat 2: zone of twilight — Congress silent; depends on circumstances. Cat 3: Congress opposed (express or implied) — power at its lowest ebb; survives only if the subject is beyond Congress’s reach.',
    tags: ['q2', 'article-ii'],
  },
  {
    id: 'c-judge-carpenter-resp',
    kind: 'judge_qa',
    side: 'respondent',
    label: 'Judge · Carpenter push (respondent)',
    cite: '',
    front: 'If the judge asks (as respondent): “Isn’t this just Carpenter with cameras — 93 days of location data?” What do you say back, and which cases do you cite?',
    back: 'Distinguish: Carpenter involved a warrantless demand for a phone company’s stored CSLI, not observation of what was already exposed to public view. Cite Ciraolo (aerial view of backyard from public airspace), Tuggle (pole cameras on public poles; duration alone does not create a search), and the stakeout analogy in the Fourteenth Circuit majority. Concede duration is real; argue exposure + vantage still control under Katz’s second prong.',
    tags: ['q1', 'oa', 'respondent'],
  },
  {
    id: 'c-judge-milligan-pet',
    kind: 'judge_qa',
    side: 'petitioner',
    label: 'Judge · Milligan push (petitioner)',
    cite: '',
    front: 'If the judge asks (as petitioner): “Courts were open — why doesn’t Milligan end this?” What cases and record facts do you cite back?',
    back: 'Lead with Milligan: martial rule cannot exist where the courts are open and working. Tie to Bronner’s Article III arraignment, not-guilty plea, and bond release before military transfer (R. 8). Distinguish Quirin (unlawful combatants tried by military commission in wartime) and Hamdi (even battlefield detainees get notice and a chance to rebut). Cite Youngstown Cat 3 / ATA + NDAA carve-outs for LPRs on U.S. soil.',
    tags: ['q2', 'oa', 'petitioner'],
  },
  {
    id: 'c-quote-katz',
    kind: 'quote',
    side: 'either',
    label: 'Katz quote',
    cite: 'Katz, 389 U.S. at 351',
    front: 'Complete the line: “What a person knowingly exposes to the public…',
    back: '“…even in his own home or office, is not a subject of Fourth Amendment protection. But what he seeks to preserve as private, even in an area accessible to the public, may be constitutionally protected.”',
    tags: ['q1', 'quote'],
  },
]

export function blankCard(overrides = {}) {
  return {
    id: `c-${Date.now()}`,
    kind: 'judge_qa',
    side: 'either',
    label: '',
    cite: '',
    front: '',
    back: '',
    tags: [],
    ...overrides,
  }
}
