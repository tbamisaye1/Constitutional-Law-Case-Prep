/**
 * Seed content extracted from the Bronner HTML case guide.
 * Editable baseline for Facts, Case library, notes, and timelines.
 * Author: Tobi Bamisaye
 *
 * Source: YUMC/Year 2/Bronner_v_United_States_Case_Guide (2).html
 */

export const GUIDE_META = {
  title: 'Bobby Bronner v. United States',
  season: 'AMCA 2026–27',
  source: 'Bronner HTML case guide',
}

export const GUIDE_ORIENT = {
  lede: 'Strip out the constitutional language and this is a story about a man who was three days from becoming a citizen.',
  namingTrap: 'DeNolf is the President in this case, not the defendant. When you see DeNolf, read the government.',
  petitioner: 'Bronner',
  respondent: 'United States',
}

export const GUIDE_LIBRARY_CASES = [
  {
    "id": "katz",
    "name": "Katz v. United States",
    "cite": "389 U.S. 347 (1967)",
    "year": "1967",
    "issue": 1,
    "tag": "priority",
    "usefulness": "core",
    "holding": "A search. The government's activity violated the privacy on which Katz justifiably relied while using the booth, and it was unreasonable because no warrant was obtained.",
    "rule": "The two-step test actually comes from Justice Harlan's concurrence , not the majority: (1) a subjective expectation of privacy, (2) one society recognizes as reasonable. Everything in Question 1 runs through it.",
    "usePetitioner": "The shared frame. Both opinions below cite it in the first paragraph of their Fourth Amendment analysis. Note the structure of Katz's win: he was visible to everyone and still prevailed, because what he protected was not his image.",
    "useRespondent": "",
    "suggestedFile": "Katz v. United States.pdf",
    "guideFacts": "FBI agents taped an electronic listening device to the outside of a public telephone booth and recorded Charles Katz transmitting illegal wagering information. No physical entry into the booth. The booth was glass — anyone could see him standing in it.",
    "guideReasoning": "The Court abandoned the requirement of physical trespass. The Fourth Amendment protects people, not places . The famous formulation is a pair: what a person knowingly exposes to the public — even in his own home or office — is not protected; but what he seeks to preserve as private , even in an area accessible to the public, may be constitutionally protected.",
    "guideUse": "The shared frame. Both opinions below cite it in the first paragraph of their Fourth Amendment analysis. Note the structure of Katz's win: he was visible to everyone and still prevailed, because what he protected was not his image."
  },
  {
    "id": "keith",
    "name": "United States v. U.S. District Court (Keith)",
    "cite": "407 U.S. 297 (1972)",
    "year": "1972",
    "issue": 1,
    "tag": null,
    "usefulness": "useful",
    "holding": "Two holdings. (1) Title III § 2511(3), which said nothing in the Act limits the President's power to protect against overthrow, is merely a disclaimer of congressional intent — not a grant of authority. (2) The Fourth Amendment requires prior judicial approval for domestic security surveillance of this type.",
    "rule": "A statutory disclaimer does not create presidential power. Domestic-security surveillance ordinarily requires advance approval from a neutral judge, which matters because Bronner challenges surveillance initiated and controlled by executive officers without a warrant.",
    "usePetitioner": "The dissent's warrant argument, and the closest thing in the case file to a bridge between the two questions : the deference the government asks for on Article II is the deference Keith refused on the Fourth Amendment.",
    "useRespondent": "",
    "suggestedFile": "United States v. U.S. District Court (Keith).pdf",
    "guideFacts": "Three defendants were charged with conspiring to destroy government property; one with dynamiting a CIA office. The government admitted warrantless wiretaps, supported by an Attorney General affidavit stating the taps gathered intelligence \"necessary to protect the nation from attempts of domestic organizations to attack and subvert the existing structure of the Government.\" It argued this was a reasonable exercise of presidential power.",
    "guideReasoning": "The Court's core move is institutional, not factual: \"The Fourth Amendment does not contemplate the executive officers of Government as neutral and disinterested magistrates.\" Their duty is to enforce, investigate, and prosecute — so they should not be the sole judges of when to use constitutionally sensitive means. The historical judgment the Amendment accepts is that unreviewed executive discretion \"may yield too readily to pressures to obtain incriminating evidence.\"",
    "guideUse": "The dissent's warrant argument, and the closest thing in the case file to a bridge between the two questions : the deference the government asks for on Article II is the deference Keith refused on the Fourth Amendment."
  },
  {
    "id": "ciraolo",
    "name": "California v. Ciraolo",
    "cite": "476 U.S. 207 (1986)",
    "year": "1986",
    "issue": 1,
    "tag": null,
    "usefulness": "useful",
    "holding": "Not a search. 5–4, Burger, C.J. (Powell, J., dissenting, joined by Brennan, Marshall, Blackmun).",
    "rule": "Lawful vantage point + naked eye + physically nonintrusive = no search, even of curtilage. It is the foundation of every \"but it was visible from the street\" argument.",
    "usePetitioner": "Cited by the majority for the public-vantage principle. Not in your table of authorities as an attached case in the original set — it is now.",
    "useRespondent": "",
    "suggestedFile": "California v. Ciraolo.pdf",
    "guideFacts": "An anonymous tip said marijuana was growing in a backyard shielded from ground-level view by two fences. Officers trained in marijuana identification chartered a private plane, flew over at 1,000 feet , and identified the plants with the naked eye . A photograph was attached to the warrant application as an exhibit.",
    "guideReasoning": "The Court accepted that the yard was curtilage and that Ciraolo had a subjective expectation of privacy — the fences established it. It lost on the second prong. Being within curtilage does not itself bar all police observation. Taking measures to restrict some views does not preclude observation from a public vantage point where the officer has a right to be and from which the activity is clearly visible. Any member of the public flying in that airspace who glanced down would have seen the same thing.",
    "guideUse": "Cited by the majority for the public-vantage principle. Not in your table of authorities as an attached case in the original set — it is now."
  },
  {
    "id": "kyllo",
    "name": "Kyllo v. United States",
    "cite": "533 U.S. 27 (2001)",
    "year": "2001",
    "issue": 1,
    "tag": null,
    "usefulness": "useful",
    "holding": "A search. Where the government uses sense-enhancing technology not in general public use to obtain information regarding the interior of the home that could not otherwise be obtained without physical intrusion , that is a search and is presumptively unreasonable without a warrant.",
    "rule": "Two conditions do the work: interior of the home , and not in general public use . The second is the one everyone fights about, because it means Fourth Amendment protection contracts as consumer technology spreads . That is a known and much-criticized feature of the rule, not an accident.",
    "usePetitioner": "Both opinions rely on it and read it in opposite directions. Majority: Ring cameras are in general public use and penetrated no walls. Dissent: the aggregate use of motion tracking, zoom, infrared, and persistent recording revealed information about domestic rhythms, and \"all details are intimate details\" forecloses calling that trivial.",
    "useRespondent": "Both opinions rely on it and read it in opposite directions. Majority: Ring cameras are in general public use and penetrated no walls. Dissent: the aggregate use of motion tracking, zoom, infrared, and persistent recording revealed information about domestic rhythms, and \"all details are intimate details\" forecloses calling that trivial.",
    "suggestedFile": "Kyllo v. United States.pdf",
    "guideFacts": "Agents suspected Danny Kyllo of growing marijuana indoors. From a car across the street they aimed a thermal imaging device at his triplex for a few minutes and saw that his garage wall and roof were unusually hot — consistent with high-intensity grow lamps. That reading supported a warrant.",
    "guideReasoning": "Scalia's concern was that technology \"shrinks the realm of guaranteed privacy\" — it lets the government get, from outside, what previously required going in. The Amendment must at minimum preserve the degree of privacy that existed when it was adopted.",
    "guideUse": "Both opinions rely on it and read it in opposite directions. Majority: Ring cameras are in general public use and penetrated no walls. Dissent: the aggregate use of motion tracking, zoom, infrared, and persistent recording revealed information about domestic rhythms, and \"all details are intimate details\" forecloses calling that trivial."
  },
  {
    "id": "jones",
    "name": "United States v. Jones",
    "cite": "565 U.S. 400 (2012)",
    "year": "2012",
    "issue": 1,
    "tag": null,
    "usefulness": "core",
    "holding": "A search — unanimously in result, on three different theories.",
    "rule": "Katz supplemented rather than displaced the original trespass rule. Government commits a search when it physically intrudes on a constitutionally protected person, house, paper, or effect to obtain information; the separate privacy-expectation test covers searches without a trespass.",
    "usePetitioner": "Not cited in the Fourteenth Circuit's opinions, but it is the source of nearly everything in them. If you want to understand why \"duration\" became a Fourth Amendment argument at all, this is where it starts.",
    "useRespondent": "",
    "suggestedFile": "United States v. Jones.pdf",
    "guideFacts": "The government got a warrant to install a GPS device on a vehicle registered to Antoine Jones's wife — authorized for the District of Columbia and within 10 days. Agents installed it on the 11th day, in Maryland , so the warrant was worthless. They then tracked the vehicle for 28 days .",
    "guideReasoning": "Decided on old ground. The government physically occupied private property — an \"effect\" — for the purpose of obtaining information. That would have been a search in 1791. Katz's expectation test was added to , not substituted for, the trespass test. The Court expressly declined to reach whether Jones had a reasonable expectation of privacy.",
    "guideUse": "Not cited in the Fourteenth Circuit's opinions, but it is the source of nearly everything in them. If you want to understand why \"duration\" became a Fourth Amendment argument at all, this is where it starts."
  },
  {
    "id": "carpenter",
    "name": "Carpenter v. United States",
    "cite": "585 U.S. 296 (2018)",
    "year": "2018",
    "issue": 1,
    "tag": "priority",
    "usefulness": "core",
    "holding": "A search. Accessing at least seven days of historical cell-site location information (CSLI) requires a warrant. The Court expressly declined to decide whether a shorter period would.",
    "rule": "The government generally needs a warrant to obtain a comprehensive record of a person's movements from historical cell-site location information. Bronner argues that 93 days of pole-camera footage created the same kind of revealing record, while the government stresses that Carpenter was narrow and involved location data collected wherever the defendant traveled.",
    "usePetitioner": "The center of gravity for Question 1. The majority reads it as a case about a specialized device and enormous scale; the dissent reads it as a case about aggregation whose logic doesn't care what hardware produced the record.",
    "useRespondent": "The center of gravity for Question 1. The majority reads it as a case about a specialized device and enormous scale; the dissent reads it as a case about aggregation whose logic doesn't care what hardware produced the record.",
    "suggestedFile": "Carpenter v. United States.pdf",
    "guideFacts": "After a string of Radio Shack and T-Mobile robberies, the government obtained Timothy Carpenter's cell-site location information from his wireless carriers under the Stored Communications Act — a standard lower than probable cause. It received 12,898 location points across 127 days , about 101 per day .",
    "guideReasoning": "Two threads converge. From the Jones concurrences: individuals have a reasonable expectation of privacy in the whole of their physical movements , and the government's ability to compile a comprehensive chronicle of a life is the harm. From the third-party doctrine cases: a person does not surrender all Fourth Amendment protection by venturing into the public sphere .",
    "guideUse": "The center of gravity for Question 1. The majority reads it as a case about a specialized device and enormous scale; the dissent reads it as a case about aggregation whose logic doesn't care what hardware produced the record."
  },
  {
    "id": "tuggle",
    "name": "United States v. Tuggle",
    "cite": "4 F.4th 505 (7th Cir. 2021)",
    "year": "",
    "issue": 1,
    "tag": null,
    "usefulness": "trap",
    "holding": "Not a search. \"The government's use of a technology in public use, while occupying a place it was lawfully entitled to be, to observe plainly visible happenings, did not run afoul of the Fourth Amendment.\"",
    "rule": "Continuous pole-camera observation of areas exposed to public view is not a Fourth Amendment search under existing Supreme Court doctrine, even when it lasts many months. Tuggle matters because Bronner's majority uses that public-view rule, while Bronner argues the duration and combined camera features reveal more than an ordinary observer could see.",
    "usePetitioner": "The majority's authority for \"duration alone does not transform.\" Understand what that citation is doing: it is a circuit court applying a theory it declined to adopt, reaching a result it said it disliked, and inviting Congress or the Supreme Court to fix it.",
    "useRespondent": "",
    "suggestedFile": "United States v. Tuggle.pdf",
    "guideFacts": "Investigating a methamphetamine conspiracy in central Illinois, agents installed three cameras on public utility poles around Travis Tuggle's home — two viewing the front of the house and adjoining parking area, one primarily viewing a co-defendant's shed. They recorded around the clock for roughly eighteen months (Aug. 2014 – Mar. 2016). Agents could remotely zoom, pan, and tilt and watch live; footage was stored at the FBI office. No infrared and no audio. The cameras captured over 100 suspected drug deliveries .",
    "guideReasoning": "1. The mosaic theory isn't binding. The court traces it from Maynard (D.C. Cir. 2010) through the Jones concurrences to Carpenter, notes that scholars say Carpenter \"effectively endorsed\" it, and then holds that the Supreme Court \"has not yet required lower courts to apply it.\" Several courts have rejected it as unworkable because constitutionality would hinge on duration.",
    "guideUse": "The majority's authority for \"duration alone does not transform.\" Understand what that citation is doing: it is a circuit court applying a theory it declined to adopt, reaching a result it said it disliked, and inviting Congress or the Supreme Court to fix it."
  },
  {
    "id": "tafoya",
    "name": "People v. Tafoya",
    "cite": "494 P.3d 613 (Colo. 2021)",
    "year": "",
    "issue": 1,
    "tag": null,
    "usefulness": "useful",
    "holding": "A warrantless search in violation of the Fourth Amendment. Convictions reversed.",
    "rule": "Long-term, continuous pole-camera surveillance can violate a reasonable expectation of privacy when it reveals activity within the home's curtilage that ordinary passersby could not see. For Bronner, Tafoya supports treating duration and technological capacity together, although Bronner's exposed front areas make his facts less favorable.",
    "usePetitioner": "The only pole-camera decision favoring suppression among the cases cited. Tafoya involved a fenced backyard hidden from street view, while Bronner's cameras captured a porch, steps, driveway, and door visible from nearby streets. Bronner therefore needs Tafoya's reasoning about prolonged, continuous observation, not a claim that the physical settings were identical.",
    "useRespondent": "",
    "suggestedFile": "People v. Tafoya.pdf",
    "guideFacts": "An informant told Colorado Springs police that Rafael Tafoya's house was a drug stash house. Police mounted a camera on a utility pole across the street — no warrant — that could pan, tilt, and zoom on command while officers watched live, and recorded continuously for over three months , with footage stored indefinitely . Because of its elevated angle it recorded a backyard enclosed by a six-foot wooden privacy fence with a gate. Officers watched Tafoya let a car through the gate, close it, and crouch at the front-left tire; men later carried a spare tire from the garage to a truck. Police stopped the truck and found $98,000 in the tire.",
    "guideReasoning": "Tafoya showed a subjective expectation of privacy by enclosing the home's curtilage with a six-foot fence and closing its gate. The court then considered the surveillance's duration, continuity, and technological capacity together and held that more than three months of recorded observation exposed information ordinary passersby could not collect. Bronner invokes that combined analysis, although his cameras faced areas visible from nearby streets.",
    "guideUse": "The only pole-camera decision favoring suppression among the cases cited. Tafoya involved a fenced backyard hidden from street view, while Bronner's cameras captured a porch, steps, driveway, and door visible from nearby streets. Bronner therefore needs Tafoya's reasoning about prolonged, continuous observation, not a claim that the physical settings were identical."
  },
  {
    "id": "moore-bush",
    "name": "United States v. Moore-Bush",
    "cite": "36 F.4th 320 (1st Cir. 2022) (en banc)",
    "year": "",
    "issue": 1,
    "tag": "split",
    "usefulness": "core",
    "holding": "The en banc First Circuit affirmed denial of suppression because the officers relied in good faith on then-existing precedent. The judges divided evenly over whether eight months of pole-camera surveillance was itself a Fourth Amendment search, so no constitutional rationale commanded a majority.",
    "rule": "Moore-Bush supplies competing approaches rather than one controlling Fourth Amendment rule. Judge Lynch treated the camera as prolonged observation of exposed areas; Chief Judge Barron treated the aggregated record as a search under Carpenter's reasoning. Bronner's two opinions use those opposing approaches.",
    "usePetitioner": "The majority below cites Lynch; the dissent cites Barron. It is the clearest available evidence that the question is unsettled — a full federal appellate court, on nearly these facts, divided evenly on the constitutional question while agreeing on the outcome.",
    "useRespondent": "The majority below cites Lynch; the dissent cites Barron. It is the clearest available evidence that the question is unsettled — a full federal appellate court, on nearly these facts, divided evenly on the constitutional question while agreeing on the outcome.",
    "suggestedFile": "United States v. Moore-Bush.pdf",
    "guideFacts": "ATF investigated Nia Moore-Bush for selling illegal firearms and trafficking heroin. A cooperating witness bought four guns at the house; a traffic stop recovered 921 bags of heroin. About a week later, agents installed a pole camera on a utility pole outside 120 Hadley Street, Springfield, Massachusetts. It showed the right side of the house, the attached garage, a side door, and the driveway — not the front door — and a tree partially obstructed the view much of the time. It recorded for eight months .",
    "guideReasoning": "The en banc court agreed that suppression was unavailable under the good-faith exception, but it split on the constitutional question. Judge Lynch reasoned that the camera recorded only what could be seen from a lawful public vantage point. Chief Judge Barron reasoned that eight months of searchable footage exposed a detailed pattern of domestic life that ordinary observation could not reproduce.",
    "guideUse": "The majority below cites Lynch; the dissent cites Barron. It is the clearest available evidence that the question is unsettled — a full federal appellate court, on nearly these facts, divided evenly on the constitutional question while agreeing on the outcome."
  },
  {
    "id": "prize-cases",
    "name": "The Prize Cases",
    "cite": "67 U.S. (2 Black) 635 (1863)",
    "year": "1863",
    "issue": 2,
    "tag": null,
    "usefulness": "useful",
    "holding": "The seizures were lawful. The President may meet an armed rebellion without waiting for Congress to \"baptize it with a name.\" A war forced upon the nation is a war whether or not declared.",
    "rule": "Inherent presidential authority to respond to an attack in progress , and the principle that a state of war can exist as a matter of fact rather than declaration.",
    "usePetitioner": "The majority uses it to argue that detention is an incident of war and that the principle extends to modern terrorism. The dissent answers that Prize Cases involved open hostilities between organized forces, not long-term detention of a resident seized far from a battlefield. Its temporal point matters too: a Civil War blockade ended with the war, while the asserted war on terrorism has no clear endpoint.",
    "useRespondent": "The majority uses it to argue that detention is an incident of war and that the principle extends to modern terrorism. The dissent answers that Prize Cases involved open hostilities between organized forces, not long-term detention of a resident seized far from a battlefield. Its temporal point matters too: a Civil War blockade ended with the war, while the asserted war on terrorism has no clear endpoint.",
    "suggestedFile": "The Prize Cases.pdf",
    "guideFacts": "After Fort Sumter, and before Congress acted, Lincoln proclaimed a blockade of Southern ports. Navy ships seized merchant vessels as prizes. The owners sued, arguing there was no war because Congress had not declared one, so the seizures were unlawful.",
    "guideReasoning": "The President has no power to initiate war, but when war is thrust upon the country he is bound to resist force by force . He does not initiate the war; he meets it, and the question of what degree of force the crisis demands is one he must decide.",
    "guideUse": "The majority uses it for the proposition that detention is an incident of war and the principle applies to modern terrorism. The dissent narrows it on two grounds: it arose from open hostilities between organized forces , and it did not involve long-term detention of residents seized far from any battlefield . The dissent's deeper point is temporal — a blockade ends when a war ends, and the \"War on Terror\" is a never-ending concept."
  },
  {
    "id": "milligan",
    "name": "Ex parte Milligan",
    "cite": "71 U.S. (4 Wall.) 2 (1866)",
    "year": "1866",
    "issue": 2,
    "tag": null,
    "usefulness": "core",
    "holding": "The military commission had no jurisdiction. Milligan was entitled to release.",
    "rule": "Military tribunals cannot replace civilian courts for a civilian who is not part of enemy forces when the ordinary courts are open and functioning. Bronner uses that limit because he was arrested in the United States after appearing in an Article III court, but the government says his alleged support for enemy forces places him outside Milligan's rule.",
    "usePetitioner": "Structurally Bronner's best case: a civilian, where courts are open, pulled into military process. The majority distinguishes it on a single ground — Milligan was not part of or supporting enemy forces . Everything on Question 2 turns on whether that distinction holds, which turns on whether the belligerency label has been tested by anyone.",
    "useRespondent": "",
    "suggestedFile": "Ex parte Milligan.pdf",
    "guideFacts": "Lambdin Milligan, an Indiana civilian and Confederate sympathizer, was arrested during the Civil War, tried by a military commission, and sentenced to hang for conspiring to free Confederate prisoners. Indiana was never a theater of war; its federal authority was never opposed and its courts were open and operating throughout.",
    "guideReasoning": "The commission was not a constitutional court, and Congress had not authorized it to try Milligan while Indiana's civilian courts remained open. Martial rule may operate where war actually closes the courts, but necessity could not justify replacing functioning courts in Indiana. That limit matters to Bronner because the government moved him from an Article III prosecution into military custody.",
    "guideUse": "Structurally Bronner's best case: a civilian, where courts are open, pulled into military process. The majority distinguishes it on a single ground — Milligan was not part of or supporting enemy forces . Everything on Question 2 turns on whether that distinction holds, which turns on whether the belligerency label has been tested by anyone."
  },
  {
    "id": "costanzo",
    "name": "Costanzo v. Tillinghast",
    "cite": "287 U.S. 341 (1932)",
    "year": "1932",
    "issue": 2,
    "tag": null,
    "usefulness": "background",
    "holding": "It did not. Deportation on this ground may occur at any time after entry.",
    "rule": "A canon of statutory construction about agency interpretations of the agency's own enabling statute, requiring a consistent and published construction over a long period. That is a narrow thing.",
    "usePetitioner": "The majority uses it for the proposition that legislative inaction can create a presumption of congressional acquiescence in executive practice, conceding that \"Costanzo involved immigration administration\" but asserting the principle \"equally applies.\"",
    "useRespondent": "",
    "suggestedFile": "Costanzo v. Tillinghast.pdf",
    "guideFacts": "An Italian national was ordered deported under § 19 of the Immigration Act of 1917 for managing a house of prostitution, more than five years after entering. Section 19 was a single sentence of nearly nine hundred words, with eleven subject-clauses and five provisos. He argued the opening clause's \"within five years after entry\" carried over to his clause.",
    "guideReasoning": "Three of the eleven following clauses had their own time references and seven had none, so the five-year limit plainly did not carry to all of them. Punctuation is not decisive of statutory construction, and \"we should not apply the rules of syntax to defeat the evident legislative intent.\" A third proviso, applying the section \"irrespective of the time of their entry,\" would have nothing to operate on under the petitioner's reading. Legislative history confirmed it.",
    "guideUse": "The majority uses it for the proposition that legislative inaction can create a presumption of congressional acquiescence in executive practice, conceding that \"Costanzo involved immigration administration\" but asserting the principle \"equally applies.\""
  },
  {
    "id": "curtiss-wright",
    "name": "United States v. Curtiss-Wright Export Corp.",
    "cite": "299 U.S. 304 (1936)",
    "year": "1936",
    "issue": 2,
    "tag": null,
    "usefulness": "useful",
    "holding": "The delegation was valid.",
    "rule": "Curtiss-Wright permits broader congressional delegation in foreign affairs; it does not grant unlimited unilateral presidential power. Justice Jackson later explained that the case involved presidential action under an Act of Congress, not action without or against Congress. That distinction matters because Bronner disputes whether Congress authorized his detention.",
    "usePetitioner": "The majority cites it for \"plenary and exclusive\" power as \"sole organ.\" Jackson's footnote is the complete answer, and it comes from a case the majority itself relies on.",
    "useRespondent": "",
    "suggestedFile": "United States v. Curtiss-Wright Export Corp..pdf",
    "guideFacts": "Congress passed a joint resolution authorizing the President to prohibit arms sales to countries fighting in the Chaco War if he found it would help restore peace. Roosevelt issued the proclamation. Curtiss-Wright, indicted for conspiring to sell fifteen machine guns to Bolivia, argued the resolution was an unconstitutional delegation of legislative power.",
    "guideReasoning": "Sutherland distinguished internal from external affairs. Powers over foreign relations did not come from the States by enumeration but passed to the national government as incidents of sovereignty . Strict non-delegation limits applicable to domestic legislation therefore do not apply the same way abroad. Along the way he described the President as the \"sole organ of the federal government in the field of international relations,\" and noted that the wisdom of requiring narrow standards is doubtful where the President's action may depend on confidential information or on effects on foreign relations.",
    "guideUse": "The majority cites it for \"plenary and exclusive\" power as \"sole organ.\" Jackson's footnote is the complete answer, and it comes from a case the majority itself relies on."
  },
  {
    "id": "quirin",
    "name": "Ex parte Quirin",
    "cite": "317 U.S. 1 (1942)",
    "year": "1942",
    "issue": 2,
    "tag": null,
    "usefulness": "core",
    "holding": "The military commission was lawfully constituted and the petitioners were properly triable before it.",
    "rule": "An unlawful belligerent may be tried by military commission even if captured in the United States and even if the person is a citizen. The classification depended on proven conduct as an enemy saboteur, which matters because Bronner disputes whether an executive accusation alone can place him in the same category.",
    "usePetitioner": "The government's strongest case, because it defeats two intuitive arguments at once: arrest on U.S. soil doesn't matter, and citizenship doesn't matter.",
    "useRespondent": "",
    "suggestedFile": "Ex parte Quirin.pdf",
    "guideFacts": "In June 1942, eight German-trained saboteurs landed from submarines in darkness — four on Long Island, four at Ponte Vedra Beach, Florida. They carried explosives, buried their German uniforms , changed into civilian clothes, and set out to destroy American war industries. All had lived in the United States; all but one were admittedly German citizens. Herbert Haupt was a U.S. citizen. Roosevelt appointed a military commission by proclamation. They were tried; six were executed.",
    "guideReasoning": "The law of war distinguishes lawful from unlawful belligerents. Lawful belligerents — uniformed forces — may be captured and held as prisoners of war. Unlawful belligerents — those who pass secretly through the lines in civilian dress to wage war by destruction of life or property — are additionally subject to trial and punishment by military tribunals for acts that render their belligerency unlawful.",
    "guideUse": "The government's strongest case, because it defeats two intuitive arguments at once: arrest on U.S. soil doesn't matter, and citizenship doesn't matter."
  },
  {
    "id": "youngstown",
    "name": "Youngstown Sheet & Tube Co. v. Sawyer",
    "cite": "343 U.S. 579 (1952)",
    "year": "1952",
    "issue": 2,
    "tag": "priority",
    "usefulness": "core",
    "holding": "Unconstitutional. 6–3.",
    "rule": "The organizing framework for every subsequent separation-of-powers dispute, and the specific principle that where Congress has legislated in a field and declined to confer the power the executive claims, courts scrutinize that claim with caution.",
    "usePetitioner": "The battlefield. The majority places the President in Category 1; the dissent says Category 3, \"at best\" Category 2. The majority also cites it for the proposition — which nobody disputes — that no granted power may be exercised in a way that deprives individuals of constitutional rights.",
    "useRespondent": "The battlefield. The majority places the President in Category 1; the dissent says Category 3, \"at best\" Category 2. The majority also cites it for the proposition — which nobody disputes — that no granted power may be exercised in a way that deprives individuals of constitutional rights.",
    "suggestedFile": "Youngstown Sheet & Tube Co. v. Sawyer.pdf",
    "guideFacts": "During the Korean War, a nationwide steel strike threatened war production. Truman ordered the Secretary of Commerce to seize and operate the mills. He reported to Congress twice; Congress did nothing. Congress had considered and rejected giving presidents seizure authority when it passed the Taft-Hartley Act in 1947, and had provided three other statutory mechanisms for comparable situations, none of which Truman used.",
    "guideReasoning": "The steel seizure could not be traced to a statute or to the President's commander-in-chief power. Justice Jackson's concurrence organized presidential power into three categories based on Congress's position: authorization, silence, or opposition. Bronner turns on that method because the majority reads the Authorization for Use of Military Force and later statutes as approval, while the dissent reads Congress's limits as opposition.",
    "guideUse": "The battlefield. The majority places the President in Category 1; the dissent says Category 3, \"at best\" Category 2. The majority also cites it for the proposition — which nobody disputes — that no granted power may be exercised in a way that deprives individuals of constitutional rights."
  },
  {
    "id": "mathews",
    "name": "Mathews v. Eldridge",
    "cite": "424 U.S. 319 (1976)",
    "year": "1976",
    "issue": 2,
    "tag": null,
    "usefulness": "useful",
    "holding": "An evidentiary hearing is not required before termination. The existing procedures satisfied due process.",
    "rule": "Due process depends on three considerations: the private interest at stake, the risk of error and value of added safeguards, and the government's interest and administrative burden. In Bronner, physical liberty weighs heavily, and the dispute is whether national-security secrecy justifies withholding the evidence from him.",
    "usePetitioner": "Both opinions apply it, via Hamdi . Everything depends on factor one — Hamdi says freedom from physical restraint is \"the most elemental of liberty interests\" — and on whether the government's asserted burden (disclosure would compromise national security) is treated as an ordinary administrative cost or as something categorically different.",
    "useRespondent": "",
    "suggestedFile": "Mathews v. Eldridge.pdf",
    "guideFacts": "George Eldridge received Social Security disability benefits. A state agency reviewed his file, sent him a questionnaire, obtained reports from his physician and a psychiatric consultant, and tentatively concluded his disability had ended. He was given a summary of the evidence and an opportunity to respond in writing. Benefits were terminated. He was entitled to a full evidentiary hearing afterward , with retroactive relief if he won.",
    "guideReasoning": "The Court balanced Eldridge's interest in uninterrupted benefits, the risk that written medical procedures would produce an error, and the government's cost of a hearing before every termination. Because the decision turned mainly on medical records and a full hearing remained available afterward, a pre-termination hearing added little accuracy at substantial cost. Hamdi later adapted this balancing test to military detention, which is why it governs Bronner's demand for notice and a chance to answer the evidence.",
    "guideUse": "Both opinions apply it, via Hamdi . Everything depends on factor one — Hamdi says freedom from physical restraint is \"the most elemental of liberty interests\" — and on whether the government's asserted burden (disclosure would compromise national security) is treated as an ordinary administrative cost or as something categorically different."
  },
  {
    "id": "hamdi",
    "name": "Hamdi v. Rumsfeld",
    "cite": "542 U.S. 507 (2004)",
    "year": "2004",
    "issue": 2,
    "tag": null,
    "usefulness": "core",
    "holding": "On authority, the Authorization for Use of Military Force (AUMF) authorized Hamdi's detention. Detention of enemy combatants for the duration of the relevant conflict is a \"fundamental incident of waging war\" and therefore falls within \"necessary and appropriate force.\"",
    "rule": "The AUMF permits detention of a person shown to have fought with enemy forces, but war powers are not a blank check. A citizen detainee must receive notice of the factual basis for the classification and a fair chance to rebut it before a neutral decisionmaker. Bronner uses that process rule even though he was not yet a citizen.",
    "usePetitioner": "The template for the likely outcome and the case both sides need. Note the two structural distinctions the government presses: Hamdi was a citizen , and he was captured in an active combat zone . Bronner is neither.",
    "useRespondent": "",
    "suggestedFile": "Hamdi v. Rumsfeld.pdf",
    "guideFacts": "Yaser Hamdi, born in Louisiana and raised in Saudi Arabia, was seized in Afghanistan by the Northern Alliance and turned over to the U.S. military, which alleged he was a Taliban fighter. He was taken to Guantanamo; when his American citizenship was discovered he was moved to a naval brig in Virginia. He was held without charge, without counsel, and without any hearing. The government's entire evidentiary submission was a short declaration from a Defense Department official — the \"Mobbs Declaration.\"",
    "guideReasoning": "The plurality read detention of battlefield combatants into Congress's authorization of necessary and appropriate force, but rejected the government's claim that separation of powers barred judicial review. Applying Mathews, it required notice of the factual basis for Hamdi's enemy-combatant classification and a meaningful chance to answer it before a neutral decisionmaker. Bronner tests how far both parts extend when detention rests on alleged material support, the arrest occurred in the United States, and the evidence remains sealed.",
    "guideUse": "The template for the likely outcome and the case both sides need. Note the two structural distinctions the government presses: Hamdi was a citizen , and he was captured in an active combat zone . Bronner is neither."
  },
  {
    "id": "banyee",
    "name": "Banyee v. Garland",
    "cite": "115 F.4th 928 (8th Cir. 2024)",
    "year": "",
    "issue": 2,
    "tag": null,
    "usefulness": "background",
    "holding": "As characterized by the opinions in Bronner, prolonged immigration detention does not automatically require a new bond hearing without a stronger showing that the existing procedures are constitutionally inadequate.",
    "rule": "Banyee is persuasive rather than binding authority on due process in prolonged immigration detention. It matters only by analogy: Bronner's military detention and sealed evidence present a different liberty interest and a different risk of error.",
    "usePetitioner": "Distinguish it. Bronner is held in military custody at Guantanamo on an untested belligerency label, not in ordinary immigration detention under established removal procedures.",
    "useRespondent": "Use it for the narrower point that elapsed time alone does not create a categorical right to an additional hearing. The government still must address Hamdi's more specific process rule.",
    "suggestedFile": "Banyee v. Garland.pdf",
    "guideFacts": "Prolonged immigration detention and when due process requires additional procedure. Not binding on the Supreme Court, and the only source for it in your materials is how the two opinions below characterize it.",
    "guideReasoning": "Use only the treatment given in the Bronner opinions because the underlying case is not otherwise developed in these materials. The analogy concerns when prolonged detention increases the process due; it does not resolve the President's authority to place Bronner in military custody.",
    "guideUse": "A limited due-process comparison. It may support the government on duration alone, but Hamdi, Milligan, and Youngstown speak more directly to Bronner's military custody and access to a neutral tribunal."
  }
]

