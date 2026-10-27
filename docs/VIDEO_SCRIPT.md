# Video script for the Congressional App Challenge (about 2 minutes 15 to 2 minutes 40)

The rules ask for 1 to 3 minutes, public on YouTube or Vimeo, and the video must say your name, the app's name, what the app is for in ONE clear sentence, who it is for, the tools and coding languages, and show the app working. This script has all of that. You do not have to show your face. A screen recording with your voice is fine.

## Where and how to record
1. **At home, in a quiet room.** Close the door and turn off fans, TV and notifications. If you have earbuds with a microphone, wear them. They sound better than a laptop mic.
2. **On your computer, in Chrome.** Open https://palashraks-afk.github.io/ShiftReady/ . Press F12, click the little phone icon at the top left of the panel, and pick "iPhone 12 Pro" or similar so the app looks like a phone. Close the panel (F12 again) once the phone view is set. Browser zoom 100%.
3. **Record screen and voice.** On Windows press Windows + Alt + R to start and stop (Xbox Game Bar). Click the Chrome window first. The file saves in Videos\Captures. If that does not work, press Windows + G, then click the Record button. Do a 10 second test and play it back to check you can hear yourself.
4. **Read the script out loud once without recording**, then record. Two or three takes are normal. Slow down; a calm voice sounds better than a fast one. Pause for a second after each tap so people can see what changed.
5. **Upload to YouTube.** Choose Visibility: Public (not Unlisted, not Private). Copy the link. Open it in a private window to check it plays with sound. Paste it into the form.
6. **Check the length.** It must be under 3:00. This script is about 2:20 at a normal speaking speed, so you have room to slow down. If you run long, cut the Employers and other-cities lines first.

## The script (say it in your own words; keep every fact)

**0:00  Start on the first screen (the dark banner with 0%)**
> Hi, I'm Palash Rakshit, a student at Redlands High School in California's 23rd district, and this is Shift Ready.

**0:08  Still on the first screen**
> Shift Ready is a free app that checks if a worker can get to work and back home by bus or train, and helps them ask for better service if they can't.

**0:21  Point at the 0% and the 11 PM tick**
> I used to pass workers waiting at bus stops after soccer practice. Later I passed a memorial near my house for a person who died in a hit-and-run at night. I wondered how people get home after the buses stop. Night shifts are most common in warehouses and hospitals. In my district, 6,383 jobs are in warehouse and transport work. About a third are near a bus at noon. At 10 PM, one in ten. At 11 PM, none. Between midnight and 3 AM, no warehouse or health care job has a bus nearby. So a worker can take a job and find out the last bus is gone, and drive tired instead. In a CDC survey, 44 percent of night-shift workers slept six hours or less, against 29 percent of day workers.

**1:12  Tap the example called Night shift (Yucaipa to Loma Linda University Health)**
> Here is how it works. I put in a start in Yucaipa, a job at Loma Linda University Health at 10 PM, and when the shift ends. It checks the real timetables and says Partly: there is a bus, but the walk is long. It also shows the map and the ride home. Google Maps plans for leaving now. This starts from your shift.

**1:37  Tap Message my boss, then Ask for better service**
> One tap copies a note to my boss. Another writes a request to the bus agency.

**1:44  Tap Early hospital shift, set the time to 5:00 AM and tap Check my trip (No), set it to 8:00 AM and tap Check my trip again (Yes), then switch the language to Spanish**
> Time matters. At 5 AM, an early hospital shift says No. At 8 AM, it says Yes. It also works in Spanish.

**1:53  Open the Map tab and drag the hour slider to 11 PM, then tap the Employers tab**
> The Map tab shows where buses disappear, hour by hour. The Employers tab shows managers which start times work.

**2:02  Back to the first screen**
> It's for shift workers who don't drive, their managers, and city and transit staff. It's built with JavaScript and Python, using public timetables, Census data, crash data and OpenStreetMap. I used an AI tool, Claude Code, and it wrote most of the current code. The idea, plan, data and decisions are mine, and every session is logged publicly.

**2:24  Stay on the 0% and 11 PM screen**
> Next, I want to add live delays, and test it with real workers and managers. I also want to send agencies the requests with real numbers behind them, so a worker can know they will get home, and a city can see who it is leaving behind. Thank you for watching.


## Facts you are saying (check them on the live app the day you record)
- About one in five people near a bus at noon, under 2% at 10 PM, none within a five minute walk at 11 PM (San Bernardino County part of CA-23, 729,052 people).
- Twelve places work in the app.
- The Night shift example says Partly; the Early hospital shift at 5:00 AM says No bus works, and at 8:00 AM says Yes, a bus gets you there on time and back (checked 2026-10-26; re-check on the day you record).

- "Night shifts are most common in warehouses and hospitals": CDC survey (2010 NHIS) shows night work is most common in transportation and warehousing and in health care (docs/research/13_shift_work_health.md). It is not a count of night workers in CA-23; do not say how many there are.

- "Of the 6,383 warehouse and transport jobs in my district, 34 percent are near a bus at noon, and none are at 11 PM": from docs/APPLICATION_ANSWERS.md (CA-23, San Bernardino County part, weekday). Check it on the Employers tab the day you record; if the screen differs, say what the screen shows.

- Worker numbers (San Bernardino County part of CA-23, weekday), from `shiftready/web/data/open/ca23_coverage_by_hour.csv` and `comparison.json`: 6,383 warehouse and transport jobs; 33.5% near a bus at noon ("about a third"), 10.2% at 10 PM ("one in ten"), 0% at 11 PM; hours 0 to 3 AM are 0% for both warehouse and transport jobs and health care jobs. Near a bus = a stop within a straight 400 m walk with a departure that hour.
- "In a CDC survey, 44 percent of night-shift workers slept six hours or less, against 29 percent of day workers": CDC MMWR, 27 Apr 2012 (2010 NHIS), 44.0% vs 28.8%. National, self-reported; say "in a CDC survey", not "in my district".

## Do not say
- "Saves lives," "prevents crashes," "the first," "nobody has done this."
- Any number that is not on the screen or in this script.
- That DC is in the app (it is not).

## Before you record: three people test (makes the video and your answers stronger)
Ask 3 people (a family member who takes the bus, a friend with a part-time job, a manager if you know one). For each: 5 minutes, you only watch.
1. Give them the link and say: "Pretend you start work at Loma Linda University Health at 10 PM. See if you can get there and home." Do not help.
2. Write down where they hesitated, what they said, and whether they could read the answer.
3. Ask: "Would you use this? What is missing?"
Write the results in docs/SHIFTREADY_TESTING.md with first names and the date. Use only what really happened. If it happened, you can add one true line to the video, like "Three people tried it, and two understood the answer without help."
