import React, { useState } from 'react';
import { Button, CaseFile, Field, IcpFile, Note, Stamp } from '../ds/index.jsx';
import { api } from '../lib/api.js';
import { useAutosave } from '../lib/autosave.js';
import { esc, list, printDocument } from '../lib/export.js';
import { ago, clientesReais, dateLabel } from '../lib/format.js';
import Generate from '../components/Generate.jsx';
import CopyButton from '../components/CopyButton.jsx';
import { AutosaveTip, SaveStatus } from '../components/SaveStatus.jsx';
import { Block, Downloads, KV, PastaHead } from './common.jsx';

const CLIENTE_FIELDS = [
  ['nome', 'Cliente', 'Nome ou apelido'],
  ['segmento', 'Segmento e porte', 'Setor, funcionários, faturamento, região'],
  ['dor', 'O que trouxe até vocês', 'A dor que fez procurar'],
  ['gatilho', 'Por que decidiu agora', 'O gatilho de compra'],
  ['ciclo', 'Ciclo de decisão', 'Tempo, reuniões, quem participou'],
  ['objecao', 'O que quase impediu', 'Objeção enfrentada'],
  ['ticket', 'Ticket e recorrência', 'Primeira compra, recompras'],
  ['resultado', 'Resultado entregue', 'Transformação; voltaria a comprar?'],
];
export { CLIENTE_FIELDS };
const emptyCliente = () => Object.fromEntries(CLIENTE_FIELDS.map(([k]) => [k, '']));

function perfilFields(p) {
  return [
    { label: 'Segmento e porte', value: p.segmento_porte },
    { label: 'Dor principal', value: p.dor_principal },
    { label: 'Gatilho de compra', value: p.gatilho_compra },
    { label: 'Ciclo de decisão', value: p.ciclo_decisao },
    { label: 'Decisor', value: p.decisor },
    { label: 'Objeções', value: p.objecoes },
    { label: 'Ticket e recorrência', value: p.ticket_recorrencia },
  ];
}

