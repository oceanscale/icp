import React, { useEffect, useState } from 'react';
import { Button, CaseFile, Field, Stamp } from '../ds/index.jsx';
import { api } from '../lib/api.js';
import { dueInfo, todayIso } from '../lib/format.js';
import { navigate } from '../lib/nav.js';

/** Link de tarefa delegada: quem está logado e participa do caso assume e escolhe o prazo. */
export default function Tarefa({ token, user }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/tarefas/${token}`)
      .then((d) => {
        setInfo(d);
        setDue(d.due || '');
      })
      .catch((e) => setError(e.message));
  }, [token]);

  const accept = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api(`/tarefas/${token}`, { method: 'POST', body: { due } });
      navigate(`#/caso/${r.projectId}/${r.lineId}/quadro`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const d = dueInfo(due);
  return (
    <div className="page invite-wrap" style={{ maxWidth: 620, margin: '0 auto' }}>
      {!info ? (
        <CaseFile caseNo="Tarefa" title={error ? 'Link indisponível' : 'Abrindo a tarefa...'}>
          {error ? (
            <>
              <p>{error}</p>
              <a href="#/">Voltar para os casos</a>
            </>
          ) : null}
        </CaseFile>
      ) : (
        <CaseFile caseNo={`${info.projectName} · ${info.lineName}`} title="Tarefa delegada" aside={<Stamp tone="blue">Nova pista</Stamp>}>
          <div className="task-sheet">
            <span className="dq-label">{info.section}</span>
            <h3 className="task-title">{info.title}</h3>
            {info.hint ? <p className="small muted">{info.hint}</p> : null}
          </div>
          {info.member ? (
            <form className="stack-4" onSubmit={accept}>
              <p>
                {user.name.split(' ')[0]}, ao assumir você vira o responsável por esta tarefa no quadro do time. {info.assignee && info.assignee !== user.name ? `Hoje ela está com ${info.assignee}.` : ''}
              </p>
              <Field label="Seu prazo" type="date" value={due} min={todayIso()} onChange={(e) => setDue(e.target.value)} hint={info.due ? 'O gestor sugeriu este prazo. Pode ajustar.' : 'Escolha até quando consegue entregar.'} />
              {d ? <p className={`small due-text due-${d.tone}`}>{d.text}</p> : null}
              {error ? <p className="error-text">{error}</p> : null}
              <div className="row-3">
                <Button type="submit" variant="confirm" disabled={busy || !due}>
                  {busy ? 'Assumindo...' : 'Assumir a tarefa'}
                </Button>
                <a href="#/">Agora não</a>
              </div>
            </form>
          ) : (
            <p>Você ainda não participa do caso {info.projectName}. Peça ao gestor um convite para o caso e abra este link de novo.</p>
          )}
        </CaseFile>
      )}
    </div>
  );
}
