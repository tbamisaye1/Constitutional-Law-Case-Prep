import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Search } from 'lucide-react'
import { Tag } from '../components/CaseCard'
import { useCaseLibrary } from '../hooks/useCaseLibrary'
import { USEFULNESS } from '../data/caseResearchSeed'

const USEFUL_ORDER = Object.fromEntries(USEFULNESS.map((u, i) => [u.id, i]))
const USEFUL_LABEL = Object.fromEntries(USEFULNESS.map((u) => [u.id, u.label]))

const ISSUE_META = {
  1: {
    id: 1,
    label: 'Question 1 · Fourth Amendment',
    question:
      'Whether warrantless pole-camera surveillance of a home\'s exterior over 93 days is a "search."',
    tone: 'q1',
  },
  2: {
    id: 2,
    label: 'Question 2 · Article II',
    question:
      'Whether the President exceeded Article II authority ordering prolonged offshore detention of a lawful permanent resident.',
    tone: 'q2',
  },
}

/**
 * Short italic lead for a case name so TOA rows stay scannable.
 * Prefers the non-United-States party when the caption is U.S. v. X.
 */
function partyLead(party) {
  if (!party) return ''
  const cleaned = party.replace(/\([^)]*\)/g, '').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (!parts.length) return cleaned
  if (/^(ex|in)$/i.test(parts[0]) && parts[1]) {
    return parts.slice(0, Math.min(3, parts.length)).join(' ')
  }
  return parts[parts.length - 1]
}

function shortCaseName(name) {
  if (!name) return ''
  const match = name.match(/^(.*?)\s+v\.?\s+(.*)$/i)
  if (!match) return partyLead(name) || name
  const left = match[1].trim()
  const right = match[2].trim()
  if (/^(united states|u\.?s\.?)$/i.test(left.replace(/\s*\(.*\)$/, '').trim())) {
    return partyLead(right) || right
  }
  return partyLead(left) || left
}

function blurbFor(caseItem) {
  const raw = (caseItem.headlineNote || caseItem.holding || '').trim()
  if (!raw) return ''
  const first = raw.split(/(?<=[.!?])\s+/)[0] || raw
  return first.length > 160 ? `${first.slice(0, 157).trim()}…` : first
}

function sortCases(cases) {
  return [...cases].sort((a, b) => {
    const ua = USEFUL_ORDER[a.usefulness || 'background'] ?? 99
    const ub = USEFUL_ORDER[b.usefulness || 'background'] ?? 99
    if (ua !== ub) return ua - ub
    return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
  })
}

function bandCases(cases) {
  const bands = []
  for (const u of USEFULNESS) {
    const rows = cases.filter((c) => (c.usefulness || 'background') === u.id)
    if (rows.length) bands.push({ id: u.id, label: u.label, rows })
  }
  const known = new Set(USEFULNESS.map((u) => u.id))
  const other = cases.filter((c) => !known.has(c.usefulness || 'background'))
  if (other.length) bands.push({ id: 'other', label: 'Other', rows: other })
  return bands
}

/**
 * Table of authorities: every live library case for both issues.
 * Browse-only; deep links into Case library for editing and PDFs.
 */
