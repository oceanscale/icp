# Checklist

Lista de itens com caixa datilografada, barra de progresso e contador "03/06 itens": o playbook e as missões de cada pasta.

- `items`: `[{ id, label, hint?, done, auto?, disabled?, meta? }]`; `onToggle(id, done)`: componente controlado. `auto` trava a caixa (o sistema marca quando a entrega existe); `meta` mostra quem marcou e o XP ("Ana · +5 XP").
- `unit`: a palavra do contador (padrão "itens"; nas missões, "feitas").
- `title`: nome do bloco ("Playbook · Prospecção").
- Item concluído fica riscado em `ink-muted` com traço `green`. Clique na caixa ou no texto alterna.
- Cada item é uma tarefa verificável escrita como entrega ("Roteiro de ligação com as 5 partes"), não como tema ("Roteiros").
- O download do playbook é um `Button` quiet fora do Checklist.
