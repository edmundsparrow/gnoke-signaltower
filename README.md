# 🚦 Gnoke SignalTower

A web app that recreates $5,000 industrial signal tower functionality using just a browser.

> **Portable. Private. Persistent.**

---

## Live Demo

**[signaltower.netlify.app](http://signaltower.netlify.app)**

---

## The Problem It Solves

Traditional industrial setup: **~$15,000** (HMI panel + signal tower + proprietary licenses)

This setup: **$15 Raspberry Pi**

A broken device running the hardware can be replaced within 15 minutes with a $100 device — no heavy technical skills required.

---

## How It Works

The demo uses your phone's flashlight to prove the concept. The same Web Serial/WebUSB APIs can control real PLCs and signal towers.

You can run it standalone or install it in **GnokeStation** by typing `install [signaltower-url]` in the terminal.

```
Standalone:     open the URL, use it immediately
In GnokeStation: install [url] → runs as a native-feeling app
```

---

## What It Does

- Control a 3-colour Andon stack light (Red / Amber / Green)
- Four operating modes: Emergency, Warning, Normal, Standby
- 12 timed patterns: strobe, pulse, chase, heartbeat, system test, and more
- Optional hardware output via device torch (phone flashlight)
- Keyboard shortcuts: `1` Emergency · `2` Warning · `3` Normal · `0` Standby
- Works completely offline as a PWA
- No account. No server. No tracking.

---

## Run Locally

```bash
git clone https://github.com/edmundsparrow/gnoke-signaltower.git
cd gnoke-signaltower
python -m http.server 8080
```

Open: **http://localhost:8080**

---

## Project Structure

```
gnoke-signaltower/
├── index.html          ← Splash / intro screen
├── main/
│   └── index.html      ← Main app shell
├── js/
│   ├── state.js        ← App state (single source of truth)
│   ├── theme.js        ← Dark / light toggle
│   ├── ui.js           ← Toast, modal, status chip
│   ├── tower.js        ← Signal tower logic + pattern engine
│   ├── update.js       ← Version checker
│   └── app.js          ← Bootstrap + event wiring
├── style.css           ← Gnoke design system (SignalTower edition)
├── sw.js               ← Service worker (offline / PWA)
├── manifest.json       ← PWA manifest
├── global.png          ← App icon
└── LICENSE
```

---

## Keyboard Shortcuts

| Key   | Action            |
|-------|-------------------|
| `1`   | Emergency mode    |
| `2`   | Warning mode      |
| `3`   | Normal mode       |
| `0`   | Standby / Off     |
| `Esc` | Stop all patterns |

---

## The Bigger Idea: GnokeStation

SignalTower is a proof of concept for a larger vision — the browser as a universal HMI controller.

Imagine a factory floor where workers deploy new control interfaces by pasting a URL. No IT approval, no vendor negotiations, no waiting. The browser exposes the controls; authority stays with PLC logic, physical interlocks, and network policy.

| Layer       | Traditional              | GnokeStation          |
|-------------|--------------------------|------------------------|
| Screen      | $3,000 HMI panel         | Any browser            |
| Software    | Proprietary license      | Open URL               |
| Replacement | Days + vendor            | 15 min + $100 device   |
| Deployment  | IT approval              | `install [url]`        |

**Current demo:** Browser → Phone Torch  
**Industrial:** Browser → GPIO / Relays → Signal Tower  
**Enterprise:** Browser → PLC APIs → Factory Equipment

---

## Privacy & Tech

- **Stack:** localStorage, Vanilla JS — zero dependencies
- **Privacy:** No tracking, no telemetry, no ads. Your data is yours.
- **License:** GNU GPL v3.0

---

## Links

- [GnokeStation](http://gnokestation.netlify.app)
- [Video Demo](https://m.youtube.com/shorts/t-ROd1hx20I)
- [Original post on CoderLegion](https://coderlegion.com/9267/signal-tower-webapp-replacing-5000-industrial-equipment)

---

## Support

If this saves you time or money, consider buying me a coffee:  
**[selar.com/showlove/edmundsparrow](https://selar.com/showlove/edmundsparrow)**

---

© 2026 Edmund Sparrow — Gnoke Suite
