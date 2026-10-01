import { describe, expect, it } from "vitest";
import { buildResults } from "./results";
import { runnerEntries, searchRunners } from "./runners";
import type { Athlete, Finish, Sex } from "./types";

const START = "2026-10-12T08:00:00.000Z";

function athlete(bib: number, name: string, sex: Sex): Athlete {
  return { id: `a${bib}`, race_id: "r", name, age: 30, sex, bib_number: bib, created_at: "" };
}
function finish(athleteId: string, seconds: number): Finish {
  const t = new Date(Date.parse(START) + seconds * 1000).toISOString();
  return { id: athleteId, client_id: athleteId, race_id: "r", athlete_id: athleteId, finish_time: t, device_id: "d", created_at: "" };
}

const athletes = [
  athlete(1, "Ana Souza", "F"),
  athlete(2, "Bia Lima", "F"),
  athlete(10, "João Pereira", "M"),
  athlete(11, "Zé Silva", "M"),
  athlete(101, "Carla Mendes", "F"),
  athlete(12, "Bruno Costa", "M"), // não chegou
];
const { rows } = buildResults({ start_time: START }, athletes, [
  finish("a10", 700),
  finish("a1", 800),
  finish("a2", 850),
  finish("a11", 900),
  finish("a101", 950),
]);
const entries = runnerEntries(athletes, rows);

describe("runnerEntries", () => {
  it("quem chegou em ordem de classificação, depois quem não chegou", () => {
    expect(entries.map((e) => e.athlete.bib_number)).toEqual([10, 1, 2, 11, 101, 12]);
  });

  it("posição no sexo, total do sexo e premiação (F top 5, M top 3)", () => {
    const carla = entries.find((e) => e.athlete.bib_number === 101)!;
    expect([carla.sexPosition, carla.sexFinishers, carla.prize]).toEqual([3, 3, true]);
    const ze = entries.find((e) => e.athlete.bib_number === 11)!;
    expect([ze.row?.overall, ze.sexPosition, ze.prize]).toEqual([4, 2, true]);
  });

  it("quem não chegou não tem resultado nem prêmio", () => {
    const bruno = entries.find((e) => e.athlete.bib_number === 12)!;
    expect([bruno.row, bruno.sexPosition, bruno.prize]).toEqual([undefined, undefined, false]);
  });
});

describe("searchRunners", () => {
  it("número exato primeiro, depois os que começam com ele", () => {
    expect(searchRunners(entries, "10").map((e) => e.athlete.bib_number)).toEqual([10, 101]);
    expect(searchRunners(entries, " 1 ").map((e) => e.athlete.bib_number)).toEqual([1, 10, 11, 101, 12]);
  });

  it("nome sem acento, em qualquer ordem e com partes das palavras", () => {
    expect(searchRunners(entries, "joao").map((e) => e.athlete.name)).toEqual(["João Pereira"]);
    expect(searchRunners(entries, "SILVA ze").map((e) => e.athlete.name)).toEqual(["Zé Silva"]);
    expect(searchRunners(entries, "li").map((e) => e.athlete.name)).toEqual(["Bia Lima"]);
  });

  it("busca vazia devolve todos; sem resultado devolve vazio", () => {
    expect(searchRunners(entries, "  ")).toHaveLength(6);
    expect(searchRunners(entries, "xyz")).toEqual([]);
  });
});
