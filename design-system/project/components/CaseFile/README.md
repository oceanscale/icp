# CaseFile

A ficha base de papel: número do caso, título, subtítulo e um espaço à direita para carimbo.

- `caseNo` ("Caso Nº 014 · aberto em 05 OUT 2026"), `title` (nome da empresa), `subtitle` (segmento, cidade, consultor).
- `aside`: normalmente um `Stamp` com o status do caso.
- `clip`: desenha um clipe no topo; use só na ficha principal da tela.
- `children`: o corpo da ficha.
- Fica sobre `paper` ou `paper-deep`; não aninhe uma CaseFile dentro de outra.
