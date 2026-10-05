# Checklist

Lista de pistas do playbook com caixa datilografada, barra de progresso e contador "03/06 pistas".

- `items`: `[{ id, label, hint?, done }]`; `onToggle(id, done)`: componente controlado.
- `title`: nome do bloco ("Playbook · Prospecção").
- Item concluído fica riscado em `ink-muted` com traço `green`. Clique na caixa ou no texto alterna.
- Cada item é uma tarefa verificável escrita como entrega ("Roteiro de ligação com as 5 partes"), não como tema ("Roteiros").
- O download do playbook é um `Button` quiet fora do Checklist.
