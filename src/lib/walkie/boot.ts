export type BootPhase = "pwr" | "id" | "scan" | "open";

export const BOOT_PHASES: { id: BootPhase; label: string; holdMs: number }[] = [
  { id: "pwr", label: "PWR ON", holdMs: 280 },
  { id: "id", label: "SQUELCH", holdMs: 360 },
  { id: "scan", label: "SCAN", holdMs: 320 },
  { id: "open", label: "OPEN", holdMs: 220 },
];

export function totalBootMs(): number {
  return BOOT_PHASES.reduce((sum, phase) => sum + phase.holdMs, 0);
}

export function bootPhaseAt(elapsedMs: number): BootPhase {
  let cursor = 0;
  for (const phase of BOOT_PHASES) {
    cursor += phase.holdMs;
    if (elapsedMs < cursor) return phase.id;
  }
  return "open";
}

export function bootLabel(phase: BootPhase, channelDial?: string): string {
  if (phase === "scan" && channelDial) return channelDial;
  return BOOT_PHASES.find((p) => p.id === phase)?.label ?? "OPEN";
}

/** Keep the boot LCD up through the animation; linger until the net links or we time out. */
export function shouldShowBoot(elapsedMs: number, linked: boolean, maxWaitMs = 4800): boolean {
  if (elapsedMs < totalBootMs()) return true;
  if (linked) return false;
  return elapsedMs < maxWaitMs;
}
