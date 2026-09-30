# Roteiro de teste — ensaio com 20 atletas

Ensaio completo da cronometragem antes do dia da prova. Leva **cerca de 40 minutos** com 3 pessoas. O roteiro testa:

- a largada com horário do servidor;
- chegadas isoladas e simultâneas, pelo teclado e pela câmera;
- chegada sem número e correção de número digitado errado;
- **um período sem internet** em um dos celulares, com conflito entre aparelhos;
- classificação, premiação, CSV e telão.

Os atletas são os 20 de [exemplos/atletas-exemplo.csv](../exemplos/atletas-exemplo.csv). Ninguém precisa correr: um voluntário segura as folhas com os números e "chega" com elas, seguindo o cronograma.

## Equipe e equipamentos

| Quem             | Aparelho                    | Tela                                |
| ---------------- | --------------------------- | ----------------------------------- |
| **Coordenador**  | Computador                  | `/largada`, depois `/resultados`    |
| **Celular A**    | Celular 1 (modo Teclado)    | `/chegada`                          |
| **Celular B**    | Celular 2 (modo Câmera)     | `/chegada`                          |
| TV ou notebook   | —                           | `/telao?view=alternar`              |

Material: os 20 números de peito impressos (ou abertos em outro celular/tablet) e este roteiro impresso para marcar os ✅.

## Preparação (na véspera)

1. **App publicado com HTTPS.** Pode ser a Vercel (veja o README) ou `npm run dev:https` na rede local.
2. **Zerar a corrida.** Em `/largada` → **Reiniciar** → digitar `REINICIAR`. Isso apaga as chegadas e mantém os atletas. Para começar também sem atletas, rode no SQL Editor:
   ```sql
   delete from athletes where race_id = (select id from races order by created_at desc limit 1);
   ```
3. **Cadastrar os atletas.** Em `/atletas` → **Importar CSV** → `exemplos/atletas-exemplo.csv`. A prévia deve mostrar "20 válidos".
4. **Números de peito.** Clique em **Gerar números de peito (PDF)** e imprima, ou deixe o PDF aberto num tablet.
5. **Celulares A e B.** Abra o app **com internet**, instale-o (**Adicionar à tela inicial**) e abra `/chegada` uma vez. Isso guarda telas, atletas e relógio para funcionar offline.
   - Celular A: deixe em **Teclado**.
   - Celular B: deixe em **Câmera (QR)** e permita o uso da câmera.

| ✅ | Verificação da preparação |
| -- | ------------------------- |
| ☐ | `/atletas` mostra "20 atletas cadastrados" |
| ☐ | Um QR Code do PDF lido pela câmera do celular (fora do app) mostra só o número |
| ☐ | Nos dois celulares, a barra do topo de `/chegada` mostra **● Online** e o rodapé não mostra erro de relógio |

## Cronograma

Os tempos são aproximados: o importante é a **ordem** das ondas. "Simultâneo" significa os atletas cruzarem a linha com menos de 2 segundos de diferença.

### Largada

| ✅ | Passo | Resultado esperado |
| -- | ----- | ------------------ |
| ☐ | Coordenador: `/largada` → **DAR LARGADA** → **SIM, LARGAR** | Cronômetro começa. A tela mostra "Largada às HH:MM:SS (horário do servidor)" |
| ☐ | Conferir o cronômetro nos celulares A e B e no telão | Todos marcam o mesmo tempo (diferença de até 1 s) |
| ☐ | Coordenador toca **DAR LARGADA** de novo em outro aparelho | Não aparece o botão, porque a corrida já largou. O horário não muda |

### Onda 1 — chegada isolada (≈ 1 min)

| ✅ | Passo | Resultado esperado |
| -- | ----- | ------------------ |
| ☐ | Nº **4** chega. Celular A: **CHEGOU**, digita `4`, **OK** | Confirmação verde: "4 Diego Alves", tempo e ritmo. O celular vibra (menos no iPhone) |
| ☐ | Olhar o telão | Diego aparece em 1º, destacado em amarelo por ~20 s |

### Onda 2 — 3 simultâneos no teclado (≈ 2 min)

| ✅ | Passo | Resultado esperado |
| -- | ----- | ------------------ |
| ☐ | Nº **8**, **2** e **3** chegam juntos. Celular A toca **CHEGOU** 3 vezes, uma para cada um que cruza a linha | Barra laranja: "3 chegadas aguardando número" |
| ☐ | Celular A digita `8` OK, `2` OK, `3` OK, **na ordem em que cruzaram** | Cada número vai para a pendente mais antiga. A barra laranja some |
| ☐ | Conferir em `/resultados` | Ordem 4, 8, 2, 3, com tempos diferentes entre si |

### Onda 3 — 2 simultâneos na câmera (≈ 3 min)

| ✅ | Passo | Resultado esperado |
| -- | ----- | ------------------ |
| ☐ | Nº **5** e **10** chegam juntos. Celular B toca **CHEGOU** 2 vezes e aponta a câmera para o peito do 5 e depois do 10 | Confirmação verde para cada um |
| ☐ | Deixar o QR do 10 parado na frente da câmera por 10 s | Só aparece o aviso neutro (preto) "Nº 10 já registrado". **Não** aparece erro vermelho |

### Onda 4 — celular A sem internet (≈ 4–6 min)

