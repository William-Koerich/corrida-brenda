# Linha de Chegada

Aplicação web (PWA, mobile-first) para cronometrar corridas de rua, com classificação ao vivo e premiação geral masculina e feminina.

"Linha de Chegada" é um nome provisório. Para renomear o produto inteiro (cabeçalho, telão, manifesto do PWA, título das páginas), edite `lib/brand.ts`.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres + Realtime)

## Telas

| Rota          | Uso                                                     |
| ------------- | ------------------------------------------------------- |
| `/atletas`    | Cadastro, importação CSV e PDF com números de peito     |
| `/largada`    | Dá a largada com o horário do servidor                  |
| `/chegada`    | Registro de chegadas no celular (botão CHEGOU, QR Code) |
| `/resultados` | Classificação em tempo real, premiação e exportação CSV |
| `/telao`      | Modo telão para TV: fonte grande e rolagem automática   |
| `/meu-resultado` | Área pública dos corredores: busca, resultado e compartilhamento |

## 1. Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Aplique as migrações de `supabase/migrations/`, em ordem de nome, de uma destas formas:
   - **SQL Editor** do painel: cole o conteúdo do arquivo e execute; ou
   - **psql** (Project Settings → Database → Connection string):
     ```bash
     for f in supabase/migrations/*.sql supabase/seed.sql; do
       psql "postgresql://postgres:SENHA@db.SEU-PROJETO.supabase.co:5432/postgres" -v ON_ERROR_STOP=1 -f "$f"
     done
     ```
     Se a senha tiver caracteres especiais (`@`, `#`, `/`…), codifique-os na URL (`@` → `%40`) ou use a variável `PGPASSWORD`.

     A conexão direta (`db.<projeto>.supabase.co`) só funciona em redes IPv6. Se der erro de conexão, use o **Session pooler** do botão **Connect** do painel. Ele muda o host e o usuário:
     ```bash
     PGPASSWORD='SENHA' psql "host=aws-0-<regiao>.pooler.supabase.com port=5432 dbname=postgres user=postgres.<id-do-projeto> sslmode=require" ...
     ```
     Esses dados do banco servem só para aplicar a migração. O app usa apenas a URL e a chave publishable (passo 2).
   - **Supabase CLI:** `supabase link` e depois `supabase db push`.
3. (Opcional) Rode `supabase/seed.sql` para criar a corrida “Corrida 3 km”.

A migração cria:

- Tabelas `races`, `athletes` e `finishes`.
- Número de peito único por corrida e **no máximo uma chegada por atleta**. Também torna `client_id` único, para a sincronização offline não duplicar chegadas.
- RPCs:
  - `server_now()`: relógio do servidor, usado para calcular o offset do celular.
  - `start_race(id)`: grava `start_time = now()` do servidor.
  - `finish_race(id)`: encerra a corrida.
- Realtime habilitado em `races`, `finishes` e `athletes`.
- RLS ativado com políticas abertas (sem login por enquanto).

## 2. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha com os valores de **Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # ou a chave "anon" (legada)
```

Nunca coloque a senha do banco nem a chave `service_role` nessas variáveis: tudo que começa com `NEXT_PUBLIC_` vai para o navegador.

`DATABASE_URL` (opcional) serve só para acessar o banco pelo terminal:

```bash
npm run db                                         # abre o psql
npm run db -- -f supabase/migrations/<arquivo>.sql # aplica uma migração
```

## 3. Rodar

```bash
npm install
npm run dev
```

Abra http://localhost:3000. A página inicial mostra se a conexão com o Supabase funcionou e qual é a corrida atual.

### No celular (mesma rede Wi-Fi)

A câmera só funciona em HTTPS (o navegador bloqueia em `http://` fora do `localhost`). Rode:

```bash
npm run dev:https
```

e abra no celular `https://<IP-do-computador>:3000`, com o IP que o Next mostra em "Network" (ex.: `https://192.168.1.30:3000`).

- O certificado é de desenvolvimento, então o navegador mostra um aviso. Toque em **Avançado → Continuar** (Chrome) ou **Mostrar detalhes → visitar este site** (Safari).
- Os IPs de rede local já estão liberados em `allowedDevOrigins` no `next.config.ts`.

