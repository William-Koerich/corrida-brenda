import { describe, expect, it } from "vitest";
import { friendlyError, isNetworkError } from "./errors";

describe("isNetworkError", () => {
  it("reconhece falhas de conexão dos navegadores", () => {
    expect(isNetworkError({ message: "TypeError: Failed to fetch", code: "" })).toBe(true); // Chrome
    expect(isNetworkError({ message: "TypeError: Load failed" })).toBe(true); // Safari
    expect(isNetworkError(new TypeError("NetworkError when attempting to fetch resource."))).toBe(true); // Firefox
    expect(isNetworkError(new TypeError("fetch failed"))).toBe(true); // Node
  });

  it("recusa do banco não é falha de rede", () => {
    expect(isNetworkError({ code: "23505", message: "duplicate key value violates unique constraint" })).toBe(false);
  });
});

describe("friendlyError", () => {
  it("chegada fora da janela da corrida", () => {
    expect(friendlyError({ code: "P0001", message: "fora_da_corrida:encerrada" })).toMatch(/encerrada/);
    expect(friendlyError({ code: "P0001", message: "fora_da_corrida:nao_largou" })).toMatch(/descartada/);
    expect(isNetworkError({ code: "P0001", message: "fora_da_corrida:encerrada" })).toBe(false);
  });

  it("traduz duplicidades conhecidas", () => {
    expect(friendlyError({ code: "23505", message: 'violates unique constraint "athletes_race_bib_unique"' })).toBe(
      "Este número de peito já está cadastrado.",
    );
    expect(friendlyError({ code: "23505", message: 'violates unique constraint "finishes_one_per_athlete"' })).toBe(
      "Este atleta já tem uma chegada registrada.",
    );
  });
});
