import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { InviteLanding } from "@/components/walkie/invite-landing";
import { JoinScreen } from "@/components/walkie/join-screen";
import { RadioScreen } from "@/components/walkie/radio-screen";
import { coerceInviteSearch, parseInviteSearch } from "@/lib/walkie/invite";
import type { WalkieSession } from "@/lib/walkie/session";

export const Route = createFileRoute("/")({
  validateSearch: (raw: Record<string, unknown>) => coerceInviteSearch(raw),
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  const parsed = parseInviteSearch(search);
  const [session, setSession] = useState<WalkieSession | null>(null);
  const [skipInvite, setSkipInvite] = useState(false);

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

  if (parsed.ok && !skipInvite) {
    return (
      <InviteLanding
        invite={parsed.invite}
        onJoin={setSession}
        onSetup={() => setSkipInvite(true)}
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
