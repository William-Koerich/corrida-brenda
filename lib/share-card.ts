/**
 * Imagem do resultado para Instagram (story) e feed/Strava (quadrado). Desenhada em canvas no aparelho.
 * Layout no estilo dos posts de atividade do Strava: foto em tela cheia (opcional), título da
 * atividade e os números em destaque (rótulo pequeno em cima, valor grande e forte embaixo).
 */

import { formatPace } from "./time";

export type CardFormat = "story" | "square";

export interface CardData {
  brand: string;
  raceName: string;
  distanceKm: number;
  date: string | null;
  name: string;
  bib: number;
  elapsedMs: number;
  overall: number;
  totalFinishers: number;
  sexLabel: string;
  sexPosition: number;
  sexFinishers: number;
  prize: boolean;
  /** crédito no rodapé da imagem, ex.: "Desenvolvido por @w3ko.tech" (vazio = sem rodapé) */
  credit: string;
}

/** Imagem já carregada: foto de fundo do corredor (fica só no aparelho) ou mapa do percurso. */
export interface CardImage {
  image: CanvasImageSource;
  width: number;
  height: number;
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
  dim: "rgba(255,255,255,0.72)",
  line: "rgba(255,255,255,0.22)",
};

// bandeira do logo (lucide "flag"), em coordenadas 24×24
const FLAG_PATH =
  "M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528";

/** Pedaço de um número: valor grande e unidade pequena ("13" + "m"). */
export interface StatPart {
  value: string;
  unit: string;
}

/** Tempo como o Strava mostra: "13m 21s", "1h 02m 15s", "45s". */
export function stravaTime(ms: number): StatPart[] {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return [{ value: String(h), unit: "h" }, { value: two(m), unit: "m" }, { value: two(s), unit: "s" }];
  if (m > 0) return [{ value: String(m), unit: "m" }, { value: two(s), unit: "s" }];
  return [{ value: String(s), unit: "s" }];
}

/** Distância com duas casas, como no Strava: "3,00 km". */
export function stravaDistance(km: number): StatPart[] {
  return [{ value: km.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), unit: " km" }];
}

/** Opções visuais da imagem. */
export interface CardLayers {
  /** foto de fundo; sem ela, o fundo escuro com brilho rosa */
  photo?: CardImage | null;
  /** traçado do percurso (PNG transparente), desenhado acima dos números como no Strava */
  route?: CardImage | null;
}

/** Recorte "cover": a parte central da foto que preenche o destino sem distorcer. */
export function coverRect(srcW: number, srcH: number, dstW: number, dstH: number) {
  const scale = Math.max(dstW / srcW, dstH / srcH);
  const sw = dstW / scale;
  const sh = dstH / scale;
  return { sx: (srcW - sw) / 2, sy: (srcH - sh) / 2, sw, sh };
}

/** Encaixe "contain": a imagem inteira dentro da caixa, centralizada, sem distorcer. */
export function containRect(srcW: number, srcH: number, x: number, y: number, boxW: number, boxH: number) {
  const scale = Math.min(boxW / srcW, boxH / srcH);
  const w = srcW * scale;
  const h = srcH * scale;
  return { x: x + (boxW - w) / 2, y: y + (boxH - h) / 2, w, h };
}