export const GUIDE_CASE_FACTS = {
  "katz": [
    {
      "id": "cf-katz-1",
      "text": "FBI agents taped an electronic listening device to the outside of a public telephone booth and recorded Charles Katz transmitting illegal wagering information. No physical entry into the booth. The booth was glass — anyone could see him standing in it.",
      "useful": true,
      "note": "From Bronner guide — What happened"
    }
  ],
  "keith": [
    {
      "id": "cf-keith-1",
      "text": "Three defendants were charged with conspiring to destroy government property; one with dynamiting a CIA office. The government admitted warrantless wiretaps, supported by an Attorney General affidavit stating the taps gathered intelligence \"necessary to protect the nation from attempts of domestic organizations to attack and subvert the existing structure of the Government.\" It argued this was a reasonable exercise of presidential power.",
      "useful": true,
      "note": "From Bronner guide — What happened"
    }
  ],
  "ciraolo": [
    {
      "id": "cf-ciraolo-1",
      "text": "An anonymous tip said marijuana was growing in a backyard shielded from ground-level view by two fences. Officers trained in marijuana identification chartered a private plane, flew over at 1,000 feet , and identified the plants with the naked eye . A photograph was attached to the warrant application as an exhibit.",
      "useful": true,
      "note": "From Bronner guide — What happened"
    }
  ],
  "kyllo": [
    {
      "id": "cf-kyllo-1",
      "text": "Agents suspected Danny Kyllo of growing marijuana indoors. From a car across the street they aimed a thermal imaging device at his triplex for a few minutes and saw that his garage wall and roof were unusually hot — consistent with high-intensity grow lamps. That reading supported a warrant.",
      "useful": true,
      "note": "From Bronner guide — What happened"
    }
  ],
  "jones": [
    {
      "id": "cf-jones-1",
      "text": "The government got a warrant to install a GPS device on a vehicle registered to Antoine Jones's wife — authorized for the District of Columbia and within 10 days. Agents installed it on the 11th day, in Maryland , so the warrant was worthless. They then tracked the vehicle for 28 days .",
      "useful": true,
      "note": "From Bronner guide — What happened"
    }
  ],
  "carpenter": [
    {
      "id": "cf-carpenter-1",
      "text": "After a string of Radio Shack and T-Mobile robberies, the government obtained Timothy Carpenter's cell-site location information from his wireless carriers under the Stored Communications Act — a standard lower than probable cause. It received 12,898 location points across 127 days , about 101 per day .",
      "useful": true,
      "note": "From Bronner guide — What happened"
    }
  ],
  "tuggle": [
    {
      "id": "cf-tuggle-1",
      "text": "Investigating a methamphetamine conspiracy in central Illinois, agents installed three cameras on public utility poles around Travis Tuggle's home — two viewing the front of the house and adjoining parking area, one primarily viewing a co-defendant's shed. They recorded around the clock for roughly eighteen months (Aug. 2014 – Mar. 2016). Agents could remotely zoom, pan, and tilt and watch live; footage was stored at the FBI office. No infrared and no audio. The cameras captured over 100 suspected drug deliveries .",
      "useful": true,
      "note": "From Bronner guide — What happened"
    }
  ],
  "tafoya": [
    {
      "id": "cf-tafoya-1",
      "text": "An informant identified Rafael Tafoya's house as a drug stash house. Without a warrant, police used a pole camera that could pan, tilt, and zoom to record continuously for more than three months. Its elevated angle showed a backyard enclosed by a six-foot privacy fence. Officers watched activity involving a vehicle and later stopped a truck, finding $98,000 inside a spare tire.",
      "useful": true,
      "note": "From Bronner guide — What happened"
    }
  ],
  "moore-bush": [
    {
      "id": "cf-moore-bush-1",
      "text": "ATF investigated Nia Moore-Bush for selling illegal firearms and trafficking heroin. A cooperating witness bought four guns at the house; a traffic stop recovered 921 bags of heroin. About a week later, agents installed a pole camera on a utility pole outside 120 Hadley Street, Springfield, Massachusetts. It showed the right side of the house, the attached garage, a side door, and the driveway — not the front door — and a tree partially obstructed the view much of the time. It recorded for eight months .",
      "useful": true,
      "note": "From Bronner guide — What happened"
    }
  ],
  "prize-cases": [
    {
      "id": "cf-prize-cases-1",
      "text": "After Fort Sumter, and before Congress acted, Lincoln proclaimed a blockade of Southern ports. Navy ships seized merchant vessels as prizes. The owners sued, arguing there was no war because Congress had not declared one, so the seizures were unlawful.",
      "useful": true,
      "note": "From Bronner guide — What happened"
    }
  ],
  "milligan": [
    {
      "id": "cf-milligan-1",
      "text": "Lambdin Milligan, an Indiana civilian and Confederate sympathizer, was arrested during the Civil War, tried by a military commission, and sentenced to hang for conspiring to free Confederate prisoners. Indiana was never a theater of war; its federal authority was never opposed and its courts were open and operating throughout.",
      "useful": true,
      "note": "From Bronner guide — What happened"
    }
  ],
  "costanzo": [
    {
      "id": "cf-costanzo-1",
      "text": "An Italian national was ordered deported under § 19 of the Immigration Act of 1917 for managing a house of prostitution, more than five years after entering. Section 19 was a single sentence of nearly nine hundred words, with eleven subject-clauses and five provisos. He argued the opening clause's \"within five years after entry\" carried over to his clause.",
      "useful": true,
      "note": "From Bronner guide — What happened"
    }
  ],
  "curtiss-wright": [
    {
      "id": "cf-united-states-v-curtiss-wright-export-corp-1",
      "text": "Congress passed a joint resolution authorizing the President to prohibit arms sales to countries fighting in the Chaco War if he found it would help restore peace. Roosevelt issued the proclamation. Curtiss-Wright, indicted for conspiring to sell fifteen machine guns to Bolivia, argued the resolution was an unconstitutional delegation of legislative power.",
      "useful": true,
      "note": "From Bronner guide — What happened"
    }
  ],
  "quirin": [
    {
      "id": "cf-quirin-1",
      "text": "In June 1942, eight German-trained saboteurs landed from submarines in darkness — four on Long Island, four at Ponte Vedra Beach, Florida. They carried explosives, buried their German uniforms , changed into civilian clothes, and set out to destroy American war industries. All had lived in the United States; all but one were admittedly German citizens. Herbert Haupt was a U.S. citizen. Roosevelt appointed a military commission by proclamation. They were tried; six were executed.",
      "useful": true,
      "note": "From Bronner guide — What happened"
    }
  ],
  "youngstown": [
    {
      "id": "cf-youngstown-1",
      "text": "During the Korean War, a nationwide steel strike threatened war production. Truman ordered the Secretary of Commerce to seize and operate the mills. He reported to Congress twice; Congress did nothing. Congress had considered and rejected giving presidents seizure authority when it passed the Taft-Hartley Act in 1947, and had provided three other statutory mechanisms for comparable situations, none of which Truman used.",
      "useful": true,
      "note": "From Bronner guide — What happened"
    }
  ],
  "mathews": [
    {
      "id": "cf-mathews-1",
      "text": "George Eldridge received Social Security disability benefits. A state agency reviewed his file, sent him a questionnaire, obtained reports from his physician and a psychiatric consultant, and tentatively concluded his disability had ended. He was given a summary of the evidence and an opportunity to respond in writing. Benefits were terminated. He was entitled to a full evidentiary hearing afterward , with retroactive relief if he won.",
      "useful": true,
      "note": "From Bronner guide — What happened"
    }
  ],
  "hamdi": [
    {
      "id": "cf-hamdi-1",
      "text": "Yaser Hamdi, born in Louisiana and raised in Saudi Arabia, was seized in Afghanistan by the Northern Alliance and turned over to the U.S. military, which alleged he was a Taliban fighter. He was taken to Guantanamo; when his American citizenship was discovered he was moved to a naval brig in Virginia. He was held without charge, without counsel, and without any hearing. The government's entire evidentiary submission was a short declaration from a Defense Department official — the \"Mobbs Declaration.\"",
      "useful": true,
      "note": "From Bronner guide — What happened"
    }
  ],
  "banyee": [
    {
      "id": "cf-banyee-1",
      "text": "Prolonged immigration detention and when due process requires additional procedure. Not binding on the Supreme Court, and the only source for it in your materials is how the two opinions below characterize it.",
      "useful": true,
      "note": "From Bronner guide — What happened"
    }
  ]
}

