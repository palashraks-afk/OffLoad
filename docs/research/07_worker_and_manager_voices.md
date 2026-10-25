# What riders and employers say they need (search done 2026-10-25)

Method: web search for forum threads and articles from bus riders who commute to shifts and from warehouse and operations managers. Reddit blocks automated page reads, so for Reddit only thread titles and the search snippets were available; nothing below quotes a comment I could not see. Treat this as a light scan, not a survey.

What came up, and what the app does about it

| What people say | Source seen | In the app |
|---|---|---|
| Buses run late or never show; workers ask whether to leave extra early or whether the employer will excuse it | Reddit r/SouthBend "Taking the bus to work?" (snippet); r/germany "First bus didn't come" (snippet) | Plan shows the last workable bus, alternatives earlier and later, and a "check before you leave" row linking Omnitrans live alerts and bus tracking |
| Tracker "ghost buses": the app shows a bus that never arrives, so people wait in the cold and are late | ABC7 Chicago I-Team, 2023; Stateline, 2023 | The app says plainly it uses the published timetable and cannot see delays; it points to the agency's live tools instead of faking real-time |
| Night-shift workers ask whether buses even run at their hours | Reddit r/medlabprofessionals "Night Shift and Buses?" (snippet) | "Arrive by" and "last bus home" checks; coverage-by-hour view |
| Shifts do not line up with transit and every worker's commute differs | Reddit r/Workers_And_Resources (snippet, game forum, weak evidence) | Employer view: which shift start times a worksite's workers can reach |
| Transit agencies and employers are told to design late-night service from real demand | TransitMatters, "Late Night Mitigation" | "Write a request" message built from the checked numbers |

Not done: real-time vehicle positions or live delay data. The Omnitrans alert API (Simplify) requires an access token that is not public, so the app links to the official pages rather than using someone else's token.

Time-sensitive pieces and how they stay current
- Weather and air quality: fetched when a result is shown, for the bus stop where the rider waits and the hour of the bus.
- Timetable: the app shows when its timetable ends and warns when it is within 21 days of ending or past its end date.
- A weekly GitHub Action (`.github/workflows/check-schedule.yml`, script `shiftready/prep/check_feed.py`) compares Omnitrans' published feed version with the one in the app and opens an issue if a newer one exists. It does not change the live data; a person rebuilds and reviews.

## Second pass: forum titles and snippets (2026-10-25)
Reddit pages could not be opened, so these are only the titles and the first lines the search showed. They show what people talk about, not how common it is.

| What people say (snippet) | Thread | Added to the app |
|---|---|---|
| "The issue is scheduling shifts at hours when public transportation doesn't run" | r/AmazonFC, "Amazon isn't responsible for getting you to and from work" | Employer view: which shift times workers can reach |
| "Have you ever accepted a job only to find out on day one that the shift schedule didn't align with the bus schedule?" | r/RTDDenver, post about scraping job listings (Denver) | Quick pick of real employers so you can check a job before saying yes. This also shows someone else is working on the same idea in Denver, so do not claim nobody has thought of it |
| "Be honest. Call the store and ask to speak to the store manager. Explain you can get to work but..." | r/asda "What to do if my shift timing is clashing with my bus timing?" | New "Message my boss" button: a short factual note from the plan |
| "The best earlier bus stops at 2:05" (a manager asking how to treat a worker who is 5-15 minutes late) | r/humanresources thread | Same button; the note states which bus the worker can actually catch |
| "I work at UVMMC, my shift ends at 11pm. I can't ride the bus home." | r/burlington | Last-bus-home check |
| "work earlier shifts so you don't have to close and risk missing the last bus" | r/Serverlife | Earlier/later alternatives |
| "i KEEP missing my bus after work because it shows up early" | r/britishproblems | Tip to be at the stop 5 minutes ahead |
| Omnitrans: "They are either late, super early, or don't even show up"; "Get the Transit app... keep an eye on bus locations" | r/InlandEmpire | Live alerts and tracking links; the app says it cannot see delays |
| "Getting to work w/o a car in the Inland Empire": Uber "eats up half of my paycheck", bus "doesn't stop close enough" | r/InlandEmpire | Cost card; walking distance in the verdict |

## Looks hand-made, not template (self-grade, 2026-10-25)
Criteria from the earlier research on "vibe-coded" tells. Grade 1-5, 5 = clearly designed by a person for this job.
| Check | Grade | Evidence |
|---|---|---|
| One typeface, one accent color | 4 | Public Sans, a single teal; red/amber/green only for yes/maybe/no |
| Icons: no emoji | 4 | Emoji replaced with inline SVG; a few text symbols remain in badges |
| Content is specific, not generic | 4 | Real stop names, route colors, real employers, real numbers |
| Real empty/error states | 3.5 | Present for results and offline; not every screen checked |
| Layout varies by purpose (not one repeated card) | 3 | Timeline for the trip is distinctive; many other blocks are the same rounded card |
| Stat-tile strip | 2.5 | Four equal tiles at the top of the plan card is a common template look |
| Hero | 3.5 | A single local statistic, but still a dark banner with a big orange number |
| Copy sounds like a person | 3.5 | Plain, short; some sentences are still generic |
Overall about 3.5 of 5. Fixing the stat strip and the repeated cards would be the next steps.
