"use client";

import { Loader2, Pause, Play, Square, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ProjectDot } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FOCUS_DEFAULT_MINUTES } from "@/lib/constants";
import { elapsedMs, formatClock } from "@/lib/focus";
import { cn } from "@/lib/utils";
import {
  cancelFocusAction,
  finishFocusAction,
  pauseFocusAction,
  resumeFocusAction,
  startFocusAction,
} from "@/server/actions/focus";

export interface ActiveSessionDTO {
  id: string;
  status: "RUNNING" | "PAUSED";
  plannedMinutes: number;
  startedAt: string;
  pausedAt: string | null;
  totalPausedMs: number;
  project: { id: string; name: string; color: string } | null;
  task: { id: string; title: string } | null;
}

const NONE = "__none__";
const PRESETS = [15, 25, 50, 90];

export function FocusTimer({
  session: initial,
  serverNow,
  projects,
  tasks,
}: {
  session: ActiveSessionDTO | null;
  serverNow: string;
  projects: { id: string; name: string; color: string }[];
  tasks: { id: string; title: string; projectId: string | null }[];
}) {
  const router = useRouter();
  const [session, setSession] = useState(initial);
  const [pending, start] = useTransition();
  // Compensa diferença entre relógio do servidor e do navegador.
  const [skew] = useState(() => Date.parse(serverNow) - Date.now());
  const [now, setNow] = useState(() => Date.now() + skew);
  const finishing = useRef(false);

  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setSession(initial);
  }

  useEffect(() => {
    if (!session || session.status !== "RUNNING") return;
    const id = setInterval(() => setNow(Date.now() + skew), 250);
    return () => clearInterval(id);
  }, [session, skew]);

  const plannedMs = (session?.plannedMinutes ?? 0) * 60_000;
  const elapsed = session ? elapsedMs(session, now) : 0;
  const remaining = Math.max(0, plannedMs - elapsed);
  const progress = session ? Math.min(1, elapsed / plannedMs) : 0;

  const finish = useCallback(
    (auto = false) => {
      if (!session || finishing.current) return;
      finishing.current = true;
      start(async () => {
        const res = await finishFocusAction(session.id);
        finishing.current = false;
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success(auto ? "Tempo concluído — bom trabalho!" : "Sessão registrada", {
          description: `${Math.round(res.data.durationSeconds / 60)} min de foco salvos no histórico.`,
        });
        setSession(null);
        router.refresh();
      });
    },
    [session, router],
  );

  // Conclui sozinho ao atingir a duração planejada (também após recarregar a página).
  useEffect(() => {
    if (session?.status === "RUNNING" && remaining === 0) finish(true);
  }, [remaining, session?.status, finish]);

  useEffect(() => {
    const base = "Foco · DevFlow";
    document.title = session ? `${formatClock(remaining)} ${session.status === "PAUSED" ? "(pausado)" : ""} · Foco` : base;
    return () => {
      document.title = base;
    };
  }, [remaining, session]);

  function pause() {
    if (!session) return;
    const prev = session;
    setSession({ ...session, status: "PAUSED", pausedAt: new Date(Date.now() + skew).toISOString() });
    start(async () => {
      const res = await pauseFocusAction(prev.id);
      if (!res.ok) {
        setSession(prev);
        toast.error(res.error);
      } else router.refresh();
    });
  }

  function resume() {
    if (!session?.pausedAt) return;
    const prev = session;
    const t = Date.now() + skew;
    setSession({ ...session, status: "RUNNING", pausedAt: null, totalPausedMs: session.totalPausedMs + (t - Date.parse(session.pausedAt)) });
    setNow(t);
    start(async () => {
      const res = await resumeFocusAction(prev.id);
      if (!res.ok) {
        setSession(prev);
        toast.error(res.error);
      } else router.refresh();
    });
  }

  function cancel() {
    if (!session) return;
    start(async () => {
      const res = await cancelFocusAction(session.id);
      if (!res.ok) return void toast.error(res.error);
      toast("Sessão descartada");
      setSession(null);
      router.refresh();
    });
  }

  return (
    <section aria-labelledby="timer-title" className="rounded-xl border border-border bg-card lg:sticky lg:top-8">
      <h2 id="timer-title" className="sr-only">
        Temporizador de foco
      </h2>
      {session ? (
        <div className="flex flex-col items-center px-5 py-8 sm:py-10">
          <Ring progress={progress} paused={session.status === "PAUSED"}>
            <span className="font-mono text-[56px] leading-none font-medium tracking-tight tabular sm:text-[68px]" role="timer" aria-live="off">
              {formatClock(remaining)}
            </span>
            <span className={cn("mt-3 text-sm", session.status === "PAUSED" ? "text-warning" : "text-muted-foreground")}>
              {session.status === "PAUSED" ? "Pausado" : `de ${session.plannedMinutes} min`}
            </span>
          </Ring>

          {(session.project || session.task) && (
            <div className="mt-6 flex max-w-full flex-col items-center gap-1 text-center text-sm">
              {session.task && <p className="max-w-full truncate font-medium">{session.task.title}</p>}
              {session.project && (
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <ProjectDot color={session.project.color} />
                  {session.project.name}
                </p>
              )}
            </div>
          )}

          <div className="mt-8 flex w-full max-w-sm flex-col gap-2 sm:flex-row">
            {session.status === "RUNNING" ? (
              <Button size="lg" variant="secondary" className="flex-1" onClick={pause} disabled={pending}>
                <Pause /> Pausar
              </Button>
            ) : (
              <Button size="lg" className="flex-1" onClick={resume} disabled={pending}>
                <Play /> Retomar
              </Button>
            )}
            <Button size="lg" variant={session.status === "RUNNING" ? "default" : "secondary"} className="flex-1" onClick={() => finish()} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Square />} Finalizar
            </Button>
          </div>
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="mt-4 inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-destructive disabled:opacity-50"
          >
            <X className="size-3.5" /> Descartar sessão
          </button>
        </div>
      ) : (
        <StartForm
          projects={projects}
          tasks={tasks}
          onStarted={(s, sn) => {
            setSession(s);
            setNow(Date.parse(sn));
            router.refresh();
          }}
        />
      )}
    </section>
  );
}