export const GUIDE_OPINIONS = {
  "katz": [
    {
      "id": "op-katz-maj",
      "kind": "majority",
      "justice": "",
      "joinedBy": "",
      "page": "",
      "summary": "A search. The government's activity violated the privacy on which Katz justifiably relied while using the booth, and it was unreasonable because no warrant was obtained.",
      "notes": "",
      "bodyHtml": "<h2>Katz v. United States</h2><p><strong>Holding.</strong> A search. The government's activity violated the privacy on which Katz justifiably relied while using the booth, and it was unreasonable because no warrant was obtained.</p><p><strong>Reasoning.</strong> The Court abandoned the requirement of physical trespass. The Fourth Amendment protects people, not places . The famous formulation is a pair: what a person knowingly exposes to the public — even in his own home or office — is not protected; but what he seeks to preserve as private , even in an area accessible to the public, may be constitutionally protected.</p><p><strong>Rule.</strong> The two-step test actually comes from Justice Harlan's concurrence , not the majority: (1) a subjective expectation of privacy, (2) one society recognizes as reasonable. Everything in Question 1 runs through it.</p><p><strong>Role in Bronner.</strong> The shared frame. Both opinions below cite it in the first paragraph of their Fourth Amendment analysis. Note the structure of Katz's win: he was visible to everyone and still prevailed, because what he protected was not his image.</p>",
      "citedCaseIds": []
    }
  ],
  "keith": [
    {
      "id": "op-keith-maj",
      "kind": "majority",
      "justice": "",
      "joinedBy": "",
      "page": "",
      "summary": "Title III's disclaimer did not grant presidential surveillance power, and the Fourth Amendment required advance judicial approval for this domestic-security wiretap.",
      "notes": "",
      "bodyHtml": "<h2>United States v. U.S. District Court (Keith)</h2><p><strong>Holding.</strong> Title III's disclaimer did not grant presidential surveillance power, and the Fourth Amendment required advance judicial approval for this domestic-security wiretap.</p><p><strong>Reasoning.</strong> Executive officers investigate and prosecute, so they cannot serve as neutral judges of when constitutionally sensitive surveillance is justified. The warrant process places that decision with a detached magistrate.</p><p><strong>Rule.</strong> A statutory disclaimer does not create presidential power. Domestic-security surveillance ordinarily requires advance approval from a neutral judge.</p><p><strong>Role in Bronner.</strong> Keith supports Bronner's argument that national-security concerns do not remove the warrant safeguard. It also links both issues because the executive asks for deference over surveillance and detention.</p>",
      "citedCaseIds": []
    }
  ],
  "ciraolo": [
    {
      "id": "op-ciraolo-maj",
      "kind": "majority",
      "justice": "",
      "joinedBy": "",
      "page": "",
      "summary": "Not a search. 5–4, Burger, C.J. (Powell, J., dissenting, joined by Brennan, Marshall, Blackmun).",
      "notes": "",
      "bodyHtml": "<h2>California v. Ciraolo</h2><p><strong>Holding.</strong> Not a search. 5–4, Burger, C.J. (Powell, J., dissenting, joined by Brennan, Marshall, Blackmun).</p><p><strong>Reasoning.</strong> The Court accepted that the yard was curtilage and that Ciraolo had a subjective expectation of privacy — the fences established it. It lost on the second prong. Being within curtilage does not itself bar all police observation. Taking measures to restrict some views does not preclude observation from a public vantage point where the officer has a right to be and from which the activity is clearly visible. Any member of the public flying in that airspace who glanced down would have seen the same thing.</p><p><strong>Rule.</strong> Lawful vantage point + naked eye + physically nonintrusive = no search, even of curtilage. It is the foundation of every \"but it was visible from the street\" argument.</p><p><strong>Role in Bronner.</strong> Cited by the majority for the public-vantage principle. Not in your table of authorities as an attached case in the original set — it is now.</p>",
      "citedCaseIds": []
    }
  ],
  "kyllo": [
    {
      "id": "op-kyllo-maj",
      "kind": "majority",
      "justice": "",
      "joinedBy": "",
      "page": "",
      "summary": "Using technology not in general public use to obtain details of a home that otherwise would require physical intrusion is a search.",
      "notes": "",
      "bodyHtml": "<h2>Kyllo v. United States</h2><p><strong>Holding.</strong> A search. Where the government uses sense-enhancing technology not in general public use to obtain information regarding the interior of the home that could not otherwise be obtained without physical intrusion , that is a search and is presumptively unreasonable without a warrant.</p><p><strong>Reasoning.</strong> Scalia's concern was that technology \"shrinks the realm of guaranteed privacy\" — it lets the government get, from outside, what previously required going in. The Amendment must at minimum preserve the degree of privacy that existed when it was adopted.</p><p><strong>Rule.</strong> Two conditions do the work: interior of the home , and not in general public use . The second is the one everyone fights about, because it means Fourth Amendment protection contracts as consumer technology spreads . That is a known and much-criticized feature of the rule, not an accident.</p><p><strong>Role in Bronner.</strong> Both opinions rely on it and read it in opposite directions. Majority: Ring cameras are in general public use and penetrated no walls. Dissent: the aggregate use of motion tracking, zoom, infrared, and persistent recording revealed information about domestic rhythms, and \"all details are intimate details\" forecloses calling that trivial.</p>",
      "citedCaseIds": []
    }
  ],
  "jones": [
    {
      "id": "op-jones-maj",
      "kind": "majority",
      "justice": "",
      "joinedBy": "",
      "page": "",
      "summary": "A search — unanimously in result, on three different theories.",
      "notes": "",
      "bodyHtml": "<h2>United States v. Jones</h2><p><strong>Holding.</strong> Installing a tracking device on a vehicle and using it to obtain information was a search.</p><p><strong>Reasoning.</strong> The government physically occupied Jones's vehicle, a protected effect, to gather information. Katz added a privacy-expectation test but did not erase the older trespass rule. Separate concurrences explained why long-term tracking may also violate a reasonable expectation of privacy.</p><p><strong>Rule.</strong> A physical intrusion on protected property to obtain information is a search. The concurrences also supply the aggregation theory that later shaped Carpenter.</p><p><strong>Role in Bronner.</strong> The cameras did not touch Bronner's property, so the majority's trespass holding is not enough for him. The concurrences explain his stronger claim that prolonged tracking can reveal a private whole from public movements.</p>",
      "citedCaseIds": []
    }
  ],
  "carpenter": [
    {
      "id": "op-carpenter-maj",
      "kind": "majority",
      "justice": "",
      "joinedBy": "",
      "page": "",
      "summary": "Accessing at least seven days of historical cell-site location information (CSLI) is a search that ordinarily requires a warrant.",
      "notes": "",
      "bodyHtml": "<h2>Carpenter v. United States</h2><p><strong>Holding.</strong> Accessing at least seven days of historical cell-site location information (CSLI) is a search that ordinarily requires a warrant.</p><p><strong>Reasoning.</strong> The location record gave the government a detailed chronicle of Carpenter's movements. A person does not surrender all Fourth Amendment protection merely by moving through public or because a wireless carrier stores the data.</p><p><strong>Rule.</strong> The government generally needs a warrant to obtain a comprehensive record of a person's movements from historical CSLI. The Court left shorter periods and other technologies unresolved.</p><p><strong>Role in Bronner.</strong> Bronner compares 93 days of searchable camera footage to Carpenter's aggregated location record. The government answers that fixed cameras observed exposed areas and did not follow Bronner everywhere.</p>",
      "citedCaseIds": []
    }
  ],
  "tuggle": [
    {
      "id": "op-tuggle-maj",
      "kind": "majority",
      "justice": "",
      "joinedBy": "",
      "page": "",
      "summary": "Not a search. \"The government's use of a technology in public use, while occupying a place it was lawfully entitled to be, to observe plainly visible happenings, did not run afoul of the Fourth Amendment.\"",
      "notes": "",
      "bodyHtml": "<h2>United States v. Tuggle</h2><p><strong>Holding.</strong> Eighteen months of pole-camera recording of areas exposed to public view was not a search.</p><p><strong>Reasoning.</strong> The Seventh Circuit concluded that the Supreme Court had not required lower courts to apply the mosaic theory, which asks whether many lawful observations become a search when aggregated. The cameras used technology available to the public from lawful vantage points, although the court expressed concern about the breadth of the surveillance.</p><p><strong>Rule.</strong> Under Tuggle, duration alone does not convert observation of plainly visible activity into a search.</p><p><strong>Role in Bronner.</strong> The majority uses Tuggle for its public-view and duration rules. Bronner stresses that Tuggle is not Supreme Court authority and that its court invited higher courts or Congress to address prolonged surveillance.</p>",
      "citedCaseIds": []
    }
  ],
  "tafoya": [
    {
      "id": "op-tafoya-maj",
      "kind": "majority",
      "justice": "",
      "joinedBy": "",
      "page": "",
      "summary": "A warrantless search in violation of the Fourth Amendment. Convictions reversed.",
      "notes": "",
      "bodyHtml": "<h2>People v. Tafoya</h2><p><strong>Holding.</strong> More than three months of warrantless pole-camera surveillance of fenced residential curtilage was a search.</p><p><strong>Reasoning.</strong> Tafoya showed a subjective expectation of privacy by enclosing the yard and closing its gate. The court considered duration, continuity, and technological capacity together and concluded that the recording exposed information ordinary passersby could not collect.</p><p><strong>Rule.</strong> Long-term, continuous surveillance can violate a reasonable expectation of privacy when it reveals activity within protected curtilage hidden from ordinary view.</p><p><strong>Role in Bronner.</strong> Tafoya supports Bronner's combined-features argument, but its fenced backyard was more private than Bronner's exposed porch, steps, driveway, and door.</p>",
      "citedCaseIds": []
    }
  ],
  "moore-bush": [
    {
      "id": "op-moore-bush-maj",
      "kind": "majority",
      "justice": "",
      "joinedBy": "",
      "page": "",
      "summary": "The en banc court affirmed on good-faith grounds and divided evenly over whether eight months of pole-camera surveillance was a search.",
      "notes": "",
      "bodyHtml": "<h2>United States v. Moore-Bush</h2><p><strong>Holding.</strong> The en banc court affirmed denial of suppression because officers relied in good faith on existing precedent. The judges divided evenly over whether the surveillance itself was a search.</p><p><strong>Reasoning.</strong> Judge Lynch treated the camera as prolonged observation of areas exposed to public view. Chief Judge Barron treated eight months of searchable footage as an aggregated record of domestic life under Carpenter's reasoning.</p><p><strong>Rule.</strong> Moore-Bush offers two competing approaches, not one controlling constitutional rule.</p><p><strong>Role in Bronner.</strong> The Fourteenth Circuit majority follows Lynch and its dissent follows Barron. The split shows why Bronner's question remains unsettled.</p>",
      "citedCaseIds": []
    }
  ],
  "prize-cases": [
    {
      "id": "op-prize-cases-maj",
      "kind": "majority",
      "justice": "",
      "joinedBy": "",
      "page": "",
      "summary": "The seizures were lawful. The President may meet an armed rebellion without waiting for Congress to \"baptize it with a name.\" A war forced upon the nation is a war whether or not declared.",
      "notes": "",
      "bodyHtml": "<h2>The Prize Cases</h2><p><strong>Holding.</strong> The seizures were lawful. The President may meet an armed rebellion without waiting for Congress to \"baptize it with a name.\" A war forced upon the nation is a war whether or not declared.</p><p><strong>Reasoning.</strong> The President has no power to initiate war, but when war is thrust upon the country he is bound to resist force by force . He does not initiate the war; he meets it, and the question of what degree of force the crisis demands is one he must decide.</p><p><strong>Rule.</strong> Inherent presidential authority to respond to an attack in progress , and the principle that a state of war can exist as a matter of fact rather than declaration.</p><p><strong>Role in Bronner.</strong> The majority uses it for the proposition that detention is an incident of war and the principle applies to modern terrorism. The dissent narrows it on two grounds: it arose from open hostilities between organized forces , and it did not involve long-term detention of residents seized far from any battlefield . The dissent's deeper point is temporal — a blockade ends when a war ends, and the \"War on Terror\" is a never-ending concept.</p>",
      "citedCaseIds": []
    }
  ],
  "milligan": [
    {
      "id": "op-milligan-maj",
      "kind": "majority",
      "justice": "",
      "joinedBy": "",
      "page": "",
      "summary": "The military commission had no jurisdiction. Milligan was entitled to release.",
      "notes": "",
      "bodyHtml": "<h2>Ex parte Milligan</h2><p><strong>Holding.</strong> A military commission lacked jurisdiction to try Milligan while Indiana's civilian courts remained open.</p><p><strong>Reasoning.</strong> The commission was not a constitutional court, and necessity could not justify replacing functioning civilian courts outside a theater of war.</p><p><strong>Rule.</strong> Military tribunals cannot replace open civilian courts for a civilian who is not part of enemy forces.</p><p><strong>Role in Bronner.</strong> Bronner appeared in an Article III court before the government moved him into military custody. The government distinguishes Milligan by classifying Bronner as supporting enemy forces, so the reliability and review of that classification matter.</p>",
      "citedCaseIds": []
    }
  ],
  "costanzo": [
    {
      "id": "op-costanzo-maj",
      "kind": "majority",
      "justice": "",
      "joinedBy": "",
      "page": "",
      "summary": "It did not. Deportation on this ground may occur at any time after entry.",
      "notes": "",
      "bodyHtml": "<h2>Costanzo v. Tillinghast</h2><p><strong>Holding.</strong> It did not. Deportation on this ground may occur at any time after entry.</p><p><strong>Reasoning.</strong> Three of the eleven following clauses had their own time references and seven had none, so the five-year limit plainly did not carry to all of them. Punctuation is not decisive of statutory construction, and \"we should not apply the rules of syntax to defeat the evident legislative intent.\" A third proviso, applying the section \"irrespective of the time of their entry,\" would have nothing to operate on under the petitioner's reading. Legislative history confirmed it.</p><p><strong>Rule.</strong> A canon of statutory construction about agency interpretations of the agency's own enabling statute, requiring a consistent and published construction over a long period. That is a narrow thing.</p><p><strong>Role in Bronner.</strong> The majority uses it for the proposition that legislative inaction can create a presumption of congressional acquiescence in executive practice, conceding that \"Costanzo involved immigration administration\" but asserting the principle \"equally applies.\"</p>",
      "citedCaseIds": []
    }
  ],
  "curtiss-wright": [
    {
      "id": "op-united-states-v-curtiss-wright-export-corp-maj",
      "kind": "majority",
      "justice": "",
      "joinedBy": "",
      "page": "",
      "summary": "The delegation was valid.",
      "notes": "",
      "bodyHtml": "<h2>United States v. Curtiss-Wright Export Corp.</h2><p><strong>Holding.</strong> The delegation was valid.</p><p><strong>Reasoning.</strong> Sutherland distinguished internal from external affairs. Powers over foreign relations did not come from the States by enumeration but passed to the national government as incidents of sovereignty . Strict non-delegation limits applicable to domestic legislation therefore do not apply the same way abroad. Along the way he described the President as the \"sole organ of the federal government in the field of international relations,\" and noted that the wisdom of requiring narrow standards is doubtful where the President's action may depend on confidential information or on effects on foreign relations.</p><p><strong>Rule.</strong> It establishes that Congress may delegate more broadly in foreign affairs . It does not establish unilateral presidential power, and you have Jackson's own words for that: he wrote in Youngstown footnote 2 that Curtiss-Wright \"involved, not the question of the President's power to act without congressional authority, but the question of his right to act under and in accord with an Act of Congress\"; that \"much of the Court's opinion is dictum\"; and that while it intimated the President might act in external affairs without congressional authority, it did \"not [intimate] that he might act contrary to an Act of Congress.\"</p><p><strong>Role in Bronner.</strong> The majority cites it for \"plenary and exclusive\" power as \"sole organ.\" Jackson's footnote is the complete answer, and it comes from a case the majority itself relies on.</p>",
      "citedCaseIds": []
    }
  ],
  "quirin": [
    {
      "id": "op-quirin-maj",
      "kind": "majority",
      "justice": "",
      "joinedBy": "",
      "page": "",
      "summary": "The military commission was lawfully constituted and the petitioners were properly triable before it.",
      "notes": "",
      "bodyHtml": "<h2>Ex parte Quirin</h2><p><strong>Holding.</strong> The German-trained saboteurs could be tried by a military commission.</p><p><strong>Reasoning.</strong> The law of war distinguishes uniformed lawful belligerents from unlawful belligerents who enter secretly in civilian dress to destroy life or property. The latter may face military trial for the conduct that makes their belligerency unlawful.</p><p><strong>Rule.</strong> Capture on United States soil and citizenship do not prevent military process for a person proven to be an unlawful enemy belligerent.</p><p><strong>Role in Bronner.</strong> The government uses Quirin to answer arguments based only on Bronner's location or near-citizenship. Bronner answers that the Quirin petitioners' enemy conduct was established, while his classification rests on evidence he has not seen.</p>",
      "citedCaseIds": []
    }
  ],
  "youngstown": [
    {
      "id": "op-youngstown-maj",
      "kind": "majority",
      "justice": "",
      "joinedBy": "",
      "page": "",
      "summary": "Unconstitutional. 6–3.",
      "notes": "",
      "bodyHtml": "<h2>Youngstown Sheet &amp; Tube Co. v. Sawyer</h2><p><strong>Holding.</strong> President Truman lacked authority to seize the steel mills.</p><p><strong>Reasoning.</strong> The seizure came from neither a statute nor the President's commander-in-chief power. Congress had supplied other responses to labor emergencies and had rejected seizure authority. Justice Jackson therefore assessed presidential power by asking what Congress had authorized, left unresolved, or opposed.</p><p><strong>Rule.</strong> Category 1 is strongest because Congress has authorized the action. Category 2 is uncertain because Congress has neither granted nor denied authority. Category 3 is weakest because the President acts against Congress's expressed or implied will.</p><p><strong>Role in Bronner.</strong> The majority puts the detention in Category 1 by reading the Authorization for Use of Military Force and later statutes together. The dissent puts it in Category 3, or at best Category 2, because Congress limited mandatory detention and never affirmatively authorized this detention of a lawful resident.</p>",
      "citedCaseIds": []
    }
  ],
  "mathews": [
    {
      "id": "op-mathews-maj",
      "kind": "majority",
      "justice": "",
      "joinedBy": "",
      "page": "",
      "summary": "An evidentiary hearing is not required before termination. The existing procedures satisfied due process.",
      "notes": "",
      "bodyHtml": "<h2>Mathews v. Eldridge</h2><p><strong>Holding.</strong> Due process did not require an evidentiary hearing before terminating Eldridge's disability benefits.</p><p><strong>Reasoning.</strong> The Court weighed Eldridge's interest, the risk of error and value of another safeguard, and the government's cost. Written medical procedures created a relatively low error risk, and a full hearing with retroactive relief remained available afterward.</p><p><strong>Rule.</strong> Due process balances the private interest, the risk of error and value of added procedure, and the government's interest and burden.</p><p><strong>Role in Bronner.</strong> Hamdi adapts this test to detention. Bronner's physical liberty and inability to see the evidence increase the first two weights; the government relies on national-security secrecy for the third.</p>",
      "citedCaseIds": []
    }
  ],
  "hamdi": [
    {
      "id": "op-hamdi-maj",
      "kind": "majority",
      "justice": "",
      "joinedBy": "",
      "page": "",
      "summary": "The Authorization for Use of Military Force (AUMF) permitted detention of a battlefield combatant, but due process required notice and a fair chance to rebut the classification.",
      "notes": "",
      "bodyHtml": "<h2>Hamdi v. Rumsfeld</h2><p><strong>Holding.</strong> The Authorization for Use of Military Force (AUMF) permitted detention of a person shown to have fought with Taliban forces. Due process still required notice of the factual basis and a fair chance to rebut the enemy-combatant classification before a neutral decisionmaker.</p><p><strong>Reasoning.</strong> Detaining battlefield combatants is a fundamental incident of using military force, but war powers are not a blank check. Applying Mathews, the plurality balanced Hamdi's physical liberty and the risk of mistaken classification against the government's wartime burdens.</p><p><strong>Rule.</strong> Statutory war authority may include detention, but a detainee must have a meaningful opportunity to contest the factual basis for that detention.</p><p><strong>Role in Bronner.</strong> The government uses Hamdi for detention authority. Bronner uses its process rule and distinguishes his arrest in the United States for alleged material support from Hamdi's capture in an active combat zone.</p>",
      "citedCaseIds": []
    }
  ],
  "banyee": [
    {
      "id": "op-banyee-maj",
      "kind": "majority",
      "justice": "",
      "joinedBy": "",
      "page": "",
      "summary": "As characterized in Bronner, prolonged immigration detention does not automatically require a new bond hearing without a stronger showing that existing procedures are inadequate.",
      "notes": "",
      "bodyHtml": "<h2>Banyee v. Garland</h2><p><strong>Holding.</strong> As characterized in Bronner, prolonged immigration detention does not automatically require a new bond hearing without a stronger showing that existing procedures are inadequate.</p><p><strong>Reasoning.</strong> Use the Bronner opinions' limited treatment because the underlying decision is not otherwise developed in these materials.</p><p><strong>Rule.</strong> Elapsed time matters to due process, but time alone does not establish which additional procedure is required.</p><p><strong>Role in Bronner.</strong> The government uses Banyee by analogy on prolonged detention. Bronner distinguishes ordinary immigration custody from military detention at Guantanamo based on sealed evidence and an untested belligerency label.</p>",
      "citedCaseIds": []
    }
  ]
}

