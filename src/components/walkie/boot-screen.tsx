import { useEffect, useState } from "react";
import { RadioShell } from "@/components/walkie/radio-shell";
import { bootLabel, bootPhaseAt } from "@/lib/walkie/boot";

export function BootScreen({
  faceId = "steel",
  channelDial,
  caption = "Opening channel",
}: {
  faceId?: string;
  channelDial?: string;
  caption?: string;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      setElapsed(now - started);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const phase = bootPhaseAt(elapsed);
  const line = bootLabel(phase, channelDial);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
      <RadioShell faceId={faceId}>
        <div className="flex items-center gap-2">
          <span className="radio-led" />
          <span className="font-mono text-[11px] tracking-[0.28em] text-muted uppercase">Squelch</span>
        </div>
        <section className="radio-lcd mt-4 flex min-h-36 flex-col justify-center p-4">
          <p className="font-mono text-[11px] tracking-[0.22em] uppercase opacity-70">{caption}</p>
          <p className="mt-3 font-mono text-3xl tracking-[0.18em] uppercase">{line}</p>
          <p className="mt-3 font-mono text-xs tracking-[0.2em] uppercase opacity-70">
            {phase === "open" ? "Standby" : "Boot"}
          </p>
        </section>
        <div className="radio-grille mt-4" aria-hidden="true" />
      </RadioShell>
    </main>
  );
}
