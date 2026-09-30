import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseAthletesCsv, parseCsv } from "./csv";
import { normalizeSex, validateAthlete } from "./athletes";

describe("parseCsv", () => {
  it("lida com aspas, aspas duplicadas e quebra de linha dentro de aspas", () => {
    const rows = parseCsv('a,b\r\n"x, y","diz ""oi""\nfim"\n3,4');
    expect(rows.map((r) => r.cells)).toEqual([
      ["a", "b"],
      ["x, y", 'diz "oi"\nfim'],
      ["3", "4"],
    ]);
    expect(rows.map((r) => r.line)).toEqual([1, 2, 4]);
  });

  it("detecta ponto e vírgula", () => {
    expect(parseCsv("a;b\n1;2")[1].cells).toEqual(["1", "2"]);
  });
});

describe("parseAthletesCsv", () => {
  it("importa linhas válidas com separador ; e BOM", () => {
    const csv = "﻿Nome;Idade;Sexo;Número\nAna Souza;30;F;101\nJoão;45;masculino;102\n";
    const { athletes, errors } = parseAthletesCsv(csv);
    expect(errors).toEqual([]);
    expect(athletes).toEqual([
      { name: "Ana Souza", age: 30, sex: "F", bib_number: 101 },
      { name: "João", age: 45, sex: "M", bib_number: 102 },
    ]);
  });

  it("aceita colunas em outra ordem e ignora linhas em branco", () => {
    const csv = "numero,sexo,nome,idade\n\n7,f,Bia,22\n";
    expect(parseAthletesCsv(csv).athletes).toEqual([
      { name: "Bia", age: 22, sex: "F", bib_number: 7 },
    ]);
  });

  it("aponta a linha de cada erro", () => {
    const csv = [
      "nome,idade,sexo,numero",
      "Ana,30,F,1",
      ",abc,X,0", // tudo errado
      "Bia,25,F,1", // repetido no arquivo
      "Caio,40,M,50", // já cadastrado
    ].join("\n");
    const { athletes, errors } = parseAthletesCsv(csv, new Set([50]));
    expect(athletes).toHaveLength(1);
    expect(errors).toEqual([
      {
        line: 3,
        message:
          "Nome é obrigatório; Idade inválida; Sexo deve ser M ou F; Número de peito inválido",
      },
      { line: 4, message: "Número 1 repetido (já na linha 2)" },
      { line: 5, message: "Número 50 já cadastrado" },
    ]);
  });

  it("recusa cabeçalho incompleto", () => {
    const { errors } = parseAthletesCsv("nome,idade\nAna,30");
    expect(errors[0].message).toBe("Cabeçalho sem as colunas: sexo, numero");
  });

  it("importa o arquivo de exemplo sem erros", () => {
    const csv = readFileSync("exemplos/atletas-exemplo.csv", "utf8");
    const { athletes, errors } = parseAthletesCsv(csv);
    expect(errors).toEqual([]);
    expect(athletes).toHaveLength(20);
  });

  it("recusa arquivo vazio", () => {
    expect(parseAthletesCsv("\n\n").errors[0].message).toBe("Arquivo vazio");
  });
});

describe("validateAthlete", () => {
  it("normaliza espaços no nome", () => {
    const r = validateAthlete({ name: "  Ana   Maria ", age: "30", sex: "F", bib: "5" });
    expect(r).toEqual({
      ok: true,
      athlete: { name: "Ana Maria", age: 30, sex: "F", bib_number: 5 },
    });
  });

  it("recusa idade acima de 120 e número com decimais", () => {
    const r = validateAthlete({ name: "X", age: "130", sex: "M", bib: "1.5" });
    expect(r).toEqual({
      ok: false,
      errors: ["Idade inválida", "Número de peito inválido"],
    });
  });

  it("normaliza sexo", () => {
    expect(normalizeSex("Feminino")).toBe("F");
    expect(normalizeSex(" masc ")).toBe("M");
    expect(normalizeSex("outro")).toBeNull();
  });
});
