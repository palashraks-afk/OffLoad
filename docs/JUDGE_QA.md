# Judge questions and honest answers (30)

How to use this: read each answer aloud until it sounds like you. Change words, not facts. Every number comes from this repository (sources named). If a judge asks something not here, say what you know, say what you do not, and never guess. The two hardest honesty rules:
1. **Do not say you wrote code that you did not write.** The accurate statement is in `docs/HANDOFF.md` and `docs/AI_USE_LOG.md`: you had the original plan and original code for the original mapping-and-matching idea before AI was used, used AI to polish it and for background research, and those original files are now lost. The code in this app was written by an AI assistant (Claude Code) under your direction.
2. **Do not say "nobody has done this."** Say "we didn't find a free tool that does all of it" (see `docs/research/10_novelty_deep_search.md` and `20_...`).

Numbers refer to the default region, the San Bernardino County part of California's 23rd District, as built on 2026-10-25.

---

## The idea

**1. What does your app do, in one sentence?**
It checks whether a real shift or appointment fits the bus and train timetable, in both directions (getting there and getting home), and when it does not, shows what would work and drafts the request to fix it.

**2. Why did you pick this problem?**
[Your own reason, one or two true sentences.] The facts I found when I looked: about 15 of every 100 US workers usually work evenings, nights or other non-daytime hours (Bureau of Labor Statistics, 2024-25), and in my district about 20% of people live within a five-minute walk of a bus at noon but none do at 11 PM (`reach.json`, weekday).

**3. Who is it for?**
Workers who do not drive and have shifts or appointments, the managers who schedule them, and city or transit staff who decide service. It works in English and Spanish, needs no account, and runs on a phone.

**4. How is this different from Google Maps or the Transit app?**
Those answer "how do I get there now?" This starts from the shift: it checks being there on time and the ride home after the shift ends, shows the last bus, gives the verdict in plain words, adds night-trip health and stop-safety facts, shows employers which start times their workers can reach, and writes the note to a boss and the request to the agency. We found separate pieces elsewhere (planners, employer commute programs, equity dashboards, job-site commute filters) but did not find all of it in one free tool. Our search was limited.

**5. Is this original?**
The combination is. Pieces exist elsewhere and we say so on the About page and in `docs/research/10_novelty_deep_search.md`. A Reddit user in Denver cross-checked job ads against bus schedules, which shows the problem is real and others have noticed it.

## Who wrote what (the hard ones)

**6. Did you write this code?**
Honest answer: "I had the original plan and wrote the original code for the mapping-and-matching idea before I used AI, and I used AI to polish it and to do background research; those first files are lost. The code in this app was written by an AI assistant, Claude Code, under my direction. I decided the problem, the district, what to measure and what to claim, I read and tested what it produced, and I can explain how it works." Then show the walkthrough (`docs/CODE_WALKTHROUGH.md`) and the log (`docs/AI_USE_LOG.md`). Say exactly which parts you can explain; do not say more.

**7. What did the AI do, and what did you do?**
AI: wrote the Python data pipeline, the trip planner, the road-risk model and its tests, the web pages, the English and Spanish text, the health, weather, cost and map features, fixed bugs, and ran searches for sources. You: [fill in only what is true: chose the problem and district, decided what the app should say and not say (for example, no claim that it saves lives), directed each feature, tested it, corrected the AI, decided which numbers to show, wrote the original plan and original code (lost)]. Everything is dated in `docs/AI_USE_LOG.md` in the public repository.

**8. The rules say AI cannot be the whole technical work. Is it?**
"I am not going to hide that the AI wrote most of the code. I used it openly and logged every session so the judges can decide. My contribution is the idea, the direction, the decisions about what is true and what to claim, and the original work I did before AI; I can explain the planner step by step." Do not argue that the rules do not apply. Let them decide.

**9. Can you show me the code and run it?**
Yes. It is public at github.com/palashraks-afk/OffLoad. Open `shiftready/web/js/planner.js` (251 lines) and walk through "sort all bus hops by time and scan once"; show `tests/planner.test.js`; run `node shiftready/tests/planner.test.js`.

