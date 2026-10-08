import { describe, expect, it } from "vitest";
import { containRect, coverRect, stravaDistance, stravaTime } from "./share-card";

const text = (parts: { value: string; unit: string }[]) => parts.map((p) => p.value + p.unit).join(" ");

describe("stravaTime", () => {
  it("minutos e segundos abaixo de uma hora", () => {
    expect(text(stravaTime(13 * 60_000 + 21_000))).toBe("13m 21s");
    expect(text(stravaTime(9 * 60_000 + 5_400))).toBe("9m 05s");
  });

  it("horas com minutos e segundos em dois dígitos", () => {
    expect(text(stravaTime(3_600_000 + 2 * 60_000 + 15_000))).toBe("1h 02m 15s");
  });

  it("só segundos e nunca negativo", () => {
    expect(text(stravaTime(45_999))).toBe("45s");
    expect(text(stravaTime(-1000))).toBe("0s");
  });
});

describe("stravaDistance", () => {
  it("duas casas com vírgula", () => {
    expect(text(stravaDistance(3))).toBe("3,00 km");
    expect(text(stravaDistance(21.0975))).toBe("21,10 km");
  });
});

describe("coverRect", () => {
  it("foto em pé num quadrado: corta em cima e embaixo, centralizado", () => {
    const r = coverRect(1000, 2000, 1080, 1080);
    expect(r.sx).toBeCloseTo(0);
    expect(r.sy).toBeCloseTo(500);
    expect(r.sw).toBeCloseTo(1000);
    expect(r.sh).toBeCloseTo(1000);
  });

  it("foto deitada num story: corta as laterais, mantendo a proporção do destino", () => {
    const r = coverRect(4000, 3000, 1080, 1920);
    expect(r.sh).toBe(3000);
    expect(r.sw / r.sh).toBeCloseTo(1080 / 1920);
    expect(r.sx).toBeCloseTo((4000 - r.sw) / 2);
    expect(r.sy).toBe(0);
  });
});

describe("containRect", () => {
  it("percurso deitado numa caixa alta: largura cheia, centralizado na altura", () => {
    expect(containRect(1400, 1100, 72, 200, 936, 1000)).toEqual({ x: 72, y: 200 + (1000 - 1100 * (936 / 1400)) / 2, w: 936, h: 1100 * (936 / 1400) });
  });

  it("caixa baixa: altura cheia, centralizado na largura", () => {
    const r = containRect(1400, 1100, 0, 0, 1000, 300);
    expect(r.h).toBe(300);
    expect(r.x).toBeCloseTo((1000 - r.w) / 2);
  });
});
