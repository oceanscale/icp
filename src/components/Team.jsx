import React, { useState } from 'react';
import { Button, Field } from '../ds/index.jsx';
import { api } from '../lib/api.js';
import { dateLabel } from '../lib/format.js';
import CopyButton from './CopyButton.jsx';
import Modal from './Modal.jsx';
import Avatar from './Avatar.jsx';

/** Time do caso. O gestor convida por link (vale 7 dias), muda papéis, gera link de nova senha e remove pessoas. */
export default function Team({ data, onUpdate }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'membro' });
  const [link, setLink] = useState(null);
  const [error, setError] = useState('');
  const pid = data.project.id;
  const canManage = data.me.projectRole === 'gestor';

  const close = () => {
    setModal(null);
    setLink(null);
    setError('');
  };
  const invite = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const r = await api(`/projects/${pid}/invites`, { method: 'POST', body: form });
      setLink(r);
      setForm({ name: '', email: '', role: 'membro' });
      onUpdate(await api(`/projects/${pid}`));
    } catch (err) {
      setError(err.message);
    }
  };
  const act = async (fn) => {
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="aside-block">
      <div className="aside-head">
        <h3 className="dq-check-title">Time do caso</h3>
        {canManage ? (
          <Button size="sm" variant="quiet" onClick={() => setModal('invite')}>
            Convidar
          </Button>
        ) : null}
      </div>
      <ul className="team">
        {data.members.map((m) => (
          <li key={m.id} className="team-row">
            <Avatar userId={m.id} name={m.name} avatarAt={m.avatar_at} />
            <span className="team-name">
              {m.name}
              <span className="small muted"> {m.user_role === 'admin' ? 'consultor' : m.role}</span>
            </span>
            {canManage && m.id !== data.me.id ? (
              <button type="button" className="link-btn small" onClick={() => setModal(m)}>
                Gerenciar
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {data.members.length <= 1 ? (
        <p className="small muted" style={{ margin: 'var(--space-2) 0 0' }}>
          Só você por enquanto. Quem aceitar o convite entra no time, pode receber tarefas no quadro e aparece na capa do dossiê.
        </p>
      ) : null}
      {canManage && data.invites.length ? (
        <div className="small muted" style={{ marginTop: 'var(--space-2)' }}>
          Convites pendentes:{' '}
          {data.invites.map((i) => (
            <span key={i.email} className="pending">
              {i.name || i.email} (até {dateLabel(i.expires_at)}){' '}
              <button type="button" className="link-btn" onClick={() => act(async () => onUpdate(await api(`/projects/${pid}/invites`, { method: 'DELETE', body: { email: i.email } })))}>
                cancelar
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {error && !modal ? <p className="error-text">{error}</p> : null}

      {modal === 'invite' ? (
        <Modal title="Convidar para o caso" onClose={close}>
          {link ? (
            <div className="stack-3">
              <p>
                Envie este link para <b>{link.email}</b> pelo WhatsApp ou e-mail. Vale 7 dias e só pode ser usado uma vez.
              </p>
              <code className="link-box">{link.link}</code>
              <div className="row-3">
                <CopyButton text={link.link} label="Copiar link" />
                <Button variant="quiet" size="sm" onClick={() => setLink(null)}>
                  Convidar outra pessoa
                </Button>
              </div>
            </div>
          ) : (
            <form className="stack-4" onSubmit={invite}>
              <Field label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Field label="E-mail" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <div className="dq-field">
                <label className="dq-label" htmlFor="role-select">
                  Papel
                </label>
                <select id="role-select" className="dq-field-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="membro">Membro: gera pastas e cumpre missões</option>
                  <option value="gestor">Gestor: também convida e gerencia o time</option>
                </select>
              </div>
              {error ? <p className="error-text">{error}</p> : null}
              <Button type="submit">Gerar link de convite</Button>
            </form>
          )}
        </Modal>
      ) : null}

      {modal && typeof modal === 'object' ? (
        <Modal title={modal.name} onClose={close}>
          <p className="muted small">
            {modal.email} · {modal.role}
          </p>
          {link ? (
            <div className="stack-3">
              <p>Link de nova senha para {link.email}. Vale 48 horas.</p>
              <code className="link-box">{link.link}</code>
              <CopyButton text={link.link} label="Copiar link" />
            </div>
          ) : (
            <div className="stack-3">
              <Button variant="quiet" onClick={() => act(async () => setLink(await api(`/projects/${pid}/members/${modal.id}/reset`, { method: 'POST' })))}>
                Gerar link de nova senha
              </Button>
              <Button
                variant="quiet"
                onClick={() =>
                  act(async () => {
                    onUpdate(await api(`/projects/${pid}/members/${modal.id}`, { method: 'PUT', body: { role: modal.role === 'gestor' ? 'membro' : 'gestor' } }));
                    close();
                  })
                }
              >
                {modal.role === 'gestor' ? 'Tornar membro' : 'Tornar gestor'}
              </Button>
              <Button
                variant="quiet"
                onClick={() =>
                  window.confirm(`Remover ${modal.name} do caso?`) &&
                  act(async () => {
                    onUpdate(await api(`/projects/${pid}/members/${modal.id}`, { method: 'DELETE' }));
                    close();
                  })
                }
              >
                Remover do caso
              </Button>
            </div>
          )}
          {error ? <p className="error-text">{error}</p> : null}
        </Modal>
      ) : null}
    </section>
  );
}
