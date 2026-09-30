interface DbError {
  code?: string;
  message?: string;
}

/** Falha de conexão (e não recusa do servidor): vale tentar de novo depois. */
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const e = (error ?? {}) as DbError;
  const message = e.message ?? String(error);
  return /failed to fetch|load failed|fetch failed|networkerror|network request failed|aborted|timeout/i.test(message);
}

/** Converte erros do Supabase/rede em mensagens claras em português. */
export function friendlyError(error: unknown): string {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "Sem conexão com a internet.";
  }
  const e = (error ?? {}) as DbError;
  const message = e.message ?? String(error);

  if (e.code === "23505") {
    if (message.includes("athletes_race_bib_unique")) {
      return "Este número de peito já está cadastrado.";
    }
    if (message.includes("finishes_one_per_athlete")) {
      return "Este atleta já tem uma chegada registrada.";
    }
    return "Registro duplicado.";
  }
  if (e.code === "23514") return "Dados inválidos.";
  if (message.includes("fora_da_corrida:encerrada")) {
    return "A corrida já foi encerrada. Chegadas depois do encerramento não são aceitas.";
  }
  if (message.includes("fora_da_corrida")) {
    return "Chegada fora do horário da corrida (antes da largada ou de uma corrida reiniciada). Foi descartada.";
  }
  if (/failed to fetch|network|load failed/i.test(message)) {
    return "Não foi possível conectar ao servidor. Verifique a internet.";
  }
  return message;
}
