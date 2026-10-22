/**
 * Prep flashcards for case law and Instant Case (Bronner) record drills.
 *
 * Case-law cards test recall: which case said X, what were the facts, why the
 * court reasoned Y. Page / line drills belong only on Instant Case cards.
 *
 * Most case-ref cards are generated from GUIDE_LIBRARY_CASES so every authority
 * in the library gets facts / holding / reasoning coverage. Specialty prompts
 * and Instant Case page drills are hand-authored on top.
 *
 * Article II case briefs are enriched from Case Summaries in Brief (Google Doc).
 */

import { GUIDE_FACTS, GUIDE_LIBRARY_CASES } from './bronnerGuideSeed'
import caseSummariesSheet from './caseSummariesSheet.json'

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

/**
 * Bump when seed Q/A text changes so boards refresh those ids once.
 * User-authored cards (ids not in SEED_CARDS) are kept.
 */
export const SEED_CARDS_REVISION = 5

/** Prior seed ids dropped by the learning rewrite — strip them on refresh. */
export const LEGACY_SEED_CARD_IDS = [
  'c-carpenter',
  'c-katz',
  'c-youngstown',
  'c-judge-carpenter-resp',
  'c-judge-milligan-pet',
  'c-quote-katz',
]

/**
 * Old auto-generated cite drills still sitting in synced boards.
 * Example label: "LEARN · BANYEE · QUOTE PURPOSE"
 * Example front: "Where is 'The why…'?"
 * Those are not Instant Case page drills and should not stack on the learning seed.
 */
