# Recommended idea (decision record, 2026-10-12)

## One sentence (the video requires this)
In San Bernardino County 547 people walking or biking were killed from 2019 to 2023 (217 inside CA-33, rising from 33 to 59 a year), and cities can't easily tell where the next death will happen or which proven fix to fund first.

## Idea
A free tool that (1) maps every pedestrian and cyclist death, (2) uses a model trained on road features to estimate risk at places that have NOT had a death yet, tested on later years against the simple "past hotspots" baseline, (3) matches each high-risk place to the proven fix (lighting, crosswalk visibility, beacon, refuge island) with an expected-crashes-prevented range from published crash-reduction factors, and (4) produces a one-page ranked brief a city can use in a safety grant application. Residents get a plain-language, Spanish-capable map. Any US city can be loaded because the data (FARS, OpenStreetMap, HSIP/SS4A programs) is national.

## Why this and not the others
- Real, rising, local problem with primary-data evidence (docs/research/04).
- A specific measured finding that justifies the approach: spot-level hotspots capture only 3% of later deaths in the county.
- Concrete decision-makers with money (HSIP, SS4A, the city's streetlight program).
- Not alarm- or heat-based; not a crowded winner lane in the sample (but see novelty caveat).
- Rejected: OffloadWatch (AI-written, not eligible, county dashboards exist), heat/bus-stop shade, outage warning (student rejected), care-gap finder (a resource finder already won), vaccination (weak nationwide).

## Honest score estimate (best case if executed well; realistic range is lower)
District 5 | Impact 4 | Novel 3-4 | Works 4 | ML/biomed 4 | Nationwide 5 | Mapping 5 | Fit 4-5.
Novelty caveat: free high-injury-network tools (NHAT) and past winners (BikeBetter) exist. The novel parts are the future-years backtest, the risk model for places with no deaths yet, the fix-matching with benefit ranges, and the grant-ready brief.

## Risks
- The model may not beat the corridor baseline. Report that honestly; a clear negative result with a good baseline is still a credible project.
- FARS has fatal crashes only; California injury data (TIMS/SWITRS) needs separate access and is California-only.
- Exposure: counts of deaths are not risk per walker; say so.
- Do not claim lives saved. Say "expected crashes prevented, based on published crash-reduction factors, with ranges".
- Contest rules: the student writes the core code; AI help must be limited and disclosed (docs/research/01).
- Need a true personal reason from the student for the video; do not invent one.
