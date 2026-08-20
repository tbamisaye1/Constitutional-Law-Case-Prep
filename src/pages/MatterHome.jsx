import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Callout, Tag } from '../components/CaseCard'
import { getHealth } from '../api/client'
import { ArrowRight, NotebookPen, Library, Scale, ListChecks, BookOpen } from 'lucide-react'
import { GUIDE_ORIENT, GUIDE_META } from '../data/bronnerGuideSeed'

/**
 * Matter home: Bronner guide orientation + room entry points.
 * Guide text is a baseline; Facts / Library / Notes hold the editable depth.
 */
export function MatterHome() {
  const [apiStatus, setApiStatus] = useState('checking…')

  useEffect(() => {
    getHealth()
      .then((data) => setApiStatus(data.status === 'ok' ? 'backend online' : 'backend odd'))
      .catch(() => setApiStatus('backend offline (start FastAPI on :8000)'))
  }, [])

  return (
    <section className="workspace">
      <div className="hero-tags">
        <Tag>{GUIDE_META.season}</Tag>
        <Tag tone="q1">Q1 Fourth Amendment</Tag>
        <Tag tone="q2">Q2 Article II</Tag>
      </div>

      <h1 className="hero-title">{GUIDE_META.title}</h1>
      <p className="lede hero-sub">{GUIDE_ORIENT.lede}</p>

      <div className="qs">
        <div>
          <span className="n">Question 1 · Fourth Amendment</span>
          <p style={{ margin: 0, fontSize: 16.5 }}>
            Whether warrantless pole-camera surveillance of a home&apos;s exterior over 93 days is a
            &quot;search.&quot;
          </p>
        </div>
        <div>
          <span className="n">Question 2 · Article II</span>
          <p style={{ margin: 0, fontSize: 16.5 }}>
            Whether the President exceeded Article II authority ordering prolonged offshore detention
            of a lawful permanent resident.
          </p>
        </div>
      </div>

      <Callout label="Naming trap" tone="warn">
        <p style={{ margin: 0 }}>{GUIDE_ORIENT.namingTrap}</p>
      </Callout>

      <Callout label="Guide baseline" tone="note">
        <p style={{ margin: 0 }}>
          Read the full Bronner explanations in{' '}
          <Link to="/guide">Bronner guide</Link> (TOC + every section from your HTML). Case facts /
          library hold the structured prep atoms. API:{' '}
          <span className="mono">{apiStatus}</span>
        </p>
      </Callout>

      <h2 className="section-title">Start working</h2>
      <div className="quick-grid">
        <QuickLink
          to="/guide"
          icon={BookOpen}
          title="Bronner guide"
          body="Orient, doctrine stories, statutes, both questions applied — easy to find and edit."
        />
        <QuickLink
          to="/facts"
          icon={ListChecks}
          title="Case facts"
          body="Record facts, posture, memorise lines — from the guide timeline and orientation."
        />
        <QuickLink
          to="/library"
          icon={Library}
          title="Case library"
          body="All Q1/Q2 cases from the guide (holding, rule, role for both sides)."
        />
        <QuickLink
          to="/notes"
          icon={NotebookPen}
          title="Notes"
          body="Your OneNote-shaped pages. Expand as you improve your own analysis."
        />
        <QuickLink
          to="/arguments"
          icon={Scale}
          title="Arguments"
          body="Petitioner / respondent structure for OA and briefs."
        />
      </div>
    </section>
  )
}

function QuickLink({ to, icon: Icon, title, body }) {
  return (
    <Link to={to} className="quick-card">
      <div className="quick-card-top">
        <Icon size={18} strokeWidth={1.75} />
        <ArrowRight size={16} strokeWidth={1.75} className="quick-arrow" />
      </div>
      <strong>{title}</strong>
      <span>{body}</span>
    </Link>
  )
}
