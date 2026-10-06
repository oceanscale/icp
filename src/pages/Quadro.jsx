import React, { useEffect, useState } from 'react';
import { CaseFile, Stamp } from '../ds/index.jsx';
import { api } from '../lib/api.js';
import { pad3 } from '../lib/format.js';
import Board from '../components/Board.jsx';
import SeaAds from '../components/SeaAds.jsx';

/** Quadro do time aberto pelo link do gestor: só leitura, sem login, atualiza sozinho a cada minuto. */
export default function Quadro({ token, theme, onToggleTheme }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [at, setAt] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api(`/quadro/${token}`)
        .then((d) => {
          if (!alive) return;
          setData(d);
          setError('');
          setAt(new Date());
        })
        .catch((e) => alive && setError(e.message));
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [token]);

  const srcFor = (id, v) => `/api/quadro/${token}/avatars/${id}?v=${v}`;

  return (
    <div className="lp lp-board">
      <header className="lp-top">
        <span className="lp-mark">Dossiê ICP</span>
        <div className="row-3">
          <span className="dq-label">Quadro do time · só leitura</span>
          <button type="button" className="theme-toggle" onClick={onToggleTheme}>
            {theme === 'noturno' ? 'Papel' : 'Noturno'}
          </button>
        </div>
      </header>
      <main className="public-board">
        {error && !data ? (
          <CaseFile caseNo="Quadro" title="Link indisponível">
            <p>{error}</p>
          </CaseFile>
        ) : !data ? (
          <p className="muted">Abrindo o quadro...</p>
        ) : (
          <>
            <CaseFile
              caseNo={`Caso Nº ${pad3(data.project.number)}`}
              title={data.project.name}
              subtitle={[data.project.segment, data.project.city].filter(Boolean).join(' · ')}
              aside={
                <div className="case-head-aside">
                  <Stamp tone={data.level.n >= 4 ? 'green' : 'blue'}>{data.level.name}</Stamp>
                  <span className="dq-label">{data.xp} XP no caso</span>
                </div>
              }
            >
              <p className="small muted">
                Tarefas do playbook e quem está com cada uma. {at ? `Atualizado às ${at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.` : ''}
                {error ? ` Sem conexão agora: ${error}` : ''}
              </p>
            </CaseFile>
            <Board cards={data.cards} columns={data.columns} people={data.people} srcFor={srcFor} />
          </>
        )}
      </main>
      <footer className="lp-foot lp-foot-brand">
        <SeaAds where="quadro-publico" />
      </footer>
    </div>
  );
}
