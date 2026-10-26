# Finding your lost original plan and code

**Why this matters.** Your statement is: you had the original plan and the original code for the original mapping-and-matching idea before AI was used, then used AI to polish it and to do background research, and those files are now lost. Judges are told they may ask to see source code. If you can find even part of the original, it becomes proof of your own work. If you cannot, the honest answer is still fine (see the end), but a found file is worth far more than a remembered one.

**What the assistant already checked on 2026-10-25 (so you do not repeat it).**
- GitHub, account `palashraks-afk`: repositories `OffLoad` (created 2026-10-13, the first commits are already from the Claude Code era), `AAN`, `ventrigel-cds`, `Vantage` (a React/Vite project, "Vantage App Phase 9", created 2026-06-03), `OncoVision`, `OncovisonAI_Backend`. None has the original mapping-and-matching code. `Vantage` has a `MapPage.jsx`; it is a different project (a stadium-style map app), but open it once yourself to be sure it is not the one you mean.
- This Windows computer: `C:\Users\Rahul\.gemini\antigravity\scratch\` has `vantage-app`, `isef-project`, `canopy`, `brain_assistant`; nothing in them mentions buses, transit, shifts or hospitals. The Desktop has other projects (ISEF, Vision, BlueBuild, Ventrix, blood_analysis_app). None looked like it. (The assistant looked only at folder and file names while searching for code; it did not open any files in your personal folders such as Documents.)
- The repository history starts 2026-10-12 and was made with Claude Code, so the original is not in it.

You still have to check the places only you can open. Work down the list; stop when you find it. Tick each box.

---

## 1. Chat histories (most likely place)
Your first version was probably written in a chat. Search for words you would have typed: `map`, `match`, `matching`, `Leaflet`, `latitude`, `hospital`, `ambulance`, `offload`, `bus`, `shift`, `plan`.

- [ ] **ChatGPT:** the chat list has a search box (magnifier, top left). Also check **Archived chats** (Settings, Data controls, Archived chats, Manage). To get everything: Settings, Data controls, **Export data**, Confirm. You get an email link; the zip has `conversations.json` and `chat.html`. Open `chat.html` and press Ctrl + F.
- [ ] **Claude (claude.ai):** use the search box in the sidebar and look in **Projects**. To export: Settings, Privacy, **Export data**; you get an email with a zip. (If the plan was uploaded into a Claude Project as a file, it is under that project's knowledge.)
- [ ] **Gemini:** gemini.google.com, left menu, **Recent**, and the search. Also https://myactivity.google.com/product/gemini (your Gemini Apps activity). For a full copy use **Google Takeout** (https://takeout.google.com), select "My Activity" and "Gemini Apps", and export.
- [ ] **Other tools:** Cursor, Windsurf, GitHub Copilot, Replit Agent, Antigravity. They keep local history: check `C:\Users\Rahul\.cursor`, `.windsurf`, `.gemini` for project folders and chat history files. In VS Code or Cursor use File, Open Recent; and "Timeline" on a file.
- [ ] **Voice or notes apps:** Apple Notes, Google Keep, OneNote, Notion. Search "plan" and "map".

## 2. Google Drive, Docs, Gmail, Classroom
- [ ] **Drive search** (drive.google.com): search `map`, `plan`, `offload`, `matching`; use Advanced search, "Date modified" before 2026-10-12. Check **Trash** (files stay 30 days) and "Shared with me".
- [ ] **Docs version history:** open any document that held the plan, File, Version history, See version history. Old versions can be restored or copied.
- [ ] **Gmail** (both your accounts, and the school one): search `has:attachment filename:py OR filename:js OR filename:html OR filename:zip before:2026/10/12`; also search your **Sent** folder for anything you sent to yourself, a teacher, a mentor or a friend; also `map plan`, `matching`.
- [ ] **Google Classroom or school Drive:** assignments you turned in; ask your teacher if they still have a submission.

## 3. This Windows computer
- [ ] **File Explorer search:** open `C:\Users\Rahul`, in the search box type `datemodified:<2026-10-12 kind:=document OR *.js OR *.py OR *.html` or search for `*.html` then sort by date modified. Look in Desktop, Documents, Downloads, and any "New folder".
- [ ] **Recycle Bin:** open it and sort by "Date deleted."
- [ ] **File History / Previous Versions:** right-click a folder, Properties, **Previous Versions**; or Control Panel, File History, Restore personal files.
- [ ] **OneDrive:** onedrive.live.com, **Recycle bin** (kept about 30 days) and **Version history** on a file.
- [ ] **Browser:** `chrome://history` and search for `codepen`, `replit`, `glitch`, `jsfiddle`, `codesandbox`, `stackblitz`, `scratch`, `colab`, `observablehq`. Also check Chrome's Downloads page (`chrome://downloads`).
- [ ] **Colab:** colab.research.google.com, File, **Open notebook**, Google Drive tab, and Revision history (an `.ipynb` was seen on this computer: `ISEF 2026 Final V.ipynb`, which is a different project, but check Colab for others).

