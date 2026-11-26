# Dream City — River District / Visual Alpha 03
Independent original real-time 3D city prototype. Vite + Three.js r180. Start: npm install, npm test, npm run dev. Build: npm run build.

Visual-first scope: generated city blocks, detailed procedural PBR textures (normal, roughness, metalness, emission), physical sky approximation, directional shadows, water reflections, seeded terrain and foliage, bridges, crosswalks, moving traffic, three camera and time presets, three quality tiers, screenshot capture. Geometry batching and instancing. This is not a complete city-builder or verified AAA parity. No proprietary Cities: Skylines II code or assets. No external asset downloads at runtime.

See SOURCES.md for actual integration versus research. Browser QA captures desktop/mobile viewport day/street/sunset/night; software rendering is not real mobile GPU performance. Do not infer visual fidelity from build or HTTP status.

V0.2: street camera clearance, reduced ambient light, new tower trim and balcony details, slope-based terrain tint, near-tree branches/canopy, GTAO high quality, direct low-quality rendering, reduced reflection frequency, full pipeline counters. Visual improvement pending screenshot comparison. 

V0.3: photo-sourced ground maps and HDR environment when asset acquisition succeeds, explicit fallback status, per-face UV correction, varied roof and tower shapes, beveled cars, spatial chunks, camera-aware reflection cadence and high-tier browser test. Asset downloader uses Poly Haven public API; see SOURCES.md. Set REQUIRE_PHOTO_ASSETS=1 for strict asset validation.

V0.3 asset fix: accepts API channel names such as Diffuse and Rough, JPG or PNG, and official CDN fallback. CI and Vercel builds require all four asset groups. Missing assets cannot pass the release build.
