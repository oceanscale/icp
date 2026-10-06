import React, { useState } from 'react';
import { Button, Field } from '../ds/index.jsx';
import { api } from '../lib/api.js';
import { dueInfo, todayIso } from '../lib/format.js';
import CopyButton from './CopyButton.jsx';
import Modal from './Modal.jsx';
import Avatar from './Avatar.jsx';
import { COLUMNS } from './Board.jsx';

/** Cartão de uma tarefa do playbook: o gestor delega, define prazo e status; o responsável ajusta prazo e status. */
export default function TaskModal({ data, card, onClose, onUpdate }) {
  const pid = data.project.id;
  const isGestor = data.me.projectRole === 'gestor';
  const isOwner = card.assignee_id === data.me.id;
  const canEdit = isGestor || isOwner;
  const [form, setForm] = useState({ assigneeId: card.assignee_id || '', due: card.due || '', status: card.status });
  const [link, setLink] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const path = `/projects/${pid}/lines/${card.line_id}/tasks/${card.mission_id}`;
  const assignee = data.members.find((m) => m.id === card.assignee_id);
  const due = dueInfo(form.due, form.status === 'done');

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const body = { due: form.due, status: form.status };
      if (isGestor) body.assigneeId = form.assigneeId || null;
      onUpdate(await api(path, { method: 'PUT', body }));
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const makeLink = async () => {
    setError('');
    try {
      setLink(await api(`${path}/link`, { method: 'POST' }));
      onUpdate(await api(`/projects/${pid}`));
    } catch (err) {
      setError(err.message);
    }
  };

  const whatsText = link ? `Tarefa do caso ${data.project.name}: "${card.title}". Para assumir e definir seu prazo, abra: ${link.link}` : '';

  return (
    <Modal title="Ficha da tarefa" onClose={onClose}>
      <div className="task-sheet">
        <span className="dq-label">
          {card.line_name} · {card.section}
        </span>
        <h3 className="task-title">{card.title}</h3>
        {card.hint ? <p className="small muted">{card.hint}</p> : null}
      </div>

      {canEdit ? (
        <form className="stack-4" onSubmit={save}>
          {isGestor ? (
            <div className="dq-field">
              <label className="dq-label" htmlFor="task-who">
                Responsável
              </label>
              <select id="task-who" className="dq-field-input" value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
                <option value="">Ninguém ainda</option>
                {data.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="task-owner">
              <Avatar userId={card.assignee_id} name={assignee?.name} avatarAt={assignee?.avatar_at} size={32} /> Esta tarefa está com você.
            </p>
          )}

          <div className="task-due-row">
            <Field label="Prazo" type="date" value={form.due} min={todayIso(-365)} onChange={(e) => setForm({ ...form, due: e.target.value })} />
            <div className="task-due-quick">
              {[
                ['+2 dias', 2],
                ['+1 semana', 7],
                ['+2 semanas', 14],
              ].map(([label, n]) => (
                <button key={label} type="button" className="line-chip" onClick={() => setForm({ ...form, due: todayIso(n) })}>
                  {label}
                </button>
              ))}
              {form.due ? (
                <button type="button" className="link-btn small" onClick={() => setForm({ ...form, due: '' })}>
                  Sem prazo
                </button>
              ) : null}
            </div>
          </div>
          {due ? <p className={`small due-text due-${due.tone}`}>{due.text}</p> : null}

          <fieldset className="task-status">
            <legend className="dq-label">Onde está no quadro</legend>
            {COLUMNS.map((c) => (
              <label key={c.id} className={`task-status-opt ${form.status === c.id ? 'is-on' : ''}`}>
                <input type="radio" name="task-status" value={c.id} checked={form.status === c.id} onChange={() => setForm({ ...form, status: c.id })} />
                <span>{c.title}</span>
              </label>
            ))}
          </fieldset>
          {form.status === 'done' ? <p className="small muted">Arquivar marca o item no checklist do playbook e dá o XP para o responsável.</p> : null}

          {error ? <p className="error-text">{error}</p> : null}
          <div className="row-3">
            <Button type="submit" disabled={busy}>
              {busy ? 'Salvando...' : 'Salvar ficha'}
            </Button>
            <Button variant="quiet" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <p className="small muted">Só o gestor do caso ou quem assumiu a tarefa podem mudar esta ficha.</p>
      )}

      {isGestor ? (
        <div className="task-link">
          <span className="dq-label">Link para alguém do time assumir</span>
          <p className="small muted">
            Quem abrir o link (já participando do caso) vira o responsável e escolhe o prazo. O link vale para uma pessoa só; gerar outro cancela o anterior.
          </p>
          {link ? (
            <div className="stack-2">
              <code className="link-box">{link.link}</code>
              <div className="row-3">
                <CopyButton text={link.link} label="Copiar link" />
                <a className="dq-btn dq-btn-quiet dq-btn-sm" href={`https://wa.me/?text=${encodeURIComponent(whatsText)}`} target="_blank" rel="noreferrer">
                  Enviar no WhatsApp
                </a>
              </div>
            </div>
          ) : (
            <Button variant="quiet" size="sm" onClick={makeLink}>
              {card.link_open ? 'Gerar novo link' : 'Gerar link da tarefa'}
            </Button>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