## 4. The Mac (the other computer you used)
- [ ] **Spotlight** (Cmd + Space): search by kind, "kind:folder map" and "kind:document plan"; or in Finder, search "This Mac", change "Kind" to Other and pick extensions `js`, `py`, `html`, `ipynb`, and "Date Modified" before 2026-10-12.
- [ ] **Time Machine:** if it is on, open Time Machine and go back to before 2026-10-12 in Documents, Desktop and Downloads.
- [ ] **iCloud Drive** and **Recently Deleted** in Files and Notes.
- [ ] The Mac's terminal: `git log` in any project folder; `ls -la ~/Desktop ~/Documents ~/Downloads`.
- [ ] The folder the Mac assistant used (it had the repository cloned): any other clones or `.zip` files next to it.

## 5. GitHub, deeper
- [ ] **All your repositories, including private ones:** https://github.com/palashraks-afk?tab=repositories (logged in, so private ones show).
- [ ] **Deleted repositories:** Settings, Repositories, **Deleted repositories** (GitHub can restore one within 90 days).
- [ ] **Branches and old commits:** in each repo, the branch dropdown, and `https://github.com/palashraks-afk/<repo>/commits`. Also **Gists** (https://gist.github.com).
- [ ] **Forks and other accounts:** did you ever sign in with another GitHub account or email? Check it.
- [ ] **GitHub Desktop** or VS Code history: local clones in `C:\Users\Rahul\Documents\GitHub` (a folder named GitHub exists there; open it and look at each project's `git log`).

## 6. Sandboxes and other places
- [ ] **Replit, CodePen, Glitch, Scratch, Roblox, Figma, Canva, Bubble, Glide, Thunkable:** log in and look at each dashboard.
- [ ] **Discord, WhatsApp, Instagram, iMessage, Slack:** you may have sent the files to a friend or to yourself. Search the chats for `.zip`, `.js`, `.html`, "map".
- [ ] **Phone photos and screenshots:** search the Photos app for "map", "plan", handwritten notes, whiteboards, a screenshot of the first version running.
- [ ] **A mentor, teacher or friend:** ask whether they have a copy or a message with it.

---

## When you find something: how to add it honestly
1. **Do not edit it.** Copy the original files exactly as they are into a new folder `original-code/` at the top of the project (next to `shiftready/`). Copy with the dates kept: in File Explorer, copy and paste normally keeps "Date modified"; do not open and re-save the files.
2. In that folder add a short `README.md` in your own words: what these files are, where you found them (for example "ChatGPT export of 2026-10-26, conversation titled ..."), the date each was created or last modified as shown by the computer or the chat, and what idea they were for.
3. Commit it with a truthful message and today's real date. **Never back-date a commit or change a file's date.** The commit date shows when you added it; the README and the file dates show when it was written.
   ```
   git add original-code
   git commit -m "Add my original plan and code, recovered from <where>"
   git push
   ```
4. Tell the assistant which files, if any, the current app still uses, or whether the new app replaced them. If the old code is not in the new app, say "in an earlier version," not "in this app."
5. Add a row to `docs/AI_USE_LOG.md` (what it is, where found, the dates, "no AI" or "AI polished it on <date>").

## If you cannot find it: what is honest to say
- True and enough: "I came up with the original mapping-and-matching idea and wrote the plan and early code for it in an earlier version, before I used AI. I no longer have those files. The current app's code was written by an AI assistant under my direction."
- Do not say: that any line in the current repository is yours unless you made it (see `docs/FIRST_EDITS.md` for small edits you can really make and log), or that the old files "exist" if you cannot show them.
- Offer what you do have: your memory of the design (write it as a one-page design note now, with today's date, titled "Original plan, rewritten from memory"), any chat or email where you described the idea (even screenshots), and the five small edits you make yourself.
