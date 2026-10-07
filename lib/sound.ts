/**
 * Sons de confirmação gerados no aparelho (Web Audio): sem arquivo, funcionam offline.
 * Navegadores só liberam áudio depois de um toque do usuário: chame `unlockAudio()`
 * num toque (a tela de chegada faz isso no primeiro toque).
 */

export type Tone = "ok" | "error" | "info";

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    // iPhone (Safari 17+): toca mesmo com a chave do silencioso ligada
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = "playback";
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/** Libera o áudio; precisa ser chamado dentro de um toque/clique. */
export function unlockAudio() {
  const c = context();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

/** Notas de cada som: [frequência Hz, início s, duração s]. */
export const TONES: Record<Tone, { wave: OscillatorType; volume: number; notes: [number, number, number][] }> = {
  // dois bipes subindo: leitura aceita
  ok: { wave: "sine", volume: 0.35, notes: [[1046, 0, 0.09], [1568, 0.1, 0.16]] },
  // dois toques graves: não cadastrado, já chegou, QR inválido
  error: { wave: "square", volume: 0.18, notes: [[196, 0, 0.16], [196, 0.24, 0.16]] },
  // bipe curto e baixo: mesmo peito lido de novo
  info: { wave: "sine", volume: 0.12, notes: [[880, 0, 0.06]] },
};

export function playTone(tone: Tone) {
  const c = context();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  const { wave, volume, notes } = TONES[tone];
  const t0 = c.currentTime + 0.01;
  for (const [freq, start, dur] of notes) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    // envelope curto: sem estalo no começo e no fim
    gain.gain.setValueAtTime(0.0001, t0 + start);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0 + start);
    osc.stop(t0 + start + dur + 0.02);
  }
}
