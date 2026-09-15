import { createFileRoute } from "@tanstack/react-router";
import { handleChannelList } from "@/lib/multiplayer/signaling.server";

const handle = ({ request }: { request: Request }) => handleChannelList(request);

export const Route = createFileRoute("/api/channels")({
  server: { handlers: { GET: handle, OPTIONS: handle } },
});
