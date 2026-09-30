"use client";

import { useState } from "react";
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
  const [age, setAge] = useState(editing ? String(editing.age) : "");
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

  const input = "w-full rounded-lg border-2 border-black px-3 py-3 text-lg";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border-2 border-black p-4"
    >
      <h2 className="text-xl font-bold">
        {editing ? `Editar nº ${editing.bib_number}` : "Novo atleta"}
      </h2>

      <label className="flex flex-col gap-1">
        <span className="font-bold">Nome</span>
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-bold">Idade</span>
          <input className={input} value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-bold">Número de peito</span>
          <input className={input} value={bib} onChange={(e) => setBib(e.target.value)} inputMode="numeric" />
        </label>
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className="font-bold mb-1">Sexo</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["M", "F"] as Sex[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSex(s)}
              aria-pressed={sex === s}
              className={`rounded-lg border-2 border-black py-3 text-lg font-bold ${
                sex === s ? "bg-black text-white" : ""
              }`}
            >
              {s === "M" ? "Masculino" : "Feminino"}
            </button>
          ))}
        </div>
      </fieldset>

      {errors.length > 0 && (
        <ul className="rounded-lg bg-red-100 p-3 font-bold text-red-800">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg bg-black py-3 text-lg font-bold text-white disabled:opacity-50"
        >
          {saving ? "Salvando…" : editing ? "Salvar alterações" : "Cadastrar"}
        </button>
        {editing && (
          <button type="button" onClick={onCancel} className="rounded-lg border-2 border-black px-4 font-bold">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
