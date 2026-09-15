/** Radio tones: roger beep on PTT release, optional join chirp. */

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

/** Classic handheld end-of-transmission beep (Motorola-ish ~1.7 kHz). */
export const ROGER_BEEP: ToneStep[] = [
  { freq: 1680, durationMs: 90, gain: 0.16, type: "square" },
];

/** Short unkey click mixed under the roger so the disc feels mechanical. */
export const RELEASE_CLICK: ToneStep[] = [
  { freq: 180, durationMs: 16, gain: 0.1, type: "square" },
];

export const JOIN_CHIRP: ToneStep[] = [
  { freq: 880, durationMs: 55, gain: 0.08, type: "sine" },
  { freq: 1240, durationMs: 70, gain: 0.1, type: "sine", delayMs: 8 },
];

export function rogerOnRelease(wasTransmitting: boolean, transmitting: boolean): boolean {
  return wasTransmitting && !transmitting;
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

export function playToneSequence(ctx: AudioContext | null, steps: ToneStep[]): boolean {
  if (!ctx || steps.length === 0) return false;
  const scheduled = scheduleTones(steps);
  const now = ctx.currentTime;
  for (const step of scheduled) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = step.type;
    osc.frequency.value = step.freq;
    const start = now + step.atMs / 1000;
    const dur = Math.max(0.01, step.durationMs / 1000);
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
