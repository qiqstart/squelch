import { useCallback, useEffect, useRef, useState } from "react";
import { P2PRoom, type PeerInfo } from "@/lib/multiplayer";
import { isHelloWire, isPttWire, isRogerWire, newPeerId } from "./protocol";
import { isTypingTarget, peakLevel, shouldTransmit } from "./ptt";
import type { WalkieSession } from "./session";
import {
  makeReadyAlert,
  newlyConnectedIds,
  postReadyNotification,
  shouldAnnounce,
  type ReadyAlert,
} from "./alerts";
import { JOIN_CHIRP, playToneSequence, RELEASE_TONES, rogerOnRelease, type ToneStep } from "./tones";

export interface RemoteOperator {
  id: string;
  name: string;
  connectionState: RTCPeerConnectionState;
  rttMs: number | null;
  speaking: boolean;
  face?: string;
}

export interface WalkieHandle {
  selfId: string;
  joined: boolean;
  micReady: boolean;
  micError: string | null;
  transmitting: boolean;
  level: number;
  operators: RemoteOperator[];
  connectedCount: number;
  channelFull: boolean;
  alert: ReadyAlert | null;
  startTalk: () => void;
  stopTalk: () => void;
  dismissAlert: () => void;
}

const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
  },
  video: false,
};

function browserNotify(): ((title: string, options: { body: string; tag: string }) => void) | null {
  if (typeof Notification === "undefined") return null;
  if (Notification.permission !== "granted") return null;
  return (title, options) => {
    try {
      new Notification(title, { body: options.body, tag: options.tag });
    } catch {
      // Embedded previews may block Notification constructors.
    }
  };
}

