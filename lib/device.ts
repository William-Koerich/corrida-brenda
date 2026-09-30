const KEY = "corrida.device_id";

/** Identificador estável deste aparelho (gravado em finishes.device_id). */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // navegação privada sem storage: id vale só enquanto a página estiver aberta
    return (fallbackId ??= crypto.randomUUID());
  }
}

let fallbackId: string | undefined;
