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

## v0.4.8 candidate update
Backlog retained in the development branch. Architecture, street, landscape and lighting received original incremental implementations; corresponding backlog items remain OPEN pending evidence and further quality review. v0.4.4.4 local CI 45876486095 completed PASS (17 tests, nine screenshots, audit zero); direct Vercel browser and physical GPU still unverified. Final candidate must undergo its own exact-SHA QA.


## v0.4.8 acceptance review — 2026-11-27 ICT
Candidate: `b97e3e931fba715b26fa31ce2e12560a48e84eaa`. Local CI [45877992509](https://github.com/LvK2606/Dream-city/actions/runs/45877992509) PASS, 21/21 tests, zero audit vulnerabilities, 9/9 captures and reports, zero budget failures. Artifact 15145781647 SHA256 d6b1a3950c9699c46dcc09155436076ec33f73cb39cfaeb922b305356d962211. Baseline artifact 15146185222 SHA256 29a3ae5315a5aeaf142c655c48d3334f38a8bea56de28546208cb46513aedecb. Both archives verified against GitHub digest, CRC and report build SHA; all nine image pairs reviewed as contact sheets. Vercel deployment READY, exact git SHA and release.json verified; actual deployed browser capture skipped on experimental branch. SwiftShader is software rendering, not physical GPU validation.

### Measured regression watch (peak per-scene draw calls, baseline → v0.4.8)
| Scene | Main/low calls | Reflection calls | Total calls | Peak triangles v0.4.8 |
|---|---:|---:|---:|---:|
| Desktop aerial day | 233 → 253 | 230 → 250 | 468 → 508 | 404200 |
| Desktop street day | 123 → 129 | 123 → 131 | 257 → 271 | 396460 |
| Desktop river sunset | 179 → 192 | 163 → 176 | 353 → 379 | 413578 |
| Desktop aerial night | 249 → 268 | 230 → 250 | 484 → 523 | 407250 |
| Desktop high street | 251 → 263 | 246 → 262 | 508 → 536 | 791443 |
| Mobile aerial day | 160 → 170 | 0 | 160 → 170 | 162696 |
| Mobile street day | 77 → 83 | 0 | 77 → 83 | 142568 |
| Mobile river sunset | 93 → 104 | 0 | 93 → 104 | 150046 |
| Mobile aerial night | 160 → 170 | 0 | 160 → 170 | 163404 |

All existing gates pass. Remaining headroom is tight for desktop aerial reflection (10 calls) and mobile river (6 calls). Maximum shadow calls 11, cap 40. Do not spend the remaining budget without profiling and batching improvements.

### Additional open issues from actual screenshot review and implementation audit
| ID | Priority | Finding / unfinished work | Acceptance criteria |
|---|---|---|---|
| ARCH-02 | P1 | 20 massing variants/247 volumes exist, but facade grid repetition, uniform blocks and red residential roofs still look generic; roof/entrance detail insufficient. ARCH-01 remains open. | Diverse real licensed building kits and materials across districts; close-up and skyline comparisons; maintain footprint and budget. |
| STREET-02 | P1 | New lane markings/6 shelters/32 signal props/46 lanes; road still looks sparse, no real signal logic, intersection conflict handling, pedestrians or varied vehicle bodies. | Visual street density plus deterministic intersection tests; signal phases, no collisions and connected routing; no claim of full traffic simulation until tested. |
| LAND-02 | P1 | Four parks and 112 rock instances exist; distant hills still look smooth, bare and patchy, vegetation remains card-like; riverbank hard edges. | Terrain layers/material blending, forest ecosystem, more natural shoreline; near and aerial comparisons without clipping. |
| RENDER-02 | P1 | Night blue sky and roof emission improved, but city lighting still mostly window emission, streets dark and some bright daytime/sunset water reflections look artificial; no moving-camera validation of reflection cache. | Plausible street illumination, consistent sky/environment, water and fog; day/night and motion captures; no reflection lag/popping. |
| PERF-01 | P1 | New detail increased draw calls in all nine scenes; mobile river 104/110, desktop aerial reflection 250/260. High mode peaks at 791443 triangles. | Profile per material/pass; batch and LOD assets; preserve or improve images and reduce bottleneck costs; verify on hardware. |
| UI-01 | P1 | Mobile bottom panel obscures a large part of the scene; screenshot coverage incomplete because HUD visible. | Collapsible mobile panel, clean capture mode, responsive input tests and UI-free comparison captures. |
| QA-06 | P0 final release | Current nine screenshots are fixed poses. No motion, camera sweep, gameplay input, long-session stability, physical-device or deployed-browser evidence. | Exact deployed SHA with authorized browser; motion/interaction/resize tests; sustained physical GPU run; screenshots without HUD; preserve raw reports and failure evidence. |
| SIM-01 | P1 roadmap scope | Visual alpha is not a functional Cities: Skylines II clone: construction, zoning, economy, services, citizens, traffic simulation and saves not implemented by these four visual phases. | Separate feature roadmap, gameplay tests and persisted state; no claim of parity. |

### Decision
GO for backlog review / further development only; local CI accepted, visual improvements are incremental and not AAA. NO-GO for final v0.5/production acceptance or merging main based solely on these results. Original VEG-01/02/03 and QA-02/03 remain open. Resolve final release gates, preserve measured baseline and inspect exact deployment before any final approval.

## v0.4.9 Backlog Review — candidate work, not yet accepted
- PERF-01: lightweight static material coalescing (192 m versus 96 m) without geometry or UV removal, inventory per material, preserve facade LOD region and prior draw/triangle gates. Requires exact-SHA regression measurement; coarser frustum culling could increase triangles.
- UI-01: mobile panel defaults collapsed, explicit accessible toggle, clean mode with Escape restore, safe-area and height constraints. Nine original and nine HUD-free screenshots plus rotated viewport QA.
- QA-06: add actual control clicks for pause/resume, camera preset transition, night switch and viewport resize, two interaction reports. Not continuous motion capture, sustained hardware or deployment verification.
- RENDER-02: refresh Water eye uniform even while planar reflection texture is cached. No assertion that reflection lag is eliminated.
- Remaining 23 items stay tracked; no closure until evidence. No scanned meshes, actual baked impostors, EZ-Tree, physical GPU or gameplay simulation added in this candidate. Do not merge main or declare v0.5 final acceptance.

## v0.4.9 review evidence and v0.4.9.1 corrective candidate
Base `202a0b03da3974d4dec809616b6d90762d44a627`: CI 45879015817 FAIL solely on desktop/mobile traffic resume assertions; 22 unit tests, build, security gate, nine render budgets and 20 images passed. Artifact 15146912724 digest sha256:3e225ca67bf142d51afdb772556417b9ca3065dffbf68de4c3b4d2d38950e165. Main calls aerial 253→198, street 129→113; aerial reflection 250→197; mobile 170→142 (aerial),83→78 (street),104→92 (river); no substantial visual regression. Interaction reports erroneously hardcoded passed:true; later samples showed motion but immediate resume assertion was not synchronized to post-click frames. Mobile landscape fell out of width-only compact breakpoint.
- QA-06: require two completed fresh frames AFTER pause/resume, compare actual normalized vehicle position (including wraparound); preserve failure evidence and per-assertion PASS/FAIL. Add positive and negative unit cases. No test suppression.
- UI-01: compact breakpoint covers short landscape; collapse on orientation change, bounded scrollable side panel, explicit open/close and geometry assertions.
- PERF-01: preserve render geometry, static batching, and all existing budgets. No changes to workflow structure or traffic simulation. Retain all other backlog items. Await exact-SHA CI and visual comparison before closing these issues or proceeding to AAA assets.

## v0.4.9.1 accepted for next development stage
CI 45880630327 PASS on d9ada7ca6df889fe9153d310c7484812b2991115, 20 captures, 9 budgets, 19 interaction assertions, zero audit vulnerabilities. Artifact 15148055119 SHA256 4b75e5c6adfcbe4a1c918a7c7c79b019f6e4d6199b37f01d3ec4e55a4a5f0179. GO for AAA Asset Pipeline development only. Physical GPU/deployed-browser gates remain open.
## v0.4.10 asset pipeline candidate
VEG-03 pinned EZ-Tree 1.1.0, custom seeded prototypes and 3 axial baked views per species; VEG-02 partial (fixed cross cards, not full view-dependent octahedral). ASSET-01 decoder support enabled; actual KTX2 encoder/compressed input and full scanned tree VEG-01 remain OPEN. All existing backlog retained. See AAA_ASSET_PIPELINE.md. No closure before CI and visual evidence.

## v0.4.10.1 corrective candidate
CI 45882548893 and Vercel GoyxXtUdRAg5T8nPJeDTziW3UXjH failed before build on browser-only eager EZ-Tree texture import in Node. Exact release source also lacks generateLODs. Browser-only dynamic import and released generate API, same-geometry leaf-pair reduction, Node-safe regression tests. Existing gates unchanged; VEG-02/03 remain open pending visual evidence. See AAA_ASSET_PIPELINE.md.

## v0.4.10.1 acceptance and v0.4.10.2 candidate
CI 45883035507 PASS, 27 tests, 9 budgets, 20 captures, 19 interaction assertions, zero audit vulnerabilities; artifact 15148158685 sha256 31a61c3f8da7bc9fc9f22f4b0d95cb423a2f665e26434a817467feb7a6a86d7e. EZ-Tree works, crossed-card visibility and thin canopy remain; GO for further asset work, not stage 3. v0.4.10.2 adds WebGL2 per-instance camera-facing 8x4 azimuth/elevation atlas (32 views, 2 triangles, 4-way alpha-weighted blend) including below-horizon reflection views; actual UASTC KTX2 encoding of grass diffuse, runtime decode and applied texture gate; full CC0 Poly Haven tree_small_02 model acquisition, offline glTF-Transform 4.2.1/meshopt optimization and runtime bake for species 0 only. Near geometry remains EZ-Tree; full source photogrammetry provenance unverified, so VEG-01 stays OPEN. Full octahedral/depth parallax, consistent source across LODs, GPU timing and deployed browser remain OPEN. Source size and triangle budgets enforced; failures are explicit in manifests and CI, never counted as successful fallback. Existing CI and render budgets unchanged. Must inspect screenshots and source transition before acceptance.

## Coverage correction candidate (2026-11-27)
Parent 5fb331d780222b54960ad42934b91a02e45cc11e, CI 45885522578 PASS, Vercel success; prior visual HOLD due to thin/pale distant foliage. Fixed cutoff after four-view alpha blend discarded fractional coverage. Candidate uses 4x4 ordered coverage sampling with opaque surviving fragments, retaining weighted color and existing depth behavior. No CI thresholds changed. Inspect distant foliage, aliasing during camera motion and night/reflection captures before acceptance. Intermediate LOD source mismatch, scan provenance, depth parallax, PBR compression, deployment browser and physical GPU remain OPEN. No claim of visual improvement before exact-SHA evidence.