function Signals({ p }) {
  return (
    <div className="grid-2 signals">
      <div>
        <div className="dq-label">Sinais de encaixe</div>
        <ul className="ticks">
          {(p.sinais_de_fit || []).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
      <div>
        <div className="dq-label">Sinais de alerta</div>
        <ul className="ticks ticks-alert">
          {(p.sinais_de_alerta || []).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function exportIcp(data, line, icp) {
  const perfil = (p, titulo) => `<h2>${esc(titulo)}: ${esc(p.nome_perfil)}</h2><p><b>${esc(p.frase)}</b></p>
    <table><tbody>${perfilFields(p).map((f) => `<tr><th style="width:30%">${esc(f.label)}</th><td>${esc(f.value)}</td></tr>`).join('')}</tbody></table>
    <h3>Sinais de encaixe</h3>${list(p.sinais_de_fit || [])}<h3>Sinais de alerta</h3>${list(p.sinais_de_alerta || [])}`;
  const pe = icp.persona;
  const html = `<p class="muted">${esc(icp.nota_confianca)} (${icp.confianca === 'evidencia' ? 'baseado em clientes reais' : 'hipótese a validar'})</p>
    ${perfil(icp.principal, 'ICP principal')}${perfil(icp.secundario, 'ICP secundário')}
    <h2>Persona decisora: ${esc(pe.nome)}</h2>
    <table><tbody>${[
      ['Cargo', pe.cargo],
      ['Responsabilidades', pe.responsabilidades],
      ['Metas', pe.metas],
      ['Dores', pe.dores],
      ['O que precisa ouvir', pe.o_que_precisa_ouvir],
      ['Alçada', pe.alcada],
      ['Canais', pe.canais],
    ]
      .map(([k, v]) => `<tr><th style="width:30%">${esc(k)}</th><td>${esc(v)}</td></tr>`)
      .join('')}</tbody></table>
    <h2>O que levantar para fortalecer o ICP</h2>${list(icp.lacunas || [])}`;
  printDocument({ title: `ICP · ${line.data?.nome || ''}`, subtitle: data.project.name, html });
}

function Dinamica({ data, line, lineId, onUpdate, onUse }) {
  const pid = data.project.id;
  const active = data.dynamics?.[lineId];
  const answers = (data.answers || []).filter((a) => a.line_id === lineId);
  const [error, setError] = useState('');
  const link = active ? `${window.location.origin}/#/dinamica/${active.token}` : null;
  const act = async (fn) => {
    setError('');
    try {
      onUpdate(await fn());
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <Block title="Dinâmica com o time de vendas" aside={<span className="dq-label">{answers.length} respostas</span>}>
      <p className="small muted">
        Gere um link e mande no grupo dos vendedores. Cada um conta, sem precisar de login, sobre o melhor cliente que já atendeu nesta linha. As respostas chegam aqui, entram no contexto da IA e você escolhe quais viram cliente da entrevista.
      </p>
      {link ? (
        <div className="stack-3" style={{ marginTop: 'var(--space-3)' }}>
          <code className="link-box">{link}</code>
          <div className="row-3">
            <CopyButton text={link} label="Copiar link" />
            <Button size="sm" variant="quiet" onClick={() => window.open(link, '_blank', 'noopener')}>
              Ver como o vendedor vê
            </Button>
            <button type="button" className="link-btn small" onClick={() => window.confirm('Encerrar a dinâmica? O link para de aceitar respostas.') && act(() => api(`/projects/${pid}/lines/${lineId}/dinamica`, { method: 'DELETE' }))}>
              Encerrar dinâmica
            </button>
            <span className="small muted">Aberta até {dateLabel(active.expires_at)}</span>
          </div>
        </div>
      ) : (
        <div className="row-3" style={{ marginTop: 'var(--space-3)' }}>
          <Button variant="quiet" onClick={() => act(() => api(`/projects/${pid}/lines/${lineId}/dinamica`, { method: 'POST' }))}>
            Criar link da dinâmica
          </Button>
        </div>
      )}
      {error ? <p className="error-text">{error}</p> : null}
      {answers.length ? (
        <div className="answers">
          {answers.map((a) => (
            <article key={a.id} className="answer">
              <div className="answer-head">
                <b>{a.nome}</b>
                <span className="small muted">{ago(a.created_at)}</span>
              </div>
              {a.data.frase ? <p className="answer-frase">“{a.data.frase}”</p> : null}
              <p className="small">
                <b>{a.data.nome || 'Cliente sem nome'}</b>
                {a.data.segmento ? ` · ${a.data.segmento}` : ''}
              </p>
              <p className="small">
                <span className="dq-label">Dor</span> {a.data.dor}
              </p>
              {a.data.gatilho ? (
                <p className="small">
                  <span className="dq-label">Gatilho</span> {a.data.gatilho}
                </p>
              ) : null}
              <div className="row-3">
                <Button size="sm" variant="quiet" onClick={() => onUse(a)}>
                  Usar na entrevista
                </Button>
                <button type="button" className="link-btn small" onClick={() => window.confirm('Remover esta resposta?') && act(() => api(`/projects/${pid}/answers/${a.id}`, { method: 'DELETE' }))}>
                  remover
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </Block>
  );
}

export default function Icp({ data, line, lineId, onUpdate }) {
  const pid = data.project.id;
  const docs = data.docs[lineId] || {};
  const icp = docs.icp?.data;
  const saved = docs.icp_input?.data;
  const [input, setInput] = useState(() => ({ clientes: saved?.clientes?.length ? saved.clientes : [emptyCliente(), emptyCliente(), emptyCliente()], observacoes: saved?.observacoes || '' }));
  const [open, setOpen] = useState(saved?.clientes?.length ? -1 : 0);
  const [notice, setNotice] = useState('');
  const [portrait, setPortrait] = useState({ busy: false, error: '' });
  const image = data.images[lineId];
  const validos = input.clientes.filter((c) => c.nome.trim() && c.dor.trim()).length;

  const setCliente = (i, k, v) => setInput({ ...input, clientes: input.clientes.map((c, j) => (j === i ? { ...c, [k]: v } : c)) });
  const auto = useAutosave(input, async (v) => onUpdate(await api(`/projects/${pid}/lines/${lineId}/docs/icp_input`, { method: 'PUT', body: v })));
  const generate = async () => {
    await auto.flush();
    onUpdate(await api(`/projects/${pid}/lines/${lineId}/generate/icp`, { method: 'POST' }));
  };
  const useAnswer = (a) => {
    const c = Object.fromEntries(CLIENTE_FIELDS.map(([k]) => [k, String(a.data[k] || '')]));
    if (!c.nome) c.nome = `Cliente de ${a.nome}`;
    const empty = input.clientes.findIndex((x) => !x.nome.trim() && !x.dor.trim());
    if (empty < 0 && input.clientes.length >= 5) return setNotice('A entrevista já tem 5 clientes. Remova um para usar esta resposta.');
    const clientes = empty >= 0 ? input.clientes.map((x, i) => (i === empty ? c : x)) : [...input.clientes, c];
    setInput({ ...input, clientes });
    setOpen(empty >= 0 ? empty : clientes.length - 1);
    setNotice(`Resposta de ${a.nome} copiada para a entrevista.`);
  };
  const reveal = async () => {
    setPortrait({ busy: true, error: '' });
    try {
      onUpdate(await api(`/projects/${pid}/lines/${lineId}/portrait`, { method: 'POST' }));
      setPortrait({ busy: false, error: '' });
    } catch (err) {
      setPortrait({ busy: false, error: err.message });
    }
  };

  return (
    <div className="pasta">
      <PastaHead
        code="02"
        title={`ICP · ${line.data?.nome || ''}`}
        actions={
          <>
            <SaveStatus {...auto} onRetry={auto.flush} />
            {icp ? <Downloads onPdf={() => exportIcp(data, line, icp)} /> : null}
          </>
        }
      >
        O ICP nasce dos melhores clientes reais desta linha. Sem eles, o perfil sai como hipótese e tudo que vem depois herda o chute.
      </PastaHead>

      <AutosaveTip />
      <Block title="Entrevista de carteira" aside={<span className="dq-label">{validos}/5 clientes</span>}>
        <p className="small muted">Pegue de 3 a 5 dos melhores clientes desta linha (os que mais compram, pagam em dia e voltam). Nome e dor são obrigatórios para contar.</p>
        <div className="clientes">
          {input.clientes.map((c, i) => (
            <div key={i} className={`cliente ${open === i ? 'is-open' : ''}`}>
              <button type="button" className="cliente-head" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                <span className="dq-label">Cliente {i + 1}</span>
                <span>{c.nome || 'Sem nome'}</span>
                <span className="small muted">{c.dor ? c.dor.slice(0, 70) : 'Preencher'}</span>
              </button>
              {open === i ? (
                <div className="cliente-body grid-2">
                  {CLIENTE_FIELDS.map(([k, label, hint]) => (
                    <Field key={k} id={`cli-${i}-${k}`} label={label} placeholder={hint} value={c[k]} onChange={(e) => setCliente(i, k, e.target.value)} />
                  ))}
                  <button
                    type="button"
                    className="link-btn small danger-text"
                    onClick={() => {
                      setInput({ ...input, clientes: input.clientes.filter((_, j) => j !== i) });
                      setOpen(-1);
                    }}
                  >
                    Remover cliente
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <div className="row-3" style={{ marginTop: 'var(--space-3)' }}>
          {input.clientes.length < 5 ? (
            <Button
              size="sm"
              variant="quiet"
              onClick={() => {
                setInput({ ...input, clientes: [...input.clientes, emptyCliente()] });
                setOpen(input.clientes.length);
              }}
            >
              Adicionar cliente
            </Button>
          ) : null}
        </div>
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Field label="Observações do consultor" multiline rows={2} value={input.observacoes} onChange={(e) => setInput({ ...input, observacoes: e.target.value })} hint="O que você percebeu na carteira e que não cabe nos campos." />
        </div>
        {notice ? (
          <p className="small ok-text" role="status" style={{ marginTop: 'var(--space-3)' }}>
            {notice}
          </p>
        ) : null}
      </Block>

      <Dinamica data={data} line={line} lineId={lineId} onUpdate={onUpdate} onUse={useAnswer} />

      <Block title="Perfil do cliente ideal">
        <Generate
          label="Gerar ICP"
          has={Boolean(icp)}
          onRun={generate}
          warning={validos < 3 ? `${clientesReais(validos)}, o ICP sai como hipótese. O ideal são 3 ou mais.` : undefined}
          steps={['Lendo a entrevista de carteira...', 'Agrupando segmentos e dores...', 'Separando principal e secundário...', 'Descrevendo a persona decisora...', 'Datilografando a ficha...']}
        />
        {icp ? (
          <div className="stack-5" style={{ marginTop: 'var(--space-5)' }}>
            <IcpFile
              name={icp.principal.nome_perfil}
              summary={icp.principal.frase}
              kicker="Perfil do cliente ideal · ICP principal"
              stamp={icp.confianca === 'evidencia' ? { text: 'Clientes reais', tone: 'green' } : { text: 'Hipótese', tone: 'danger' }}
              fields={perfilFields(icp.principal)}
              photo={image ? `/api/images/${image.id}` : undefined}
              photoAlt={image?.alt || icp.persona.descricao_visual}
              caption={icp.persona.nome}
              pendingLabel={portrait.busy ? 'Revelando...' : 'Retrato em revelação'}
            >
              <Signals p={icp.principal} />
              <div className="row-3" style={{ marginTop: 'var(--space-4)' }}>
                <Button size="sm" variant={image ? 'quiet' : 'primary'} onClick={reveal} disabled={portrait.busy}>
                  {portrait.busy ? 'Revelando o retrato...' : image ? 'Revelar outro retrato' : 'Revelar retrato do decisor'}
                </Button>
                {portrait.error ? <span className="error-text small">{portrait.error}</span> : null}
              </div>
            </IcpFile>
            <p className="small muted">{icp.nota_confianca}</p>

            <CaseFile caseNo="Persona decisora" title={icp.persona.nome} subtitle={icp.persona.cargo}>
              <KV
                items={[
                  ['Responsabilidades', icp.persona.responsabilidades],
                  ['Metas', icp.persona.metas],
                  ['Dores', icp.persona.dores],
                  ['O que precisa ouvir', icp.persona.o_que_precisa_ouvir],
                  ['Alçada', icp.persona.alcada],
                  ['Canais', icp.persona.canais],
                ]}
              />
            </CaseFile>

            <CaseFile caseNo="ICP secundário" title={icp.secundario.nome_perfil} subtitle={icp.secundario.frase} aside={<Stamp tone="blue">Secundário</Stamp>}>
              <KV items={perfilFields(icp.secundario).map((f) => [f.label, f.value])} />
              <Signals p={icp.secundario} />
            </CaseFile>

            {icp.lacunas?.length ? (
              <Note title="Para fortalecer o ICP" tilt={false} className="note-wide">
                {icp.lacunas.join(' · ')}
              </Note>
            ) : null}
          </div>
        ) : null}
      </Block>
    </div>
  );
}
