import { parseTimestamp } from "./clock";

/** tempo_total = finish_time − start_time, em milissegundos. */
export function elapsedMs(startTime: string | Date, finishTime: string | Date): number {
  return toMs(finishTime) - toMs(startTime);
}

function toMs(t: string | Date): number {
  return typeof t === "string" ? parseTimestamp(t) : t.getTime();
}

/** Formata uma duração como hh:mm:ss (segundos truncados). */
export function formatDuration(ms: number): string {
  const sign = ms < 0 ? "-" : "";
  const total = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${sign}${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** ritmo = tempo_total ÷ distância, em milissegundos por km. */
export function paceMsPerKm(ms: number, distanceKm: number): number {
  if (distanceKm <= 0) throw new Error("Distância deve ser maior que zero");
  return ms / distanceKm;
}

/** Formata o ritmo como "m:ss /km" (ex.: "5:10 /km"), arredondando o segundo. */
export function formatPace(ms: number, distanceKm: number): string {
  const secPerKm = Math.round(paceMsPerKm(ms, distanceKm) / 1000);
  const m = Math.floor(secPerKm / 60);
  const s = secPerKm % 60;
  return `${m}:${pad(s)} /km`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
