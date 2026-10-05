import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Search } from 'lucide-react'
import { Tag } from '../components/CaseCard'
import { useCaseLibrary } from '../hooks/useCaseLibrary'
import { USEFULNESS } from '../data/caseResearchSeed'
import {
  OFFICIAL_AUTHORITIES,
  OFFICIAL_TOA_SOURCE,
} from '../data/officialAuthorities'

const USEFUL_LABEL = Object.fromEntries(USEFULNESS.map((u) => [u.id, u.label]))

const ISSUE_META = {
  1: {
    id: 1,
    label: 'Question 1 · Fourth Amendment',
    listLabel: 'List of Fourth Amendment Cases Cited',
    question:
      'Whether warrantless pole-camera surveillance of a home\'s exterior over 93 days is a "search."',
    tone: 'q1',
  },
  2: {
    id: 2,
    label: 'Question 2 · Article II',
    listLabel: 'List of Article II Cases Cited',
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
  if (/^(ex|in|the)$/i.test(parts[0]) && parts[1]) {
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
  if (!caseItem) return ''
  const raw = (caseItem.headlineNote || caseItem.holding || '').trim()
  if (!raw) return ''
  const first = raw.split(/(?<=[.!?])\s+/)[0] || raw
  return first.length > 160 ? `${first.slice(0, 157).trim()}…` : first
}

/**
 * Official AMCA Table of authorities for Bronner 2026–27.
 * Rows come from the case packet lists; Case library supplies blurbs and deep links.
 */
export function AuthoritiesPage() {
  const lib = useCaseLibrary()
  const [query, setQuery] = useState('')
  const [issueFilter, setIssueFilter] = useState('all')
  const [usefulFilter, setUsefulFilter] = useState('all')

  const libraryById = useMemo(() => {
    const map = new Map()
    for (const c of lib.cases) map.set(c.id, c)
    return map
  }, [lib.cases])

  const rows = useMemo(() => {
    return OFFICIAL_AUTHORITIES.map((entry, index) => {
      const libCase = entry.libraryId ? libraryById.get(entry.libraryId) : null
      return {
        ...entry,
        packetOrder: index,
        libCase,
        usefulness: libCase?.usefulness || null,
        tag: libCase?.tag || null,
        blurb: blurbFor(libCase),
        hasLibrary: Boolean(libCase),
      }
    })
  }, [libraryById])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (issueFilter !== 'all' && String(r.issue) !== issueFilter) return false
      if (usefulFilter !== 'all' && (r.usefulness || 'background') !== usefulFilter) return false
      if (!q) return true
      return [r.name, r.cite, r.blurb, r.tag, r.libCase?.holding, r.libCase?.rule]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [rows, query, issueFilter, usefulFilter])

  const counts = useMemo(() => {
    const q1 = OFFICIAL_AUTHORITIES.filter((c) => c.issue === 1).length
    const q2 = OFFICIAL_AUTHORITIES.filter((c) => c.issue === 2).length
    return { total: OFFICIAL_AUTHORITIES.length, q1, q2 }
  }, [])

  const columns = useMemo(() => {
    const issues =
      issueFilter === 'all' ? [1, 2] : issueFilter === '1' ? [1] : issueFilter === '2' ? [2] : [1, 2]
    return issues.map((issue) => {
      const issueRows = filtered
        .filter((r) => r.issue === issue)
        .sort((a, b) => a.packetOrder - b.packetOrder)
      return {
        ...ISSUE_META[issue],
        count: issueRows.length,
        rows: issueRows,
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
            The official closed universe from the case packet for both questions. Open a row to jump
            into that case in the Case library.
          </p>
          <p className="toa-source mono">{OFFICIAL_TOA_SOURCE}</p>
        </div>
        <div className="toa-stats" aria-label="Authority counts">
          <div className="toa-stat">
            <strong>{counts.total}</strong>
            <span className="mono">authorities</span>
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
        <p className="library-empty mono">No authorities match these filters.</p>
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
                  <span className="mono toa-issue-label">{col.listLabel}</span>
                  <p className="toa-issue-q">{col.question}</p>
                </div>
                <span className="toa-issue-count mono">{col.count}</span>
              </header>

              <ol className="toa-list toa-list-official">
                {col.rows.map((r, i) => {
                  const body = (
                    <>
                      <div className="toa-row-main">
                        <div className="toa-row-names">
                          <span className="toa-index mono">{i + 1}</span>
                          <em className="toa-short">{shortCaseName(r.name)}</em>
                          <strong className="toa-full">{r.name}</strong>
                        </div>
                        <span className="mono cite toa-cite">{r.cite}</span>
                        {r.blurb ? <p className="toa-blurb">{r.blurb}</p> : null}
                        <div className="toa-row-flags">
                          {r.usefulness ? (
                            <span className={`useful-pill useful-${r.usefulness}`}>
                              {USEFUL_LABEL[r.usefulness] || r.usefulness}
                            </span>
                          ) : null}
                          {r.tag ? (
                            <Tag tone={Number(r.issue) === 2 ? 'q2' : 'q1'}>{r.tag}</Tag>
                          ) : null}
                          {!r.hasLibrary ? (
                            <span className="mono toa-missing">Not yet in Case library</span>
                          ) : null}
                        </div>
                      </div>
                      {r.hasLibrary ? (
                        <ArrowUpRight
                          size={16}
                          strokeWidth={1.75}
                          className="toa-row-arrow"
                          aria-hidden
                        />
                      ) : null}
                    </>
                  )

                  return (
                    <li key={r.id}>
                      {r.hasLibrary && r.libraryId ? (
                        <Link
                          to={`/library?case=${encodeURIComponent(r.libraryId)}`}
                          className="toa-row"
                        >
                          {body}
                        </Link>
                      ) : (
                        <div className="toa-row toa-row-static">{body}</div>
                      )}
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </section>
  )
}
