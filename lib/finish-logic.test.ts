import { describe, expect, it } from "vitest";
import { pendingFinishes, resolveBib } from "./finish-logic";
import type { Athlete, Finish } from "./types";

const ana: Athlete = { id: "a1", race_id: "r", name: "Ana", age: 30, sex: "F", bib_number: 10, created_at: "" };
const beto: Athlete = { id: "a2", race_id: "r", name: "Beto", age: 40, sex: "M", bib_number: 20, created_at: "" };
const byBib = new Map([
  [10, ana],
  [20, beto],
]);

function finish(clientId: string, time: string, athleteId: string | null, device = "d1"): Finish {
  return {
    id: clientId,
    client_id: clientId,
    race_id: "r",
    athlete_id: athleteId,
    finish_time: `2026-10-12T08:${time}.000Z`,
    device_id: device,
    created_at: "",
  };
}

describe("pendingFinishes", () => {
  it("lista só as chegadas sem atleta deste aparelho, mais antiga primeiro", () => {
    const list = [
      finish("c3", "15:03", null),
      finish("c1", "15:01", null),
      finish("c2", "15:02", "a1"),
      finish("c4", "15:00", null, "outro"),
    ];
    expect(pendingFinishes(list, "d1").map((f) => f.client_id)).toEqual(["c1", "c3"]);
  });
});

describe("resolveBib", () => {
  it("número não cadastrado", () => {
    expect(resolveBib(99, byBib, [])).toEqual({ kind: "not_found", bib: 99 });
  });

  it("sem pendente: cria chegada", () => {
    expect(resolveBib(10, byBib, [])).toEqual({ kind: "create", athlete: ana });
  });

  it("com pendente: associa", () => {
    const target = finish("c1", "15:01", null);
    expect(resolveBib(10, byBib, [target], target)).toEqual({ kind: "assign", athlete: ana, target });
  });

  it("atleta que já chegou não duplica", () => {
    const existing = finish("c1", "15:01", "a1");
    const pending = finish("c2", "15:05", null);
    expect(resolveBib(10, byBib, [existing, pending], pending)).toEqual({
      kind: "duplicate",
      athlete: ana,
      existing,
    });
    expect(resolveBib(10, byBib, [existing])).toMatchObject({ kind: "duplicate" });
  });

  it("corrigir a própria chegada com o mesmo número não é duplicidade", () => {
    const own = finish("c1", "15:01", "a1");
    expect(resolveBib(10, byBib, [own], own)).toEqual({ kind: "assign", athlete: ana, target: own });
  });

  it("corrigir para o número de outro atleta que já chegou é duplicidade", () => {
    const anaFinish = finish("c1", "15:01", "a1");
    const betoFinish = finish("c2", "15:02", "a2");
    expect(resolveBib(20, byBib, [anaFinish, betoFinish], anaFinish)).toMatchObject({
      kind: "duplicate",
      athlete: beto,
    });
  });
});
