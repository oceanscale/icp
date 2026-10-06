import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CaseFile, ClueTrack, FolderTabs, Stamp } from '../ds/index.jsx';
import { ALL_PASTAS, PASTAS } from '../../shared/game.js';
import { api } from '../lib/api.js';
import { dateLabel, pad3 } from '../lib/format.js';
import Missions from '../components/Missions.jsx';
import Mural from '../components/Mural.jsx';
import Team from '../components/Team.jsx';
import Celebration from '../components/Celebration.jsx';
import CaseBoard from '../components/CaseBoard.jsx';
import Empresa from '../pastas/Empresa.jsx';
import Icp from '../pastas/Icp.jsx';
import Playbook from '../pastas/Playbook.jsx';
import Roteiros from '../pastas/Roteiros.jsx';
import Jornada from '../pastas/Jornada.jsx';
import Conteudo from '../pastas/Conteudo.jsx';
import Funil from '../pastas/Funil.jsx';
import Ads from '../pastas/Ads.jsx';
import Automacoes from '../pastas/Automacoes.jsx';
import Simulador from '../pastas/Simulador.jsx';

const VIEWS = { empresa: Empresa, icp: Icp, playbook: Playbook, roteiros: Roteiros, jornada: Jornada, funil: Funil, ads: Ads, automacoes: Automacoes, simulador: Simulador, conteudo: Conteudo };

