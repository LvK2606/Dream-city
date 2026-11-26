# AAA Asset Pipeline — OSS review v0.4.10
Scope: targeted search of public GitHub repositories, package metadata and relevant documentation, not an exhaustive scan of all GitHub. Baseline v0.4.9.1 d9ada7ca6df889fe9153d310c7484812b2991115, CI 45880630327 PASS. Keep existing render budgets and one CI workflow. No proprietary Cities: Skylines II assets used.
| Repository | Finding | Decision |
|---|---|---|
| [dgreenheck/ez-tree](https://github.com/dgreenheck/ez-tree) | MIT, npm 1.1.0 peer three >=0.167, seeded branch skeleton, shared-skeleton LOD. Inspected library tree.js/options.js/presets/index and package metadata. | Pin package, build three prototypes from custom parameters; reuse Dream City CC0 leaf texture; normalized reduced geometry at near LOD, capped per species. |
| [Ctrlmonster/three-octahedral-impostor](https://github.com/Ctrlmonster/three-octahedral-impostor) | MIT WIP, octahedral sampling. | Original alternative: bake actual geometry from 3 axial cameras into per-species atlas, fixed crossed cards remain reflection-compatible; no view-dependent octahedral interpolation/depth. |
| [agargaro/octahedral-impostor](https://github.com/agargaro/octahedral-impostor) | WIP. | Research only, do not add dependency. |
| [ektogamat/webgpu-impostors](https://github.com/ektogamat/webgpu-impostors) | TSL/WebGPU atlas generation. | Research only; keep WebGL2. |
| [agargaro/instanced-mesh](https://github.com/agargaro/instanced-mesh) | Per-instance culling/LOD/BVH. | Retain native instancing and mobile frustum policy; no incompatible runtime migration. |
| [zeux/meshoptimizer](https://github.com/zeux/meshoptimizer) | MIT, attribute-aware simplification already installed. gltfpack native supports KTX2, npm version does not. | Preserve 0.24.0 panel simplification; enable loader Meshopt decoder. Actual compressed production asset not yet generated. |
| [donmccurdy/glTF-Transform](https://github.com/donmccurdy/glTF-Transform) | glTF offline dedup/prune/meshopt/KTX2, KTX encoding external. | Candidate for offline compression, not installed. |
| [KhronosGroup/glTF-Compressor](https://github.com/KhronosGroup/glTF-Compressor) | KTX2 and MeshOpt/Draco reference. | Research only. |
| [BinomialLLC/basis_universal](https://github.com/BinomialLLC/basis_universal) | Basis codec Apache-2.0, GPU transcode. | Use Three.js pinned bundled Basis decoder, local build copies WASM/JS; actual KTX2 texture encoding still pending. |
| [KhronosGroup/glTF-Validator](https://github.com/KhronosGroup/glTF-Validator) | glTF specification validation. | Candidate for asset ingestion gate. |
| [Poly-Haven/Public-API](https://github.com/Poly-Haven/Public-API) | CC0 assets, API credit required. | Retain existing verified photo leaves and facade; full scan geometry not yet integrated. |
| [yomotsu/vegetation](https://github.com/yomotsu/vegetation) | Stylized procedural plants/LOD. | Research only; fidelity mismatch. |
| [SkyeShark/SeedThree](https://github.com/SkyeShark/SeedThree) | WebGPU ecosystem concepts. | Research only; no migration. |
## Candidate acceptance
- 3 actual generated prototype pairs; 3 actual orthographic rendered axial views per species, 6 triangles per far representation, transparent alpha coverage reported, no fake bake.
- Near tree instance cap 2/3/5 per species low/medium/high; excess near demand uses current mid tier. Existing 4-level population accounting and thresholds unchanged, mobile culling padded as before. Asset pipeline must be loaded, not fallback, for CI to pass.
- Preserve previous 9 budgets, 20 captures, interaction reports and audit. New codec loader support does not prove actual KTX2 decoding. No full scanned tree, camera-facing impostor, KTX2 encoded asset or physical GPU result claimed. If any CI/visual regression: HOLD, correct and re-review.
