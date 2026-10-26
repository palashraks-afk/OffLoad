# Deep novelty search: does anyone else do this? (2026-10-25)

Method: about 40 web searches across consumer trip planners, employer commute software, job and shift-matching apps, advocacy tools, equity dashboards, research papers, open-source code, past Congressional App Challenge winners, Reddit and news. Reddit pages cannot be opened by my tools, so for Reddit only titles and the first lines are known. One batch of searches (job-site commute filters, gig-shift apps) hit a rate limit and was not completed; those are marked "not checked".

## Closest things found
| What | Who it is for | What it does | What it does not do |
|---|---|---|---|
| **Shift** (shift-atl.com) | Employers in South Metro Atlanta | Commute program design: surveys, vanpool and shuttle setup, employer commute dashboards, "we analyze your shift patterns, employee geography, mobility barriers" | A service run by staff, not a free tool a worker opens; no per-shift bus check, no ride-home check, no request letter |
| **Late Shift Connect** (Broward County Transit) | Late-shift workers in one county | Subsidized rides for 9 pm-7 am trips | A program, not a planner; does not tell you whether the bus works |
| **TransitCenter Equity Dashboard**, **AllTransit** (CNT) | Planners, advocates, journalists | Maps of access to jobs by transit | Not worker-facing; no single trip; no health or safety context |
| **Citymapper, Moovit, Transit, Google Maps** | Everyone | Live trip planning | Not shift-aware; when transit is not running, Citymapper's FAQ says you simply get no result; no ride-home check; no request |
| **Commutrics, Luum, TravelTime, Moovit for employers** | Corporate commute managers | Commute management, analysis, on-demand shuttles | Paid business software |
| **Reddit r/RTDDenver post** (a rider scraped Indeed listings and cross-checked them against RTD schedules; the snippet says a shift ending at 10:30 PM can catch a bus home and one ending at 1:30 AM is stranded) | One city, as an analysis | Same concern, same finding | I could not read the full post, so I do not know whether a tool resulted. **Do not say nobody has thought of this.** |
| **BALTOApp / BALTO toolkit** (University of Maryland, 2023) | Baltimore riders | Record a transit journey to support advocacy | Research toolkit, not a planner; no shift focus |
| Research: Portland State thesis on non-daytime work, Urban Institute "Unequal Commute", MDPI 2026 night-shift commute study | Researchers | Show night access is worse | Papers and maps, not a tool |
| Shiftsmart, Wonolo, Instawork and similar | Gig shift workers | Match workers to shifts | No transit check found (not exhaustively checked) |
| Open-source GTFS analysis tools (GTFS City, ai4up/transit-access, Esri tools) | Analysts | Accessibility analysis | Need GIS skills; not for workers |
| Past Congressional App Challenge winners | Students | Searches of the 2025 winners pages found no transit-for-shift-workers app | Only a sample was searched |

## What this supports saying
"We looked for a free tool that lets a worker or manager check one real shift against the bus and train timetable in both directions, add health and stop-safety context, and turn the result into a request. We found the separate pieces (planners, employer programs, equity dashboards, research) but not this combination. Our search was limited." Say exactly that; do not say "nobody does this" or "first".

## Where Shift Ready is different, in one line each
1. Starts from the shift (arrive-by and the ride home), not from "now".
2. Says plainly yes, maybe or no, and what to try when no.
3. Shows the last bus and the earlier or later times that work.
4. Adds sleep, drowsy-driving and stop-safety facts for night trips.
5. Gives an employer view of which shift start times a worksite can reach.
6. Writes the message to the boss and the request to the agency from the numbers it found.
7. Free, no account, English and Spanish, works on a phone.

## Not checked (do before claiming more)
Job-site commute filters (Indeed, ZipRecruiter, LinkedIn); gig-shift apps' commute features; other student apps beyond the 2025 winners pages; any tool that resulted from the Denver post.

