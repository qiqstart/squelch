# Squelch

Push-to-talk walkie-talkie. Pick a channel, hold the disc, hear the other side immediately.

Audio is WebRTC peer-to-peer. The server only brokers the handshake (SDP/ICE) and a live roster — it never carries the voice.

Source: [qiqstart/squelch](https://github.com/qiqstart/squelch)

## How to use

1. Enter a **callsign** and pick a **mark** (Fox, Hawk, Wolf, Bear, Owl, Lynx).
2. Choose a **radio face** (Steel, Field, Night, Brick).
3. Choose a **network**:
   - **World** — this Squelch instance (the centralized net).
   - **Closed** — paste another Squelch server address. Only people pointed at that server can join.
4. Pick a **channel** (World, Alpha, Bravo, …) or type a private name.
5. Hold the disc (or spacebar) to talk. Release to send a roger beep.
6. **Share** copies a listen link. The other person taps once and hears you. You get a banner (and a browser notification, if allowed) when they join.

A unique channel name is a private room on the same net. Share the channel, and in Closed mode share the server address too.

Listen links look like `/?c=night-watch&h=FOX-1`. Closed nets also carry `n=closed&s=https://your-server`.

## Backend

| Route | Role |
| --- | --- |
| `GET/POST /api/rtc` | Signaling relay: join, heartbeat, SDP/ICE, leave. CORS open so a Closed client can use this instance as its server. |
| `GET /api/channels` | Occupancy counts for the channel picker. |

Rooms cap at 8 operators. Peer rows expire after 30s without a poll.

## Tests

```sh
npm test
```

Covers channel slugs, closed-server URL resolution, PTT gating, join validation, occupancy merge, share-link parsing, ready notifications, roger-beep timing, and radio/operator faces.

## Stack

TanStack Start, React 19, Tailwind v4, WebRTC (`RTCPeerConnection` + microphone tracks), Postgres signaling (Neon in production, PGLite in preview).
