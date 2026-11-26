# Dream City — Deferred visual backlog / Các hạng mục đồ họa tồn đọng

Status: OPEN · recorded 2026-11-27 (ICT)
Reference candidate: v0.4.4.4 `da51d88c5035ad534526d1fd53773a757c56ac61`.
This file records debt, not acceptance. Do not close an item without reproducible evidence.

## Policy
- Finish the planned architecture, streets, landscape and rendering rebuilds without repeatedly polishing isolated cosmetic details.
- Revisit this backlog after the roadmap, before declaring final visual/AAA acceptance. A related later phase may close an item earlier, with evidence.
- Do not defer blockers: runtime/render corruption, regressions against agreed frame budgets, high/critical security findings, incomplete required QA or incorrect deployment SHA. Until resolved, the candidate is HOLD/NO-GO.
- Keep the existing main branch untouched until the candidate is approved. Preserve this file when merging or starting the next phase.

## Deferred improvements (not claimed complete)
| ID | Priority | Task | Acceptance evidence |
|---|---|---|---|
| VEG-01 | P1 | Real scanned 3D trees (CC0 or compatible verified license), including bark and leaf geometry; optimize offline with Meshoptimizer/glTF Transform. Existing photo leaf cards are not scanned tree meshes. | Source/license/hash inventory; 3+ distinct species; close-up and aerial comparisons; bounded GPU memory and triangles. |
| VEG-02 | P1 | True multi-angle baked impostors (octahedral or equivalent), alpha coverage, lighting and seamless screen-space LOD transitions. Current distant silhouettes are not baked 3D impostors. | Capture orbit and zoom across LOD thresholds; compare near silhouette and distant appearance; no obvious popping or halos; benchmark. |
| VEG-03 | P1 | Evaluate and integrate EZ-Tree if compatible with native instancing and photo assets; alternative original branching if the library cannot meet budgets. No package integration yet. | Pin tested version/license; deterministic geometry, multiple species, LOD/instancing and build tests; visual comparison. |
| VEG-04 | P1 | Ecological forest distribution (slope, elevation, density, species, clearings), realistic undergrowth, shrubs and grass variations, reduced visible card artifacts. v0.4.4.4 has an original limited understory only, not a mature ecosystem. | Street, hill and aerial shots; no intersections/road or river encroachment; distance/culling budgets. |
| VEG-05 | P2 | Foliage shading: transmission approximation, bark PBR, wind, stable shadow silhouettes, alpha overdraw reduction. | Day/sunset/night + camera-motion comparisons; no shader errors or budget regressions. |
| ARCH-01 | P1 | Real diverse building kits, roof and entrance details, less repeated massing, physically plausible materials. Existing panels do not constitute a full AAA library. | Several neighborhood archetypes, close-up assets and license inventory; measured LOD/material budget. |
| STREET-01 | P1 | Rich street furniture, intersection/traffic detail, more believable vehicle geometry and road textures. | Street-level and aerial QA; geometry/collision sanity; no budget regressions. |
| LAND-01 | P1 | Terrain layering, riverbank detail, rocks, natural relief, coherent vegetation and land use. | River, slope and full-city comparisons; no clipping or seams. |
| RENDER-01 | P1 | Refine day/night exposure, atmospheric depth, shadow and reflection quality, material realism; test motion for cached water lag. | Fixed-camera and moving-camera day/night evidence; separate main/shadow/reflection counters. |
| ASSET-01 | P2 | Expand licensed glTF asset library and offline KTX2/meshopt compression pipeline; quantify load time, VRAM and visual fidelity. | Reproducible build, asset provenance, compression ratios and device measurements. |

## Mandatory verification (not cosmetic debt)
| ID | Priority | Task | Exit condition |
|---|---|---|---|
| QA-01 | P0 | Exact SHA v0.4.4.4 full CI and visual evidence | All 9 captures/reports; no console errors; PASS budgets and security gate; inspect each screenshot. As recorded, CI run 45876486095 was in progress, no artifact yet. |
| QA-02 | P0 | Render actual deployed Vercel page in an authorized browser | Verify release SHA; save screenshots from the deployment itself, not just local CI; do not bypass authentication or report HTTP 200 as visual acceptance. |
| QA-03 | P0 final release | Real GPU/device benchmark, including representative Android mid-range device and desktop | Record hardware, browser, resolution, DPR, FPS/frametime p50/p95, memory, sustained run and quality settings; compare baseline. SwiftShader is not a physical GPU benchmark. If unavailable, mark unverified; no final performance/AAA claim. |
| QA-04 | P0 | Security and regressions | npm audit high/critical zero; verify Vite update; separate pass counts and compare like-for-like. |
| QA-05 | P0 final release | Overall visual comparison with Cities: Skylines II as reference, not a promise of parity | Side-by-side evaluation using lawful reference imagery and exact SHA captures; no proprietary assets copied; document remaining gaps. |

## Roadmap / revisit trigger
v0.4.5 Architecture Rebuild → v0.4.6 Street Rebuild → v0.4.7 Landscape Rebuild → v0.4.8 Rendering Rebuild → backlog review before v0.5/final acceptance.
Do not conflate permission to plan the next phase with visual acceptance of the current build. Each item may be closed only with date, commit SHA, test artifact, screenshots and measured result (or explicit user-approved scope change).

## Evidence
- Candidate CI: https://github.com/LvK2606/Dream-city/actions/runs/45876486095
- Candidate deployment: https://dream-city-jrjsaxbae-lekhoa20042606-8477s-projects.vercel.app
- Previous v0.4.4.3 CI: https://github.com/LvK2606/Dream-city/actions/runs/45874733925 (failed; four desktop captures).
- Previous v0.4.4.2 CI: https://github.com/LvK2606/Dream-city/actions/runs/45873029622 (failed desktop budget).
- OSS references: https://github.com/zeux/meshoptimizer ; https://github.com/dgreenheck/ez-tree ; https://github.com/donmccurdy/glTF-Transform ; https://github.com/Ctrlmonster/three-octahedral-impostor .
