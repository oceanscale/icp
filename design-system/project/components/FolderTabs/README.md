# FolderTabs

As pastas numeradas do dossiê: abas de arquivo que trocam o conteúdo do painel abaixo.

- `tabs`: `[{ id, label, code?, done?, locked? }]`. `code` é o número da pasta ("01"); `done` mostra o check verde e o texto "resolvida" para leitores de tela; `locked` deixa a aba tracejada (continua clicável para mostrar o que falta para abrir).
- `active` e `onChange(id)`: componente controlado. As setas, Home e End trocam de pasta.
- `children`: o conteúdo da pasta ativa, renderizado no painel `paper-raised`.
- `label`: rótulo acessível do tablist (padrão "Pastas do dossiê"); `idBase` se houver mais de um na página.
- Ordem do app: 01 Empresa, 02 ICP, 03 Playbook, 04 Roteiros, 05 Funil, 06 Ads, 07 Automações, 08 Simulador. Não passe de oito pastas; em telas estreitas a fileira rola na horizontal.
