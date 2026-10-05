import React, { useEffect, useState } from 'react';
import { Button, CaseFile, CheckMark, Field, Stamp } from '../ds/index.jsx';
import { PASTAS } from '../../shared/game.js';
import { api } from '../lib/api.js';
import { pad3 } from '../lib/format.js';
import { navigate } from '../lib/nav.js';
import CopyButton from '../components/CopyButton.jsx';
import Modal from '../components/Modal.jsx';

function MiniTrack({ track }) {
  return (
    <ol className="mini-track" aria-label="Pastas da primeira linha">
      {track.map((t) => (
        <li key={t.id} className={`mini-sq mini-sq-${t.state}`} title={`${t.code} ${t.label}: ${t.state === 'done' ? 'resolvida' : t.state === 'open' ? 'aberta' : 'trancada'}`}>
          {t.state === 'done' ? <CheckMark size={12} /> : t.code}
        </li>
      ))}
    </ol>
  );
}

function NewCase({ onCreated }) {
  const [form, setForm] = useState({ name: '', segment: '', city: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { id } = await api('/projects', { method: 'POST', body: form });
      onCreated(id);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <form className="stack-4" onSubmit={submit}>
      <Field label="Empresa" required value={form.name} onChange={set('name')} placeholder="Nome da empresa atendida" />
      <Field label="Segmento" value={form.segment} onChange={set('segment')} placeholder="Ex.: Odontologia, SaaS B2B, Indústria" />
      <Field label="Cidade" value={form.city} onChange={set('city')} placeholder="Ex.: Campinas, SP" error={error || undefined} />
      <Button type="submit" disabled={busy}>
        {busy ? 'Abrindo...' : 'Abrir caso'}
      </Button>
    </form>
  );
}

function InviteConsultant() {
  const [form, setForm] = useState({ name: '', email: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setResult(await api('/consultores/convite', { method: 'POST', body: form }));
    } catch (err) {
      setError(err.message);
    }
  };
  if (result) {
    return (
      <div className="stack-3">
        <p>
          Envie este link para <b>{result.email}</b>. Ele vale 7 dias e só pode ser usado uma vez.
        </p>
        <code className="link-box">{result.link}</code>
        <CopyButton text={result.link} label="Copiar link" />
      </div>
    );
  }
  return (
    <form className="stack-4" onSubmit={submit}>
      <p className="small muted">Consultores abrem casos, veem todos os casos e convidam pessoas.</p>
      <Field label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Field label="E-mail" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={error || undefined} />
      <Button type="submit">Gerar convite</Button>
    </form>
  );
}

export default function Cases({ user }) {
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const admin = user.role === 'admin';

  useEffect(() => {
    api('/projects')
      .then((d) => setProjects(d.projects))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="dq-label">Arquivo</div>
          <h1 className="page-title">Casos</h1>
          <p className="muted">{admin ? 'Todas as empresas em estruturação comercial.' : 'As empresas em que você participa.'}</p>
        </div>
        {admin ? (
          <div className="row-3">
            <Button variant="quiet" onClick={() => setModal('consultor')}>
              Convidar consultor
            </Button>
            <Button onClick={() => setModal('caso')}>Abrir novo caso</Button>
          </div>
        ) : null}
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      {!projects && !error ? <p className="muted">Abrindo o arquivo...</p> : null}
      {projects && projects.length === 0 ? (
        <CaseFile caseNo="Arquivo vazio" title={admin ? 'Nenhum caso aberto ainda' : 'Você ainda não participa de nenhum caso'}>
          <p>{admin ? 'Abra o primeiro caso com o nome da empresa que você está estruturando.' : 'Peça ao consultor ou ao gestor da sua empresa um convite para o caso.'}</p>
        </CaseFile>
      ) : null}

      <div className="case-grid">
        {(projects || []).map((p) => (
          <button key={p.id} type="button" className="case-card dq-case" onClick={() => navigate(`#/caso/${p.id}`)}>
            <div className="case-card-top">
              <span className="dq-label">Caso Nº {pad3(p.number)}</span>
              {p.resolved >= PASTAS.length ? <Stamp tone="green">Resolvido</Stamp> : null}
            </div>
            <h2 className="case-card-name">{p.name}</h2>
            <p className="muted small">{[p.segment, p.city].filter(Boolean).join(' · ') || 'Sem segmento'}</p>
            <MiniTrack track={p.track} />
            <div className="case-card-foot">
              <span className="case-level">{p.level.label}</span>
              <span className="dq-label">{p.xp} XP</span>
            </div>
            <div className="case-card-meta small muted">
              {p.lines.length ? `${p.lines.length} ${p.lines.length === 1 ? 'linha' : 'linhas'}: ${p.lines.join(', ')}` : 'Nenhuma linha de produto'} · {p.members}{' '}
              {p.members === 1 ? 'pessoa' : 'pessoas'}
            </div>
          </button>
        ))}
      </div>

      {modal === 'caso' ? (
        <Modal title="Abrir novo caso" onClose={() => setModal(null)}>
          <NewCase onCreated={(id) => navigate(`#/caso/${id}`)} />
        </Modal>
      ) : null}
      {modal === 'consultor' ? (
        <Modal title="Convidar consultor" onClose={() => setModal(null)}>
          <InviteConsultant />
        </Modal>
      ) : null}
    </div>
  );
}
