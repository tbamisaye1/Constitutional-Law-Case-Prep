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
      html: '<h2>All facts</h2><p>Use the Case facts room for searchable cards and record citations.</p><ul><li>Agents used four Ring cameras on public utility poles to record Bronner’s home for 93 days without a warrant.</li><li>United States Citizenship and Immigration Services approved his naturalization and scheduled the oath for July 4, 2025.</li><li>The government transferred him to Guantanamo on July 7, 2025, where he remained without seeing the sealed evidence against him.</li></ul>',
    },
    {
      id: 'pg-pet-facts',
      title: 'Petitioner Facts',
      html: '<h2>Petitioner facts</h2><ul><li>Bronner was a lawful permanent resident whose naturalization had already been approved.</li><li>The government had found that he possessed good moral character and scheduled his oath three days before his transfer to Guantanamo.</li><li>An Article III court arraigned him and released him on bond before the executive re-arrested him and placed him in military custody.</li></ul>',
    },
    {
      id: 'pg-memo',
      title: 'Facts for memorisation',
      html: '<h2>Cold facts</h2><ul><li>Four Ring cameras recorded for 93 consecutive days without a warrant.</li><li>Bronner’s citizenship oath was scheduled for July 4, 2025, and his transfer to Guantanamo occurred on July 7.</li><li>He spent twelve months in military custody without seeing the sealed evidence against him.</li></ul>',
    },
  ],
  'sec-cases': [
    {
      id: 'pg-katz',
      title: 'Katz v. United States',
      html: '<h2>Katz</h2><p>Katz asks whether a person expected privacy and whether society recognizes that expectation as reasonable. Bronner uses the test to argue that 93 days of searchable footage exposed a private pattern even though individual movements were visible. Open the Case library for the full case card and its application to both sides.</p>',
    },
    {
      id: 'pg-carpenter',
      title: 'Carpenter v. United States',
      html: '<h2>Carpenter</h2><p>Carpenter held that obtaining at least seven days of historical cell-site location information (CSLI) is a search because the aggregated record reveals a detailed chronicle of movement. Bronner compares that record to 93 days of camera footage; the government answers that fixed cameras observed only exposed areas and did not follow him everywhere. Open the Case library for the full case card.</p>',
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
      html: '<h2>Quotes for respondent</h2><p>Add exact quotations with a case name and page citation. Start with the public-vantage rule in Ciraolo and the duration discussion in Tuggle.</p>',
    },
    {
      id: 'pg-q1-apply',
      title: 'Applied to Bronner (Q1)',
      html: '<h2>Applying the Fourth Amendment</h2><p>Bronner argues that four cameras, 93 days of recording, zoom, infrared, motion detection, and storage produced a searchable pattern of domestic life. The government starts with Ciraolo and Tuggle because the cameras stood on public poles and viewed a porch, steps, driveway, and door exposed to nearby streets. Use the Bronner guide’s Issue 1 application section for the complete split and record citations.</p>',
    },
  ],
  'sec-issue2': [
    {
      id: 'pg-youngstown',
      title: 'Youngstown categories',
      html: '<h2>Youngstown categories</h2><p>Justice Jackson measures presidential power against Congress’s position. Category 1 is strongest because Congress authorized the action, Category 2 is uncertain because Congress was silent, and Category 3 is weakest because the President acted against Congress’s expressed or implied will.</p><p>In Bronner, the majority reads the Authorization for Use of Military Force, the National Defense Authorization Act, and the Anti-Terrorist Act as authorization. The dissent reads Congress’s detention limits as opposition, or at best silence. See the Bronner guide’s Youngstown framework for the statutory steps.</p>',
    },
    {
      id: 'pg-q2-apply',
      title: 'Applied to Bronner (Q2)',
      html: '<h2>Applying Article II</h2><p>The government argues that Congress authorized military detention through the Authorization for Use of Military Force and later detention statutes, placing the President in Youngstown Category 1. Bronner argues that Congress withheld authority over a lawful resident arrested in the United States, placing the order in Category 3 or, at best, Category 2.</p><p>Hamdi may support detention tied to authorized force, but it also requires notice and a fair chance to rebut the classification. Bronner had spent twelve months at Guantanamo without seeing the evidence, after an Article III court arraigned him and released him on bond. See the Bronner guide’s Issue 2 application section for the full argument on both sides.</p>',
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
      html: '<h2>Rebuttal</h2><p>Add each opposing claim with the record fact or case that answers it. Keep the Fourth Amendment and Article II responses separate so the authority is easy to retrieve during argument.</p>',
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
