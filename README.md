# DaddyRacing Game Client

A web-based, LAN-networked multiplayer go-kart racing game client: first-person 3D rendering, Out
Run-inspired visuals, arrow-key controls, pre-race kart/track setup, and the in-race HUD/result screens.

Built with TypeScript, [Three.js](https://threejs.org/) and Vite. No UI framework.

## Status

This is the CR `965b217a-bb82-437e-88ae-8ac1f54c9a5b` (v2) implementation — the first version of this
Application. There is no DaddyRacing Session Server yet, so networking runs against
`MockSessionTransport`, an in-memory stand-in behind the same `SessionTransport` interface a real
WebSocket client will use later (see `src/net/SessionTransport.ts`).

## Scripts

```sh
npm install
npm run dev        # local dev server
npm run build       # typecheck + production build
npm test            # vitest
```

## Visual style

See [`docs/OUT_RUN_VISUAL_STYLE_GUIDE.md`](docs/OUT_RUN_VISUAL_STYLE_GUIDE.md).
