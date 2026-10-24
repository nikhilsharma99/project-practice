# Last Light

An original, small top-down zombie survival game inspired by urban survival and parkour games. Built with Canvas 2D, CSS, and JavaScript; no game engine, paid assets, or runtime packages.

## Download for PC

[Download Last-Light-PC.zip](https://github.com/nikhilsharma99/project-practice/raw/refs/heads/main/downloads/Last-Light-PC.zip)

Extract the entire ZIP, then open `index.html` in Chrome, Edge, or Firefox. Windows users can also double-click `START-GAME.cmd`. The PC ZIP needs no Node.js installation or account. It is a browser game, not a native `.exe`.

## Run

Requires Node.js 18 or newer. No dependency installation is necessary.

```sh
npm start
```

Open the server on port **3000** in a desktop browser. Set `PORT` to change the port. Stop with Ctrl+C. Alternatively, serve this directory with any static web server.

## Play

Collect the **three supply caches**, then reach the **safehouse** and press **E** to extract. Green markers and the minimap guide you. Night falls after 45 seconds and makes the infected faster. Losing all health ends your run; restart from the result screen.

| Control | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Shift | Sprint; uses stamina |
| Space | Vault low barriers and abandoned cars; uses stamina |
| Mouse | Aim |
| Click | Swing the steel pipe toward the cursor |
| F | Attack the nearest visible infected within melee range |
| E | Search a nearby cache / extract at the safehouse |
| Q | Use a medkit to restore up to 45 health |
| Escape | Pause / resume |

Infected take three hits. Attacks consume stamina. Walking restores stamina; vaults avoid damage while airborne. Each cache supplies one additional medkit. Buildings cannot be crossed. Switching tabs pauses the game. Sound is opt-in with synthesized effects, so no audio files are required.

## Scope

Single-player prototype with one district, procedural vector artwork, melee combat, enemy pursuit, supplies, healing, a dusk-to-night transition, flashlight, minimap, pause, win/loss screens, and restart. No multiplayer, persistence, interiors, or full 3D parkour. Designed for a desktop keyboard and mouse. Fonts load from Google Fonts when available and fall back to system fonts offline.

REA is separately installed at `/workspace/rea`; this game does not require it. No Dying Light code, characters, branding, or assets are included.
