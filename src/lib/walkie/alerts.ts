/** Join/ready notifications for operators who open a share link. */

export type ReadyAlert = {
  id: string;
  name: string;
  viaInvite: boolean;
  message: string;
};

export function formatReadyMessage(name: string, viaInvite: boolean): string {
  const who = name.trim() || "An operator";
  return viaInvite ? `${who} used your link — ready to talk` : `${who} is ready to talk`;
}

export function makeReadyAlert(input: {
  id: string;
  name: string;
  viaInvite: boolean;
}): ReadyAlert {
  return {
    id: input.id,
    name: input.name.trim() || "An operator",
    viaInvite: input.viaInvite,
    message: formatReadyMessage(input.name, input.viaInvite),
  };
}

/** Peer ids that are connected now and were not in the previous snapshot. */
export function newlyConnectedIds(prevConnected: string[], nextConnected: string[]): string[] {
  const prev = new Set(prevConnected);
  return nextConnected.filter((id) => !prev.has(id));
}

export function shouldAnnounce(
  peerId: string,
  alreadyAnnounced: ReadonlySet<string>,
): boolean {
  return Boolean(peerId) && !alreadyAnnounced.has(peerId);
}

export function markAnnounced(peerId: string, announced: Set<string>): Set<string> {
  if (announced.has(peerId)) return announced;
  const next = new Set(announced);
  next.add(peerId);
  return next;
}

export type NotifyFn = (title: string, options: { body: string; tag: string }) => void;

export function notificationPayload(alert: ReadyAlert): {
  title: string;
  body: string;
  tag: string;
} {
  return {
    title: "Squelch",
    body: alert.message,
    tag: `squelch-${alert.id}`,
  };
}

export function postReadyNotification(alert: ReadyAlert, notify: NotifyFn | null): boolean {
  if (!notify) return false;
  const payload = notificationPayload(alert);
  notify(payload.title, { body: payload.body, tag: payload.tag });
  return true;
}

export async function requestNotifyPermission(
  NotificationCtor: { permission: string; requestPermission: () => Promise<NotificationPermission> } | undefined,
): Promise<"granted" | "denied" | "default" | "unsupported"> {
  if (!NotificationCtor) return "unsupported";
  if (NotificationCtor.permission === "granted") return "granted";
  if (NotificationCtor.permission === "denied") return "denied";
  try {
    const result = await NotificationCtor.requestPermission();
    return result;
  } catch {
    return "default";
  }
}