export function isLegacyCiteDrillCard(card) {
  if (!card || typeof card !== 'object') return false
  const label = String(card.label || '')
  const front = String(card.front || '').trim()
  if (/LEARN\s*·/i.test(label) || /QUOTE PURPOSE/i.test(label)) return true
  if (/^Where is\s+['‘’"“”]/i.test(front)) return true
  if (/^Where (does|can you find)\b/i.test(front) && !/\bon what page\b/i.test(front)) {
    return true
  }
  return false
}

const ISSUE_TAG = { 1: 'q1', 2: 'q2' }

/** Short name for prompts: "Costanzo" from "Costanzo v. Tillinghast". */
function shortName(name) {
  const base = String(name || '').replace(/\s*\(.*\)\s*$/, '').trim()
  const parts = base.split(/\s+v\.?\s+/i)
  return (parts[0] || base).replace(/^The\s+/i, '') || base
}

function issueTags(issue) {
  const t = ISSUE_TAG[issue]
  return t ? [t] : ['q1', 'q2']
}

/** One facts / holding / reasoning card per library case. */
function cardsFromLibraryCases() {
  return GUIDE_LIBRARY_CASES.flatMap((c) => {
    const short = shortName(c.name)
    const tags = [...issueTags(c.issue)]
    const cite = c.cite || ''
    return [
      {
        id: `c-facts-${c.id}`,
        kind: 'case_ref',
        side: 'either',
        label: `Facts · ${short}`,
        cite,
        front: `What were the facts surrounding ${c.name}?`,
        back: c.guideFacts || c.holding || 'See case library notes.',
        tags: [...tags, 'facts'],
      },
      {
        id: `c-hold-${c.id}`,
        kind: 'case_ref',
        side: 'either',
        label: `Holding · ${short}`,
        cite,
        front: `What did ${c.name} hold — and what rule do you take from it?`,
        back: `Holding: ${c.holding || '—'}\n\nRule: ${c.rule || '—'}`,
        tags: [...tags, 'holding'],
      },
      {
        id: `c-why-${c.id}`,
        kind: 'case_ref',
        side: 'either',
        label: `Reasoning · ${short}`,
        cite,
        front: `Why did the court reason as it did in ${c.name}?`,
        back: c.guideReasoning || c.rule || c.holding || 'See case library notes.',
        tags: [...tags, 'reasoning'],
      },
      {
        id: `c-use-${c.id}`,
        kind: 'case_ref',
        side: 'either',
        label: `Bronner use · ${short}`,
        cite,
        front: `How does ${short} get used in Bronner — petitioner frame and/or government frame?`,
        back: [
          c.usePetitioner || c.guideUse
            ? `Petitioner / Bronner: ${c.usePetitioner || c.guideUse}`
            : null,
          c.useRespondent ? `Respondent / government: ${c.useRespondent}` : null,
          !c.usePetitioner && !c.guideUse && !c.useRespondent
            ? 'See case library Both sides notes.'
            : null,
        ]
          .filter(Boolean)
          .join('\n\n'),
        tags: [...tags, 'use'],
      },
    ]
  })
}

/**
 * Cards from Case Summaries in Brief: richer facts/holding/reasoning, the
 * question decided, key quotes, and government vs Bronner use notes.
 */
function cardsFromCaseSummariesSheet() {
  const cards = []
  const sheetCases = caseSummariesSheet.cases || []
  const briefs = caseSummariesSheet.briefs || []
  const bank = caseSummariesSheet.quoteBank || []

  const shortFromTitle = (title) => {
    const head = String(title || '').split(',')[0].trim()
    return shortName(head)
  }

  for (const c of sheetCases) {
    const short = shortFromTitle(c.title)
    const cite = c.title
    const tags = ['q2', 'sheet']

    if (c.Facts) {
      cards.push({
        id: `c-facts-${c.id}`,
        kind: 'case_ref',
        side: 'either',
        label: `Facts · ${short}`,
        cite,
        front: `What were the facts surrounding ${short}?`,
        back: c.Facts,
        tags: [...tags, 'facts'],
      })
    }
    if (c.Holding) {
      cards.push({
        id: `c-hold-${c.id}`,
        kind: 'case_ref',
        side: 'either',
        label: `Holding · ${short}`,
        cite,
        front: `What did ${short} hold?`,
        back: c.Holding,
        tags: [...tags, 'holding'],
      })
    }
    if (c.Reasoning) {
      cards.push({
        id: `c-why-${c.id}`,
        kind: 'case_ref',
        side: 'either',
        label: `Reasoning · ${short}`,
        cite,
        front: `Why did the court reason as it did in ${short}?`,
        back: c.Reasoning,
        tags: [...tags, 'reasoning'],
      })
    }
    if (c.Question) {
      cards.push({
        id: `c-sheet-q-${c.id}`,
        kind: 'case_ref',
        side: 'either',
        label: `Question · ${short}`,
        cite,
        front: `What question did ${short} decide?`,
        back: c.Question,
        tags: [...tags, 'question'],
      })
    }
    if (c.Government || c.Bronner) {
      cards.push({
        id: `c-use-${c.id}`,
        kind: 'case_ref',
        side: 'either',
        label: `Bronner use · ${short}`,
        cite,
        front: `How does each side use ${short} in Bronner?`,
        back: [
          c.Government ? `Government:\n${c.Government}` : null,
          c.Bronner ? `Bronner:\n${c.Bronner}` : null,
        ]
          .filter(Boolean)
          .join('\n\n'),
        tags: [...tags, 'use'],
      })
    }

    const quotes = Array.isArray(c.quotes) ? c.quotes : []
    quotes.forEach((q, i) => {
      const cleaned = String(q || '').replace(/\s+/g, ' ').trim()
      if (cleaned.length < 40) return
      // Prefer a mid-length stem for "which case said"
      const stem =
        cleaned.length > 220 ? `${cleaned.slice(0, 200).trim()}…` : cleaned
      cards.push({
        id: `c-sheet-said-${c.id}-${i + 1}`,
        kind: 'quote',
        side: 'either',
        label: `Which case said · ${short} #${i + 1}`,
        cite,
        front: `Which case said this?\n\n${stem}`,
        back: `${c.title}\n\n${cleaned}`,
        tags: [...tags, 'quote', 'which-case'],
      })
    })
  }

  const briefSlug = (title) => {
    const t = String(title || '').toLowerCase()
    const pairs = [
      ['prize', 'prize-cases'],
      ['milligan', 'milligan'],
      ['costanzo', 'costanzo'],
      ['curtiss', 'curtiss-wright'],
      ['quirin', 'quirin'],
      ['youngstown', 'youngstown'],
      ['mathews', 'mathews'],
      ['hamdi', 'hamdi'],
      ['banyee', 'banyee'],
    ]
    for (const [needle, slug] of pairs) {
      if (t.includes(needle)) return slug
    }
    return shortName(title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  for (const b of briefs) {
    const title = b.shortTitle || ''
    const slug = briefSlug(title)
    const short = shortName(title.split('(')[0])
    if (b.what) {
      cards.push({
        id: `c-sheet-brief-what-${slug}`,
        kind: 'case_ref',
        side: 'either',
        label: `Brief · ${short} facts`,
        cite: title,
        front: `In one breath: what happened in ${short}?`,
        back: b.what,
        tags: ['q2', 'sheet', 'brief', 'facts'],
      })
    }
    if (b.ruling) {
      cards.push({
        id: `c-sheet-brief-hold-${slug}`,
        kind: 'case_ref',
        side: 'either',
        label: `Brief · ${short} ruling`,
        cite: title,
        front: `In one breath: what did ${short} hold?`,
        back: [b.rulingBy, b.ruling].filter(Boolean).join(' '),
        tags: ['q2', 'sheet', 'brief', 'holding'],
      })
    }
  }

  // Quote bank: "which opinion / case is this line from?"
  bank.forEach((item, i) => {
    const text = String(item?.text || '').replace(/\s+/g, ' ').trim()
    const cite = String(item?.cite || '').trim()
    if (text.length < 50 || !cite) return
    const stem = text.length > 220 ? `${text.slice(0, 200).trim()}…` : text
    cards.push({
      id: `c-sheet-bank-${i + 1}`,
      kind: 'quote',
      side: 'either',
      label: `Quote bank · ${i + 1}`,
      cite,
      front: `Which case / opinion is this line from?\n\n${stem}`,
      back: `${cite}\n\n${text}`,
      tags: ['q2', 'sheet', 'quote', 'bank'],
    })
  })

  return cards
}

/** Instant Case cards from structured Case facts (memorise atoms). */
function cardsFromGuideFacts() {
  return GUIDE_FACTS.map((f) => {
    const page = String(f.source?.page || '').trim()
    const fn = String(f.source?.footnote || '').trim()
    const cite = page
      ? fn
        ? `R. ${page} n.${fn}`
        : `R. ${page}`
      : f.source?.note || ''
    const hook = f.memoriseLine || f.text.slice(0, 72)
    return {
      id: `c-inst-fact-${f.id}`,
      kind: 'instant',
      side: f.side === 'petitioner' || f.side === 'respondent' ? f.side : 'either',
      label: `Instant · ${hook}`,
      cite,
      front: `What does the instant case say about this, and on what page?\n\n${hook}`,
      back: `${f.text}${cite ? ` — ${cite}` : ''}${
        f.source?.note ? ` (${f.source.note})` : ''
      }`,
      tags: ['instant', 'page', ...(f.argumentTags || []).filter((t) => t !== 'memorise')],
    }
  })
}

/**
 * “Which case says X” prompts — proposition on the front, case name on the back.
 * These are the high-value recall drills beyond generic holding cards.
 */
const WHICH_CASE_CARDS = [
  {
    id: 'c-which-carpenter-csli',
    kind: 'case_ref',
    side: 'either',
    label: 'Which case · CSLI warrant',
    cite: 'Carpenter v. United States, 585 U.S. 296 (2018)',
    front:
      'Which case says the government needs a warrant to obtain a comprehensive historical cell-site location record?',
    back: 'Carpenter v. United States. Holding: accessing at least seven days of historical CSLI is a search. The Court framed the harm as compiling a “comprehensive chronicle” of a person’s movements; it expressly left shorter periods undecided.',
    tags: ['q1', 'which-case'],
  },
  {
    id: 'c-which-katz-people',
    kind: 'case_ref',
    side: 'either',
    label: 'Which case · people not places',
    cite: 'Katz v. United States, 389 U.S. 347 (1967)',
    front:
      'Which case says the Fourth Amendment protects people, not places — and that what you seek to preserve as private can be protected even in a public area?',
    back: 'Katz v. United States. Agents bugged the outside of a glass phone booth; no physical entry. Still a search: Katz justifiably relied on privacy. Harlan’s concurrence supplies the two-step test (subjective expectation + one society recognizes as reasonable).',
    tags: ['q1', 'which-case'],
  },
  {
    id: 'c-which-tuggle-duration',
    kind: 'case_ref',
    side: 'either',
    label: 'Which case · duration alone',
    cite: 'United States v. Tuggle, 4 F.4th 505 (7th Cir. 2021)',
    front:
      'Which case is the go-to line that “duration alone does not transform lawful observation into a search” for pole cameras on public poles?',
    back: 'United States v. Tuggle (7th Cir.). Three cameras ~18 months; public utility poles; areas exposed to public view. Not a search under existing Supreme Court doctrine. Bronner’s majority cites it for the duration-alone point — even though Tuggle itself invited Congress or the Court to revisit the rule.',
    tags: ['q1', 'which-case'],
  },
  {
    id: 'c-which-tafoya-search',
    kind: 'case_ref',
    side: 'either',
    label: 'Which case · pole camera search',
    cite: 'People v. Tafoya, 494 P.3d 613 (Colo. 2021)',
    front:
      'Which pole-camera case held that long-term continuous surveillance of curtilage was a Fourth Amendment search?',
    back: 'People v. Tafoya (Colorado). Camera on a utility pole recorded a backyard behind a six-foot privacy fence for 3+ months, with pan/tilt/zoom and indefinite storage. Held: warrantless search. Bronner uses its duration + capacity reasoning; the government distinguishes the fenced curtilage from Bronner’s street-visible porch and driveway.',
    tags: ['q1', 'which-case'],
  },
  {
    id: 'c-which-ciraolo-vantage',
    kind: 'case_ref',
    side: 'either',
    label: 'Which case · public vantage',
    cite: 'California v. Ciraolo, 476 U.S. 207 (1986)',
    front:
      'Which case says naked-eye observation from a lawful public vantage point is not a search — even of curtilage?',
    back: 'California v. Ciraolo. Officers flew at 1,000 feet over a fenced backyard and spotted marijuana with the naked eye. Subjective expectation (fences) lost on the societal-reasonableness prong: any member of the public in that airspace could have seen the same thing. Foundation of every “visible from the street” argument.',
    tags: ['q1', 'which-case'],
  },
  {
    id: 'c-which-kyllo-tech',
    kind: 'case_ref',
    side: 'either',
    label: 'Which case · sense-enhancing tech',
    cite: 'Kyllo v. United States, 533 U.S. 27 (2001)',
    front:
      'Which case says using sense-enhancing technology not in general public use to learn details of the home’s interior is a search?',
    back: 'Kyllo v. United States. Thermal imaging from across the street revealed heat consistent with grow lamps. Scalia: technology that “shrinks the realm of guaranteed privacy” must not erase the privacy that existed when the Amendment was adopted. Both Bronner opinions fight over “general public use” and whether aggregate camera features reveal intimate household details.',
    tags: ['q1', 'which-case'],
  },
  {
    id: 'c-which-jones-trespass',
    kind: 'case_ref',
    side: 'either',
    label: 'Which case · GPS trespass',
    cite: 'United States v. Jones, 565 U.S. 400 (2012)',
    front:
      'Which case held that installing a GPS tracker on a vehicle was a search because of a physical trespass on an “effect”?',
    back: 'United States v. Jones. Unanimous result, multiple theories. Majority: physical intrusion on a constitutionally protected effect to obtain information is a search; Katz supplemented, did not displace, the trespass rule. The Jones concurrences are the seed of duration / mosaic arguments that later feed Carpenter.',
    tags: ['q1', 'which-case'],
  },
  {
    id: 'c-which-milligan-courts',
    kind: 'case_ref',
    side: 'either',
    label: 'Which case · courts open',
    cite: 'Ex parte Milligan, 71 U.S. (4 Wall.) 2 (1866)',
    front:
      'Which case says military tribunals cannot try a civilian who is not part of enemy forces when the ordinary courts are open and functioning?',
    back: 'Ex parte Milligan. Indiana civilian sentenced to hang by military commission; federal courts were open throughout. Commission had no jurisdiction. Bronner’s structural best case: he was arraigned in Article III court, released on bond, then pulled into military custody. Majority distinguishes: Milligan was not supporting enemy forces.',
    tags: ['q2', 'which-case'],
  },
  {
    id: 'c-which-quirin-belligerent',
    kind: 'case_ref',
    side: 'either',
    label: 'Which case · unlawful belligerent',
    cite: 'Ex parte Quirin, 317 U.S. 1 (1942)',
    front:
      'Which case says an unlawful belligerent may be tried by military commission even if captured in the United States — and even if a U.S. citizen?',
    back: 'Ex parte Quirin. German saboteurs landed from U-boats, buried uniforms, and planned attacks in civilian clothes. Military commission upheld. Citizenship and U.S. soil did not defeat military trial. Government’s strongest Article II case; Bronner stresses Quirin rested on proven saboteur conduct in a declared war, not an untested executive label.',
    tags: ['q2', 'which-case'],
  },
  {
    id: 'c-which-youngstown-cats',
    kind: 'case_ref',
    side: 'either',
    label: 'Which case · three categories',
    cite: 'Youngstown Sheet & Tube Co. v. Sawyer, 343 U.S. 579 (1952)',
    front:
      'Which case supplies Jackson’s three categories measuring presidential power by Congress’s position (authorization, silence, or opposition)?',
    back: 'Youngstown Sheet & Tube Co. v. Sawyer. Truman seized the steel mills during the Korean War after Congress had declined seizure authority. Held unconstitutional. Jackson’s concurrence: Cat 1 (Congress authorized — max), Cat 2 (twilight — silence), Cat 3 (Congress opposed — lowest ebb). The battlefield for Bronner’s detention fight.',
    tags: ['q2', 'which-case'],
  },
  {
    id: 'c-which-hamdi-process',
    kind: 'case_ref',
    side: 'either',
    label: 'Which case · notice and rebuttal',
    cite: 'Hamdi v. Rumsfeld, 542 U.S. 507 (2004)',
    front:
      'Which case says the AUMF can authorize detention of an enemy combatant, but a citizen detainee still gets notice of the factual basis and a fair chance to rebut it before a neutral decisionmaker?',
    back: 'Hamdi v. Rumsfeld. Battlefield capture in Afghanistan; Mobbs Declaration as the government’s evidence. AUMF covers detention as a fundamental incident of war, but war powers are “not a blank check.” Process rule (via Mathews) is what Bronner presses even though he was not yet a citizen and was seized far from a combat zone.',
    tags: ['q2', 'which-case'],
  },
  {
    id: 'c-which-banyee-duration',
    kind: 'case_ref',
    side: 'either',
    label: 'Which case · duration ≠ new hearing',
    cite: 'Banyee v. Garland, 115 F.4th 928 (8th Cir. 2024)',
    front:
      'Which case (as the Bronner opinions characterize it) says prolonged immigration detention does not automatically require a new bond hearing just because time has passed?',
    back: 'Banyee v. Garland (8th Cir.). Persuasive only — not binding on the Supreme Court. Context: ordinary immigration detention under established removal procedures. Government: elapsed time alone is not enough. Bronner: distinguish — military custody at Guantanamo on an untested belligerency label with sealed evidence is a different liberty interest and error risk than Banyee’s setting.',
    tags: ['q2', 'which-case'],
  },
  {
    id: 'c-which-costanzo-acquiescence',
    kind: 'case_ref',
    side: 'either',
    label: 'Which case · legislative acquiescence',
    cite: 'Costanzo v. Tillinghast, 287 U.S. 341 (1932)',
    front:
      'Which case does the Fourteenth Circuit majority use for the idea that long legislative inaction can support a presumption of congressional acquiescence in executive practice?',
    back: 'Costanzo v. Tillinghast. Actually an immigration-deportation statutory-construction case (five-year limit did not carry to every clause of § 19). The majority borrows an acquiescence principle and concedes Costanzo “involved immigration administration” but says it “equally applies.” Bronner: that is a narrow agency-construction canon stretched into a war-powers argument.',
    tags: ['q2', 'which-case'],
  },
  {
    id: 'c-which-keith-warrant',
    kind: 'case_ref',
    side: 'either',
    label: 'Which case · domestic security warrant',
    cite: 'United States v. U.S. District Court (Keith), 407 U.S. 297 (1972)',
    front:
      'Which case says a statutory disclaimer is not a grant of presidential surveillance power, and domestic-security wiretaps of that type need prior judicial approval?',
    back: 'United States v. U.S. District Court (Keith). Title III § 2511(3) was a disclaimer, not authority. “The Fourth Amendment does not contemplate the executive officers of Government as neutral and disinterested magistrates.” Bridges Q1 and Q2: the deference the government wants on Article II is the deference Keith refused on the Fourth.',
    tags: ['q1', 'q2', 'which-case'],
  },
  {
    id: 'c-which-mathews-balance',
    kind: 'case_ref',
    side: 'either',
    label: 'Which case · due process balance',
    cite: 'Mathews v. Eldridge, 424 U.S. 319 (1976)',
    front:
      'Which case sets the three-factor due process balance (private interest, risk of error / value of safeguards, government burden)?',
    back: 'Mathews v. Eldridge. Disability-benefits termination without a pre-termination evidentiary hearing. Hamdi adapts the same balance to military detention. In Bronner, factor one (physical liberty) is weighty; the fight is whether national-security secrecy justifies withholding the sealed dirty-bomb evidence from him.',
    tags: ['q2', 'which-case'],
  },
  {
    id: 'c-which-prize-war',
    kind: 'case_ref',
    side: 'either',
    label: 'Which case · war thrust upon',
    cite: 'The Prize Cases, 67 U.S. (2 Black) 635 (1863)',
    front:
      'Which case says the President may meet an armed rebellion without waiting for Congress to “baptize it with a name”?',
    back: 'The Prize Cases. Lincoln’s blockade before Congress declared war; prize seizures upheld. President cannot initiate war but must resist force by force when war is thrust upon the nation. Majority extends the “incident of war” idea to terrorism; dissent: open hostilities between organized forces, not indefinite detention of a resident far from any battlefield.',
    tags: ['q2', 'which-case'],
  },
  {
    id: 'c-which-curtiss-sole-organ',
    kind: 'case_ref',
    side: 'either',
    label: 'Which case · sole organ',
    cite: 'United States v. Curtiss-Wright, 299 U.S. 304 (1936)',
    front:
      'Which case is famous for calling the President the “sole organ” of the nation in foreign relations — and what does Jackson later say that phrase does not mean?',
    back: 'United States v. Curtiss-Wright. Arms-embargo delegation in the Chaco War upheld. Majority below cites “plenary and exclusive” / “sole organ.” Jackson’s Youngstown footnote: Curtiss-Wright was presidential action under an Act of Congress, not action without or against Congress. It is not a blank check for unilateral detention power.',
    tags: ['q2', 'which-case'],
  },
  {
    id: 'c-which-moore-bush-split',
    kind: 'case_ref',
    side: 'either',
    label: 'Which case · pole-camera split',
    cite: 'United States v. Moore-Bush, 36 F.4th 320 (1st Cir. 2022)',
    front:
      'Which en banc decision split evenly on whether months of pole-camera surveillance is a search, while agreeing suppression was unavailable under good faith?',
    back: 'United States v. Moore-Bush (1st Cir. en banc). Eight months of footage of driveway / side of house. Lynch: prolonged observation of exposed areas ≠ search. Barron: aggregated searchable record is a search under Carpenter’s logic. Bronner majority tracks Lynch; dissent tracks Barron. Best evidence the constitutional question is unsettled.',
    tags: ['q1', 'which-case'],
  },
]

const HOLDING_DRILL_CARDS = [
  {
    id: 'c-hold-youngstown-cats-drill',
    kind: 'case_ref',
    side: 'either',
    label: 'Holding · Youngstown categories',
    cite: 'Youngstown, 343 U.S. 579 (1952)',
    front: 'State Jackson’s three Youngstown categories in one breath each.',
    back: 'Cat 1: Congress authorized — presidential power at its maximum (own power + all Congress can delegate). Cat 2: zone of twilight — Congress silent; depends on events and contemporaneous practice. Cat 3: Congress opposed (express or implied) — power at its lowest ebb; survives only if the subject is beyond Congress’s reach.',
    tags: ['q2', 'holding'],
  },
  {
    id: 'c-hold-katz-rule-drill',
    kind: 'case_ref',
    side: 'either',
    label: 'Holding · Katz rule',
    cite: 'Katz, 389 U.S. 347 (1967)',
    front: 'What is the Katz / Harlan rule in one sentence?',
    back: 'A search occurs when the government invades a subjective expectation of privacy that society is prepared to recognize as reasonable. (Harlan concurrence; majority’s pair: what you knowingly expose is unprotected; what you seek to preserve as private may be protected even in a public area.)',
    tags: ['q1', 'holding'],
  },
  {
    id: 'c-quote-katz-expose',
    kind: 'quote',
    side: 'either',
    label: 'Quote · Katz expose / preserve',
    cite: 'Katz, 389 U.S. at 351',
    front: 'Complete the Katz line: “What a person knowingly exposes to the public…',
    back: '“…even in his own home or office, is not a subject of Fourth Amendment protection. But what he seeks to preserve as private, even in an area accessible to the public, may be constitutionally protected.”',
    tags: ['q1', 'quote'],
  },
]

const JUDGE_QA_CARDS = [
  {
    id: 'c-judge-carpenter-cameras',
    kind: 'judge_qa',
    side: 'respondent',
    label: 'Judge · Carpenter with cameras?',
    cite: '',
    front:
      'Judge (to respondent): “Isn’t this just Carpenter with cameras — 93 days of location data?” What’s your answer?',
    back: 'Distinguish Carpenter: that was a warrantless demand for a phone company’s stored CSLI wherever the phone went — not observation of what was already exposed to public view from poles the government had a right to use. Answer with Ciraolo (public vantage), Tuggle (duration alone doesn’t flip it), and the majority’s stakeout analogy. Concede duration is real; argue exposure + vantage still control under Katz’s second prong.',
    tags: ['q1', 'oa', 'respondent'],
  },
  {
    id: 'c-judge-milligan-open',
    kind: 'judge_qa',
    side: 'petitioner',
    label: 'Judge · Milligan ends this?',
    cite: '',
    front:
      'Judge (to petitioner): “Courts were open — why doesn’t Milligan end this?” What’s your answer?',
    back: 'Lead with Milligan’s rule: martial process cannot replace civilian courts for a civilian where courts are open and working. Tie to Bronner’s Article III arraignment, not-guilty plea, and bond release before military transfer. Distinguish Quirin (proven saboteurs in wartime) and press Hamdi’s process rule even for battlefield detainees. Place the statutes in Youngstown Cat 3 (or contested Cat 2) given NDAA / ATA carve-outs for LPRs on U.S. soil.',
    tags: ['q2', 'oa', 'petitioner'],
  },
  {
    id: 'c-judge-banyee-time',
    kind: 'judge_qa',
    side: 'petitioner',
    label: 'Judge · Banyee on time',
    cite: '',
    front:
      'Judge (to petitioner): “Banyee says time alone doesn’t get you a new hearing — why are twelve months at Guantanamo different?”',
    back: 'Banyee is immigration detention under established removal procedures; Bronner is military custody on an untested belligerency label with sealed dirty-bomb evidence he has never seen. Distinguish the liberty interest and the Mathews error risk. Hamdi — not Banyee — is the process template: notice of the factual basis and a chance to rebut before a neutral decisionmaker.',
    tags: ['q2', 'oa', 'petitioner'],
  },
  {
    id: 'c-judge-costanzo-stretch',
    kind: 'judge_qa',
    side: 'petitioner',
    label: 'Judge · Costanzo stretch',
    cite: '',
    front:
      'Judge (to petitioner): “The majority cites Costanzo for congressional acquiescence — what’s wrong with that?”',
    back: 'Costanzo was statutory construction of an immigration-deportation clause, not a war-powers blank check. Even the majority concedes it “involved immigration administration.” Legislative inaction is not an affirmative grant — Youngstown itself says scrutinize with caution where Congress has legislated and declined the power claimed. Point to NDAA § 1022(b) carve-outs and ATA limits as deliberate withholding, not silence.',
    tags: ['q2', 'oa', 'petitioner'],
  },
  {
    id: 'c-judge-tafoya-fence',
    kind: 'judge_qa',
    side: 'respondent',
    label: 'Judge · Tafoya fence',
    cite: '',
    front:
      'Judge (to respondent): “Tafoya suppressed three months of pole-camera footage — why shouldn’t we follow it?”',
    back: 'Tafoya’s camera looked into a backyard behind a six-foot privacy fence with a closed gate — curtilage the public could not see. Bronner’s cameras faced porch, steps, driveway, and door visible from nearby streets. Use Tafoya’s duration/capacity reasoning only if you are petitioner; as respondent, concede the aggregation concern and plant the fight on public vantage + Ciraolo / Tuggle / Lynch’s Moore-Bush opinion.',
    tags: ['q1', 'oa', 'respondent'],
  },
  {
    id: 'c-judge-hamdi-citizen',
    kind: 'judge_qa',
    side: 'respondent',
    label: 'Judge · Hamdi citizen / combat zone',
    cite: '',
    front:
      'Judge (to respondent): “Hamdi was a citizen seized in a combat zone — Bronner is neither. How do you still win?”',
    back: 'Authority half: AUMF / NDAA still authorize detention of persons who support enemy forces; Quirin shows citizenship and U.S. soil do not defeat military process for unlawful belligerents. Process half: Hamdi’s notice-and-rebuttal can be satisfied with adapted procedures; twelve months tied to hostilities is not a ruse under the majority’s reading. Be ready for the dissent’s Cat 3 frame if the carve-outs control.',
    tags: ['q2', 'oa', 'respondent'],
  },
]

/** Page-by-page Instant Case drills from the record map (PDF = R.). */
const RECORD_PAGE_CARDS = [
  {
    id: 'c-inst-page-1',
    kind: 'instant',
    side: 'either',
    label: 'Instant · R. 1',
    cite: 'R. 1',
    front: 'What is on R. 1 of the instant case?',
    back: 'Cover: Order of the Court; the two questions presented; AMCA attribution note.',
    tags: ['instant', 'page'],
  },
  {
    id: 'c-inst-page-2',
    kind: 'instant',
    side: 'either',
    label: 'Instant · R. 2',
    cite: 'R. 2',
    front: 'What is on R. 2 — posture and panel?',
    back: 'Caption and panel (Barnhart writes; Sotelo concurs; Cassady/Cassidy dissents); the two claims; district court suppressed and granted habeas; jurisdiction; facts stipulated; de novo; judgment reversed. Fourteenth Circuit reverses 2–1.',
    tags: ['instant', 'page'],
  },
  {
    id: 'c-inst-page-3',
    kind: 'instant',
    side: 'either',
    label: 'Instant · R. 3 · NDAA in opinion',
    cite: 'R. 3',
    front: 'What does R. 3 say about the AUMF and NDAA § 1022 — and what trap is on this page?',
    back: '§ II.A: AUMF § 2(a) text; NDAA enacted; § 1022 “shall hold” and waiver; § 1022(b)(1)–(2) carve-outs; failed Senate amendment; § 1021(d). Trap: attributes the “existing law” clause to § 1022(e) — that clause actually lives at § 1021(e) / App. III (R. 21).',
    tags: ['instant', 'page', 'q2'],
  },
  {
    id: 'c-inst-page-4',
    kind: 'instant',
    side: 'either',
    label: 'Instant · R. 4 · ATA / EO',
    cite: 'R. 4',
    front: 'What is on R. 4 regarding the ATA and EO 15,000?',
    back: 'Obama signing statement / prior presidents; ATA § 4(a)–(b) including the gap for lawful residents; no time limit, no dangerousness finding, no counsel, no judicial review in the ATA scheme as described; rejected 2025/2026 provisions; EO 15,000 issued and its directive.',
    tags: ['instant', 'page', 'q2'],
  },
  {
    id: 'c-inst-page-5',
    kind: 'instant',
    side: 'either',
    label: 'Instant · R. 5 · bio + cameras',
    cite: 'R. 5',
    front: 'What does R. 5 cover about Bronner’s biography and the start of the camera surveillance?',
    back: 'Signing-ceremony quote; Guantanamo named; Bronner bio (entry at 15, green card 2010, business, naturalization approved Feb. 17, 2025, good moral character, oath July 4); “Jersey” tip; four Ring cameras bought and installed Mar. 18 on public poles; Bello never entered the property. nn.1–2.',
    tags: ['instant', 'page'],
  },
  {
    id: 'c-inst-page-6',
    kind: 'instant',
    side: 'either',
    label: 'Instant · R. 6 · camera specs',
    cite: 'R. 6',
    front: 'What camera capabilities and retention facts are on R. 6?',
    back: 'Auto-record of entries/exits; remote pan; 10x optical zoom; infrared; time-stamped storage; no warrant; 93 consecutive days, 24 hours, motion-activated; what was street-visible (porch, steps, driveway, door). n.3 commercial availability; n.4 default 30/60-day storage customized to 180 days; audio capable but no intelligible statements; Search Party unused.',
    tags: ['instant', 'page', 'q1'],
  },
  {
    id: 'c-inst-page-7',
    kind: 'instant',
    side: 'either',
    label: 'Instant · R. 7 · mosaic',
    cite: 'R. 7',
    front: 'What mosaic / pattern-of-life facts sit on R. 7?',
    back: 'Zoom limits; blinds open → lights/movement; pizza, Sparklets Tuesdays, Blue Apron Thursdays, Chewy, Omaha Steaks, Costco, Geek Squad, HVAC, masseuse twice weekly, Girl Scout cookies; no known drug figures; May 4 Roper & Langbourne ID’d by optical zoom (~15 min inside); May 27 NSA / warrant path; stipulation of primary reliance on pole-camera footage. Dissent cites “R. at 7” for these facts.',
    tags: ['instant', 'page', 'q1'],
  },
  {
    id: 'c-inst-page-8',
    kind: 'instant',
    side: 'either',
    label: 'Instant · R. 8 · haul / GTMO',
    cite: 'R. 8',
    front: 'On what page does the record enumerate the search haul (fentanyl / dirty-bomb docs), arraignment, “accused” classification, and Guantanamo transfer — and what does it say?',
    back: 'R. 8. Fentanyl patches, lollipops, spray, sales log, lozenges in the car; warehouse sealed dirty-bomb documents Bronner has never reviewed; May 29–31 booking/arraignment/bond/immediate material-support re-arrest (n.7: 20-year felony); AG Comerford “criminal record because accused,” no prior convictions; July 7 military transfer to Guantanamo; 12 months without seeing the evidence.',
    tags: ['instant', 'page', 'q2'],
  },
  {
    id: 'c-inst-page-9',
    kind: 'instant',
    side: 'either',
    label: 'Instant · R. 9 · preserved issues',
    cite: 'R. 9 nn.8–9',
    front: 'What do footnotes 8–9 on R. 9 remove from the case?',
    back: 'n.8: no independent probable-cause claim; Bronner did not challenge the later warrants — neither preserved. n.9: no treaties/protocols; no speedy trial, bail, or innocence-evidence claims. Only the two legal questions are before the Court. Also: clinic learns of detention; petition filed; Judge Fair rules for Bronner.',
    tags: ['instant', 'page'],
  },
  {
    id: 'c-inst-page-10',
    kind: 'instant',
    side: 'either',
    label: 'Instant · R. 10 · majority Q1 start',
    cite: 'R. 10',
    front: 'What Fourth Amendment moves does the majority make on R. 10?',
    back: 'Katz two-part inquiry; Ciraolo; cameras on public property; only driveway/front steps/porch; “duration alone does not transform” citing Tuggle at 526; first impression; circuits vs. Tafoya (n.10); Kyllo and general public use.',
    tags: ['instant', 'page', 'q1'],
  },
  {
    id: 'c-inst-page-11',
    kind: 'instant',
    side: 'either',
    label: 'Instant · R. 11 · exterior / Carpenter',
    cite: 'R. 11',
    front: 'What does the majority say on R. 11 about exterior observation and Carpenter?',
    back: 'Cameras did not follow after entry/departure; no wall penetration; “enhanced observation of already-exposed activity”; cites Moore-Bush (Lynch); distinguishes Carpenter (93 days from fixed points vs. ~13,000 CSLI points; specialized cell phones; etc.).',
    tags: ['instant', 'page', 'q1'],
  },
  {
    id: 'c-inst-page-12',
    kind: 'instant',
    side: 'either',
    label: 'Instant · R. 12 · stakeout',
    cite: 'R. 12',
    front: 'On what page does the majority call the cameras “similar to a stakeout” and hold this was not a search?',
    back: 'R. 12. Highest-order government interests (drugs / domestic terror); four stationary cameras; “similar to a stakeout”; no physical intrusion, no audio, no interior surveillance; conclusion — not a search; district court erred.',
    tags: ['instant', 'page', 'q1'],
  },
  {
    id: 'c-inst-page-13',
    kind: 'instant',
    side: 'either',
    label: 'Instant · R. 13 · Article II opens',
    cite: 'R. 13',
    front: 'What authorities does the majority open with on R. 13 for Article II?',
    back: '§ IV Article II analysis; 10 U.S.C. § 948(a)(7); material-support framing; Prize Cases (“baptize it with a name”); Quirin (citizenship does not relieve an unlawful belligerent); Curtiss-Wright (“sole organ”).',
    tags: ['instant', 'page', 'q2'],
  },
  {
    id: 'c-inst-page-14',
    kind: 'instant',
    side: 'either',
    label: 'Instant · R. 14 · Cat 1 / Costanzo',
    cite: 'R. 14',
    front: 'On what page does the majority place the President in Youngstown Category 1 and cite Costanzo?',
    back: 'R. 14. Cat 1 via AUMF and NDAA § 1021; Youngstown categories quoted; Hamdi reading detention into the AUMF; congressional refusal to bar indefinite detention; Costanzo acquiescence (with immigration concession); Milligan distinguished.',
    tags: ['instant', 'page', 'q2'],
  },
  {
    id: 'c-inst-page-15',
    kind: 'instant',
    side: 'either',
    label: 'Instant · R. 15 · Mathews / Banyee',
    cite: 'R. 15',
    front: 'What process cases appear on R. 15 in the majority’s Article II wrap-up?',
    back: 'ATA “further illuminates” Cat 1; Mathews three factors; Hamdi notice-and-rebuttal; habeas available; 12 months “substantial” but tied to hostilities; no six-month ceiling; Banyee, 115 F.4th at 934; reversed.',
    tags: ['instant', 'page', 'q2'],
  },
  {
    id: 'c-inst-page-16',
    kind: 'instant',
    side: 'either',
    label: 'Instant · R. 16 · dissent opens',
    cite: 'R. 16',
    front: 'How does the dissent open on R. 16?',
    back: 'Judge Cassidy dissent; Kyllo’s “firm line at the entrance”; three criticisms of the majority; Carpenter “comprehensive chronicle”; dissent’s own “R. at 7” mosaic cite; Tuggle discussion of mosaic scholarship; 93 straight days reconstructing routines at the home.',
    tags: ['instant', 'page', 'q1'],
  },
  {
    id: 'c-inst-page-17',
    kind: 'instant',
    side: 'either',
    label: 'Instant · R. 17 · rhythms',
    cite: 'R. 17',
    front: 'What “rhythms of the household” / aggregation points does the dissent make on R. 17?',
    back: 'Kyllo applied too narrowly; commonplace tech can still reveal domestic life; four features in combination; “rhythms of the household”; Moore-Bush (Barron); Tafoya on duration/continuity/nature; “all details are intimate details”; passerby vs. continuous recording.',
    tags: ['instant', 'page', 'q1'],
  },
  {
    id: 'c-inst-page-18',
    kind: 'instant',
    side: 'either',
    label: 'Instant · R. 18 · Cat 3',
    cite: 'R. 18',
    front: 'On what page does the dissent put Bronner in Youngstown Category 3 (or at best twilight) using § 1022?',
    back: 'R. 18. Keith warrant-as-neutral-review; Hamdi “not a blank check” extended to LPRs; “at best” twilight, “more plausibly” third category; § 1022(b)(1)–(2) and § 1021(e); Congress deliberately declined; legislative inaction ≠ grant; § 1022 + ATA § 4(b)(2) → lowest ebb.',
    tags: ['instant', 'page', 'q2'],
  },
  {
    id: 'c-inst-page-19',
    kind: 'instant',
    side: 'either',
    label: 'Instant · R. 19–20 · dissent close',
    cite: 'R. 19–20',
    front: 'How does the dissent finish the Article II analysis on R. 19–20?',
    back: 'Quirin as declared-war saboteurs; Milligan / Hamdi combat-zone distinctions; Bronner living openly, civilian arrest, arraignment, courts functioning; Prize Cases as active civil war vs. never-ending “War on Terror”; Mathews factors (liberty at GTMO, error risk from bond release); Banyee on periodic review; would affirm the writ.',
    tags: ['instant', 'page', 'q2'],
  },
  {
    id: 'c-inst-ndaa-1022-page',
    kind: 'instant',
    side: 'either',
    label: 'Instant · NDAA § 1022 text',
    cite: 'App. IV (R. 22); discussed R. 2–3, 17–18',
    front:
      'On what page does the instant case set out NDAA § 1022 (military custody, waiver, citizen / LPR carve-outs)?',
    back: 'Appendix IV at R. 22 (PDF; printed p. 21): § 1022(a)(1)–(2), (a)(4) waiver, (b)(1)–(2) citizen and lawful-resident carve-outs. Discussed at R. 2–3 and in the dissent at R. 17–18. Note: there is no § 1022(e) in the appendix.',
    tags: ['instant', 'page', 'q2'],
  },
  {
    id: 'c-inst-ndaa-1021-page',
    kind: 'instant',
    side: 'either',
    label: 'Instant · NDAA § 1021 text',
    cite: 'App. III (R. 21)',
    front:
      'On what page is NDAA § 1021 — including the “existing law” clause — actually printed in the appendices?',
    back: 'Appendix III at R. 21: § 1021(a), (b)(1)–(2), (c)(1), (d), (e). Authoritative location of the “existing law” clause. Opinion body at R. 3 wrongly says § 1022(e); dissent at R. 18 correctly points to § 1021(e).',
    tags: ['instant', 'page', 'q2'],
  },
  {
    id: 'c-inst-aumf-page',
    kind: 'instant',
    side: 'either',
    label: 'Instant · AUMF appendix',
    cite: 'App. I (R. 20)',
    front: 'On what page is the AUMF text in the instant case appendices?',
    back: 'Appendix I at R. 20: AUMF preamble and § 2(a). Discussed at R. 2 and R. 13. Appendix II on the same leaf has 10 U.S.C. § 948(a)(7).',
    tags: ['instant', 'page', 'q2'],
  },
  {
    id: 'c-inst-ata-page',
    kind: 'instant',
    side: 'either',
    label: 'Instant · ATA appendix',
    cite: 'App. V (R. 23–24)',
    front: 'On what pages is the ATA printed?',
    back: 'Appendix V: R. 23 (§§ 1–3 purpose/definitions/findings); R. 24 (§ 4 detention scheme, including § 4(b)(2) citizens-inside-only). Opinion discussion of the LPR gap: R. 4.',
    tags: ['instant', 'page', 'q2'],
  },
  {
    id: 'c-inst-eo-page',
    kind: 'instant',
    side: 'either',
    label: 'Instant · EO 15,000 appendix',
    cite: 'App. VI (R. 25)',
    front: 'On what page is Executive Order 15,000 printed?',
    back: 'Appendix VI at R. 25: recitals and asserted authorities; § 1 AG directive; § 2 Guantanamo and other sites; § 3 “consistent with applicable law.” Issuance also narrated at R. 4.',
    tags: ['instant', 'page', 'q2'],
  },
  {
    id: 'c-inst-page-numbering',
    kind: 'instant',
    side: 'either',
    label: 'Instant · R. vs printed',
    cite: 'Guide convention · PDF = R.',
    front:
      'What does “R.” mean in this problem — PDF page or printed page — and why does it matter for the mosaic cite?',
    back: 'This guide (and the dissent’s mosaic cite) uses PDF page numbers as R. Cover is unnumbered, so printed numbers run one lower than PDF (printed 6 = PDF/R. 7). The dissent’s “R. at 7” mosaic facts sit on PDF page 7. Confirm with coach/AMCA rules before filing; hedge as “R. 7 (printed p. 6)” if needed.',
    tags: ['instant', 'page'],
  },
  {
    id: 'c-inst-wrinkle-1022e',
    kind: 'instant',
    side: 'either',
    label: 'Instant · § 1022(e) trap',
    cite: 'R. 3 vs R. 18 vs App. III (R. 21)',
    front: 'Where does the record misplace the “existing law” clause — and where should you cite it?',
    back: 'R. 3 attributes it to § 1022(e). Dissent at R. 18 attributes it to § 1021(e). Appendix III places it at § 1021(e) (R. 21); Appendix IV (§ 1022) has no subsection (e). Cite Appendix III / § 1021(e).',
    tags: ['instant', 'page', 'q2'],
  },
  {
    id: 'c-inst-wrinkle-93',
    kind: 'instant',
    side: 'either',
    label: 'Instant · 93-day wrinkle',
    cite: 'R. 5, 7',
    front: 'What is the 93-day record wrinkle, and how should you treat it?',
    back: 'Installation Mar. 18 to warrant May 27 is 70 days (R. 5, 7), but the record states 93 three separate times and both opinions accept it. Treat 93 as stipulated.',
    tags: ['instant', 'page'],
  },
  {
    id: 'c-inst-wrinkle-names',
    kind: 'instant',
    side: 'either',
    label: 'Instant · name inconsistencies',
    cite: 'R. 2, 9, 16',
    front: 'What naming inconsistencies in the record should you know before a judge finds them?',
    back: '(1) Dissenting judge: “Katie Cassady” on R. 2 vs “Judge Cassidy” on R. 16 — pick one, note both if asked. (2) District court: “District of Olympus” (R. 2, 8) vs “Central District of Olympus” (R. 9).',
    tags: ['instant', 'page'],
  },
]

function buildSeedCards() {
  const byId = new Map()
  const add = (card) => {
    if (!card?.id) return
    byId.set(card.id, card)
  }

  // Library coverage first (facts / holding / reasoning / Bronner use).
  for (const card of cardsFromLibraryCases()) add(card)
  // Case Summaries sheet overlays (richer Article II briefs + quotes).
  for (const card of cardsFromCaseSummariesSheet()) add(card)
  // Specialty “which case says X” overlays.
  for (const card of WHICH_CASE_CARDS) add(card)
  for (const card of HOLDING_DRILL_CARDS) add(card)
  for (const card of JUDGE_QA_CARDS) add(card)
  // Instant Case: every structured fact + page map + statute pages.
  for (const card of cardsFromGuideFacts()) add(card)
  for (const card of RECORD_PAGE_CARDS) add(card)

  return [...byId.values()]
}

export const SEED_CARDS = buildSeedCards()

const SEED_BY_ID = new Map(SEED_CARDS.map((c) => [c.id, c]))
const LEGACY_SEED_SET = new Set(LEGACY_SEED_CARD_IDS)

/**
 * Refresh bundled seed cards by id; keep real user-authored cards.
 * Drops (1) replaced legacy seed ids and (2) old "Where is this quote?" cite drills
 * that were stacking on top of the learning deck in synced workspaces.
 */
export function mergeSeedCards(cards) {
  if (!Array.isArray(cards) || !cards.length) {
    return structuredClone(SEED_CARDS)
  }

  const kept = []
  const haveSeed = new Set()

  for (const card of cards) {
    if (!card || typeof card !== 'object') continue
    const id = card.id
    if (LEGACY_SEED_SET.has(id) && !SEED_BY_ID.has(id)) continue
    if (isLegacyCiteDrillCard(card) && !SEED_BY_ID.has(id)) continue
    if (SEED_BY_ID.has(id)) {
      haveSeed.add(id)
      kept.push(structuredClone(SEED_BY_ID.get(id)))
      continue
    }
    kept.push(card)
  }

  for (const seed of SEED_CARDS) {
    if (!haveSeed.has(seed.id)) kept.push(structuredClone(seed))
  }

  return kept
}

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
