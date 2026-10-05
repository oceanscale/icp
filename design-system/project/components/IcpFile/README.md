# IcpFile

A ficha do cliente ideal: retrato falado à esquerda, nome do perfil, resumo em uma frase e as pistas do ICP em grade.

- `name`: o perfil ("Clínica odontológica de bairro"); `summary`: o ICP documentado em uma frase (itálico).
- `fields`: `[{ label, value }]` com os campos do playbook: Segmento e porte, Dor principal, Gatilho de compra, Ciclo de decisão, Decisor, Objeções, Ticket e recorrência.
- `photo`, `photoAlt`, `caption`, `pendingLabel`: repassados à `Polaroid`.
- `kicker`: rótulo acima do nome (padrão "Retrato falado · ICP principal"; use "ICP secundário" ou "Buyer persona" quando for o caso).
- `stamp`: `{ text, tone }`, ao lado do rótulo.
- `children`: ações no rodapé da ficha (por exemplo `Button` "Gerar novo retrato").
