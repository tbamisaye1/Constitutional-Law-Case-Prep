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
    "rule": "",
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
    "rule": "",
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
    "holding": "A search. Accessing at least seven days of historical CSLI requires a warrant. The Court expressly declined to decide whether a shorter period would.",
    "rule": "",
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
    "rule": "",
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
    "rule": "",
    "usePetitioner": "The only pole-camera decision favoring suppression among the cases cited. But Tafoya's facts are meaningfully better than Bronner's : the camera saw a fenced backyard invisible from the street, and the Colorado court repeatedly grounds its analysis in curtilage. Bronner's cameras captured a porch, steps, driveway, and door all visible from nearby streets. Anyone relying on Tafoya has to rely on it",
    "useRespondent": "",
    "suggestedFile": "People v. Tafoya.pdf",
    "guideFacts": "An informant told Colorado Springs police that Rafael Tafoya's house was a drug stash house. Police mounted a camera on a utility pole across the street — no warrant — that could pan, tilt, and zoom on command while officers watched live, and recorded continuously for over three months , with footage stored indefinitely . Because of its elevated angle it recorded a backyard enclosed by a six-foot wooden privacy fence with a gate. Officers watched Tafoya let a car through the gate, close it, and crouch at the front-left tire; men later carried a spare tire from the garage to a truck. Police stopped the truck and found $98,000 in the tire.",
    "guideReasoning": "Prong one was easy: the area was curtilage, set back from the street, and fenced with a gate he closed. Subjective expectation established.",
    "guideUse": "The only pole-camera decision favoring suppression among the cases cited. But Tafoya's facts are meaningfully better than Bronner's : the camera saw a fenced backyard invisible from the street, and the Colorado court repeatedly grounds its analysis in curtilage. Bronner's cameras captured a porch, steps, driveway, and door all visible from nearby streets. Anyone relying on Tafoya has to rely on its reasoning rather than its outcome — which is a real move, since duration/continuity/nature does not logically require a fence, but it is a move, not a given."
  },
  {
    "id": "moore-bush",
    "name": "United States v. Moore-Bush",
    "cite": "36 F.4th 320 (1st Cir. 2022) (en banc)",
    "year": "",
    "issue": 1,
    "tag": "split",
    "usefulness": "core",
    "holding": "",
    "rule": "",
    "usePetitioner": "The majority below cites Lynch; the dissent cites Barron. It is the clearest available evidence that the question is unsettled — a full federal appellate court, on nearly these facts, divided evenly on the constitutional question while agreeing on the outcome.",
    "useRespondent": "The majority below cites Lynch; the dissent cites Barron. It is the clearest available evidence that the question is unsettled — a full federal appellate court, on nearly these facts, divided evenly on the constitutional question while agreeing on the outcome.",
    "suggestedFile": "United States v. Moore-Bush.pdf",
    "guideFacts": "ATF investigated Nia Moore-Bush for selling illegal firearms and trafficking heroin. A cooperating witness bought four guns at the house; a traffic stop recovered 921 bags of heroin. About a week later, agents installed a pole camera on a utility pole outside 120 Hadley Street, Springfield, Massachusetts. It showed the right side of the house, the attached garage, a side door, and the driveway — not the front door — and a tree partially obstructed the view much of the time. It recorded for eight months .",
    "guideReasoning": "",
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
    "usePetitioner": "The majority uses it for the proposition that detention is an incident of war and the principle applies to modern terrorism. The dissent narrows it on two grounds: it arose from open hostilities between organized forces , and it did not involve long-term detention of residents seized far from any battlefield . The dissent's deeper point is temporal — a blockade ends when a war ends, and the \"War o",
    "useRespondent": "The majority uses it for the proposition that detention is an incident of war and the principle applies to modern terrorism. The dissent narrows it on two grounds: it arose from open hostilities between organized forces , and it did not involve long-term detention of residents seized far from any battlefield . The dissent's deeper point is temporal — a blockade ends when a war ends, and the \"War o",
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
    "rule": "",
    "usePetitioner": "Structurally Bronner's best case: a civilian, where courts are open, pulled into military process. The majority distinguishes it on a single ground — Milligan was not part of or supporting enemy forces . Everything on Question 2 turns on whether that distinction holds, which turns on whether the belligerency label has been tested by anyone.",
    "useRespondent": "",
    "suggestedFile": "Ex parte Milligan.pdf",
    "guideFacts": "Lambdin Milligan, an Indiana civilian and Confederate sympathizer, was arrested during the Civil War, tried by a military commission, and sentenced to hang for conspiring to free Confederate prisoners. Indiana was never a theater of war; its federal authority was never opposed and its courts were open and operating throughout.",
    "guideReasoning": "1. The commission wasn't a court. It was not \"ordained and established by Congress,\" and its members were not judges appointed during good behavior.",
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
    "rule": "It establishes that Congress may delegate more broadly in foreign affairs . It does not establish unilateral presidential power, and you have Jackson's own words for that: he wrote in Youngstown footnote 2 that Curtiss-Wright \"involved, not the question of the President's power to act without congressional authority, but the question of his right to act under and in accord with an Act of Congress\"; that \"much of the Court's opinion is dictum\"; and that while it intimated the President might act ",
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
    "rule": "",
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
    "guideReasoning": "",
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
    "rule": "",
    "usePetitioner": "Both opinions apply it, via Hamdi . Everything depends on factor one — Hamdi says freedom from physical restraint is \"the most elemental of liberty interests\" — and on whether the government's asserted burden (disclosure would compromise national security) is treated as an ordinary administrative cost or as something categorically different.",
    "useRespondent": "",
    "suggestedFile": "Mathews v. Eldridge.pdf",
    "guideFacts": "George Eldridge received Social Security disability benefits. A state agency reviewed his file, sent him a questionnaire, obtained reports from his physician and a psychiatric consultant, and tentatively concluded his disability had ended. He was given a summary of the evidence and an opportunity to respond in writing. Benefits were terminated. He was entitled to a full evidentiary hearing afterward , with retroactive relief if he won.",
    "guideReasoning": "",
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
    "holding": "On authority: the AUMF authorized his detention. Detention of enemy combatants for the duration of the relevant conflict is a \"fundamental incident of waging war\" and therefore falls within \"necessary and appropriate force.\"",
    "rule": "",
    "usePetitioner": "The template for the likely outcome and the case both sides need. Note the two structural distinctions the government presses: Hamdi was a citizen , and he was captured in an active combat zone . Bronner is neither.",
    "useRespondent": "",
    "suggestedFile": "Hamdi v. Rumsfeld.pdf",
    "guideFacts": "Yaser Hamdi, born in Louisiana and raised in Saudi Arabia, was seized in Afghanistan by the Northern Alliance and turned over to the U.S. military, which alleged he was a Taliban fighter. He was taken to Guantanamo; when his American citizenship was discovered he was moved to a naval brig in Virginia. He was held without charge, without counsel, and without any hearing. The government's entire evidentiary submission was a short declaration from a Defense Department official — the \"Mobbs Declaration.\"",
    "guideReasoning": "",
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
    "holding": "",
    "rule": "",
    "usePetitioner": "",
    "useRespondent": "",
    "suggestedFile": "Banyee v. Garland.pdf",
    "guideFacts": "Prolonged immigration detention and when due process requires additional procedure. Not binding on the Supreme Court, and the only source for it in your materials is how the two opinions below characterize it.",
    "guideReasoning": "",
    "guideUse": ""
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
      "text": "An informant told Colorado Springs police that Rafael Tafoya's house was a drug stash house. Police mounted a camera on a utility pole across the street — no warrant — that could pan, tilt, and zoom on command while officers watched live, and recorded continuously for over three months , with footage stored indefinitely . Because of its elevated angle it recorded a backyard enclosed by a six-foot wooden privacy fence with a gate. Officers watched Tafoya let a car through the gate, close it, and crouch at the front-left tire; men later carried a spare tire from the garage to a truck. Police sto",
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
      "summary": "Two holdings. (1) Title III § 2511(3), which said nothing in the Act limits the President's power to protect against overthrow, is merely a disclaimer of congressional intent — not a grant of authority. (2) The Fourth Am",
      "notes": "",
      "bodyHtml": "<h2>United States v. U.S. District Court (Keith)</h2><p><strong>Holding.</strong> Two holdings. (1) Title III § 2511(3), which said nothing in the Act limits the President's power to protect against overthrow, is merely a disclaimer of congressional intent — not a grant of authority. (2) The Fourth Amendment requires prior judicial approval for domestic security surveillance of this type.</p><p><strong>Reasoning.</strong> The Court's core move is institutional, not factual: \"The Fourth Amendment does not contemplate the executive officers of Government as neutral and disinterested magistrates.\" Their duty is to enforce, investigate, and prosecute — so they should not be the sole judges of when to use constitutionally sensitive means. The historical judgment the Amendment accepts is that unreviewed executive discretion \"may yield too readily to pressures to obtain incriminating evidence.\"</p><p><strong>Rule.</strong> </p><p><strong>Role in Bronner.</strong> The dissent's warrant argument, and the closest thing in the case file to a bridge between the two questions : the deference the government asks for on Article II is the deference Keith refused on the Fourth Amendment.</p>",
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
      "summary": "A search. Where the government uses sense-enhancing technology not in general public use to obtain information regarding the interior of the home that could not otherwise be obtained without physical intrusion , that is ",
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
      "bodyHtml": "<h2>United States v. Jones</h2><p><strong>Holding.</strong> A search — unanimously in result, on three different theories.</p><p><strong>Reasoning.</strong> Decided on old ground. The government physically occupied private property — an \"effect\" — for the purpose of obtaining information. That would have been a search in 1791. Katz's expectation test was added to , not substituted for, the trespass test. The Court expressly declined to reach whether Jones had a reasonable expectation of privacy.</p><p><strong>Rule.</strong> </p><p><strong>Role in Bronner.</strong> Not cited in the Fourteenth Circuit's opinions, but it is the source of nearly everything in them. If you want to understand why \"duration\" became a Fourth Amendment argument at all, this is where it starts.</p>",
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
      "summary": "A search. Accessing at least seven days of historical CSLI requires a warrant. The Court expressly declined to decide whether a shorter period would.",
      "notes": "",
      "bodyHtml": "<h2>Carpenter v. United States</h2><p><strong>Holding.</strong> A search. Accessing at least seven days of historical CSLI requires a warrant. The Court expressly declined to decide whether a shorter period would.</p><p><strong>Reasoning.</strong> Two threads converge. From the Jones concurrences: individuals have a reasonable expectation of privacy in the whole of their physical movements , and the government's ability to compile a comprehensive chronicle of a life is the harm. From the third-party doctrine cases: a person does not surrender all Fourth Amendment protection by venturing into the public sphere .</p><p><strong>Rule.</strong> </p><p><strong>Role in Bronner.</strong> The center of gravity for Question 1. The majority reads it as a case about a specialized device and enormous scale; the dissent reads it as a case about aggregation whose logic doesn't care what hardware produced the record.</p>",
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
      "bodyHtml": "<h2>United States v. Tuggle</h2><p><strong>Holding.</strong> Not a search. \"The government's use of a technology in public use, while occupying a place it was lawfully entitled to be, to observe plainly visible happenings, did not run afoul of the Fourth Amendment.\"</p><p><strong>Reasoning.</strong> 1. The mosaic theory isn't binding. The court traces it from Maynard (D.C. Cir. 2010) through the Jones concurrences to Carpenter, notes that scholars say Carpenter \"effectively endorsed\" it, and then holds that the Supreme Court \"has not yet required lower courts to apply it.\" Several courts have rejected it as unworkable because constitutionality would hinge on duration.</p><p><strong>Rule.</strong> </p><p><strong>Role in Bronner.</strong> The majority's authority for \"duration alone does not transform.\" Understand what that citation is doing: it is a circuit court applying a theory it declined to adopt, reaching a result it said it disliked, and inviting Congress or the Supreme Court to fix it.</p>",
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
      "bodyHtml": "<h2>People v. Tafoya</h2><p><strong>Holding.</strong> A warrantless search in violation of the Fourth Amendment. Convictions reversed.</p><p><strong>Reasoning.</strong> Prong one was easy: the area was curtilage, set back from the street, and fenced with a gate he closed. Subjective expectation established.</p><p><strong>Rule.</strong> </p><p><strong>Role in Bronner.</strong> The only pole-camera decision favoring suppression among the cases cited. But Tafoya's facts are meaningfully better than Bronner's : the camera saw a fenced backyard invisible from the street, and the Colorado court repeatedly grounds its analysis in curtilage. Bronner's cameras captured a porch, steps, driveway, and door all visible from nearby streets. Anyone relying on Tafoya has to rely on its reasoning rather than its outcome — which is a real move, since duration/continuity/nature does not logically require a fence, but it is a move, not a given.</p>",
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
      "summary": "",
      "notes": "",
      "bodyHtml": "<h2>United States v. Moore-Bush</h2><p><strong>Holding.</strong> </p><p><strong>Reasoning.</strong> </p><p><strong>Rule.</strong> </p><p><strong>Role in Bronner.</strong> The majority below cites Lynch; the dissent cites Barron. It is the clearest available evidence that the question is unsettled — a full federal appellate court, on nearly these facts, divided evenly on the constitutional question while agreeing on the outcome.</p>",
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
      "bodyHtml": "<h2>Ex parte Milligan</h2><p><strong>Holding.</strong> The military commission had no jurisdiction. Milligan was entitled to release.</p><p><strong>Reasoning.</strong> 1. The commission wasn't a court. It was not \"ordained and established by Congress,\" and its members were not judges appointed during good behavior.</p><p><strong>Rule.</strong> </p><p><strong>Role in Bronner.</strong> Structurally Bronner's best case: a civilian, where courts are open, pulled into military process. The majority distinguishes it on a single ground — Milligan was not part of or supporting enemy forces . Everything on Question 2 turns on whether that distinction holds, which turns on whether the belligerency label has been tested by anyone.</p>",
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
      "bodyHtml": "<h2>Ex parte Quirin</h2><p><strong>Holding.</strong> The military commission was lawfully constituted and the petitioners were properly triable before it.</p><p><strong>Reasoning.</strong> The law of war distinguishes lawful from unlawful belligerents. Lawful belligerents — uniformed forces — may be captured and held as prisoners of war. Unlawful belligerents — those who pass secretly through the lines in civilian dress to wage war by destruction of life or property — are additionally subject to trial and punishment by military tribunals for acts that render their belligerency unlawful.</p><p><strong>Rule.</strong> </p><p><strong>Role in Bronner.</strong> The government's strongest case, because it defeats two intuitive arguments at once: arrest on U.S. soil doesn't matter, and citizenship doesn't matter.</p>",
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
      "bodyHtml": "<h2>Youngstown Sheet & Tube Co. v. Sawyer</h2><p><strong>Holding.</strong> Unconstitutional. 6–3.</p><p><strong>Reasoning.</strong> </p><p><strong>Rule.</strong> The organizing framework for every subsequent separation-of-powers dispute, and the specific principle that where Congress has legislated in a field and declined to confer the power the executive claims, courts scrutinize that claim with caution.</p><p><strong>Role in Bronner.</strong> The battlefield. The majority places the President in Category 1; the dissent says Category 3, \"at best\" Category 2. The majority also cites it for the proposition — which nobody disputes — that no granted power may be exercised in a way that deprives individuals of constitutional rights.</p>",
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
      "bodyHtml": "<h2>Mathews v. Eldridge</h2><p><strong>Holding.</strong> An evidentiary hearing is not required before termination. The existing procedures satisfied due process.</p><p><strong>Reasoning.</strong> </p><p><strong>Rule.</strong> </p><p><strong>Role in Bronner.</strong> Both opinions apply it, via Hamdi . Everything depends on factor one — Hamdi says freedom from physical restraint is \"the most elemental of liberty interests\" — and on whether the government's asserted burden (disclosure would compromise national security) is treated as an ordinary administrative cost or as something categorically different.</p>",
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
      "summary": "On authority: the AUMF authorized his detention. Detention of enemy combatants for the duration of the relevant conflict is a \"fundamental incident of waging war\" and therefore falls within \"necessary and appropriate for",
      "notes": "",
      "bodyHtml": "<h2>Hamdi v. Rumsfeld</h2><p><strong>Holding.</strong> On authority: the AUMF authorized his detention. Detention of enemy combatants for the duration of the relevant conflict is a \"fundamental incident of waging war\" and therefore falls within \"necessary and appropriate force.\"</p><p><strong>Reasoning.</strong> </p><p><strong>Rule.</strong> </p><p><strong>Role in Bronner.</strong> The template for the likely outcome and the case both sides need. Note the two structural distinctions the government presses: Hamdi was a citizen , and he was captured in an active combat zone . Bronner is neither.</p>",
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
      "summary": "",
      "notes": "",
      "bodyHtml": "<h2>Banyee v. Garland</h2><p><strong>Holding.</strong> </p><p><strong>Reasoning.</strong> </p><p><strong>Rule.</strong> </p><p><strong>Role in Bronner.</strong> </p>",
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
    "text": "Naturalization approved with good-moral-character finding; oath scheduled for July 4, 2025.",
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
    "memoriseLine": "GMC found · oath July 4, 2025"
  },
  {
    "id": "f-gtmo",
    "text": "Transferred to Guantanamo on July 7, 2025; twelve months without seeing the evidence against him.",
    "subsection": "timeline",
    "side": "petitioner",
    "source": {
      "page": "8",
      "footnote": "",
      "note": "GTMO transfer + secrecy"
    },
    "argumentTags": [
      "opening",
      "q2-youngstown",
      "memorise"
    ],
    "memoriseLine": "GTMO July 7 · 12 months · no evidence shown"
  },
  {
    "id": "f-posture",
    "text": "District court suppressed and granted habeas; Fourteenth Circuit reversed 2–1 (not a search; Youngstown Category 1).",
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
    "text": "Cameras did not surveil after entry/departure; no wall penetration; government framed feed as enhanced observation of already-exposed activity.",
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
    "text": "Footnotes wall off independent PC, warrant-challenge, speedy trial, treaties: only the legal questions presented.",
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
    "memoriseLine": "fn 8–9: off-limits attacks"
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
    "text": "AG classified Bronner as having a criminal record because he had been accused; he has no prior convictions.",
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
    "note": "AUMF enacted — \"all necessary and appropriate force\" against those behind 9/11. R. 2; App. I (R. 20)",
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
    "note": "NDAA FY2012 (P.L. 112-81) signed, §§ 1021–1022. Senate efforts to bar indefinite detention of Americans had already failed. R. 2–3",
    "page": "2–3"
  },
  {
    "id": "rtl-5",
    "kind": "record",
    "date": "2023 & 2025",
    "label": "2023 & 2025",
    "note": "The Senate votes to repeal the AUMF. The House never takes it up. The AUMF stands. R. 3",
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
    "note": "Congress enacts the Anti-Terrorist Act after publicized violent crimes involving non-citizens. R. 3",
    "page": "3"
  },
  {
    "id": "rtl-8",
    "kind": "record",
    "date": "Feb 14, 2025",
    "label": "Feb 14, 2025",
    "note": "President DeNolf signs Executive Order 15,000 (\"PAT\") . R. 3–4; App. VI (R. 25)",
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
    "note": "NSA agents independently observe a warehouse meeting and decline to explain why they were watching. AUSA DeLeon wakes Magistrate Judge Olson; warrants issue. Parties stipulate the government relied primarily on the pole-camera footage . R. 7",
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
    "note": "AG Comerford invokes PAT and ATA, classifying Bronner a \"removable non-citizen with a criminal record\" because he had been \"accused.\" He has no convictions. R. 8",
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
    "label": "A search. The government's activity violated the privacy on which Katz justifiab",
    "note": "The shared frame. Both opinions below cite it in the first paragraph of their Fourth Amendment analysis. Note the structure of Katz's win: he was visible to everyone and still prevailed, because what "
  },
  {
    "id": "tl-keith",
    "kind": "doctrine",
    "year": "1972",
    "caseId": "keith",
    "issue": 1,
    "label": "Two holdings. (1) Title III § 2511(3), which said nothing in the Act limits the ",
    "note": "The dissent's warrant argument, and the closest thing in the case file to a bridge between the two questions : the deference the government asks for on Article II is the deference Keith refused on the"
  },
  {
    "id": "tl-ciraolo",
    "kind": "doctrine",
    "year": "1986",
    "caseId": "ciraolo",
    "issue": 1,
    "label": "Not a search. 5–4, Burger, C.J. (Powell, J., dissenting, joined by Brennan, Mars",
    "note": "Cited by the majority for the public-vantage principle. Not in your table of authorities as an attached case in the original set — it is now."
  },
  {
    "id": "tl-kyllo",
    "kind": "doctrine",
    "year": "2001",
    "caseId": "kyllo",
    "issue": 1,
    "label": "A search. Where the government uses sense-enhancing technology not in general pu",
    "note": "Both opinions rely on it and read it in opposite directions. Majority: Ring cameras are in general public use and penetrated no walls. Dissent: the aggregate use of motion tracking, zoom, infrared, an"
  },
  {
    "id": "tl-jones",
    "kind": "doctrine",
    "year": "2012",
    "caseId": "jones",
    "issue": 1,
    "label": "A search — unanimously in result, on three different theories.",
    "note": "Not cited in the Fourteenth Circuit's opinions, but it is the source of nearly everything in them. If you want to understand why \"duration\" became a Fourth Amendment argument at all, this is where it "
  },
  {
    "id": "tl-carpenter",
    "kind": "doctrine",
    "year": "2018",
    "caseId": "carpenter",
    "issue": 1,
    "label": "A search. Accessing at least seven days of historical CSLI requires a warrant. T",
    "note": "The center of gravity for Question 1. The majority reads it as a case about a specialized device and enormous scale; the dissent reads it as a case about aggregation whose logic doesn't care what hard"
  },
  {
    "id": "tl-prize-cases",
    "kind": "doctrine",
    "year": "1863",
    "caseId": "prize-cases",
    "issue": 2,
    "label": "The seizures were lawful. The President may meet an armed rebellion without wait",
    "note": "The majority uses it for the proposition that detention is an incident of war and the principle applies to modern terrorism. The dissent narrows it on two grounds: it arose from open hostilities betwe"
  },
  {
    "id": "tl-milligan",
    "kind": "doctrine",
    "year": "1866",
    "caseId": "milligan",
    "issue": 2,
    "label": "The military commission had no jurisdiction. Milligan was entitled to release.",
    "note": "Structurally Bronner's best case: a civilian, where courts are open, pulled into military process. The majority distinguishes it on a single ground — Milligan was not part of or supporting enemy force"
  },
  {
    "id": "tl-costanzo",
    "kind": "doctrine",
    "year": "1932",
    "caseId": "costanzo",
    "issue": 2,
    "label": "It did not. Deportation on this ground may occur at any time after entry.",
    "note": "The majority uses it for the proposition that legislative inaction can create a presumption of congressional acquiescence in executive practice, conceding that \"Costanzo involved immigration administr"
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
    "label": "The military commission was lawfully constituted and the petitioners were proper",
    "note": "The government's strongest case, because it defeats two intuitive arguments at once: arrest on U.S. soil doesn't matter, and citizenship doesn't matter."
  },
  {
    "id": "tl-youngstown",
    "kind": "doctrine",
    "year": "1952",
    "caseId": "youngstown",
    "issue": 2,
    "label": "Unconstitutional. 6–3.",
    "note": "The battlefield. The majority places the President in Category 1; the dissent says Category 3, \"at best\" Category 2. The majority also cites it for the proposition — which nobody disputes — that no gr"
  },
  {
    "id": "tl-mathews",
    "kind": "doctrine",
    "year": "1976",
    "caseId": "mathews",
    "issue": 2,
    "label": "An evidentiary hearing is not required before termination. The existing procedur",
    "note": "Both opinions apply it, via Hamdi . Everything depends on factor one — Hamdi says freedom from physical restraint is \"the most elemental of liberty interests\" — and on whether the government's asserte"
  },
  {
    "id": "tl-hamdi",
    "kind": "doctrine",
    "year": "2004",
    "caseId": "hamdi",
    "issue": 2,
    "label": "On authority: the AUMF authorized his detention. Detention of enemy combatants f",
    "note": "The template for the likely outcome and the case both sides need. Note the two structural distinctions the government presses: Hamdi was a citizen , and he was captured in an active combat zone . Bron"
  }
]

