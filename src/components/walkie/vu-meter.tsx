import { barsFromLevel } from "@/lib/walkie/ptt";
import { cn } from "@/lib/utils";

export function VuMeter({
  level,
  hot,
  bars = 16,
}: {
  level: number;
  hot: boolean;
  bars?: number;
}) {
  const lit = barsFromLevel(level, bars);
  return (
    <div
      className="flex h-3 w-full items-end gap-0.5"
      role="meter"
      aria-label="Signal level"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(level * 100)}
    >
      {lit.map((on, i) => (
        <span
          key={i}
          className={cn(
            "min-w-0 flex-1 rounded-[1px] transition-colors duration-75",
            on ? (hot ? "bg-tx" : "bg-accent") : "bg-border",
          )}
          style={{ height: `${30 + (i / bars) * 70}%` }}
        />
      ))}
    </div>
  );
}
