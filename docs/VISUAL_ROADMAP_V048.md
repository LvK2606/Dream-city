# Dream City visual roadmap v0.4.5–v0.4.8
Baseline: v0.4.4.4 da51d88c, CI 45876486095 PASS. This branch implements four stages; not accepted until final exact-SHA QA.
| Stage | Implementation | Evidence required |
|---|---|---|
| 0.4.5 | Original deterministic massing and setbacks, roof crowns, entrance details, existing photo panels retained | 16+ variants, contiguous floor volumes, bounds, aerial and street comparisons |
| 0.4.6 | Road edge and stop lines, six shelters, signal props, directional lanes and spaced deterministic traffic | No unbridged river crossing, lane spacing, street capture; traffic remains visual, not intersection simulation |
| 0.4.7 | Layered ridge terrain, four park paths, seeded rock scatter and stronger forest clustering | Flat road footprint, park path clearances, bounded rock placement, river and aerial captures |
| 0.4.8 | Distinct day/sunset/night lighting, original procedural night sky, pixel cap, non-emissive roofs, reflection invalidation on resize/teleport | 9/9 exact-SHA renders, full CI, compare visual quality and budgets against baseline |
The previous mobile/main/shadow/reflection limits remain in force; no thresholds increased. Keep docs/DEFERRED_VISUAL_BACKLOG.md for later improvements. No scanned trees, true impostors, full AAA model library, actual GPU performance or production browser acceptance claimed. A passing local CI is not release approval. Main stays unchanged until explicit acceptance.
