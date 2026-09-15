import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BootScreen } from "@/components/walkie/boot-screen";
import { JoinScreen } from "@/components/walkie/join-screen";
import { RadioScreen } from "@/components/walkie/radio-screen";
import { formatChannelDial } from "@/lib/walkie/channels";
import {
  autoJoinFromInvite,
  coerceInviteSearch,
  parseInviteSearch,
  shouldAutoJoin,
} from "@/lib/walkie/invite";
import { loadPrefs, savePrefs, type WalkieSession } from "@/lib/walkie/session";

export const Route = createFileRoute("/")({
  validateSearch: (raw: Record<string, unknown>) => coerceInviteSearch(raw),
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  const parsed = parseInviteSearch(search);
  const [session, setSession] = useState<WalkieSession | null>(null);
  const [skipInvite, setSkipInvite] = useState(false);
  const [booting, setBooting] = useState(() => shouldAutoJoin(parsed, false));

  useEffect(() => {
    if (session || skipInvite) {
      setBooting(false);
      return;
    }
    const parsedNow = parseInviteSearch(search);
    if (!shouldAutoJoin(parsedNow, skipInvite) || !parsedNow.ok) {
      setBooting(false);
      return;
    }
    const prefs = loadPrefs();
    const result = autoJoinFromInvite(parsedNow.invite, prefs);
    if ("session" in result) {
      savePrefs({
        ...prefs,
        callsign: result.session.callsign,
        channel: result.session.channelId,
        mode: result.session.mode,
        serverAddress: result.session.serverAddress,
        faceId: result.session.faceId,
        operatorFace: result.session.operatorFace,
      });
      setSession(result.session);
    }
    setBooting(false);
  }, [search, skipInvite, session]);

  if (session) {
    return (
      <RadioScreen
        key={`${session.signalingUrl}:${session.channelId}:${session.callsign}`}
        session={session}
        onLeave={() => {
          setSession(null);
          setSkipInvite(true);
        }}
      />
    );
  }

  if (booting) {
    return (
      <BootScreen
        faceId={parsed.ok ? parsed.invite.faceId ?? undefined : undefined}
        channelDial={parsed.ok ? formatChannelDial(parsed.invite.channelNumber) : undefined}
      />
    );
  }

  return (
    <JoinScreen
      onJoin={setSession}
      initialChannel={parsed.ok ? parsed.invite.channel : search.c}
      initialMode={parsed.ok ? parsed.invite.mode : undefined}
      initialServer={parsed.ok ? parsed.invite.serverAddress : search.s}
    />
  );
}
