# FolderTabs

As pastas numeradas do dossiê: abas de arquivo que trocam o conteúdo do painel abaixo.

- `tabs`: `[{ id, label, code?, done? }]`. `code` é o número da pasta ("01"); `done` mostra o check verde e um texto "concluída" para leitores de tela.
- `active` e `onChange(id)`: componente controlado. As setas, Home e End trocam de pasta.
- `children`: o conteúdo da pasta ativa, renderizado no painel `paper-raised`.
- `label`: rótulo acessível do tablist (padrão "Pastas do dossiê"); `idBase` se houver mais de um na página.
- Ordem sugerida: 01 ICP, 02 Playbook, 03 Roteiros, 04 Ads, 05 Funil, 06 Automações, 07 Simulador. Não passe de oito pastas; em telas estreitas a fileira rola na horizontal.
