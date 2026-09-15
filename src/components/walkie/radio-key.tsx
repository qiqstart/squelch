import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { shareKeyLabel, type ShareKeyState } from "@/lib/walkie/keys";

export { shareKeyLabel, type ShareKeyState };

export function RadioKey({
  label,
  sub,
  onClick,
  title,
}: {
  label: string;
  sub?: string;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button type="button" title={title ?? label} onClick={onClick} className="radio-key">
      <span className="radio-key-label">{label}</span>
      {sub ? <span className="radio-key-sub">{sub}</span> : null}
    </button>
  );
}

export function RadioKeyRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("radio-key-row", className)}>{children}</div>;
}
