import React, { useCallback, useEffect, useState } from 'react';
import { api, setUnauthorizedHandler } from './lib/api.js';
import Landing from './pages/Landing.jsx';
import Invite from './pages/Invite.jsx';
import Dinamica from './pages/Dinamica.jsx';
import Cases from './pages/Cases.jsx';
import CasePage from './pages/Case.jsx';
import TopBar from './components/TopBar.jsx';
import { navigate } from './lib/nav.js';

// Rotas por hash: #/ · #/convite/<token> · #/primeiro-acesso · #/caso/<id>[/<linha>/<pasta>]
function parseRoute() {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'convite' && parts[1]) return { name: 'invite', token: parts[1] };
  if (parts[0] === 'primeiro-acesso') return { name: 'setup' };
  if (parts[0] === 'recuperar') return { name: 'recover' };
  if (parts[0] === 'dinamica' && parts[1]) return { name: 'dinamica', token: parts[1] };
  if (parts[0] === 'caso' && parts[1]) return { name: 'case', pid: parts[1], lid: parts[2] || null, pasta: parts[3] || null };
  return { name: 'home' };
}

export default function App() {
  const [user, setUser] = useState(undefined);
  const [route, setRoute] = useState(parseRoute);
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'papel');

  useEffect(() => {
    const onHash = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    api('/me')
      .then((d) => setUser(d.user))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'noturno' ? '#131b26' : '#f4efe2');
    try {
      localStorage.setItem('dq-theme', theme);
    } catch {
      /* navegação privada: o tema volta ao padrão na próxima visita */
    }
  }, [theme]);

  const logout = useCallback(async () => {
    await api('/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    navigate('#/');
  }, []);

  const toggleTheme = () => setTheme((t) => (t === 'papel' ? 'noturno' : 'papel'));

  // A dinâmica é pública: abre com ou sem login.
  if (route.name === 'dinamica') return <Dinamica token={route.token} />;

  if (user === undefined) return <div className="app-loading" aria-busy="true" />;

  if (route.name === 'invite') return <Invite token={route.token} onDone={(u, pid) => { setUser(u); navigate(pid ? `#/caso/${pid}` : '#/'); }} />;

  if (!user) return <Landing mode={route.name} onLogin={(u) => { setUser(u); if (route.name === 'setup' || route.name === 'recover') navigate('#/'); }} theme={theme} onToggleTheme={toggleTheme} />;

  return (
    <div className="app">
      <TopBar user={user} theme={theme} onToggleTheme={toggleTheme} onLogout={logout} onUserChange={setUser} />
      <main className="app-main">
        {route.name === 'case' ? <CasePage key={route.pid} route={route} user={user} /> : <Cases user={user} />}
      </main>
    </div>
  );
}
