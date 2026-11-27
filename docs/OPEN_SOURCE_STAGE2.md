# Stage 2 open-source investigation

Search terms: threejs vegetation trees LOD; octahedral impostor threejs; photogrammetry tree CC0 gltf; threejs forest instanced foliage; foliage alpha coverage mipmap; tree mesh simplification; photogrammetry trees dataset; tree point cloud reconstruction; tree 3d scan assets; foliage rendering webgl.

| Repository | License verified from GitHub metadata | Decision |
|---|---|---|
| [ektogamat/octahedral-impostor-component](https://github.com/ektogamat/octahedral-impostor-component/tree/f94290693e0966dbb2e2dba89591734753a4582f) | MIT | Read source and adapt technique with original WebGL2 implementation; no WebGPU migration. |
| [dgreenheck/ez-tree](https://github.com/dgreenheck/ez-tree) | MIT | Existing procedural source retained. |
| [zeux/meshoptimizer](https://github.com/zeux/meshoptimizer/tree/v0.24) | MIT | Existing attribute-aware simplification retained. |
| [donmccurdy/glTF-Transform](https://github.com/donmccurdy/glTF-Transform) | MIT | Existing build optimization retained. |
| [KhronosGroup/glTF-Validator](https://github.com/KhronosGroup/glTF-Validator) | Apache-2.0 | Existing validation retained. |
| [BinomialLLC/basis_universal](https://github.com/BinomialLLC/basis_universal) | Apache-2.0 | Existing KTX2 policy retained. |
| [koerye/foliage-mass-prototype](https://github.com/koerye/foliage-mass-prototype) | NOASSERTION | No code reuse until license verified. |
| [abenoharukas/forest-scene](https://github.com/abenoharukas/forest-scene) | not established | No code reuse. |
| [Matt1Up/tree-photogrammetry-dataset](https://github.com/Matt1Up/tree-photogrammetry-dataset) | CC BY 4.0 | Actual photographic provenance, raw 15.1GB, not ready GLB. Future offline reconstruction, attribution and validation needed. |
| [ruoppa/fgi_emit](https://github.com/ruoppa/fgi_emit) | MIT (code metadata) | Airborne tree segmentation dataset, not game-ready mesh. |
| [project-lightlin/SmartQSM](https://github.com/project-lightlin/SmartQSM) | AGPL-3.0 | Reconstruction research, not bundled. |
| [marktube/TreePartNet](https://github.com/marktube/TreePartNet) | not established | Point cloud decomposition, not drop-in asset. |
| [cjauvin/pypetree](https://github.com/cjauvin/pypetree) | not established | Point cloud reconstruction, not drop-in asset. |

Search is targeted, not exhaustive across GitHub. Do not count research candidates as integrated features. No proprietary Cities: Skylines II content. The current game target is still HOLD until render evidence.
