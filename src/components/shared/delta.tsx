import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Variação vs. período anterior. `invert` para métricas em que subir é ruim (atrasadas).
 */
export function Delta({ value, invert, className }: { value: number | null; invert?: boolean; className?: string }) {
  if (value === null) {
    return <span className={cn("text-xs text-muted-foreground", className)}>novo</span>;
  }
  if (value === 0) {
    return (
      <span className={cn("inline-flex items-center gap-0.5 text-xs text-muted-foreground", className)}>
        <Minus className="size-3" aria-hidden />
        0%
      </span>
    );
  }
  const up = value > 0;
  const good = invert ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium tabular", good ? "text-success" : "text-destructive", className)}>
      <Icon className="size-3.5" aria-hidden />
      {up ? "+" : ""}
      {value.toLocaleString("pt-BR")}%
      <span className="sr-only">{up ? "de aumento" : "de redução"} em relação ao período anterior</span>
    </span>
  );
}
