# Congressional App Challenge 2026: answers for the full application (final draft, 2026-10-26)

Each answer is 380 to 400 words. Every fact is from the live app, the research notes in docs/research, or what you told me. Anything I could not know is not in here, so nothing is left in brackets. Read each answer out loud once and change any word that does not sound like you. Add a detail only if it is true.

## Short fields
- **App name:** Shift Ready
- **Languages:** JavaScript, Python. Tick "Other" for HTML and CSS.
- **Platform:** Web
- **Video link:** your public https link, once the video is uploaded
- **Link to project (optional):** https://palashraks-afk.github.io/OffLoad/ (the code is at https://github.com/palashraks-afk/OffLoad)
- **Congressional Certification:** optional. The repo is public, so you can opt in.
- **Where did you do most of the coding:** At Home (change it if you did most of it somewhere else)
- **Date coding completed:** 10/26/2026
- **School or club project:** No
- **Teacher or mentor name and email:** leave empty
- **Ambassador email:** leave empty unless one referred you
- **Cover photo:** docs/cover/cover_home_600x800.jpg

## 1. What does your app do? (391 words)
Shift Ready answers a question that bus apps skip: will the bus work for my shift, and for the ride home? About 15 of every 100 US workers usually work evenings, nights or other hours outside the day (Bureau of Labor Statistics). In the San Bernardino County part of California's 23rd District, where 729,052 people live, about 20% live within a five-minute walk of a bus at noon, 1.8% at 10 PM and none at 11 PM. The district's 6,383 warehouse and transport jobs follow the same curve: 34% are near a bus at noon and none at 11 PM.

So a worker can take a job and learn on the first night that the last bus left an hour ago. The choices left are a ride they pay for or driving tired. In our district, 84% of the 201 people walking or biking who were killed from 2019 to 2023 died in the dark.

You enter where you live, where you work and when you must arrive, and you can add when the shift ends. The app checks the real Omnitrans, Metrolink, Victor Valley, Morongo Basin and Mountain Transit timetables and answers Yes, Partly or No, with the ride home and the last bus. If it is No, it shows the closest times that work and the next bus if you miss one. A trip map in the result shows each leg, and the Map tab shows hour by hour where service disappears.

The Employers tab starts with one question: which start times can your workers reach? It gives managers a start-time tool, five actions tied to the numbers, and a one-page brief for the transit agency. Workers get a note for the boss and a request to the agency built from their own trip.

It is for shift workers who do not drive or do not want to drive tired, the managers who schedule them, and the city and transit staff who plan service. Google Maps and Transit are built around leaving now, and job sites show a commute only one way. I did not find a free tool that starts from the end of a shift and checks the ride home.

In one line: Shift Ready checks your real shift against the real bus and train timetable, both ways, and helps workers, managers and cities fix the gaps.

## 2. What inspired you to create this app? (386 words)
I used to ride home from soccer practice and pass the bus stops. There were workers waiting at them. After I first noticed them, I started noticing it more often. Then I passed a memorial about a mile from my house for a person who died in a hit-and-run at night. That stayed with me. It made me wonder how people get home in the dark once the buses stop running, and whether anyone had ever told them that before they took the job.

So we looked up the timetables for our area. Most of the bus service is gone by 10 PM, and at 11 PM almost nothing runs. That matters because about 15 of every 100 US workers usually work evenings, nights or other hours outside the day (Bureau of Labor Statistics), and more than 790,000 of them rely on public transit (Urban Institute). In a CDC survey, 44% of night-shift workers slept six hours or less, against 28.8% of day workers. And in our district, 84% of the 201 people walking or biking who were killed from 2019 to 2023 died in the dark. Someone finishing a late shift has three choices: a bus that may not exist, a ride they have to pay for, or driving tired.

I also had the project look at what workers and managers say online. The stories repeat: a shift that ends after the last bus, a bus that never comes, a boss who does not know what the bus can and cannot do. I started out trying to match people with places they could actually reach by bus, and that mapping and matching idea turned into this app.

