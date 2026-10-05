Dossiê ICP é o sistema visual de um app de estruturação comercial com mecânica de jogo de tabuleiro e moldura de arquivo. Cada empresa atendida no treinamento vira um **caso**; cada etapa do trabalho é uma **pasta** numerada (01 Empresa, 02 ICP, 03 Playbook, 04 Roteiros, 05 Funil, 06 Ads, 07 Automações, 08 Simulador), montada para cada linha de produto; cada missão cumprida vale XP e sobe o nível de maturidade comercial do caso. Não é um CRM: é a mesa onde o consultor e o time do cliente montam, pasta por pasta, o processo comercial.

## Mecânica e moldura

O jogo está na **mecânica** (tabuleiro, pasta que abre a próxima, missão, XP, nível, carimbo de resolvida) e não numa fantasia. A moldura de arquivo (papel, pastas, carimbo, letra de mão) fica leve e nunca entra no conteúdo de trabalho nem nos documentos exportados.

| No app | Na mesa | Componente |
| --- | --- | --- |
| Empresa atendida | Caso Nº 014 | `CaseFile` |
| Etapas, por linha de produto | Pastas 01 a 08 | `FolderTabs` |
| ICP e buyer persona | Ficha com o retrato do decisor | `IcpFile`, `Polaroid` |
| Itens do playbook e missões | Checklist com XP | `Checklist` |
| Progresso e nível | Tabuleiro com barra de XP | `ClueTrack` |
| Status de uma pasta ou do caso | Carimbo | `Stamp` |
| Etapas do funil (Kanban) | Colunas com fichas | `FunnelColumn`, `LeadCard` |
| Sugestão semanal de criativo | Pauta da semana | `CreativeCard` |
| Observação do consultor | Bilhete fixado | `Note` |
| Simulador de disparo WhatsApp | Livro-caixa | `Readout` |

Níveis de maturidade comercial, em ordem: Improviso, Estruturando, Processo definido, Previsível, Escalável.

## Voz e texto

- Português do Brasil, tratando por "você". Frases curtas, sem exclamação, sem emoji, sem travessão.
- Botões começam com verbo e dizem o resultado: "Gerar ICP", "Baixar PDF", "Pedir pautas da semana", "Revelar retrato do decisor". Nunca "OK" ou "Enviar".
- Os campos usam os termos do método, nunca metáfora: "Segmento e porte", "Dor principal", "Gatilho de compra", "Ciclo de decisão", SPIN, A.R.A.
- Vocabulário permitido: caso, pasta, missão, item, nível, carimbo, mesa, arquivo. Proibido sobre clientes ou pessoas: suspeito, alvo, interrogatório, investigar, retrato falado.
- Caixa alta só no estilo `label`, no estilo `stamp` e nos códigos de pasta ("01", "E3"). Títulos em caixa normal.
- Números como num relatório: "Caso Nº 014", "05 OUT 2026", "R$ 0,35", "03/06 itens", "180 / 300 XP".
- Estado vazio e espera falam de arquivo: "Retrato em revelação", "Abrindo o arquivo...", "Datilografando a ficha...".

## Cor

- A página é `paper`; fichas, campos e o painel da pasta aberta são `paper-raised`; quadros (colunas do funil) e o fundo da entrada ficam em `paper-deep`, a mesa.
- `ink` para todo texto principal, `ink-muted` para metadados e rótulos. Os dois passam 4.5:1 em todos os papéis e fundos -soft, nos dois temas.
- `blue` é a tinta de ação: botão primário (uma vez por tela), aba ativa, pasta aberta, peão, barra de XP, links, anel de foco. Texto sobre preenchimento azul é `on-blue`, nunca branco literal.
- `green` é o carimbo de resolvido: pasta resolvida, missão feita, conversão, ranking. Texto sobre ele é `on-green`.
- `danger` é pequeno e sempre com palavra: "Acima do orçamento", "Atrasado · 6d", "Hipótese", "Confidencial".
- `blue` e `green` têm luminância parecida: nunca diferencie estados só pela cor. Resolvido leva check; aberto leva borda sólida; trancado leva borda tracejada; a pasta atual leva o peão.
- `line` é decorativa (pauta, divisórias, contorno de ficha). Borda de controle é `line-strong` (3:1 ou mais).
- `note` é só do `Note`; `frame`, `on-frame` e `tape` são só da `Polaroid`.
- Dois temas: **Papel** (padrão, claro) e **Noturno** (tinta clara sobre azul-marinho). Todos os pares de texto foram verificados nos dois.

