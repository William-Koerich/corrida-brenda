"use client";

import { FileSpreadsheet, Upload } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import type { AthleteInput } from "@/lib/athletes";
import { parseAthletesCsv, type CsvImportResult } from "@/lib/csv";

interface Props {
  open: boolean;
  onClose: () => void;
  existingBibs: ReadonlySet<number>;
  onImport: (athletes: AthleteInput[]) => Promise<string | null>;
}

export function CsvImportDialog({ open, onClose, existingBibs, onImport }: Props) {
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<CsvImportResult | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [importing, setImporting] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFileName(file.name);
    setStatus(null);
    setPreview(parseAthletesCsv(await file.text(), existingBibs));
  }

  async function handleImport() {
    if (!preview?.athletes.length) return;
    setImporting(true);
    const error = await onImport(preview.athletes);
    setImporting(false);
    if (error) {
      setStatus({ ok: false, text: error });
    } else {
      setStatus({ ok: true, text: `${preview.athletes.length} atletas importados.` });
      setPreview(null);
    }
  }

  function close() {
    setPreview(null);
    setStatus(null);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Importar atletas por CSV"
      description={
        <>
          Colunas <code className="rounded bg-canvas px-1">nome, sexo, numero</code> e, se quiser,{" "}
          <code className="rounded bg-canvas px-1">idade</code>. Separadas por vírgula ou ponto e vírgula.
        </>
      }
      footer={
        <>
          <Button onClick={close}>{status?.ok ? "Fechar" : "Cancelar"}</Button>
          {preview && preview.athletes.length > 0 && (
            <Button variant="primary" onClick={handleImport} disabled={importing}>
              {importing ? "Importando…" : `Importar ${preview.athletes.length} atletas`}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line bg-canvas/60 px-4 py-8 text-center transition hover:border-ink/30">
          <Upload size={22} className="text-ink-soft" />
          <span className="font-semibold">Escolher arquivo CSV</span>
          <span className="text-xs text-ink-soft">Exportado do Excel ou Google Planilhas</span>
          <input type="file" accept=".csv,text/csv" onChange={handleFile} className="sr-only" />
        </label>

        {preview && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet size={16} className="text-ink-soft" />
              <span className="font-medium">{fileName}</span>
              <span className="text-ink-soft">
                · {preview.athletes.length} válidos
                {preview.errors.length > 0 && ` · ${preview.errors.length} com erro (serão ignorados)`}
              </span>
            </div>
            {preview.errors.length > 0 && (
              <ul className="max-h-48 overflow-y-auto rounded-xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
                {preview.errors.map((err) => (
                  <li key={`${err.line}-${err.message}`}>
                    <strong>Linha {err.line}:</strong> {err.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {status && <Alert tone={status.ok ? "success" : "danger"}>{status.text}</Alert>}
      </div>
    </Dialog>
  );
}