**10. Is there AI inside the app?**
No generative AI runs in the app. The planner is a fixed algorithm. The "model" is an ordinary machine-learning classifier (logistic regression or boosted trees, whichever scored better in training) that scores road segments, trained once and shipped as a data file. An AI assistant helped build the project; it is not running when someone uses it.

## Data and accuracy

**11. Where does the data come from?**
Agency timetables (Omnitrans, Metrolink, Victor Valley, Morongo Basin, Mountain Transit), Census jobs (LODES), Census household data (ACS), federal crash data (NHTSA FARS 2019-2023), OpenStreetMap roads, the state health facility list, Open-Meteo for weather and air quality. The About page links to every one.

**12. How do you know the numbers are right?**
We check them two independent ways where possible. The coverage table is calculated in Python and again by the JavaScript planner; they agree on 720 of 720 spot checks (`tests/crosscheck.test.js`). The planner is checked against hundreds of random real scheduled trips, both directions (138 passed in the main test run; `tests/planner.test.js`). The crash counts are checked against a fresh NHTSA download (`tests/test_data.py`). Anything we could not verify, we dropped (for example a $3,600 absence-cost figure we could not trace).

**13. What is the headline statistic and how is it computed?**
In the San Bernardino County part of CA-23, about 20% of people live within a five-minute walk (400 m) of a stop with a departure at noon, and none at 11 PM (1.8% at 10 PM). A tract counts as served if its center is within 400 m of a stop with a departure that hour; the last stop of each trip does not count because nobody can board there (`prep/people.py`). A tract center stands in for where people live, which is an approximation the app states.

**14. What happens if the bus is late or doesn't come?**
The app cannot see delays; it uses the published timetable and says so on every result. It shows the next bus ("if you miss it"), the earlier and later times that work, tells people to be at the stop 5 minutes early, and links the agency's live alerts and tracking. A live data feed needs a private access token from the agency; that is on the "next version" list.

**15. Why trust the road-risk model?**
We fixed the design before looking at results: train on 2019-2021 deaths, test on 2022-2023 deaths it never saw, compare with simple baselines such as "past deaths on the same road." For CA-23 (132 test deaths) it captured 86% of later deaths in the top 20% of road length versus 65% for the best baseline; at the top 10% it only tied. We also tested it on a district it never saw: trained on CA-23 it did clearly better than the baseline at the top 20% in CA-33, but trained on CA-33 it lost at the top 10% in CA-23, and it did not transfer from Cleveland. We also tried a second, differently built model against a rule written before we ran it; it did not meet the rule, so we kept the first. The test sets are small, so these are estimates, and the About page shows all of it, including the parts that are not flattering.

**16. Is that really machine learning, and is it useful?**
Yes: supervised classification on road features, validated on held-out years and a second district. It is a modest model. It is used only to highlight higher-risk road corridors on the map; it never tells a person where to go and makes no prediction about any individual.

**17. How accurate is the walking time?**
It is an estimate: straight-line distance times 1.3 at 80 meters per minute, because the browser has no street network. That is stated in the code (`planner.js` lines 3-4, 10-11) and on the About page. For short walks it is close; it can be wrong around barriers.

**18. Why did you use those cutoffs for Yes, Partly and No?**
They are simple, adjustable choices written in one place (`ui-plan.js` lines 9-11): at least 10 minutes to spare, no more than 1,200 m of walking, no more than 90 minutes door to door, fewer than three boardings, and a ride home when you ask for one. The reasons that triggered a "Partly" are always shown, so a person can disagree.

## Design and technical choices

**19. Why a website and not a phone app?**
One code base runs on every phone and computer, installs from the browser, works offline after the first visit (a service worker stores the files), needs no store approval, and is free to host (GitHub Pages).

**20. Why do all the planning in the browser?**
Privacy and cost. No server means no account, no stored trips and no bill. The timetable for a region is one JSON file (about 2 MB for CA-23) and the search runs in milliseconds.

