# Employers tab: critique before the redesign (2026-10-25)

Method: I used the tab as three people on the live build (default region CA-23, 375 px phone, English and Spanish), read every number against the data files, and measured layout in the browser. Findings are in the order a person would hit them. "Fix" says what the redesign does about it.

## The three people

### A. The manager (warehouse or hospital) who asks: "Which shift start times can my workers reach by bus, and what should I change?"
What they see first: a card called "Major employers, and the bus" with four identical stat tiles ("13 / 21 have a bus at 5 AM") and then a list of 21 employers.
- **The answer to their question is the fifth card.** "Which shift start times can your workers reach?" sits after About 9,000 px of scrolling on a phone (the whole tab is 15,495 px tall). Fix: it is now the first thing, with a plain-sentence answer above the fold.
- **The employer list is not about their district.** The list is the county's big employers (21), but only 4 are inside CA-23 (Esri, Loma Linda University Health, Redlands Community Hospital, Yaamava'). The lead says "21 of the county's biggest employers on the bus network" and never says which are in CA-23. Amazon in San Bernardino and Fontana warehouses (CA-33) dominate the top. For a CA-23 entry that reads as a leak from another district. Fix: employers outside CA-23 stay (people in CA-23 do work there) but are marked "outside CA-23" and listed after the CA-23 ones.
- **The fit tool offers the wrong places to pick.** It lists the county's top 30 "warehouse job areas": only 4 are in CA-23 and three of those have 17, 2 and 0 warehouse jobs (Loma Linda, Redlands, San Bernardino tracts). A hospital or university manager in CA-23 cannot select their own area, because work areas were chosen by warehouse jobs county-wide. Fix: rebuild CA-23's work areas to include the district's biggest job areas by all jobs (data change in `prep/people.py`, additive).
- **No "what should I do?"** Nothing on the page tells a manager an action. The tools describe the problem and stop. Fix: a numbers-driven checklist (move the start, vanpool, transit pass, ask the agency).
- **Jargon and unexplained bars.** The hour bars have no axis, no legend, no hour labels (24 tiny cells). "Have a bus at 5 AM" does not say "within a 5-minute walk of the front door" except in the lead, which a phone reader never reaches. "Tract centers stand in for homes" and "top 12 home tracts" are analyst words. "Neighborhoods" rows read "near Danbury Ave WB & Hinton St" (WB and EB mean westbound and eastbound, meaningless to a manager).
- **Percent misreads.** "Best start time: 6:00 AM. About 41% of workers can reach it" does not say "of the workers who live in this county and whose home we could place", nor that the share jumps around because buses meet at set times (that is in the footnote only).

### B. City or transit staff who asks: "Where does service disappear, and what would a later route add?"
- **Mixed scopes in one panel.** "Where service disappears" shows "131,014 people lose their bus by 10 PM" (district people) next to "106,344 warehouse and transport jobs have no bus at 10 PM". The jobs figure is county-wide: the data file says the district has only 6,383 warehouse and transport jobs and the county 135,414. The code filters people by `in_district` but not jobs. A reader will think 106,344 jobs are in CA-23. Fix: label scope on each number ("in the county").
- **"By city" is 5,082 px tall** and opens on 11 PM, where every row says 0% with an empty bar: 30+ near-identical rows of nothing. The hour is a 24-item dropdown. Fix: default to 10 PM, cap to the 8 largest cities with an expander, and sort by people.
- **"How this district compares" is a 9-row table that overflows on a phone** (477 px of table in a 310 px frame), header in capitals, the lead says "three regions" but there are nine, and a `◀` glyph marks the current region. Warehouse job shares are computed on a tiny base for CA-23 (6,383 jobs), which a staff member will not know. Fix: stacked rows on phones, lead corrected, a base-size note.
- **What-if excludes the part of the district where most people live.** Routes from other operators are hidden (because the cost model is Omnitrans'), so Victor Valley, Morongo Basin and Mountain Transit routes (Victorville, Hesperia, Apple Valley, the desert) cannot be tested. The page never says why. Fix: say so, and keep the cost line Omnitrans-only.
- **What-if numbers can be misread.** "29,839 more jobs near a bus" for one Yucaipa-area route running to 2 AM counts every job within a 5-minute walk of any of its stops in hours when no bus is running (hospital campuses count), not people who would ride. The wording "gain a bus" is right but the tile reads like a forecast. Fix: "jobs within a 5-minute walk of the route's stops" and "an estimate for discussion" next to the tiles, not only in a footnote.
- **The one-page brief** prints only what the page happens to hold; its subtitle says "Prepared with public data for Omnitrans and local employers" although CA-23 has five agencies; its title says "(CA-23)" with no scope (San Bernardino County part); it is not mentioned until the very bottom. Fix: promote it to a block called "Take this to your transit agency".

### C. A worker looking up their employer
- The employer list is the only place that shows "first bus 5:17 AM, last bus 6:39 PM" for a workplace, but it is a long list with no search. Finding "Redlands Community Hospital" means scrolling past 20 others.
- "Plan a trip here" sends them to the Plan tab with the destination filled: good. "Show on map" jumps to a map the worker did not ask for.
- A worker cannot tell whether the "last bus 6:39 PM" is the last bus that reaches the door or the last bus that leaves the stop. Fix: wording "Last bus within a 5-minute walk".
- Empty and error states: an employer with no bus nearby shows "No bus within a 5-minute walk. Nearest stop about N m away" which is useful; the Spanish matches.

## Cross-cutting problems
- **Layout:** four tab-wide cards of identical weight; four identical stat tiles in three places (the "stat strip" look); no hierarchy of importance. All 7 sections open at once.
- **Mobile:** radio labels are 34 px tall and the "Show on map" / "Plan a trip here" buttons 36 px (under the 44 px target). Selects use inline `style="width:auto"`. Tables scroll sideways inside their frame.
- **Spanish:** all strings exist, but "Warehouse" survives in the page text in Spanish mode and the heading "Warehouse job areas" has no "(county-wide)" in English while Spanish has it (inconsistent).
- **Scope:** no mention anywhere that CA-23 numbers are for the San Bernardino County part.
- **Accuracy of the vanpool line:** the SB Loop wording says "up to $600 a month per vanpool (5 to 15 seats, 30 or more miles round trip, at least 70% full). Call (833) 743-3742". SBCTA's article of 7 Aug 2023 confirms $600 a month for vanpools into Riverside and San Bernardino counties ($700 zero-emission) and points to RidetheLoop.com; it does not state the seat, mileage or occupancy rules or a phone number. Those details were not verified on 2026-10-25. Fix: keep what the source says, give its date, and send people to RidetheLoop.com.
- **CSV:** the file is fine (24 hours by 3 day types) but its columns say "share_of_jobs_near_a_bus" with no scope note; the button label does not say it is for the San Bernardino County part. Minor.

## What the redesign changes (see the commit)
1. One question first: "Which start times can your workers reach?" for a worksite area, with a plain answer, three typical shifts (early, day, night) and the best start time, visible on a phone without scrolling.
2. A checklist of five actions tied to the numbers shown.
3. "Take this to your transit agency": brief and request, with a line on what it contains.
4. Everything else becomes collapsible evidence with a one-sentence "what this means" and a headline figure in the summary line.
5. Scope labels, mixed-scope fix for jobs, stacked tables on phones, 44 px targets, in-district-first lists.
