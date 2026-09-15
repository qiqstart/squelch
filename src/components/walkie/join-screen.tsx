import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Radio, Globe, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { OperatorFace } from "@/components/walkie/operator-face";
import { cn } from "@/lib/utils";
import { mergeOccupancy, PUBLIC_CHANNELS, type Occupancy } from "@/lib/walkie/channels";
import { OPERATOR_FACES, RADIO_FACES } from "@/lib/walkie/faces";
import { resolveChannelsUrl } from "@/lib/walkie/server";
import {
  buildSession,
  defaultPrefs,
  loadPrefs,
  savePrefs,
  type JoinError,
  type WalkiePrefs,
  type WalkieSession,
} from "@/lib/walkie/session";
import type { NetworkMode } from "@/lib/walkie/protocol";

export function JoinScreen({
  onJoin,
  initialChannel,
  initialMode,
  initialServer,
}: {
  onJoin: (session: WalkieSession) => void;
  initialChannel?: string;
  initialMode?: NetworkMode;
  initialServer?: string;
}) {
  const [prefs, setPrefs] = useState<WalkiePrefs>(defaultPrefs);
  const [customChannel, setCustomChannel] = useState("");
  const [errors, setErrors] = useState<JoinError[]>([]);
  const [occupancy, setOccupancy] = useState<Occupancy[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = loadPrefs();
    const next: WalkiePrefs = {
      ...stored,
      channel: initialChannel || stored.channel,
      mode: initialMode ?? stored.mode,
      serverAddress: initialServer || stored.serverAddress,
    };
    setPrefs(next);
    const ch = next.channel;
    if (ch && !PUBLIC_CHANNELS.some((c) => c.id === ch)) {
      setCustomChannel(ch);
    }
    setHydrated(true);
  }, [initialChannel, initialMode, initialServer]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    const load = async () => {
      try {
        const url = resolveChannelsUrl(prefs.mode, prefs.serverAddress);
        const res = await fetch(url);
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as { channels?: Occupancy[] };
        if (!cancelled && Array.isArray(body.channels)) setOccupancy(body.channels);
      } catch {
        if (!cancelled) setOccupancy([]);
      }
    };
    void load();
    const id = window.setInterval(() => void load(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [hydrated, prefs.mode, prefs.serverAddress]);

  const channels = useMemo(() => mergeOccupancy(occupancy), [occupancy]);
  const fieldError = (field: JoinError["field"]) => errors.find((e) => e.field === field)?.message;

  const update = (patch: Partial<WalkiePrefs>) => {
    setPrefs((p) => ({ ...p, ...patch }));
    setErrors([]);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: WalkiePrefs = {
      ...prefs,
      channel: customChannel.trim() ? customChannel : prefs.channel,
    };
    const result = buildSession(next);
    if ("errors" in result) {
      setErrors(result.errors);
      return;
    }
    savePrefs(next);
    onJoin(result.session);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6">
      <header className="mb-8">
        <div className="mb-5 flex items-center gap-2 text-muted">
          <Radio className="size-4" strokeWidth={1.75} />
          <span className="font-mono text-[11px] tracking-[0.28em] uppercase">Squelch</span>
        </div>
        <h1 className="font-sans text-4xl font-medium leading-tight tracking-tight text-fg sm:text-5xl">
          Hold to talk.
          <span className="mt-1 block text-muted">Hear them now.</span>
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
          Pick a channel and press the disc. Audio is peer-to-peer — the server only
          introduces you.
        </p>
      </header>

      <form onSubmit={submit} className="flex flex-1 flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="callsign">Callsign</Label>
          <Input
            id="callsign"
            name="callsign"
            autoComplete="nickname"
            placeholder="FOX-1"
            maxLength={24}
            value={prefs.callsign}
            onChange={(e) => update({ callsign: e.target.value })}
            aria-invalid={Boolean(fieldError("callsign"))}
          />
          {fieldError("callsign") ? (
            <p className="text-xs text-tx">{fieldError("callsign")}</p>
          ) : (
            <p className="text-xs text-subtle">Shown to operators on this channel.</p>
          )}
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs font-medium tracking-wide text-muted">Network</legend>
          <div className="grid grid-cols-2 gap-2">
            <ModeCard
              active={prefs.mode === "world"}
              icon={<Globe className="size-4" strokeWidth={1.75} />}
              title="World"
              blurb="This Squelch"
              onClick={() => update({ mode: "world" as NetworkMode })}
            />
            <ModeCard
              active={prefs.mode === "closed"}
              icon={<Lock className="size-4" strokeWidth={1.75} />}
              title="Closed"
              blurb="Your server"
              onClick={() => update({ mode: "closed" as NetworkMode })}
            />
          </div>
          {prefs.mode === "closed" ? (
            <div className="flex flex-col gap-2 pt-1">
              <Label htmlFor="server">Server address</Label>
              <Input
                id="server"
                name="server"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="https://squelch.your-domain"
                value={prefs.serverAddress}
                onChange={(e) => update({ serverAddress: e.target.value })}
                aria-invalid={Boolean(fieldError("server"))}
              />
              {fieldError("server") ? (
                <p className="text-xs text-tx">{fieldError("server")}</p>
              ) : (
                <p className="text-xs text-subtle">
                  Point at another Squelch instance. Only people on that server can hear you.
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-subtle">
              Public net on this app. A unique channel name is still a private room.
            </p>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs font-medium tracking-wide text-muted">Channel</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {channels.map((ch) => {
              const selected = prefs.channel === ch.id && !customChannel.trim();
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => {
                    setCustomChannel("");
                    update({ channel: ch.id });
                  }}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-lg border px-3 py-3 text-left transition-colors duration-150",
                    selected
                      ? "border-accent bg-raised text-fg"
                      : "border-border bg-surface text-muted hover:border-accent/40 hover:text-fg",
                  )}
                >
                  <span className="font-mono text-[11px] tracking-[0.18em] uppercase">{ch.name}</span>
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="text-xs text-subtle">{ch.blurb}</span>
                    {ch.listeners > 0 ? (
                      <Badge variant="live">{ch.listeners}</Badge>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
          <Label htmlFor="custom-channel" className="pt-1">
            Private channel
          </Label>
          <Input
            id="custom-channel"
            name="custom-channel"
            placeholder="night-watch"
            autoCapitalize="none"
            autoCorrect="off"
            value={customChannel}
            onChange={(e) => {
              setCustomChannel(e.target.value);
              if (e.target.value.trim()) update({ channel: e.target.value });
            }}
            aria-invalid={Boolean(fieldError("channel"))}
          />
          {fieldError("channel") ? <p className="text-xs text-tx">{fieldError("channel")}</p> : null}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs font-medium tracking-wide text-muted">Radio face</legend>
          <div className="grid grid-cols-4 gap-2">
            {RADIO_FACES.map((face) => {
              const selected = prefs.faceId === face.id;
              return (
                <button
                  key={face.id}
                  type="button"
                  onClick={() => update({ faceId: face.id })}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-lg border px-2.5 py-2.5 text-left transition-colors duration-150",
                    selected
                      ? "border-accent bg-raised text-fg"
                      : "border-border bg-surface text-muted hover:border-accent/40 hover:text-fg",
                  )}
                >
                  <span
                    data-face={face.id}
                    className="radio-shell mb-1 h-6 w-full rounded-md border border-border"
                    style={{ background: "var(--radio-shell)" }}
                  />
                  <span className="font-mono text-[11px] tracking-[0.14em] uppercase">{face.name}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs font-medium tracking-wide text-muted">Your mark</legend>
          <div className="grid grid-cols-6 gap-2">
            {OPERATOR_FACES.map((face) => {
              const selected = prefs.operatorFace === face.id;
              return (
                <button
                  key={face.id}
                  type="button"
                  aria-label={face.name}
                  aria-pressed={selected}
                  onClick={() => update({ operatorFace: face.id })}
                  className={cn(
                    "flex size-11 items-center justify-center rounded-lg border transition-colors duration-150",
                    selected
                      ? "border-accent bg-raised text-fg"
                      : "border-border bg-surface text-muted hover:border-accent/40 hover:text-fg",
                  )}
                >
                  <OperatorFace id={face.id} className="size-6" />
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-auto pt-2">
          <Button type="submit" size="lg" className="w-full">
            Open channel
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </form>
    </main>
  );
}

function ModeCard({
  active,
  icon,
  title,
  blurb,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  title: string;
  blurb: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors duration-150",
        active ? "border-accent bg-raised" : "border-border bg-surface hover:border-accent/40",
      )}
    >
      <span className={cn("mt-0.5", active ? "text-fg" : "text-muted")}>{icon}</span>
      <span>
        <span className="block text-sm font-medium text-fg">{title}</span>
        <span className="block text-xs text-subtle">{blurb}</span>
      </span>
    </button>
  );
}
