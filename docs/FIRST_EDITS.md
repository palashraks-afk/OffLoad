# Five edits you can make yourself (about 15 minutes each)

Why do this: judges may ask to see your contribution and your understanding. Small real edits that you make, test and can explain are the most honest evidence you can add. They also teach you how the project hangs together.

**The rule that matters most: only log what you really did.** After each edit, add a row to `docs/AI_USE_LOG.md` (template at the bottom). If the AI helped you with an edit, say so in that row. Never copy a row for something you did not do.

## Setup (once, 10 minutes)
1. Open a terminal in the project folder: `C:\Users\Rahul\Projects\OffLoad`.
2. See the site on your own computer. Either:
   - `python -m http.server 8792 --directory shiftready/web` and open http://localhost:8792/ in Chrome, or
   - use the preview server the assistant uses (same address, port 8792).
3. After each edit, hard-refresh the page (Ctrl + Shift + R). If an old version keeps showing, the service worker is keeping files: in Chrome press F12, go to Application, Service Workers, click Unregister, and reload. (When you publish an edit for real, the version name in `shiftready/web/sw.js` line 4, `CACHE = "shiftready-v35"` or whatever number it is now, must be raised by one so visitors get the new files.)
4. Run a test: `node shiftready/tests/<name>.test.js` from the project folder. You need Node.js installed (it is, if the other commands in this project work).
5. Take a "before" screenshot of the thing you change.

---

## Edit 1. Change a sentence the app says (i18n.js)
**Goal:** reword the line shown on a good result.
- **File:** `shiftready/web/js/i18n.js`
- **English, line 62:** `"why.good": "A bus gets you there on time, and back.",`
  Change the words inside the second pair of quotes, for example to `"A bus gets you there on time, and home again."`
- **Spanish, line 514:** `"why.good": "Un autobús te lleva a tiempo, y de regreso.",`
  Change it to match in meaning, for example `"Un autobús te lleva a tiempo, y de regreso a casa."` (If you are not sure about the Spanish, ask a Spanish speaker; do not trust a translation tool alone.)
- **Rules:** keep the straight quotation marks, keep the comma at the end of the line, and do not delete any `{...}` placeholder if the sentence has one (this one has none).
- **Test:** `node shiftready/tests/i18n.test.js` should say the keys are complete and the placeholders match.
- **See it:** open http://localhost:8792/, tap the "Early hospital shift" example. A "Yes, you can" result shows your new sentence. Tap the Español button to see the Spanish.
- **What you learned (say this to a judge):** all words live in one file in two languages, and a test stops me shipping a missing translation.

## Edit 2. Change the accent color (style.css)
**Goal:** change the app's main color and keep the text readable.
- **File:** `shiftready/web/css/style.css`
- **Light theme, line 11:** `--primary: #0a7c74;` (teal). Also change `--primary-hover` on the same line to something a bit darker, and `--primary-soft` (the pale background) to a very light version of your color.
- **Dark theme, line 20:** `--primary: #46c2b8;` is the lighter teal used on dark backgrounds. If you change the light color, pick a lighter version of it here too.
- **Safe light-theme choices** (all keep white text readable, contrast of at least 4.5 to 1, computed): `#1d4ed8` blue (6.7), `#9a3412` rust (7.3), `#0f766e` deep teal (5.5), `#1e40af` navy (8.7). Avoid light colors (yellow, light green) for `--primary` because white text on them is hard to read.
- **Test:** `node shiftready/tests/pwa.test.js` (checks the site files still make sense). There is no automatic color test, so look at it: check buttons, links and the "Yes" badge in light mode and in dark mode (the sun/moon button in the top bar).
- **What you learned:** all colors are named variables at the top of one file, so a whole new look is a few lines.

## Edit 3. Add one more example trip (ui-plan.js)
**Goal:** a fourth example button for your district.
- **File:** `shiftready/web/js/ui-plan.js`
- **Where:** the list called `BY_REGION` (around line 164). Under `ca23:` there are three lines like
  `{ k: "ex.early", from: "Redlands", to: "loma linda university medical center", T: "06:00", end: "14:30" },`
