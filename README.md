# DaddyRacing Game Client

A web-based, LAN-networked multiplayer go-kart racing game client: first-person 3D rendering, Out
Run-inspired visuals, arrow-key controls, pre-race kart/track setup, and the in-race HUD/result screens.

Built with TypeScript, [Three.js](https://threejs.org/) and Vite. No UI framework.

## Status

This is the CR `965b217a-bb82-437e-88ae-8ac1f54c9a5b` (v2) implementation — the first version of this
Application. Networking now connects to a real [DaddyRacing Session
Server](https://github.com/ricobiuzo/DaddyRacingServer) via `WebSocketSessionTransport`
(`src/net/WebSocketSessionTransport.ts`), which implements the same `SessionTransport` interface
(`src/net/SessionTransport.ts`) that the earlier in-memory `MockSessionTransport` stand-in used.

## Connecting to a Session Server

By default the client connects to `ws://<the page's own hostname>:8080` — i.e. it assumes whichever
machine served the page is also running the Session Server on the default port, which matches the
expected LAN setup (one host machine runs both). Two query-string overrides exist for anything else:

- `?server=ws://<host>:<port>` — connect to a Session Server running elsewhere.
- `?offline` — skip the server entirely and play solo against `MockSessionTransport`, e.g. for local
  UI development with no server running.

The wire protocol (`ClientMessage`/`ServerMessage` shapes inside `WebSocketSessionTransport.ts`) is a
hand-written mirror of the server's `src/protocol.ts` — no shared package exists between the two repos
yet, so keep both in sync by hand if either side's messages change. Only the pre-race lobby is synced
over the network today (create/join, kart/track selection, ready); the race itself still runs on each
client's own local physics prediction with no server reconciliation, so other players' karts are not
yet visible to one another during a race.

## Scripts

```sh
npm install
npm run dev        # local dev server
npm run build       # typecheck + production build
npm test            # vitest
```

## Visual style

See [`docs/OUT_RUN_VISUAL_STYLE_GUIDE.md`](docs/OUT_RUN_VISUAL_STYLE_GUIDE.md).
