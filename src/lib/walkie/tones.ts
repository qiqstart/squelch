/** Radio tones: roger beep, squelch-tail static, click, or silence. */

export type ToneStep = {
  freq: number;
  durationMs: number;
  gain: number;
  type?: OscillatorType;
  delayMs?: number;
};

export type ScheduledTone = {
  freq: number;
  durationMs: number;
  gain: number;
  type: OscillatorType;
  atMs: number;
};

export type SoundId = "roger" | "static" | "click" | "silent";

export const SOUND_PRESETS = [
  { id: "roger", name: "Roger", blurb: "Classic beep" },
  { id: "static", name: "Static", blurb: "Squelch tail" },
  { id: "click", name: "Click", blurb: "Key click" },
  { id: "silent", name: "Silent", blurb: "No roger" },
] as const;

const SOUND_IDS = new Set<string>(SOUND_PRESETS.map((s) => s.id));

export function resolveSound(id: string | null | undefined): SoundId {
  if (id && SOUND_IDS.has(id)) return id as SoundId;
  return "roger";
}

/** Classic handheld end-of-transmission beep (Motorola-ish ~1.7 kHz). */
export const ROGER_BEEP: ToneStep[] = [
  { freq: 1680, durationMs: 90, gain: 0.16, type: "square" },
];

/** Short unkey click mixed under the roger so the disc feels mechanical. */
export const RELEASE_CLICK: ToneStep[] = [
  { freq: 180, durationMs: 16, gain: 0.1, type: "square" },
];

/** Burst of band-limited noise — the “chirp of static” after unkey. */
export const STATIC_CHIRP: ToneStep[] = [
  { freq: 0, durationMs: 160, gain: 0.2, type: "square" },
];

export const JOIN_CHIRP: ToneStep[] = [
  { freq: 880, durationMs: 55, gain: 0.08, type: "sine" },
  { freq: 1240, durationMs: 70, gain: 0.1, type: "sine", delayMs: 8 },
];

export function rogerOnRelease(wasTransmitting: boolean, transmitting: boolean): boolean {
  return wasTransmitting && !transmitting;
}

export function isNoiseStep(step: Pick<ToneStep, "freq">): boolean {
  return step.freq <= 0;
}

export function scheduleTones(steps: ToneStep[]): ScheduledTone[] {
  let cursor = 0;
  return steps.map((step) => {
    const atMs = cursor + (step.delayMs ?? 0);
    const scheduled: ScheduledTone = {
      freq: step.freq,
      durationMs: step.durationMs,
      gain: step.gain,
      type: step.type ?? "square",
      atMs,
    };
    cursor = atMs + step.durationMs;
    return scheduled;
  });
}

export const RELEASE_TONES: ToneStep[] = [...RELEASE_CLICK, ...ROGER_BEEP.map((s) => ({ ...s, delayMs: 12 }))];

export function tonesForSound(id: string | null | undefined): ToneStep[] {
  switch (resolveSound(id)) {
    case "silent":
      return [];
    case "click":
      return RELEASE_CLICK;
    case "static":
      return STATIC_CHIRP;
    default:
      return RELEASE_TONES;
  }
}

export function joinTonesForSound(id: string | null | undefined): ToneStep[] {
  return resolveSound(id) === "silent" ? [] : JOIN_CHIRP;
}

function playNoise(ctx: AudioContext, start: number, dur: number, gainValue: number): void {
  const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const env = 1 - i / length;
    data[i] = (Math.random() * 2 - 1) * env * env;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1800;
  filter.Q.value = 0.7;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.linearRampToValueAtTime(0, start + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(start);
  src.stop(start + dur + 0.01);
}

export function playToneSequence(ctx: AudioContext | null, steps: ToneStep[]): boolean {
  if (!ctx || steps.length === 0) return false;
  const scheduled = scheduleTones(steps);
  const now = ctx.currentTime;
  for (const step of scheduled) {
    const start = now + step.atMs / 1000;
    const dur = Math.max(0.01, step.durationMs / 1000);
    if (isNoiseStep(step)) {
      playNoise(ctx, start, dur, step.gain);
      continue;
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = step.type;
    osc.frequency.value = step.freq;
    const attack = Math.min(0.004, dur / 4);
    const release = Math.min(0.012, dur / 3);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(step.gain, start + attack);
    gain.gain.setValueAtTime(step.gain, start + dur - release);
    gain.gain.linearRampToValueAtTime(0, start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.01);
  }
  return true;
}