- **Add a fourth line inside the `ca23` list** (keep the comma at the end):
  `{ k: "ex.day", from: "Loma Linda", to: "redlands community hospital", T: "09:00", end: "11:00" },`
  `from` must be a city name that exists in the region (Loma Linda, Highland, Big Bear Lake, Barstow, Victorville, Hesperia, Yucaipa and Redlands are valid). `to` is part of a place name in lowercase (Redlands Community Hospital is valid). `T` is when you must be there, `end` is when the appointment or shift ends.
- **Test:** `node shiftready/tests/ui_logic.test.js` (the plan logic still passes) and `node shiftready/tests/regions.test.js`.
- **See it:** reload, and a fourth button appears under "Try an example." Tap it. Whatever the verdict is (Yes, Partly or No) is the real answer from the real timetable; read the reason and tell yourself why. The About page's "Real situations" card also uses this list.
- **What you learned:** the examples are data, not code; the answer comes from the same planner that any visitor uses.

## Edit 4. Add one more FAQ question
**Goal:** answer a question people will ask.
- **Files:** `shiftready/web/js/i18n.js` and `shiftready/web/js/app.js`
- **i18n.js:** find the English FAQ line (search for `"faq.q1"`, around line 419) and, on a new line next to the other FAQ entries inside the English block, add
  `"faq.q6": "Does it work without internet?", "faq.a6": "After you have opened the app once online, a trip you have already checked can be checked again with no signal. Map pictures need a connection.",`
  Then do the same inside the Spanish block (search for `"faq.q1"` again, around line 871; line numbers move when other edits are made, so search) with Spanish text, for example
  `"faq.q6": "¿Funciona sin internet?", "faq.a6": "Después de abrir la app una vez con internet, un viaje que ya revisaste se puede revisar otra vez sin señal. Las imágenes del mapa necesitan conexión.",`
  (This sentence matches what `shiftready/web/sw.js` really does: it stores the app files and the data you used, and never stores map pictures.)
- **app.js:** find the line that builds the FAQ list, around line 144: it is the one that contains `t("faq.q" + n)`. On that line change `[1, 2, 3, 4, 5]` to `[1, 2, 3, 4, 5, 6]`. (A similar `[1, 2, 3, 4, 5].map` a few lines above is a different list. Do not change that one.)
- **Test:** `node shiftready/tests/i18n.test.js`. If you forgot the Spanish, it will name the missing key.
- **See it:** About tab, scroll to "Questions people ask": six questions now.
- **What you learned:** how a new piece of content needs both languages, a key, and one place that lists it.

## Edit 5. Add a check to a test
**Goal:** write a test that proves a rule in the planner.
- **File:** `shiftready/tests/planner.test.js`
- **Where:** just above the line that starts `console.log(n + " planner checks passed.`
- **Add:**
  `ok(Math.abs(P.walkMinutes(80) - 1.3) < 1e-9, "80 m in a straight line is 1.3 minutes of walking");`
  This checks the two walking constants in `planner.js` (lines 10-11): street distance is straight-line times 1.3, and people walk 80 meters per minute (so 80 meters straight is 104 meters of street, which is 1.3 minutes).
- **Run:** `node shiftready/tests/planner.test.js`. It should print one more check than before.
- **Break it on purpose** to see the test work: change `DETOUR = 1.3` in `planner.js` line 11 to `1.4`, run the test (it fails), then change it back and run it again (it passes). Never leave it broken.
- **What you learned:** a test is a sentence the computer can check; it protects a number you care about.

---

## Template row for docs/AI_USE_LOG.md
Add a row to the table in `docs/AI_USE_LOG.md`, in the same format as the others. Only fill what is true.

```
| 2026-10-26 | (no AI for this edit) OR Claude Code explained X | What I asked (or "nothing") | What the AI did (or "nothing") | **What I wrote myself:** file name, line, what I typed, and the test I ran. For example: "Changed the sentence why.good in shiftready/web/js/i18n.js (English line 62 and Spanish line 514); ran node shiftready/tests/i18n.test.js and it passed; checked it in the app." | Yes, I can explain it: (one sentence) |
```
Date it with the day you actually did it, and commit your change with a message in your own words (for example `git commit -am "Reword the good-result sentence"`). Do not change old rows.

## What to say if a judge asks about these
"I made five small edits myself: reworded a message in both languages, changed the color, added an example trip, added a question to the FAQ, and added a test. Each one is logged with the file and line. They taught me how the text, the style, the planner and the tests connect." Say this only if it is true for the ones you did.
