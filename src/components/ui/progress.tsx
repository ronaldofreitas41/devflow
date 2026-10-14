import { cn } from "@/lib/utils";

export function Progress({ value, color, className, label }: { value: number; color?: string; className?: string; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-raised", className)}
    >
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${v}%`, background: color ?? "var(--primary)" }} />
    </div>
  );
}
