/** Imagem do resultado para Instagram (story) e feed/Strava (quadrado). Desenhada em canvas no aparelho. */

export type CardFormat = "story" | "square";

export interface CardData {
  brand: string;
  raceName: string;
  distanceKm: number;
  date: string | null;
  name: string;
  bib: number;
  time: string;
  pace: string;
  overall: number;
  totalFinishers: number;
  sexLabel: string;
  sexPosition: number;
  sexFinishers: number;
  prize: boolean;
  url: string;
}

const SIZE: Record<CardFormat, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 },
  square: { w: 1080, h: 1080 },
};

const COLORS = {
  stage: "#07080c",
  brand: "#ff4d9d",
  gold: "#f2c14e",
  white: "#ffffff",
  dim: "rgba(255,255,255,0.6)",
  faint: "rgba(255,255,255,0.08)",
};

// bandeira do logo (lucide "flag"), em coordenadas 24×24
const FLAG_PATH =
  "M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528";

function fonts() {
  const root = getComputedStyle(document.documentElement);
  const sans = root.getPropertyValue("--font-geist-sans").trim() || "system-ui, sans-serif";
  const mono = root.getPropertyValue("--font-geist-mono").trim() || "ui-monospace, monospace";
  return { sans, mono };
}

type Ctx = CanvasRenderingContext2D & { letterSpacing?: string };

/** Escreve o texto diminuindo a fonte até caber em maxWidth. */
function fitText(ctx: Ctx, text: string, x: number, y: number, maxWidth: number, size: number, font: (s: number) => string) {
  let s = size;
  ctx.font = font(s);
  while (ctx.measureText(text).width > maxWidth && s > 12) {
    s -= 2;
    ctx.font = font(s);
  }
  ctx.fillText(text, x, y);
  return s;
}

function label(ctx: Ctx, text: string, x: number, y: number, size: number, color: string, sans: string) {
  ctx.font = `600 ${size}px ${sans}`;
  ctx.fillStyle = color;
  ctx.letterSpacing = `${Math.round(size * 0.3)}px`;
  ctx.fillText(text.toUpperCase(), x, y);
  ctx.letterSpacing = "0px";
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

export async function renderResultCard(data: CardData, format: CardFormat): Promise<Blob> {
  await document.fonts?.ready;
  const { w, h } = SIZE[format];
  const story = format === "story";
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d") as Ctx;
  const { sans, mono } = fonts();
  const pad = 80;

  // fundo
  ctx.fillStyle = COLORS.stage;
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 1.1);
  glow.addColorStop(0, "rgba(255,77,157,0.32)");
  glow.addColorStop(1, "rgba(255,77,157,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  const glow2 = ctx.createRadialGradient(w, h, 0, w, h, w);
  glow2.addColorStop(0, "rgba(90,100,160,0.28)");
  glow2.addColorStop(1, "rgba(90,100,160,0)");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = COLORS.brand;
  ctx.fillRect(0, 0, w, 14);

  // marca
  let y = story ? 150 : 110;
  roundRect(ctx, pad, y - 56, 84, 84, 22, COLORS.brand);
  ctx.save();
  ctx.translate(pad + 18, y - 38);
  ctx.scale(2, 2);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke(new Path2D(FLAG_PATH));
  ctx.restore();
  ctx.fillStyle = COLORS.white;
  ctx.font = `600 40px ${sans}`;
  ctx.fillText(data.brand, pad + 110, y);

  // corrida
  y += story ? 150 : 100;
  ctx.fillStyle = COLORS.white;
  fitText(ctx, data.raceName, pad, y, w - pad * 2, story ? 76 : 60, (s) => `700 ${s}px ${sans}`);
  y += story ? 64 : 52;
  const sub = [`${data.distanceKm.toLocaleString("pt-BR")} km`, data.date].filter(Boolean).join("  ·  ");
  ctx.font = `500 ${story ? 38 : 32}px ${sans}`;
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(sub, pad, y);

  // tempo (cada bloco desce a partir do anterior)
  y += story ? 90 : 64;
  label(ctx, "Tempo", pad, y, story ? 30 : 26, COLORS.brand, sans);
  y += story ? 200 : 150;
  ctx.fillStyle = COLORS.white;
  fitText(ctx, data.time, pad - 8, y, w - pad * 2, story ? 230 : 170, (s) => `600 ${s}px ${mono}`);
  y += story ? 90 : 62;
  ctx.font = `500 ${story ? 52 : 42}px ${mono}`;
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(`${data.pace}`, pad, y);

  // posições
  y += story ? 80 : 40;
  const boxH = story ? 200 : 150;
  const gap = 32;
  const boxW = (w - pad * 2 - gap) / 2;
  const boxes = [
    { title: "Geral", pos: data.overall, total: data.totalFinishers },
    { title: data.sexLabel, pos: data.sexPosition, total: data.sexFinishers },
  ];
  boxes.forEach((b, i) => {
    const x = pad + i * (boxW + gap);
    roundRect(ctx, x, y, boxW, boxH, 32, COLORS.faint);
    label(ctx, b.title, x + 40, y + (story ? 66 : 56), story ? 26 : 22, COLORS.dim, sans);
    ctx.fillStyle = COLORS.white;
    ctx.font = `700 ${story ? 96 : 76}px ${sans}`;
    const pos = `${b.pos}º`;
    ctx.fillText(pos, x + 40, y + boxH - (story ? 40 : 32));
    const pw = ctx.measureText(pos).width;
    ctx.font = `500 ${story ? 36 : 30}px ${sans}`;
    ctx.fillStyle = COLORS.dim;
    ctx.fillText(`de ${b.total}`, x + 52 + pw, y + boxH - (story ? 44 : 36));
  });
  y += boxH;

  // pódio
  if (data.prize) {
    y += story ? 56 : 28;
    const text = `PÓDIO · ${data.sexPosition}º ${data.sexLabel.toUpperCase()}`;
    ctx.font = `700 ${story ? 36 : 30}px ${sans}`;
    const tw = ctx.measureText(text).width;
    const ph = story ? 76 : 64;
    roundRect(ctx, pad, y, tw + 80, ph, ph / 2, COLORS.gold);
    ctx.fillStyle = COLORS.stage;
    ctx.fillText(text, pad + 40, y + ph / 2 + (story ? 13 : 11));
    y += ph;
  }

  // atleta: logo abaixo dos resultados (no story, longe da barra de resposta do Instagram)
  y += story ? 150 : 74;
  label(ctx, `Atleta  ·  nº ${data.bib}`, pad, y, story ? 28 : 24, COLORS.brand, sans);
  y += story ? 100 : 76;
  ctx.fillStyle = COLORS.white;
  fitText(ctx, data.name, pad, y, w - pad * 2, story ? 88 : 68, (s) => `700 ${s}px ${sans}`);

  if (data.url) {
    ctx.font = `500 ${story ? 30 : 26}px ${sans}`;
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText(data.url, pad, story ? h - 260 : h - 56);
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao gerar a imagem"))), "image/png"),
  );
}

/** Compartilha a imagem pelo menu do celular (Instagram, Strava, WhatsApp…) ou baixa o arquivo. */
export async function shareOrDownload(blob: Blob, fileName: string, text: string): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], fileName, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return "shared";
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return "cancelled";
    }
  }
  downloadBlob(blob, fileName);
  return "downloaded";
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
