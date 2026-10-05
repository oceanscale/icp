Dossiê ICP é o sistema visual de um app de estruturação comercial com cara de jogo de tabuleiro de detetive. Cada empresa atendida no treinamento vira um **caso**; cada etapa do trabalho (ICP, playbook, roteiros, ads, funil, automações, simulador) é uma **pasta** numerada do dossiê; o cliente ideal ganha um **retrato falado**. Não é um CRM: é uma mesa de investigação onde o consultor monta, pasta por pasta, o processo comercial do cliente.

## O jogo, em uma tabela

| No app | Na mesa do detetive | Componente |
| --- | --- | --- |
| Empresa atendida | Caso Nº 014 | `CaseFile` |
| Etapas (ICP, Playbook, Ads...) | Pastas 01 a 07 | `FolderTabs` |
| ICP e buyer persona | Retrato falado + ficha | `IcpFile`, `Polaroid` |
| Itens do playbook | Pistas a coletar | `Checklist` |
| Progresso do caso | Casas do tabuleiro | `ClueTrack` |
| Status de uma pasta | Carimbo | `Stamp` |
| Etapas do funil (Kanban) | Gavetas de fichas | `FunnelColumn`, `LeadCard` |
| Sugestão semanal de criativo | Pauta da semana | `CreativeCard` |
| Dica, alerta do consultor | Bilhete fixado | `Note` |
| Simulador de disparo WhatsApp | Livro-caixa | `Readout` |

Uma metáfora por tela, e nunca em cima do dado: os campos usam os termos reais do método ("Segmento e porte", "Dor principal", "Gatilho de compra", "Ciclo de decisão", SPIN, A.R.A.). O jogo está na moldura, o trabalho está no conteúdo.

## Voz e texto

- Português do Brasil, tratando por "você". Frases curtas, sem exclamação, sem emoji.
- Botões começam com verbo e dizem o resultado: "Gerar retrato falado", "Baixar playbook (.pdf)", "Pedir pautas da semana". Nunca "OK" ou "Enviar".
- Caixa alta só em três lugares: estilo `label` (rótulos de campo, contadores), estilo `stamp` (carimbos) e códigos de pasta ("01", "E3"). Títulos em caixa normal.
- Números como num relatório: "Caso Nº 014", "05 OUT 2026", "R$ 0,35", "03/06 pistas". Contadores sempre com dois dígitos.
- Vocabulário de detetive dosado: "caso", "pasta", "pista", "retrato falado", "carimbo". Evite "suspeito", "crime", "culpado": o cliente é o alvo do trabalho, não um réu.
- Estado vazio e carregamento falam em investigação: "Retrato em revelação", "Nenhuma pista nesta pasta ainda".

## Cor

- A página é `paper`; fichas, campos e o painel da pasta aberta são `paper-raised`; quadros e mural (colunas do funil, área de fichas soltas) ficam em `paper-deep`, a mesa.
- `ink` para todo texto principal, `ink-muted` para metadados e rótulos. Os dois passam 4.5:1 em todos os papéis e fundos -soft, nos dois temas.
- `blue` é a tinta de ação: botão primário (uma vez por tela), aba ativa, códigos de pasta, links, peão do tabuleiro, anel de foco. Texto sobre preenchimento azul é `on-blue`, nunca branco literal.
- `green` é o carimbo de concluído: pasta resolvida, item marcado, conversão, casas vencidas. Texto sobre ele é `on-green`.
- `danger` é pequeno e sempre acompanhado de palavra: "Acima do orçamento", "Atrasado · 6d", "Urgente".
- `blue` e `green` têm luminância parecida: nunca diferencie estados só pela cor. Concluído leva check ou carimbo escrito; atual leva peão ou negrito.
- `line` é decorativa (pauta, divisórias, contorno de ficha). Borda de controle é `line-strong` (3:1 ou mais).
- `note` é só para `Note`; `frame`, `on-frame` e `tape` são só da `Polaroid`.
- Dois temas: **Papel** (padrão, claro) e **Noturno** (mesa à noite, tinta clara sobre azul-marinho). Todos os pares de texto foram verificados nos dois.

