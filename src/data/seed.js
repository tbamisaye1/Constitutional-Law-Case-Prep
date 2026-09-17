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
    html: '<h2>Issue 1 notes</h2><p>The Fourth Amendment question is whether 93 days of pole-camera recording counted as a search. Katz supplies the expectation-of-privacy test, and Carpenter explains why aggregation can reveal a private whole from public movements. Tuggle and Moore-Bush show the competing approaches to long-term pole-camera surveillance. Use the Bronner guide’s Issue 1 sections for the full rules and record application.</p>',
  },
  {
    id: 'issue2',
    title: 'Issue 2 — Article II',
    section: 'Issue notes',
    html: '<h2>Issue 2 notes</h2><p>Youngstown asks whether Congress authorized Bronner’s military detention, left the question unresolved, or opposed it. The government reads the Authorization for Use of Military Force, the National Defense Authorization Act, and the Anti-Terrorist Act together as authorization. Bronner argues that Congress withheld authority to detain a lawful resident arrested in the United States, while Milligan, Quirin, and Hamdi define who may enter military custody and what review is due. Use the Bronner guide’s Youngstown and Issue 2 application sections for the complete analysis.</p>',
  },
  {
    id: 'pet-structure',
    title: 'Petitioner structure',
    section: 'My Arguments',
    html: '<h2>Petitioner structure</h2><ol><li>Open with Bronner’s approved naturalization, the warrantless 93-day recording, and the transfer to Guantanamo.</li><li>Explain why the combined surveillance created a search under Katz and Carpenter.</li><li>Apply Youngstown to show that Congress did not authorize this military detention.</li><li>Use Hamdi to require notice and a meaningful chance to answer the sealed evidence.</li></ol>',
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
    html: '<h2>Facts cold</h2><ul><li>Four Ring cameras recorded Bronner’s home for 93 consecutive days without a warrant.</li><li>His naturalization was approved, with the oath scheduled for July 4, 2025.</li><li>The government transferred him to Guantanamo on July 7, where he remained without seeing the sealed evidence against him.</li></ul>',
  },
]
