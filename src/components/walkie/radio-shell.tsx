import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { resolveRadioFace } from "@/lib/walkie/faces";

export function RadioShell({
  faceId,
  transmitting,
  children,
}: {
  faceId: string;
  transmitting?: boolean;
  children: ReactNode;
}) {
  const face = resolveRadioFace(faceId);
  return (
    <div
      data-face={face}
      data-tx={transmitting ? "on" : "off"}
      className="radio-shell mx-auto flex w-full max-w-md flex-col items-center"
    >
      <div className="radio-antenna" aria-hidden="true" />
      <div className="radio-housing relative flex w-full flex-col">{children}</div>
    </div>
  );
}

export function SpeakerGrille({ className }: { className?: string }) {
  return <div className={cn("radio-grille", className)} aria-hidden="true" />;
}
