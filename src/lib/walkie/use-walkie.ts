import { useCallback, useEffect, useRef, useState } from "react";
import { P2PRoom, type PeerInfo } from "@/lib/multiplayer";
import { isPttWire, newPeerId } from "./protocol";
import { isTypingTarget, peakLevel, shouldTransmit } from "./ptt";
import type { WalkieSession } from "./session";

export interface RemoteOperator {
  id: string;
  name: string;
  connectionState: RTCPeerConnectionState;
  rttMs: number | null;
  speaking: boolean;
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
  startTalk: () => void;
  stopTalk: () => void;
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

export function useWalkie(session: WalkieSession): WalkieHandle {
  const [selfId] = useState(() => newPeerId());
  const [joined, setJoined] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [speaking, setSpeaking] = useState<Record<string, boolean>>({});
  const [level, setLevel] = useState(0);
  const [channelFull, setChannelFull] = useState(false);
  const [pointerDown, setPointerDown] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);

  const roomRef = useRef<P2PRoom | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioNodes = useRef(new Map<string, HTMLAudioElement>());
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const pointerDownRef = useRef(false);
  const spaceDownRef = useRef(false);
  const micReadyRef = useRef(false);
  const lastTalkRef = useRef(false);

  pointerDownRef.current = pointerDown;
  spaceDownRef.current = spaceDown;
  micReadyRef.current = micReady;

  const transmitting = shouldTransmit({
    pointerDown,
    spaceDown,
    micReady,
  });

  const applyTalk = useCallback((talk: boolean) => {
    const room = roomRef.current;
    if (!room) return;
    room.setAudioEnabled(talk);
    if (talk !== lastTalkRef.current) {
      lastTalkRef.current = talk;
      room.send({ type: "ptt", on: talk });
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
        if (!isPttWire(data)) return;
        setSpeaking((prev) => ({ ...prev, [from]: data.on }));
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
  }, [selfId, session.channelId, session.callsign, session.signalingUrl]);

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

  const operators: RemoteOperator[] = peers.map((p) => ({
    id: p.id,
    name: p.name || p.id,
    connectionState: p.connectionState,
    rttMs: p.rttMs,
    speaking: Boolean(speaking[p.id]),
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
    startTalk,
    stopTalk,
  };
}