## Tipografia

- `display-xl`, `display`, `title` e `stamp` usam Special Elite (fonte de máquina de escrever gasta). Só títulos, carimbos e códigos. Nunca em parágrafo, campo ou tabela.
- Todo o resto usa Courier Prime: `heading` para nomes e títulos de cartão, `body` para texto e valores, `body-sm` para metadados, `label` para rótulos em caixa alta, `figure` para os números do simulador (algarismos tabulares).
- `hand` e `hand-sm` usam Caveat, a letra do detetive: só em `Note` e na legenda da `Polaroid`, no máximo dois trechos por tela.
- As três famílias vêm do Google Fonts: `family=Caveat:wght@400..700&family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=Special+Elite`. `components/bundle.css` já importa.

## Papel, espaço e forma

- O `body` leva um grão de papel (ruído SVG abaixo de 8% de opacidade) definido em `components/bundle.css`. Não adicione manchas, queimados ou texturas fotográficas: o papel é velho, não sujo.
- Espaço em base 4px: `space-3` entre cartões de uma coluna, `space-5` de padding em fichas e painéis (também a altura de uma linha de `body`), `space-6` entre blocos, `space-7` entre seções.
- Quase tudo é quadrado: `radius-paper` (2px) em fichas, campos, botões e carimbos. `radius-tab` só no topo das abas de pasta. `radius-pin` só em alfinetes, peão e clipe.
- Sombras são de papel: `shadow-paper` para o que está pousado na mesa, `shadow-pinned` para o que está fixado (sempre junto de uma inclinação `tilt-note` ou `tilt-photo`), `shadow-key` na base dos botões preenchidos.
- Inclinação é fixa e rara: `tilt-stamp` nos carimbos, `tilt-note` nos bilhetes, `tilt-photo` na Polaroid. Nada mais gira. Nunca gire texto de trabalho.
- Foco de teclado é `focus-ring`: 2px da cor do papel e 2px de `blue` sólido, por box-shadow para acompanhar o raio.

## Estados e movimento

- Concluído: preenchimento `green` ou fundo `green-soft`, check desenhado e texto riscado em `ink-muted`. Atual: `blue-soft` com borda `blue` e peão. Bloqueado: borda tracejada `line-strong`.
- Movimento é curto e mecânico: botão desce 1px no clique (`shadow-key` some); carimbo pode entrar com um "baque" de 140ms (escala 1.15 para 1). Sem efeito de digitação em textos longos. Respeite `prefers-reduced-motion`.

## Imagens

- O retrato falado do ICP é uma foto gerada por IA dentro da `Polaroid`, que aplica um leve dessaturado e sépia por CSS. Peça imagens em estilo fotográfico, luz natural, fundo de consultório ou escritório coerente com o segmento, enquadramento de peito para cima, sem texto na imagem.
- Toda imagem tem `alt` descrevendo a pessoa e o contexto ("Dentista de 41 anos em consultório, de jaleco, sorrindo"). Enquanto a imagem não chega, a Polaroid mostra "Retrato em revelação".

## Iconografia

- O sistema não traz um conjunto de ícones próprio. Os únicos desenhos embutidos são o check (Checklist, FolderTabs, ClueTrack), o alfinete, o clipe e a fita, todos feitos em SVG ou CSS dentro dos componentes.
- Quando precisar de ícone, use Phosphor Icons (licença MIT), peso Regular, 20px, cor `ink` ou `blue`. Esta é uma recomendação, não um asset do sistema.
- Sem emoji na interface, mesmo onde o material de origem usa.

## Usando o sistema

Os componentes estão em `components/bundle.js` como `window.Dossie` e esperam React 18 na página. Os estilos estão em `components/bundle.css` com prefixo `dq-`. Monte cada pasta assim: `FolderTabs` no topo, dentro dela uma `CaseFile` ou `IcpFile`, o progresso do caso em `ClueTrack` acima das pastas, e o conteúdo de trabalho (Checklist, colunas do funil, CreativeCard, Readout) sobre `paper-raised` ou, no caso de quadros, sobre a mesa `paper-deep`.