---
## Follow-up search, 2026-10-25 (evening): the items marked "not checked" above
Method: five web searches. What I know from each is the search results' text (titles and summaries), not the full pages, except where a link is quoted. Reddit cannot be opened, so nothing below depends on it.

### Job-site commute features: they exist, so "no commute tools exist" is false
- **LinkedIn "Your Commute"** (announced June 2018) shows an estimated drive, walk or transit time from your home to a job's office on job listings, and commute preferences can feed job recommendations. https://windowscentral.com/linkedins-your-commute-brings-transit-time-your-job-search ; https://www.engadget.com/2018-06-07-linkedin-your-commute.html . Not confirmed: whether it still exists today.
- **Google Cloud Talent Solution** (the job-search API job boards can use) has a commute filter: limit jobs to a travel time from a start point, with a method of driving, **transit**, walking, cycling or transit-accessible, and a departure hour. The documented maximum is one hour (3,600 seconds). https://docs.cloud.google.com/talent-solution/job-search/docs/search-commute . The documentation says nothing about when the last bus runs or about the ride home.
- **TravelTime** is a commute-time service for job boards that can use public transport timetables; its case study says Totaljobs (StepStone) saw a 10% rise in applications after moving from distance-based to time-based search. https://www.onrec.com/news/partnerships/totaljobs-transforms-its-online-job-search-and-conversion-rates-with-traveltime (a vendor-reported figure). Not confirmed for Indeed or ZipRecruiter: I found no page describing a commute filter there.
- What these have in common: one direction (home to workplace), one departure time chosen by the user, a time cap of about an hour, and no statement of service hours. None of the pages I saw describes checking the ride home after a shift ends.

### Gig and shift-matching apps
- Wonolo, Instawork, Veryable, Shiftsmart, WorkWhile and Indeed Flex were compared in vendor-written pages. Nothing I read says any of them matches shifts by commute time or transit access. They describe matching by location, past performance and availability. I did not read their help centres, so this is "not found", not "does not exist". https://www.wonolo.com/blog/best-platforms-find-hourly-workers

### Rider apps
- **Transit** lets you set "custom commute hours" (days and hours) so service alerts are limited to the times you ride, with night-shift workers named as users; the default commute hours are 7-9 am and 4-7 pm. This filters alerts, not trips or jobs. https://transitapp.com/whatsnew/custom-hours ; https://help.transitapp.com/article/96-get-notifications-about-disruptions-on-your-line

### Other student apps (Congressional App Challenge)
- The winners I found are school-bus trackers (SafeRoute, Texas 15th, 2024; SmartBus, Wisconsin 6th, 2023; earlier school-bus trackers) and **IslaGo** (Northern Mariana Islands, 2025), a Saipan app with live bus locations and schedules aimed at tourists and new users, with workers mentioned as one use. None checks a work shift. https://www.congressionalappchallenge.us/25-MP00/ ; https://www.congressionalappchallenge.us/23-WI06/ ; https://congressionalappchallenge.us/?p=9914 . This is one search plus snippets, not a review of every winner.

### After the Denver RTD Reddit post
- A search for tools that match job shift hours to bus schedules in 2026 returned only adjacent items (Transit's alert hours, hourly-shift job apps, an old 1979 El Segundo demonstration where buses were scheduled around staggered shift hours: https://trid.trb.org/View/161833). I found no tool that resulted from the Denver post.

### What this does to the novelty claim
- **Not safe to say:** "no commute tools exist", "first", "nobody has done this."
- **Safe to say:** "Job sites and job-search APIs can show a one-way commute time at one departure time. We looked for a free tool that starts from the end of a shift, checks the ride home and the last bus, shows what a night commute does to the body, gives managers the start times their workers can reach, and drafts the request, and we did not find one. Our search was limited." The 1979 El Segundo demonstration shows that matching bus service to shift hours is an old idea in transit planning, which is a reason to describe this app's contribution as making the check available to a worker and a manager, not as inventing the concept.