## Importar atletas por CSV

Em `/atletas` → **Importar CSV**. O arquivo precisa de cabeçalho com as colunas `nome, sexo, numero`, em qualquer ordem. A coluna `idade` é **opcional**: pode faltar no arquivo ou ficar em branco em algumas linhas. O separador pode ser vírgula ou ponto e vírgula (padrão do Excel em português).

- Sexo aceita `M`/`F`, `masculino`/`feminino`, `masc`/`fem`.
- Antes de importar, a tela mostra uma prévia com os erros por linha (número repetido, já cadastrado, idade inválida…). Só as linhas válidas são importadas.

Há um exemplo com 20 atletas em `exemplos/atletas-exemplo.csv`.

## Números de peito (PDF)

O botão **Gerar números de peito (PDF)** cria uma página A5 (paisagem) por atleta, em ordem de número. Cada página tem o número grande, o nome do atleta e um QR Code que contém **apenas o número**.

Como o QR foi pensado para ser lido de longe:

- **50 mm, centralizado embaixo:** longe dos cantos, onde ficam os alfinetes e o papel dobra.
- **Espaço branco livre em volta:** mais de 4 módulos, como pede o padrão QR.
- **Correção de erro máxima (H):** o número é curto, então o código continua com 21×21 módulos e aguenta cerca de 30% de dano (suor, dobra, furo).

Imprima em papel branco fosco: papel brilhante reflete a luz do sol e atrapalha a leitura.

## Largada

Em `/largada`, o botão **DAR LARGADA** pede confirmação e chama a RPC `start_race`. O `start_time` é gravado com o `now()` do **servidor**, nunca com o relógio do aparelho.

- Clicar de novo (ou em outro aparelho) não altera o horário já gravado.
- Depois da largada, a tela mostra o cronômetro e as chegadas em tempo real. O cronômetro usa o relógio do aparelho corrigido pela diferença medida em relação ao servidor.
- **Encerrar** grava o horário de encerramento do servidor (`finished_at`). A partir daí:
  - a tela de chegada esconde o botão CHEGOU em todos os aparelhos;
  - o **banco recusa** chegadas com horário depois do encerramento (trigger `check_finish_window`);
  - um celular que estava offline ainda consegue enviar o que registrou **antes** do encerramento;
  - identificar e corrigir chegadas que já existem continua liberado, para fechar o resultado.
- **Reiniciar** (RPC `reset_race`) apaga todas as chegadas e volta para "aguardando largada", mantendo os atletas. Pede para digitar `REINICIAR` antes de confirmar. Chegadas antigas que ainda estiverem na fila de algum celular são recusadas pelo banco, porque são de antes da nova largada.

## Chegada

A tela `/chegada` foi pensada para o celular, usado com uma mão.

1. **CHEGOU** registra o horário no instante do toque, mesmo sem saber quem é. A chegada entra na fila de pendentes.
2. O número digitado no teclado vai para a **pendente mais antiga deste aparelho**. Pendentes de outros aparelhos não são usadas.
3. Sem pendentes, digitar o número registra a chegada com o horário daquele momento.
4. A confirmação mostra número, nome, tempo e ritmo, e o celular vibra (a vibração não funciona no iPhone).
5. Na lista de últimas chegadas:
   - **Identificar** ou **Corrigir** escolhe a chegada que recebe o próximo número digitado.
   - **✕** exclui a chegada.

Erros tratados:

- Número não cadastrado. Antes de recusar, a tela recarrega a lista de atletas, caso ele tenha sido cadastrado depois.
- Atleta que já chegou: a tela avisa e não duplica. O banco também bloqueia, mesmo entre aparelhos diferentes.
- Relógio sem sincronizar (sem internet ao abrir): usa a última diferença medida neste celular. Se ele nunca sincronizou, a tela avisa e usa o relógio do celular.

Todo `finish_time` é o relógio do celular mais a diferença medida em relação ao servidor. No computador, também dá para usar o teclado físico: dígitos, Backspace e Enter.

### Leitura por QR Code

