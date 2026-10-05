# Polaroid

Moldura de foto instantânea para o retrato do decisor (buyer persona), presa com fita e levemente inclinada.

- `src` e `alt`: a imagem gerada e sua descrição. Sem `src`, mostra a área hachurada com `pendingLabel` (padrão "Retrato em revelação").
- `caption`: legenda em letra de mão (`hand-sm`), por exemplo nome e idade da persona.
- `width` (padrão 220px) e `tilt={false}` para alinhar em grades.
- A moldura fica clara (`frame`) também no tema Noturno, como uma foto de verdade.
- Use proporção 4:5 na geração da imagem; o componente corta com `object-fit: cover`.