What I wanted was simple. A worker should be able to open a phone, type where they live and where the job is, and get a straight answer in a minute. A manager should be able to see which start times their people can reach. A city or a transit agency should have numbers to point at when someone asks for a later bus.

I chose my own district because the timetable data is public, I go to school here, and I could check every number myself. The same method works anywhere with a public timetable, so a student in another city could do the same for theirs.

## 3. What technical difficulties did you face programming your app? (381 words)
Our district is served by five transit agencies, and each publishes its timetable in its own file. Their ID numbers overlap, so a stop from one agency could be mistaken for another's. We fixed that by giving every agency its own prefix and then checking the merged timetable against the originals. Some cities' files list hundreds of one-day schedules, so for those we had to pick the typical weekday, Saturday and Sunday, and one city's file was 22 megabytes, which is heavy for a phone.

Searching "arrive by 10 PM" is harder than "leave at 10 PM," because the search has to run backward in time. We found a bug by comparing the planner against real scheduled trips, 138 random ones, in both directions. A stop with zero waiting time was being put in the wrong order. After the fix, every trip matched, and a second program written separately agreed with the first on 720 of 720 checks.

The crash data came with traps: hidden characters at the start of files, a different layout every year, and records with no location. The public map server refused our computer for a while, so we pulled the roads in smaller pieces from a mirror server and waited between requests.

We also wanted the numbers to hold up. The road-risk model finds 86% of later deaths in the top fifth of road length, against 65% for the best simple guess. At the top tenth it only ties. We kept both results on the page. We tested the model on a second district it had never seen, and the result was mixed, so the page says so. We tried a second, fancier model with a pass mark written down first, and it did not meet the mark, so we did not use it.

Smaller things took time too. Train stops far away made the map zoom out to Los Angeles, so the map now draws only stops in or near the district. Some buttons were too small for a thumb, and iPhones zoom in on small text boxes, so we checked every screen at phone sizes and made the buttons and boxes bigger.

Getting the wording right was its own problem. We took out claims we could not prove, such as anything about saving lives.

## 4. What improvements would you make if you were to create a 2.0 version of your app? (387 words)
Live delays come first. Right now the app uses the published timetable, tells people to be at the stop five minutes early, and links to the agency's live alerts and bus tracking. A 2.0 would show where the bus actually is and warn about strike and holiday days. That needs live data from the agencies, so I would ask Omnitrans and the other agencies for access and build it in as soon as they say yes.

Second, I would sit down with shift workers and managers, watch them use it, and fix whatever confuses them. I want to know whether it changes what people do: whether a worker checks a job before taking it, whether a manager moves a start time, whether an agency adds a later trip. I would try it first with one hospital or one warehouse and a transit agency, and write down what happened.

Third, the rest of the district. The app covers the San Bernardino County part of California's 23rd. I would add the small part near California City and more agencies, such as Kern Transit, Riverside Transit and Beaumont. I would also add the roads between the desert towns to the safety model, which only covers the populated areas, and retest it when the 2024 crash data comes out.

After that, a phone reminder that says "leave now to make your bus," and information about shade, lighting and shelters at stops, so a rider knows what the wait will be like at night or in the heat. I would like a native Spanish speaker to review every Spanish sentence, and I would add other languages that people in the district speak.

Fourth, I would let agencies see how many people asked for the same later bus, with no names attached, so a request counts for something. I would also finish Washington, DC, and add more cities, with a short guide so a volunteer or a student in any city can add their own timetable in an afternoon.

Last, I would keep the design as plain as possible. Everyone should be able to use it on the first try, on any phone, in a few seconds, in English or Spanish, whether they are a nurse finishing a night shift, a student with a part-time job, or a manager making next week's schedule.

## 5. Did you use AI? (answer Yes, then paste this) (385 words)
Yes. I used Claude Code, an AI assistant from Anthropic, to help build the app and to help research it. I want to explain exactly how, so the judges can decide for themselves.

