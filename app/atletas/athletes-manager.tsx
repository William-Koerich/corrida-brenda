"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AthleteInput } from "@/lib/athletes";
import { stripAccents } from "@/lib/athletes";
import { friendlyError } from "@/lib/errors";
import { getSupabase } from "@/lib/supabase";
import type { Athlete, Race } from "@/lib/types";
import { AthleteForm } from "./athlete-form";
import { CsvImport } from "./csv-import";

export function AthletesManager({ race }: { race: Race }) {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Athlete | undefined>();
  const [pdfStatus, setPdfStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await getSupabase()
      .from("athletes")
      .select("*")
      .eq("race_id", race.id)
      .order("bib_number");
    setLoading(false);
    if (error) {
      setLoadError(friendlyError(error));
    } else {
      setLoadError(null);
      setAthletes(data as Athlete[]);
    }
  }, [race.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial assíncrona
    load();
  }, [load]);

  const bibs = useMemo(() => new Set(athletes.map((a) => a.bib_number)), [athletes]);

  const filtered = useMemo(() => {
    const q = stripAccents(search.trim().toLowerCase());
    if (!q) return athletes;
    return athletes.filter(
      (a) =>
        String(a.bib_number).includes(q) ||
        stripAccents(a.name.toLowerCase()).includes(q),
    );
  }, [athletes, search]);

  async function save(input: AthleteInput): Promise<string | null> {
    const table = getSupabase().from("athletes");
    const { error } = editing
      ? await table.update(input).eq("id", editing.id)
      : await table.insert({ ...input, race_id: race.id });
    if (error) return friendlyError(error);
    setEditing(undefined);
    await load();
    return null;
  }

  async function importMany(list: AthleteInput[]): Promise<string | null> {
    const { error } = await getSupabase()
      .from("athletes")
      .insert(list.map((a) => ({ ...a, race_id: race.id })));
    if (error) return friendlyError(error);
    await load();
    return null;
  }

  async function remove(athlete: Athlete) {
    const ok = window.confirm(
      `Excluir nº ${athlete.bib_number} — ${athlete.name}?\n\nSe ele já tiver chegada registrada, a chegada fica sem identificação.`,
    );
    if (!ok) return;
    const { error } = await getSupabase().from("athletes").delete().eq("id", athlete.id);
    if (error) {
      window.alert(friendlyError(error));
      return;
    }
    if (editing?.id === athlete.id) setEditing(undefined);
    await load();
  }

  async function generatePdf() {
    setPdfStatus("Gerando PDF…");
    try {
      const { downloadBibsPdf } = await import("@/lib/bib-pdf");
      await downloadBibsPdf(athletes, race.name);
      setPdfStatus(null);
    } catch (e) {
      setPdfStatus(`Erro ao gerar PDF: ${friendlyError(e)}`);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg">
        <strong>{race.name}</strong> · {athletes.length} atletas cadastrados
      </p>

      <AthleteForm
        key={editing?.id ?? "novo"}
        editing={editing}
        isBibTaken={(bib) => bibs.has(bib) && bib !== editing?.bib_number}
        onSubmit={save}
        onCancel={() => setEditing(undefined)}
      />

      <CsvImport existingBibs={bibs} onImport={importMany} />

      <section className="flex flex-col gap-3">
        <button
          onClick={generatePdf}
          disabled={athletes.length === 0 || pdfStatus === "Gerando PDF…"}
          className="rounded-lg bg-yellow-400 py-4 text-lg font-bold text-black border-2 border-black disabled:opacity-50"
        >
          Gerar números de peito (PDF)
        </button>
        {pdfStatus && <p className="font-bold">{pdfStatus}</p>}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Lista</h2>
        <input
          type="search"
          placeholder="Buscar por nome ou número"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border-2 border-black px-3 py-3 text-lg"
        />

        {loading && <p>Carregando atletas…</p>}
        {loadError && (
          <p className="font-bold text-red-700">
            {loadError}{" "}
            <button onClick={load} className="underline">
              Tentar de novo
            </button>
          </p>
        )}
        {!loading && !loadError && filtered.length === 0 && (
          <p>{athletes.length ? "Nenhum atleta encontrado." : "Nenhum atleta cadastrado ainda."}</p>
        )}

        <ul className="flex flex-col divide-y-2 divide-black/10">
          {filtered.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-3">
              <span className="w-16 shrink-0 text-2xl font-bold tabular-nums">{a.bib_number}</span>
              <span className="flex-1 min-w-0">
                <span className="block truncate font-bold">{a.name}</span>
                <span className="text-sm">
                  {a.age} anos · {a.sex === "M" ? "Masculino" : "Feminino"}
                </span>
              </span>
              <button
                onClick={() => {
                  setEditing(a);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="rounded-lg border-2 border-black px-3 py-2 font-bold"
              >
                Editar
              </button>
              <button
                onClick={() => remove(a)}
                className="rounded-lg border-2 border-red-700 px-3 py-2 font-bold text-red-700"
              >
                Excluir
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
