export type PttInput = {
  pointerDown: boolean;
  spaceDown: boolean;
  micReady: boolean;
};

/** Transmit only when the mic is live and a PTT control is held. */
export function shouldTransmit(input: PttInput): boolean {
  return input.micReady && (input.pointerDown || input.spaceDown);
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

export type LevelSample = number;

/** Map analyser time-domain data to 0..1 peak. */
export function peakLevel(timeDomain: Uint8Array): number {
  let peak = 0;
  for (let i = 0; i < timeDomain.length; i++) {
    const v = Math.abs(timeDomain[i]! - 128) / 128;
    if (v > peak) peak = v;
  }
  return peak;
}

export function barsFromLevel(level: number, count: number): boolean[] {
  const n = Math.max(0, Math.min(count, Math.round(level * count)));
  return Array.from({ length: count }, (_, i) => i < n);
}
