import type { Sex } from "./types";

/** Quantas posições são premiadas em cada categoria. */
export const PODIUM_SIZE = 3;

/**
 * Premiação cumulativa? false = quem sobe ao pódio geral não é premiado
 * também na faixa etária (a vaga passa para o próximo da faixa).
 */
export const CUMULATIVE_AWARDS = false;

export interface AgeBand {
  id: string;
  label: string;
  min: number;
  /** inclusivo; null = sem limite */
  max: number | null;
}

/** Faixas etárias — edite aqui para mudar a premiação. */
export const AGE_BANDS: AgeBand[] = [
  { id: "ate19", label: "Até 19", min: 0, max: 19 },
  { id: "20-29", label: "20–29", min: 20, max: 29 },
  { id: "30-39", label: "30–39", min: 30, max: 39 },
  { id: "40-49", label: "40–49", min: 40, max: 49 },
  { id: "50-59", label: "50–59", min: 50, max: 59 },
  { id: "60mais", label: "60+", min: 60, max: null },
];

export const SEX_LABEL: Record<Sex, string> = {
  M: "Masculino",
  F: "Feminino",
};

export interface Category {
  id: string;
  label: string;
  sex: Sex;
  /** undefined = geral (todas as idades) */
  band?: AgeBand;
}

/** Geral M/F + cada faixa etária por sexo. */
export const CATEGORIES: Category[] = (["M", "F"] as Sex[]).flatMap((sex) => [
  { id: `geral-${sex}`, label: `Geral ${SEX_LABEL[sex]}`, sex },
  ...AGE_BANDS.map((band) => ({
    id: `${band.id}-${sex}`,
    label: `${band.label} ${SEX_LABEL[sex]}`,
    sex,
    band,
  })),
]);

export function ageBandFor(age: number): AgeBand | undefined {
  return AGE_BANDS.find((b) => age >= b.min && (b.max === null || age <= b.max));
}
