# EZ Sens
Original aim trainer + sensitivity converter/finder. Live: https://chatzo22.github.io/ez-sens/

- `index.html` is the whole app (single file, works offline; three.js r160 MIT is bundled inline — see `vendor/THREE-LICENSE.txt`).
- Source parts: `src.head.html`, `src.math.js`, `src.app.js` → `python3 build.py` builds `index.html`.
- Tests: `node test/math.test.js` (conversion math vs. published reference points).
- 16 built-in games + custom games (enter a yaw or calibrate). Yaw values and sources are listed in the app's About tab.
- Not affiliated with Valve, Embark Studios or any publisher.

## Windows desktop app
`app/` is an Electron shell that loads the built `index.html` fully offline (custom `ezsens://` scheme, all network blocked).
- `cd app && npm install && npm start` to run locally; `npm run dist` builds `EZ-Sens-Setup-x.y.z.exe` (NSIS) and `EZ-Sens-Portable-x.y.z.exe`.
- Pushing a `v*` tag runs `.github/workflows/desktop.yml` on windows-latest and publishes a GitHub Release.
- View → Unlock FPS (saved, applied next launch) adds `disable-frame-rate-limit` + `disable-gpu-vsync`; the in-app frame cap still applies.
