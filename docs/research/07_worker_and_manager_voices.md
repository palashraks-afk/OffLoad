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
