import React, { useEffect, useState } from 'react';
import { Button, CaseFile, Field, Stamp } from '../ds/index.jsx';
import { api } from '../lib/api.js';

export default function Invite({ token, onDone }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/invites/${token}`)
      .then((d) => {
        setInfo(d);
        setForm((f) => ({ ...f, name: d.name || '' }));
      })
      .catch((e) => setError(e.message));
  }, [token]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const needsConfirm = info && (info.kind === 'reset' || !info.userExists);

  const submit = async (e) => {
    e.preventDefault();
    if (needsConfirm && form.password !== form.confirm) return setError('As senhas não conferem');
    setBusy(true);
    setError('');
    try {
      const { user, projectId } = await api(`/invites/${token}`, { method: 'POST', body: { name: form.name, password: form.password } });
      onDone(user, projectId);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  let title = 'Convite';
  let text = '';
  if (info?.kind === 'reset') {
    title = 'Nova senha';
    text = `Crie uma nova senha para ${info.email}. As sessões abertas em outros aparelhos serão encerradas.`;
  } else if (info) {
    const where = info.projectName ? `o caso ${info.projectName}` : 'o time de consultores';
    title = info.userExists ? 'Entrar no caso' : 'Criar seu acesso';
    text = info.userExists
      ? `Você foi convidado para ${where}. Confirme a senha da sua conta ${info.email} para entrar.`
      : `Você foi convidado para ${where} como ${info.role === 'gestor' ? 'gestor' : info.role === 'admin' ? 'consultor' : 'membro do time'}. Crie seu acesso com o e-mail ${info.email}.`;
  }

  return (
    <div className="lp lp-narrow">
      <header className="lp-top">
        <a className="lp-mark" href="#/">
          Dossiê ICP
        </a>
      </header>
      <div className="invite-wrap">
        <CaseFile clip caseNo="Convite" title={title} aside={info ? <Stamp tone="green">Válido</Stamp> : null}>
          {!info && !error ? <p className="muted">Conferindo o link...</p> : null}
          {!info && error ? (
            <>
              <p>{error}</p>
              <p className="small">
                <a href="#/">Ir para o login</a>
              </p>
            </>
          ) : null}
          {info ? (
            <form className="stack-4" onSubmit={submit}>
              <p>{text}</p>
              {info.kind === 'invite' && !info.userExists ? <Field label="Seu nome" required value={form.name} onChange={set('name')} autoComplete="name" /> : null}
              <Field
                label={needsConfirm ? 'Nova senha' : 'Sua senha'}
                type="password"
                required
                value={form.password}
                onChange={set('password')}
                autoComplete={needsConfirm ? 'new-password' : 'current-password'}
                hint={needsConfirm ? 'Mínimo de 8 caracteres' : undefined}
              />
              {needsConfirm ? <Field label="Repita a senha" type="password" required value={form.confirm} onChange={set('confirm')} autoComplete="new-password" /> : null}
              {error ? <p className="error-text">{error}</p> : null}
              <Button type="submit" disabled={busy}>
                {busy ? 'Entrando...' : info.kind === 'reset' ? 'Salvar nova senha' : 'Entrar no dossiê'}
              </Button>
            </form>
          ) : null}
        </CaseFile>
      </div>
    </div>
  );
}
