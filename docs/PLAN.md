# Full plan and app breakdown (working title: "Shift Ready")

> **Update 2026-10-18 (built):** the app in `shiftready/` is built and running (plan tab, map, employers tab, About, English/Spanish, 3 regions, offline support). See `shiftready/README.md`. The scores below are still estimates; the days in section 8 are no longer the plan. What is left is outside work only the student can do: confirm district and eligibility, test with 3 people, send the outreach, get the Spanish reviewed, record the video, write the answers, submit (`docs/SHIFTREADY_*.md`).

Status: original proposal. Scores are estimates, not results. Written 2026-10-18.
Deadline: Mon 2026-10-26 12:00 pm Eastern = **9:00 am Pacific**. Submit Sun 2026-10-25.

## 1. The problem, user, and one sentence
**One sentence (video):** "In my district only about 1 in 25 people live near a bus at 11 pm and none at 1 am, so people who work shifts and don't drive can't reliably get to work, and my app gives them a working plan and a ready-to-send request for better service."
**Primary user:** a shift worker without a car at that hour (warehouse, hospital, retail, security, care work). **Also:** teens, seniors, patients getting to appointments, one-car families.
**Secondary user:** employers/staffing agencies (shift-time fit) and Omnitrans/city staff (gap brief).

## 2. Evidence so far (computed by us; reproduce before quoting)
Source: Omnitrans GTFS (valid Aug 2026 to Jan 2027), Census ACS tracts, 152 tracts with centers inside CA-33, 759,809 people. Approximations: tract centers stand in for homes; 400 m straight-line walk; Omnitrans only.
- Residents near a stop with a weekday departure: 36.9% at 6 am, 37.4% at noon, 36.2% at 8 pm, 19.6% at 10 pm, 4.2% at 11 pm, 0.0% at 1 am, 17.4% at 4 am, 33.6% at 5 am.
- Saturday: 34.8% at noon, 15.7% at 8 pm, 2.0% at 10 pm.
- Households with no vehicle: 10,139 of 220,108 (4.6%). Commuters who take the bus: 3,997 of 341,284 (1.2%). **So "no car" is a minority; the honest story is evening/weekend coverage.**
- Omnitrans: 3,442 trips; 2% end after 10 pm; 1.2% start before 5 am.
- FARS 2019-2023: CA-33 had 218 pedestrian/cyclist deaths (192 / 26); 21 California deaths lack coordinates. 88% of CA-33 deaths in the dark (from earlier research, recompute).
- Outside context (secondary): warehouse injury rate about 5.5 per 100 workers in 2021 (DOL OIG); union-coalition analysis of OSHA data found 6.6 serious injuries per 100 Amazon workers vs 3.2 at other warehouses in 2022 (Amazon disputes the framing).
- AB 701: covers employers with 100+ workers at one warehouse distribution center or 1,000+ statewide; written quota descriptions required; quotas cannot block meal/rest/bathroom use. **Quote the statute (leginfo.legislature.ca.gov), not summaries.**

## 3. How the app works (screens)
1. **Home:** two big choices: "Plan my trip" and "What's missing near me". Language toggle (English / Spanish). 911 not needed (not an emergency app).
2. **Plan my trip (3 steps):** where from (address, ZIP, or "use my location"), where to (job/clinic/school address or pick from a list), when (day + start time or shift). 
3. **Result card:**
   - Answer in one line: Yes / Partly / No.
   - The plan: leave-by time, buses, transfers, walking legs with distances, total time, fare.
   - Last bus home and a backup if missed.
   - Walk-risk note for the stop-to-door legs ("2 night pedestrian deaths within 300 m, 2019-2023").
   - If No: three fallbacks (nearest reachable alternative shift, vanpool/carpool candidates, the request message).
   - Save as image / print.
4. **What-if (city/employer view):** choose a route and a later end time; see residents and jobs newly reachable. Choose an employer address; see the start times that bring the most workers within reach.
5. **Request writer:** prefilled, editable message to Omnitrans / city council / employer HR citing the user's own numbers; copy or open in the user's email. Nothing is sent by the app.
6. **City brief (printable one page):** ranked service gaps (by residents and jobs affected), method, limits.
7. **Methods and limits page:** every number with source and year; what the app cannot say.

## 4. Features: build order
**MVP (must ship):** plan generator (1), result card with last-bus and walk-risk, reach-by-hour map, Spanish, mobile UI, methods page, request writer.
**Next:** what-if route extension, employer shift-fit report, city brief.
**Stretch:** vanpool finder (needs LODES origin-destination data, not yet checked), bike-to-bus leg, cost comparison, employer injury lookup (OSHA data must be downloaded by hand: the OSHA server blocks scripts), second/third region.
**Not building:** live bus tracking, hazard-report server, anything that says a place is "safe", alarms, medical advice.

## 5. Technical design (static site, no server)
- **Data prep (Python, offline):** GTFS to trimmed JSON (stops, trips, stop_times compressed); tract/people layer; FARS deaths near stops; risk scores; LODES jobs by block.
- **Planner in the browser (JavaScript):** a connection-scan search over the timetable (162,327 stop-time rows is small enough). Walking uses straight-line distance x 1.3, capped at 800 m; say so. 
- **Address lookup:** bundled ZIP/city centers; street addresses via OpenStreetMap Nominatim from the visitor's browser (disclose on Methods).
- **Map:** Leaflet with the CA-33 boundary, stop layer, hour slider that shades coverage, death layer with filters.
- **Hosting:** GitHub Pages; works offline after first load.
- **Tests:** pytest for data prep (known trips, boundary counts), a handful of JS checks for the planner on known Omnitrans trips.

