# Adding more regions (CA-22, CA-23, Sacramento, Washington DC): what is realistic (written 2026-10-24)

Interpretation of the request: "state congress city" = Sacramento (state capital, where the California legislature meets); "the nation's capital" = Washington, DC. If something else was meant, say so.

## The honest limit
The app supports **one bus agency per region**. Most of CA-22 and CA-23 is served by several small agencies, so "all the cities in the district" cannot be done correctly without merging feeds (a planner change). A region that quietly leaves out some cities' buses would show a misleadingly low "share near a bus". Use "the part of the district served by agency X" and say so on screen.
Also: the app already has 3 regions (CA-33, Cleveland, Miami). More regions help "Nationwide" only a little. Finish the health/cost additions, record the video and submit first (deadline Mon 2026-10-26 9:00 am Pacific).

## Candidates (status checked 2026-10-24)
| Region | Agency and feed | Status | Config notes |
|---|---|---|---|
| **Sacramento** (state capital) | SacRT `https://apps.sacrt.com/gtfs/srtd/google_transit.zip` | **Verified: HTTP 200, 2.6 MB, last modified 2026-10-06.** Easiest. | state 06, county 067, `fars_state` 6, `fars_counties` [67], `lodes_state` "ca" (already downloaded for CA-33), UTM 32610, center about [38.58, -121.49]. District: Sacramento city is mostly CA-7 (Doris Matsui); the Capitol is believed to be in CA-7; verify on house.gov and use that `cd`. |
| **Washington, DC** | WMATA bus `https://api.wmata.com/gtfs/bus-gtfs-static.zip` | Needs a **free API key** from developer.wmata.com (the student registers himself; do not share the key in the repo). The fetch script sends no key, so it needs a small change (an `api_key` header). Bus only; rail is a separate feed. | state 11, county 001, `fars_state` 11, `fars_counties` [1], `lodes_state` "dc", UTM 32618, center about [38.90, -77.03]. DC's at-large district is the non-voting delegate (Eleanor Holmes Norton); in the Census 119th-Congress file it is probably code "98": check the shapefile before using it. |
| **CA-23, valley part** | Omnitrans (same feed as CA-33) | Feed already works. Cities of CA-23 served by Omnitrans: Redlands (southern), Yucaipa, Loma Linda, parts of Highland and San Bernardino. | copy `ca33.json`, change `id`, `name`, `short`, `boundary.cd` to "23". **The High Desert is NOT served by Omnitrans**, so the headline share would be tiny for the wrong reason. Restrict the denominator to the Omnitrans-served part and label it that way. |
| CA-23, High Desert (Victorville, Hesperia, Apple Valley, Adelanto, Barstow) | Victor Valley Transit Authority (VVTA) | Feed URL **conflicting**: Transitland lists `https://api.transloc.com/gtfs/vvta.zip` as current, Mobility Database lists an older Trillium URL (stale). Not verified. | separate region if time allows; county 071. |
| CA-22 | Golden Empire Transit (Bakersfield) and many small agencies | GET feed URL **not verified**. District spans parts of Kern, Kings and Tulare counties with separate local agencies (Delano, Porterville, Hanford and others). | skip unless everything else is done. |
CA-23 cities (119th Congress): Victorville, Hesperia, Adelanto, Apple Valley, Barstow, Twentynine Palms, Big Bear Lake, California City, Loma Linda, Yucaipa, southern Redlands, parts of Highland and San Bernardino (Wikipedia; verify against the Census file). CA-22 cities (2023 map): Arvin, Avenal, Corcoran, Delano, Lindsay, McFarland, Porterville, Shafter, Wasco and parts of Bakersfield, Hanford, Tulare. California's Prop 50 changes boundaries for the 2026 elections; use the 119th-Congress boundary for current representation.

## How to add one (the student does it; about 1 hour each if nothing breaks)
From `shiftready/README.md`: copy a region file in `shiftready/regions/` (Cleveland's `cle.json` is the template for a non-California region: it omits the California-only `facilities` key), change the id, names, GTFS URL, state/county FIPS, `boundary` (state and district), `lodes_state`, FARS codes, UTM zone and map center; then run `fetch_region.py <id>`, `osm.py <id>`, `run_all.py`.
Safe process (important a day before submission):
1. `git tag safe-before-regions` and work on a branch. The deployed site must keep working.
2. After each region, run all tests (`node shiftready/tests/*.test.js` and `pytest shiftready/tests`).
3. Check the numbers by eye (share near a bus at noon and 11 pm should be plausible; region name correct in English and Spanish).
4. Merge only if everything passes. If a region fails, drop it. Do not spend more than 3 hours total.
Pitfalls seen so far: Census Reporter blocks generic user agents; OSM's public Overpass server rate-limits (HTTP 429), so `osmnx` can fail on big areas; the fetch script's user agent contains an email address and this repository is public (consider removing it).

## Recommended order if there is time
Sacramento first (verified feed, strong story: "the state capital's own bus service at 11 pm"), then CA-23 valley only if entering CA-23, then DC if the key is easy. Skip CA-22 and the High Desert.

## Update 2026-10-25: Sacramento added
Region `sac` (SacRT, California's 7th District) built with the same pipeline: `fetch_region.py`, then `transit`, `people`, `places`, `safety`. The road-risk model was not run for it (needs OSM data and `osmnx`), so the risk layers and corridors are absent there (the app shows them only when present). No fare file, so the cost card is hidden. No employers list, so the quick pick uses the jobs areas. Check: 2% of people are within a 5-minute walk of a bus at 11 PM (SacRT's own timetable has very few stop times after 11 PM). Known edge: when origin and destination are within about 800 m of each other, "arrive by" reports no bus instead of "walk it".

## Update 2026-10-25: rail added to San Bernardino (CA-33)
`prep/transit.py` can now merge extra feeds listed under `gtfs_extra` in a region file. CA-33 now merges Omnitrans buses with the Metrolink feed (San Bernardino, Inland Empire-Orange County, Riverside and 91 lines, plus the Redlands stops). The Omnitrans routes are unchanged; 67 stops, 7 routes and 270 trips were added. Coverage percentages did not change (tracts.json is identical), because the new stops sit where buses already reach. A San Bernardino Depot to Rancho Cucamonga trip at 4:30 pm now takes 25 minutes by train instead of about 100 by bus. Fares: the agency fare file covers Omnitrans only, so trips with a train leg show the bus fare and say the train fare is extra, and the monthly-pass comparison is hidden for them. Other agencies in the area (Riverside Transit, Victor Valley, Mountain Transit, Foothill Transit) are not merged.
