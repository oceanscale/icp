# ClueTrack

O tabuleiro do caso: uma casa por pasta, com as vencidas em verde, a atual com o peão azul e as seguintes tracejadas.

- `steps`: `[{ label, state, code? }]` com `state` `done`, `current` ou `locked`. Cada estado também é anunciado em texto para leitores de tela.
- `title` (padrão "Pistas coletadas") e `level` ("Nível 2 · Investigador").
- Fica acima das `FolderTabs`, uma vez por caso. Os rótulos repetem os nomes das pastas.