Na chave **Teclado | Câmera (QR)**, a opção Câmera abre a câmera traseira. Ela lê sem parar, e cada número lido segue as mesmas regras da digitação.

- A leitura usa a **imagem inteira, na resolução real da câmera** (Full HD quando o aparelho permite), com foco contínuo no Android.
- **Leitor nativo do aparelho** (`BarcodeDetector`) no Android e no Chrome; **jsQR** no iPhone. O jsQR vai junto com a tela de chegada, então funciona offline.
- Em testes com a câmera simulada filmando o número de peito impresso, o QR foi lido do peito preenchendo a tela até o peito ocupando 18% da altura da imagem (corredor a uns 2 metros), em menos de meio segundo.

- O mesmo QR é aceito uma vez a cada 4 segundos, para o atleta parado na frente da câmera não gerar várias leituras.
- Se a câmera ler de novo um peito que este celular acabou de registrar, aparece um aviso neutro ("já registrado"), sem alarme.
- QR que não contém só o número mostra "QR Code não reconhecido".
- Erros de câmera têm mensagem própria:
  - permissão negada;
  - nenhuma câmera encontrada;
  - câmera em uso por outro app;
  - página aberta sem HTTPS.
- A escolha entre teclado e câmera fica salva no aparelho.

**Opções da câmera** (botões abaixo do vídeo, salvos no aparelho):

- **Frontal / Traseira:** a frontal aparece espelhada, como um espelho, e a leitura não é afetada.
- **Som ligado / desligado:** cada som indica um resultado diferente.
  - Dois bipes subindo: leitura aceita.
  - Dois toques graves: número não cadastrado, atleta que já chegou ou QR inválido.
  - Um bipe curto: o mesmo peito lido de novo.

  Os sons são gerados no próprio celular e funcionam offline. Navegadores só liberam som depois de um toque na tela; a tela de chegada faz isso no primeiro toque. No iPhone com Safari 17 ou mais novo, o som toca mesmo com a chave do silencioso ligada.
- **Tela cheia:** a câmera ocupa a tela inteira, com a confirmação em tamanho grande (número, nome, tempo e ritmo). Serve para deixar um celular ou tablet **fixo na chegada**, virado para os corredores (com a câmera frontal), para que eles mostrem o próprio número de peito.
  - Nesse modo, a tela **não apaga sozinha**.
  - No Android e no computador, a barra do navegador também some. No iPhone, isso só acontece com o app instalado na tela inicial.
  - Para sair, use o **X** ou a tecla Esc.

## Modo offline

A tela de chegada continua funcionando sem internet.

- **Tudo é salvo primeiro no celular.** Cada ação (CHEGOU, número associado, correção, exclusão) é gravada numa fila no IndexedDB e só depois enviada ao Supabase, em ordem. A fila sobrevive a fechar a aba ou recarregar a página.
- **Indicador** na barra do topo:
  - **Online** (preta): tudo enviado.
  - **Online/Enviando · X pendentes de envio** (amarela).
  - **Offline · X pendentes de envio** (vermelha).
- **Sincronização automática:**
  - quando a internet volta (evento `online`);
  - a cada 10 s enquanto houver pendências (cobre o Wi-Fi conectado mas sem internet);
  - ao abrir a tela.
- **Sem duplicidade:** a chegada é gravada pelo `client_id` com `ON CONFLICT DO NOTHING`. Reenviar depois de uma queda no meio do envio não cria outra linha.
- **Conflito entre aparelhos:** se outro aparelho registrou o mesmo atleta enquanto este estava offline, a chegada deste aparelho é gravada **sem número**, e a tela avisa. Ela aparece na classificação para correção, e nenhum horário se perde.
- **Dados em cache para funcionar sem rede:** a corrida atual, a lista de atletas (os números são reconhecidos offline) e a última diferença medida do relógio (o `finish_time` continua corrigido).

Com o service worker do PWA (build de produção), o app também **abre do zero sem internet**, desde que tenha sido aberto uma vez com internet naquele celular.

## Classificação

A tela `/resultados` atualiza em tempo real. Novas chegadas, números associados e correções de atletas aparecem sozinhos.

