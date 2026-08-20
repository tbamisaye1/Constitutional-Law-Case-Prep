/**
 * OneNote-shaped notebook model for YUMC / Bronner.
 * Guide baseline pages (record map, orientation) come from bronnerGuideSeed.
 */

import { GUIDE_ORIENT, GUIDE_RECORD_MAP_HTML } from './bronnerGuideSeed'

export const NOTEBOOK_META = {
  id: 'yumc-bronner',
  title: 'YUMC · Bronner',
}

export const SECTION_COLORS = [
  '#17565A',
  '#8C3226',
  '#9C7A22',
  '#3D5A80',
  '#6B4F7A',
  '#2F6F4E',
  '#A65D3F',
  '#4C5158',
]

export const SEED_TREE = [
  {
    id: 'grp-bronner',
    name: 'Bronner 2026–27',
    kind: 'group',
    children: [
      { id: 'sec-guide', name: 'Guide baseline', kind: 'section', color: '#9C7A22' },
      { id: 'sec-facts', name: 'AMCA Case Facts', kind: 'section', color: '#9C7A22' },
      { id: 'sec-cases', name: 'Cases', kind: 'section', color: '#17565A' },
      { id: 'sec-issue1', name: 'Issue 1 Notes', kind: 'section', color: '#3D5A80' },
      { id: 'sec-issue2', name: 'Issue 2 Notes', kind: 'section', color: '#8C3226' },
      { id: 'sec-args', name: 'My Arguments', kind: 'section', color: '#6B4F7A' },
      { id: 'sec-oa', name: 'Openings and OA', kind: 'section', color: '#2F6F4E' },
    ],
  },
  {
    id: 'grp-georgetown',
    name: 'Georgetown',
    kind: 'group',
    children: [
      { id: 'sec-conlaw', name: 'Con Law', kind: 'section', color: '#A65D3F' },
      { id: 'sec-gcases', name: 'Cases', kind: 'section', color: '#17565A' },
      { id: 'sec-instant', name: 'Instant Case', kind: 'section', color: '#8C3226' },
      { id: 'sec-gargs', name: 'Arguments', kind: 'section', color: '#6B4F7A' },
      { id: 'sec-rebuttal', name: 'Rebuttal', kind: 'section', color: '#4C5158' },
    ],
  },
  {
    id: 'grp-basics',
    name: 'Basics',
    kind: 'group',
    children: [
      { id: 'sec-practice', name: 'Practice', kind: 'section', color: '#2F6F4E' },
      { id: 'sec-meta', name: 'Notes on moot court', kind: 'section', color: '#4C5158' },
    ],
  },
]

