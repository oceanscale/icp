# Field

Campo de formulário datilografado: rótulo em caixa alta, linha de base `line-strong` e, em `multiline`, folha pautada.

- `label`, `hint`, `error` (substitui o hint, pinta a linha e o texto de `danger`), `multiline` (vira `textarea`).
- Demais props vão para o `input` ou `textarea` (`value`, `onChange`, `placeholder`, `rows`, `type`...).
- `id` é gerado do rótulo; passe um próprio se houver rótulos repetidos.
- O rótulo é a pergunta do método ("Gatilho de compra"); o `hint` explica como responder ("Por que decidiu resolver agora?").
