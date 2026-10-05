import React, { useState } from 'react';
import { Button, Field } from '../ds/index.jsx';
import { api } from '../lib/api.js';
import Modal from './Modal.jsx';

export default function TopBar({ user, theme, onToggleTheme, onLogout }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [msg, setMsg] = useState({ error: '', ok: '' });

  const save = async (e) => {
    e.preventDefault();
    if (pw.next !== pw.confirm) return setMsg({ error: 'As senhas não conferem', ok: '' });
    try {
      await api('/password', { method: 'POST', body: { current: pw.current, next: pw.next } });
      setMsg({ error: '', ok: 'Senha alterada.' });
      setPw({ current: '', next: '', confirm: '' });
    } catch (err) {
      setMsg({ error: err.message, ok: '' });
    }
  };

  return (
    <header className="topbar">
      <a href="#/" className="topbar-mark">
        Dossiê ICP
      </a>
      <nav className="topbar-nav" aria-label="Principal">
        <a href="#/">Casos</a>
      </nav>
      <div className="topbar-right">
        <button type="button" className="theme-toggle" onClick={onToggleTheme} aria-label={theme === 'papel' ? 'Usar tema noturno' : 'Usar tema papel'}>
          {theme === 'papel' ? 'Noturno' : 'Papel'}
        </button>
        <button type="button" className="topbar-user" onClick={() => setOpen(true)}>
          <span className="avatar" aria-hidden="true">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="topbar-name">{user.name}</span>
          {user.role === 'admin' ? <span className="dq-chip">Consultor</span> : null}
        </button>
      </div>
      {open ? (
        <Modal title="Sua conta" onClose={() => { setOpen(false); setMsg({ error: '', ok: '' }); }}>
          <p className="muted small">{user.email}</p>
          <form className="stack-4" onSubmit={save}>
            <Field label="Senha atual" type="password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" />
            <Field label="Nova senha" type="password" required value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} hint="Mínimo de 8 caracteres" autoComplete="new-password" />
            <Field label="Repita a nova senha" type="password" required value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" />
            {msg.error ? <p className="error-text">{msg.error}</p> : null}
            {msg.ok ? <p className="ok-text">{msg.ok}</p> : null}
            <div className="row-3">
              <Button type="submit" variant="quiet">
                Alterar senha
              </Button>
              <Button onClick={onLogout}>Sair</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </header>
  );
}