function fonts() {
  const root = getComputedStyle(document.documentElement);
  const sans = root.getPropertyValue("--font-geist-sans").trim() || "system-ui, sans-serif";
  // fonte forte dos números (carregada só na área do corredor)
  const holder = document.querySelector("[data-card-font]");
  const display = (holder && getComputedStyle(holder).getPropertyValue("--font-card").trim()) || sans;
  return { sans, display };
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

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Valor grande + unidade pequena na mesma linha de base, encolhendo para caber na coluna. */
function drawStatValue(ctx: Ctx, parts: StatPart[], x: number, y: number, maxWidth: number, size: number, display: string, color: string) {
  const unitSize = (s: number) => Math.round(s * 0.5);
  const measure = (s: number) =>
    parts.reduce((sum, p, i) => {
      ctx.font = `800 ${s}px ${display}`;
      const v = ctx.measureText(p.value).width;
      ctx.font = `600 ${unitSize(s)}px ${display}`;
      const u = ctx.measureText(p.unit + (i < parts.length - 1 ? " " : "")).width;
      return sum + v + u;
    }, 0);
  let s = size;
  while (measure(s) > maxWidth && s > 20) s -= 2;
  let cx = x;
  ctx.fillStyle = color;
  parts.forEach((p, i) => {
    ctx.font = `800 ${s}px ${display}`;
    ctx.letterSpacing = `${Math.round(-s * 0.02)}px`;
    ctx.fillText(p.value, cx, y);
    cx += ctx.measureText(p.value).width;
    ctx.letterSpacing = "0px";
    ctx.font = `600 ${unitSize(s)}px ${display}`;
    const unit = p.unit + (i < parts.length - 1 ? " " : "");
    ctx.fillText(unit, cx, y);
    cx += ctx.measureText(unit).width;
  });
}

function drawBackground(ctx: Ctx, w: number, h: number, photo: CardImage | null | undefined) {
  ctx.fillStyle = COLORS.stage;
  ctx.fillRect(0, 0, w, h);

  if (photo) {
    const r = coverRect(photo.width, photo.height, w, h);
    ctx.drawImage(photo.image, r.sx, r.sy, r.sw, r.sh, 0, 0, w, h);
    // escurece embaixo (números) e um pouco em cima (marca) para o texto branco ficar legível
    const bottom = ctx.createLinearGradient(0, h * 0.35, 0, h);
    bottom.addColorStop(0, "rgba(0,0,0,0)");
    bottom.addColorStop(0.55, "rgba(0,0,0,0.45)");
    bottom.addColorStop(1, "rgba(0,0,0,0.82)");
    ctx.fillStyle = bottom;
    ctx.fillRect(0, 0, w, h);
    const top = ctx.createLinearGradient(0, 0, 0, h * 0.18);
    top.addColorStop(0, "rgba(0,0,0,0.5)");
    top.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, w, h);
    return;
  }

  // sem foto: o fundo escuro com brilho rosa de sempre
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
}

