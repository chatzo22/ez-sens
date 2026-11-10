# EZ Sens
Original aim trainer + sensitivity converter/finder. Live: https://chatzo22.github.io/ez-sens/

- `index.html` is the whole app (single file, works offline; three.js r160 MIT is bundled inline — see `vendor/THREE-LICENSE.txt`).
- Source parts: `src.head.html`, `src.math.js`, `src.app.js` → `python3 build.py` builds `index.html`.
- Tests: `node test/math.test.js` (conversion math vs. published reference points).
- 16 built-in games + custom games (enter a yaw or calibrate). Yaw values and sources are listed in the app's About tab.
- Not affiliated with Valve, Embark Studios or any publisher.
