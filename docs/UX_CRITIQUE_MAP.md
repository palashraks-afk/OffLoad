# Map tab critique, written before any change (2026-10-25)

Method: I used the live-quality local build (CA-23 default, version 31) twice, first as a night-shift worker on a 375 px phone, then as a city planner or employer on a 1280 px desktop. Screenshots were taken in the browser pane. These are the problems, harshly stated.

## User A: night-shift worker on a phone ("can I get there and home?")
1. **The first screen is a grey fog.** The map opens zoomed out to about the whole district (zoom 8). Roads and town names are washed out by the grey tile style, the bus stops are 1.5 px grey dots, and the 400 m "walk zones" are smaller than a pixel. Nothing says "here is where you can ride at this hour."
2. **No question is asked and none is answered.** There is no sentence at the top saying what the map is for. The only explanation is a small paragraph at the very bottom of the control panel, below eight layer chips.
3. **The legend is wrong and hidden.** It says "Blue areas", but the colour is teal, and no legend shows what grey dots, red dashed circles or dot size mean.
4. **The controls look broken.** Dragging the hour slider changes tiny dots and a number below the fold. On a phone the big stats are under the map, partly behind the tab bar, so nothing visibly happens when you scrub.
5. **The map cannot answer the worker's question.** There is no start and end on this tab, and the search box only pans. A trip appears only after you go to Plan, run it, press "Show on map", and then the whole tab switches. The "Back to my trip" button is hidden by default.
6. **Tapping a stop is nearly impossible.** The stop dots are 3 px wide. Only "tap anywhere" works, and nothing tells you that.
7. **No loading state.** The map area is blank grey while tiles load, and blank if the user is offline.
8. **The wrong things are on.** "Walk zones" is the default layer but is invisible at this zoom. The one layer that is visible at district scale (neighbourhoods, teal or red) is off.
9. **Eight layer chips** with jargon ("Warehouse and transport job blocks", "Night-time pedestrian and cyclist deaths (2019-2023)") use most of the panel.
10. **Spanish and screen readers:** the hour slider announces only a number; the map area's label says just "Map".

## User B: city planner or employer on a desktop ("where does service disappear?")
1. **The three stat tiles do not say what they cover.** "1.8% People near a bus" is not defined (within 400 m of a stop that is running), and nothing says it counts only the San Bernardino County part of the district.
2. **No "what we lost" view.** The planner's real question is "which neighbourhoods had a bus at noon and have none now?" The map shows only "no bus now" (red dashed). The noon figure is a tiny line of text.
3. **The boundary misleads.** The dashed district outline covers the Mojave desert and Inyo County, which have no data, so it looks as if the desert were "uncovered" rather than not served or not measured.
4. **Employers are hidden.** The employers layer is off, and the search box cannot find an employer by name. The Employers tab links in, but there is no list on the map.
5. **The control panel hides the densest area.** On desktop the panel covers the west edge of the map, close to the populated south-west cluster.
6. **Nothing to take away.** There is no way to save, print or share a map state from this tab (printing exists only on Employers).
7. **Over-wide default view.** The fit includes stops near Twentynine Palms and Barstow, so the dense San Bernardino-Redlands-Victorville area is a small part of the screen.
8. **Chip text wraps unevenly** and the longest chip is the full width of the panel.

## What I will fix (cheap and safe)
- Put a trip map **inside the Plan result** (route in line colours, walking dashed, numbered boardings, start and end pins, ride home, tap-a-stop departures, fit-to-trip, "Open large map").
- Map tab: one-sentence prompt, a real legend with swatches, "lost since noon" highlight, hour label with the percentage, neighbourhoods on by default, a better first view (populated area, with a "whole district" button), a loading state, layers tucked into a folded list on phones, labelled slider and map for screen readers, and English and Spanish text for all of it.

## Not fixing tonight
Employer search on the map, saving or printing a map state, and showing no-data areas differently from unserved areas on the district outline.

## What changed (same day)
- **Plan result:** a trip map card directly under the leave/arrive line: route in line colours with a white outline, walking dashed, numbered boarding pins, A and B pins, a dashed "ride home" layer you can switch off, "Fit trip", and tap-a-pin popups with the stop name and the next three departures from that stop. It draws with no map pictures (offline) and says so. One-finger dragging is off on touch screens so the page still scrolls; pinch-zoom and tapping work. The old "Show on map" button is now "Open large map" and opens the Map tab with the same drawing.
- **Map tab:** a one-sentence prompt, a legend with swatches that match the map, a "lost since noon" colour, a line that says the hour and the share of people near a bus (and the noon share), neighbourhoods on by default, an opening view of where the buses are plus a "whole district" button, a loading message, tile-failure message, layers in a folded list (open on desktop), a labelled slider (spoken as "10 PM, 1.8% of people near a bus"), and English and Spanish text for all of it.
- **Checked:** phone (375 px) and desktop (1280 px) widths, light and dark, English and Spanish, no horizontal scroll, no console errors, popups show real departures (checked against the timetable).
- **Still open:** employer search on the map, saving or printing a map state, and showing no-data areas differently from unserved ones on the district outline; the hour label is English-style ("10 PM") in Spanish.