export function useWalkie(session: WalkieSession): WalkieHandle {
  const [selfId] = useState(() => newPeerId());
  const [joined, setJoined] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [speaking, setSpeaking] = useState<Record<string, boolean>>({});
  const [faces, setFaces] = useState<Record<string, string>>({});
  const [level, setLevel] = useState(0);
  const [channelFull, setChannelFull] = useState(false);
  const [pointerDown, setPointerDown] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);
  const [alert, setAlert] = useState<ReadyAlert | null>(null);

  const roomRef = useRef<P2PRoom | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioNodes = useRef(new Map<string, HTMLAudioElement>());
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const pointerDownRef = useRef(false);
  const spaceDownRef = useRef(false);
  const micReadyRef = useRef(false);
  const lastTalkRef = useRef(false);
  const peersRef = useRef<PeerInfo[]>([]);
  const greetedRef = useRef(new Set<string>());
  const announcedRef = useRef(new Set<string>());
  const connectedRef = useRef<string[]>([]);
  const sessionRef = useRef(session);
  const onRemoteRoger = useRef<(() => void) | null>(null);
  const playLocalRef = useRef<(steps: ToneStep[]) => void>(() => {});

  pointerDownRef.current = pointerDown;
  spaceDownRef.current = spaceDown;
  micReadyRef.current = micReady;
  peersRef.current = peers;
  sessionRef.current = session;

  playLocalRef.current = (steps: ToneStep[]) => {
    let ctx = audioCtxRef.current;
    if (!ctx || ctx.state === "closed") {
      try {
        ctx = new AudioContext();
        audioCtxRef.current = ctx;
      } catch {
        return;
      }
    }
    void ctx.resume();
    playToneSequence(ctx, steps);
  };
  onRemoteRoger.current = () => playLocalRef.current(RELEASE_TONES);

  const transmitting = shouldTransmit({
    pointerDown,
    spaceDown,
    micReady,
  });

  const announceReady = useCallback((peerId: string, name: string, viaInvite: boolean) => {
    if (!shouldAnnounce(peerId, announcedRef.current)) return;
    announcedRef.current.add(peerId);
    const next = makeReadyAlert({ id: peerId, name, viaInvite });
    setAlert(next);
    postReadyNotification(next, browserNotify());
    playLocalRef.current(JOIN_CHIRP);
  }, []);

  const applyTalk = useCallback((talk: boolean) => {
    const room = roomRef.current;
    if (!room) return;
    const was = lastTalkRef.current;
    room.setAudioEnabled(talk);
    if (talk === was) return;
    lastTalkRef.current = talk;
    room.send({ type: "ptt", on: talk });
    if (rogerOnRelease(was, talk)) {
      room.send({ type: "roger" });
      playLocalRef.current(RELEASE_TONES);
    }
  }, []);

  useEffect(() => {
    applyTalk(transmitting);
  }, [transmitting, applyTalk]);

  useEffect(() => {
    let cancelled = false;
    const p2p = new P2PRoom({
      room: session.channelId,
      selfId,
      name: session.callsign,
      signalingUrl: session.signalingUrl,
      onPeersChanged: setPeers,
      onConnected: () => setJoined(true),
      onChannelFull: () => setChannelFull(true),
      onMessage: (from, data) => {
        if (isPttWire(data)) {
          setSpeaking((prev) => ({ ...prev, [from]: data.on }));
          return;
        }
        if (isHelloWire(data)) {
          if (data.face) {
            setFaces((prev) => ({ ...prev, [from]: data.face as string }));
          }
          const name = peersRef.current.find((p) => p.id === from)?.name || "An operator";
          announceReady(from, name, data.via === "invite");
          return;
        }
        if (isRogerWire(data)) {
          onRemoteRoger.current?.();
        }
      },
      onRemoteStream: (peerId, stream) => {
        let el = audioNodes.current.get(peerId);
        if (!el) {
          el = new Audio();
          el.autoplay = true;
          el.setAttribute("playsinline", "true");
          audioNodes.current.set(peerId, el);
        }
        el.srcObject = stream;
        void el.play().catch(() => {
          // Autoplay may wait for the next PTT gesture.
        });
      },
      onRemoteStreamRemoved: (peerId) => {
        const el = audioNodes.current.get(peerId);
        if (el) {
          el.pause();
          el.srcObject = null;
          audioNodes.current.delete(peerId);
        }
        setSpeaking((prev) => {
          if (!(peerId in prev)) return prev;
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
        greetedRef.current.delete(peerId);
        announcedRef.current.delete(peerId);
      },
    });
    roomRef.current = p2p;
    void p2p.join();

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
        if (cancelled) {
          for (const t of stream.getTracks()) t.stop();
          return;
        }
        for (const t of stream.getAudioTracks()) t.enabled = false;
        streamRef.current = stream;
        p2p.setLocalStream(stream);
        setMicReady(true);

        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : "";
        setMicError(
          name === "NotAllowedError"
            ? "Microphone blocked — you can still listen"
            : "Microphone unavailable — listening only",
        );
      }
    })();

    return () => {
      cancelled = true;
      roomRef.current = null;
      p2p.close();
      for (const el of audioNodes.current.values()) {
        el.pause();
        el.srcObject = null;
      }
      audioNodes.current.clear();
      if (streamRef.current) {
        for (const t of streamRef.current.getTracks()) t.stop();
        streamRef.current = null;
      }
      void audioCtxRef.current?.close();
      audioCtxRef.current = null;
      analyserRef.current = null;
    };
  }, [selfId, session.channelId, session.callsign, session.signalingUrl, announceReady]);

  const connectedKey = peers
    .filter((p) => p.connectionState === "connected")
    .map((p) => p.id)
    .sort()
    .join("\0");

  useEffect(() => {
    const room = roomRef.current;
    if (!room) return;
    const connected = connectedKey ? connectedKey.split("\0") : [];
    const fresh = newlyConnectedIds(connectedRef.current, connected);
    connectedRef.current = connected;
    for (const id of connected) {
      if (greetedRef.current.has(id)) continue;
      greetedRef.current.add(id);
      room.send(
        {
          type: "hello",
          via: sessionRef.current.viaInvite ? "invite" : "direct",
          face: sessionRef.current.operatorFace,
        },
        id,
      );
    }
    if (fresh.length === 0) return;
    const timers = fresh.map((id) =>
      window.setTimeout(() => {
        const peer = peersRef.current.find((p) => p.id === id);
        if (!peer || peer.connectionState !== "connected") return;
        announceReady(id, peer.name || "An operator", false);
      }, 1200),
    );
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [connectedKey, announceReady]);

  useEffect(() => {
    if (!alert) return;
    const t = window.setTimeout(() => setAlert(null), 8000);
    return () => window.clearTimeout(t);
  }, [alert]);

  useEffect(() => {
    let raf = 0;
    const data = new Uint8Array(128);
    const tick = () => {
      const analyser = analyserRef.current;
      const talk = shouldTransmit({
        pointerDown: pointerDownRef.current,
        spaceDown: spaceDownRef.current,
        micReady: micReadyRef.current,
      });
      if (analyser && talk) {
        analyser.getByteTimeDomainData(data);
        setLevel(peakLevel(data));
      } else {
        setLevel((prev) => (prev === 0 ? prev : 0));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      setSpaceDown(true);
      void audioCtxRef.current?.resume();
      for (const el of audioNodes.current.values()) void el.play().catch(() => {});
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      setSpaceDown(false);
    };
    const blur = () => {
      setSpaceDown(false);
      setPointerDown(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  const startTalk = useCallback(() => {
    setPointerDown(true);
    void audioCtxRef.current?.resume();
    for (const el of audioNodes.current.values()) void el.play().catch(() => {});
  }, []);

  const stopTalk = useCallback(() => {
    setPointerDown(false);
  }, []);

  const dismissAlert = useCallback(() => setAlert(null), []);

  const operators: RemoteOperator[] = peers.map((p) => ({
    id: p.id,
    name: p.name || p.id,
    connectionState: p.connectionState,
    rttMs: p.rttMs,
    speaking: Boolean(speaking[p.id]),
    face: faces[p.id],
  }));

  const connectedCount = operators.filter((o) => o.connectionState === "connected").length;

  return {
    selfId,
    joined,
    micReady,
    micError,
    transmitting,
    level,
    operators,
    connectedCount,
    channelFull,
    alert,
    startTalk,
    stopTalk,
    dismissAlert,
  };
}
