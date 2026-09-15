import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { shareKeyLabel, type ShareKeyState } from "@/lib/walkie/keys";

export { shareKeyLabel, type ShareKeyState };

export function RadioKey({
  label,
  sub,
  onClick,
  title,
  className,
}: {
  label: string;
  sub?: string;
  onClick: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <button type="button" title={title ?? label} onClick={onClick} className={cn("radio-key", className)}>
      <span className="radio-key-label">{label}</span>
      {sub ? <span className="radio-key-sub">{sub}</span> : null}
    </button>
  );
}

export function RadioKeyRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("radio-key-row", className)}>{children}</div>;
}