## Tipografia

- `display-xl`, `display`, `title` e `stamp` usam Special Elite (máquina de escrever gasta): nome do produto, títulos de pasta e ficha, carimbos e códigos. Nunca em parágrafo, campo ou tabela.
- `heading`, `body` e `body-sm` usam IBM Plex Sans: todo texto de leitura e de trabalho (roteiros, copies, campos, cartões). É a fonte do conteúdo que o time lê e copia.
- `label` e `figure` usam Courier Prime: rótulos em caixa alta, contadores, XP e os números do simulador (algarismos tabulares).
- `hand` e `hand-sm` usam Caveat: só em `Note` e na legenda da `Polaroid`, no máximo dois trechos por tela.
- As quatro famílias vêm do Google Fonts; `components/bundle.css` já importa.

## Papel, espaço e forma

- O `body` leva um grão de papel (ruído SVG abaixo de 8% de opacidade) definido em `components/bundle.css`. Sem manchas nem texturas fotográficas.
- Espaço em base 4px: `space-3` entre cartões de uma coluna, `space-5` de padding em fichas e painéis, `space-6` entre blocos, `space-7` entre seções.
- Quase tudo é quadrado: `radius-paper` (2px) em fichas, campos, botões e carimbos. `radius-tab` só no topo das abas. `radius-pin` só em alfinetes, peão, clipe e barras de progresso.
- Sombras de papel: `shadow-paper` para o que está pousado, `shadow-pinned` para o que está fixado (sempre com `tilt-note` ou `tilt-photo`), `shadow-key` na base dos botões preenchidos.
- Inclinação fixa e rara: `tilt-stamp`, `tilt-note`, `tilt-photo`. Nunca gire texto de trabalho.
- Foco de teclado é `focus-ring`: 2px da cor do papel e 2px de `blue` sólido.

## Estados e movimento

- Resolvido: preenchimento `green` ou fundo `green-soft`, check desenhado e texto riscado em `ink-muted`. Aberto: `blue-soft` com borda `blue`. Trancado: borda tracejada `line-strong`. Atual: peão `blue`.
- Comemoração: ao resolver uma pasta ou subir de nível, um carimbo grande entra com um "baque" de 420ms e some sozinho.
- Movimento curto e mecânico: botão desce 1px no clique; na entrada, o nome é datilografado letra a letra e o peão anda pelo tabuleiro. Respeite `prefers-reduced-motion` mostrando o estado final.

## Documentos exportados

PDF, Markdown e CSV saem neutros: fundo branco, IBM Plex Sans, títulos em azul, sem textura, carimbo ou fonte de máquina de escrever. O CEO do cliente lê um processo, não um jogo.

## Imagens

- O retrato do decisor é uma foto gerada por IA dentro da `Polaroid`, que aplica leve dessaturação por CSS. Peça estilo fotográfico, luz natural, ambiente coerente com o segmento, enquadramento da cintura para cima, sem texto na imagem.
- Toda imagem tem `alt` descrevendo a pessoa e o contexto. Enquanto a imagem não chega, a Polaroid mostra "Retrato em revelação".

## Iconografia

- O sistema não traz um conjunto de ícones. Os únicos desenhos embutidos são o check, o alfinete, o clipe e a fita, feitos em SVG ou CSS dentro dos componentes.
- Quando precisar de ícone, use Phosphor Icons (licença MIT), peso Regular, 20px, cor `ink` ou `blue`. É recomendação, não asset do sistema.
- Sem emoji na interface.

## Usando o sistema

Os componentes estão em `components/bundle.js` como `window.Dossie` e esperam React 18 na página; os estilos estão em `components/bundle.css` com prefixo `dq-`. No repositório do app, a fonte é `src/ds/index.jsx` e `src/ds/ds.css`, e `npm run build:ds` regenera o bundle. Monte o caso assim: `CaseFile` no topo com o seletor de linha e o `ClueTrack`; abaixo, `FolderTabs` com a pasta aberta; ao lado, as missões da pasta (`Checklist`), o mural do time e o time.