Here is how the work split. I had the original plan and wrote the early code for the mapping and matching idea before I used AI. I no longer have those files. Claude Code helped me turn that idea into the working app. It wrote most of the current code under my direction: the data preparation, the trip planner, the road-risk model, the web pages, the English and Spanish text and the tests. It also helped me find sources, read public data, and draft and edit these written answers.

I chose the problem and the district. I decided which data to use and what the app should and should not claim. For example, it never says it saves lives, and we dropped a cost figure we could not trace to a real study. I told the assistant what to build, read the results, asked for changes when something looked wrong, and decided which numbers to show.

We checked the assistant's work in several ways. Every number in the app comes from a public source we can link to, and there are automated tests: a second program that agrees with the planner on 720 of 720 checks, 138 random real trips run in both directions, and a click-through test in a real browser. When a test failed or a result looked off, we fixed it or changed what the page says.

Every session with the assistant is written down in a public log in the project (docs/AI_USE_LOG.md), with the date, what I asked for and what it did. I can show the code and explain how the planner works if the judges ask.

The app also says plainly what it cannot do: it cannot see live delays, its Spanish still needs a native speaker's review, and the road model ranks roads and does not predict any person.

I know the contest rules say AI can support a project but cannot be all of the technical work. I would rather be plain about what the AI did than have anyone wonder. The idea, the direction and the decisions about what to say are mine.

## 6. What did you learn or take away from participating in the Congressional App Challenge? (395 words)
I learned that a bus timetable is public data, so anyone can check whether a job is reachable before taking it. I had walked and ridden past bus stops for years without thinking about what the schedule meant for the people waiting at them. Once I could see the numbers by the hour, the drop at night was hard to ignore.

I learned that a number is only useful if you say how it could be wrong. The road-risk model looked great at the top fifth of roads and only tied a simple guess at the top tenth. When we tested it on a district it had never seen, the result was mixed. I put all of that on the page. I think that makes the app more trustworthy, and I would do it again.

I learned that the people who ride the bus know things the data cannot show. The data cannot tell me what it feels like to wait at a stop in the dark, or whether a bus really shows up. That is why I want to talk to workers and managers next, and why the app sends people to the agency's live alerts and does not pretend to see delays.

I learned how much work goes into a plain answer. Behind the one word Yes, Partly or No there are five transit agencies, a planner that runs backward in time, tests, and a lot of fixes. Making the answer simple for a person took more effort than making it complicated.

I also learned how to work with an AI assistant. It was fast, but it made mistakes, and the only way to find them was to test its work and ask questions until it made sense to me. I learned to say what I wanted, check what came back, and keep a record of what the assistant did.

Most of all, I learned that a student can look at something in their own town, find real numbers, and build something that other people can use and ask for change with. I would like to see someone do the same for their own city.

I also learned that something I first noticed on the way home, workers at bus stops and a memorial on a road near my house, could turn into numbers I can check and a tool people can use.

## Notes for you
- Answer 2 uses what you told me: you rode home from soccer practice and passed bus stops with workers waiting, you started noticing it more often, and then you passed a memorial about a mile from your house for a person who died in a hit-and-run at night. If you remember a detail, such as the time of day, you can add one sentence. Keep it true.
- Answer 5 says what your own statement says: you had the original plan and wrote the early code for the mapping and matching idea before using AI, and those files are lost. If you find them, put them unchanged in original-code/ (see docs/ORIGINAL_CODE_SEARCH.md). The line that the AI wrote most of the current code stays, because the project log is public and judges can ask to see the code.
- Answer 6 is a draft in your voice. Change any sentence that is not how you feel.
- Numbers: 729,052 people; about 20% near a bus at noon, 1.8% at 10 PM, none at 11 PM; 6,383 warehouse and transport jobs; 201 people killed walking or biking in 2019 to 2023, 84% in the dark. Check them against the live app when you record the video.

## Final checks before pressing Save
- Video is public and the link starts with https.
- Every number you say in the video matches the live app that day.
- Cover photo is a 600x800 JPEG.
- Submit before Mon 2026-10-26 9:00 am Pacific (noon Eastern). Aim for 8:00.