- **Classificação:** posição, número, nome, idade, sexo, tempo total (hh:mm:ss) e ritmo (min/km), em ordem de tempo.
  - Filtros: Geral, Masculino e Feminino.
  - Com filtro, a posição é dentro do filtro, e a posição geral aparece embaixo.
- **Premiação:** pódio visual geral masculino (top 3) e geral feminino (top 5).
- **Chegadas sem atleta identificado** aparecem numa seção laranja no topo, onde dá para associar o número ou excluir a chegada.
- **Exportar CSV:** classificação geral completa, com a posição geral e a posição dentro do sexo. Usa separador `;` e UTF-8 com BOM, e abre direto no Excel em português.

Cálculos (funções puras com testes em `lib/*.test.ts`, rode `npm test`):

- tempo_total = `finish_time − start_time`;
- ritmo = tempo_total ÷ distância, exibido como `m:ss /km`;
- empate no tempo é desempatado pelo número de peito.

## Atualização automática

Nenhuma tela precisa ser recarregada. Cada uma se mantém atualizada de dois jeitos:

1. **Tempo real (Supabase Realtime):** o servidor avisa na hora quando algo muda.
2. **Conferência periódica:** a tela também consulta o servidor de tempos em tempos. Isso cobre os avisos perdidos quando a conexão em tempo real cai (TV que apagou, celular bloqueado, Wi-Fi oscilando).

| Tela | Conferência |
|---|---|
| Telão | a cada 3 s |
| Resultados, área dos corredores, chegada | a cada 5 s |
| Atletas (nomes) | a cada 15 s |
| Corrida (largada/encerramento) | a cada 10 s |

- A conferência só acontece com a tela visível, e roda na hora quando ela volta a ficar visível ou a internet volta.
- **Busca só o que mudou** (coluna `updated_at`), não a lista inteira. Sem mudanças, cada consulta tem poucas centenas de bytes, contra dezenas de KB da lista completa. Isso importa com centenas de corredores olhando o resultado no celular, por causa da franquia de tráfego do Supabase. Exclusões são detectadas pela contagem total.
- O indicador **"Ao vivo · atualizado há X s"** aparece em Resultados, no telão e na área dos corredores. Ele fica amarelo se passar de 20 s sem conseguir atualizar e vermelho sem internet.
- Uma falha passageira do servidor não apaga a tela: ela mantém o último resultado bom e tenta de novo.

## Área dos corredores

`/meu-resultado` é a área **pública**, para os corredores. Ela não mostra o menu de gestão (atletas, largada, chegada).

- Em `/resultados`, o botão **Link para corredores** mostra o endereço e um **QR Code**, para copiar, abrir ou baixar e imprimir na área de chegada.
- **Busca** por nome (sem acento, em qualquer ordem) ou por número do peito. A lista mostra todos os inscritos: quem chegou em ordem de classificação, quem ainda não chegou no fim.
- **`/meu-resultado/<número>`**: tempo, ritmo, posição geral e no sexo, e selo de pódio para os premiados. Cada corredor tem um link próprio.
- **Compartilhar:** a imagem do resultado é gerada no próprio celular, em dois formatos:
  - **Story** (1080×1920), para o Instagram;
  - **Quadrado** (1080×1080), para o feed e o Strava.

  O layout segue o padrão dos posts de atividade do Strava:
  - título da corrida;
  - os números em destaque: distância, ritmo e tempo ("13m 21s");
  - a classificação.

  Ele não usa a marca, o logo nem a cor do Strava.
  - **Foto de fundo (opcional):** o corredor pode escolher uma foto, que ocupa a imagem inteira com um escurecimento embaixo para os números ficarem legíveis. A foto é processada só no celular e não é enviada para lugar nenhum. Sem foto, fica o fundo escuro com brilho rosa.
  - **Percurso:** o traçado da prova (`public/percurso-corrida-brenda.png`, PNG com fundo transparente) entra por padrão acima dos números, com ou sem foto. O botão **Tirar percurso da imagem** desliga. Para outra prova, troque o arquivo e o caminho em `ROUTE_IMAGE` (`lib/brand.ts`).

  O botão **Compartilhar** abre o menu do celular (Instagram, Strava, WhatsApp…). Se o aparelho não tiver esse menu, a imagem é baixada.
