import { useEffect, useState } from "react";
import { LogOut, Radio, Share2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PttButton } from "@/components/walkie/ptt-button";
import { VuMeter } from "@/components/walkie/vu-meter";
import { cn } from "@/lib/utils";
import { useWalkie } from "@/lib/walkie/use-walkie";
import { inviteUrlFromSession } from "@/lib/walkie/invite";
import { requestNotifyPermission } from "@/lib/walkie/alerts";
import type { WalkieSession } from "@/lib/walkie/session";

export function RadioScreen({
  session,
  onLeave,
}: {
  session: WalkieSession;
  onLeave: () => void;
}) {
  const radio = useWalkie(session);
  const [coarse, setCoarse] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => setCoarse(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const netLabel = session.mode === "world" ? "World net" : "Closed net";
  const status = radio.channelFull
    ? "Channel full"
    : radio.transmitting
      ? "Transmitting"
      : radio.connectedCount > 0
        ? "Listening"
        : radio.joined
          ? "Waiting for operators"
          : "Joining";

  const share = async () => {
    const url = inviteUrlFromSession(window.location.origin, session);
    void requestNotifyPermission(typeof Notification === "undefined" ? undefined : Notification);
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Squelch · ${session.channelName}`,
          text: `${session.callsign} is on ${session.channelName}. Tap to listen.`,
          url,
        });
        setShareState("copied");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareState("copied");
      } else {
        setShareState("failed");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
        setShareState("copied");
      } catch {
        setShareState("failed");
      }
    }
    window.setTimeout(() => setShareState("idle"), 2200);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-muted">
            <Radio className="size-4" strokeWidth={1.75} />
            <span className="font-mono text-[11px] tracking-[0.28em] uppercase">Squelch</span>
          </div>
          <h1 className="mt-2 font-mono text-2xl tracking-[0.14em] text-fg uppercase">
            {session.channelName}
          </h1>
          <p className="mt-1 text-xs text-subtle">
            {netLabel}
            {session.mode === "closed" ? ` · ${session.serverAddress}` : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => void share()} className="shrink-0">
            <Share2 className="size-4" />
            {shareState === "copied" ? "Copied" : shareState === "failed" ? "Copy failed" : "Share"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onLeave} className="shrink-0">
            <LogOut className="size-4" />
            Leave
          </Button>
        </div>
      </header>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-4 shadow-panel">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">{status}</p>
          <Badge variant={radio.transmitting ? "tx" : radio.connectedCount > 0 ? "live" : "default"}>
            {radio.connectedCount}/{radio.operators.length || 0} linked
          </Badge>
        </div>
        <div className="mt-3">
          <VuMeter level={radio.level} hot={radio.transmitting} />
        </div>
        {radio.alert ? (
          <p
            role="status"
            aria-live="polite"
            className="mt-3 rounded-md border border-live/30 bg-live/10 px-3 py-2 text-sm text-fg"
          >
            {radio.alert.message}
          </p>
        ) : null}
        {radio.micError ? <p className="mt-3 text-xs text-tx">{radio.micError}</p> : null}
        {radio.channelFull ? (
          <p className="mt-3 text-xs text-muted">This channel is at capacity. Leave and try another.</p>
        ) : null}

        <ul className="mt-4 flex flex-col gap-2">
          <li className="flex items-center justify-between rounded-md bg-raised px-3 py-2">
            <span className="text-sm text-fg">{session.callsign}</span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-subtle">You</span>
          </li>
          {radio.operators.length === 0 ? (
            <li className="px-1 py-3 text-sm text-subtle">
              Nobody else on this channel yet. Share the link
              {session.mode === "closed" ? " and server address" : ""} — they tap once and hear you.
            </li>
          ) : (
            radio.operators.map((op) => (
              <li
                key={op.id}
                className="flex items-center justify-between gap-3 rounded-md bg-raised px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {op.speaking ? (
                    <Volume2 className="size-3.5 shrink-0 text-tx" />
                  ) : op.connectionState === "connected" ? (
                    <Volume2 className="size-3.5 shrink-0 text-live" />
                  ) : (
                    <VolumeX className="size-3.5 shrink-0 text-subtle" />
                  )}
                  <span className="truncate text-sm text-fg">{op.name}</span>
                </span>
                <span
                  className={cn(
                    "font-mono text-[11px] uppercase tracking-wider tabular-nums",
                    op.speaking ? "text-tx" : "text-subtle",
                  )}
                >
                  {op.speaking
                    ? "Talking"
                    : op.connectionState === "connected"
                      ? op.rttMs != null
                        ? `${op.rttMs} ms`
                        : "Linked"
                      : op.connectionState === "failed"
                        ? "Blocked"
                        : "Linking"}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mt-auto flex flex-col items-center gap-4 pt-8">
        <PttButton
          transmitting={radio.transmitting}
          disabled={!radio.micReady || radio.channelFull}
          onPress={radio.startTalk}
          onRelease={radio.stopTalk}
        />
        <p className="text-center text-xs text-subtle">
          {radio.micReady
            ? coarse
              ? "Press and hold the disc to transmit"
              : "Hold the disc or spacebar to transmit"
            : "Waiting for microphone"}
        </p>
      </section>
    </main>
  );
}
