# Congressional App Challenge 2026: answers for the full application (rewritten 2026-10-26)

Every answer is under 400 words. Text in [BRACKETS] is for you to fill in with something you really remember or did. Read each answer out loud once and change any word that does not sound like you. The numbers come from the live app and the research notes in docs/research.

## Short fields
- **App name:** Shift Ready
- **Languages:** JavaScript, Python. Tick "Other" for HTML and CSS.
- **Platform:** Web
- **Video link:** [your public https link]
- **Link to project (optional):** https://palashraks-afk.github.io/OffLoad/ and the code at https://github.com/palashraks-afk/OffLoad
- **Congressional Certification:** optional. The repo is public, so you can opt in.
- **Where did you do most of the coding:** [your honest answer]
- **Date coding completed:** [the day you finish, for example 10/26/2026]
- **School or club project:** No [confirm]. Leave the mentor fields empty if No.
- **Ambassador email:** [only if one referred you]
- **Cover photo:** docs/cover/cover_home_600x800.jpg

## 1. What does your app do?
Shift Ready answers a question that bus apps skip: will the bus work for my shift, and for the ride home? About 15 of every 100 US workers usually work evenings, nights or other hours outside the day (Bureau of Labor Statistics), and more than 790,000 late-shift workers rely on public transit (Urban Institute). In the San Bernardino County part of California's 23rd District, where 729,052 people live, about 20% live within a five-minute walk of a bus at noon, 1.8% at 10 PM and none at 11 PM. The district's 6,383 warehouse and transport jobs follow the same curve: 34% are near a bus at noon and none at 11 PM.

So a worker can take a job and learn on the first night that the last bus left an hour ago. The choices left are a ride they pay for or driving tired, and night-shift workers already sleep less: 44% get six hours or less, against 29% of day workers (CDC). In our district, 84% of the 201 people walking or biking who were killed from 2019 to 2023 died in the dark. Employers pay too, since replacing a lower-paid worker costs roughly 16 to 20% of a year's pay (Center for American Progress).

You enter where you live, where you work and when you must arrive, and you can add when the shift ends. The app checks the real Omnitrans, Metrolink, Victor Valley, Morongo Basin and Mountain Transit timetables and answers Yes, Partly or No, with the ride home and the last bus. If it is No, it shows the closest times that work and the next bus if you miss one. Then it turns the answer into action: a note to your boss, a request to the transit agency built from your numbers, and a manager page showing which start times workers can reach.

It is for shift workers who do not drive or do not want to drive tired (nurses, warehouse and retail workers, students), the managers who schedule them, and the city and transit staff who plan service. It works in English and Spanish, needs no account and runs on a phone. Google Maps and Transit are built around leaving now, and job sites show a commute only one way. I did not find a free tool that starts from the end of a shift and checks the ride home.

## 2. What inspired you?
I used to ride home from soccer practice and pass the bus stops. There were workers waiting at them, [add one detail you really remember: what time it was, what they looked like, how long they seemed to have been there]. I didn't think much about it until I started wondering how they got home once the buses stopped running.

So I looked up the timetables for our area. Most of the bus service is gone by 10 PM. That matters because about 15 of every 100 US workers usually work evenings, nights or other hours outside the day (Bureau of Labor Statistics). In a CDC survey, 44% of night-shift workers slept six hours or less, against 28.8% of day workers. A small driving study found near-crashes after night shifts and none after a night of sleep. Someone finishing a late shift has three choices: a bus that may not exist, a ride they have to pay for, or driving tired.

What bothered me most is that nobody tells you before you take the job. I started out trying to match people with places they could actually reach by bus, and that turned into this app. I wanted something a worker, a manager or a city could open on a phone, get a straight answer in a minute, and then use to ask for something better.

## 3. What technical difficulties did you face?
[Change anything here that does not match what you remember dealing with.]

Our district is served by five transit agencies, and each publishes its timetable in its own file. Their ID numbers overlap, so a stop from one agency could be mistaken for another's. We fixed that by giving every agency its own prefix and then checking the merged timetable against the originals.

Searching "arrive by 10 PM" is harder than "leave at 10 PM," because the search has to run backward in time. We found a bug by comparing the planner against real scheduled trips, 138 random ones, in both directions. A stop with zero waiting time was being put in the wrong order. After the fix, every trip matched.

The crash data came with traps: hidden characters at the start of files, a different layout every year, and records with no location. The map server refused my computer for a while, so we pulled the roads in smaller pieces from a mirror.

I also wanted the numbers to hold up. The road-risk model finds 86% of later deaths in the top fifth of road length, against 65% for the best simple guess. At the top tenth it only ties. I kept both results on the page, and I tested the model on a second district it had never seen.

Smaller things took time too: train stops far away made the map zoom out to Los Angeles, and some buttons were too small for a thumb, so I checked every screen on phone sizes.

## 4. What improvements would you make in a 2.0 version?
Live delays come first. Right now the app uses the published timetable and sends people to the agency's live alerts. A 2.0 would show where the bus is and warn about strike and holiday days.

Second, I would sit down with shift workers and managers, watch them use it, and fix whatever confuses them. I want to know whether it changes what people do.

Third, the rest of the district. The app covers the San Bernardino County part of California's 23rd. I would add the small part near California City and more agencies, such as Kern Transit, Riverside Transit and Beaumont.

After that: a phone reminder that says "leave now to make your bus," information about shade, lighting and shelters at stops, a Spanish review by a native speaker, and a simple way for a volunteer in another city to add their own timetable. I would also like agencies to see how many people asked for the same later bus, with no names attached.

## 5. Did you use AI? (answer Yes)
Yes. I used Claude Code, an AI assistant from Anthropic, to help build the app and to help research it.

Here is how the work split. I had the original plan and wrote the early code for the mapping and matching idea before I used AI (I no longer have those files). Claude Code helped me turn that idea into the working app. It wrote most of the current code under my direction: the data preparation, the trip planner, the road-risk model, the web pages, the English and Spanish text and the tests. It also helped me find sources and helped me draft and edit these written answers.

I chose the problem and the district. I decided which data to use and what the app should and should not claim, for example that it never says it saves lives. I told it what to build, read the results, asked for changes when something looked wrong, and decided which numbers to show. [Add what you really did yourself: tested it on your phone, showed it to someone, wrote a part, made an edit. Only what is true.]

Every session with the assistant is written down in a public log in the project (docs/AI_USE_LOG.md), with the date, what I asked for and what it did. I can show the code and explain how the planner works if the judges ask.

## 6. What did you learn?
[Write this one in your own words. A starting point, if it is true for you: a bus timetable is public data, so anyone can check whether a job is reachable before taking it. A number is more useful when you say how it could be wrong. The people who ride the bus know things the data cannot show, so I want to ask them next. And working with an AI assistant taught me to check what it gives me instead of trusting it.]

## Your authorship note
You said you had the original plan and original code for the mapping and matching idea and that those files are lost. Answer 5 says exactly that. If you find the files, put them unchanged in a folder called original-code/ (see docs/ORIGINAL_CODE_SEARCH.md). Keep the sentence about AI writing most of the current code: the rules require full disclosure, the project log is public, and judges can ask to see the code.

## Final checks before pressing Save
- Video is public and the link starts with https.
- Every number you say in the video matches the live app on the day you record it.
- The bracketed parts are replaced with true things.
- Cover photo is a 600x800 JPEG.
- Submit before Mon 2026-10-26 9:00 am Pacific (noon Eastern). Aim for 8:00.
