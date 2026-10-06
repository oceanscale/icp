import React, { useState } from 'react';
import { Button, Field } from '../ds/index.jsx';
import { api } from '../lib/api.js';
import { dueInfo, todayIso } from '../lib/format.js';
import CopyButton from './CopyButton.jsx';
import Modal from './Modal.jsx';
import Avatar from './Avatar.jsx';
import { COLUMNS, cardPath } from './Board.jsx';

/**
 * Ficha de um cartão do quadro. O gestor delega, define prazo e coluna, e cria, edita ou tira cartões extras;
 * o responsável ajusta prazo e coluna. Sem `card`, abre em branco para o gestor pregar um cartão novo.
 */
export default function TaskModal({ data, card, onClose, onUpdate }) {
  const pid = data.project.id;
  const creating = !card;
  const columns = data.board?.columns || COLUMNS;
  const isGestor = data.me.projectRole === 'gestor';
  const isOwner = Boolean(card && card.assignee_id === data.me.id);
  const canEdit = isGestor || isOwner;
  const editText = isGestor && (creating || card.custom);
  const [form, setForm] = useState({
    title: card?.title || '',
    note: card?.custom ? card.hint || '' : '',
    lineId: card ? card.line_id : '',
    assigneeId: card?.assignee_id || '',
    due: card?.due || '',
    status: card?.status || columns[0].id,
  });
  const [moved, setMoved] = useState(false);
  const [link, setLink] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const path = card ? cardPath(pid, card) : null;
  const assignee = card && data.members.find((m) => m.id === card.assignee_id);
  // Cartão novo com responsável começa na coluna de trabalho, a não ser que o gestor escolha outra.
  const status = creating && !moved ? (form.assigneeId && columns.length > 2 ? columns[1].id : columns[0].id) : form.status;
  const due = dueInfo(form.due, status === 'done');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const body = { due: form.due, status };
      if (isGestor) body.assigneeId = form.assigneeId || null;
      if (editText) Object.assign(body, { title: form.title, note: form.note, lineId: form.lineId });
      onUpdate(await api(creating ? `/projects/${pid}/cards` : path, { method: creating ? 'POST' : 'PUT', body }));
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Tirar o cartão “${card.title}” do quadro?`)) return;
    setError('');
    try {
      onUpdate(await api(path, { method: 'DELETE' }));
      onClose();
    } catch (err) {
      setError(err.message);
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
    <Modal title={creating ? 'Novo cartão' : 'Ficha da tarefa'} onClose={onClose}>
      {!editText ? (
        <div className="task-sheet">
          <span className="dq-label">
            {card.line_name} · {card.section}
          </span>
          <h3 className="task-title">{card.title}</h3>
          {card.hint ? <p className="small muted">{card.hint}</p> : null}
        </div>
      ) : null}

      {canEdit ? (
        <form className="stack-4" onSubmit={save}>
          {editText ? (
            <>
              <Field label="Título do cartão" required maxLength={120} value={form.title} onChange={set('title')} placeholder="Ex.: Ligar para os 10 leads parados da feira" />
              <Field label="Descrição (opcional)" multiline rows={2} maxLength={600} value={form.note} onChange={set('note')} />
              <div className="dq-field">
                <label className="dq-label" htmlFor="task-line">
                  Linha de produto
                </label>
                <select id="task-line" className="dq-field-input" value={form.lineId} onChange={set('lineId')}>
                  <option value="">Caso todo</option>
                  {data.lines.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.data?.nome || 'Sem nome'}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : null}
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
            {columns.map((c) => (
              <label key={c.id} className={`task-status-opt ${status === c.id ? 'is-on' : ''}`}>
                <input type="radio" name="task-status" value={c.id} checked={status === c.id} onChange={() => (setMoved(true), setForm({ ...form, status: c.id }))} />
                <span>{c.title}</span>
              </label>
            ))}
          </fieldset>
          {status === 'done' ? (
            <p className="small muted">
              {editText ? 'Arquivar conta para o pódio do quadro de quem entregou.' : 'Arquivar marca o item no checklist do playbook, dá o XP e conta para o pódio do responsável.'}
            </p>
          ) : null}

          {error ? <p className="error-text">{error}</p> : null}
          <div className="row-3">
            <Button type="submit" disabled={busy}>
              {busy ? 'Salvando...' : creating ? 'Pregar no quadro' : 'Salvar ficha'}
            </Button>
            <Button variant="quiet" onClick={onClose}>
              Cancelar
            </Button>
            {card?.custom && isGestor ? (
              <button type="button" className="link-btn small danger-text" onClick={remove}>
                Tirar do quadro
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <p className="small muted">Só o gestor do caso ou quem assumiu a tarefa podem mudar esta ficha.</p>
      )}

      {isGestor && !creating ? (
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
