import { describe, expect, it } from "vitest";
import { ageBandFor } from "./categories";
import { buildResults, filterResults, podiums, resultsToCsv } from "./results";
import type { Athlete, Finish, Sex } from "./types";

const START = "2026-10-12T08:00:00.000Z";

function athlete(bib: number, name: string, age: number, sex: Sex): Athlete {
  return { id: `a${bib}`, race_id: "r", name, age, sex, bib_number: bib, created_at: "" };
}

/** chegada `seconds` após a largada */
function finish(athleteId: string | null, seconds: number): Finish {
  const t = new Date(Date.parse(START) + seconds * 1000).toISOString();
  const id = `${athleteId ?? "x"}-${seconds}`;
  return { id, client_id: id, race_id: "r", athlete_id: athleteId, finish_time: t, device_id: "d", created_at: "" };
}

const athletes = [
  athlete(1, "Ana", 25, "F"),
  athlete(2, "Bia", 27, "F"),
  athlete(3, "Carla", 22, "F"),
  athlete(4, "Duda", 28, "F"),
  athlete(5, "Eva", 45, "F"),
  athlete(10, "João", 35, "M"),
  athlete(11, "Pedro", 62, "M"),
];

const finishes = [
  finish("a1", 900), // 15:00
  finish("a10", 780), // 13:00
  finish("a2", 960),
  finish("a3", 1020),
  finish("a4", 1080),
  finish("a5", 1140),
  finish("a11", 1500),
  finish(null, 1000), // sem número
];

const race = { start_time: START };

describe("ageBandFor", () => {
  it("encaixa nas faixas, com limites inclusivos", () => {
    expect(ageBandFor(19)?.id).toBe("ate19");
    expect(ageBandFor(20)?.id).toBe("20-29");
    expect(ageBandFor(59)?.id).toBe("50-59");
    expect(ageBandFor(60)?.id).toBe("60mais");
    expect(ageBandFor(99)?.id).toBe("60mais");
  });
});

describe("buildResults", () => {
  const { rows, unidentified } = buildResults(race, athletes, finishes);

  it("ordena por tempo total crescente", () => {
    expect(rows.map((r) => r.athlete.bib_number)).toEqual([10, 1, 2, 3, 4, 5, 11]);
    expect(rows.map((r) => r.overall)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(rows[0].elapsedMs).toBe(780_000);
  });

  it("separa chegadas sem atleta", () => {
    expect(unidentified).toHaveLength(1);
    expect(unidentified[0].athlete_id).toBeNull();
  });

  it("chegada de atleta excluído vira não identificada", () => {
    const r = buildResults(race, athletes, [finish("a999", 100)]);
    expect(r.rows).toHaveLength(0);
    expect(r.unidentified).toHaveLength(1);
  });

  it("empate no tempo desempata pelo número", () => {
    const r = buildResults(race, athletes, [finish("a2", 900), finish("a1", 900)]);
    expect(r.rows.map((x) => x.athlete.bib_number)).toEqual([1, 2]);
  });
});

describe("filterResults", () => {
  const { rows } = buildResults(race, athletes, finishes);

  it("por sexo recalcula a posição", () => {
    const f = filterResults(rows, { kind: "sex", sex: "F" });
    expect(f.map((r) => [r.athlete.bib_number, r.position, r.overall])).toEqual([
      [1, 1, 2],
      [2, 2, 3],
      [3, 3, 4],
      [4, 4, 5],
      [5, 5, 6],
    ]);
  });

  it("por categoria", () => {
    const f = filterResults(rows, { kind: "category", categoryId: "20-29-F" });
    expect(f.map((r) => r.athlete.bib_number)).toEqual([1, 2, 3, 4]);
    expect(filterResults(rows, { kind: "category", categoryId: "60mais-M" }).map((r) => r.athlete.name)).toEqual([
      "Pedro",
    ]);
  });
});

describe("podiums", () => {
  const { rows } = buildResults(race, athletes, finishes);
  const find = (list: ReturnType<typeof podiums>, id: string) =>
    list.find((p) => p.category.id === id)!.winners.map((w) => w.athlete.bib_number);

  it("geral feminino top 3", () => {
    expect(find(podiums(rows), "geral-F")).toEqual([1, 2, 3]);
  });

  it("não cumulativa: pódio geral sai da faixa etária", () => {
    // Ana, Bia e Carla (20–29) estão no geral → na faixa sobra só Duda
    expect(find(podiums(rows), "20-29-F")).toEqual([4]);
    // Eva (45) é a 4ª mulher: não está no geral, então leva a faixa 40–49
    expect(find(podiums(rows), "40-49-F")).toEqual([5]);
    expect(find(podiums(rows), "ate19-F")).toEqual([]);
  });

  it("cumulativa: mesma pessoa pode ganhar nas duas", () => {
    expect(find(podiums(rows, { cumulative: true }), "20-29-F")).toEqual([1, 2, 3]);
  });

  it("gerais vêm antes das faixas", () => {
    expect(podiums(rows).slice(0, 2).map((p) => p.category.id)).toEqual(["geral-M", "geral-F"]);
  });
});

describe("resultsToCsv", () => {
  it("gera CSV com ; e BOM, escapando campos", () => {
    const { rows } = buildResults(race, [athlete(7, 'Zé "Foguete"; Silva', 30, "M")], [finish("a7", 930)]);
    const csv = resultsToCsv(rows, 3);
    expect(csv.startsWith("﻿Posição;Número;Nome;")).toBe(true);
    expect(csv.split("\r\n")[1]).toBe('1;7;"Zé ""Foguete""; Silva";30;Masculino;30–39 Masculino;00:15:30;5:10');
  });
});