export async function renderResultCard(data: CardData, format: CardFormat, { photo, route }: CardLayers = {}): Promise<Blob> {
  const { w, h } = SIZE[format];
  const story = format === "story";
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d") as Ctx;
  const { sans, display } = fonts();
  // a fonte do canvas só existe depois de baixada: pede antes de desenhar
  await Promise.all([document.fonts?.load(`800 80px ${display}`), document.fonts?.load(`600 40px ${display}`)].filter(Boolean)).catch(() => {});
  await document.fonts?.ready;
  const pad = 72;
  const inner = w - pad * 2;

  drawBackground(ctx, w, h, photo);
  if (photo) {
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 16;
  }

  // marca
  const markY = story ? 120 : 72;
  const mark = 64;
  roundRect(ctx, pad, markY, mark, mark, 18, COLORS.brand);
  ctx.save();
  ctx.shadowColor = "transparent";
  ctx.translate(pad + 14, markY + 14);
  ctx.scale(1.5, 1.5);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke(new Path2D(FLAG_PATH));
  ctx.restore();
  ctx.fillStyle = COLORS.white;
  ctx.font = `700 34px ${display}`;
  ctx.fillText(data.brand, pad + mark + 22, markY + mark / 2 + 12);

  // bloco de conteúdo: altura calculada antes para ancorar embaixo (com foto ou percurso) ou centralizar
  const S = story
    ? { title: 76, meta: 34, label: 30, value: 92, gap: 56, rowGap: 44 }
    : { title: 58, meta: 28, label: 26, value: 76, gap: 40, rowGap: 30 };
  const pill = data.prize ? (story ? 72 : 60) : 0;
  const statRow = S.label + 18 + S.value;
  const blockH =
    S.title + 22 + S.meta + S.gap + statRow + S.rowGap + 2 + S.rowGap + statRow + (pill ? S.rowGap + pill : 0);
  const top = markY + mark;
  // no story, longe da barra de resposta do Instagram
  const bottom = story ? h - 300 : h - (data.credit ? 110 : 72);
  let y = photo || route ? bottom - blockH : top + (bottom - top - blockH) / 2;

  // percurso no espaço entre a marca e os números
  if (route) {
    const gap = story ? 80 : 28;
    const box = containRect(route.width, route.height, pad, top + gap, inner, y - top - gap * 2);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 18;
    ctx.drawImage(route.image, box.x, box.y, box.w, box.h);
    ctx.restore();
  }

  // título da atividade e quem correu
  y += S.title;
  ctx.fillStyle = COLORS.white;
  ctx.letterSpacing = "-1px";
  fitText(ctx, data.raceName, pad, y, inner, S.title, (s) => `800 ${s}px ${display}`);
  ctx.letterSpacing = "0px";
  y += 22 + S.meta;
  ctx.fillStyle = COLORS.dim;
  const meta = [data.name, data.date].filter(Boolean).join("  ·  ");
  fitText(ctx, meta, pad, y, inner, S.meta, (s) => `500 ${s}px ${sans}`);
  y += S.gap;

  const colW = inner / 3;
  const statsRow = (cols: { label: string; parts: StatPart[]; color?: string }[]) => {
    cols.forEach((c, i) => {
      const x = pad + i * colW;
      ctx.font = `500 ${S.label}px ${sans}`;
      ctx.fillStyle = COLORS.dim;
      ctx.fillText(c.label, x, y + S.label);
      drawStatValue(ctx, c.parts, x, y + statRow, colW - 24, S.value, display, c.color ?? COLORS.white);
    });
    y += statRow;
  };

  // números principais
  const [pace] = formatPace(data.elapsedMs, data.distanceKm).split(" ");
  statsRow([
    { label: "Distância", parts: stravaDistance(data.distanceKm) },
    { label: "Ritmo", parts: [{ value: pace, unit: " /km" }] },
    { label: "Tempo", parts: stravaTime(data.elapsedMs) },
  ]);

  y += S.rowGap;
  ctx.save();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = COLORS.line;
  ctx.fillRect(pad, y, inner, 2);
  ctx.restore();
  y += 2 + S.rowGap;

  // classificação
  statsRow([
    { label: "Geral", parts: [{ value: String(data.overall), unit: ` de ${data.totalFinishers}` }] },
    { label: data.sexLabel, parts: [{ value: String(data.sexPosition), unit: ` de ${data.sexFinishers}` }] },
    { label: "Número", parts: [{ value: String(data.bib), unit: "" }] },
  ]);

  if (data.prize) {
    y += S.rowGap;
    const text = `PÓDIO · ${data.sexPosition}º ${data.sexLabel.toUpperCase()}`;
    ctx.font = `800 ${story ? 32 : 27}px ${display}`;
    ctx.letterSpacing = "2px";
    const tw = ctx.measureText(text).width;
    ctx.save();
    ctx.shadowColor = "transparent";
    roundRect(ctx, pad, y, tw + 72, pill, pill / 2, COLORS.gold);
    ctx.fillStyle = COLORS.stage;
    ctx.fillText(text, pad + 36, y + pill / 2 + (story ? 11 : 10));
    ctx.restore();
    ctx.letterSpacing = "0px";
  }

  if (data.credit) {
    ctx.font = `500 ${story ? 30 : 26}px ${sans}`;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText(data.credit, pad, story ? h - 200 : h - 56);
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao gerar a imagem"))), "image/png"),
  );
}

/**
 * Só o traçado do percurso, com fundo transparente, como o adesivo do Strava: o corredor
 * cola por cima da própria foto ou story.
 */
export async function renderRouteSticker(route: CardImage): Promise<Blob> {
  // folga em volta para a sombra não ser cortada
  const margin = 40;
  const canvas = document.createElement("canvas");
  canvas.width = route.width + margin * 2;
  canvas.height = route.height + margin * 2;
  const ctx = canvas.getContext("2d") as Ctx;
  // sombra leve: o traçado precisa aparecer em cima de foto clara ou escura
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 14;
  ctx.drawImage(route.image, margin, margin);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao gerar a imagem"))), "image/png"),
  );
}

/**
 * Carrega uma imagem para o canvas (arquivo escolhido ou endereço): aplica a rotação da
 * câmera (EXIF) e reduz para no máximo 2160 px, o que basta para a imagem final e deixa
 * o redesenho rápido no celular.
 */
export async function loadCardImage(source: Blob | string, maxSide = 2160): Promise<CardImage> {
  const blob = typeof source === "string" ? await (await fetch(source)).blob() : source;
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { image: canvas, width: canvas.width, height: canvas.height };
  } finally {
    URL.revokeObjectURL(url);
  }
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
