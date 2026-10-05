# FunnelColumn

Uma etapa do funil no quadro Kanban: código, nome, contagem e taxa de conversão, com as fichas de lead abaixo.

- `code` ("E3"), `name` ("Diagnóstico SPIN"), `count`, `rate` ("52%", conversão para a etapa seguinte).
- `children`: `LeadCard`s.
- Fica sobre a mesa: o contêiner do quadro usa `paper-deep` ou a classe `dq-desk`, com colunas em linha e rolagem horizontal.
- Largura fixa de 272px para o quadro alinhar; não estique colunas.
