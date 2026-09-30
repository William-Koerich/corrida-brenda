import { describe, expect, it } from "vitest";
import { bestOffset, measureOffset, offsetFromSample, parseTimestamp } from "./clock";

describe("offsetFromSample", () => {
  it("compensa metade da latência", () => {
    // enviado em 1000, voltou em 1200 → servidor respondeu ~1100 no relógio local
    expect(offsetFromSample({ sentAt: 1000, receivedAt: 1200, serverTime: 6100 })).toEqual({
      offsetMs: 5000,
      rttMs: 200,
    });
  });

  it("dá offset negativo quando o celular está adiantado", () => {
    expect(offsetFromSample({ sentAt: 10_000, receivedAt: 10_100, serverTime: 7_050 }).offsetMs).toBe(-3000);
  });
});

describe("bestOffset", () => {
  it("escolhe a medição com menor latência", () => {
    const result = bestOffset([
      { sentAt: 0, receivedAt: 900, serverTime: 2000 }, // lenta
      { sentAt: 1000, receivedAt: 1040, serverTime: 3020 }, // rápida → offset 2000
      { sentAt: 2000, receivedAt: 2300, serverTime: 4400 },
    ]);
    expect(result).toEqual({ offsetMs: 2000, rttMs: 40 });
  });

  it("falha sem medições", () => {
    expect(() => bestOffset([])).toThrow();
  });
});

describe("parseTimestamp", () => {
  it("aceita microssegundos e offset do Postgres", () => {
    expect(parseTimestamp("2026-10-12T11:00:00.123456+00:00")).toBe(
      Date.UTC(2026, 9, 12, 11, 0, 0, 123),
    );
    expect(parseTimestamp("2026-10-12 08:00:00.5-03:00")).toBe(
      Date.UTC(2026, 9, 12, 11, 0, 0, 500),
    );
  });

  it("recusa texto inválido", () => {
    expect(() => parseTimestamp("ontem")).toThrow();
  });
});

describe("measureOffset", () => {
  it("ignora medições que falharam", async () => {
    let call = 0;
    const result = await measureOffset(async () => {
      call++;
      if (call === 2) throw new Error("rede");
      return Date.now() + 60_000;
    }, 3);
    expect(Math.abs(result.offsetMs - 60_000)).toBeLessThan(50);
    expect(call).toBe(3);
  });

  it("propaga o erro se todas falharem", async () => {
    await expect(
      measureOffset(async () => {
        throw new Error("sem internet");
      }, 2),
    ).rejects.toThrow("sem internet");
  });
});