export function AuthoritiesPage() {
  const lib = useCaseLibrary()
  const [query, setQuery] = useState('')
  const [issueFilter, setIssueFilter] = useState('all')
  const [usefulFilter, setUsefulFilter] = useState('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return lib.cases.filter((c) => {
      if (issueFilter !== 'all' && String(c.issue) !== issueFilter) return false
      if (usefulFilter !== 'all' && (c.usefulness || 'background') !== usefulFilter) return false
      if (!q) return true
      return [c.name, c.cite, c.headlineNote, c.holding, c.rule, c.tag]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [lib.cases, query, issueFilter, usefulFilter])

  const counts = useMemo(() => {
    const q1 = lib.cases.filter((c) => Number(c.issue) === 1).length
    const q2 = lib.cases.filter((c) => Number(c.issue) === 2).length
    return { total: lib.cases.length, q1, q2 }
  }, [lib.cases])

  const columns = useMemo(() => {
    const issues =
      issueFilter === 'all'
        ? [1, 2]
        : issueFilter === '1'
          ? [1]
          : issueFilter === '2'
            ? [2]
            : [1, 2]
    return issues.map((issue) => {
      const rows = sortCases(filtered.filter((c) => Number(c.issue) === issue))
      return {
        ...ISSUE_META[issue],
        count: rows.length,
        bands: bandCases(rows),
      }
    })
  }, [filtered, issueFilter])

  const matchCount = filtered.length

  return (
    <section className="workspace toa-room editorial-room">
      <header className="toa-hero">
        <div className="toa-hero-copy">
          <p className="toa-kicker mono">Bronner · AMCA 2026–27</p>
          <h1>Table of authorities</h1>
          <p className="lede toa-lede">
            Every case on the matter, by question. Open a row to read holdings, notes, and PDFs in
            the Case library.
          </p>
        </div>
        <div className="toa-stats" aria-label="Case counts">
          <div className="toa-stat">
            <strong>{counts.total}</strong>
            <span className="mono">cases</span>
          </div>
          <div className="toa-stat toa-stat-q1">
            <strong>{counts.q1}</strong>
            <span className="mono">Q1</span>
          </div>
          <div className="toa-stat toa-stat-q2">
            <strong>{counts.q2}</strong>
            <span className="mono">Q2</span>
          </div>
        </div>
      </header>

      <div className="facts-toolbar library-toolbar editorial-toolbar toa-toolbar">
        <div className="search-field">
          <Search size={16} strokeWidth={1.75} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search authorities…"
            aria-label="Search authorities"
          />
        </div>
        <div className="chip-row">
          {[
            { id: 'all', label: 'All issues' },
            { id: '1', label: 'Q1' },
            { id: '2', label: 'Q2' },
          ].map((o) => (
            <button
              key={o.id}
              type="button"
              className={issueFilter === o.id ? 'filter-chip on' : 'filter-chip'}
              onClick={() => setIssueFilter(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="chip-row">
          <button
            type="button"
            className={usefulFilter === 'all' ? 'filter-chip on' : 'filter-chip'}
            onClick={() => setUsefulFilter('all')}
          >
            Any flag
          </button>
          {USEFULNESS.map((u) => (
            <button
              key={u.id}
              type="button"
              className={usefulFilter === u.id ? 'filter-chip on' : 'filter-chip'}
              onClick={() => setUsefulFilter(u.id)}
            >
              {u.label}
            </button>
          ))}
        </div>
        <p className="toa-match mono">
          {matchCount} shown
          {matchCount !== counts.total ? ` of ${counts.total}` : ''}
        </p>
      </div>

      {matchCount === 0 ? (
        <p className="library-empty mono">No cases match these filters.</p>
      ) : (
        <div
          className={
            columns.length > 1 ? 'toa-columns toa-columns-split' : 'toa-columns toa-columns-single'
          }
        >
          {columns.map((col) => (
            <section key={col.id} className={`toa-issue toa-issue-${col.tone}`}>
              <header className="toa-issue-head">
                <div className="toa-issue-rule" aria-hidden />
                <div className="toa-issue-titles">
                  <span className="mono toa-issue-label">{col.label}</span>
                  <p className="toa-issue-q">{col.question}</p>
                </div>
                <span className="toa-issue-count mono">{col.count}</span>
              </header>

              {col.bands.map((band) => (
                <div key={band.id} className="toa-band">
                  <h2 className="toa-band-label mono">
                    {band.label}
                    <span>{band.rows.length}</span>
                  </h2>
                  <ul className="toa-list">
                    {band.rows.map((c) => (
                      <li key={c.id}>
                        <Link to={`/library?case=${encodeURIComponent(c.id)}`} className="toa-row">
                          <div className="toa-row-main">
                            <div className="toa-row-names">
                              <em className="toa-short">{shortCaseName(c.name)}</em>
                              <strong className="toa-full">{c.name}</strong>
                            </div>
                            <span className="mono cite toa-cite">{c.cite || '—'}</span>
                            {blurbFor(c) ? <p className="toa-blurb">{blurbFor(c)}</p> : null}
                            <div className="toa-row-flags">
                              <span
                                className={`useful-pill useful-${c.usefulness || 'background'}`}
                              >
                                {USEFUL_LABEL[c.usefulness] || c.usefulness || 'background'}
                              </span>
                              {c.tag ? (
                                <Tag tone={Number(c.issue) === 2 ? 'q2' : 'q1'}>{c.tag}</Tag>
                              ) : null}
                            </div>
                          </div>
                          <ArrowUpRight
                            size={16}
                            strokeWidth={1.75}
                            className="toa-row-arrow"
                            aria-hidden
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </section>
  )
}
