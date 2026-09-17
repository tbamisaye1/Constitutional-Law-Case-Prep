/**
 * Bronner guide body copy switch.
 *
 * Vite bakes this in at build time:
 *   VITE_BRONNER_GUIDE_CLARITY=true  → clarity rewrite
 *   unset / false / 0               → classic (pre-clarity) copy
 *
 * Flip on Vercel → Redeploy. No code revert needed.
 */
import classicSections from './guideSections.classic.json'
import claritySections from './guideSections.clarity.json'

function envFlag(value) {
  if (value == null) return false
  const v = String(value).trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes' || v === 'on'
}

export const GUIDE_CLARITY_ENABLED = envFlag(import.meta.env.VITE_BRONNER_GUIDE_CLARITY)

export const guideSections = GUIDE_CLARITY_ENABLED ? claritySections : classicSections

export const GUIDE_PAGE_LEDE = GUIDE_CLARITY_ENABLED
  ? 'Read the facts, governing law, and both sides of each question in one place. The guide explains technical terms before using them and connects each rule to Bronner. Edit any section here; use Case facts and Case library when you need individual facts, cases, or quotations.'
  : 'Full explanations from your HTML case guide: orientation, doctrine stories, statutes, both questions applied to Bronner. Edit any section; structured Case facts / Library stay for prep atoms.'

export const GUIDE_HOME_BASELINE = GUIDE_CLARITY_ENABLED
  ? {
      beforeLink: 'Read the facts, governing law, and both sides in the ',
      afterLink:
        '. Use Case facts and Case library when you need an individual fact, case, or quotation. API: ',
    }
  : {
      beforeLink: 'Read the full Bronner explanations in ',
      afterLink:
        ' (TOC + every section from your HTML). Case facts / library hold the structured prep atoms. API: ',
    }
