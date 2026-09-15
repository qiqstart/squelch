# Squelch

Push-to-talk walkie-talkie. Pick a channel, hold the disc, hear the other side immediately.

Audio is WebRTC peer-to-peer. The server only brokers the handshake (SDP/ICE) and a live roster — it never carries the voice.

Source: [qiqstart/squelch](https://github.com/qiqstart/squelch)

## How to use

1. Enter a **callsign** and pick a **mark** (Fox, Hawk, Wolf, Bear, Owl, Lynx).
2. Choose a **radio face** — Steel, Field, Night, Brick, plus **Sun** (bright), **Vintage** (old time, knobs on top), and **Rugged** (side PTT).
3. Pick a **roger** sound: classic beep, a chirp of static, a key click, or silent.
4. Choose a **network**:
   - **World** — this Squelch instance (the centralized net).
   - **Closed** — paste another Squelch server address. Only people pointed at that server can join.
5. Pick a **channel** by number (CH 01 World … CH 06 Local) or type a private name (CH 07–22).
6. Hold the disc (or spacebar) to talk. Release for the roger you picked.
7. Press the molded **SHARE** key. It copies the listen URL first, then a short description. Opening that link goes straight to the radio — no extra tap. **PWR** leaves the channel.

You get a banner (and a browser notification, if allowed) when someone joins.

Listen links look like `/?c=night-watch&h=FOX-1`. `/?c=2` is Alpha. Closed nets also carry `n=closed&s=https://your-server`.

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

Covers channel numbers, share-link auto-join, copy order, ready notifications, roger/static/silent tones, radio layouts, and the power-on boot sequence.

## Stack

TanStack Start, React 19, Tailwind v4, WebRTC (`RTCPeerConnection` + microphone tracks), Postgres signaling (Neon in production, PGLite in preview).
