import React from 'react';
import { Stamp } from '../ds/index.jsx';
import { api } from '../lib/api.js';
import { esc, list, printDocument, table } from '../lib/export.js';
import Generate from '../components/Generate.jsx';
import CopyButton from '../components/CopyButton.jsx';
import { Block, Downloads, PastaHead } from './common.jsx';

const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export function conteudoHtml(c) {
  return `<p>${esc(c.linha_editorial)}</p>
  <h2>Pilares</h2>${table(['Pilar', 'Objetivo'], (c.pilares || []).map((p) => [p.nome, p.objetivo]))}
  <h2>Posts da semana</h2>${table(['Dia', 'Rede', 'Formato', 'Pilar', 'Tema', 'Gancho', 'Roteiro', 'CTA'], (c.posts || []).map((p) => [p.dia, p.rede, p.formato, p.pilar, p.tema, p.gancho, p.roteiro, p.cta]))}
  <h2>Ideias para as próximas semanas</h2>${list(c.ideias_extras || [])}`;
}

export default function Conteudo({ data, line, lineId, onUpdate }) {
  const pid = data.project.id;
  const c = data.docs[lineId]?.conteudo?.data;
  const title = `Conteúdo · ${line.data?.nome || ''}`;
  const posts = [...(c?.posts || [])].sort((a, b) => DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia));
  return (
    <div className="pasta">
      <PastaHead code="B" title={title} actions={c ? <Downloads onPdf={() => printDocument({ title, subtitle: data.project.name, html: conteudoHtml(c) })} /> : null}>
        Pasta bônus, liberada pelos primeiros anúncios: o plano de conteúdo orgânico da semana para as redes sociais, com linha editorial, pilares e um post por dia. Vale XP extra e não conta para o caso resolvido.
      </PastaHead>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Stamp tone="green">Bônus desbloqueado</Stamp>
      </div>

      <Generate
        label="Gerar plano de conteúdo da semana"
        againLabel="Gerar plano novo"
        has={Boolean(c)}
        onRun={async () => onUpdate(await api(`/projects/${pid}/lines/${lineId}/generate/conteudo`, { method: 'POST' }))}
        steps={['Lendo a jornada do cliente...', 'Definindo a linha editorial...', 'Distribuindo os pilares na semana...', 'Escrevendo ganchos e roteiros...', 'Montando o calendário...']}
      />

      {c ? (
        <div className="stack-5" style={{ marginTop: 'var(--space-5)' }}>
          <div className="callout">
            <span className="dq-label">Linha editorial</span>
            <p>{c.linha_editorial}</p>
          </div>
          <div className="row-3 wrap">
            {(c.pilares || []).map((p) => (
              <span key={p.nome} className="pilar" title={p.objetivo}>
                <b>{p.nome}</b> <span className="small muted">{p.objetivo}</span>
              </span>
            ))}
          </div>
          <Block title="Calendário da semana">
            <div className="calendar">
              {posts.map((p, i) => (
                <article key={i} className="post">
                  <div className="post-head">
                    <span className="post-day">{p.dia}</span>
                    <span className="dq-chip">{p.rede}</span>
                  </div>
                  <div className="dq-label">
                    {p.formato} · {p.pilar}
                  </div>
                  <h4 className="post-theme">{p.tema}</h4>
                  <p className="small">
                    <b>Gancho:</b> {p.gancho}
                  </p>
                  <p className="small post-script">{p.roteiro}</p>
                  <p className="small">
                    <b>CTA:</b> {p.cta}
                  </p>
                  <CopyButton text={`${p.tema}\n\n${p.gancho}\n\n${p.roteiro}\n\n${p.cta}`} />
                </article>
              ))}
            </div>
          </Block>
          {c.ideias_extras?.length ? (
            <Block title="Ideias para as próximas semanas">
              <ul className="ticks">
                {c.ideias_extras.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </Block>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
