/** O QR Code do peito contém apenas o número. Aceita espaços/quebras em volta. */
export function parseBibFromQr(text: string): number | null {
  const v = text.trim();
  if (!/^\d{1,5}$/.test(v)) return null;
  const n = Number(v);
  return n > 0 ? n : null;
}

/**
 * A câmera lê o mesmo QR várias vezes por segundo enquanto o peito está
 * na frente dela. Aceita cada número uma vez a cada `cooldownMs`.
 */
export class ScanDebouncer {
  private last = new Map<string, number>();

  constructor(private cooldownMs = 4000) {}

  accept(code: string, now = Date.now()): boolean {
    const prev = this.last.get(code);
    if (prev !== undefined && now - prev < this.cooldownMs) return false;
    this.last.set(code, now);
    return true;
  }
}

/** Mensagem clara para falhas ao abrir a câmera. */
export function cameraErrorMessage(error: unknown, secureContext = true): string {
  if (!secureContext) {
    return "A câmera só funciona com HTTPS. Abra o app pelo endereço https:// (ou use o teclado).";
  }
  const text = `${(error as { name?: string })?.name ?? ""} ${String(error)}`;
  if (/NotAllowed|Permission|denied/i.test(text)) {
    return "Permissão da câmera negada. Libere a câmera para este site nas configurações do navegador.";
  }
  if (/NotFound|no camera|Requested device not found|OverconstrainedError/i.test(text)) {
    return "Nenhuma câmera encontrada neste aparelho.";
  }
  if (/NotReadable|Could not start|in use/i.test(text)) {
    return "A câmera está em uso por outro aplicativo. Feche-o e tente de novo.";
  }
  return `Não foi possível abrir a câmera (${String(error)}).`;
}
