import { describe, expect, it } from "vitest";
import { TONES } from "./sound";

describe("TONES", () => {
  it("sucesso sobe, erro é grave, repetição é curta e baixa", () => {
    const [first, second] = TONES.ok.notes;
    expect(second[0]).toBeGreaterThan(first[0]);
    expect(Math.max(...TONES.error.notes.map((n) => n[0]))).toBeLessThan(400);
    expect(TONES.info.notes).toHaveLength(1);
    expect(TONES.info.volume).toBeLessThan(TONES.ok.volume);
  });

  it("notas não se sobrepõem e o som inteiro dura menos de meio segundo", () => {
    for (const { notes } of Object.values(TONES)) {
      for (let i = 1; i < notes.length; i++) expect(notes[i][1]).toBeGreaterThanOrEqual(notes[i - 1][1] + notes[i - 1][2]);
      const end = Math.max(...notes.map(([, start, dur]) => start + dur));
      expect(end).toBeLessThan(0.5);
    }
  });
});
