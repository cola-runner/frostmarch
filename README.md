<p align="center"><img src="public/favicon.svg" width="64" alt="Frostmarch emblem"></p>

# FROSTMARCH

**Winter has come. Hold the North.**

An original, open-source 3D fantasy RTS demo built with **Three.js, TypeScript, React, and PWA support**. Lead Ayla Frostblade and the northern legions across a frozen frontier. Gather resources, recruit troops, unleash frost magic, and destroy Frostkeep before your hero or home keep falls.

[Source](https://github.com/cola-runner/frostmarch) · [Releases](https://github.com/cola-runner/frostmarch/releases) · [Owner preview](https://frostmarch-cola.owen-garcia716.chatgpt.site)

The hosted preview currently requires the project owner's account. The source and downloadable static build are public and can be run locally or hosted independently.

## Play

- Select your hero or army, then click the ground to move and automatically engage nearby enemies.
- Workers collect gold and wood. Open **Camp & Recruit** to train troops, change gathering assignments, or build defensive towers.
- **Frost Nova** damages and slows nearby enemies. **Blizzard** rains ice onto a target area for four seconds.
- Destroy **Frostkeep** while protecting Ayla and your home keep.

The entire single-player battle runs on your device. There are no accounts, backend services, multiplayer, campaign saves, or packaged APK/IPA builds. This is an original game inspired by classic fantasy RTS games; it does not contain Blizzard code, maps, characters, art, audio, or Warcraft campaign files.

## Touch Edition

The touch edition is being developed separately from the published Web release. It adds larger thumb controls, a collapsible map, separate portrait and landscape layouts, screen-space unit selection, and independent tap/drag/pinch handling.

Camp, help, and target selection pause the battle while you plan. Blizzard and tower placement show a preview before confirmation; previewing or canceling costs no resources. Training resumes when camp closes. Touch devices also use reduced pixel density, shadow resolution, and snowfall.

The original Web release remains available in [Releases](https://github.com/cola-runner/frostmarch/releases). This touch edition is still a browser game, not a native APK or IPA.

## Controls

| Action                          | Mouse / Touch                          | Keyboard |
| ------------------------------- | -------------------------------------- | -------- |
| Select hero                     | Hero button or tap the hero            | `1`      |
| Select army                     | Army button                            | `A`      |
| Move and engage                 | Select troops, then click the ground   | —        |
| Pan / Zoom                      | Drag / Pinch or scroll                 | —        |
| Rotate camera                   | Rotate button                          | —        |
| Frost Nova                      | Ability button                         | `Q`      |
| Blizzard                        | Ability button, then target the ground | `W`      |
| Train a guard                   | Train Guard button                     | `R`      |
| Pause / Resume                  | Pause button                           | `Space`  |
| Cancel targeting / Close panels | Cancel or close button                 | `Esc`    |

Use a modern browser with WebGL 2 and hardware acceleration. On mobile, landscape offers a wider view. Add the game to your home screen from the browser menu for a standalone PWA experience. After the same-origin resources are cached, the campaign can be reopened offline; device installation and offline behavior have not yet been verified on real iOS or Android hardware.

## Run locally

Requires Node.js **22.18+**; Node 24 is recommended.

```bash
git clone https://github.com/cola-runner/frostmarch.git
cd frostmarch
npm ci
npm run dev -- --host 0.0.0.0
```

Open the URL printed in the terminal. A phone on the same Wi-Fi can use the displayed network address.

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The production build is a static site in **`dist/client/`**. Deploy that directory to an HTTPS static host. Routes and assets assume a domain root; subdirectory hosting requires base-path configuration. Development on localhost does not register a service worker.

If sharp installation stalls while detecting a system libvips installation on macOS, use its supported override:

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm ci
```

## Architecture

| Path                 | Responsibility                                                  |
| -------------------- | --------------------------------------------------------------- |
| `game/simulation.ts` | Independent battle, economy, recruitment, AI, and victory rules |
| `game/scene.ts`      | Three.js terrain, units, buildings, camera, input, and effects  |
| `game/audio.ts`      | Original synthesized Web Audio cues                             |
| `game/webmcp.ts`     | Optional structured battle-state and army-command tools         |
| `app/page.tsx`       | React game HUD, controls, tutorial, and results                 |
| `app/globals.css`    | Desktop and responsive game layout                              |
| `public/`            | Original hero portrait, icons, and PWA resources                |
| `tests/`             | Simulation and interface-contract checks                        |

The renderer advances the simulation each frame and sends UI snapshots every 100 ms. Background tabs stop advancing the battle. Trees use instancing, geometry is shared, and pixel density is capped. Movement uses formations, soft unit separation, and simple building avoidance, rather than a full navigation-mesh pathfinder.

Three.js gives this small demo a directly playable 3D battlefield with a lightweight distribution path. PWA support makes it easy to launch from a link. A future Capacitor wrapper could package the web app; no native project is configured or validated here.

## Validation

TypeScript, lint for project-owned code, the static production build, and automated battle/WebMCP checks are part of the validation workflow. Tests cover resource delivery, orders, recruitment, spells, construction, waves, pause/reset behavior, and a complete winning campaign without cheats. No specific device frame rate is promised.

WebMCP is optional. Unsupported browsers continue to play normally, and registration failures do not block the game. The read-state and army-command tools have been exercised in a supporting browser, including invalid-coordinate and inactive-battle rejection.

## Contributing and license

Contributions to campaign balance, touch controls, performance, pathfinding, and original units are welcome. Run the checks above before submitting a change.

Code and original project assets are available under the [MIT license](LICENSE). The hero portrait was generated for this project, 3D geometry is created in code, and audio is synthesized. Dependencies retain their own licenses. See [CREDITS.md](CREDITS.md).
