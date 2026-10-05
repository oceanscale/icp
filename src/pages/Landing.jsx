import React, { useEffect, useRef, useState } from 'react';
import { Button, CaseFile, CheckMark, Field, Stamp } from '../ds/index.jsx';
import { PASTAS } from '../../shared/game.js';
import { api } from '../lib/api.js';
import { navigate } from '../lib/nav.js';

const TITLE = 'Dossiê ICP';
const TAGLINE = 'Cada empresa é um caso a resolver.';
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Datilografa o título e o subtítulo, depois libera o carimbo e o tabuleiro. */
function useTypewriter() {
  const [state, setState] = useState(() => (reducedMotion() ? { title: TITLE.length, tag: TAGLINE.length, stamp: true } : { title: 0, tag: 0, stamp: false }));
  useEffect(() => {
    if (reducedMotion()) return undefined;
    const timers = [];
    let t = 500;
    for (let i = 1; i <= TITLE.length; i++) {
      t += TITLE[i - 1] === ' ' ? 180 : 95 + ((i * 37) % 60);
      timers.push(setTimeout(() => setState((s) => ({ ...s, title: i })), t));
    }
    t += 380;
    for (let i = 1; i <= TAGLINE.length; i++) {
      t += 28;
      timers.push(setTimeout(() => setState((s) => ({ ...s, tag: i })), t));
    }
    timers.push(setTimeout(() => setState((s) => ({ ...s, stamp: true })), t + 350));
    return () => timers.forEach(clearTimeout);
  }, []);
  return state;
}

/** Peão andando pelas casas do tabuleiro, em loop. */
function useTrackLoop(start) {
  const [index, setIndex] = useState(reducedMotion() ? 3 : -1);
  useEffect(() => {
    if (!start || reducedMotion()) return undefined;
    let i = 0;
    let timer;
    const tick = () => {
      setIndex(i);
      i = i >= PASTAS.length ? 0 : i + 1;
      timer = setTimeout(tick, i === 0 ? 2200 : 650);
    };
    timer = setTimeout(tick, 300);
    return () => clearTimeout(timer);
  }, [start]);
  return index;
}

function Folders() {
  // Gaveta de pastas da capa do Design System: cada pasta sobe com um pequeno atraso.
  const folders = [
    { cls: 'ink', tab: 24, y: 8 },
    { cls: 'green', tab: 144, y: 64 },
    { cls: 'kraft', tab: 264, y: 120 },
    { cls: 'blue', tab: 352, y: 176 },
  ];
  return (
    <svg className="lp-folders" viewBox="0 0 480 320" aria-hidden="true" preserveAspectRatio="xMaxYMin slice">
      {folders.map((f, i) => (
        <g key={f.cls} className={`lp-folder lp-folder-${f.cls}`} style={{ animationDelay: `${0.25 + i * 0.18}s` }}>
          <rect x={f.tab} y={f.y} width="112" height="40" rx="6" />
          <rect x="0" y={f.y + 32} width="496" height={320 - f.y} rx="2" />
          <rect className="lp-folder-win" x={f.tab + 12} y={f.y + 12} width="64" height="8" rx="2" />
        </g>
      ))}
    </svg>
  );
}

function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { user } = await api('/login', { method: 'POST', body: { email, password } });
      onLogin(user);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <form className="stack-4" onSubmit={submit}>
      <Field label="E-mail" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field label="Senha" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} error={error || undefined} />
      <Button type="submit" disabled={busy}>
        {busy ? 'Abrindo o arquivo...' : 'Entrar no dossiê'}
      </Button>
      <p className="muted small">Acesso por convite. Esqueceu a senha? Peça ao gestor do seu caso um link de nova senha.</p>
    </form>
  );
}

