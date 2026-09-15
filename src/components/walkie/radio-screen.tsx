import { useEffect, useState } from "react";
import { LogOut, Share2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OperatorFace } from "@/components/walkie/operator-face";
import { PttButton } from "@/components/walkie/ptt-button";
import { RadioShell, SpeakerGrille } from "@/components/walkie/radio-shell";
import { VuMeter } from "@/components/walkie/vu-meter";
import { cn } from "@/lib/utils";
import { formatChannelDial } from "@/lib/walkie/channels";
import { requestNotifyPermission } from "@/lib/walkie/alerts";
import { resolveOperatorFace } from "@/lib/walkie/faces";
import { sharePayload } from "@/lib/walkie/invite";
import { useWalkie } from "@/lib/walkie/use-walkie";
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
  const talking = radio.transmitting
    ? { name: session.callsign, face: session.operatorFace, self: true }
    : radio.operators.find((op) => op.speaking)
      ? {
          name: radio.operators.find((op) => op.speaking)!.name,
          face: radio.operators.find((op) => op.speaking)!.face,
          self: false,
        }
      : null;

  const status = radio.channelFull
    ? "Channel full"
    : radio.transmitting
      ? "On air"
      : radio.connectedCount > 0
        ? "Squelch open"
        : radio.joined
          ? "Waiting"
          : "Joining";

  const share = async () => {
    const payload = sharePayload(window.location.origin, session);
    void requestNotifyPermission(typeof Notification === "undefined" ? undefined : Notification);
    try {
      if (navigator.share) {
        await navigator.share({
          title: payload.description,
          text: payload.text,
          url: payload.url,
        });
        setShareState("copied");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload.text);
        setShareState("copied");
      } else {
        setShareState("failed");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(payload.text);
        setShareState("copied");
      } catch {
        setShareState("failed");
      }
    }
    window.setTimeout(() => setShareState("idle"), 2200);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
      <RadioShell faceId={session.faceId} transmitting={radio.transmitting}>
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="radio-led" />
            <span className="font-mono text-[11px] tracking-[0.28em] text-muted uppercase">Squelch</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => void share()}>
              <Share2 className="size-4" />
              {shareState === "copied" ? "Copied" : shareState === "failed" ? "Failed" : "Share"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onLeave}>
              <LogOut className="size-4" />
              Leave
            </Button>
          </div>
        </header>

        <section className="radio-lcd mt-3 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[11px] tracking-[0.22em] uppercase opacity-70">{netLabel}</p>
              <h1 className="mt-1 font-mono text-2xl tracking-[0.14em] uppercase">
                {formatChannelDial(session.channelNumber)}
              </h1>
              <p className="mt-1 truncate font-mono text-xs tracking-[0.18em] uppercase opacity-70">
                {session.channelName}
              </p>
            </div>
            <Badge variant={radio.transmitting ? "tx" : radio.connectedCount > 0 ? "live" : "default"}>
              {status}
            </Badge>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div
              className={cn(
                "flex size-12 items-center justify-center rounded-md border border-border bg-raised",
                talking ? "text-tx" : "text-muted",
              )}
            >
              <OperatorFace
                id={resolveOperatorFace(talking?.face ?? session.operatorFace)}
                className="size-8"
                title={talking?.name ?? session.callsign}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-sm tracking-wide uppercase">
                {talking ? talking.name : session.callsign}
              </p>
              <p className="mt-0.5 text-xs opacity-70">
                {talking ? (talking.self ? "You are talking" : "Incoming") : "Standby"}
              </p>
              <div className="mt-2">
                <VuMeter level={radio.level} hot={radio.transmitting} />
              </div>
            </div>
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
            <p className="mt-3 text-xs opacity-70">Channel is at capacity. Leave and try another.</p>
          ) : null}
        </section>

        <SpeakerGrille className="mt-3" />

        <ul className="mt-3 flex flex-col gap-2">
          <li className="flex items-center justify-between rounded-md bg-raised px-3 py-2">
            <span className="flex min-w-0 items-center gap-2 text-sm text-fg">
              <OperatorFace id={session.operatorFace} className="size-5 text-muted" />
              <span className="truncate">{session.callsign}</span>
            </span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-subtle">You</span>
          </li>
          {radio.operators.length === 0 ? (
            <li className="px-1 py-3 text-sm text-subtle">
              Share the link — they tap once and hear you.
            </li>
          ) : (
            radio.operators.map((op) => (
              <li
                key={op.id}
                className="flex items-center justify-between gap-3 rounded-md bg-raised px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <OperatorFace
                    id={resolveOperatorFace(op.face)}
                    className={cn(
                      "size-5",
                      op.speaking ? "text-tx" : op.connectionState === "connected" ? "text-live" : "text-subtle",
                    )}
                  />
                  <span className="truncate text-sm text-fg">{op.name}</span>
                </span>
                <span
                  className={cn(
                    "flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider tabular-nums",
                    op.speaking ? "text-tx" : "text-subtle",
                  )}
                >
                  {op.speaking ? (
                    <Volume2 className="size-3.5" />
                  ) : op.connectionState === "connected" ? null : (
                    <VolumeX className="size-3.5" />
                  )}
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

        <section className="mt-4 flex flex-col items-center gap-3">
          <PttButton
            transmitting={radio.transmitting}
            disabled={!radio.micReady || radio.channelFull}
            onPress={radio.startTalk}
            onRelease={radio.stopTalk}
          />
          <p className="text-center text-xs text-subtle">
            {radio.micReady
              ? coarse
                ? "Hold the disc to transmit — release for roger"
                : "Hold the disc or spacebar — release for roger"
              : "Waiting for microphone"}
          </p>
        </section>
      </RadioShell>
    </main>
  );
}
