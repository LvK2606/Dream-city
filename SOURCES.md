# Research and attribution
Actual dependency: [Three.js r180](https://github.com/mrdoob/three.js/tree/r180), MIT; uses built-in Sky, Water, OrbitControls, RoomEnvironment, EffectComposer, SSAO, Bloom, OutputPass, BufferGeometryUtils. Dependency retains upstream MIT license.
Original code influenced by [Procedural-Cities](https://github.com/lanmower/Procedural-Cities) (seeded lots and variable building forms) and [THREE.Terrain](https://github.com/IceCreamYou/THREE.Terrain) (seeded terrain/foliage ideas); no upstream code copied.
[pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) and [meshoptimizer](https://github.com/zeux/meshoptimizer) reviewed previously; not installed; existing Three.js composer and batching used instead. Mesh compression remains future work.
Other previously identified repositories (not integrated; source and license review outstanding): ZyFou/ProceduralTerrains, FarazzShaikh/Terrain-Builder, w3reality/three-geo, jeantimex/precomputed_atmospheric_scattering, gabereiser/earth, hxtnv/citygen, Ppratik765/Ocean-simulation. No claim of exhaustive search or complete integration. All city geometry and textures in this release are original procedural assets.

## V0.2 research
[EZ-Tree](https://github.com/dgreenheck/ez-tree) and [glTF-Procedural-Trees](https://github.com/donmccurdy/glTF-Procedural-Trees): read README, branch/canopy hierarchy and detail tiers inspired original instanced branches and canopy clusters. No package or assets copied. [three-csm](https://github.com/StrandedKitty/three-csm): reviewed near/far shadow split, not integrated. [Three.js GTAOPass r180](https://github.com/mrdoob/three.js/blob/r180/examples/jsm/postprocessing/GTAOPass.js) directly used from existing MIT dependency for high quality. [Water r180](https://github.com/mrdoob/three.js/blob/r180/examples/jsm/objects/Water.js): reviewed recursive reflection rendering, original throttling and non-reflective low tier. [THREE.Terrain material source](https://github.com/IceCreamYou/THREE.Terrain/blob/gh-pages/src/materials.js): slope/height concept, original vertex tint only, not full texture splatting. No additional external dependencies.

## V0.3
[Poly Haven Public API](https://github.com/Poly-Haven/Public-API): build-time downloads, manifest includes provenance and SHA-256, checks publisher MD5 when provided. Assets CC0: [Asphalt 02](https://polyhaven.com/a/asphalt_02), [Leafy Grass](https://polyhaven.com/a/leafy_grass), [Dirty Concrete](https://polyhaven.com/a/dirty_concrete), [Kloofendal 38d Partly Cloudy (Pure Sky)](https://polyhaven.com/a/kloofendal_38d_partly_cloudy_puresky). Runtime only serves local files. Fallback explicitly reported, no claim of successful assets until QA. [Kenney Car Kit](https://kenney.nl/assets/car-kit) researched but low-poly aesthetic not used. Original vehicle geometry and gable roofs. Meshoptimizer remains pending; spatial chunks allow frustum culling without introducing dependencies.

Asset schema compatibility: normalize channel keys and select JPG/PNG from metadata; if missing, attempt official CDN path and record computed SHA-256. Publisher MD5 is checked when supplied; fallback has no publisher digest. Credit: Powered by Poly Haven (see asset source links above).

## V0.4
[BuildingGeneratorThreeJS](https://github.com/achrefelouafi/BuildingGeneratorThreeJS), MIT: reviewed LICENSE and docs/BUILD_SYSTEM.md; modular facade and independent window cells inspired original implementation, no kit/source copied. CC0 Poly Haven [Brick Wall 001](https://polyhaven.com/a/brick_wall_001) and [Concrete Tile Facade](https://polyhaven.com/a/concrete_tile_facade) added. Real glTF buildings remain pending.

## V0.4.1
Joost van Dongen's 2008 interior mapping paper and codedgar/three-fenestra (MIT, README and license reviewed) informed a new original, texture-free room-box shader. No external shader or assets copied. One quad per opening, procedural frame, room surfaces, simplified far-distance shading. Not a full 3D room or physically accurate glass.

## V0.4.2 (experimental branch)
Three.js r180 LOD.js source reviewed: distance hysteresis. meshoptimizer README reviewed: simplification error and GPU locality; not installed. Original facade-specific LOD uses one grid quad per wall, consistent seeded night lighting, spatial region hysteresis and no added texture. Poly Haven Modular Urban Apartments Facade (CC0) identified as a future source; not downloaded or integrated in this branch. Raw kit must be split and optimized before repeated city instancing.

## V0.4.3 experiment
Poly Haven Modular Urban Apartments Facade (CC0), official API and individual glTF dependencies; script verifies host and upstream MD5 when available, records SHA256. Runtime selects bounded planar mesh components, never repeats full kit. Pilot instanced accents on 12 buildings, not full model library. Day background uses the previously downloaded photo HDRI; procedural sky retained for sunset/night. Visible credit added. Successful asset import and visual quality require runtime QA.

## V0.4.4.1
Poly Haven Tree Small 02 (CC0): https://polyhaven.com/a/tree_small_02 — candidate photographic diffuse and opacity leaf maps, fetched from official API, hashed, and composited into original foliage cards. Full source model is about 5M tris and is not ingested. Runtime reports actual load and opacity coverage, not merely asset availability. Procedural fallback remains explicit; CI requires photographic maps. Original projected-size LOD and spatial instancing.

## V0.4.4.2
Three.js r180 InstancedMesh (MIT existing dependency) used for global species/LOD batches; CPU conservative sphere-frustum compaction in low mode only. No WEBGL_multi_draw dependency. Original near branch and forest placement refinements; no external model geometry or Meshoptimizer yet. Photo leaf asset retained.

## V0.4.4.3 targeted OSS survey and implementation
Three.js r180 Water.js (MIT) inspected: nested render, mirror camera, shadow update suppression; original wrapper now measures the actual counter delta and throttles moving/idle updates separately. meshoptimizer v0.24 (MIT) integrated as pinned npm dependency; attribute-aware simplification applied to the real modular facade panels with a strict error cap and unchanged UV buffers. agargaro/instanced-mesh (MIT) reviewed per-instance culling/LOD concepts, current native instancing retained to avoid migration. dgreenheck/ez-tree (MIT) reviewed geometry hierarchy and raw geometry LOD API; no package integrated yet. donmccurdy/glTF-Transform (MIT) reviewed for offline asset pipeline; full scanned tree optimization pending. Ctrlmonster/three-octahedral-impostor (MIT) experimental and not selected for release. stats-gl reviewed for future physical GPU timing; no dependency added. No proprietary assets or copied upstream source. Survey is targeted, not exhaustive.

## V0.4.4.4
Three.js r180 WebGLShadowMap.js and WebGLRenderer.js reviewed. Original depth-only static caster batching retains identical triangles, proxies visible solely during shadow renderer traversal. Original bent near leaf cards and local seeded shrub/grass instancing; no EZ-Tree package or scanned tree mesh claimed. Vite 6.4.6 upgrade verified against upstream release package metadata.

## v0.4.5–v0.4.8
Original procedural building massing, streets/traffic lanes, park/outcrop layout and night sky; reuse existing Three.js r180 MIT and Poly Haven CC0 assets, Meshoptimizer MIT. No new proprietary assets or source copying.

## v0.4.10 OSS asset adapter
EZ-Tree 1.1.0 (MIT, Daniel Greenheck) pinned npm, original adapter; photo leaves remain Poly Haven CC0. Three.js r180 MIT KTX2Loader, Meshopt decoder and bundled Basis transcoder (Apache-2.0). Review matrix in docs/AAA_ASSET_PIPELINE.md. No upstream source copied outside library dependency. Decoder readiness is not compressed-input validation.

## v0.4.10.1
EZ-Tree exact v1.1.0 release commit 89083a033a354856acae05f8856bf37c6ebcfa9b inspected; generate() API and eager texture import verified. Original indexed leaf-pair thinning adapter uses released geometry, not unreleased generateLODs().

## v0.4.10.2
Poly Haven tree_small_02 by Rico Cilliers (CC0; full photoreal authored asset, scan provenance unverified), https://polyhaven.com/a/tree_small_02. glTF-Transform 4.2.1 MIT and Meshoptimizer 0.24.0 MIT. Basis Universal 1.16.3 encoder via HacksawStudios/basisu npm wrapper (ISC; upstream Apache-2.0). Original WebGL2 directional atlas shader, inspired by documented octahedral atlas techniques in Ctrlmonster/three-octahedral-impostor and ektogamat/octahedral-impostor-component; no external shader copied. Source hashes and generated manifests; no proprietary assets.

## v0.4.10.3
Original bounded coverage filter and shared LOD2/3 atlas; existing Poly Haven CC0 material maps encoded with existing Basis Universal wrapper, linear normals/roughness. No additional third-party source.

## v0.4.10.4
Khronos glTF Validator 2.0.0-dev.3.10 (Apache-2.0), https://github.com/KhronosGroup/glTF-Validator; original volumetric baked cards, Basis ETC1S/UASTC channel policy. No new proprietary assets.

## v0.4.10.5
Original depth-assisted reprojection and relief proxy. Verified Three.js r180 MeshDepthMaterial BasicDepthPacking shader (1-fragCoordZ), https://github.com/mrdoob/three.js/blob/r180/src/renderers/shaders/ShaderLib/depth.glsl.js (MIT); uses existing engine API, no new dependencies or copied shader.

## v0.4.10.6
Original shader filtering, bounded mip sampling and QA mode A/B; existing sources and licenses unchanged.

## v0.4.10.7
Source-derived patch geometry, silhouette pixel QA and mip cell clamp are original. Poly Haven tree_small_02 CC0 page tags Geometry Nodes; photogrammetry unverified. No new external assets.

## v0.4.10.8
Original depth-derived mask and bounded proxy calibration; no new assets or dependencies.

## v0.4.10.9
Technique reference: Anderson Mancini, ektogamat/octahedral-impostor-component, MIT, https://github.com/ektogamat/octahedral-impostor-component/tree/f94290693e0966dbb2e2dba89591734753a4582f. Original WebGL2 adaptation, no copied upstream component. See docs/OPEN_SOURCE_STAGE2.md for investigation and source decisions.

## v0.4.10.10
Pine Sapling Small, https://polyhaven.com/a/pine_sapling_small, CC0; Rico Cilliers (model), Rob Tuytel (photography). Source authored model, scan not verified. Build manifest must validate exact download and optimized GLB. Original hillside infill.
