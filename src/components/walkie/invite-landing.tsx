import { useEffect, useState, type FormEvent } from "react";
import { Radio, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  generateGuestCallsign,
  inviteHeadline,
  sessionFromInvite,
  type ParsedInvite,
} from "@/lib/walkie/invite";
import { loadPrefs, savePrefs, type WalkieSession } from "@/lib/walkie/session";

export function InviteLanding({
  invite,
  onJoin,
  onSetup,
}: {
  invite: ParsedInvite;
  onJoin: (session: WalkieSession) => void;
  onSetup: () => void;
}) {
  const [callsign, setCallsign] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadPrefs().callsign;
    setCallsign(stored || generateGuestCallsign());
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = sessionFromInvite(invite, callsign);
    if ("errors" in result) {
      setError(result.errors[0]?.message ?? "Could not join");
      return;
    }
    const prefs = loadPrefs();
    savePrefs({
      ...prefs,
      callsign: result.session.callsign,
      channel: result.session.channelId,
      mode: result.session.mode,
      serverAddress: result.session.serverAddress,
      faceId: result.session.faceId,
      operatorFace: prefs.operatorFace,
    });
    onJoin(result.session);
  };

  const netLabel = invite.mode === "closed" ? "Closed net" : "World net";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6">
      <header className="mb-8">
        <div className="mb-5 flex items-center gap-2 text-muted">
          <Radio className="size-4" strokeWidth={1.75} />
          <span className="font-mono text-[11px] tracking-[0.28em] uppercase">Squelch</span>
        </div>
        <p className="font-mono text-[11px] tracking-[0.22em] text-muted uppercase">
          {invite.channelName}
          <span className="text-subtle"> · {netLabel}</span>
        </p>
        <h1 className="mt-3 font-sans text-4xl font-medium leading-tight tracking-tight text-fg sm:text-5xl">
          {inviteHeadline(invite)}
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
          Tap once to open the channel. You will hear them as soon as they key the mic.
        </p>
      </header>

      <form onSubmit={submit} className="flex flex-1 flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-callsign">Your callsign</Label>
          <Input
            id="invite-callsign"
            name="callsign"
            autoComplete="nickname"
            maxLength={24}
            value={callsign}
            onChange={(e) => {
              setCallsign(e.target.value);
              setError(null);
            }}
            aria-invalid={Boolean(error)}
          />
          {error ? <p className="text-xs text-tx">{error}</p> : null}
        </div>

        <div className="mt-auto flex flex-col gap-3 pt-2">
          <Button type="submit" size="lg" className="w-full">
            <Volume2 className="size-4" />
            Tap to listen
          </Button>
          <button
            type="button"
            onClick={onSetup}
            className="text-center text-xs text-subtle underline-offset-4 hover:text-muted hover:underline"
          >
            Open full setup
          </button>
        </div>
      </form>
    </main>
  );
}
