# Putting Shift Ready on the internet and on phones

The site is plain files in `shiftready/web/` (no server). Everything it loads uses relative paths, so it works at a project address such as `https://<user>.github.io/OffLoad/`.

## 1. Publish with GitHub Pages (about 5 minutes)
1. Repo **Settings > Pages > Build and deployment > Source: GitHub Actions**. (Or: `gh api -X POST repos/<user>/OffLoad/pages -f build_type=workflow`.)
2. Push to `main`, or run **Actions > Test and deploy Shift Ready to GitHub Pages > Run workflow**. The workflow runs six checks first (`planner`, `crosscheck`, `ui_logic`, `locate`, `i18n`, `pwa`); a failure stops the deploy.
3. Open the address the workflow prints. Check: the Plan page loads, an example trip runs, the Map shows tiles, the language button works.

## 2. It installs like an app (PWA)
- Android/Chrome and desktop Chrome/Edge: an **Install the app** button appears in the page footer, or use the browser menu > Install.
- iPhone/Safari: Share > **Add to Home Screen** (the page shows this hint on iPhone).
- After the first visit it works with no signal for any trip, region or map data already opened. Map tiles need a connection. `offline.html` shows if the very first visit has no signal.
- Shortcuts on the installed icon: Plan a trip, Map, Employers.

## 3. If you want store listings (optional, not needed for the contest)
- **Google Play:** wrap the site with PWABuilder (pwabuilder.com) as a Trusted Web Activity. Needs a Google Play developer account (one-time fee) and a Digital Asset Links file served from the site.
- **Microsoft Store:** PWABuilder can package it too.
- **Apple App Store:** needs a native wrapper (for example Capacitor) and an Apple Developer membership (yearly fee), and Apple may reject thin web wrappers. The home-screen install above is the simple route.

## 4. Before you call it launched
- Try it on a real phone and in Safari and Firefox. Run Chrome DevTools > Lighthouse (Performance, Accessibility, PWA) and note the scores.
- The Omnitrans schedule file is valid until **2027-01-03**. When Omnitrans posts a new one, rebuild: `python shiftready/prep/run_all.py` then commit `shiftready/web/data`.
- **Map tiles and address search use free public services.** OpenStreetMap's tile servers and Nominatim have usage policies meant for light traffic. If many people will use the app, switch to a tile provider with an API key and a geocoder you host or pay for. Note the change on the About page.
- Cleveland's schedule file is about 16 MB (about 3 MB compressed on the wire); it loads only when someone picks that region.
- Spanish still needs a native-speaker review. Update the About page's AI-use note to match what you actually did.