export const GUIDE_FACTS = [
  {
    "id": "f-cameras",
    "text": "Agents mounted four Ring cameras on public utility poles and recorded for 93 straight days without a warrant.",
    "subsection": "q1",
    "side": "petitioner",
    "source": {
      "page": "5",
      "footnote": "",
      "note": "Tip → cameras; no warrant"
    },
    "argumentTags": [
      "q1-search",
      "q1-duration",
      "opening",
      "memorise"
    ],
    "memoriseLine": "93 days · four Ring cameras · no warrant"
  },
  {
    "id": "f-oath",
    "text": "United States Citizenship and Immigration Services approved Bronner's naturalization after finding good moral character. His oath was scheduled for July 4, 2025.",
    "subsection": "timeline",
    "side": "petitioner",
    "source": {
      "page": "4",
      "footnote": "1",
      "note": "Citizenship path"
    },
    "argumentTags": [
      "opening",
      "hinge",
      "memorise"
    ],
    "memoriseLine": "Good moral character found; oath scheduled for July 4, 2025"
  },
  {
    "id": "f-gtmo",
    "text": "The government transferred Bronner to Guantanamo on July 7, 2025. He remained there for twelve months without seeing the evidence against him.",
    "subsection": "timeline",
    "side": "petitioner",
    "source": {
      "page": "8",
      "footnote": "",
      "note": "Transfer to Guantanamo and sealed evidence"
    },
    "argumentTags": [
      "opening",
      "q2-youngstown",
      "memorise"
    ],
    "memoriseLine": "Transferred to Guantanamo July 7; twelve months without seeing the evidence"
  },
  {
    "id": "f-posture",
    "text": "The district court suppressed the surveillance evidence and granted habeas relief. The Fourteenth Circuit reversed 2–1, holding that the cameras were not a search and that the President acted with congressional authorization under Youngstown Category 1.",
    "subsection": "posture",
    "side": "neutral",
    "source": {
      "page": "2",
      "footnote": "",
      "note": "Who won where"
    },
    "argumentTags": [
      "opening",
      "memorise"
    ],
    "memoriseLine": "DC: Bronner · 14th Cir: Gov’t 2–1 · SCOTUS de novo"
  },
  {
    "id": "f-exterior",
    "text": "The cameras did not follow anyone after arrival or departure and did not penetrate the home's walls. The government describes the footage as enhanced observation of activity already exposed to public view.",
    "subsection": "q1",
    "side": "respondent",
    "source": {
      "page": "11",
      "footnote": "",
      "note": "Majority exterior / exposure frame"
    },
    "argumentTags": [
      "q1-search",
      "rebuttal"
    ],
    "memoriseLine": "Exterior only · no penetration · already exposed"
  },
  {
    "id": "f-stakeout",
    "text": "Majority analogized the cameras to a stakeout and concluded this was not a search.",
    "subsection": "q1",
    "side": "respondent",
    "source": {
      "page": "12",
      "footnote": "",
      "note": "Stakeout analogy"
    },
    "argumentTags": [
      "q1-search",
      "q1-duration",
      "rebuttal"
    ],
    "memoriseLine": "Similar to a stakeout · not a search"
  },
  {
    "id": "f-denolf",
    "text": "President DeNolf signed EO 15,000 and ordered Bronner’s transfer to military custody (DeNolf = the government, not a defendant).",
    "subsection": "q2",
    "side": "neutral",
    "source": {
      "page": "4",
      "footnote": "",
      "note": "Naming trap"
    },
    "argumentTags": [
      "q2-youngstown",
      "memorise"
    ],
    "memoriseLine": "DeNolf = President · EO 15,000"
  },
  {
    "id": "f-footnotes",
    "text": "Footnotes 8 and 9 remove several arguments from the case, including independent probable cause, challenges to the later warrants, speedy-trial claims, and treaty claims. The Court addresses only the two legal questions presented.",
    "subsection": "posture",
    "side": "neutral",
    "source": {
      "page": "9",
      "footnote": "8–9",
      "note": "What is not before the Court"
    },
    "argumentTags": [
      "opening",
      "rebuttal"
    ],
    "memoriseLine": "Footnotes 8–9 remove independent probable cause and other claims"
  },
  {
    "id": "f-tip",
    "text": "Anonymous tipster called the FBI; rather than seek a warrant, agents bought cameras at a hardware store.",
    "subsection": "timeline",
    "side": "petitioner",
    "source": {
      "page": "4",
      "footnote": "",
      "note": "Warrant alternative available"
    },
    "argumentTags": [
      "q1-search",
      "opening"
    ],
    "memoriseLine": "Tip → buy cameras · skip warrant"
  },
  {
    "id": "f-fruit",
    "text": "Government later got warrants from the footage; found fentanyl and sealed documents alleged to show a radiological dirty-bomb plot.",
    "subsection": "timeline",
    "side": "respondent",
    "source": {
      "page": "7",
      "footnote": "",
      "note": "Fruit of the cameras"
    },
    "argumentTags": [
      "q1-search",
      "q2-youngstown",
      "rebuttal"
    ],
    "memoriseLine": "Footage → warrants → fentanyl / dirty bomb docs"
  },
  {
    "id": "f-bond",
    "text": "Arraigned in an Article III court, pled not guilty, released on bond, then immediately re-arrested for material support.",
    "subsection": "timeline",
    "side": "petitioner",
    "source": {
      "page": "8",
      "footnote": "7",
      "note": "Milligan / Mathews error-risk fact"
    },
    "argumentTags": [
      "opening",
      "q2-youngstown",
      "memorise"
    ],
    "memoriseLine": "Arraigned · bond · immediate re-arrest"
  },
  {
    "id": "f-accused",
    "text": "Attorney General Comerford classified Bronner as having a criminal record because he had been accused of a crime. Bronner has no prior convictions.",
    "subsection": "q2",
    "side": "petitioner",
    "source": {
      "page": "8",
      "footnote": "",
      "note": "Accused ≠ criminal record"
    },
    "argumentTags": [
      "q2-youngstown",
      "opening"
    ],
    "memoriseLine": "Accused only · no convictions"
  },
  {
    "id": "f-pattern",
    "text": "Pattern-of-life footage included deliveries, services, and a masseuse twice weekly — the mosaic-theory record facts.",
    "subsection": "q1",
    "side": "petitioner",
    "source": {
      "page": "7",
      "footnote": "",
      "note": "Mosaic / pattern of life"
    },
    "argumentTags": [
      "q1-duration",
      "opening"
    ],
    "memoriseLine": "Pattern of life on R. 7"
  },
  {
    "id": "f-93-wrinkle",
    "text": "Cameras Mar 18 to warrant May 27 is 70 days, but the record states 93 three times; both opinions treat 93 as stipulated.",
    "subsection": "names",
    "side": "neutral",
    "source": {
      "page": "5",
      "footnote": "",
      "note": "Record wrinkle"
    },
    "argumentTags": [
      "rebuttal"
    ],
    "memoriseLine": "Treat 93 as stipulated"
  }
]

