import { stripAccents, validateAthlete, type AthleteInput } from "./athletes";

export interface CsvLineError {
  line: number;
  message: string;
}

export interface CsvImportResult {
  athletes: AthleteInput[];
  errors: CsvLineError[];
}

const COLUMN_ALIASES: Record<"name" | "age" | "sex" | "bib", string[]> = {
  name: ["nome"],
  age: ["idade"],
  sex: ["sexo"],
  bib: ["numero", "numero de peito", "num", "peito"],
};

/**
 * Lê um CSV de atletas com cabeçalho (nome, sexo, numero e, opcionalmente, idade).
 * Aceita separador "," ou ";" (Excel em português), aspas e BOM.
 * Números já cadastrados (existingBibs) e repetidos no arquivo viram erro.
 */
export function parseAthletesCsv(
  text: string,
  existingBibs: ReadonlySet<number> = new Set(),
): CsvImportResult {
  const rows = parseCsv(text.replace(/^﻿/, ""));
  const athletes: AthleteInput[] = [];
  const errors: CsvLineError[] = [];

  const headerIdx = rows.findIndex((r) => !isBlank(r.cells));
  if (headerIdx === -1) {
    return { athletes, errors: [{ line: 1, message: "Arquivo vazio" }] };
  }

  const header = rows[headerIdx].cells.map((h) =>
    stripAccents(h.trim().toLowerCase()),
  );
  const col = {} as Record<keyof typeof COLUMN_ALIASES, number>;
  const missing: string[] = [];
  for (const key of Object.keys(COLUMN_ALIASES) as (keyof typeof COLUMN_ALIASES)[]) {
    col[key] = header.findIndex((h) => COLUMN_ALIASES[key].includes(h));
    if (col[key] === -1 && key !== "age") missing.push(COLUMN_ALIASES[key][0]);
  }
  if (missing.length) {
    return {
      athletes,
      errors: [
        {
          line: rows[headerIdx].line,
          message: `Cabeçalho sem as colunas: ${missing.join(", ")}`,
        },
      ],
    };
  }

  const seenInFile = new Map<number, number>();
  for (const { cells, line } of rows.slice(headerIdx + 1)) {
    if (isBlank(cells)) continue;
    const result = validateAthlete({
      name: cells[col.name] ?? "",
      age: col.age === -1 ? "" : (cells[col.age] ?? ""),
      sex: cells[col.sex] ?? "",
      bib: cells[col.bib] ?? "",
    });
    if (!result.ok) {
      errors.push({ line, message: result.errors.join("; ") });
      continue;
    }
    const bib = result.athlete.bib_number;
    if (existingBibs.has(bib)) {
      errors.push({ line, message: `Número ${bib} já cadastrado` });
      continue;
    }
    const firstLine = seenInFile.get(bib);
    if (firstLine !== undefined) {
      errors.push({ line, message: `Número ${bib} repetido (já na linha ${firstLine})` });
      continue;
    }
    seenInFile.set(bib, line);
    athletes.push(result.athlete);
  }

  return { athletes, errors };
}

interface CsvRow {
  cells: string[];
  /** linha do arquivo onde o registro começa (1-based) */
  line: number;
}

function detectDelimiter(text: string): "," | ";" {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const semis = firstLine.split(";").length;
  const commas = firstLine.split(",").length;
  return semis > commas ? ";" : ",";
}

/** Parser CSV simples (RFC 4180): aspas, aspas duplicadas e quebras dentro de aspas. */
export function parseCsv(text: string): CsvRow[] {
  const delim = detectDelimiter(text);
  const rows: CsvRow[] = [];
  let cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  let line = 1;
  let rowStart = 1;

  const endRow = () => {
    cells.push(cell);
    rows.push({ cells, line: rowStart });
    cells = [];
    cell = "";
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === "\n") line++;
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      cells.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      endRow();
      line++;
      rowStart = line;
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || cells.length) endRow();
  return rows;
}

function isBlank(cells: string[]): boolean {
  return cells.every((c) => c.trim() === "");
}
