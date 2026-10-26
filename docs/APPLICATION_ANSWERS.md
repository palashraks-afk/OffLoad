# Congressional App Challenge 2026: answers for the full application (final draft, 2026-10-26)

Each answer is 380 to 400 words. Every fact is from the live app, the research notes in docs/research, or what you told me. Anything I could not know is not in here, so nothing is left in brackets. Read each answer out loud once and change any word that does not sound like you. Add a detail only if it is true.

## Short fields
- **App name:** Shift Ready
- **Languages:** JavaScript, Python. Tick "Other" for HTML and CSS.
- **Platform:** Web
- **Video link:** your public https link, once the video is uploaded
- **Link to project (optional):** https://palashraks-afk.github.io/ShiftReady/ (the code is at https://github.com/palashraks-afk/ShiftReady)
- **Congressional Certification:** optional. The repo is public, so you can opt in.
- **Where did you do most of the coding:** At Home (change it if you did most of it somewhere else)
- **Date coding completed:** 10/26/2026
- **School or club project:** No
- **Teacher or mentor name and email:** leave empty
- **Ambassador email:** leave empty unless one referred you
- **Cover photo:** docs/cover/cover_final_600x800.jpg

## 1. What does your app do?
Shift Ready checks whether the bus will work for a shift and for the ride home. About 15 of every 100 US workers work evenings, nights or other hours outside the day (Bureau of Labor Statistics). In the San Bernardino County part of California's 23rd District live 729,052 people. About 20% of them live within a five minute walk of a bus at noon. At 10 PM it is 1.8%, and by 11 PM no neighborhood in the district has a bus within that walk. The district has 6,383 warehouse and transport jobs. 34% of them are near a bus at noon and none at 11 PM.

A worker can take a job and find out on the first night that the last bus is gone. The choices are a ride they pay for or driving tired. In my district 84% of the 201 people walking or biking who were killed from 2019 to 2023 died in the dark.

You enter where you live, where you work and when you must arrive. You can add when the shift ends. The app checks the real timetables of Omnitrans, Metrolink, Victor Valley, Morongo Basin and Mountain Transit. It answers Yes, Partly or No and shows the ride home and the last bus. If the answer is No it shows the closest times that work and the next bus if you miss one. A map in the result shows every leg of the trip. The Map tab shows hour by hour where service disappears.

The Employers tab starts with one question: which start times can your workers reach? It gives managers a start time tool, five actions tied to the numbers and a one page brief for the transit agency. Workers get a note for their boss and a request to the agency.

It is for shift workers who do not drive or do not want to drive tired. It is for the managers who schedule them and for the city and transit staff who plan service. Google Maps and Transit are built around leaving now. Job sites show a commute only one way. I did not find a free tool that starts from the end of a shift and checks the ride home. Shift Ready checks your real shift against the real bus and train timetable both ways and helps workers, managers and cities fix the gaps.

## 2. What inspired you to create this app?
I used to ride home from soccer practice and pass the bus stops. There were workers waiting at them. After I first noticed them I started noticing it more often. Then I passed a memorial about a mile from my house for a person who died in a hit-and-run at night. That stayed with me. I started wondering how people get home in the dark once the buses stop running, and whether anyone tells them that before they take a job.

So I had the assistant pull up the timetables for my area. Most of the bus service is gone by 10 PM and at 11 PM almost nothing runs. About 15 of every 100 US workers usually work evenings, nights or other hours outside the day (Bureau of Labor Statistics) and more than 790,000 of them rely on public transit (Urban Institute). In a CDC survey 44% of night-shift workers slept six hours or less, against 28.8% of day workers. In my district 84% of the 201 people walking or biking who were killed from 2019 to 2023 died in the dark. Someone finishing a late shift can take a bus that may not exist, pay for a ride or drive tired.

I also had the project look at what workers and managers say online. The same stories come up. A shift ends after the last bus. A bus never comes. A boss does not know what the bus can and cannot do. I first tried to match people with places they could reach by bus. That mapping and matching idea became this app.

