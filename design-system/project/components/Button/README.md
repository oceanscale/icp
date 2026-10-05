# Button

Botão com cara de tecla de máquina de escrever; `primary` (tinta azul) no máximo uma vez por tela, para a ação que a tela existe para fazer.

- `variant`: `primary` (padrão), `confirm` (verde, para concluir uma pasta ou aprovar), `quiet` (papel com borda `line-strong`, para tudo o mais).
- `size`: `sm` para ações dentro de cartões ("Copiar copy").
- Aceita qualquer atributo de `<button>`; `type` padrão é `button`.
- Rótulo começa com verbo e diz o resultado: "Gerar retrato falado", "Baixar playbook (.pdf)". Nunca "OK".
- Não use `confirm` para ações destrutivas; não há variante de perigo de propósito: exclusão pede confirmação em texto.