export const GUIDE_RECORD_TIMELINE = [
  {
    "id": "rtl-1",
    "kind": "record",
    "date": "1995",
    "label": "1995",
    "note": "Bronner, 15, and his mother flee Sommerland after her house arrest. The U.S. embassy shelters them; they enter lawfully. R. 4, 5 n.1",
    "page": "4,"
  },
  {
    "id": "rtl-2",
    "kind": "record",
    "date": "Sept 2001",
    "label": "Sept 2001",
    "note": "Congress enacts the Authorization for Use of Military Force (AUMF), permitting \"all necessary and appropriate force\" against those responsible for the September 11 attacks. It becomes the government's main statutory basis for detention. R. 2; App. I (R. 20)",
    "page": "2;"
  },
  {
    "id": "rtl-3",
    "kind": "record",
    "date": "2010",
    "label": "2010",
    "note": "Bronner obtains a green card at 30 after marrying a U.S. citizen. R. 4",
    "page": "4"
  },
  {
    "id": "rtl-4",
    "kind": "record",
    "date": "Dec 31, 2011",
    "label": "Dec 31, 2011",
    "note": "The National Defense Authorization Act for Fiscal Year 2012 (NDAA), P.L. 112-81, is signed with detention provisions in §§ 1021–1022. Earlier Senate efforts to bar indefinite detention of Americans had failed, a history the government uses as evidence of congressional acceptance. R. 2–3",
    "page": "2–3"
  },
  {
    "id": "rtl-5",
    "kind": "record",
    "date": "2023 & 2025",
    "label": "2023 & 2025",
    "note": "The Senate votes to repeal the AUMF in 2023 and again in 2025, but the House does not take up either measure. The AUMF therefore remains law, although the failed repeals do not themselves add detention authority. R. 3",
    "page": "3"
  },
  {
    "id": "rtl-6",
    "kind": "record",
    "date": "Early 2024",
    "label": "Early 2024",
    "note": "Bronner applies for naturalization. R. 4",
    "page": "4"
  },
  {
    "id": "rtl-7",
    "kind": "record",
    "date": "Early 2025",
    "label": "Early 2025",
    "note": "Congress enacts the Anti-Terrorist Act (ATA) after publicized violent crimes involving non-citizens. Its express detention rules and gaps shape whether Congress authorized Bronner's military custody. R. 3",
    "page": "3"
  },
  {
    "id": "rtl-8",
    "kind": "record",
    "date": "Feb 14, 2025",
    "label": "Feb 14, 2025",
    "note": "President DeNolf signs Executive Order 15,000, titled Protection Against Terrorism (PAT). The order directs the Attorney General to use military custody under asserted constitutional and statutory authority. R. 3–4; App. VI (R. 25)",
    "page": "3–4;"
  },
  {
    "id": "rtl-9",
    "kind": "record",
    "date": "Feb 17, 2025",
    "label": "Feb 17, 2025",
    "note": "USCIS approves Bronner's naturalization — continuous residence and good moral character . Three days after the order later used against him. R. 4",
    "page": "4"
  },
  {
    "id": "rtl-10",
    "kind": "record",
    "date": "Mar 17, 2025",
    "label": "Mar 17, 2025",
    "note": "Anonymous tip from \"Jersey\": fentanyl importing, odd-hours visitors. Identity never discovered; source of her data unknown. R. 4",
    "page": "4"
  },
  {
    "id": "rtl-11",
    "kind": "record",
    "date": "Mar 18, 2025",
    "label": "Mar 18, 2025",
    "note": "Agents Bello and Cruz install four Ring cameras on utility poles on public property. No warrant. Retention customized to 180 days . R. 4–5, 5 nn.3–4",
    "page": "4–5,"
  },
  {
    "id": "rtl-12",
    "kind": "record",
    "date": "May 4, 2025",
    "label": "May 4, 2025",
    "note": "Roper and Langbourne — foreign nationals with foreign convictions for selling military-grade arms — visit for fifteen minutes. Bronner opens the door but never steps outside. R. 7",
    "page": "7"
  },
  {
    "id": "rtl-13",
    "kind": "record",
    "date": "May 27, 2025",
    "label": "May 27, 2025",
    "note": "National Security Agency agents independently observe a warehouse meeting but do not explain why they were watching. Assistant United States Attorney DeLeon contacts Magistrate Judge Olson, who issues warrants. The parties stipulate that the government relied primarily on the pole-camera footage. R. 7",
    "page": "7"
  },
  {
    "id": "rtl-14",
    "kind": "record",
    "date": "Mar–Jun 2025",
    "label": "Mar–Jun 2025",
    "note": "93 consecutive days of 24-hour motion-activated recording. R. 5",
    "page": "5"
  },
  {
    "id": "rtl-15",
    "kind": "record",
    "date": "May 29, 2025",
    "label": "May 29, 2025",
    "note": "Searches: fentanyl patches, lollipops, spray, a sales log; four boxes of lozenges in the car. At the warehouse, no drugs — but sealed documents. Bronner booked. R. 7–8",
    "page": "7–8"
  },
  {
    "id": "rtl-16",
    "kind": "record",
    "date": "May 30, 2025",
    "label": "May 30, 2025",
    "note": "Arraigned in an Article III court. Pleads not guilty. Released on bond. Immediately re-arrested for material support of a foreign terrorist organization. R. 8, 8 n.7",
    "page": "8,"
  },
  {
    "id": "rtl-17",
    "kind": "record",
    "date": "May 31, 2025",
    "label": "May 31, 2025",
    "note": "Attorney General Comerford invokes PAT and the ATA and classifies Bronner as a \"removable non-citizen with a criminal record\" because he had been accused. He has no convictions, which matters to the risk that the executive classification is wrong. R. 8",
    "page": "8"
  },
  {
    "id": "rtl-18",
    "kind": "record",
    "date": "Jul 4, 2025",
    "label": "Jul 4, 2025",
    "note": "The scheduled oath of allegiance. It does not happen. R. 4",
    "page": "4"
  },
  {
    "id": "rtl-19",
    "kind": "record",
    "date": "Jul 7, 2025",
    "label": "Jul 7, 2025",
    "note": "Surrendered to military authorities; flown to Guantanamo; placed in a high-security compound. R. 8",
    "page": "8"
  },
  {
    "id": "rtl-20",
    "kind": "record",
    "date": "May 1, 2026",
    "label": "May 1, 2026",
    "note": "Twelve months detained, uncharged in military custody, evidence sealed. Fourteenth Circuit reverses. R. 1, 8",
    "page": "1,"
  }
]

