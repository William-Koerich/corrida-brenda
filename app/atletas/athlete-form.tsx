"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { validateAthlete, type AthleteInput } from "@/lib/athletes";
import type { Athlete, Sex } from "@/lib/types";

interface Props {
  /** atleta em edição; undefined = novo cadastro */
  editing?: Athlete;
  /** retorna true se o número já pertence a outro atleta */
  isBibTaken: (bib: number) => boolean;
  onSubmit: (input: AthleteInput) => Promise<string | null>;
  onCancel: () => void;
}

export function AthleteForm({ editing, isBibTaken, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(editing?.name ?? "");
  const [age, setAge] = useState(editing?.age != null ? String(editing.age) : "");
  const [sex, setSex] = useState<Sex | "">(editing?.sex ?? "");
  const [bib, setBib] = useState(editing ? String(editing.bib_number) : "");
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validateAthlete({ name, age, sex, bib });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    if (isBibTaken(result.athlete.bib_number)) {
      setErrors([`O número ${result.athlete.bib_number} já está cadastrado.`]);
      return;
    }
    setSaving(true);
    const error = await onSubmit(result.athlete);
    setSaving(false);
    if (error) {
      setErrors([error]);
    } else if (!editing) {
      setName("");
      setAge("");
      setSex("");
      setBib("");
      setErrors([]);
    }
  }

  return (
    <Card>
      <CardHeader
        title={editing ? `Editar atleta nº ${editing.bib_number}` : "Novo atleta"}
        description={editing ? editing.name : "Nome, número e sexo são obrigatórios."}
      />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
        <Field label="Nome">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" placeholder="Nome completo" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Idade (opcional)">
            <Input value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" placeholder="Ex.: 32" />
          </Field>
          <Field label="Número de peito">
            <Input value={bib} onChange={(e) => setBib(e.target.value)} inputMode="numeric" placeholder="Ex.: 101" />
          </Field>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Sexo</span>
          <Segmented<Sex | "">
            ariaLabel="Sexo"
            value={sex}
            onChange={setSex}
            options={[
              { value: "M", label: "Masculino" },
              { value: "F", label: "Feminino" },
            ]}
          />
        </div>

        {errors.length > 0 && (
          <ul className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800 ring-1 ring-red-200">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={saving} className="flex-1" icon={!editing && <UserPlus size={16} />}>
            {saving ? "Salvando…" : editing ? "Salvar alterações" : "Cadastrar"}
          </Button>
          {editing && <Button onClick={onCancel}>Cancelar</Button>}
        </div>
      </form>
    </Card>
  );
}
