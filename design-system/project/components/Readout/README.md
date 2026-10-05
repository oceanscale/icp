# Readout

Número do simulador em estilo livro-caixa: rótulo, valor grande em algarismos tabulares, linha dupla e observação.

- `label`, `value` (já formatado: "R$ 0,35", "1.200"), `unit`, `hint`.
- `tone`: `blue` (entrada do usuário), `green` (resultado dentro da meta), `danger` (acima do orçamento) ou neutro.
- `flag`: carimbo reto abaixo do valor ("Acima do orçamento"); obrigatório quando `tone` é `danger`, para o estado não depender só da cor.
- O cálculo (custo por disparo da API oficial do WhatsApp × disparos × leads) é do app; o Readout só exibe.
