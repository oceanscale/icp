import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CaseFile, ClueTrack, FolderTabs, Stamp } from '../ds/index.jsx';
import { PASTAS } from '../../shared/game.js';
import { api } from '../lib/api.js';
import { dateLabel, pad3 } from '../lib/format.js';
import Missions from '../components/Missions.jsx';
import Mural from '../components/Mural.jsx';
import Team from '../components/Team.jsx';
import Celebration from '../components/Celebration.jsx';
import Empresa from '../pastas/Empresa.jsx';
import Icp from '../pastas/Icp.jsx';
import Playbook from '../pastas/Playbook.jsx';
import Roteiros from '../pastas/Roteiros.jsx';
import Funil from '../pastas/Funil.jsx';
import Ads from '../pastas/Ads.jsx';
import Automacoes from '../pastas/Automacoes.jsx';
import Simulador from '../pastas/Simulador.jsx';

const VIEWS = { empresa: Empresa, icp: Icp, playbook: Playbook, roteiros: Roteiros, funil: Funil, ads: Ads, automacoes: Automacoes, simulador: Simulador };

function Locked({ pastas, index }) {
  const prev = pastas[index - 1];
  const prevDef = PASTAS[index - 1];
  const def = PASTAS[index];
  const missing = prev ? prev.missions.filter((m) => m.key && !m.done).map((m) => m.label) : [];
  return (
    <div className="locked">
      <Stamp tone="ink">Pasta trancada</Stamp>
      <h2 className="dq-case-title">
        {def.code} {def.label}
      </h2>
      {prev?.state === 'locked' ? (
        <p>Esta pasta abre depois da pasta {prevDef.code} {prevDef.label}, que também está trancada. Siga o tabuleiro em ordem.</p>
      ) : (
        <p>
          Para abrir, conclua na pasta {prevDef.code} {prevDef.label}: <b>{missing.join('; ')}</b>.
        </p>
      )}
    </div>
  );
}

function NoLine() {
  return (
    <div className="locked">
      <Stamp tone="ink">Sem linha de produto</Stamp>
      <p>As pastas 02 a 08 são montadas para cada linha de produto. Cadastre a primeira linha na pasta 01 Empresa.</p>
    </div>
  );
}

/** Compara o jogo antes e depois de uma ação para comemorar pasta resolvida e subida de nível. */
function celebrationFor(before, after, lineId) {
  if (!before) return null;
  if (after.game.level.n > before.game.level.n) return { title: `Nível ${after.game.level.n}`, subtitle: `O caso agora está em ${after.game.level.name}.` };
  const pastasOf = (d) => (lineId && d.game.lines[lineId] ? d.game.lines[lineId].pastas : [d.game.empresa]);
  const prev = pastasOf(before);
  const next = pastasOf(after);
  for (let i = 0; i < next.length; i++) {
    if (next[i].state === 'done' && prev[i]?.state !== 'done') return { title: 'Pasta resolvida', subtitle: `${PASTAS[i].code} ${PASTAS[i].label} · +50 XP para o caso` };
  }
  for (let i = 0; i < next.length; i++) {
    if (next[i].state === 'open' && prev[i]?.state === 'locked') return { title: 'Pasta aberta', subtitle: `${PASTAS[i].code} ${PASTAS[i].label} liberada` };
  }
  return null;
}