- **Strava:** o Strava não aceita publicação direta por site sem integração com login da conta. O corredor salva a imagem e adiciona como foto da atividade.
- A página atualiza em tempo real: quem acabou de chegar já encontra o resultado.

## Telão

`/telao` foi feito para uma TV ou projetor. O botão **Modo telão** em `/resultados` também leva até ele.

- Tela inteira, fundo preto e letras proporcionais à largura da tela.
- No topo ficam o cronômetro e as **últimas 3 chegadas**. Quem chegou há menos de 20 s fica destacado em amarelo.
- **Rolagem automática:** pausa de 5 s no topo, desce devagar, pausa de 5 s no fim e volta ao topo.
- Controles discretos no canto inferior direito:
  - visão: Classificação, Premiação ou Alternar (troca a cada 40 s);
  - filtro: Geral, Masculino ou Feminino;
  - Tela cheia e Sair.
- A configuração fica na URL, para deixar a TV pronta. Exemplos: `/telao?view=alternar`, `/telao?view=premiacao&sexo=F`.

## Categorias de premiação

Configuradas em `lib/categories.ts`. O padrão é:

- Geral masculino: top 3. Geral feminino: top 5. Para mudar, edite `PODIUM_SIZE` em `lib/categories.ts`; o pódio visual se ajusta sozinho.

## Visual

- Componentes em `components/ui/`: botão, cartão, selo de status, abas, campos e caixa de confirmação.
- Paleta em `app/globals.css` (`ink`, `canvas`, `brand`…). O destaque rosa (`brand`, tema da corrida) é usado no CHEGOU, no cronômetro, no pódio e no telão. Para trocar a cor do produto, mude só as três variáveis `--color-brand*`.
- O app é sempre claro (`color-scheme: light`), para ficar legível no sol e igual em qualquer celular. O telão é escuro.
- No celular, a navegação fica em abas embaixo. No computador, fica no cabeçalho.
- `/chegada` é modo foco, sem menus. `/telao` é tela inteira.

## PWA e publicação

O app é um PWA instalável:

- `app/manifest.ts`: nome, ícones em `public/icons/`, `display: standalone` e abre direto em `/chegada`.
- `public/sw.js`: service worker, registrado só no build de produção.
  - Pré-carrega as telas na instalação.
  - Arquivos de `/_next/static` vêm do cache primeiro.
  - Páginas vêm da rede primeiro, com a última versão guardada como reserva sem internet.
  - Supabase não passa pelo cache: quem cuida disso é a fila offline.
  - Ao mudar o `sw.js` de forma que exija limpar o cache, aumente o `VERSION`.

Para testar o PWA localmente: `npm run build && npm start` e abra http://localhost:3000. No `npm run dev`, o service worker fica desligado.

**Publicar (recomendado: Vercel)**

A câmera, a instalação e o service worker exigem HTTPS, que a Vercel já fornece.

1. Suba o repositório para o GitHub e importe o projeto em [vercel.com](https://vercel.com).
2. Em **Settings → Environment Variables**, cadastre `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. **Não** cadastre `DATABASE_URL`.
3. Faça o deploy e, no celular, abra o endereço e use **Adicionar à tela inicial**.

**Antes do dia da prova:** abra o app instalado uma vez com internet em cada celular de chegada. É isso que guarda as telas, os atletas e o relógio para funcionar offline.

## Testes

- Unitários (Vitest), cobrindo tempo, ritmo, CSV, classificação, pódios, relógio, QR e fila offline: `npx vitest run`, ou `npm test` para o modo que fica observando os arquivos.
- Ensaio de corrida com 20 atletas, chegadas simultâneas e queda de internet: [docs/roteiro-de-teste.md](docs/roteiro-de-teste.md).

## PIN de administrador (futuro)

Ainda não há autenticação. O ponto de entrada está em `lib/admin.ts`, e as políticas RLS da migração estão comentadas indicando onde restringir a escrita.
