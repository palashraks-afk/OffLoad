# Shift Ready open data: bus and train coverage by hour

Processed tables from Shift Ready (https://palashraks-afk.github.io/OffLoad/), a free app that checks a work shift against the bus and train timetable. Code and notes: https://github.com/palashraks-afk/OffLoad

## Files
| File | What it holds |
|---|---|
| `<region>_coverage_by_hour.csv` / `.json` | One row per day type (weekday, saturday, sunday) and hour (0 to 23): 72 rows per region |
| `all_regions_coverage_by_hour.csv` | The same rows for every region in one file |
| `comparison.json` | One record per region (the numbers behind the app's "Compare cities" view) |

Regions: ca23 (California's 23rd District, San Bernardino County part), ca33 (California's 33rd), cle (Cleveland, OH-11), mia (Miami, FL-24), sac (Sacramento, CA-7), den (Denver, CO-1), atl (Atlanta, GA-5), sea (Seattle, WA-7), bos (Boston, MA-8). The `scope` column says exactly which area each region covers.

## Columns
- `region`, `scope`, `agencies`: the region id, the area described in words, and the transit operators whose timetables were used.
- `day`: weekday, saturday or sunday (the service days the timetable file marks as weekday, Saturday or Sunday).
- `hour`: the hour of the day that starts at that clock hour (0 = midnight to 12:59 AM, 23 = 11 PM to 11:59 PM). A place counts as "near a bus" in an hour if at least one trip departs a stop within the walking distance in that hour.
- `people_share_near_bus`: share (0 to 1) of the region's residents who live within a 5-minute walk of a stop with a departure in that hour. The walk is 400 metres straight line from the centre of each Census tract (`walk_m` in `comparison.json`); an 800 metre sensitivity check is in the app's About page.
- `jobs_share_near_bus`: the same for all jobs, by workplace, measured from the centre of each Census block.
- `warehouse_transport_jobs_share_near_bus`: the same for Transportation and Warehousing jobs (NAICS sectors 48-49, LODES field CNS08) inside the region.
- `health_jobs_share_near_bus`: the same for Health Care and Social Assistance jobs (NAICS 62, LODES field CNS16) inside the region.

## Method in one paragraph
Timetables (GTFS) are turned into a list of trips. For each Census tract centre (residents) or block centre (jobs), a stop within the walking distance with at least one departure in the hour makes that place "near a bus" for that hour. The population share weights tracts by residents (ACS 5-year); the jobs shares weight by workplace jobs (LEHD LODES 2022). These are tract-level approximations: they say when a bus is nearby, not how often it comes, and they do not see delays, detours or holiday and strike days.

## Vintage and sources
- Timetables: each agency's published GTFS file, valid dates are in `comparison.json` (`feed_start`, `feed_end`). The build date is in `comparison.json` (`built`).
- Jobs: U.S. Census Bureau LEHD LODES 2022. Residents and homes without a vehicle: Census ACS 5-year estimates (latest release available through Census Reporter at build time). Tract and district boundaries: Census TIGER/cartographic boundary files (2023 tracts, 119th Congress districts).
- Source links for every dataset: the app's About page, "Data and sources".

## Licence
The processed tables in this folder are released under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/): share and adapt with credit. The underlying sources keep their own terms (agency timetable terms, U.S. Census public data, OpenStreetMap ODbL where used). The data come with no warranty; check the agency's live information before travelling.

## How to cite
Rakshit, P. (2026). *Shift Ready: bus and train coverage by hour, nine U.S. regions* [data set]. https://palashraks-afk.github.io/OffLoad/data/open/ (accessed YYYY-MM-DD).

## Changelog
- 2026-10-25: first release, nine regions, built from the timetables listed in each region's `region.json`.