function Locked({ pastas, index }) {
  const def = ALL_PASTAS[index];
  const prevIndex = def.bonus ? ALL_PASTAS.findIndex((p) => p.id === def.after) : index - 1;
  const prev = pastas[prevIndex];
  const prevDef = ALL_PASTAS[prevIndex];
  const missing = prev ? prev.missions.filter((m) => m.key && !m.done).map((m) => m.label) : [];
  return (
    <div className="locked">
      <Stamp tone="ink">{def.bonus ? 'Bônus trancado' : 'Pasta trancada'}</Stamp>
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

/** Anterior e próxima pasta no fim de cada pasta, para seguir o tabuleiro sem voltar ao topo. */
function PastaNav({ pastas, index, onGo }) {
  const prev = index > 0 ? index - 1 : -1;
  const next = index < ALL_PASTAS.length - 1 ? index + 1 : -1;
  const label = (i) => (ALL_PASTAS[i].bonus ? `Bônus · ${ALL_PASTAS[i].label}` : `${ALL_PASTAS[i].code} ${ALL_PASTAS[i].label}`);
  const go = (i) => {
    onGo(ALL_PASTAS[i].id);
    document.querySelector('.case-main')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <nav className="pasta-nav" aria-label="Navegar entre as pastas">
      {prev >= 0 ? (
        <button type="button" className="pasta-nav-btn" onClick={() => go(prev)}>
          <span className="dq-label">Pasta anterior</span>
          <span className="pasta-nav-name">← {label(prev)}</span>
        </button>
      ) : (
        <span />
      )}
      {next >= 0 ? (
        <button type="button" className={`pasta-nav-btn pasta-nav-next ${pastas[next]?.state === 'locked' ? 'is-locked' : ''}`} onClick={() => go(next)}>
          <span className="dq-label">{pastas[next]?.state === 'locked' ? 'Próxima pasta · trancada' : 'Próxima pasta'}</span>
          <span className="pasta-nav-name">{label(next)} →</span>
        </button>
      ) : null}
    </nav>
  );
}

function NoLine() {
  return (
    <div className="locked">
      <Stamp tone="ink">Sem linha de produto</Stamp>
      <p>As pastas 02 a 09 são montadas para cada linha de produto. Cadastre a primeira linha na pasta 01 Empresa.</p>
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
    if (next[i].state === 'done' && prev[i]?.state !== 'done') return { title: 'Pasta resolvida', subtitle: `${ALL_PASTAS[i].code} ${ALL_PASTAS[i].label} · +50 XP para o caso` };
  }
  for (let i = 0; i < next.length; i++) {
    if (next[i].state === 'open' && prev[i]?.state === 'locked') {
      const def = ALL_PASTAS[i];
      return def.bonus ? { title: 'Bônus desbloqueado', subtitle: `Pasta ${def.label} liberada · XP extra` } : { title: 'Pasta aberta', subtitle: `${def.code} ${def.label} liberada` };
    }
  }
  return null;
}

export default function CasePage({ route, user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [lineId, setLineId] = useState(route.lid && route.lid !== '-' ? route.lid : null);
  const [pasta, setPasta] = useState(VIEWS[route.pasta] ? route.pasta : 'empresa');
  const [board, setBoard] = useState(route.pasta === 'quadro');
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
    history.replaceState(null, '', `#/caso/${pid}/${lineId || '-'}/${board ? 'quadro' : pasta}`);
  }, [pid, lineId, pasta, board]);

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
  const pastas = line ? data.game.lines[line.id].pastas : [data.game.empresa, ...ALL_PASTAS.slice(1).map((p) => ({ id: p.id, bonus: Boolean(p.bonus), state: 'locked', missions: [] }))];
  const index = ALL_PASTAS.findIndex((p) => p.id === pasta);
  const current = pastas[index];
  const View = VIEWS[pasta];
  const { project, game } = data;

  const tabs = ALL_PASTAS.map((p, i) => ({ id: p.id, code: p.code, label: p.bonus ? `Bônus · ${p.label}` : p.label, done: pastas[i].state === 'done', locked: pastas[i].state === 'locked' }));
  const steps = ALL_PASTAS.map((p, i) => ({ id: p.id, code: p.code, label: p.bonus ? 'Bônus' : p.label, bonus: p.bonus, state: pastas[i].state === 'open' ? 'current' : pastas[i].state, active: p.id === pasta }));

  let content;
  if (!line && pasta !== 'empresa') content = <NoLine />;
  else if (current.state === 'locked') content = <Locked pastas={pastas} index={index} />;
  else content = <View data={data} line={line} lineId={lineId} pasta={current} onUpdate={update} user={user} goTo={setPasta} openBoard={() => setBoard(true)} />;
  const openPasta = (id) => {
    setBoard(false);
    setPasta(id);
  };
  const cards = data.board?.cards || [];
  const mine = cards.filter((c) => c.assignee_id === data.me.id && c.status !== 'done').length;

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
          onStep={openPasta}
        />
      </CaseFile>

      <div className="case-switch" role="group" aria-label="O que ver">
        <button type="button" className={`case-switch-btn ${!board ? 'is-on' : ''}`} aria-pressed={!board} onClick={() => setBoard(false)}>
          Pastas do caso
        </button>
        <button type="button" className={`case-switch-btn ${board ? 'is-on' : ''}`} aria-pressed={board} onClick={() => setBoard(true)}>
          Quadro do time
          <span className="case-switch-count">{cards.filter((c) => c.status !== 'done').length}</span>
          {mine ? <span className="case-switch-mine">{mine} com você</span> : null}
        </button>
      </div>

      {board ? (
        <div className="case-board-wrap">
          <CaseBoard data={data} onUpdate={update} />
        </div>
      ) : (
        <div className="case-body">
          <div className="case-main">
            <FolderTabs tabs={tabs} active={pasta} onChange={setPasta} idBase="pasta" arrows>
              {content}
              <PastaNav pastas={pastas} index={index} onGo={setPasta} />
            </FolderTabs>
          </div>
          <aside className="case-aside" aria-label="Missões e time">
            <Missions data={data} pasta={current} lineId={lineId} onUpdate={update} />
            <Team data={data} onUpdate={update} />
            <Mural data={data} />
          </aside>
        </div>
      )}
      {celebrate ? <Celebration title={celebrate.title} subtitle={celebrate.subtitle} onDone={() => setCelebrate(null)} /> : null}
    </div>
  );
}
