import { cn } from "@/lib/utils";

export function PttButton({
  transmitting,
  disabled,
  onPress,
  onRelease,
}: {
  transmitting: boolean;
  disabled?: boolean;
  onPress: () => void;
  onRelease: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={transmitting}
      aria-label={transmitting ? "On air — release to stop" : "Hold to talk"}
      className={cn(
        "relative flex size-36 sm:size-44 select-none flex-col items-center justify-center",
        "rounded-full border-2 font-medium tracking-[0.18em]",
        "touch-none outline-none transition-[background-color,border-color,color,box-shadow,transform] duration-150",
        "ease-[cubic-bezier(0.22,1,0.36,1)]",
        "focus-visible:ring-2 focus-visible:ring-accent/60",
        transmitting
          ? "scale-[0.98] border-tx bg-tx text-tx-fg shadow-[0_0_0_10px_rgb(196_92_74_/_0.16)]"
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
      <span className="font-mono text-[11px] uppercase text-current/80">
        {transmitting ? "On air" : "Hold"}
      </span>
      <span className="mt-1 font-sans text-lg tracking-[0.28em] uppercase">
        {transmitting ? "Talk" : "Talk"}
      </span>
    </button>
  );
}
