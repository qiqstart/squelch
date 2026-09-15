import { cn } from "@/lib/utils";

export function PttButton({
  transmitting,
  disabled,
  onPress,
  onRelease,
  shape = "disc",
}: {
  transmitting: boolean;
  disabled?: boolean;
  onPress: () => void;
  onRelease: () => void;
  shape?: "disc" | "bar";
}) {
  const bar = shape === "bar";
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={transmitting}
      aria-label={transmitting ? "On air — release to stop" : "Hold to talk"}
      className={cn(
        "relative select-none font-medium tracking-[0.18em]",
        "border-2 touch-none outline-none",
        "transition-[background-color,border-color,color,box-shadow,transform] duration-150",
        "ease-[cubic-bezier(0.22,1,0.36,1)]",
        "focus-visible:ring-2 focus-visible:ring-accent/60",
        bar
          ? "flex h-52 w-14 shrink-0 flex-col items-center justify-center rounded-[18px] sm:h-60"
          : "flex size-36 sm:size-44 flex-col items-center justify-center rounded-full",
        transmitting
          ? "scale-[0.98] border-tx bg-tx text-tx-fg shadow-[0_0_0_8px_rgb(196_92_74_/_0.16)]"
          : "border-border bg-raised text-fg hover:border-accent/50",
        disabled && "opacity-40",
      )}
      onPointerDown={(e) => {
        if (disabled) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        onPress();
      }}
      onPointerUp={onRelease}
      onPointerCancel={onRelease}
      onLostPointerCapture={onRelease}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className={cn("font-mono text-[11px] uppercase text-current/80", bar && "rotate-180 [writing-mode:vertical-rl]")}>
        {transmitting ? "On air" : "Hold"}
      </span>
      <span className={cn("font-sans text-lg tracking-[0.28em] uppercase", bar ? "rotate-180 [writing-mode:vertical-rl]" : "mt-1")}>
        Talk
      </span>
    </button>
  );
}
