import React from 'react';
import { Note } from '../ds/index.jsx';
import { api } from '../lib/api.js';
import { downloadText, esc, printDocument, table } from '../lib/export.js';
import Generate from '../components/Generate.jsx';
import CopyButton from '../components/CopyButton.jsx';
import { Block, Downloads, PastaHead, slug } from './common.jsx';

export const CATEGORIAS = {
  marketing: { label: 'Marketing', tone: '' },
  utilidade: { label: 'Utilidade', tone: 'dq-chip-green' },
  autenticacao: { label: 'Autenticação', tone: '' },
  servico: { label: 'Atendimento (janela 24 h)', tone: 'dq-chip-green' },
};

/** Quantas mensagens pagas de cada categoria um lead recebe nesta cadência (usado pelo simulador). */
export function mensagensPorLead(auto) {
  const byName = Object.fromEntries((auto?.templates || []).map((t) => [t.nome, t]));
  const out = { marketing: 0, utilidade: 0, autenticacao: 0 };
  for (const c of auto?.cadencia || []) {
    if (c.canal !== 'WhatsApp') continue;
    const t = byName[c.template];
    const cat = t?.categoria || 'marketing';
    if (t?.dentro_janela || cat === 'servico') continue;
    if (cat in out) out[cat] += 1;
  }
  return out;
}

export default function Automacoes({ data, line, lineId, onUpdate }) {
  const pid = data.project.id;
  const a = data.docs[lineId]?.automacoes?.data;
  const title = `Automações · ${line.data?.nome || ''}`;
  const pagas = a ? mensagensPorLead(a) : null;

  const html = () =>
    `<p>${esc(a.visao)}</p><h2>Cadência</h2>${table(['Dia', 'Canal', 'Ação', 'Objetivo', 'Template'], a.cadencia.map((c) => [c.dia, c.canal, c.acao, c.objetivo, c.template]))}
     <h2>Templates de WhatsApp</h2>${table(['Nome', 'Categoria', 'Quando', 'Texto'], a.templates.map((t) => [t.nome, CATEGORIAS[t.categoria]?.label || t.categoria, t.quando, t.texto]))}
     <h2>Regras de follow-up</h2>${table(['Gatilho', 'Ação', 'Prazo'], a.regras_followup.map((r) => [r.gatilho, r.acao, r.prazo]))}
     <h2>Automações sugeridas</h2>${table(['Automação', 'Gatilho', 'Ação', 'Onde configurar'], a.automacoes.map((r) => [r.nome, r.gatilho, r.acao, r.ferramenta]))}
     <p>${esc(a.dicas_custo)}</p>`;

  return (
    <div className="pasta">
      <PastaHead
        code="07"
        title={title}
        actions={
          a ? (
            <Downloads
              onPdf={() => printDocument({ title, subtitle: data.project.name, html: html() })}
              onMd={() =>
                downloadText(
                  `automacoes-${slug(line.data?.nome)}.md`,
                  `# ${title}\n\n${a.visao}\n\n## Cadência\n\n${a.cadencia.map((c) => `- D${c.dia} · ${c.canal}: ${c.acao} (${c.objetivo})${c.template ? ` [${c.template}]` : ''}`).join('\n')}\n\n## Templates\n\n${a.templates
                    .map((t) => `### ${t.nome} (${CATEGORIAS[t.categoria]?.label})\n${t.quando}\n\n${t.texto}`)
                    .join('\n\n')}\n`,
                )
              }
            />
          ) : null
        }
      >
        Cadência multicanal de até 15 dias, templates do WhatsApp oficial por categoria da Meta e as regras de follow-up. A pasta 08 usa estes números para simular o custo.
      </PastaHead>

      <Generate
        label="Desenhar cadência e automações"
        has={Boolean(a)}
        onRun={async () => onUpdate(await api(`/projects/${pid}/lines/${lineId}/generate/automacoes`, { method: 'POST' }))}
        steps={['Lendo roteiros e funil...', 'Distribuindo os toques em 15 dias...', 'Classificando templates da Meta...', 'Escrevendo as regras de follow-up...', 'Arquivando a cadência...']}
      />

      {a ? (
        <div className="stack-5" style={{ marginTop: 'var(--space-5)' }}>
          <p>{a.visao}</p>
          <Block title="Cadência" aside={<span className="dq-label">{a.cadencia.length} toques</span>}>
            <ol className="cadence">
              {a.cadencia.map((c, i) => (
                <li key={i} className="cadence-row">
                  <span className="cadence-day">D{c.dia}</span>
                  <span className="dq-chip">{c.canal}</span>
                  <span>
                    <b>{c.acao}</b>
                    <span className="small muted"> {c.objetivo}</span>
                    {c.template ? <span className="small"> · template {c.template}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </Block>

          <Block
            title="Templates de WhatsApp"
            aside={pagas ? <span className="dq-label">Por lead: {pagas.marketing} marketing · {pagas.utilidade} utilidade</span> : null}
          >
            <div className="templates">
              {a.templates.map((t) => (
                <article key={t.nome} className="template">
                  <div className="template-head">
                    <code>{t.nome}</code>
                    <span className={`dq-chip ${CATEGORIAS[t.categoria]?.tone || ''}`}>{CATEGORIAS[t.categoria]?.label || t.categoria}</span>
                    {t.dentro_janela ? <span className="dq-chip dq-chip-green">Dentro da janela</span> : null}
                  </div>
                  <p className="small muted">{t.quando}</p>
                  <p className="template-text">{t.texto}</p>
                  <CopyButton text={t.texto} />
                </article>
              ))}
            </div>
          </Block>

          <div className="grid-2">
            <Block title="Regras de follow-up">
              <table className="tbl">
                <tbody>
                  {a.regras_followup.map((r) => (
                    <tr key={r.gatilho}>
                      <th>{r.gatilho}</th>
                      <td>
                        {r.acao} <span className="muted">({r.prazo})</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Block>
            <Block title="Automações sugeridas">
              <table className="tbl">
                <tbody>
                  {a.automacoes.map((r) => (
                    <tr key={r.nome}>
                      <th>{r.nome}</th>
                      <td>
                        {r.gatilho}: {r.acao} <span className="muted">({r.ferramenta})</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Block>
          </div>
          {a.dicas_custo ? (
            <Note title="Para gastar menos por disparo" tilt={false} className="note-wide">
              {a.dicas_custo}
            </Note>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
