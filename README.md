# EZ Sens
Original aim trainer + sensitivity converter/finder. Live: https://chatzo22.github.io/ez-sens/

- `index.html` is the whole app (single file, works offline; three.js r160 MIT is bundled inline — see `vendor/THREE-LICENSE.txt`).
- Source parts: `src.head.html`, `src.math.js`, `src.app.js` → `python3 build.py` builds `index.html`.
- Tests: `node test/math.test.js` (conversion math vs. published reference points). Headless UI: `node test/app.headless.js`, `node test/range.headless.js`, `node test/env.headless.js` (Finder Sunrise/Day/Night).
- 16 built-in games + custom games (enter a yaw or calibrate). Yaw values and sources are listed in the app's About tab.
- Tracking targets bounce off the floor and ceiling so they never go underground. An optional off-screen hint (on by default) paints a red-to-magenta glow on the screen edge that follows a target you can't see, in Train, Finder and the Range.
- Train uses a compact mid-run HUD and an end-of-round recap (score, accuracy, time-to-hit, first-shot time, local best). Hits and misses flash a short ring on the crosshair.
- Each game has its own crosshair (style, color, length, thickness, gap, outline, center dot, opacity, optional dynamic shot spread). Train and Range share it. Export/import an EZX1 code, copy from another game, or paste a classic CSGO- share code.
- The Sensitivity Finder (and Train, which shares the same arena) has Sunrise, Day and Night environments — sky, fog, light and ground tint, with a sun disc in Sunrise and Day. Night is the original dark look. The Range tab is unchanged. The choice is saved in the browser.
- Not affiliated with Valve, Embark Studios or any publisher.

## Windows desktop app
`app/` is an Electron shell that loads the built `index.html` fully offline (custom `ezsens://` scheme, all network blocked).
- `cd app && npm install && npm start` to run locally; `npm run dist` builds `EZ-Sens-Setup-x.y.z.exe` (NSIS) and `EZ-Sens-Portable-x.y.z.exe`.
- Pushing a `v*` tag runs `.github/workflows/desktop.yml` on windows-latest and publishes a GitHub Release.
- View → Unlock FPS (saved, applied next launch) adds `disable-frame-rate-limit` + `disable-gpu-vsync`; the in-app frame cap still applies.
