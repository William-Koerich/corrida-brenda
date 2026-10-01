"use client";

import { Download, Monitor, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { Podium, PositionBadge } from "@/components/podium";
import { Badge, BibChip, SexBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { buildResults, filterResults, podiums, resultsToCsv, type SexFilter } from "@/lib/results";
import { formatDuration, formatPace } from "@/lib/time";
import type { Race } from "@/lib/types";
import { useAthletes, useFinishes } from "@/lib/use-race-data";
import { PublicLinkButton } from "./public-link";
import { UnidentifiedList } from "./unidentified-list";

type Tab = "classificacao" | "premiacao";

export function ResultsBoard({ race }: { race: Race }) {
  const athletes = useAthletes(race.id);
  const [actionError, setActionError] = useState<string | null>(null);
  const { finishes, loadError, status: syncStatus, assign, remove } = useFinishes(race.id, setActionError);
  const [tab, setTab] = useState<Tab>("classificacao");
  const [sex, setSex] = useState<SexFilter>("all");

  const distance = Number(race.distance_km);
  const { rows, unidentified } = useMemo(
    () => buildResults(race, athletes.byBib.values(), finishes),
    [race, athletes.byBib, finishes],
  );
  const filtered = useMemo(() => filterResults(rows, sex), [rows, sex]);
  const podiumList = useMemo(() => podiums(rows), [rows]);

  function exportCsv() {
    const blob = new Blob([resultsToCsv(rows, distance)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resultados-${race.name.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!race.start_time) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Resultados" description={race.name} />
        <Card>
          <EmptyState
            icon={<Trophy size={22} />}
            title="A corrida ainda não largou"
            description="A classificação aparece aqui assim que as primeiras chegadas forem registradas."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Resultados"
        description={
          <span className="flex flex-wrap items-center gap-2">
            {race.name} · {rows.length} classificados
            {race.status === "running" && syncStatus.online && (
              <Badge tone="success" dot>
                Ao vivo
              </Badge>
            )}
            {race.status === "finished" && <Badge tone="dark">Resultado final</Badge>}
            {!syncStatus.online && <Badge tone="danger">Offline · pode estar desatualizado</Badge>}
          </span>
        }
        actions={
          <>
            <PublicLinkButton />
            <ButtonLink href="/telao" icon={<Monitor size={16} />}>
              Modo telão
            </ButtonLink>
            <Button variant="primary" icon={<Download size={16} />} onClick={exportCsv} disabled={!rows.length}>
              Exportar CSV
            </Button>
          </>
        }
      />

      {(loadError || athletes.error || actionError) && (
        <Alert tone="danger">{loadError ?? athletes.error ?? actionError}</Alert>
      )}

      <UnidentifiedList
        unidentified={unidentified}
        allFinishes={finishes}
        athletesByBib={athletes.byBib}
        startTime={race.start_time}
        onAssign={(clientId, athlete) => {
          setActionError(null);
          assign(clientId, athlete);
        }}
        onDelete={remove}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="sm:w-72">
          <Segmented<Tab>
            ariaLabel="Visão"
            value={tab}
            onChange={setTab}
            options={[
              { value: "classificacao", label: "Classificação" },
              { value: "premiacao", label: "Premiação" },
            ]}
          />
        </div>
        {tab === "classificacao" && (
          <div className="sm:ml-auto sm:w-80">
            <Segmented<SexFilter>
              ariaLabel="Filtro"
              value={sex}
              onChange={setSex}
              options={[
                { value: "all", label: "Geral" },
                { value: "M", label: "Masculino" },
                { value: "F", label: "Feminino" },
              ]}
            />
          </div>
        )}
      </div>

      {tab === "classificacao" ? (
        <Card className="overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Trophy size={22} />}
              title="Nenhum atleta classificado ainda"
              description="As chegadas identificadas aparecem aqui em tempo real."
            />
          ) : (
            <table className="w-full text-left">
              <thead className="bg-canvas/70 text-xs font-medium tracking-wide text-ink-soft uppercase">
                <tr>
                  <th className="py-3 pr-2 pl-4">Pos.</th>
                  <th className="px-2 py-3">Nº</th>
                  <th className="px-2 py-3">Atleta</th>
                  <th className="hidden px-2 py-3 sm:table-cell">Idade</th>
                  <th className="hidden px-2 py-3 sm:table-cell">Sexo</th>
                  <th className="px-2 py-3 text-right">Tempo</th>
                  <th className="py-3 pr-4 pl-2 text-right">Ritmo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((r) => (
                  <tr key={r.finish.client_id} className="hover:bg-canvas/50">
                    <td className="py-2.5 pr-2 pl-4">
                      <PositionBadge position={r.position} />
                      {sex !== "all" && <span className="block pt-0.5 text-[11px] text-ink-soft">{r.overall}º geral</span>}
                    </td>
                    <td className="px-2 py-2.5">
                      <BibChip bib={r.athlete.bib_number} />
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="font-medium">{r.athlete.name}</span>
                      <span className="block text-sm text-ink-soft sm:hidden">
                        {r.athlete.age != null ? `${r.athlete.age} anos · ` : ""}
                        {r.athlete.sex}
                      </span>
                    </td>
                    <td className="hidden px-2 py-2.5 text-ink-soft sm:table-cell">{r.athlete.age ?? "—"}</td>
                    <td className="hidden px-2 py-2.5 sm:table-cell">
                      <SexBadge sex={r.athlete.sex} />
                    </td>
                    <td className="tabular px-2 py-2.5 text-right font-mono font-semibold">{formatDuration(r.elapsedMs)}</td>
                    <td className="tabular py-2.5 pr-4 pl-2 text-right font-mono text-sm whitespace-nowrap text-ink-soft">
                      {formatPace(r.elapsedMs, distance).replace(" /km", "")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {podiumList.map((p) => (
            <Card key={p.category.id} className="p-6">
              <Podium podium={p} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
