# 18. Novelty re-check (2026-10-25)

Question: is there a free tool a worker can use to check one specific shift against the real timetable in both directions, with health and stop-safety context, an employer view, and a drafted request? Findings below add to docs/research/10.

## New since the first search
- **Commute-time features on job sites exist.**
  - LinkedIn's "See your commute" module (mobile) shows travel time to a listing by walking, driving or public transit; CareerBuilder's mobile app adds a commute limit by mode; the UK site Totaljobs offers a commute-time filter using the TravelTime API (all via search summary).
  - **Google Cloud Talent Solution**, the developer service behind such filters, has a commute filter with `departureTime` (an hour 0-23 in the start location's time zone) and `commuteMethod` of DRIVING or TRANSIT. Read: https://docs.cloud.google.com/talent-solution/job-search/v3/docs/search-commute. The page says nothing about last service or arrival-by times.
  - I could not confirm whether Indeed, ZipRecruiter or Glassdoor have a comparable feature.
- **What this means:** "how long is the commute at a chosen hour" exists on some job sites. What I did not find is a check built around the end of a shift (is there a last bus home?), arrive-by timing, the ride home, or the request letter. Do not claim "no commute tools exist".
- **Employer commute programs** (for example Shift in South Metro Atlanta) are staffed services. Software such as Commutrics, Luum and Moovit's employer products are paid corporate tools (earlier search).
- **Late-shift ride subsidies** (Broward Late Shift Connect) address the gap with money, not information.
- **The Denver post** (Reddit r/RTDDenver, title and first lines only; the post cannot be opened by my tools) describes cross-referencing job ads against RTD schedules and says a shift ending at 10:30 PM can catch the bus home but one ending at 1:30 AM cannot. That shows others reached the same idea; I could not tell whether a public tool resulted.
- **Student apps:** searches of the Congressional App Challenge winners pages for 2025 found no transit-for-shift-workers app. Only a sample was checked.
- **Open-source GTFS tools** (GTFS City, ai4up/transit-access, Esri public transit tools) analyze access but are built for analysts.
- **Not checked:** other states' student app challenges; app store listings for "shift commute" apps; gig-shift apps' transit features beyond the first search.

## What the entry can honestly say
"We found commute-time features on some job sites and employer programs elsewhere, but not a free tool that starts from the end of a shift, checks the ride home, adds health and stop-safety context and drafts the request. Our search was limited."
