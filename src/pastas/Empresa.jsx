import React, { useEffect, useState } from 'react';
import { Button, Field } from '../ds/index.jsx';
import { api } from '../lib/api.js';
import { Block, PastaHead } from './common.jsx';

const EMPRESA_FIELDS = [
  ['pitch', 'Elevator pitch', 'Quem vocês são e o que fazem, em até 3 frases.'],
  ['missao', 'Missão e visão', 'Para que a empresa existe e onde quer chegar.'],
  ['diferenciais', 'Diferenciais competitivos', 'Por que o cliente compra de vocês e não do concorrente.'],
  ['concorrentes', 'Principais concorrentes', 'Nomes e o que cada um faz melhor ou pior.'],
  ['time', 'Time comercial hoje', 'Quantas pessoas, quem prospecta, quem fecha, quem cuida da carteira.'],
  ['ferramentas', 'Ferramentas', 'CRM, plataforma de WhatsApp oficial, discador, agenda, e-mail.'],
];

const LINE_FIELDS = [
  ['nome', 'Nome da linha', 'Ex.: Implantes, Plano anual, Consultoria de implantação.', false],
  ['como_funciona', 'Como funciona', 'O que o cliente recebe, em poucas frases.', true],
  ['dor', 'Dor que resolve', 'Por que o comprador quer esse produto.', true],
  ['preco', 'Preço e modelo de cobrança', 'Ex.: R$ 4.800 à vista ou 10x; mensalidade de R$ 900.', false],
  ['ticket', 'Ticket médio e recorrência', 'Valor médio da primeira compra e se há recompra.', false],
  ['ciclo', 'Ciclo de venda hoje', 'Quanto tempo leva do primeiro contato ao fechamento.', false],
  ['concorrentes', 'Concorrentes e diferencial desta linha', '', true],
];

function LineForm({ data, line, onUpdate, onCancel, onDone }) {
  const [form, setForm] = useState(() => Object.fromEntries(LINE_FIELDS.map(([k]) => [k, line?.data?.[k] || ''])));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pid = data.project.id;
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (line) onUpdate(await api(`/projects/${pid}/lines/${line.id}`, { method: 'PUT', body: form }));
      else onUpdate(await api(`/projects/${pid}/lines`, { method: 'POST', body: form }));
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!window.confirm(`Remover a linha ${line.data?.nome}? Todas as pastas dela serão apagadas.`)) return;
    try {
      onUpdate(await api(`/projects/${pid}/lines/${line.id}`, { method: 'DELETE' }));
      onDone();
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <form className="line-form stack-4" onSubmit={save}>
      <div className="grid-2">
        {LINE_FIELDS.map(([k, label, hint, multi]) => (
          <Field key={k} label={label} hint={hint || undefined} multiline={multi} rows={multi ? 3 : undefined} required={k === 'nome'} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
        ))}
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="row-3">
        <Button type="submit" disabled={busy}>
          {busy ? 'Salvando...' : line ? 'Salvar linha' : 'Cadastrar linha'}
        </Button>
        <Button variant="quiet" onClick={onCancel}>
          Cancelar
        </Button>
        {line && data.me.projectRole === 'gestor' ? (
          <button type="button" className="link-btn danger-text" onClick={remove}>
            Remover linha
          </button>
        ) : null}
      </div>
    </form>
  );
}

export default function Empresa({ data, onUpdate }) {
  const [form, setForm] = useState(() => Object.fromEntries(EMPRESA_FIELDS.map(([k]) => [k, data.empresa?.data?.[k] || ''])));
  const [meta, setMeta] = useState({ name: data.project.name, segment: data.project.segment || '', city: data.project.city || '' });
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState(data.lines.length ? null : 'new');
  const pid = data.project.id;
  const isGestor = data.me.projectRole === 'gestor';

  useEffect(() => {
    if (!data.lines.length) setEditing('new');
  }, [data.lines.length]);

  const save = async (e) => {
    e.preventDefault();
    setStatus('Salvando...');
    try {
      if (isGestor && (meta.name !== data.project.name || meta.segment !== (data.project.segment || '') || meta.city !== (data.project.city || ''))) {
        await api(`/projects/${pid}`, { method: 'PUT', body: meta });
      }
      onUpdate(await api(`/projects/${pid}/empresa`, { method: 'PUT', body: form }));
      setStatus('Pasta salva.');
    } catch (err) {
      setStatus(err.message);
    }
  };

  return (
    <div className="pasta">
      <PastaHead code="01" title="Empresa">
        A base do caso: quem é a empresa, como vende hoje e quais linhas de produto vão ganhar um processo comercial próprio.
      </PastaHead>

      <form className="stack-5" onSubmit={save}>
        {isGestor ? (
          <Block title="Dados do caso">
            <div className="grid-3">
              <Field label="Empresa" required value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} />
              <Field label="Segmento" value={meta.segment} onChange={(e) => setMeta({ ...meta, segment: e.target.value })} />
              <Field label="Cidade" value={meta.city} onChange={(e) => setMeta({ ...meta, city: e.target.value })} />
            </div>
          </Block>
        ) : null}
        <Block title="Sobre a empresa">
          <div className="grid-2">
            {EMPRESA_FIELDS.map(([k, label, hint]) => (
              <Field key={k} label={label} hint={hint} multiline rows={3} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            ))}
          </div>
        </Block>
        <div className="row-3">
          <Button type="submit">Salvar pasta</Button>
          {status ? (
            <span className="small muted" role="status">
              {status}
            </span>
          ) : null}
        </div>
      </form>

      <Block
        title="Linhas de produto"
        aside={
          editing !== 'new' ? (
            <Button size="sm" variant="quiet" onClick={() => setEditing('new')}>
              Nova linha
            </Button>
          ) : null
        }
      >
        <p className="small muted">Cada linha tem o próprio ICP, playbook, roteiros, funil, anúncios, automações e simulador.</p>
        <ul className="lines-list">
          {data.lines.map((l) => (
            <li key={l.id} className="line-item">
              {editing === l.id ? (
                <LineForm data={data} line={l} onUpdate={onUpdate} onCancel={() => setEditing(null)} onDone={() => setEditing(null)} />
              ) : (
                <div className="line-row">
                  <div>
                    <b>{l.data?.nome || 'Sem nome'}</b>
                    <p className="small muted">{[l.data?.preco, l.data?.dor].filter(Boolean).join(' · ')}</p>
                  </div>
                  <Button size="sm" variant="quiet" onClick={() => setEditing(l.id)}>
                    Editar
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
        {editing === 'new' ? <LineForm data={data} onUpdate={onUpdate} onCancel={() => setEditing(data.lines.length ? null : 'new')} onDone={() => setEditing(null)} /> : null}
      </Block>
    </div>
  );
}
