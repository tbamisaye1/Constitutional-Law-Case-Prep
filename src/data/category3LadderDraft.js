/**
 * Seeded alternate petitioner argument: the Category 3 ladder.
 * Injected once into Arguments drafts when the board loads without it.
 */

export const CATEGORY3_LADDER_DRAFT_ID = 'alt-q2-ladder'

export function buildCategory3LadderDraft() {
  return {
    id: CATEGORY3_LADDER_DRAFT_ID,
    name: 'Alt · Q2 Category 3 ladder',
    notes:
      '<h2>Category 3 ladder (alt Q2)</h2><p>Same record as Main, different architecture. Three rungs so the argument survives losing the category fight. Cite Appendix III for the NDAA preservation clause.</p><ul><li><strong>Rung 1.</strong> Category 3: statutes exclude lawful residents arrested inside the United States.</li><li><strong>Rung 2.</strong> Even in Category 2, Article II alone cannot supply this power (force turned inward; only delegated powers).</li><li><strong>Rung 3.</strong> Even if authority exists, process fails Hamdi and Mathews.</li></ul>',
    sections: [
      {
        id: 'c3-s1',
        title: 'Opening theme',
        notes:
          '<p>Frame a comparison, not a label: battlefield or courtroom? Arraigned 30 May, pled not guilty, released on bond, surrendered 7 July. <strong>R. 8</strong>. Civilian process was already running.</p><ul><li>Posture carries the burden: Judge Fair granted the writ; Fourteenth Circuit reversed; de novo. <strong>R. 2, R. 9</strong>.</li><li>Category decides who proves what. Jackson: Category 1 carries the strongest presumptions. Majority put him in Category 1 without Congress creating that presumption.</li><li>Two three-day gaps as framing, not pretext: EO 14 Feb, naturalisation 17 Feb (good moral character), oath 4 July, Guantanamo 7 July. <strong>R. 4, R. 8</strong>.</li><li>Bridge to Q1 via <em>Keith</em>: executive officers are not neutral magistrates. Nobody outside the executive tested the surveillance or the label.</li></ul>',
        prongs: [],
      },
      {
        id: 'c3-s2',
        title: 'Lowest Ebb',
        notes:
          '<p>Jackson’s Category 3: President may rely only on his own powers minus Congress’s powers over the subject. Detention is a subject Congress acts on (NDAA 2011, ATA 2025).</p>',
        prongs: [
          {
            id: 'c3-p21',
            title: 'Legal framework: President conflicts with Congress',
            notes:
              '<p><strong>Claim.</strong> Where Congress legislated and declined to confer the power, the President is at his lowest ebb.</p><ul><li><em>Youngstown</em>, 343 U.S. 579, 635–38 (Jackson, J., concurring). Category 3 is the least favorable posture; exclusive control requires disabling Congress from acting on the subject.</li><li>Argue the method: no statute authorised the seizure; Congress had not left an open field; “different and inconsistent way of his own.”</li><li>Inward force gets no indulgence. Arrested at home, arraigned in federal court.</li><li>Delegated powers only; Vesting Clause is not a grant in bulk. Answers inherent-authority half at <strong>R. 12</strong>.</li><li>Best record quote: act “beyond any specific law or statutory framework.” <strong>R. 3–4</strong>.</li><li>Kill “sole organ”: <em>Youngstown</em> n.2 on <em>Curtiss-Wright</em> (dictum; case was under an Act of Congress).</li><li><em>Their answer:</em> 1021(d)/(e) and ATA 4(c) → Category 2. Serious; bridge to 2.2.</li></ul>',
          },
          {
            id: 'c3-p22',
            title: 'Legislative inaction is not an affirmative grant',
            notes:
              '<p><strong>Claim.</strong> Disclaimers, failed bills, and practice cannot supply authority Congress never enacted.</p><ul><li><em>Keith</em>, 407 U.S. 297: Title III disclaimer was not a grant. Same move against 1021(d)/(e) and ATA 4(c). Use on Article II, not only warrants (<strong>R. 17</strong>).</li><li>1021(a) “affirms,” does not grant. <strong>App. III, R. 21</strong>.</li><li>Confine <em>Costanzo</em> to its source (agency construction + long published practice). Majority concedes immigration context (<strong>R. 13</strong>).</li><li>Failed measures show only that nothing passed (<strong>R. 2–3</strong>).</li><li>2026 House bill on offshore detention of lawful non-citizens still pending in Senate. <strong>R. 3</strong>. Legislature mid-debate ≠ acquiescence.</li><li>Signing statements are not law (Black’s majority).</li><li>Clear-statement caution: Non-Detention Act 4001(a) is off-appendix; check outside-authority rules before citing.</li></ul>',
          },
          {
            id: 'c3-p23',
            title: 'Lines between authority',
            notes:
              '<p><strong>Claim.</strong> Line is open courts + tested label, not citizenship or arrest location.</p><ul><li><em>Milligan</em>: military jurisdiction cannot displace open civilian courts. Here a court already arraigned and released him. <strong>R. 8</strong>.</li><li>Narrow <em>Quirin</em> as dissent did (<strong>R. 18</strong>): declared war, saboteurs, proven conduct. Do not fight citizenship / U.S. soil (majority uses those at <strong>R. 12</strong>).</li><li>10 U.S.C. § 948(a)(7) is a definition in a commissions chapter, not a detention grant. Only prong (B) is arguably in play. <strong>App. II, R. 20</strong>.</li><li><em>Prize Cases</em>: attack in progress + endpoint. War on terror has none. They quote “baptize it with a name” (<strong>R. 12</strong>).</li><li>Who applies the label? AG on sealed evidence. <strong>R. 7–8</strong>. <em>Keith</em> again.</li></ul>',
          },
        ],
      },
      {
        id: 'c3-s3',
        title: 'The statutory history + Hamdi',
        notes:
          '<p>Concede <em>Hamdi</em> on its facts, then show the statutes do not reach Bronner. Process is the fallback rung.</p>',
        prongs: [
          {
            id: 'c3-p31',
            title: 'Hamdi + AUMF/NDAA',
            notes:
              '<ul><li>Concede: AUMF authorised detention of a Taliban fighter as a fundamental incident of war. <em>Hamdi</em>, 542 U.S. 507.</li><li>“Not a blank check,” 542 U.S. at 535; dissent extends to LPRs (<strong>R. 17</strong>). Capture location cuts for you; citizenship against.</li><li>AUMF § 2(a) loops prevention to 9/11 actors (“by such…”). <strong>App. I, R. 20</strong>.</li><li>1021(b)(2) needs al-Qaeda / Taliban / associated forces. Record: sellers questioned about drug-smuggling orgs. <strong>R. 7</strong>. Steps short; about them, not him.</li><li>1021(c)(1) is a clock until AUMF hostilities end; no endpoint if AUMF stands (<strong>R. 3</strong>).</li><li>1022(b) carve-outs + 1021(e): protective treatment for his group. Their reading (obligation, not power) is textually available; win via <em>Keith</em> + ATA structure. <strong>App. IV, R. 22</strong>.</li><li><strong>New:</strong> 1022(a)(4) waiver-by-certification; record shows no certification → Jackson step 2.</li><li>Cite App. III for “existing law” at 1021(e). R. 3 misattributes to 1022(e).</li></ul>',
          },
          {
            id: 'c3-p32',
            title: 'ATA expresses Congress’s choices about detention',
            notes:
              '<ul><li>4(b)(1) offshore for unlawfully present (presidential risk finding). 4(b)(2) citizens inside only. Silent on lawfully present non-citizens. <strong>App. V, R. 23–24, R. 3</strong>.</li><li><strong>Custody mismatch:</strong> 4(a) is DOJ detention. Nothing in § 4 hands anyone to the armed forces. Military custody comes from NDAA 1022, which carves out lawful residents. The two statutes they stack point opposite ways.</li><li>Rejected extensions 2025–2026 (<strong>R. 3</strong>) = not an open field.</li><li>§ 4 omits time limit, dangerousness, counsel, judicial review (<strong>R. 3</strong>).</li><li>EO 15,000 § 3: “consistent with applicable law” (<strong>App. VI, R. 25</strong>) undercuts Category 1.</li><li>AG “criminal record because accused” is wrong; pending charges may still reach under the order. Attack reasoning / error risk, not reach. <strong>R. 8</strong>.</li></ul>',
          },
          {
            id: 'c3-p33',
            title: 'Process if the Court finds authority',
            notes:
              '<p><em>Hamdi</em> + <em>Mathews</em>: notice of factual basis + chance to rebut before a neutral decisionmaker.</p><ul><li>Factor 1: elemental liberty interest; 12 months Guantanamo uncharged. <strong>R. 7–8</strong>.</li><li>Factor 2 (strongest): arraignment + bond before military transfer; USCIS good-moral-character three days after EO; no convictions; label based on accusation. <strong>R. 4, R. 8, dissent R. 19</strong>.</li><li>Factor 3: sensitivity does not show why a neutral tribunal cannot test the classification (dissent <strong>R. 18</strong>).</li><li>Answer majority’s habeas-is-working / <em>Banyee</em> close (<strong>R. 14</strong>): habeas tests legality, not unseen facts; <em>Banyee</em> is immigration detention, not offshore military custody.</li><li>Fifth Amendment says “person,” not “citizen.”</li></ul>',
          },
        ],
      },
      {
        id: 'c3-s4',
        title: 'Remedy',
        notes:
          '<ul><li><strong>Primary.</strong> Affirm the writ; release from military custody back into the pending criminal case (arraigned; pled not guilty).</li><li><strong>Fallback</strong> (dissent <strong>R. 18</strong>): remand for notice + rebuttal before a neutral decisionmaker, with periodic review.</li><li>A narrow second ask makes the broad first ask easier to grant.</li></ul>',
        prongs: [],
      },
      {
        id: 'c3-s5',
        title: 'Concessions and preservation',
        notes:
          '<ul><li>Not preserved: treaties/protocols; speedy trial, bail, innocence-evidence. <strong>R. 9 n.9</strong>.</li><li>No independent PC asserted; warrant challenge not preserved. <strong>R. 9 n.8</strong>. Footage reliance stipulation matters. <strong>R. 7</strong>.</li><li>Concede Quirin on citizenship / U.S. soil; Hamdi on its facts; 1021(a)/(c)(1) as their best card.</li><li>Treat 93 days as stipulated (18 Mar–27 May is 70). <strong>R. 5, R. 7</strong>.</li><li>Record wrinkles: Cassady/Cassidy; District/Central District of Olympus; 1021(e) misattribution at R. 3.</li><li>Argue the reasoning, not “the dissent was right” (cert with no Q1 circuit split).</li></ul>',
        prongs: [],
      },
    ],
  }
}
