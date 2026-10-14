import { describe, expect, it } from "vitest";
import { elapsedMs, finalDurationSeconds, formatClock } from "@/lib/focus";

const start = new Date("2026-10-14T12:00:00Z");
const at = (min: number) => new Date(start.getTime() + min * 60_000);

describe("duração da sessão de foco a partir de timestamps", () => {
  it("conta o tempo corrido desde o início", () => {
    expect(elapsedMs({ startedAt: start, pausedAt: null, totalPausedMs: 0 }, at(10))).toBe(10 * 60_000);
  });

  it("congela enquanto pausada e desconta pausas anteriores", () => {
    const s = { startedAt: start, pausedAt: at(12), totalPausedMs: 2 * 60_000 };
    expect(elapsedMs(s, at(30))).toBe(10 * 60_000);
  });

  it("ao recarregar, o mesmo cálculo retoma de onde estava (string ISO)", () => {
    const s = { startedAt: start.toISOString(), pausedAt: null, totalPausedMs: 60_000 };
    expect(elapsedMs(s, at(6).getTime())).toBe(5 * 60_000);
  });

  it("a duração final é limitada ao planejado", () => {
    expect(finalDurationSeconds({ startedAt: start, pausedAt: null, totalPausedMs: 0 }, 25, at(90))).toBe(25 * 60);
    expect(finalDurationSeconds({ startedAt: start, pausedAt: null, totalPausedMs: 0 }, 25, at(7))).toBe(7 * 60);
  });

  it("formata o relógio", () => {
    expect(formatClock(25 * 60_000)).toBe("25:00");
    expect(formatClock(61_500)).toBe("01:02");
    expect(formatClock(90 * 60_000)).toBe("1:30:00");
  });
});