function SetupForm({ onLogin }) {
  const [form, setForm] = useState({ token: '', name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { user } = await api('/setup', { method: 'POST', body: form });
      onLogin(user);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <form className="stack-4" onSubmit={submit}>
      <p className="small">Crie o primeiro acesso de consultor. O código é o segredo SETUP_TOKEN configurado no Worker.</p>
      <Field label="Código de primeiro acesso" required value={form.token} onChange={set('token')} />
      <Field label="Seu nome" required value={form.name} onChange={set('name')} autoComplete="name" />
      <Field label="E-mail" type="email" required value={form.email} onChange={set('email')} autoComplete="username" />
      <Field label="Senha" type="password" required value={form.password} onChange={set('password')} hint="Mínimo de 8 caracteres" autoComplete="new-password" error={error || undefined} />
      <Button type="submit" disabled={busy}>
        {busy ? 'Criando...' : 'Criar acesso de consultor'}
      </Button>
    </form>
  );
}

export default function Landing({ setupMode, onLogin, theme, onToggleTheme }) {
  const typed = useTypewriter();
  const index = useTrackLoop(typed.stamp);
  const [setup, setSetup] = useState(null);
  const root = useRef(null);

  useEffect(() => {
    api('/setup')
      .then(setSetup)
      .catch(() => setSetup(null));
  }, []);

  const lamp = (e) => {
    if (reducedMotion() || !root.current) return;
    const r = root.current.getBoundingClientRect();
    root.current.style.setProperty('--mx', `${e.clientX - r.left}px`);
    root.current.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  const showSetup = Boolean(setupMode);

  return (
    <div className="lp" ref={root} onPointerMove={lamp}>
      <div className="lp-lamp" aria-hidden="true" />
      <header className="lp-top">
        <span className="lp-mark">Dossiê ICP</span>
        <button type="button" className="theme-toggle" onClick={onToggleTheme} aria-label={theme === 'papel' ? 'Usar tema noturno' : 'Usar tema papel'}>
          {theme === 'papel' ? 'Noturno' : 'Papel'}
        </button>
      </header>

      <section className="lp-hero">
        <div className="lp-left">
          <div className="dq-label">Arquivo comercial · acesso restrito</div>
          <h1 className="lp-title" aria-label={TITLE}>
            <span aria-hidden="true">{TITLE.slice(0, typed.title)}</span>
            <span className={`lp-caret ${typed.title >= TITLE.length && typed.tag >= TAGLINE.length ? 'is-idle' : ''}`} aria-hidden="true" />
          </h1>
          <p className="lp-tag" aria-label={TAGLINE}>
            <span aria-hidden="true">{TAGLINE.slice(0, typed.tag)}</span>&nbsp;
          </p>
          <div className={`lp-stamp ${typed.stamp ? 'is-in' : ''}`}>
            <Stamp tone="danger">Confidencial</Stamp>
          </div>

          <ol className="lp-track" aria-label="As 8 pastas do caso">
            {PASTAS.map((p, i) => {
              const st = i < index ? 'done' : i === index ? 'current' : 'locked';
              return (
                <li key={p.id} className={`lp-sq lp-sq-${st}`}>
                  <span className="lp-sq-box">{st === 'done' ? <CheckMark size={18} /> : p.code}</span>
                  <span className="lp-sq-name">{p.label}</span>
                </li>
              );
            })}
          </ol>
          <p className="lp-level">
            <span className="dq-label">Nível do caso</span>
            <span className="lp-level-name">{index >= PASTAS.length ? 'Escalável' : index >= 6 ? 'Previsível' : index >= 4 ? 'Processo definido' : index >= 2 ? 'Estruturando' : 'Improviso'}</span>
          </p>
        </div>

        <div className="lp-right">
          <Folders />
          <CaseFile className="lp-access" clip caseNo={showSetup ? 'Primeiro acesso' : 'Ficha de acesso'} title={showSetup ? 'Abrir o arquivo' : 'Entrar no dossiê'}>
            {showSetup ? <SetupForm onLogin={onLogin} /> : <LoginForm onLogin={onLogin} />}
            {setup?.needsSetup && !showSetup ? (
              <p className="small" style={{ marginTop: 'var(--space-4)' }}>
                Sistema novo?{' '}
                <a href="#/primeiro-acesso" onClick={() => navigate('#/primeiro-acesso')}>
                  Fazer o primeiro acesso
                </a>
              </p>
            ) : null}
            {showSetup ? (
              <p className="small" style={{ marginTop: 'var(--space-4)' }}>
                <a href="#/">Voltar para o login</a>
              </p>
            ) : null}
          </CaseFile>
        </div>
      </section>

      <section className="lp-how" aria-label="Como funciona">
        {[
          ['01', 'Pasta por pasta', 'Do ICP ao custo por disparo: cada pasta entregue abre a próxima, para cada linha de produto da empresa.'],
          ['02', 'O time inteiro joga', 'Cada missão cumprida vale XP, aparece no mural e sobe o nível de maturidade comercial do caso.'],
          ['03', 'IA a partir de fatos', 'O ICP nasce dos melhores clientes reais. Roteiros, funil, anúncios e cadência saem dele.'],
        ].map(([code, title, text]) => (
          <article key={code} className="lp-how-item">
            <span className="lp-how-code">{code}</span>
            <h2 className="lp-how-title">{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>
      <footer className="lp-foot dq-label">Dossiê ICP · estruturação comercial</footer>
    </div>
  );
}
