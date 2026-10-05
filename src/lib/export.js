// Downloads: texto (Markdown, CSV) e PDF pela impressão do navegador, em layout neutro
// (sem textura nem fonte de máquina de escrever: documento para o cliente ler e imprimir).

export function downloadText(filename, text, mime = 'text/markdown;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');

const PRINT_CSS = `
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "IBM Plex Sans", "Segoe UI", Arial, sans-serif; color: #1b1f24; font-size: 11pt; line-height: 1.5; margin: 0; }
  header { border-bottom: 2px solid #1f4f8f; padding-bottom: 10px; margin-bottom: 18px; }
  header small { color: #5b6470; font-size: 9pt; letter-spacing: .04em; text-transform: uppercase; }
  h1 { font-size: 20pt; margin: 4px 0 0; }
  h2 { font-size: 13pt; color: #1f4f8f; margin: 22px 0 8px; page-break-after: avoid; }
  h3 { font-size: 11pt; margin: 14px 0 6px; }
  p { margin: 0 0 8px; }
  ul { margin: 0 0 8px; padding-left: 18px; }
  li { margin-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 12px; font-size: 10pt; }
  th, td { border: 1px solid #c9ccd1; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #eef2f7; font-weight: 600; }
  .check { list-style: none; padding-left: 0; }
  .check li::before { content: "☐  "; }
  .check li.done::before { content: "☑  "; }
  .muted { color: #5b6470; }
  footer { margin-top: 28px; font-size: 8.5pt; color: #5b6470; border-top: 1px solid #c9ccd1; padding-top: 8px; }
`;

export function printDocument({ title, subtitle, html }) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  doc.open();
  doc.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600&display=swap">
<style>${PRINT_CSS}</style></head><body>
<header><small>${esc(subtitle || '')}</small><h1>${esc(title)}</h1></header>
${html}
<footer>Gerado no Dossiê ICP em ${new Date().toLocaleDateString('pt-BR')}.</footer>
</body></html>`);
  doc.close();
  const run = () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => iframe.remove(), 1500);
  };
  if (doc.fonts?.ready) doc.fonts.ready.then(() => setTimeout(run, 150));
  else setTimeout(run, 500);
}

export const table = (head, rows) =>
  `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;

export const list = (items) => `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;

export function csv(rows) {
  return rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
}