I wanted a worker to be able to open a phone, type where they live and where the job is, and get an answer in a minute. I wanted a manager to see which start times their people can reach. I wanted a city or a transit agency to have numbers to point at when someone asks for a later bus.

I chose my own district because the timetable data is public, I go to school here and I could check every number myself. The same method works anywhere with a public timetable. A student in another city could do the same for theirs. I think that matters, because the people who ride the bus at night are easy to miss until you look for them.

## 3. What technical difficulties did you face programming your app?
My district is served by five transit agencies and each publishes its timetable in its own file. Their ID numbers overlap, so a stop from one agency could be mistaken for another's. I had the assistant give every agency its own prefix and then check the merged timetable against the originals. Some cities' files list hundreds of one-day schedules, so the assistant and I had to pick the typical weekday, Saturday and Sunday.

Searching "arrive by 10 PM" is harder than "leave at 10 PM" because the search has to run backward in time. A bug turned up when the planner was compared against 138 random real trips in both directions. A stop with zero waiting time was in the wrong order. After the fix every trip matched. A second program written separately agrees with the first on 720 of 720 checks.

The crash data had traps: hidden characters at the start of files, a different layout every year and records with no location. The public map server refused my computer for a while. The roads were pulled in smaller pieces from a mirror server with waits between requests.

I also wanted the numbers to hold up. The road-risk model finds 86% of later deaths in the top fifth of road length, against 65% for the best simple guess. At the top tenth it only ties. I kept both results on the page. I had the model tested on a second district it had never seen. The result was mixed so the page says that. I also had a second, fancier model tried with a pass mark written down first. It did not meet the mark so I did not use it.

Smaller things took time too. Train stops far away made the map zoom out to Los Angeles, so now the map draws only stops in or near the district. Some buttons were too small for a thumb and iPhones zoom in on small text boxes. I had every screen checked at phone sizes and the buttons and boxes made bigger.

The last problem was wording. I took out claims I could not prove, like anything about saving lives, and I dropped a cost figure that could not be traced to a real study. The app now says what it cannot do: it cannot see live delays and its Spanish still needs a native speaker's review.

## 4. What improvements would you make if you were to create a 2.0 version of your app?
The first change would be live delays. Right now the app uses the published timetable, tells people to be at the stop five minutes early and links to the agency's live alerts and bus tracking. Version 2.0 would show where the bus actually is and warn about strike and holiday days. That needs live data from the agencies. I would ask Omnitrans and the others for access and build it in as soon as they say yes.

Next I would sit down with shift workers and managers, watch them use the app and fix whatever confuses them. I want to know whether it changes what people do: whether a worker checks a job before taking it, whether a manager moves a start time, whether an agency adds a later trip. I would try it first with one hospital or one warehouse and a transit agency and write down what happened.

Then I would cover the rest of the district. The app covers the San Bernardino County part of California's 23rd. I would add the small part near California City and more agencies such as Kern Transit, Riverside Transit and Beaumont. I would also add the roads between the desert towns to the safety model, which only covers the populated areas, and test it again when the 2024 crash data comes out.

I would add a phone reminder that says "leave now to make your bus" and information about shade, lighting and shelters at stops, so a rider knows what the wait will be like at night or in the heat. A native Spanish speaker should review every Spanish sentence. I would also add other languages people in the district speak.

Agencies should be able to see how many people asked for the same later bus, with no names attached, so a request counts for something. I would finish Washington, DC and add more cities, with a short guide so a volunteer or a student in any city can add their own timetable in an afternoon.

Last, I would keep the design simple. Everyone should be able to use it on the first try on any phone in a few seconds, in English or Spanish, whether they are a nurse finishing a night shift, a student with a part-time job or a manager making next week's schedule.

## 5. Did you use AI? (answer Yes, then paste this)
Yes. I used Claude Code, an AI tool from Anthropic, for part of this project. I did a good share of the work myself and I am glad to explain how it split.

I came up with the idea and the plan. I wrote early code for the mapping and matching idea. I chose the problem, my district and the questions the app answers. I found the public bus timetable data for some of the cities, and Claude Code and I built the intake system that pulls it in through the agencies' download links and APIs. I decided which data to use and what the app should say and not say. For example it never claims to save lives, and I dropped a cost figure that could not be traced to a real study. I read every result, asked for changes when something looked wrong and decided which numbers to show.