export const GUIDE_RECORD_MAP_HTML = "<h2>Record map</h2><p>Guide uses PDF page numbers for R. cites. Confirm with coach before filing.</p><ul><li><strong>R. 1</strong> (printed —): Cover. Order of the Court; the two questions presented; AMCA attribution note</li><li><strong>R. 2</strong> (printed 1): Caption and panel; Barnhart writes, Sotelo concurs, Cassady/Cassidy dissents; the two claims; district court's holdings; jurisdiction (28 U.S.C. §§ 1331, 1343(3), 1291); facts stipulated, no material disputes, all issues legal and reviewed de novo, unraised issues not preserved ;</li><li><strong>R. 3</strong> (printed 2): § II.A. AUMF § 2(a) text; NDAA enacted, signed Dec. 31, 2011; § 1022 \"shall hold\" and the waiver; statute did not expressly forbid indefinite detention; § 1022(b)(1)–(2) text; failed Senate amendment; § 1021(d); the \"existing law\" clause (attributed here to § 1022(e)); unprivileg</li><li><strong>R. 4</strong> (printed 3): Obama signing statement; prior presidents including G.W. Bush; House Judiciary resolution not taken up; Senate AUMF repeal votes 2023 and 2025 ; § II.B ATA — § 4(a), § 4(b), § 4(b)(2); the gap for lawful residents; no time limit, no dangerousness finding, no counsel, no judicial </li><li><strong>R. 5</strong> (printed 4): The signing-ceremony quote (\"beyond any specific law or statutory framework\"); Guantanamo named; § II.D Bronner — age, entry at 15, Knerr, since 1995, green card 2010, business, taxes, two citizen children; naturalization approved Feb. 17, 2025, good moral character; oath set for</li><li><strong>R. 6</strong> (printed 5): Camera capabilities — auto-record of entries/exits, remote pan, 10x optical zoom, infrared night vision, time-stamped and stored; no warrant sought or obtained ; 93 consecutive days, 24 hours a day, motion-activated; pier house elevated ~4 ft; slat fence obscured most of the prop</li><li><strong>R. 7</strong> (printed 6): Zoom could not see interior items or identify occupants; blinds open → lights and movement near windows visible; the pattern-of-life list (pizza, Sparklets Tuesdays, Blue Apron Thursdays, Chewy, Omaha Steaks, Costco, Geek Squad, HVAC, masseuse twice weekly , Girl Scout cookies); </li><li><strong>R. 8</strong> (printed 7): § II.F. Search results — fentanyl patches, lollipops, spray, sales log; four boxes of lozenges in the car; warehouse: no drugs but sealed dirty-bomb documents Bronner has never reviewed ; his denials; May 29 booking; May 30 arraignment, not-guilty plea, release on bond, immediate</li><li><strong>R. 9</strong> (printed 8): § II.G. The clinic (Prof. Ayanna Grunwald) learns of the detention through a redacted filing; petition filed; the Article II theory; the two issues as framed by each side; Judge Fair rules for Bronner and stays; jurisdiction stipulated ; § III Fourth Amendment analysis opens with</li><li><strong>R. 10</strong> (printed 9): § III.A. Katz two-part inquiry; Ciraolo; cameras on public property; only the driveway, front steps, and porch surveilled; general interior activity only; blinds; \"duration alone does not transform\" citing Tuggle at 526; § III.B first impression; circuits uniformly contrary to on</li><li><strong>R. 11</strong> (printed 10): Cameras did not surveil after entry or departure; no wall penetration; \"enhanced observation of already-exposed activity\"; Moore-Bush at 361 (Lynch, J.); Carpenter distinguished — 93 days from fixed points vs. ~13,000 location points, targeted at an existing person of interest, c</li><li><strong>R. 12</strong> (printed 11): Government interests of the highest order; drug trafficking and domestic terror; four stationary cameras; \"similar to a stakeout\" ; no physical intrusion, no audio capture, no interior surveillance; conclusion that this was not a search; district court erred</li><li><strong>R. 13</strong> (printed 12): § IV Article II analysis; question framed; § IV.A — 10 U.S.C. § 948(a)(7); Bronner's conduct as material support; Prize Cases , 67 U.S. at 669 (\"baptize it with a name\"); Quirin , 317 U.S. at 37–38 (citizenship does not relieve an unlawful belligerent); § IV.B — Curtiss-Wright , </li><li><strong>R. 14</strong> (printed 13): Placement in Youngstown's first category; AUMF; NDAA § 1021(b)(2) covered-person definition and § 1021(c)(1) ; Youngstown , 343 U.S. at 635–38 (the three categories); Hamdi reading the AUMF to include detention; congressional refusal to bar indefinite detention; Costanzo , 287 U.</li><li><strong>R. 15</strong> (printed 14): The ATA \"further illuminates\"; ATA's broad grants + silence on lawful residents + preservation clauses → first category; § IV.C — no power may deprive constitutional rights; Mathews , 424 U.S. 319 (the three factors); Hamdi's notice-and-rebuttal requirement; habeas available and </li><li><strong>R. 16</strong> (printed 15): Dissent opens (Judge Cassidy). Kyllo's \"firm line at the entrance\"; three criticisms of the majority; the Police lyric; § I.A — Carpenter , 585 U.S. 296, \"comprehensive chronicle\" at 300; the dissent's own record cite, \"R. at 7\" ; Tuggle at 517–525 (courts and scholars embracing </li><li><strong>R. 17</strong> (printed 16): § I.B — Kyllo applied too narrowly; commonplace technology can still reveal domestic life; the four features in combination; \"rhythms of the household\" ; Moore-Bush (Barron, C.J.); Kyllo at 34 (\"shrinks the realm of guaranteed privacy\"); Tafoya, 494 P.3d at 620 (duration, continu</li><li><strong>R. 18</strong> (printed 17): Warrant requirement as the mechanism of neutral review, citing Keith , 407 U.S. 297; \"blueprint\" for evading review; no emergency or exigency; the failure to seek a warrant \"is fatal\"; Kyllo at 36–38; § II Article II analysis; Hamdi, 542 U.S. at 535 (\"not a blank check\"), extende</li><li><strong>R. 19</strong> (printed 18): Congress \"deliberately declined\"; legislative inaction is not an affirmative grant; Youngstown at 637–38 (scrutinize \"with caution\"); § 1022 + ATA § 4(b)(2) → third category, lowest ebb; § II.B — Quirin as saboteurs in a declared war , Milligan distinguished by Quirin, Hamdi tied</li><li><strong>R. 20</strong> (printed 18 (cont.)): Milligan on military jurisdiction where courts are open; Hamdi's process requirement; Mathews's three factors applied — liberty at Guantanamo after 12 months, error risk shown by the arraignment and bond release, sensitivity not demonstrated to preclude a neutral tribunal; Banyee</li><li><strong>R. 20</strong> (printed 19): Appendix I — AUMF preamble and § 2(a). Appendix II — 10 U.S.C. § 948(a)(7)(A)–(D)</li><li><strong>R. 21</strong> (printed 20): Appendix III — NDAA § 1021(a), (b)(1)–(2), (c)(1), (d), (e) . This is the authoritative location of the \"existing law\" clause</li><li><strong>R. 22</strong> (printed 21): Appendix IV — NDAA § 1022(a)(1)–(2), (a)(4) waiver, (b)(1)–(2) citizen and lawful-resident carve-outs. Note: there is no § 1022(e) in the appendix</li><li><strong>R. 23</strong> (printed 22): Appendix V begins — ATA §§ 1–3: purpose, definitions (unlawfully present, terrorism, territorial jurisdiction), findings</li><li><strong>R. 24</strong> (printed 23): ATA § 4 — (a) detention of persons present, (b)(1) offshore detention of the unlawfully present on presidential finding, (b)(2) citizens inside only, (c) neither limits nor expands, (d) effective date</li><li><strong>R. 25</strong> (printed 24): Appendix VI — EO 15,000: the recitals and asserted authorities, § 1 the AG's directive, § 2 Guantanamo and other sites, § 3 \"consistent with applicable law\"</li></ul>"
