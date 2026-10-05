// Gera src/ds/tokens.css a partir de design-system/project/tokens.json (fonte única dos tokens).
// Mesmo formato que a página do Design System compila: primeiro tema em :root, os outros por [data-theme].
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tokens = JSON.parse(readFileSync(join(root, 'design-system/project/tokens.json'), 'utf8'));
const themes = tokens.color.themes.map((t) => t.id);
const value = (v, theme) => (typeof v === 'string' ? (theme === themes[0] ? v : null) : (v[theme] ?? null));
const css = (v) => v.replace(/^\{(.+)\}$/, 'var(--$1)');

const blocks = themes.map((theme, i) => {
  const sel = i === 0 ? `:root, [data-theme="${theme}"]` : `[data-theme="${theme}"]`;
  const decl = [...tokens.color.tokens, ...tokens.shadow.tokens]
    .map((t) => [t.name, value(t.value, theme)])
    .filter(([, v]) => v)
    .map(([n, v]) => `  --${n}: ${css(v)};`);
  return `${sel} {\n${decl.join('\n')}\n}`;
});
const scalars = ['spacing', 'radius', 'tilt'].flatMap((fam) => tokens[fam].tokens.map((t) => `  --${t.name}: ${t.value};`));
const fonts = Object.entries(tokens.type.families).map(([k, v]) => `  --font-${k}: ${v};`);
blocks.push(`:root {\n${[...scalars, ...fonts].join('\n')}\n}`);

writeFileSync(join(root, 'src/ds/tokens.css'), `/* Gerado por scripts/build-tokens.mjs. Não edite: altere design-system/project/tokens.json. */\n${blocks.join('\n')}\n`);
