"use client";

/** Tooltip único para todos os gráficos, no visual do app. */
export function ChartTooltip({
  active,
  payload,
  label,
  formatters,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; dataKey?: string | number }[];
  label?: string | number;
  formatters?: Record<string, (v: number) => string>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-xl">
      <p className="mb-1.5 font-medium text-foreground">{label}</p>
      <ul className="grid gap-1">
        {payload.map((p) => {
          const key = String(p.dataKey ?? p.name);
          const fmt = formatters?.[key];
          return (
            <li key={key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-[2px]" style={{ background: p.color }} />
                {p.name}
              </span>
              <span className="font-medium text-foreground tabular">{fmt ? fmt(Number(p.value)) : p.value}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function LegendItem({ color, label, shape = "square" }: { color: string; label: string; shape?: "square" | "line" }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      {shape === "line" ? (
        <span className="h-0.5 w-3 rounded-full" style={{ background: color }} />
      ) : (
        <span className="size-2 rounded-[2px]" style={{ background: color }} />
      )}
      {label}
    </span>
  );
}
