# FolderTabs

As pastas numeradas do dossiê: abas de arquivo que trocam o conteúdo do painel abaixo.

- `tabs`: `[{ id, label, code?, done?, locked? }]`. `code` é o número da pasta ("01"); `done` mostra o check verde e o texto "resolvida" para leitores de tela; `locked` deixa a aba tracejada (continua clicável para mostrar o que falta para abrir).
- `active` e `onChange(id)`: componente controlado. As setas, Home e End trocam de pasta.
- `children`: o conteúdo da pasta ativa, renderizado no painel `paper-raised`.
- `label`: rótulo acessível do tablist (padrão "Pastas do dossiê"); `idBase` se houver mais de um na página.
- `arrows`: mostra os botões ‹ › no fim da fileira para ir à pasta anterior e à próxima (o app usa no caso).
- Quando as abas não cabem na largura, o componente entra sozinho no modo compacto: só a aba aberta mostra o nome, as outras ficam com o código e o nome no `title`. A aba aberta sempre rola para dentro da faixa.
- Ordem do app: 01 Empresa, 02 ICP, 03 Playbook, 04 Roteiros, 05 Jornada, 06 Funil, 07 Anúncios, 08 Automações, 09 Simulador e a aba bônus. No fim de cada pasta o app repete a navegação com "Pasta anterior" e "Próxima pasta".
