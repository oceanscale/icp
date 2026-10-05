// Empacota src/ds para o Design System publicado (design-system/project/components).
// bundle.js: script clássico que atribui window.Dossie e lê React de window.React.
// bundle.css: src/ds/ds.css com a importação das fontes do Google Fonts na frente.
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'design-system/project/components');
const tmp = join(root, 'node_modules/.cache/ds-build');
mkdirSync(tmp, { recursive: true });

export const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=Special+Elite&display=swap';

const COMPONENTS = ['Button', 'Stamp', 'FolderTabs', 'CaseFile', 'Polaroid', 'IcpFile', 'Checklist', 'Field', 'FunnelColumn', 'LeadCard', 'CreativeCard', 'Note', 'ClueTrack', 'Readout'];

writeFileSync(
  join(tmp, 'react-shim.js'),
  `const R = window.React;
export default R;
export const { Fragment, createElement, useRef, useState, useEffect } = R;
`,
);
writeFileSync(
  join(tmp, 'entry.jsx'),
  `import { ${COMPONENTS.join(', ')} } from '${join(root, 'src/ds/index.jsx')}';
window.Dossie = Object.assign(window.Dossie || {}, { ${COMPONENTS.join(', ')} });
`,
);

const result = await build({
  entryPoints: [join(tmp, 'entry.jsx')],
  bundle: true,
  format: 'iife',
  minify: true,
  write: false,
  target: 'es2019',
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  inject: [],
  banner: { js: 'var React = window.React;' },
  alias: { react: join(tmp, 'react-shim.js') },
  legalComments: 'none',
});
let js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '\\x3C!--');
const header = { format: 4, namespace: 'Dossie', components: COMPONENTS.map((name) => ({ name })) };
js = `/* @ds-bundle: ${JSON.stringify(header)} */\n${js}`;
if (/<\/script|<!--/i.test(js)) throw new Error('bundle.js contém </script ou <!--');
writeFileSync(join(out, 'bundle.js'), js);

const css = readFileSync(join(root, 'src/ds/ds.css'), 'utf8');
if (/<\/style/i.test(css)) throw new Error('ds.css contém </style');
writeFileSync(join(out, 'bundle.css'), `@import url("${FONTS_URL}");\n\n${css}`);
console.log(`bundle.js ${js.length} bytes, bundle.css ${css.length} bytes`);
