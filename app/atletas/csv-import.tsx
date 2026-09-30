"use client";

import { useState } from "react";
import type { AthleteInput } from "@/lib/athletes";
import { parseAthletesCsv, type CsvImportResult } from "@/lib/csv";

interface Props {
  existingBibs: ReadonlySet<number>;
  onImport: (athletes: AthleteInput[]) => Promise<string | null>;
}

export function CsvImport({ existingBibs, onImport }: Props) {
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

  return (
    <section className="flex flex-col gap-3 rounded-lg border-2 border-black p-4">
      <h2 className="text-xl font-bold">Importar CSV</h2>
      <p className="text-sm">
        Colunas: <code>nome, idade, sexo, numero</code> (separador vírgula ou ponto e vírgula).
      </p>
      <label className="rounded-lg border-2 border-dashed border-black py-3 text-center font-bold cursor-pointer">
        Escolher arquivo…
        <input type="file" accept=".csv,text/csv" onChange={handleFile} className="sr-only" />
      </label>

      {preview && (
        <div className="flex flex-col gap-2">
          <p>
            <strong>{fileName}</strong>: {preview.athletes.length} válidos
            {preview.errors.length > 0 && `, ${preview.errors.length} com erro`}
          </p>
          {preview.errors.length > 0 && (
            <ul className="max-h-48 overflow-y-auto rounded-lg bg-red-100 p-3 text-sm text-red-800">
              {preview.errors.map((err) => (
                <li key={`${err.line}-${err.message}`}>
                  Linha {err.line}: {err.message}
                </li>
              ))}
            </ul>
          )}
          {preview.athletes.length > 0 && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="rounded-lg bg-black py-3 text-lg font-bold text-white disabled:opacity-50"
            >
              {importing
                ? "Importando…"
                : `Importar ${preview.athletes.length} atletas`}
              {preview.errors.length > 0 && !importing && " (ignorar erros)"}
            </button>
          )}
        </div>
      )}

      {status && (
        <p className={`font-bold ${status.ok ? "text-green-700" : "text-red-700"}`}>
          {status.text}
        </p>
      )}
    </section>
  );
}