export const GUIDE_DOCTRINE_TIMELINE = [
  {
    "id": "tl-katz",
    "kind": "doctrine",
    "year": "1967",
    "caseId": "katz",
    "issue": 1,
    "label": "Privacy, not physical trespass, determines whether government conduct is a search.",
    "note": "Katz supplies the two-part expectation-of-privacy test. Bronner argues that his exposed movements still produced a private pattern when recorded continuously for 93 days."
  },
  {
    "id": "tl-keith",
    "kind": "doctrine",
    "year": "1972",
    "caseId": "keith",
    "issue": 1,
    "label": "Domestic-security surveillance ordinarily requires advance approval from a neutral judge.",
    "note": "Keith rejects executive officers as the sole judges of surveillance necessity. Bronner uses it to answer the government's request for national-security deference."
  },
  {
    "id": "tl-ciraolo",
    "kind": "doctrine",
    "year": "1986",
    "caseId": "ciraolo",
    "issue": 1,
    "label": "Naked-eye observation from a lawful public vantage point was not a search.",
    "note": "Ciraolo supports the government because Bronner's porch, steps, and driveway were visible from nearby streets. Bronner distinguishes a brief observation from a 93-day recording."
  },
  {
    "id": "tl-kyllo",
    "kind": "doctrine",
    "year": "2001",
    "caseId": "kyllo",
    "issue": 1,
    "label": "Technology not in general public use cannot expose details of a home's interior without a warrant.",
    "note": "The government stresses that Ring cameras are common and did not penetrate walls. Bronner focuses on what motion tracking, zoom, infrared, storage, and continuous recording revealed together."
  },
  {
    "id": "tl-jones",
    "kind": "doctrine",
    "year": "2012",
    "caseId": "jones",
    "issue": 1,
    "label": "Physical installation of a tracking device was a search; concurrences addressed prolonged tracking.",
    "note": "Jones supplies the aggregation theory behind Bronner's duration argument, even though agents placed the cameras on public poles rather than his property."
  },
  {
    "id": "tl-carpenter",
    "kind": "doctrine",
    "year": "2018",
    "caseId": "carpenter",
    "issue": 1,
    "label": "Historical cell-site location information can reveal a private chronicle of public movements.",
    "note": "Bronner compares 93 days of camera footage to Carpenter's aggregated location record. The government distinguishes fixed views of exposed areas from tracking a person everywhere."
  },
  {
    "id": "tl-prize-cases",
    "kind": "doctrine",
    "year": "1863",
    "caseId": "prize-cases",
    "issue": 2,
    "label": "The President may respond to an armed attack already in progress without awaiting a declaration of war.",
    "note": "The government extends that response power to detention tied to terrorism. Bronner distinguishes open Civil War hostilities and emphasizes that his detention has no clear wartime endpoint."
  },
  {
    "id": "tl-milligan",
    "kind": "doctrine",
    "year": "1866",
    "caseId": "milligan",
    "issue": 2,
    "label": "The military commission had no jurisdiction. Milligan was entitled to release.",
    "note": "Milligan protects civilian courts when they remain open. Bronner was moved from an Article III prosecution to military custody, while the government says alleged enemy support distinguishes him."
  },
  {
    "id": "tl-costanzo",
    "kind": "doctrine",
    "year": "1932",
    "caseId": "costanzo",
    "issue": 2,
    "label": "It did not. Deportation on this ground may occur at any time after entry.",
    "note": "The majority cites Costanzo for congressional acquiescence through long, consistent executive practice. Bronner argues that a narrow immigration-construction case cannot turn legislative silence into detention authority."
  },
  {
    "id": "tl-united-states-v-curtiss-wright-export-corp",
    "kind": "doctrine",
    "year": "1936",
    "caseId": "curtiss-wright",
    "issue": 2,
    "label": "The delegation was valid.",
    "note": "The majority cites it for \"plenary and exclusive\" power as \"sole organ.\" Jackson's footnote is the complete answer, and it comes from a case the majority itself relies on."
  },
  {
    "id": "tl-quirin",
    "kind": "doctrine",
    "year": "1942",
    "caseId": "quirin",
    "issue": 2,
    "label": "Proven enemy saboteurs could face military process despite capture in the United States or citizenship.",
    "note": "Quirin helps the government on location and citizenship. Bronner distinguishes its established acts of belligerency from his classification based on sealed evidence."
  },
  {
    "id": "tl-youngstown",
    "kind": "doctrine",
    "year": "1952",
    "caseId": "youngstown",
    "issue": 2,
    "label": "Unconstitutional. 6–3.",
    "note": "Youngstown asks what Congress authorized, left unresolved, or opposed. The Bronner majority finds authorization; the dissent reads the statutory limits as opposition, or at least silence."
  },
  {
    "id": "tl-mathews",
    "kind": "doctrine",
    "year": "1976",
    "caseId": "mathews",
    "issue": 2,
    "label": "Due process balances the private interest, error risk, and government's burden.",
    "note": "Bronner's physical liberty and inability to see the evidence weigh toward more process. The government places national-security secrecy on the other side of the balance."
  },
  {
    "id": "tl-hamdi",
    "kind": "doctrine",
    "year": "2004",
    "caseId": "hamdi",
    "issue": 2,
    "label": "The Authorization for Use of Military Force permitted battlefield detention but required meaningful review.",
    "note": "The government uses Hamdi for detention authority. Bronner uses its notice-and-rebuttal rule and distinguishes capture abroad in active combat from arrest at home for alleged support."
  }
]

