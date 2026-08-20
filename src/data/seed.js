/**
 * Seed data shaped like your YUMC OneNote + Bronner matter.
 * Later this comes from the API; local seed keeps the UI usable offline.
 */

export const MATTER = {
  id: 'bronner-2026',
  title: 'Bobby Bronner v. United States',
  season: 'AMCA 2026–27',
}

export const NAV = [
  {
    label: 'Matter',
    items: [
      { to: '/', text: 'Home', icon: 'Home' },
      { to: '/guide', text: 'Bronner guide', icon: 'BookOpen' },
      { to: '/facts', text: 'Case facts', icon: 'ListChecks' },
      { to: '/library', text: 'Case library', icon: 'Library' },
    ],
  },
  {
    label: 'Prep',
    items: [
      { to: '/notes', text: 'Notes', icon: 'NotebookPen' },
      { to: '/arguments', text: 'Arguments', icon: 'Scale' },
      { to: '/openings', text: 'Openings & OA', icon: 'Mic' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/upload', text: 'Upload', icon: 'Upload' },
      { to: '/agent', text: 'Agent', icon: 'Bot' },
    ],
  },
]

export const SEED_CASES = [
  { id: 'katz', name: 'Katz v. United States', cite: '389 U.S. 347 (1967)', issue: 1, tag: 'priority' },
  { id: 'carpenter', name: 'Carpenter v. United States', cite: '585 U.S. 296 (2018)', issue: 1, tag: 'priority' },
  { id: 'tuggle', name: 'United States v. Tuggle', cite: '4 F.4th 505 (7th Cir. 2021)', issue: 1, tag: null },
  { id: 'moore-bush', name: 'United States v. Moore-Bush', cite: '36 F.4th 320 (1st Cir. 2022)', issue: 1, tag: 'split' },
  { id: 'jones', name: 'United States v. Jones', cite: '565 U.S. 400 (2012)', issue: 1, tag: null },
  { id: 'ciraolo', name: 'California v. Ciraolo', cite: '476 U.S. 207 (1986)', issue: 1, tag: null },
  { id: 'youngstown', name: 'Youngstown Sheet & Tube v. Sawyer', cite: '343 U.S. 579 (1952)', issue: 2, tag: 'priority' },
  { id: 'milligan', name: 'Ex parte Milligan', cite: '71 U.S. 2 (1866)', issue: 2, tag: null },
  { id: 'hamdi', name: 'Hamdi v. Rumsfeld', cite: '542 U.S. 507 (2004)', issue: 2, tag: null },
  { id: 'quirin', name: 'Ex parte Quirin', cite: '317 U.S. 1 (1942)', issue: 2, tag: null },
]

export const SEED_NOTE_PAGES = [
  {
    id: 'issue1',
    title: 'Issue 1 — Fourth Amendment',
    section: 'Issue notes',
    html: '<h2>Issue 1 notes</h2><p>The Fourth Amendment turn is whether the pole cameras were a <em>search</em>.</p><ul><li>Start from Katz two-step</li><li>Map duration / aggregation arguments from Carpenter</li><li>Read Tuggle and Moore-Bush for the circuit split</li></ul>',
  },
  {
    id: 'issue2',
    title: 'Issue 2 — Article II',
    section: 'Issue notes',
    html: '<h2>Issue 2 notes</h2><p>Who said he could? Youngstown categories first.</p><ul><li>Jackson concurrence method</li><li>Milligan / Quirin tension on military custody</li></ul>',
  },
  {
    id: 'pet-structure',
    title: 'Petitioner structure',
    section: 'My Arguments',
    html: '<h2>Petitioner structure</h2><ol><li>Opening theme</li><li>Q1 roadmap</li><li>Q2 roadmap</li><li>Hinge</li></ol><p>Replace this with your real outline.</p>',
  },
  {
    id: 'quotes-pet',
    title: 'Quotes for petitioner',
    section: 'Issue notes',
    html: '<h2>Quotes for petitioner</h2><p>Paste holdings and record lines here as you read. Keep page cites.</p>',
  },
  {
    id: 'facts-memo',
    title: 'Facts for memorisation',
    section: 'AMCA Case Facts',
    html: '<h2>Facts cold</h2><ul><li>93 days of pole-camera surveillance</li><li>Naturalization approved; oath scheduled July 4, 2025</li><li>Transferred to GTMO July 7, 2025</li></ul>',
  },
]
