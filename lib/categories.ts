import type { Sex } from "./types";

/** Quantas posições são premiadas em cada sexo. */
export const PODIUM_SIZE: Record<Sex, number> = {
  M: 3,
  F: 5,
};

export const SEX_LABEL: Record<Sex, string> = {
  M: "Masculino",
  F: "Feminino",
};

export interface Category {
  id: string;
  label: string;
  sex: Sex;
  podiumSize: number;
}

/** Premiação: geral masculino e geral feminino. */
export const CATEGORIES: Category[] = (["M", "F"] as Sex[]).map((sex) => ({
  id: `geral-${sex}`,
  label: `Geral ${SEX_LABEL[sex]}`,
  sex,
  podiumSize: PODIUM_SIZE[sex],
}));