**21. Explain the trip-planning algorithm.**
Every hop of every bus between two neighboring stops is a "connection." The planner sorts all connections by departure time and scans them once. For each stop it remembers the earliest time you can be there; for each bus trip it remembers whether you have boarded yet. Walking between nearby stops is allowed. "Arrive by 10 PM" is the same scan on a time-reversed copy of the timetable (`planner.js` lines 66-93, 97-132, 166-211).

**22. What was the hardest technical problem?**
[Pick what is true for you.] Real problems from the project log: merging five agencies whose timetable files reuse the same IDs; running the search backwards for "arrive by"; a bug where stops with zero waiting time were processed in the wrong order, found by a random test; crash-data files with hidden characters and different layouts each year; public map servers that refused the computer; and keeping every number tied to a source.

## Impact and limits

**23. Who has actually used it?**
[Answer truthfully, with names and dates only if real.] If you have not tested it with people yet, say so: "Not yet. The next step is testing with workers and managers; here is the test plan." Do not invent testers. The plan is in `docs/VIDEO_SCRIPT.md` ("Three people test").

**24. How would you measure that it helps?**
Number of people who can complete a shift check without help; whether managers change a start time or schedule a vanpool; whether agencies respond to the requests. Today there is no measured outcome, and I would not claim one.

**25. What are the limits?**
No live delays; walking times are estimates; Spanish has not been reviewed by a native speaker; the app covers the San Bernardino County part of CA-23 only (not the Inyo County end); the Victor Valley timetable runs only to 2026-11-28, so the desert part needs a refresh; fares are priced only for Omnitrans (the app says so); employer answers are per job area, not per employer; the new cities have no road-risk layers.

**26. Does it just tell people the bus is bad?**
No. It says what works, what does not, and what to try: an earlier or later time, the backup bus, a vanpool, a note to the boss, a request to the agency with the numbers. The employer tab ends with concrete actions, each tied to a number the tab shows.

## Ethics and privacy

**27. What about privacy?**
No accounts and no analytics. Everything is computed on the device. The app contacts only OpenStreetMap's address search (when someone types a street address), Open-Meteo for weather and air quality (with a location rounded to about 1 km), and map picture servers; the page's security policy allows nothing else (`index.html` line 7). Saved trips, language and theme are stored only in the browser on that device.

**28. Isn't it sensitive to show where pedestrians were killed?**
The app shows counts near bus stops from public federal records (FARS), labeled as past deaths, with the limits stated. It never ranks neighborhoods as "bad," never names people, and does not claim the app prevents crashes or saves lives.

**29. Are the health facts medical advice?**
No, and the app says so. Each fact has a source and its limits on the About page: for example, 44.0% of night-shift workers sleep six hours or less versus 28.8% of day workers (CDC, 2010 survey); a small track study of 16 drivers found near-crashes after night work (PNAS, 2016). They are information, not diagnosis.

## What's next

**30. What would you do with another year?**
Live delays where agencies publish them; real testing with workers, managers and the transit agency; the Inyo County end and more agencies (Riverside Transit, Foothill); a native-speaker Spanish review; stop shade and lighting; leave-on-time alerts; and sending the numbers to Omnitrans, Victor Valley and SBCTA to see whether they change a schedule.

---

## The 5 hardest, in one line each
1. *Did you write this code?* "I had the original plan and wrote the original code for the mapping-and-matching idea before AI (those files are lost); this app's code was written by an AI assistant under my direction, and I can explain it."
2. *What did the AI do and what did you do?* "It wrote the code and ran searches; I chose the problem and the claims, directed and tested every feature, and decided what the app may and may not say."
3. *The rules say AI cannot be the entirety. Is it?* "It wrote most of the code and I say so openly; I made every decision about what to build and claim, and I can explain how the planner works."
4. *How do you know the numbers are right?* "Two independent calculations agree on 720 of 720 checks, the planner matches real scheduled trips, and the crash counts match a fresh federal download."
5. *What happens if the bus is late?* "The app can't see delays; it shows the backup bus, tells you to be early, and links the live alerts. Live data is next."
