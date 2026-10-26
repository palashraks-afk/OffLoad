# Submission drafts (edit into your own words; keep claims true)

## Slogan
"The bus stops before the shift ends. Plan around it. Then fix it." (Plan around it = the trip check, reach and map. Fix it = the request letter, employer shift-fit and city brief.)

## One sentence (the video requires one clear sentence)
"In my district only 4% of residents live near a bus at 11 PM, compared with 55% in Cleveland and 60% in Miami, so people who work shifts and do not drive cannot get to work or home; my app checks the real schedule and writes the request for better service."

## Video script outline (1-3 minutes, public on YouTube or Vimeo)
1. **0:00 Names and app name.** [Your name(s)], Shift Ready.
2. **0:10 Why.** [Your own true story or reason. Do not invent one.]
3. **0:25 The problem in one sentence** (above). Show the headline number on the Plan screen.
4. **0:40 Who it is for.** People who work shifts or go to appointments without a car at that hour, plus teens and seniors. Employers and city staff get a second tab.
5. **0:55 Demo.** Enter a start, a job area, "Be there by 10 PM". Show Yes/Partly/No, the plan, the last bus home, the fallback times. Switch to Spanish.
6. **1:35 Map.** Move the hour slider and watch coverage vanish. Show the district outline.
7. **1:50 Employers tab.** The comparison across 3 regions, the route-extension estimate, best shift start time.
8. **2:10 How it was built.** Python and JavaScript, Leaflet, OpenStreetMap, Census, NHTSA FARS, the bus schedules; a trip planner and a walking-risk model tested on later years. Say that an AI assistant helped build it.
9. **2:30 What is next.** Add more bus agencies; a native-speaker Spanish review; share the numbers with Omnitrans.

## Answers to the usual written questions (drafts)
- **Problem and who for:** Shift workers and others who cannot drive at night or on weekends. Public data shows bus service nearly disappears: in CA-33, 37% of residents are within a 5-minute walk of a bus at noon but 4% at 11 PM and none at 1 AM (weekday, Omnitrans schedule, Census tract centers). With a 10-minute walk it is 79% at noon and 13% at 11 PM, so the night drop holds either way. Only about 1% of the district's warehouse and transport jobs are within a 5-minute walk of a bus at 11 PM (4% within 10 minutes).
- **How built:** a static site. Python prepares the data (GTFS timetables, Census ACS and LODES jobs, NHTSA fatal crash data, OpenStreetMap roads). JavaScript runs a connection-scan trip planner in the browser. A logistic-regression model scores road segments for pedestrian and cyclist risk and is tested on later years against past-deaths baselines.
- **Hardest part:** [your honest answer. Candidates: making the planner give direct trips for arrive-by searches; getting honest model results with a small test set.]
- **What you learned:** [your answer].
- **How it could grow:** more agencies and rail, real-time delays, a native-speaker review, a one-tap request tally for agencies.
- **Honest result of the model:** road features alone captured 76% of 2022-23 deaths in the top 20% of road length, versus 59% for the best past-deaths baseline (+20 points, 95% interval +11 to +28); at the top 10% it was a tie (57% vs 54%). (Re-run 2026-10-25; the earlier draft said 78% vs 58%.). The test set is small (127 deaths). The same test on Cleveland (Cuyahoga County) showed the same pattern: 66% vs 52% in the top 20% (+21 points, interval +3 to +38), a tie at the top 10%, with only 29 test deaths, so that second-region check is weak.

## AI-use disclosure paragraph (accurate draft; edit the brackets; must match docs/AI_USE_LOG.md)
"Yes. I used an AI assistant, Claude Code (Anthropic), heavily, and I want to be clear about that. I wrote the sections of the original project plan and the early map code for an earlier version of this project. The AI assistant wrote the rest of the code under my direction: the Python data preparation, the trip planner, the risk model, the web interface and the health, cost and weather cards, and it helped me research data sources and check statistics. I chose the problem and the data, decided what the app should measure and say, [tested it with: ...], and wrote this application and my video. [If the early map code is in the app, name the file.] Libraries and data: Leaflet, OpenStreetMap, Open-Meteo, Python libraries (pandas, scikit-learn, shapely, osmnx), Census ACS and LODES, NHTSA crash data, and the Omnitrans, Cleveland and Miami bus schedules."

## Rules reminder (from the official 2026 rules)
The rules require that AI use be fully disclosed, that AI may only support specific aspects and must not constitute the entirety of the technical development, that all coding be done by the student or student team, and that judges may request the source code and demonstrate it. Make sure you can explain and run every part, and be ready to answer questions about it.

## Checklist
- [ ] Student portal registered, eligibility, parent/guardian contact, 9-digit ZIP, one district only (confirm CA-33)
- [ ] App deployed at a public link; tested on a phone
- [ ] 3 testers done and logged (docs/SHIFTREADY_TESTING.md)
- [ ] Outreach sent; replies logged only if real (docs/SHIFTREADY_OUTREACH.md)
- [ ] Spanish reviewed by a native speaker (or the app says it is unreviewed)
- [ ] Video 1-3 min, public, includes names, app name, one sentence, audience, tools, working app
- [ ] AI disclosure matches AI_USE_LOG.md
- [ ] Final check of link and video before 9 AM Pacific on Mon 10/26 (noon Eastern), target Sun 10/25