Claude Code wrote most of the current code under my direction: the trip planner, the road-risk model, the web pages, the English and Spanish text and the tests. It also helped me find sources and draft and edit these answers.

I checked the work in several ways. Every number in the app comes from a public source I can link to. There are automated tests: a second program that agrees with the planner on 720 of 720 checks, 138 random real trips run in both directions and a click-through test in a real browser. When a test failed or a result looked off it was fixed or I changed what the page says.

Every session with Claude Code is written down in a public log in the project (docs/AI_USE_LOG.md) with the date, what I asked for and what it did. I can show the code and walk through how the planner works if the judges ask.

The app says what it cannot do yet. It cannot see live delays, its Spanish still needs a native speaker's review and the road model ranks roads but does not predict any person.

I know the contest rules say AI can support a project but cannot be all of the technical work. The idea, the direction and the decisions about what to say are mine. Some of my original code from the first version was lost, so I rebuilt those parts with Claude Code.

## 6. What did you learn or take away from participating in the Congressional App Challenge?
I learned that a bus timetable is public data, so anyone can check whether a job is reachable before taking it. I had walked and ridden past bus stops for years without thinking about what the schedule meant for the people waiting at them. Once I could see the numbers by the hour the drop at night was hard to ignore.

I learned that a number is only useful if you say how it could be wrong. The road-risk model looked good at the top fifth of roads and only tied a simple guess at the top tenth. When it was tested on a district it had never seen the result was mixed. I put all of that on the page. I think that makes the app easier to trust and I would do it again.

I learned that the people who ride the bus know things the data cannot show. The data cannot tell me what it feels like to wait at a stop in the dark or whether a bus really shows up. That is why I want to talk to workers and managers next, and why the app sends people to the agency's live alerts and does not pretend to see delays.

I learned how much work goes into a simple answer. Behind the words Yes, Partly or No there are five transit agencies, a planner that runs backward in time, tests and a lot of fixes. Making the answer simple for a person took more effort than making it complicated.

I also learned how to work with an AI assistant. It was fast but it made mistakes, and the only way to find them was to test its work and ask questions until it made sense to me. I learned to say what I wanted, check what came back and keep a record of what the assistant did.

Most of all I learned that a student can look at something in their own town, find real numbers and build something other people can use to ask for change. Something I first noticed on the way home, workers at bus stops and a memorial on a road near my house, turned into numbers I can check and a tool people can use. I would like to see someone do the same for their own city.

## Notes for you
- Answer 2 uses what you told me: you rode home from soccer practice and passed bus stops with workers waiting, you started noticing it more often, and then you passed a memorial about a mile from your house for a person who died in a hit-and-run at night. If you remember a detail, such as the time of day, you can add one sentence. Keep it true.
- Answer 5 says what your own statement says: you had the original plan and wrote the early code for the mapping and matching idea before using AI, and those files are lost. If you find them, put them unchanged in original-code/ (see docs/ORIGINAL_CODE_SEARCH.md). The line that the AI wrote most of the current code stays, because the project log is public and judges can ask to see the code.
- Answer 6 is a draft in your voice. Change any sentence that is not how you feel.
- Numbers: 729,052 people; about 20% near a bus at noon, 1.8% at 10 PM, none at 11 PM; 6,383 warehouse and transport jobs; 201 people killed walking or biking in 2019 to 2023, 84% in the dark. Check them against the live app when you record the video.

## Final checks before pressing Save
- Video is public and the link starts with https.
- Every number you say in the video matches the live app that day.
- Cover photo is a 600x800 JPEG.
- Deadline: sources disagree. The official rules PDF and most House office pages say Mon 2026-10-26 at 12:00 pm Eastern (9:00 am Pacific). The student registration page says 9:00 pm Eastern (6:00 pm Pacific). Treat 9:00 am Pacific as the real deadline and submit by 8:00 am. If the portal shows a later time, that is only extra margin.
