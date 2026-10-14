import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Delta } from "./delta";

export interface Kpi {
  label: string;
  value: string;
  hint?: string;
  delta?: number | null;
  invertDelta?: boolean;
  previous?: string;
  accent?: string;
}

/** Faixa única de indicadores, dividida por linhas — em vez de quatro cartões soltos. */
export function KpiStrip({ items, className }: { items: Kpi[]; className?: string }) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-card lg:grid-cols-4",
        "[&>div]:border-border max-lg:[&>div:nth-child(odd)]:border-r max-lg:[&>div:nth-child(-n+2)]:border-b lg:[&>div:not(:last-child)]:border-r",
        className,
      )}
    >
      {items.map((k) => (
        <div key={k.label} className="min-w-0 px-4 py-4 sm:px-5">
          <dt className="flex items-center gap-2 text-[13px] text-muted-foreground">
            {k.accent && <span className="size-1.5 shrink-0 rounded-full" style={{ background: k.accent }} />}
            {k.hint ? (
              <Tooltip content={k.hint}>
                <span className="cursor-help truncate underline decoration-dotted decoration-subtle-foreground underline-offset-4" tabIndex={0}>
                  {k.label}
                </span>
              </Tooltip>
            ) : (
              <span className="truncate">{k.label}</span>
            )}
          </dt>
          <dd className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-2xl font-semibold tracking-tight tabular sm:text-[28px]">{k.value}</span>
            {k.delta !== undefined && <Delta value={k.delta} invert={k.invertDelta} />}
          </dd>
          {k.previous && <p className="mt-1 truncate text-xs text-subtle-foreground">{k.previous}</p>}
        </div>
      ))}
    </dl>
  );
}
