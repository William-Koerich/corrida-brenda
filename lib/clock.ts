/**
 * Sincronização do relógio do dispositivo com o relógio do servidor.
 * horário oficial = Date.now() + offset
 */

export interface ClockSample {
  /** Date.now() antes da chamada */
  sentAt: number;
  /** Date.now() quando a resposta chegou */
  receivedAt: number;
  /** horário do servidor (ms) */
  serverTime: number;
}

export interface ClockOffset {
  offsetMs: number;
  /** tempo de ida e volta da melhor medição */
  rttMs: number;
}

/**
 * Supõe que o servidor respondeu no meio do caminho entre envio e retorno;
 * o erro máximo é rtt/2.
 */
export function offsetFromSample(s: ClockSample): ClockOffset {
  const rttMs = s.receivedAt - s.sentAt;
  return {
    offsetMs: s.serverTime - (s.sentAt + rttMs / 2),
    rttMs,
  };
}

/** Usa a medição de menor latência (a mais precisa). */
export function bestOffset(samples: ClockSample[]): ClockOffset {
  if (!samples.length) throw new Error("Nenhuma medição de relógio");
  return samples
    .map(offsetFromSample)
    .reduce((best, cur) => (cur.rttMs < best.rttMs ? cur : best));
}

/**
 * Converte timestamptz do Postgres (até 6 casas nos segundos) em ms.
 * Corta para 3 casas porque nem todo navegador aceita microssegundos.
 */
export function parseTimestamp(value: string): number {
  const ms = Date.parse(value.replace(/(\.\d{3})\d+/, "$1").replace(" ", "T"));
  if (Number.isNaN(ms)) throw new Error(`Horário inválido: ${value}`);
  return ms;
}

/** Faz `count` medições em sequência usando `fetchServerTime`. */
export async function measureOffset(
  fetchServerTime: () => Promise<number>,
  count = 5,
): Promise<ClockOffset> {
  const samples: ClockSample[] = [];
  let lastError: unknown;
  for (let i = 0; i < count; i++) {
    try {
      const sentAt = Date.now();
      const serverTime = await fetchServerTime();
      samples.push({ sentAt, receivedAt: Date.now(), serverTime });
    } catch (e) {
      lastError = e;
    }
  }
  if (!samples.length) throw lastError;
  return bestOffset(samples);
}
