"use client";

import { Check, Copy, Download, ExternalLink, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { downloadBlob } from "@/lib/share-card";

/** Link e QR Code da área pública, para os corredores verem e compartilharem o resultado. */
export function PublicLinkButton() {
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    const link = `${window.location.origin}/meu-resultado`;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- endereço só existe no navegador
    setUrl(link);
    QRCode.toDataURL(link, { width: 640, margin: 2, errorCorrectionLevel: "M" }).then(setQr);
  }, [open]);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function downloadQr() {
    if (!qr) return;
    downloadBlob(await (await fetch(qr)).blob(), "qrcode-resultados.png");
  }

  return (
    <>
      <Button icon={<QrCode size={16} />} onClick={() => setOpen(true)}>
        Link para corredores
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Resultados para os corredores"
        description="Cada corredor busca pelo nome ou número, vê o próprio resultado e compartilha no Instagram, Strava ou WhatsApp."
      >
        <div className="flex flex-col items-center gap-4">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element -- QR gerado no aparelho
            <img src={qr} alt="QR Code da página de resultados" className="size-56 rounded-xl ring-1 ring-line" />
          ) : (
            <div className="size-56 rounded-xl bg-canvas" />
          )}
          <p data-testid="public-url" className="w-full truncate rounded-xl bg-canvas px-3 py-2 text-center font-mono text-sm">
            {url}
          </p>
          <div className="grid w-full grid-cols-3 gap-2">
            <Button icon={copied ? <Check size={16} /> : <Copy size={16} />} onClick={copy}>
              {copied ? "Copiado" : "Copiar"}
            </Button>
            <Button icon={<Download size={16} />} onClick={downloadQr} disabled={!qr}>
              QR Code
            </Button>
            <Button icon={<ExternalLink size={16} />} onClick={() => window.open(url, "_blank")}>
              Abrir
            </Button>
          </div>
          <p className="text-center text-xs text-ink-soft">
            Dica: imprima o QR Code e deixe na área de chegada, ou mostre no telão.
          </p>
        </div>
      </Dialog>
    </>
  );
}
