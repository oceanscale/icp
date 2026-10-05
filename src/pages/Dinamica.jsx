import React, { useEffect, useState } from 'react';
import { Button, CaseFile, Field, Stamp } from '../ds/index.jsx';
import { api } from '../lib/api.js';
import { CLIENTE_FIELDS } from '../pastas/Icp.jsx';

const empty = () => ({ nome: '', cliente: Object.fromEntries(CLIENTE_FIELDS.map(([k]) => [k, ''])), frase: '' });

/** Formulário público da dinâmica do ICP: o vendedor responde sem login, pelo link do grupo. */
export default function Dinamica({ token }) {
  const draftKey = `dq-dinamica-${token}`;
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(draftKey)) || empty();
    } catch {
      return empty();
    }
  });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/dinamica/${token}`)
      .then(setInfo)
      .catch((e) => setError(e.message));
  }, [token]);

  // Rascunho guardado neste aparelho até enviar.
  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(form));
    } catch {
      /* navegação privada */
    }
  }, [form, draftKey]);

  const setCliente = (k) => (e) => setForm({ ...form, cliente: { ...form.cliente, [k]: e.target.value } });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(`/dinamica/${token}`, { method: 'POST', body: form });
      setSent(true);
      const next = { ...empty(), nome: form.nome };
      setForm(next);
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lp lp-narrow">
      <header className="lp-top">
        <span className="lp-mark">Dossiê ICP</span>
        <span className="dq-label">Dinâmica do ICP</span>
      </header>
      <div className="dyn-wrap">
        {!info && !error ? <p className="muted">Abrindo a dinâmica...</p> : null}
        {!info && error ? (
          <CaseFile caseNo="Dinâmica" title="Link encerrado">
            <p>{error}</p>
          </CaseFile>
        ) : null}
        {info ? (
          <CaseFile clip caseNo={`Dinâmica · ${info.projectName}`} title={`Seu melhor cliente${info.lineName ? ` de ${info.lineName}` : ''}`} aside={sent ? <Stamp tone="green">Resposta registrada</Stamp> : null}>
            {sent ? (
              <div className="stack-4">
                <p>Obrigado. Sua resposta já está no dossiê do caso e vai ajudar a definir o cliente ideal.</p>
                <Button variant="quiet" onClick={() => setSent(false)}>
                  Contar sobre outro cliente
                </Button>
              </div>
            ) : (
              <form className="stack-4" onSubmit={submit}>
                <p>
                  Pense no <b>melhor cliente que você já atendeu</b>: o que comprou fácil, pagou em dia e voltou. Responda como numa conversa; não precisa de frase bonita. Seu rascunho fica guardado neste aparelho até você enviar.
                </p>
                <Field label="Seu nome" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} autoComplete="name" />
                <div className="grid-2">
                  {CLIENTE_FIELDS.map(([k, label, hint]) => (
                    <Field
                      key={k}
                      id={`dyn-${k}`}
                      label={k === 'dor' ? `${label} *` : label}
                      required={k === 'dor'}
                      placeholder={hint}
                      multiline={['dor', 'gatilho', 'resultado'].includes(k)}
                      rows={2}
                      value={form.cliente[k]}
                      onChange={setCliente(k)}
                    />
                  ))}
                </div>
                <Field label="O cliente ideal em uma frase" multiline rows={2} placeholder="Ex.: clínica de bairro com agenda cheia que perde paciente no orçamento" value={form.frase} onChange={(e) => setForm({ ...form, frase: e.target.value })} />
                {error ? <p className="error-text">{error}</p> : null}
                <Button type="submit" disabled={busy}>
                  {busy ? 'Enviando...' : 'Enviar resposta'}
                </Button>
                <p className="small muted">Aberta até {new Date(info.expiresAt).toLocaleDateString('pt-BR')} · {info.answers} respostas até agora</p>
              </form>
            )}
          </CaseFile>
        ) : null}
      </div>
    </div>
  );
}
