import { describe, expect, it } from "vitest";
import { elapsedMs, formatDuration, formatPace, paceMsPerKm } from "./time";

describe("elapsedMs", () => {
  it("subtrai largada da chegada", () => {
    expect(
      elapsedMs("2026-10-12T08:00:00.000Z", "2026-10-12T08:15:30.250Z"),
    ).toBe(15 * 60_000 + 30_250);
  });

  it("aceita offsets de fuso diferentes", () => {
    expect(
      elapsedMs("2026-10-12T08:00:00-03:00", "2026-10-12T11:10:00Z"),
    ).toBe(10 * 60_000);
  });
});

describe("formatDuration", () => {
  it("formata hh:mm:ss", () => {
    expect(formatDuration(15 * 60_000 + 30_999)).toBe("00:15:30");
    expect(formatDuration(3_600_000 + 5 * 60_000 + 7_000)).toBe("01:05:07");
    expect(formatDuration(0)).toBe("00:00:00");
  });

  it("mostra sinal em durações negativas", () => {
    expect(formatDuration(-5_000)).toBe("-00:00:05");
  });
});

describe("pace", () => {
  it("divide o tempo pela distância", () => {
    expect(paceMsPerKm(15 * 60_000, 3)).toBe(5 * 60_000);
  });

  it("formata m:ss /km", () => {
    expect(formatPace(15 * 60_000 + 30_000, 3)).toBe("5:10 /km");
    expect(formatPace(12 * 60_000, 3)).toBe("4:00 /km");
  });

  it("arredonda o segundo sem gerar 60", () => {
    // 5:59.8 /km → 6:00 /km
    expect(formatPace(3 * 359_800, 3)).toBe("6:00 /km");
  });

  it("rejeita distância zero", () => {
    expect(() => paceMsPerKm(1000, 0)).toThrow();
  });
});
