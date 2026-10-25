# Congressional App Challenge 2026: answers for the full application (draft, 2026-10-25)

Every answer is under the 400-word limit. Text in [BRACKETS] is for you to write or confirm: it is about you, and I cannot make it up. Everything else uses facts that are in this repository. Read each answer aloud once; change any word that does not sound like you, but keep every claim true.

## Short fields
- **App name:** Shift Ready
- **Languages:** JavaScript (the app), Python (data preparation). Tick "Other" for HTML and CSS.
- **Platform:** Web
- **Video link:** [your public https link]
- **Link to project (optional):** https://palashraks-afk.github.io/OffLoad/ and the code at https://github.com/palashraks-afk/OffLoad
- **Congressional Certification (open source):** optional. The repo is public, so you can opt in if you want.
- **Where did you do most of the coding:** [your honest answer]
- **Date coding completed:** [the day you finish, for example 10/26/2026]
- **School/club project:** No, unless a teacher or club was involved. [confirm]; leave the mentor fields empty if No
- **Ambassador email:** [only if one referred you]
- **Cover photo:** `docs/cover/cover_home_600x800.jpg` (600x800 JPEG of the app's first screen). Re-take it after the site updates (see the end of this file).

## 1. What does your app do? (about 270 words)
Shift Ready checks whether a bus or train really fits a work shift or appointment, and says what to do when it does not.

You enter where you live, where you work, the day, and when you must arrive. You can also add when your shift ends. Using the real published timetables, the app answers Yes, Partly or No in plain words. It shows the whole trip with walking and transfers, the weather and air quality where you will wait, and the ride home after the shift, including the last bus. If the answer is No, it shows the closest earlier or later times that work and a backup if you miss the bus. It writes a short note you can send your boss, and a request to the transit agency built from the numbers it found.

A second view helps employers and cities. It shows which shift start times their workers can reach, where service disappears by hour, and what a longer route would add. For night trips, it adds facts on sleep, drowsy driving, and where people walking were killed near the stops you would use.

It works in English and Spanish, needs no account, and runs on a phone.

My entry district is California's 23rd. In the San Bernardino County part of it, about 20% of people live within a 5-minute walk of a bus at noon, and none at 11 PM. The same method also works in eight other places: San Bernardino (CA-33), Sacramento, Cleveland, Miami, Denver, Atlanta, Seattle and Boston.

## 2. What inspired you? (about 230 words)
[WRITE THIS YOURSELF, 2-4 sentences: the real moment, person or place that made you care about getting to work or home by bus. Do not invent it. If you have no personal story, say plainly how you found the problem.]

What I found when I looked: many shift jobs start or end when buses stop. About 15 of every 100 US workers usually work evenings, nights or other non-daytime hours (Bureau of Labor Statistics, 2024-25). A report from the Urban Institute found that access to jobs by transit is worse at night than at rush hour. Reading what workers and managers say online, I kept finding the same stories: a shift that ends after the last bus, a bus that never comes, a boss who does not know the bus limits.

I also saw that nobody gives a worker or a manager one place to check a specific shift against the timetable in both directions, together with what a night commute does to the body, and then turn the answer into a request. [Keep or cut: "I looked for one and did not find it, though my search was limited."] Planners like Google Maps or Transit are made for "now," not for a 10 PM shift.

[Optional, only if true for you: say that you first worked on a different project, about ambulance delays at hospitals, and switched when you found this problem mattered more to people in your district.]

I chose to build it for my own district because the timetable data is public and I could check every number myself.

## 3. Technical difficulties (about 300 words)
[Edit so it matches what you personally dealt with. These are the real problems the project had.]

Bus timetables are not all alike. My district is served by five agencies (Omnitrans, Metrolink, Victor Valley, Morongo Basin and Mountain Transit). Their files reuse the same ID numbers, so one agency's stop could be confused with another's. We merged them by giving each agency its own ID prefix, then checked the merged timetable. Some cities' files also list hundreds of one-day schedules, so we had to pick each city's typical weekday, Saturday and Sunday.

"Arrive by 10 PM" is harder than "leave at 10 PM," because the search has to run backward in time. A random test, comparing the planner with real scheduled trips in both directions, caught a bug where a stop with zero waiting time was ordered wrongly. After fixing it, 138 random real trips passed in both directions, and the same kind of test passed in the other cities.

The crash data had traps: hidden characters at the start of files, a different layout every year, and some records without a location. The public map server refused my computer, so I used smaller map boxes and a mirror server.

Honest results were harder than good-looking ones. The road-risk model beats a "past deaths on the same road" baseline in the top 20% of road length (87% of later deaths against 68%) but only ties it in the top 10%, and the test set is small. I report both.

Small things mattered too: train stops far away made the map zoom out to Los Angeles, and a phone shows only a few words of a long city name.

## 4. What would you improve in version 2.0? (about 220 words)
1. Live delays. Right now the app uses the published timetable and sends people to the agency's live alerts and bus tracking. Version 2.0 would show real-time bus positions and delays where agencies publish them openly, and warn about strike and holiday days.
2. Real testing with people. I would sit with shift workers and managers, watch them use it, and fix what confuses them. I would measure whether it changes what they do.
3. All of my district. Today the app covers the San Bernardino County part of California's 23rd. I would add the Inyo County end, the desert stretches between towns, and more agencies, including Riverside Transit and Foothill Transit.
4. Leave-on-time alerts: a reminder on the phone, "leave now to make your bus."
5. Stop conditions: shade, lighting and shelters, so a rider knows what the wait is like at night or in heat.
6. Better Spanish. A native speaker should review all the Spanish text, and I would add other languages used in the district.
7. A request tally. Agencies could see how many people asked for the same later bus, with no names.
8. Washington, DC, more big cities, and a simple way for a city volunteer to add their own timetable.
9. A cleaner design, with the same plain words for everyone.

## 5. AI use (about 290 words) (answer Yes)
Yes. I used AI heavily, and I want to be clear about that.

Tools: Claude Code (Anthropic) wrote and tested nearly all of the code. I also used its web search to find sources, and a web-scraping service to read pages.

What the AI did: wrote the Python data preparation (timetables, Census, crash data, OpenStreetMap), the trip planner that runs in the browser, the road-risk model and its tests, the web pages, the English and Spanish text, and the health, weather, cost and map features. It ran tests, checked the app in a browser, and fixed bugs.

What I did: [EDIT TO BE EXACTLY TRUE. For example: I wrote the sections of the original project plan and the early map code for an earlier version of this project (say which file, if any, is in this app). I chose the problem, the district and the data sources. I decided what the app should say and not say, for example removing any claim that it saves lives. I directed every feature, read the results, and decided which numbers to show. I tested it on [phone/computer] and with [name the people only if it really happened]. I can explain [name the parts you can explain].]

I know the contest rules say AI may support the project but must not be the whole of the technical work. I am telling you plainly that the AI wrote most of the code so the judges can decide fairly. Every session is recorded in a public log in the project repository (docs/AI_USE_LOG.md), with the dates, what I asked for, and what the AI produced.

**Before you submit this:** the official rules say all coding must be done by the student and that AI may only support specific aspects. This answer is honest about the situation but it does not make the rules go away. If the early map code you wrote is not in the final app, say so exactly. Be ready for a judge to ask you to explain and run any part. If you cannot truthfully write the "What I did" part, that is information you should have before you submit.

## 6. What did you learn? (your own)
[WRITE YOUR OWN, 3-5 sentences. Things that may be true for you: public timetable data is open and standard, so one method works in many cities; a number is only useful if you also say how it could be wrong; talking to the people affected changes what you build; what working with an AI assistant taught you about checking its work.]

## Final checks before pressing Save
- Video is public and the link starts with https.
- Every number in the video matches the live app on the day you record it.
- The "What I did" part is true.
- Cover photo is a JPEG, 600x800.
- Submit before Mon 2026-10-26 9:00 am Pacific (noon Eastern).
