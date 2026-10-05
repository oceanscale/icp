import React, { useState } from 'react';
import { Button, CaseFile, Field, IcpFile, Note, Stamp } from '../ds/index.jsx';
import { api } from '../lib/api.js';
import { downloadText, esc, list, printDocument } from '../lib/export.js';
import Generate from '../components/Generate.jsx';
import { Block, Downloads, KV, PastaHead, slug } from './common.jsx';

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

function icpMarkdown(data, line, icp) {
  const p = (x, t) => `## ${t}: ${x.nome_perfil}\n\n**${x.frase}**\n\n${perfilFields(x).map((f) => `- **${f.label}:** ${f.value}`).join('\n')}\n\n**Sinais de encaixe:** ${(x.sinais_de_fit || []).join('; ')}\n\n**Sinais de alerta:** ${(x.sinais_de_alerta || []).join('; ')}\n`;
  const pe = icp.persona;
  return `# ICP · ${line.data?.nome || ''} · ${data.project.name}\n\n_${icp.nota_confianca}_\n\n${p(icp.principal, 'ICP principal')}\n${p(icp.secundario, 'ICP secundário')}\n## Persona: ${pe.nome}\n\n- **Cargo:** ${pe.cargo}\n- **Responsabilidades:** ${pe.responsabilidades}\n- **Metas:** ${pe.metas}\n- **Dores:** ${pe.dores}\n- **O que precisa ouvir:** ${pe.o_que_precisa_ouvir}\n- **Alçada:** ${pe.alcada}\n- **Canais:** ${pe.canais}\n\n## Lacunas\n\n${(icp.lacunas || []).map((l) => `- ${l}`).join('\n')}\n`;
}

export default function Icp({ data, line, lineId, onUpdate }) {
  const pid = data.project.id;
  const docs = data.docs[lineId] || {};
  const icp = docs.icp?.data;
  const saved = docs.icp_input?.data;
  const [input, setInput] = useState(() => ({ clientes: saved?.clientes?.length ? saved.clientes : [emptyCliente(), emptyCliente(), emptyCliente()], observacoes: saved?.observacoes || '' }));
  const [open, setOpen] = useState(saved?.clientes?.length ? -1 : 0);
  const [status, setStatus] = useState('');
  const [portrait, setPortrait] = useState({ busy: false, error: '' });
  const image = data.images[lineId];
  const validos = input.clientes.filter((c) => c.nome.trim() && c.dor.trim()).length;

  const setCliente = (i, k, v) => setInput({ ...input, clientes: input.clientes.map((c, j) => (j === i ? { ...c, [k]: v } : c)) });
  const saveInput = async () => {
    setStatus('Salvando...');
    try {
      onUpdate(await api(`/projects/${pid}/lines/${lineId}/docs/icp_input`, { method: 'PUT', body: input }));
      setStatus('Entrevista salva.');
    } catch (err) {
      setStatus(err.message);
    }
  };
  const generate = async () => {
    await api(`/projects/${pid}/lines/${lineId}/docs/icp_input`, { method: 'PUT', body: input });
    onUpdate(await api(`/projects/${pid}/lines/${lineId}/generate/icp`, { method: 'POST' }));
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
        actions={icp ? <Downloads onPdf={() => exportIcp(data, line, icp)} onMd={() => downloadText(`icp-${slug(line.data?.nome)}.md`, icpMarkdown(data, line, icp))} /> : null}
      >
        O ICP nasce dos melhores clientes reais desta linha. Sem eles, o perfil sai como hipótese e tudo que vem depois herda o chute.
      </PastaHead>

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
        <div className="row-3" style={{ marginTop: 'var(--space-3)' }}>
          <Button variant="quiet" onClick={saveInput}>
            Salvar entrevista
          </Button>
          {status ? (
            <span className="small muted" role="status">
              {status}
            </span>
          ) : null}
        </div>
      </Block>

      <Block title="Perfil do cliente ideal">
        <Generate
          label="Gerar ICP"
          has={Boolean(icp)}
          onRun={generate}
          warning={validos < 3 ? `Com ${validos} cliente${validos === 1 ? '' : 's'} real${validos === 1 ? '' : 'is'}, o ICP sai como hipótese. O ideal são 3 ou mais.` : undefined}
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
