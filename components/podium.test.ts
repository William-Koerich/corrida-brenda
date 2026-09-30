import { describe, expect, it } from "vitest";
import { podiumOrder } from "./podium";

describe("podiumOrder", () => {
  it("1º no centro, alternando para os lados", () => {
    expect(podiumOrder(3)).toEqual([2, 1, 3]);
    expect(podiumOrder(5)).toEqual([4, 2, 1, 3, 5]);
    expect(podiumOrder(1)).toEqual([1]);
  });
});
