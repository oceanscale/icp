# ClueTrack

O tabuleiro do caso: uma casa por pasta, resolvidas em verde, abertas em azul claro, trancadas tracejadas, e o peão na pasta em que a pessoa está.

- `steps`: `[{ id?, label, state, code?, active?, bonus? }]` (`bonus` desenha a casa redonda, para a pasta bônus) com `state` `done`, `current` (aberta) ou `locked`. `active` põe o peão e sublinha o nome. Cada estado também é anunciado em texto para leitores de tela.
- `title` (padrão "Progresso do caso") e `level` ("Nível 2 · Estruturando").
- `xp` e `nextXp`: barra de XP até o próximo nível; sem `nextXp`, mostra "nível máximo".
- `onStep(id)`: torna as casas clicáveis (abre a pasta).
- Níveis de maturidade comercial: Improviso, Estruturando, Processo definido, Previsível, Escalável.
- Fica acima das `FolderTabs`, uma vez por caso. Os rótulos repetem os nomes das pastas.
