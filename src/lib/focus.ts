/**
 * Cálculo da duração de uma sessão de foco a partir dos timestamps persistidos.
 * Funciona igual no servidor e no cliente, então o timer sobrevive a recarregamentos.
 */
export interface FocusTimestamps {
  startedAt: Date | string;
  pausedAt: Date | string | null;
  endedAt?: Date | string | null;
  totalPausedMs: number;
}

const t = (d: Date | string) => (typeof d === "string" ? Date.parse(d) : d.getTime());

export function elapsedMs(s: FocusTimestamps, now: Date | number = Date.now()): number {
  const nowMs = typeof now === "number" ? now : now.getTime();
  const reference = s.endedAt ? t(s.endedAt) : s.pausedAt ? t(s.pausedAt) : nowMs;
  return Math.max(0, reference - t(s.startedAt) - s.totalPausedMs);
}

/** Duração final (segundos), limitada à duração planejada. */
export function finalDurationSeconds(s: FocusTimestamps, plannedMinutes: number, now: Date | number = Date.now()) {
  const capped = Math.min(elapsedMs(s, now), plannedMinutes * 60_000);
  return Math.round(capped / 1000);
}

export function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mmss = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}
