import { describe, expect, it } from "vitest";
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
  athlete(10, "João", 35, "M"),
  athlete(11, "Pedro", 62, "M"),
];

const finishes = [
  finish("a1", 900), // 15:00
  finish("a10", 780), // 13:00
  finish("a2", 960),
  finish("a3", 1020),
  finish("a4", 1080),
  finish("a11", 1500),
  finish(null, 1000), // sem número
];

const race = { start_time: START };

describe("buildResults", () => {
  const { rows, unidentified } = buildResults(race, athletes, finishes);

  it("ordena por tempo total crescente", () => {
    expect(rows.map((r) => r.athlete.bib_number)).toEqual([10, 1, 2, 3, 4, 11]);
    expect(rows.map((r) => r.overall)).toEqual([1, 2, 3, 4, 5, 6]);
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

  it("geral mantém todos", () => {
    expect(filterResults(rows, "all").map((r) => r.position)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("por sexo recalcula a posição", () => {
    const f = filterResults(rows, "F");
    expect(f.map((r) => [r.athlete.bib_number, r.position, r.overall])).toEqual([
      [1, 1, 2],
      [2, 2, 3],
      [3, 3, 4],
      [4, 4, 5],
    ]);
    expect(filterResults(rows, "M").map((r) => r.athlete.name)).toEqual(["João", "Pedro"]);
  });
});

describe("podiums", () => {
  const { rows } = buildResults(race, athletes, finishes);

  it("só geral masculino e geral feminino, top 3", () => {
    const list = podiums(rows);
    expect(list.map((p) => p.category.label)).toEqual(["Geral Masculino", "Geral Feminino"]);
    expect(list[0].winners.map((w) => w.athlete.bib_number)).toEqual([10, 11]);
    expect(list[1].winners.map((w) => w.athlete.bib_number)).toEqual([1, 2, 3]);
  });
});

describe("resultsToCsv", () => {
  it("gera CSV com ; e BOM, posição no sexo e campos escapados", () => {
    const { rows } = buildResults(
      race,
      [athlete(7, 'Zé "Foguete"; Silva', 30, "M"), athlete(8, "Lia", 20, "F")],
      [finish("a7", 930), finish("a8", 940)],
    );
    const lines = resultsToCsv(rows, 3).split("\r\n");
    expect(lines[0]).toBe("﻿Posição;Posição no sexo;Número;Nome;Idade;Sexo;Tempo;Ritmo (min/km)");
    expect(lines[1]).toBe('1;1;7;"Zé ""Foguete""; Silva";30;Masculino;00:15:30;5:10');
    expect(lines[2]).toBe("2;1;8;Lia;20;Feminino;00:15:40;5:13");
  });
});
