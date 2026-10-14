"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addDays, weekStart, type DateRange } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function ReportFilters({
  range,
  today,
  projectId,
  projects,
}: {
  range: DateRange;
  today: string;
  projectId: string | null;
  projects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);

  const rangeKey = `${range.from}|${range.to}`;
  const [prevKey, setPrevKey] = useState(rangeKey);
  if (rangeKey !== prevKey) {
    setPrevKey(rangeKey);
    setFrom(range.from);
    setTo(range.to);
  }

  function apply(next: { from?: string; to?: string; projectId?: string | null }) {
    const qs = new URLSearchParams(params.toString());
    const f = next.from ?? from;
    const t = next.to ?? to;
    qs.set("from", f);
    qs.set("to", t);
    const p = next.projectId === undefined ? projectId : next.projectId;
    if (p) qs.set("projectId", p);
    else qs.delete("projectId");
    start(() => router.replace(`${pathname}?${qs.toString()}`, { scroll: false }));
  }

  const presets = [
    { label: "7 dias", from: addDays(today, -6), to: today },
    { label: "30 dias", from: addDays(today, -29), to: today },
    { label: "90 dias", from: addDays(today, -89), to: today },
    { label: "Esta semana", from: weekStart(today), to: today },
    { label: "Este mês", from: `${today.slice(0, 8)}01`, to: today },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Períodos rápidos">
        {presets.map((p) => {
          const active = p.from === range.from && p.to === range.to;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => apply({ from: p.from, to: p.to })}
              aria-pressed={active}
              className={cn(
                "h-8 rounded-md border px-3 text-[13px] transition-colors",
                active ? "border-primary/50 bg-primary-soft text-foreground" : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <form
        className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-[1fr_1fr_1.4fr_auto] md:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          apply({});
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="r-from">De</Label>
          <Input id="r-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="r-to">Até</Label>
          <Input id="r-to" type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} required />
        </div>
        <div className="col-span-2 grid gap-1.5 md:col-span-1">
          <Label htmlFor="r-project">Projeto</Label>
          <Select value={projectId ?? "ALL"} onValueChange={(v) => apply({ projectId: v === "ALL" ? null : v })}>
            <SelectTrigger id="r-project">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os projetos</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" variant="secondary" className="col-span-2 md:col-span-1" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Aplicar
        </Button>
      </form>
    </div>
  );
}
