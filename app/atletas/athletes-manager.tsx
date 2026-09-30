"use client";

import { FileDown, Pencil, Search, Trash2, Upload, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BibChip, SexBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import type { AthleteInput } from "@/lib/athletes";
import { stripAccents } from "@/lib/athletes";
import { friendlyError } from "@/lib/errors";
import { getSupabase } from "@/lib/supabase";
import type { Athlete, Race } from "@/lib/types";
import { AthleteForm } from "./athlete-form";
import { CsvImportDialog } from "./csv-import";

export function AthletesManager({ race }: { race: Race }) {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Athlete | undefined>();
  const [deleting, setDeleting] = useState<Athlete | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

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
  const women = athletes.filter((a) => a.sex === "F").length;

  const filtered = useMemo(() => {
    const q = stripAccents(search.trim().toLowerCase());
    if (!q) return athletes;
    return athletes.filter(
      (a) => String(a.bib_number).includes(q) || stripAccents(a.name.toLowerCase()).includes(q),
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
    const { error } = await getSupabase().from("athletes").delete().eq("id", athlete.id);
    if (error) {
      setActionError(friendlyError(error));
      return;
    }
    if (editing?.id === athlete.id) setEditing(undefined);
    await load();
  }

  async function generatePdf() {
    setPdfBusy(true);
    setActionError(null);
    try {
      const { downloadBibsPdf } = await import("@/lib/bib-pdf");
      await downloadBibsPdf(athletes, race.name);
    } catch (e) {
      setActionError(`Erro ao gerar PDF: ${friendlyError(e)}`);
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Atletas"
        description={
          <span>
            {race.name} · <strong className="text-ink">{athletes.length}</strong> inscritos ·{" "}
            {athletes.length - women} masculino · {women} feminino
          </span>
        }
        actions={
          <>
            <Button icon={<Upload size={16} />} onClick={() => setImportOpen(true)}>
              Importar CSV
            </Button>
            <Button variant="primary" icon={<FileDown size={16} />} onClick={generatePdf} disabled={!athletes.length || pdfBusy}>
              {pdfBusy ? "Gerando PDF…" : "Gerar números de peito"}
            </Button>
          </>
        }
      />

      {actionError && <Alert tone="danger">{actionError}</Alert>}

      <div className="grid items-start gap-6 lg:grid-cols-[360px_1fr]">
        <div className="lg:sticky lg:top-24">
          <AthleteForm
            key={editing?.id ?? "novo"}
            editing={editing}
            isBibTaken={(bib) => bibs.has(bib) && bib !== editing?.bib_number}
            onSubmit={save}
            onCancel={() => setEditing(undefined)}
          />
        </div>

        <Card>
          <div className="border-b border-line p-4">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft" />
              <Input
                type="search"
                placeholder="Buscar por nome ou número"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {loading && <p className="p-6 text-center text-ink-soft">Carregando atletas…</p>}
          {loadError && (
            <div className="p-4">
              <Alert tone="danger">
                {loadError}{" "}
                <button onClick={load} className="font-semibold underline">
                  Tentar de novo
                </button>
              </Alert>
            </div>
          )}
          {!loading && !loadError && filtered.length === 0 && (
            <EmptyState
              icon={<Users size={22} />}
              title={athletes.length ? "Nenhum atleta encontrado" : "Nenhum atleta cadastrado"}
              description={athletes.length ? "Tente outro nome ou número." : "Cadastre no formulário ou importe uma planilha CSV."}
            />
          )}

          <ul className="divide-y divide-line">
            {filtered.map((a) => (
              <li
                key={a.id}
                className={`flex items-center gap-3 px-4 py-3 ${editing?.id === a.id ? "bg-volt-soft/60" : ""}`}
              >
                <BibChip bib={a.bib_number} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{a.name}</span>
                  {a.age != null && <span className="text-sm text-ink-soft">{a.age} anos</span>}
                </span>
                <SexBadge sex={a.sex} />
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Editar"
                    title="Editar"
                    onClick={() => {
                      setEditing(a);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <Pencil size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Excluir"
                    title="Excluir"
                    className="text-red-700 hover:bg-red-50"
                    onClick={() => setDeleting(a)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <CsvImportDialog open={importOpen} onClose={() => setImportOpen(false)} existingBibs={bibs} onImport={importMany} />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => (deleting ? remove(deleting) : undefined)}
        tone="danger"
        title={deleting ? `Excluir nº ${deleting.bib_number} — ${deleting.name}?` : ""}
        description="Se o atleta já tiver chegada registrada, a chegada fica sem identificação."
        confirmLabel="Excluir atleta"
      />
    </div>
  );
}