## 6. ML and systems plan (non-circular, honest)
- **Systems:** the transit network as a graph; reachability and the route-extension simulation are the systems work.
- **Model A (night walking risk near stops):** unit = road segments near stops (OpenStreetMap). Label = a pedestrian/cyclist death at night in the test years. Features = road class, lanes, speed limit, signals, crossings, stop presence, land use. **Train 2019-2021, test 2022-2023**, against baselines (past deaths on the same road; past deaths in the same 400 m cell). Report top-k capture and PR-AUC. Earlier backtest: top 10% of 400 m cells captured only 3.0% of later deaths in San Bernardino County. If the model does not beat the baseline, say so on screen.
- **Model B (optional):** employer injury-rate tier next year from OSHA establishment data, time split, baseline "same as last year". Likely hard to beat; report either way.
- **Clustering (vanpool finder):** group home areas by shared workplace. Not "ML" for the score unless validated.
- **Second region:** rerun Model A and the reach-by-hour on another county/city (FARS and GTFS are national).

## 7. Category scores (estimates) and what raises each
| Category | Floor | Ceiling | What gets the ceiling | Depends on |
|---|---|---|---|---|
| District | 4 | 5 | Analysis inside CA-33, named routes/cities, brief a city can act on | Us |
| Impact | 4 | 5 | A reply or pilot from Omnitrans / a city / employer | Outsiders |
| Novel | 3-4 | 5 | A finding nobody published (e.g., jobs unreachable at shift change; route-extension result; night-risk around stops) | Results |
| Works | 4 | 5 | Tested, deployed, 3-minute demo, 3 outside testers | Us |
| ML/biomed | 3 | 4-5 | Model beats baseline on later years; second region | Results |
| Nationwide | 4 | 5 | Same pipeline on 3 regions | Us (time) |
| Mapping | 4 | 5 | Reachability by hour, spatial analysis | Us |
| Challenge fit | 4 | 5 | True personal story, Spanish, polished mobile UI, local event tie | Us |
Realistic total: **33-34 floor, 36-38 ceiling.** A 40 is not realistic.

## 8. Day-by-day (today is Sun 10/18)
- **Sun 10/18:** approve idea; confirm district; checks already done: GTFS, tracts, FARS. Next: check LODES.
- **Mon 10/19:** data prep: trimmed timetable JSON, reach-by-hour layer, jobs layer; decide vanpool feasibility.
- **Tue 10/20:** planner (connection scan), address input, result card; tests.
- **Wed 10/21:** map and risk layer; Model A and backtest; what-if simulator.
- **Thu 10/22:** employer fit, request writer, city brief; Spanish pass; UI polish.
- **Fri 10/23:** second region run; accessibility (keyboard, screen reader, no color-only signals); feature freeze at night.
- **Sat 10/24:** 3 outside testers; fix top issues; deploy to GitHub Pages; record the 1-3 min video; write answers; save a draft submission.
- **Sun 10/25:** final check of live link and video; submit. Mon morning is buffer only (deadline 9 am Pacific).
**Cut order if behind:** second/third region, vanpool, employer injury lookup, bike leg, cost check, then employer fit. Keep plan generator + reach map + risk layer + request writer + Spanish.

## 9. What we may and may not claim
- Allowed: "At least / about", with source and year; "plans produced"; "requests sent" (only if counted); "expected ... based on published ranges".
- Not allowed: "reduces commute times", "saves lives", "no tool exists" (say what is new), anything about lighting being modeled (no complete lighting data), a personal story you did not live, a pilot or reply you did not receive.
- Keep the plan honest about its limits: Omnitrans only; no delays; straight-line walking; tract centers.

## 10. Submission checklist
Student portal registration, eligibility, parent contact, 9-digit ZIP; enter one district only (confirm CA-33). Video 1-3 min, public, with names, app name, one-sentence purpose, audience, tools, app working. Written answers. **AI disclosure from `docs/AI_USE_LOG.md`** plus library and data source list. Be ready to explain every part of the code to judges; the rules require the student's own coding and technical understanding, and AI may only support specific parts. Log every AI use exactly.

## 11. Open items only the student can answer
1. His true personal reason (video opening). 2. Home or school district; confirm CA-33 participates. 3. Solo or team. 4. App name. 5. Who reviews the Spanish. 6. Approve this direction (A + safety layer) or choose another.

## 12. Verified vs unverified
**Verified:** Omnitrans GTFS downloads and parses; FARS and boundary files; tract data; the numbers in section 2 (approximate as stated); AB 701 coverage and disclosure duties (secondary summaries).
**Unverified:** LODES columns and origin-destination files; OSHA data (blocked to scripts, must be downloaded by hand); any vanpool program for CA-33; AB 701 "right to request" detail; fares and other agencies' feeds; crash-reduction factors (get exact CMF IDs); any claim that no equivalent app exists (search was limited).
