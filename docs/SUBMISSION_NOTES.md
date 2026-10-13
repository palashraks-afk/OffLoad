# Things only you can finish (honest status)

Done in code: pipeline, tests, resident / official / analyst screens, English + Spanish, print report card, CSV downloads, methods and about pages.

## Needs you
1. **Your story** (About page). `about.story` in `site/i18n/en.json` and `es.json` is empty on purpose. The section only appears once you fill it with something that really happened. Do not name patients or staff. Then run `python pipeline/bundle.py`.
2. **Rulebook** (plan open question 4): video length and format, written questions, rules on AI-assisted code. The About page currently states the AI-assistant use; edit it to match what the rules require.
3. **District and eligibility** (open questions 1 and 10): confirm which district you enter in and that it is on the participating list. By the Census map, Redlands Community Hospital is *not* in CA-33.
4. **Spanish review** by a trusted native speaker; then delete the notice in `about.translation`.
5. **Newer EMSA reports**: the newest report found was posted 2026-03-23 (February 2026 data). Check https://emsa.ca.gov/apot/ for later ones, drop the PDFs in `data/raw/CA/`, run `python pipeline/run.py`.
6. **Test with 3 people** who have not seen it, on a phone and a laptop, in two browsers; record Lighthouse scores.
7. Enable GitHub Pages (Settings -> Pages -> Source: GitHub Actions).

## Not built (cut honestly)
- Georgia / a second state: not parsed yet (the Compare page says so). `data/config/CA.json` documents the source, but the extractor is not config-driven yet, so "add a state by adding one config" is **not** true yet.
- Drive-time rings, virus/heat overlay, share card (stretch features).
- Urgent care: no licensing category exists in the source. The list is federally qualified health centers, with phone numbers but not hours.
- Outside forecast inputs (virus, heat, air) and month-of-year (not usable with 6 months).

## Findings worth saying in the video (all true in the data)
- Jan 2026: Community Hospital of San Bernardino 90th percentile 43:35 vs a 25-minute target, 66.6% on target; lower bound 20.2 hours (653 handoffs).
- Feb 2026: same hospital 47:08, 60.2% on target, 23.9 lower-bound hours.
- CA-33 total lower bound: 24.3 h (Dec), 34.1 h (Jan), 38.2 h (Feb), from the two listed hospitals only.
- The forecast does not beat "same as this month"; say that out loud.
- Two EMSA reports state one more exceeding hospital in their text than their tables list (Dec 2025: 163 stated, 162 listed; Feb 2026: 161 stated, 160 listed).
