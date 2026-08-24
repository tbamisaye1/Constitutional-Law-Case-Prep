/**
 * Sample prompts for the floating Ask AI bubble.
 * Framed around uploaded / indexed articles only.
 */

export const SAMPLE_PROMPT_GROUPS = [
  {
    label: 'Answerable from uploaded articles',
    hint: 'Plain English — cites retrieved article text',
    questions: [
      'According to the uploaded articles, can a president take over private companies without Congress approving it?',
      'In the indexed articles, is it legal for police to put a GPS tracker on someone\'s car without a warrant?',
      'What do the uploaded articles say about a man tried by a military court during the Civil War?',
      'Do any uploaded articles discuss police using an airplane to look into a fenced backyard?',
    ],
  },
  {
    label: 'Article analysis (like a news database)',
    hint: 'Mention counts, tone, co-mention — stored per article in production',
    questions: [
      'In the uploaded articles, how many times is Person X mentioned between January and June 2019?',
      'Based only on the indexed articles, is the tone toward the president positive or negative?',
      'Do any uploaded articles mention both Senator Smith and the trade bill in the same piece?',
    ],
  },
  {
    label: 'Should refuse — not in uploaded articles',
    hint: 'Tests that the agent will not guess outside the corpus',
    questions: [
      'What are Jackson\'s three categories of presidential power?',
      'What is the weather in New Haven today?',
    ],
  },
]

/** Moot-prep shortcuts when the user has highlighted text from an uploaded file. */
export const SELECTION_QUICK = [
  {
    id: 'explain',
    label: 'Explain',
    prompt: 'Using only the uploaded articles and this passage, explain it in plain language.',
  },
  {
    id: 'quote',
    label: 'Quote article',
    prompt: 'Quote the exact language from the uploaded articles that supports this passage.',
  },
  {
    id: 'cite',
    label: 'Which article?',
    prompt: 'Which uploaded article(s) does this passage come from? Cite source and page if available.',
  },
]

export function groundingStatusFromReply(apiStatus, replyText) {
  const match = (replyText || '').match(/^STATUS:\s*(\w+)/im)
  if (match) return match[1].toLowerCase()
  return apiStatus || 'unverified'
}

/** Hide STATUS line in the bubble; badge already shows grounding. */
export function formatReplyForDisplay(replyText) {
  if (!replyText) return ''
  let text = replyText.replace(/^STATUS:\s*\w+\s*\n+/im, '').trim()
  text = text.replace(/\n*SOURCES:?\s*\n[\s\S]*$/i, '').trim()
  return text
}
