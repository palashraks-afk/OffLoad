# Record and submit on your MacBook

Everything you need is in this repo. On the Mac, open Terminal and run these two lines (the first time; after that, only the last two):

```
cd ~/Desktop
git clone https://github.com/palashraks-afk/ShiftReady.git
cd ShiftReady && git pull
open docs
```

(If the repo is already on the Mac: `cd` into it, then `git pull`, then `open docs`.) The files you need are in the docs folder:
- `RECORD_ON_MAC.md` (this guide, with the script below)
- `APPLICATION_ANSWERS.md` (the six answers to paste into the form)
- `cover/cover_final_600x800.jpg` (the cover photo for the form)
- `SCREEN_RECORDING_STEPS.md` (screen recording steps and timestamps)
- `JUDGE_QA.md` (practice questions) and `CODE_WALKTHROUGH.md` (how the code works)

You can also read them on GitHub: https://github.com/palashraks-afk/ShiftReady/tree/main/docs

## Deadline
Monday 2026-10-26. The official rules and most House offices say 12:00 pm Eastern (9:00 am Pacific). One page says 9:00 pm Eastern (6:00 pm Pacific). Plan for 9:00 am Pacific and read the exact time on the portal. Do not wait for the last hour.

## Which way to record: voice and screen together, or separately?
Best for you: **record the screen first with no sound, then record your voice on top in iMovie.** Reasons: your taps are slower than your speech, so doing both at once makes you rush or go quiet; and in iMovie you can redo any single sentence without redoing the whole video. If you have rehearsed twice and feel smooth, recording both together in one take is faster and also fine. Both ways are below.

## Set up (5 minutes)
1. Plug in the charger. Turn on Do Not Disturb (Control Center, Focus) so no messages pop up. Close other apps. Sit somewhere quiet and close the door.
2. Open the app in a phone-sized window. In Terminal paste this and press Enter:
```
open -na "Google Chrome" --args --app=https://palashraks-afk.github.io/ShiftReady/ --window-size=420,860
```
   (If you use Safari instead: Safari menu, Settings, Advanced, tick "Show features for web developers"; then Develop, Enter Responsive Design Mode, choose iPhone.)
3. Click in the app and run the Night shift example once so you know where everything is. Reload to start fresh before you record.
4. Allow permissions if asked: System Settings, Privacy and Security, Screen Recording and Microphone, tick QuickTime Player (and iMovie).

## Way A (recommended): screen first, voice second
1. **Record the screen with no sound.** Open QuickTime Player. File, New Screen Recording (or press Command + Shift + 5). Choose "Record Selected Portion" and drag a box around the phone-sized window. Click Options and set Microphone to None. Click Record, then follow the script's actions (taps) slowly, pausing about two seconds on each screen. To stop, click the stop button in the menu bar, or press Command + Control + Esc. The file lands on the Desktop.
2. **Add your voice in iMovie.** Open iMovie, Create New, Movie. Drag the screen recording in. Put the playhead at the start. Click the microphone icon under the viewer (Record Voiceover), pick the MacBook microphone, and click the red record button. Read the script out loud while the video plays. Stop. If you mess up a sentence, drag the playhead back, delete that part of the voice track, and record again.
3. **Trim the ends.** If the video is longer than the voice, cut the extra at the end. It must be under 3:00.
4. **Export.** File, Share, File. Resolution 1080p, Quality High. Save to the Desktop.

## Way B: everything in one take
1. QuickTime Player, File, New Screen Recording, Record Selected Portion around the app window, Options, Microphone: MacBook Pro Microphone.
2. Record, tap and talk along with the script, stop with the menu bar button.
3. Play it back. If the voice is good, you are done. If not, record again.

## Voice tips
- Sit about 30 cm (a hand and a half) from the laptop. Speak a little slower than normal. Smile a little; it shows in your voice.
- Say each number slowly.
- If you stumble, pause, take a breath, and start the sentence again. You can cut it later.
- You do not need to show your face. The rules ask for your name, the app's name, its purpose in one sentence, who it is for, the tools and languages, and the app working. The script has all of that.

## Upload (YouTube)
1. Go to https://studio.youtube.com and sign in. Click Create, Upload videos, pick your exported file.
2. Title: Shift Ready, Congressional App Challenge 2026. Say No to "made for kids."
3. Visibility: **Public**. Not Unlisted. Not Private. Save.
4. Copy the link. Open it in a private window to check it plays with sound. Paste it into the form.

## The script (about 2:50; rehearse and time it, it must be under 3:00)

**0:00  Start on the first screen (the dark banner with 0%)**
> Hi, I'm Palash Rakshit, a student at Redlands High School in California's 23rd district, and this is Shift Ready.

**0:08  Still on the first screen**
> Shift Ready is a free app. It checks if a worker can get to work and back home by bus or train. If they can't, it helps them ask for better bus service.

**0:22  Point at the 0% and the 11 PM tick**
> I used to pass workers waiting at bus stops after soccer practice. Later I passed a memorial near my house for a person who died in a hit-and-run at night. I wondered how people get home after the buses stop. Night shifts are most common in warehouses and hospitals. In my district, about one in five people live near a bus at noon. At 11 PM, none live within a five minute walk. And 84 percent of the 201 people walking or biking who were killed in the last five years died in the dark.

**0:59  Stay on the first screen and point at the From, To and time boxes**
> So I built an app to check it. You type where you start, where you work, and when your shift begins and ends. The app checks real bus and train timetables and says Yes, Partly, or No, there and back. Google Maps plans a trip for right now. Shift Ready starts from your shift.

**1:20  Tap the example called Night shift (Yucaipa to Loma Linda University Health)**
> Try a night shift. A worker in Yucaipa starts at Loma Linda University Health at 10 PM and ends at 6:30 AM. It says Partly: there is a bus, but the walk is long. It also shows the map and the ride home.

**1:38  Tap Message my boss, then Ask for better service**
> One tap copies a note to my boss. Another writes a request to the bus agency.

**1:45  Tap Early hospital shift, set the time to 5:00 AM and tap Check my trip (No), set it to 8:00 AM and tap Check my trip again (Yes), then switch the language to Spanish**
> Time matters. Take an early hospital shift. At 5 AM it says No. At 8 AM it says Yes. It also works in Spanish.

**1:55  Open the Map tab and drag the hour slider to 11 PM, then tap the Employers tab**
> Next, the Map tab shows where buses disappear, hour by hour. The Employers tab shows managers which start times work.

**2:04  Back to the first screen**
> It's for shift workers who don't drive, their managers, and city and transit staff. It's built with JavaScript and Python, using public timetables, Census data, crash data and OpenStreetMap. I used an AI tool, Claude Code, and it wrote most of the current code. The idea, plan, data and decisions are mine, and every session is logged publicly.

**2:27  Stay on the 0% and 11 PM screen**
> Of the 6,383 warehouse and transport jobs in my district, 34 percent are near a bus at noon, and none are at 11 PM. So right now, a worker can't tell if they can get home, and a transit agency can't see who it's leaving behind. Shift Ready shows both the same real numbers, so people can ask for better service. Next: live delays, and tests with real workers. Thank you for watching.


## Submit
1. Open the application form and paste the six answers from `APPLICATION_ANSWERS.md` (the form shows a word counter; each answer is about 380 to 395 words).
2. Paste the video link and the project link: https://palashraks-afk.github.io/ShiftReady/
3. Attach `docs/cover/cover_final_600x800.jpg` as the cover photo.
4. Answer the AI question Yes and paste answer 5.
5. Read everything once. Check the deadline time shown on the portal. Press Save, then Submit.