export const SEED_PAGES = {
  'sec-guide': [
    {
      id: 'pg-orient',
      title: '[overview] What this case is',
      html: `<h2>What this case actually is</h2><p>${GUIDE_ORIENT.lede}</p><p><strong>Naming trap.</strong> ${GUIDE_ORIENT.namingTrap}</p><p>Petitioner: ${GUIDE_ORIENT.petitioner}. Respondent: ${GUIDE_ORIENT.respondent}. Everything reviewed de novo.</p>`,
    },
    {
      id: 'pg-rmap',
      title: 'Record map (R. pages)',
      html: GUIDE_RECORD_MAP_HTML,
    },
  ],
  'sec-facts': [
    {
      id: 'pg-all-facts',
      title: 'All facts',
      html: '<h2>All facts</h2><p>Prefer the Case facts room for searchable cards. This page is a scratch pad.</p><ul><li>93 days of pole-camera surveillance</li><li>Four Ring cameras on public poles</li><li>Oath scheduled July 4, 2025</li><li>GTMO transfer July 7, 2025</li></ul>',
    },
    {
      id: 'pg-pet-facts',
      title: 'Petitioner Facts',
      html: '<h2>Petitioner facts</h2><ul><li>LPR on the cusp of citizenship</li><li>Good moral character already found</li><li>Arraigned, bond, then military transfer</li></ul>',
    },
    {
      id: 'pg-memo',
      title: 'Facts for memorisation',
      html: '<h2>Cold facts</h2><ul><li>93 days</li><li>Four cameras</li><li>July 4 / July 7</li><li>12 months · sealed evidence</li></ul>',
    },
  ],
  'sec-cases': [
    {
      id: 'pg-katz',
      title: 'Katz v. United States',
      html: '<h2>Katz</h2><p>Deep case work lives in Case library. Use this page for personal quips.</p>',
    },
    {
      id: 'pg-carpenter',
      title: 'Carpenter v. United States',
      html: '<h2>Carpenter</h2><p>Aggregation of CSLI can be a search. Watch the limiting sentence for pole cameras.</p>',
    },
  ],
  'sec-issue1': [
    {
      id: 'pg-quotes-pet',
      title: 'Quotes for petitioner',
      html: '<h2>Quotes for petitioner</h2><p>Paste holdings with page cites as you read.</p><ul><li><em>Quote</em> — Case, p.</li></ul>',
    },
    {
      id: 'pg-quotes-resp',
      title: 'Quotes for Respondent',
      html: '<h2>Quotes for respondent</h2><ul><li></li></ul>',
    },
    {
      id: 'pg-q1-apply',
      title: 'Applied to Bronner (Q1)',
      html: '<h2>Q1 apply</h2><p>What each fact does on the Fourth Amendment. Expand from the guide as you prep.</p><ul><li>93 days / duration</li><li>Public pole / vantage</li><li>Pattern of life (R. 7)</li></ul>',
    },
  ],
  'sec-issue2': [
    {
      id: 'pg-youngstown',
      title: 'Youngstown categories',
      html: '<h2>Youngstown</h2><p>Jackson concurrence method over labels.</p><ul><li>Cat 1</li><li>Cat 2</li><li>Cat 3</li></ul>',
    },
    {
      id: 'pg-q2-apply',
      title: 'Applied to Bronner (Q2)',
      html: '<h2>Q2 apply</h2><p>Facts that push exceeded authority vs within authority. Expand from the guide q2apply split.</p>',
    },
  ],
  'sec-args': [
    {
      id: 'pg-pet-struct',
      title: 'Petitioner Structure',
      html: '<h2>Petitioner structure</h2><ol><li>Opening theme</li><li>Q1</li><li>Q2</li><li>Hinge</li></ol>',
    },
    {
      id: 'pg-resp-struct',
      title: 'Respondent Structure',
      html: '<h2>Respondent structure</h2><ol><li>Opening</li><li>No search</li><li>Authority</li></ol>',
    },
    {
      id: 'pg-rebuttal',
      title: 'Rebuttal',
      html: '<h2>Rebuttal</h2><ul><li></li></ul>',
    },
  ],
  'sec-oa': [
    {
      id: 'pg-opening',
      title: 'Opening',
      html: '<h2>Opening</h2><p>May it please the Court…</p>',
    },
  ],
  'sec-conlaw': [
    {
      id: 'pg-parham',
      title: 'Parham v. Hughes',
      html: '<h2>Parham v. Hughes</h2><p><strong>Facts of the case:</strong></p><ul><li>Nested bullets work like OneNote indents</li></ul>',
    },
  ],
  'sec-gcases': [],
  'sec-instant': [
    {
      id: 'pg-instant',
      title: 'Instant case notes',
      html: '<h2>Instant case</h2><p>Georgetown problem-set workspace.</p>',
    },
  ],
  'sec-gargs': [],
  'sec-rebuttal': [],
  'sec-practice': [],
  'sec-meta': [
    {
      id: 'pg-process',
      title: 'How I prep',
      html: '<h2>Process</h2><ol><li>Orient on the record</li><li>Read doctrine history</li><li>Case cards</li><li>Apply facts</li><li>Draft structure</li><li>Practice</li></ol>',
    },
  ],
}
