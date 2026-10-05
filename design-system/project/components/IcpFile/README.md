# IcpFile

A ficha do cliente ideal: retrato do decisor à esquerda, nome do perfil, resumo em uma frase e os campos do ICP em grade.

- `name`: o perfil ("Clínica odontológica de bairro"); `summary`: o ICP documentado em uma frase (itálico).
- `fields`: `[{ label, value }]` com os campos do playbook: Segmento e porte, Dor principal, Gatilho de compra, Ciclo de decisão, Decisor, Objeções, Ticket e recorrência.
- `photo`, `photoAlt`, `caption`, `pendingLabel`: repassados à `Polaroid`.
- `kicker`: rótulo acima do nome (padrão "Perfil do cliente ideal · ICP principal").
- `stamp`: `{ text, tone }`, ao lado do rótulo: "Clientes reais" (green) quando o ICP veio da carteira, "Hipótese" (danger) quando não.
- `children`: ações no rodapé da ficha (por exemplo `Button` "Gerar novo retrato").
