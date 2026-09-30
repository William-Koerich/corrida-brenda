import type { Sex } from "./types";

export interface AthleteInput {
  name: string;
  /** opcional */
  age: number | null;
  sex: Sex;
  bib_number: number;
}

/** Aceita M/F, masculino/feminino, masc/fem (sem diferenciar maiúsculas/acentos). */
export function normalizeSex(value: string): Sex | null {
  const v = stripAccents(value.trim().toLowerCase());
  if (["m", "masc", "masculino"].includes(v)) return "M";
  if (["f", "fem", "feminino"].includes(v)) return "F";
  return null;
}

/** Inteiro positivo a partir de texto; null se inválido. */
export function parsePositiveInt(value: string): number | null {
  const v = value.trim();
  if (!/^\d+$/.test(v)) return null;
  const n = Number(v);
  return n > 0 ? n : null;
}

export interface RawAthlete {
  name: string;
  age: string;
  sex: string;
  bib: string;
}

export type ValidationResult =
  | { ok: true; athlete: AthleteInput }
  | { ok: false; errors: string[] };

/** Valida os campos crus (formulário ou CSV). */
export function validateAthlete(raw: RawAthlete): ValidationResult {
  const errors: string[] = [];
  const name = raw.name.trim().replace(/\s+/g, " ");
  // idade é opcional: vazio vira null; se preenchida, precisa ser válida
  const ageText = raw.age.trim();
  const age = ageText === "" ? null : parsePositiveInt(ageText);
  const sex = normalizeSex(raw.sex);
  const bib = parsePositiveInt(raw.bib);

  if (!name) errors.push("Nome é obrigatório");
  if (ageText !== "" && (age === null || age > 120)) errors.push("Idade inválida");
  if (!sex) errors.push("Sexo deve ser M ou F");
  if (bib === null) errors.push("Número de peito inválido");

  if (errors.length) return { ok: false, errors };
  return { ok: true, athlete: { name, age, sex: sex!, bib_number: bib! } };
}

export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}