export default function CasePage({ route, user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [lineId, setLineId] = useState(route.lid && route.lid !== '-' ? route.lid : null);
  const [pasta, setPasta] = useState(VIEWS[route.pasta] ? route.pasta : 'empresa');
  const [celebrate, setCelebrate] = useState(null);
  const dataRef = useRef(null);
  const pid = route.pid;

  const update = useCallback(
    (next) => {
      const project = next.project && next.game ? next : next.project;
      if (!project?.game) return;
      const c = celebrationFor(dataRef.current, project, lineId);
      if (c) setCelebrate(c);
      dataRef.current = project;
      setData(project);
      if (next.lineId) setLineId(next.lineId);
    },
    [lineId],
  );

  useEffect(() => {
    api(`/projects/${pid}`)
      .then((d) => {
        dataRef.current = d;
        setData(d);
      })
      .catch((e) => setError(e.message));
  }, [pid]);

  // Escolhe a primeira linha quando não há uma selecionada (ou a selecionada foi removida).
  useEffect(() => {
    if (!data) return;
    if (!lineId || !data.lines.some((l) => l.id === lineId)) setLineId(data.lines[0]?.id || null);
  }, [data, lineId]);

  // Endereço do navegador acompanha a linha e a pasta, sem criar histórico a cada clique.
  useEffect(() => {
    history.replaceState(null, '', `#/caso/${pid}/${lineId || '-'}/${pasta}`);
  }, [pid, lineId, pasta]);

  if (error) {
    return (
      <div className="page">
        <CaseFile caseNo="Erro" title="Não foi possível abrir o caso">
          <p>{error}</p>
          <a href="#/">Voltar para os casos</a>
        </CaseFile>
      </div>
    );
  }
  if (!data) return <div className="page muted">Abrindo o caso...</div>;

  const line = data.lines.find((l) => l.id === lineId) || null;
  const pastas = line ? data.game.lines[line.id].pastas : [data.game.empresa, ...PASTAS.slice(1).map((p) => ({ id: p.id, state: 'locked', missions: [] }))];
  const index = PASTAS.findIndex((p) => p.id === pasta);
  const current = pastas[index];
  const View = VIEWS[pasta];
  const { project, game } = data;

  const tabs = PASTAS.map((p, i) => ({ id: p.id, code: p.code, label: p.label, done: pastas[i].state === 'done', locked: pastas[i].state === 'locked' }));
  const steps = PASTAS.map((p, i) => ({ id: p.id, code: p.code, label: p.label, state: pastas[i].state === 'open' ? 'current' : pastas[i].state, active: p.id === pasta }));

  let content;
  if (!line && pasta !== 'empresa') content = <NoLine />;
  else if (current.state === 'locked') content = <Locked pastas={pastas} index={index} />;
  else content = <View data={data} line={line} lineId={lineId} pasta={current} onUpdate={update} user={user} goTo={setPasta} />;

  return (
    <div className="page case-page">
      <CaseFile
        className="case-head"
        caseNo={`Caso Nº ${pad3(project.number)} · aberto em ${dateLabel(project.created_at)}`}
        title={project.name}
        subtitle={[project.segment, project.city].filter(Boolean).join(' · ')}
        aside={
          <div className="case-head-aside">
            <Stamp tone={game.level.n >= 4 ? 'green' : 'blue'}>{game.level.name}</Stamp>
            <span className="dq-label">{game.xp} XP no caso</span>
          </div>
        }
      >
        <div className="lines-bar">
          <span className="dq-label">Linha de produto</span>
          <div className="lines-chips" role="group" aria-label="Linhas de produto">
            {data.lines.map((l) => (
              <button key={l.id} type="button" className={`line-chip ${l.id === lineId ? 'is-active' : ''}`} aria-pressed={l.id === lineId} onClick={() => setLineId(l.id)}>
                {l.data?.nome || 'Sem nome'}
              </button>
            ))}
            <button type="button" className="line-chip line-chip-add" onClick={() => setPasta('empresa')}>
              + Nova linha
            </button>
          </div>
        </div>
        <ClueTrack
          title={line ? `Progresso da linha ${line.data?.nome || ''}` : 'Progresso do caso'}
          steps={steps}
          level={game.level.label}
          xp={game.xp}
          nextXp={game.level.next}
          onStep={(id) => setPasta(id)}
        />
      </CaseFile>

      <div className="case-body">
        <div className="case-main">
          <FolderTabs tabs={tabs} active={pasta} onChange={setPasta} idBase="pasta">
            {content}
          </FolderTabs>
        </div>
        <aside className="case-aside" aria-label="Missões e time">
          <Missions data={data} pasta={current} lineId={lineId} onUpdate={update} />
          <Mural data={data} />
          <Team data={data} onUpdate={update} />
        </aside>
      </div>
      {celebrate ? <Celebration title={celebrate.title} subtitle={celebrate.subtitle} onDone={() => setCelebrate(null)} /> : null}
    </div>
  );
}
