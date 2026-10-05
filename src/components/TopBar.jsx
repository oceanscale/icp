import React, { useState } from 'react';
import { Button, Field } from '../ds/index.jsx';
import { api } from '../lib/api.js';
import Modal from './Modal.jsx';
import Avatar, { squareImage } from './Avatar.jsx';

export default function TopBar({ user, theme, onToggleTheme, onLogout, onUserChange }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [msg, setMsg] = useState({ error: '', ok: '' });
  const [photo, setPhoto] = useState('');

  const changePhoto = async (file) => {
    if (!file) return;
    setPhoto('Enviando...');
    try {
      const data = await squareImage(file);
      const { user: next } = await api('/me/avatar', { method: 'PUT', body: { mime: 'image/jpeg', data } });
      onUserChange(next);
      setPhoto('Foto atualizada.');
    } catch (err) {
      setPhoto(err.message);
    }
  };
  const removePhoto = async () => {
    try {
      const { user: next } = await api('/me/avatar', { method: 'DELETE' });
      onUserChange(next);
      setPhoto('Foto removida.');
    } catch (err) {
      setPhoto(err.message);
    }
  };

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
          <Avatar userId={user.id} name={user.name} avatarAt={user.avatarAt} />
          <span className="topbar-name">{user.name}</span>
          {user.role === 'admin' ? <span className="dq-chip">Consultor</span> : null}
        </button>
      </div>
      {open ? (
        <Modal title="Sua conta" onClose={() => { setOpen(false); setMsg({ error: '', ok: '' }); }}>
          <div className="profile-photo">
            <Avatar userId={user.id} name={user.name} avatarAt={user.avatarAt} size={72} />
            <div className="stack-3">
              <p className="small">
                <b>{user.name}</b>
                <br />
                <span className="muted">{user.email}</span>
              </p>
              <div className="row-3">
                <label className="dq-btn dq-btn-quiet dq-btn-sm file-btn">
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => changePhoto(e.target.files?.[0])} />
                  {user.avatarAt ? 'Trocar foto' : 'Escolher foto'}
                </label>
                {user.avatarAt ? (
                  <button type="button" className="link-btn small" onClick={removePhoto}>
                    remover
                  </button>
                ) : null}
              </div>
              {photo ? (
                <p className="small muted" role="status">
                  {photo}
                </p>
              ) : null}
            </div>
          </div>
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
