import React, { useState } from 'react';
import { Checklist } from '../ds/index.jsx';
import { api } from '../lib/api.js';
import { downloadText, esc, printDocument, table } from '../lib/export.js';
import Generate from '../components/Generate.jsx';
import { Block, Downloads, PastaHead, slug } from './common.jsx';

const SPIN = [
  ['situacao', 'S', 'Situação', 'Como resolvem isso hoje'],
  ['problema', 'P', 'Problema', 'O que mais incomoda'],
  ['implicacao', 'I', 'Implicação', 'O custo de não resolver'],
  ['necessidade', 'N', 'Necessidade', 'Como seria o ideal'],
];

function playbookHtml(pb, missions) {
  const done = new Set(missions.filter((m) => m.done).map((m) => m.id));
  return `<p>${esc(pb.resumo)}</p><p><b>Lead qualificado:</b> ${esc(pb.criterio_qualificacao)}</p>
  <h2>Checklist de implantação</h2>
  ${pb.secoes
    .map(
      (s, si) => `<h3>${esc(s.titulo)}</h3><ul class="check">${s.itens
        .map((it, ii) => `<li class="${done.has(`pb.${si}.${ii}`) ? 'done' : ''}">${esc(it.texto)}<br><span class="muted">${esc(it.dica)}</span></li>`)
        .join('')}</ul>`,
    )
    .join('')}
  <h2>Perguntas SPIN</h2>
  ${table(['Etapa', 'Perguntas'], SPIN.map(([k, , label]) => [label, (pb.spin[k] || []).join('\n')]))}
  <h2>Banco de objeções (A.R.A.)</h2>
  ${table(['Objeção', 'O que significa', 'Acolher', 'Reformular', 'Avançar'], pb.objecoes.map((o) => [o.objecao, o.significado, o.acolher, o.reformular, o.avancar]))}
  <h2>Rituais da semana</h2>${table(['Quando', 'Ritual'], pb.rituais.map((r) => [r.quando, r.ritual]))}
  <h2>Indicadores semanais</h2>${table(['Indicador', 'Meta inicial'], pb.indicadores.map((r) => [r.indicador, r.meta]))}`;
}

export function playbookMd(pb, missions, title) {
  const done = new Set(missions.filter((m) => m.done).map((m) => m.id));
  return `# ${title}\n\n${pb.resumo}\n\n**Lead qualificado:** ${pb.criterio_qualificacao}\n\n## Checklist de implantação\n\n${pb.secoes
    .map((s, si) => `### ${s.titulo}\n\n${s.itens.map((it, ii) => `- [${done.has(`pb.${si}.${ii}`) ? 'x' : ' '}] ${it.texto}  \n  ${it.dica}`).join('\n')}`)
    .join('\n\n')}\n\n## Perguntas SPIN\n\n${SPIN.map(([k, , label]) => `**${label}**\n${(pb.spin[k] || []).map((q) => `- ${q}`).join('\n')}`).join('\n\n')}\n\n## Banco de objeções (A.R.A.)\n\n${pb.objecoes
    .map((o) => `### ${o.objecao}\n- Significa: ${o.significado}\n- Acolher: ${o.acolher}\n- Reformular: ${o.reformular}\n- Avançar: ${o.avancar}`)
    .join('\n\n')}\n\n## Rituais\n\n${pb.rituais.map((r) => `- **${r.quando}:** ${r.ritual}`).join('\n')}\n\n## Indicadores semanais\n\n${pb.indicadores.map((r) => `- ${r.indicador}: ${r.meta}`).join('\n')}\n`;
}

export default function Playbook({ data, line, lineId, pasta, onUpdate }) {
  const pid = data.project.id;
  const pb = data.docs[lineId]?.playbook?.data;
  const [error, setError] = useState('');
  const items = pasta.missions.filter((m) => m.item);
  const names = data.names || {};
  const title = `Playbook · ${line.data?.nome || ''}`;

  const toggle = async (missionId, done) => {
    setError('');
    try {
      onUpdate(await api(`/projects/${pid}/missions`, { method: 'POST', body: { lineId, missionId, done } }));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="pasta">
      <PastaHead
        code="03"
        title={title}
        actions={
          pb ? (
            <Downloads
              onPdf={() => printDocument({ title, subtitle: data.project.name, html: playbookHtml(pb, items) })}
            />
          ) : null
        }
      >
        O playbook vira checklist: cada item é uma entrega que o time cumpre e marca. Os itens valem 5 XP e a pasta se resolve quando todos estão feitos.
      </PastaHead>

      <Generate
        label="Gerar playbook"
        has={Boolean(pb)}
        onRun={async () => onUpdate(await api(`/projects/${pid}/lines/${lineId}/generate/playbook`, { method: 'POST' }))}
        warning={pb ? 'Gerar de novo troca os itens e zera as marcações do checklist.' : undefined}
        steps={['Lendo o ICP...', 'Ordenando a implantação...', 'Escrevendo as perguntas SPIN...', 'Montando o banco de objeções...', 'Datilografando o checklist...']}
      />

      {pb ? (
        <div className="stack-5" style={{ marginTop: 'var(--space-5)' }}>
          <div className="callout">
            <p>{pb.resumo}</p>
            <p>
              <span className="dq-label">Lead qualificado</span>
              <br />
              <b>{pb.criterio_qualificacao}</b>
            </p>
          </div>

          <div className="grid-2 sections">
            {pb.secoes.map((s, si) => (
              <Checklist
                key={si}
                title={s.titulo}
                unit="itens"
                onToggle={toggle}
                items={s.itens.map((it, ii) => {
                  const m = items.find((x) => x.id === `pb.${si}.${ii}`);
                  return { id: `pb.${si}.${ii}`, label: it.texto, hint: it.dica, done: m?.done, meta: m?.done ? `${names[m.doneBy] || 'Alguém'} · +5 XP` : undefined };
                })}
              />
            ))}
          </div>
          {error ? <p className="error-text">{error}</p> : null}

          <Block title="Perguntas SPIN">
            <div className="spin">
              {SPIN.map(([k, letter, label, hint]) => (
                <div key={k} className="spin-col">
                  <span className="spin-letter">{letter}</span>
                  <div className="dq-label">{label}</div>
                  <p className="small muted">{hint}</p>
                  <ul>
                    {(pb.spin[k] || []).map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Block>

          <Block title="Banco de objeções (A.R.A.)">
            <div className="objecoes">
              {pb.objecoes.map((o) => (
                <article key={o.objecao} className="objecao">
                  <h4>{o.objecao}</h4>
                  <p className="small muted">{o.significado}</p>
                  <dl className="ara">
                    <div>
                      <dt>Acolher</dt>
                      <dd>{o.acolher}</dd>
                    </div>
                    <div>
                      <dt>Reformular</dt>
                      <dd>{o.reformular}</dd>
                    </div>
                    <div>
                      <dt>Avançar</dt>
                      <dd>{o.avancar}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </Block>

          <div className="grid-2">
            <Block title="Rituais da semana">
              <table className="tbl">
                <tbody>
                  {pb.rituais.map((r) => (
                    <tr key={r.quando + r.ritual}>
                      <th>{r.quando}</th>
                      <td>{r.ritual}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Block>
            <Block title="Indicadores semanais">
              <table className="tbl">
                <tbody>
                  {pb.indicadores.map((r) => (
                    <tr key={r.indicador}>
                      <th>{r.indicador}</th>
                      <td>{r.meta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Block>
          </div>
        </div>
      ) : null}
    </div>
  );
}
