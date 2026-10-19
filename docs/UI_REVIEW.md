# Review of the app: as a user, then as a judge (2026-10-19)

Method: walked the live app twice with a purpose, wrote down what got in the way, fixed it, and re-checked. Findings are from me using it, not from other people. The outside test in `docs/SHIFTREADY_TESTING.md` is still the real test.

## As a user: "Maria", night-shift worker in Fontana, no car, reads Spanish first
| What got in the way | Fix |
|---|---|
| I had to type my address every time; the location button was an unlabelled crosshair. | A labelled **Use my location** button under the From box, a retry for slow phones, plain-language messages for blocked/slow/outside-the-area, an offer to switch region if you are near another one, and an automatic fill when the browser has already been allowed. A saved commute re-checks in one tap. |
| The destination list was census tract numbers ("Rialto (002306)"). Nobody knows those. | The list now starts with **real major employers** (Amazon, Arrowhead Regional Medical Center, FedEx Ground and others). Neighbourhoods are named by the nearest bus stop's cross streets. |
| I did not know what to try. | **Try an example** buttons run a night shift, an early hospital shift and a morning appointment. |
| "Partly: the walk is long" hid the real problem: the last bus gets there 3 hours early. | The verdict now says when the last bus that works arrives long before you need to be there. |
| Too many boxes under the answer. | Strip, week, cost and "what you can try" are folded sections. The answer, the plan and the ride home come first. |
| The map did not say what blue meant, and going to the map lost my trip. | A legend line in the map panel and a **Back to my trip** button. Employer pins and spot reports have Plan-a-trip and Reach buttons, so map, plan and reach connect. |
| The language button said "ES". | It now says **Español** / **English**. |

## As a judge: does it solve a real problem, is it original, does it work, is it honest, is it the student's work
| Concern | Fix or answer |
|---|---|
| Is the problem stated plainly and with evidence? | The About page opens with the problem, a four-part outline, a four-step flow and 11 sourced statistics, then a section on **real workplaces** (employer by employer: first and last bus, hours with service, size class). |
| Can I see it work in one minute? | Example buttons on the first screen run a real trip end to end. |
| Where do the numbers come from? | A **Sources** list with links for every dataset; each statistic names its source; limits are on the page. |
| Is there anything new? | The picture of the real bus network at noon beside 11 PM; the employer-by-employer check against the schedule; the walking-risk model tested on later years in two regions; a trip search that runs in the browser. |
| Is the code sound? | Planner checked against 129 real timetable trips both directions; two independent implementations of the coverage numbers agree on 720/720; verdict, translation and location logic have tests (see `shiftready/tests`). |
| Is the AI use disclosed? | Yes, plainly, on the About page and in `docs/AI_USE_LOG.md`. **The contest rules require that the student does the coding and that AI only supports specific parts; the student must be able to explain every part of the code.** |
| What would a judge still ask? | Has anyone outside tried it? Has an agency replied? Those need the student: `docs/SHIFTREADY_TESTING.md`, `docs/SHIFTREADY_OUTREACH.md`. |

## Employer data: what it is and is not
Source: California EDD Major Employers list, ALMIS Employer Database 2026 2nd Edition (Data Axle), San Bernardino County. It gives name, address and a **size class** (1,000-4,999 or 5,000-9,999 employees), never an exact headcount, so the app shows the class. Addresses were located with OpenStreetMap Nominatim (one address, FedEx Ground, needed a county-level query). Mountain resorts, Fort Irwin and the desert were left out because they are not on the valley bus network. Only the 21 employers on the EDD list are shown; this is not every employer.

## Still open
- A real phone, Safari and Firefox pass; a screen-reader pass.
- Spanish reviewed by a native speaker.
- 3 outside testers, outreach and replies, the video, and the student's own AI-use paragraph.
