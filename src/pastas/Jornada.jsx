import React, { useLayoutEffect, useRef, useState } from 'react';
import { Polaroid } from '../ds/index.jsx';
import { api } from '../lib/api.js';
import { esc, list, printDocument, table } from '../lib/export.js';
import Generate from '../components/Generate.jsx';
import { Block, Downloads, PastaHead } from './common.jsx';

const PESO = { alto: 'Alta atenção', medio: 'Média', baixo: 'Baixa' };

/** Fios do mural: liga o centro a cada ramo, recalculando quando o tamanho muda. */
function useStrings(boardRef, centerRef, branchRefs, deps) {
  const [paths, setPaths] = useState([]);
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return undefined;
    const draw = () => {
      const b = board.getBoundingClientRect();
      const c = centerRef.current?.getBoundingClientRect();
      if (!c || window.matchMedia('(max-width: 900px)').matches) return setPaths([]);
      const cx = c.left + c.width / 2 - b.left;
      const cy = c.top + c.height / 2 - b.top;
      setPaths(
        branchRefs.current.filter(Boolean).map((el) => {
          const r = el.getBoundingClientRect();
          const left = r.left + r.width / 2 - b.left < cx;
          const x = left ? r.right - b.left : r.left - b.left;
          const y = r.top + Math.min(36, r.height / 2) - b.top;
          const sx = left ? c.left - b.left : c.right - b.left;
          const sy = cy + (y - cy) * 0.25;
          const mid = (sx + x) / 2;
          return { d: `M ${sx} ${sy} C ${mid} ${sy}, ${mid} ${y}, ${x} ${y}`, x, y, sx, sy };
        }),
      );
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(board);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return paths;
}

function MindMap({ j, icp, image }) {
  const board = useRef(null);
  const center = useRef(null);
  const branches = useRef([]);
  const perguntas = (j.etapas || []).flatMap((e) => e.perguntas || []).slice(0, 5);
  const left = [
    { title: 'O que dispara a busca', items: j.gatilhos || [] },
    { title: 'Onde está a atenção', midias: j.midias || [] },
    { title: 'Em quem confia', items: j.fontes_confianca || [] },
  ];
  const right = [
    { title: 'O que pergunta', items: perguntas },
    { title: 'O que pensa', quotes: (j.etapas || []).map((e) => ({ etapa: e.nome, texto: e.pensa })) },
    { title: 'O que leva à conversa', items: j.conteudos_que_convertem || [] },
  ];
  const paths = useStrings(board, center, branches, [j]);
  let k = 0;
  const branch = (br) => {
    const idx = k++;
    return (
      <article key={br.title} className="mm-branch" ref={(el) => (branches.current[idx] = el)}>
        <h4 className="mm-title">{br.title}</h4>
        {br.items ? (
          <ul>
            {br.items.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        ) : null}
        {br.midias ? (
          <ul className="mm-midias">
            {br.midias.map((m) => (
              <li key={m.canal} className={`mm-midia mm-peso-${m.peso}`}>
                <span className="mm-canal">{m.canal}</span>
                <span className="dq-label">{PESO[m.peso] || m.peso}</span>
                <span className="small muted">{m.como_usa}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {br.quotes ? (
          <ul className="mm-quotes">
            {br.quotes.map((q) => (
              <li key={q.etapa}>
                <span className="dq-label">{q.etapa}</span>
                <span className="mm-quote">{q.texto}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </article>
    );
  };
  return (
    <div className="mindmap" ref={board}>
      <svg className="mm-strings" aria-hidden="true">
        {paths.map((p, i) => (
          <g key={i}>
            <path d={p.d} />
            <circle cx={p.x} cy={p.y} r="5" />
            <circle cx={p.sx} cy={p.sy} r="4" />
          </g>
        ))}
      </svg>
      <div className="mm-col">{left.map(branch)}</div>
      <div className="mm-center" ref={center}>
        <Polaroid src={image ? `/api/images/${image.id}` : undefined} alt={image?.alt || ''} caption={icp?.persona?.nome} width={170} pendingLabel="Sem retrato" />
        <p className="mm-center-name">{icp?.principal?.nome_perfil}</p>
        <p className="small muted">{j.resumo}</p>
      </div>
      <div className="mm-col">{right.map(branch)}</div>
    </div>
  );
}

export function jornadaHtml(j) {
  return `<p>${esc(j.resumo)}</p>
  <h2>Etapas</h2>${table(
    ['Etapa', 'Momento', 'O que pensa', 'Onde está', 'Conteúdo que impacta', 'Papel da empresa'],
    (j.etapas || []).map((e) => [e.nome, e.momento, e.pensa, (e.onde_esta || []).join('; '), (e.conteudo || []).join('; '), e.papel_da_empresa]),
  )}
  <h2>Onde está a atenção</h2>${table(['Canal', 'Atenção', 'Como usa'], (j.midias || []).map((m) => [m.canal, PESO[m.peso] || m.peso, m.como_usa]))}
  <h2>O que dispara a busca</h2>${list(j.gatilhos || [])}
  <h2>Em quem confia</h2>${list(j.fontes_confianca || [])}
  <h2>O que leva à conversa</h2>${list(j.conteudos_que_convertem || [])}`;
}

export default function Jornada({ data, line, lineId, onUpdate }) {
  const pid = data.project.id;
  const j = data.docs[lineId]?.jornada?.data;
  const icp = data.docs[lineId]?.icp?.data;
  const title = `Jornada · ${line.data?.nome || ''}`;
  return (
    <div className="pasta">
      <PastaHead code="05" title={title} actions={j ? <Downloads onPdf={() => printDocument({ title, subtitle: data.project.name, html: jornadaHtml(j) })} /> : null}>
        O caminho do cliente ideal até a compra: o que dispara a busca, onde está a atenção dele, em quem confia e que conteúdo o leva a conversar com vocês. É a base do funil, dos anúncios e do conteúdo.
      </PastaHead>

      <Generate
        label="Mapear a jornada de compra"
        has={Boolean(j)}
        onRun={async () => onUpdate(await api(`/projects/${pid}/lines/${lineId}/generate/jornada`, { method: 'POST' }))}
        steps={['Lendo o ICP e as objeções...', 'Seguindo o cliente da dor à compra...', 'Mapeando onde está a atenção...', 'Ligando os fios do mural...', 'Arquivando a jornada...']}
      />

      {j ? (
        <div className="stack-5" style={{ marginTop: 'var(--space-5)' }}>
          <MindMap j={j} icp={icp} image={data.images[lineId]} />
          <Block title="Etapa por etapa">
            <ol className="journey">
              {(j.etapas || []).map((e, i) => (
                <li key={e.nome} className="journey-step">
                  <span className="journey-n">{i + 1}</span>
                  <h4>{e.nome}</h4>
                  <p className="small muted">{e.momento}</p>
                  <p className="mm-quote">{e.pensa}</p>
                  <div className="dq-label">Onde está</div>
                  <p className="small">{(e.onde_esta || []).join(' · ')}</p>
                  <div className="dq-label">O que impacta</div>
                  <ul className="small">
                    {(e.conteudo || []).map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                  <div className="dq-label">Papel da empresa</div>
                  <p className="small">
                    <b>{e.papel_da_empresa}</b>
                  </p>
                </li>
              ))}
            </ol>
          </Block>
        </div>
      ) : null}
    </div>
  );
}