function Ring({ progress, paused, children }: { progress: number; paused: boolean; children: React.ReactNode }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid aspect-square w-full max-w-[300px] place-items-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-raised)" strokeWidth="2.5" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={paused ? "var(--warning)" : "var(--primary)"}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          className="transition-[stroke-dashoffset] duration-300 ease-linear"
        />
      </svg>
      <div className="relative flex flex-col items-center">{children}</div>
    </div>
  );
}

function StartForm({
  projects,
  tasks,
  onStarted,
}: {
  projects: { id: string; name: string; color: string }[];
  tasks: { id: string; title: string; projectId: string | null }[];
  onStarted: (s: ActiveSessionDTO, serverNow: string) => void;
}) {
  const [minutes, setMinutes] = useState(String(FOCUS_DEFAULT_MINUTES));
  const [projectId, setProjectId] = useState(NONE);
  const [taskId, setTaskId] = useState(NONE);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const visibleTasks = projectId === NONE ? tasks : tasks.filter((t) => t.projectId === projectId);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await startFocusAction({
        plannedMinutes: minutes,
        projectId: projectId === NONE ? "" : projectId,
        taskId: taskId === NONE ? "" : taskId,
      });
      if (!res.ok) {
        setError(res.fieldErrors?.plannedMinutes?.[0] ?? res.error);
        return;
      }
      const { serverNow, ...s } = res.data;
      onStarted({ ...s, status: "RUNNING" }, serverNow);
    });
  }

  return (
    <form onSubmit={submit} className="px-5 py-8 sm:px-8 sm:py-10">
      <div className="text-center">
        <p className="font-mono text-[56px] leading-none font-medium tracking-tight text-foreground/90 tabular sm:text-[68px]">
          {formatClock((Number(minutes) || 0) * 60_000)}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">Escolha a duração e o que você vai trabalhar.</p>
      </div>

      <fieldset className="mt-8">
        <legend className="mb-2 text-[13px] font-medium">Duração</legend>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setMinutes(String(p))}
              aria-pressed={minutes === String(p)}
              className={cn(
                "h-9 rounded-md border px-3.5 text-sm tabular transition-colors",
                minutes === String(p)
                  ? "border-primary/50 bg-primary-soft text-foreground"
                  : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
              )}
            >
              {p} min
            </button>
          ))}
          <div className="flex items-center gap-2">
            <Label htmlFor="custom-minutes" className="sr-only">
              Minutos personalizados
            </Label>
            <Input
              id="custom-minutes"
              type="number"
              inputMode="numeric"
              min={1}
              max={180}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="w-20 tabular"
              aria-invalid={!!error}
            />
            <span className="text-sm text-muted-foreground">min</span>
          </div>
        </div>
      </fieldset>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="f-project">Projeto (opcional)</Label>
          <Select
            value={projectId}
            onValueChange={(v) => {
              setProjectId(v);
              setTaskId(NONE);
            }}
          >
            <SelectTrigger id="f-project">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Nenhum</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2">
                    <ProjectDot color={p.color} />
                    {p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="f-task">Tarefa (opcional)</Label>
          <Select value={taskId} onValueChange={setTaskId} disabled={visibleTasks.length === 0}>
            <SelectTrigger id="f-task">
              <SelectValue placeholder="Sem tarefas abertas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Nenhuma</SelectItem>
              {visibleTasks.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="mt-6 w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Play />} Iniciar sessão
      </Button>
    </form>
  );
}
