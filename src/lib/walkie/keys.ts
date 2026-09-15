export type ShareKeyState = "idle" | "copied" | "failed";

export function shareKeyLabel(state: ShareKeyState): string {
  if (state === "copied") return "OK";
  if (state === "failed") return "ERR";
  return "SHARE";
}