export const GUIDE_RECORD_MAP_HTML = "<h2>Record map</h2><p>This map uses PDF page numbers for record citations. Confirm final citations with your coach before filing.</p><ul><li><strong>R. 1</strong>: Cover, order of the Court, the two questions presented, and the AMCA attribution note.</li><li><strong>R. 2</strong>: Caption and panel; the district court rulings; jurisdiction; stipulated facts; de novo review; and the rule that unraised issues are not preserved.</li><li><strong>R. 3</strong>: Authorization for Use of Military Force (AUMF) § 2(a); the National Defense Authorization Act for Fiscal Year 2012 (NDAA) §§ 1021–1022; the failed Senate amendment; and the disputed effect of Congress's detention language.</li><li><strong>R. 4</strong>: Presidential signing statements and practice; failed AUMF repeal efforts; the Anti-Terrorist Act (ATA) detention provisions; and the statutory gap concerning lawful residents.</li><li><strong>R. 5</strong>: Protection Against Terrorism (PAT), Executive Order 15,000; Guantanamo; and Bronner's history, family, naturalization approval, good-moral-character finding, and scheduled oath.</li><li><strong>R. 6</strong>: The anonymous tip; agents' decision not to seek a warrant; camera placement and capabilities; 93 days of motion-activated recording; and the layout around Bronner's home.</li><li><strong>R. 7</strong>: Limits on interior visibility; the recorded pattern of deliveries and visitors; the May 4 visit; independent warehouse observation; and the warrants based primarily on camera footage.</li><li><strong>R. 8</strong>: Search results; sealed dirty-bomb documents; Bronner's denials; arraignment and bond release; immediate re-arrest; the Attorney General's classification; and transfer to Guantanamo.</li><li><strong>R. 9</strong>: The clinic's discovery of the detention; habeas petition; competing Article II theories; the district court ruling; stipulated jurisdiction; and the start of Fourth Amendment analysis.</li><li><strong>R. 10</strong>: Katz and Ciraolo; public camera placement; the areas viewed; limited interior activity; and the majority's conclusion that duration alone does not transform observation into a search.</li><li><strong>R. 11</strong>: No tracking after departure or wall penetration; the majority's public-exposure frame; Moore-Bush; and the majority's reasons for distinguishing Carpenter.</li><li><strong>R. 12</strong>: The government interests asserted; the stakeout analogy; the absence of physical intrusion, audio, or interior surveillance; and the conclusion that no search occurred.</li><li><strong>R. 13</strong>: The Article II question; statutory definition of an unlawful enemy belligerent; alleged material support; Prize Cases; Quirin; and Curtiss-Wright.</li><li><strong>R. 14</strong>: The majority's Youngstown Category 1 analysis; AUMF and NDAA detention provisions; Hamdi; failed efforts to bar indefinite detention; and asserted congressional acquiescence.</li><li><strong>R. 15</strong>: The majority's ATA analysis; constitutional limits on granted power; the Mathews factors; Hamdi's notice-and-rebuttal rule; and the process the majority considered available.</li><li><strong>R. 16</strong>: The dissent's Fourth Amendment analysis; Kyllo and Carpenter; the comprehensive-chronicle concern; and Tuggle's discussion of aggregated surveillance.</li><li><strong>R. 17</strong>: The dissent's combined-technology analysis; Moore-Bush and Tafoya; and why duration, continuity, and camera capacity may reveal the rhythms of a household.</li><li><strong>R. 18</strong>: Keith and neutral warrant review; the absence of emergency or exigency; the start of the dissent's Article II analysis; and Hamdi's warning that war is not a blank check.</li><li><strong>R. 19</strong>: The dissent's view that Congress deliberately withheld authority; Youngstown Category 3 or, at best, Category 2; and distinctions among Quirin, Milligan, and Hamdi.</li><li><strong>R. 20 (opinion)</strong>: Milligan and open civilian courts; Hamdi's process requirement; application of the Mathews factors; and Banyee's limited immigration-detention analogy.</li><li><strong>R. 20 (Appendix I)</strong>: AUMF preamble and § 2(a), followed by 10 U.S.C. § 948a(7)(A)–(D).</li><li><strong>R. 21</strong>: NDAA § 1021(a), (b)(1)–(2), (c)(1), (d), and (e). This appendix is the authoritative location of the existing-law clause.</li><li><strong>R. 22</strong>: NDAA § 1022(a)(1)–(2), the waiver in (a)(4), and the citizen and lawful-resident carve-outs in (b)(1)–(2). The appendix contains no § 1022(e).</li><li><strong>R. 23</strong>: ATA §§ 1–3, including purpose, definitions, territorial jurisdiction, and congressional findings.</li><li><strong>R. 24</strong>: ATA § 4, including detention authority, offshore detention for unlawfully present people, the citizen-only rule for detention inside the United States, preservation language, and effective date.</li><li><strong>R. 25</strong>: Executive Order 15,000 (PAT), including asserted authorities, the Attorney General's directive, authorized detention sites, and the instruction to act consistently with applicable law.</li></ul>"
