import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { Athlete } from "./types";

// A5 paisagem, em mm
const PAGE_W = 210;
const PAGE_H = 148;
const MARGIN = 10;
const QR_SIZE = 48;
const PT_TO_MM = 25.4 / 72;
// altura das maiúsculas/dígitos da Helvetica em relação ao tamanho da fonte
const CAP_HEIGHT = 0.72;

/** Gera um PDF com um número de peito por página (A5) e o baixa. */
export async function downloadBibsPdf(athletes: Athlete[], raceName: string) {
  const doc = await buildBibsPdf(athletes, raceName);
  doc.save("numeros-de-peito.pdf");
}

export async function buildBibsPdf(athletes: Athlete[], raceName: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a5", compress: true });
  const sorted = [...athletes].sort((a, b) => a.bib_number - b.bib_number);

  for (const [i, athlete] of sorted.entries()) {
    if (i > 0) doc.addPage("a5", "landscape");
    await drawBib(doc, athlete, raceName);
  }

  return doc;
}

async function drawBib(doc: jsPDF, athlete: Athlete, raceName: string) {
  const number = String(athlete.bib_number);

  // número: o maior possível na área acima do rodapé
  const numberAreaTop = MARGIN + 8;
  const numberAreaH = PAGE_H - MARGIN - QR_SIZE - 6 - numberAreaTop;
  const maxW = PAGE_W - 2 * MARGIN;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(100);
  const widthAt100 = doc.getTextWidth(number);
  const byWidth = (100 * maxW) / widthAt100;
  const byHeight = numberAreaH / (CAP_HEIGHT * PT_TO_MM);
  const fontSize = Math.min(byWidth, byHeight);
  doc.setFontSize(fontSize);
  const capMm = fontSize * PT_TO_MM * CAP_HEIGHT;
  const baseline = numberAreaTop + (numberAreaH + capMm) / 2;
  doc.text(number, PAGE_W / 2, baseline, { align: "center" });

  // nome da corrida no topo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(raceName, PAGE_W / 2, MARGIN + 3, { align: "center" });

  // rodapé: nome do atleta à esquerda, QR Code à direita
  const qrX = PAGE_W - MARGIN - QR_SIZE;
  const qrY = PAGE_H - MARGIN - QR_SIZE;
  const qr = await QRCode.toDataURL(number, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 400,
  });
  doc.addImage(qr, "PNG", qrX, qrY, QR_SIZE, QR_SIZE);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const nameLines = doc.splitTextToSize(athlete.name, qrX - MARGIN - 6) as string[];
  doc.text(nameLines.slice(0, 2), MARGIN, PAGE_H - MARGIN - 8);
}
