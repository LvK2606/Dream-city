# XCity research — original Dream City visual candidate 0.4.10.13

Reference: https://github.com/nikvn2105/XCity (tree 6fdb6c3380960ab4cfaa3409558dab0eb4b8d306). No license was declared in repository metadata or root listing at review. No code/assets/shaders imported. The reference's general techniques (ground contact, bank transitions, tiered rendering) informed an independent implementation.

Base: 6559d5583b92d18af583bfaac5ab45e557d0e4c0 (0.4.10.12).
The old water plane ended at x=±17 while the developed bank terrain remained submerged there. Extend it to ±22 so the terrain intersects and naturally clips it. Add bounded wet tint in river corridor and spatially indexed foundation contact tint to existing terrain vertex colors. No additional meshes, texture samples, draw calls or terrain vertices introduced by this change; actual frame cost must still be measured. Terrain resolution limits contact detail; not a substitute for GTAO or a true high-resolution contact mask. River geometry, roads, lots and vegetation unchanged.

Acceptance: retain all 36 original screenshots, exact SHA, nine performance budgets, existing foliage/asset gates, audit and interaction checks. Two new unit tests check water-plane overlap and local contact falloff; browser verifies nonzero affected vertex counts and actual water dimensions. Before approval compare same camera day street/river/aerial screenshots against base; inspect bank clipping, darkening, aliasing and foundation seams. Measure real phone GPU separately. Do not merge/deploy production on unit tests alone.
Next experiments: independently design screen-space shore foam and view-prioritized rebuild scheduling only if measured improvements justify them. XCity benchmark reported substantial software-rasterizer cost for added shaders; don't port its settings blindly.
Status: candidate, not visual or hardware accepted.