| ✅ | Passo | Resultado esperado |
| -- | ----- | ------------------ |
| ☐ | Celular A: ativar o **modo avião** | Barra do topo **vermelha**: "Offline" |
| ☐ | Nº **7**, **12**, **9** e **1** chegam em sequência. Celular A registra cada um (CHEGOU + número) | Confirmações normais. Barra: "Offline · 4 pendentes de envio" |
| ☐ | Celular A digita `7` de novo | Erro vermelho: "Nº 7 já chegou". Nada é duplicado |
| ☐ | Celular A digita `77` | Erro: "Número 77 não cadastrado" (reconhecido mesmo offline) |
| ☐ | Nº **18** chega. **Os dois celulares** registram o 18: A (offline) e B (online) | B confirma normalmente. A também confirma, porque ainda não sabe do B |
| ☐ | Celular A: **fechar o app** (tirar da lista de apps abertos) e abrir de novo, ainda em modo avião | O app abre sem internet e mostra "5 pendentes de envio" |
| ☐ | `/resultados` no computador | O 18 aparece (do B). 7, 12, 9 e 1 ainda **não** aparecem |

### Onda 5 — internet volta (≈ 7 min)

| ✅ | Passo | Resultado esperado |
| -- | ----- | ------------------ |
| ☐ | Celular A: desativar o modo avião | Barra amarela "Enviando…" e, em poucos segundos, **● Online** |
| ☐ | Celular A mostra o aviso de conflito | "Atleta já tinha chegada registrada em outro aparelho. Esta chegada ficou sem número." |
| ☐ | `/resultados` | 7, 12, 9 e 1 aparecem com os tempos de quando **cruzaram a linha**, não de quando a internet voltou. O quadro laranja mostra 1 chegada sem atleta (a do 18 no celular A) |
| ☐ | Coordenador exclui essa chegada sem número (✕) | O quadro laranja some |

### Onda 6 — chegada sem número (≈ 8 min)

| ✅ | Passo | Resultado esperado |
| -- | ----- | ------------------ |
| ☐ | Nº **15** chega sem o número visível. Celular A toca **CHEGOU** e **não** digita nada | Barra laranja: "1 chegada aguardando número" |
| ☐ | Coordenador, em `/resultados`, digita `15` no quadro laranja → **Associar** | Olívia Barros entra na classificação com o tempo do CHEGOU |
| ☐ | Celular A | A pendente some sozinha (tempo real) |

### Onda 7 — número digitado errado (≈ 9 min)

| ✅ | Passo | Resultado esperado |
| -- | ----- | ------------------ |
| ☐ | Nº **6** chega. Celular A: CHEGOU e digita `16` por engano | Confirmação: "16 Paulo Cardoso" (errado) |
| ☐ | Celular A: em Últimas chegadas, **Corrigir** na linha do Paulo e digitar `6` | A linha passa a "6 Felipe Costa", com o mesmo tempo |

### Onda 8 — 4 simultâneos nos dois celulares (≈ 10 min)

| ✅ | Passo | Resultado esperado |
| -- | ----- | ------------------ |
| ☐ | Nº **11**, **13**, **14** e **16** chegam juntos. A registra 11 e 13 (teclado). B registra 14 e 16 (câmera) | Todos confirmados. O 16 **não** dá "já chegou", porque a chegada errada da onda 7 foi corrigida |

### Onda 9 — últimos (≈ 11–12 min)

| ✅ | Passo | Resultado esperado |
| -- | ----- | ------------------ |
| ☐ | Nº **17**, **19** e **20** chegam. Celular B registra pela câmera | Confirmações verdes |
| ☐ | Coordenador: `/largada` → **Encerrar** → **Encerrar corrida** | Aparece "Corrida encerrada · chegadas bloqueadas" |
| ☐ | Olhar os celulares A e B | O botão CHEGOU some sozinho e aparece "Corrida encerrada" |
| ☐ | Celular A: em Últimas chegadas, **Corrigir** numa chegada qualquer e cancelar | O teclado só aparece para corrigir ou identificar. Não há como registrar chegada nova |

## Conferência final

| ✅ | Onde | Resultado esperado |
| -- | ---- | ------------------ |
| ☐ | `/largada` | "20/20 atletas chegaram" e "0 chegadas sem número" |
| ☐ | `/resultados` → Classificação | 20 classificados, sem quadro laranja, ordem coerente com o cronograma |
| ☐ | Filtros Masculino e Feminino | Posições recalculadas, com a posição geral embaixo |
| ☐ | Aba Premiação | Dois pódios: geral masculino (1º a 3º) e geral feminino (1º a 5º) |
| ☐ | **Exportar CSV** e abrir no Excel | 21 linhas (cabeçalho + 20), acentos corretos, colunas separadas |
| ☐ | Telão em **Alternar** | Troca entre classificação e premiação a cada 40 s, e rola sozinho |

Conferência no banco (SQL Editor). Todas as linhas devem dar o valor indicado:

```sql
-- 20 chegadas, todas identificadas
select count(*) as chegadas, count(athlete_id) as identificadas
  from finishes where race_id = (select id from races order by created_at desc limit 1);
-- esperado: 20 | 20

-- nenhum atleta com duas chegadas
select athlete_id, count(*) from finishes
 where athlete_id is not null group by athlete_id having count(*) > 1;
-- esperado: nenhuma linha

-- nenhuma chegada antes da largada
select count(*) from finishes f join races r on r.id = f.race_id
 where f.finish_time < r.start_time;
-- esperado: 0

-- chegadas por aparelho (deve haver dois device_id)
select device_id, count(*) from finishes group by device_id;
```

## Critérios de aprovação

O ensaio passa se:

- todas as linhas marcadas acima deram o resultado esperado;
- nenhuma chegada se perdeu no período offline;
- nenhum atleta ficou com duas chegadas;
- os tempos das chegadas offline correspondem ao momento em que os atletas cruzaram a linha.

Se algo falhar, anote a onda, o aparelho, a hora e o que apareceu na tela. Se der, tire um print.

## Depois do ensaio

Em `/largada` → **Reiniciar** (digite `REINICIAR`). As chegadas são apagadas e os atletas continuam cadastrados para o dia da prova.
