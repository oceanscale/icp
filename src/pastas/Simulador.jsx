import React, { useMemo, useState } from 'react';
import { Button, CaseFile, Field, Readout, Stamp } from '../ds/index.jsx';
import { api } from '../lib/api.js';
import { useAutosave } from '../lib/autosave.js';
import { brl, dateLabel, num } from '../lib/format.js';
import { exportDossie } from '../lib/dossie.js';
import Modal from '../components/Modal.jsx';
import { SaveStatus } from '../components/SaveStatus.jsx';
import { PastaHead } from './common.jsx';
import { mensagensPorLead } from './Automacoes.jsx';

const CATS = [
  ['marketing', 'Marketing', 'Abordagem, oferta, retomada de conversa'],
  ['utilidade', 'Utilidade', 'Lembrete e confirmação de reunião, aviso de pedido'],
  ['autenticacao', 'Autenticação', 'Código de acesso (raro em vendas)'],
];
const QUICK = [100, 300, 500, 1000, 2000];

function Tutorial() {
  return (
    <details className="how">
      <summary>Onde encontro esses valores?</summary>
      <ol className="steps small">
        <li>Na fatura ou no painel do provedor da API oficial do WhatsApp que vocês usam para disparar: procure quanto custa uma mensagem (template) de cada categoria.</li>
        <li>
          A Meta publica a tabela oficial por país em{' '}
          <a href="https://developers.facebook.com/docs/whatsapp/pricing" target="_blank" rel="noreferrer">
            developers.facebook.com/docs/whatsapp/pricing
          </a>
          . Se o valor estiver em dólar, multiplique pela cotação do dia e some a taxa do provedor.
        </li>
        <li>Respostas dentro da janela de 24 horas, depois que o cliente fala com vocês, são atendimento e não entram nesta conta.</li>
      </ol>
    </details>
  );
}

function PriceModal({ prices, onClose, onSaved }) {
  const [form, setForm] = useState({
    marketing: String(prices?.marketing ?? ''),
    utilidade: String(prices?.utilidade ?? ''),
    autenticacao: String(prices?.autenticacao ?? ''),
    fonte: prices?.fonte || '',
  });
  const [error, setError] = useState('');
  const save = async (e) => {
    e.preventDefault();
    try {
      const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, k === 'fonte' ? v : Number(String(v).replace(',', '.'))]));
      await api('/precos', { method: 'PUT', body });
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <Modal title="Tabela de preços do WhatsApp" onClose={onClose}>
      <form className="stack-4" onSubmit={save}>
        <p className="small muted">Vale para todos os casos. Preencha em reais por mensagem, já com a taxa do provedor.</p>
        {CATS.map(([k, label, hint]) => (
          <Field key={k} id={`price-${k}`} label={`${label} (R$ por mensagem)`} hint={hint} inputMode="decimal" placeholder="0,00" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
        ))}
        <Field label="De onde veio" hint="Ex.: fatura de setembro do provedor" value={form.fonte} onChange={(e) => setForm({ ...form, fonte: e.target.value })} />
        <Tutorial />
        {error ? <p className="error-text">{error}</p> : null}
        <Button type="submit">Salvar tabela</Button>
      </form>
    </Modal>
  );
}

function defaults(saved, automacoes) {
  const msgs = automacoes ? mensagensPorLead(automacoes) : { marketing: 3, utilidade: 1, autenticacao: 0 };
  const base = {
    leads: 500,
    msgMarketing: msgs.marketing,
    msgUtilidade: msgs.utilidade,
    msgAutenticacao: msgs.autenticacao,
    taxaResposta: 20,
    taxaReuniao: 30,
    taxaFechamento: 25,
    ticket: 0,
    orcamento: 0,
    metaReceita: 0,
    margem: 0,
    custoMarketing: 0,
    custoUtilidade: 0,
    custoAutenticacao: 0,
  };
  const merged = { ...base, ...(saved || {}) };
  return Object.fromEntries(Object.entries(merged).map(([k, v]) => [k, String(v ?? 0)]));
}

const n = (v) => {
  const x = Number(String(v ?? '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(x) && x >= 0 ? x : 0;
};

export default function Simulador({ data, line, lineId, onUpdate, user }) {
  const pid = data.project.id;
  const docs = data.docs[lineId] || {};
  const prices = data.prices;
  const isAdmin = data.me.role === 'admin';
  const [form, setForm] = useState(() => defaults(docs.simulador?.data, docs.automacoes?.data));
  const [priceModal, setPriceModal] = useState(false);
  const [exporting, setExporting] = useState('');
  const msgs07 = docs.automacoes?.data ? mensagensPorLead(docs.automacoes.data) : null;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const numeric = useMemo(() => Object.fromEntries(Object.entries(form).map(([k, x]) => [k, n(x)])), [form]);
  const auto = useAutosave(numeric, async (v) => onUpdate(await api(`/projects/${pid}/lines/${lineId}/docs/simulador`, { method: 'PUT', body: v })));

  const r = useMemo(() => {
    const v = numeric;
    const price = prices
      ? { marketing: prices.marketing, utilidade: prices.utilidade, autenticacao: prices.autenticacao }
      : { marketing: v.custoMarketing, utilidade: v.custoUtilidade, autenticacao: v.custoAutenticacao };
    const porLead = (v.msgMarketing * price.marketing + v.msgUtilidade * price.utilidade + v.msgAutenticacao * price.autenticacao) * (1 + v.margem / 100);
    const total = v.leads * porLead;
    const respostas = v.leads * (v.taxaResposta / 100);
    const reunioes = respostas * (v.taxaReuniao / 100);
    const clientes = reunioes * (v.taxaFechamento / 100);
    const receita = clientes * v.ticket;
    const msgsLead = v.msgMarketing + v.msgUtilidade + v.msgAutenticacao;
    const back =
      v.metaReceita > 0 && v.ticket > 0 && v.taxaFechamento > 0 && v.taxaReuniao > 0 && v.taxaResposta > 0
        ? (() => {
            const cli = Math.ceil(v.metaReceita / v.ticket);
            const reu = cli / (v.taxaFechamento / 100);
            const resp = reu / (v.taxaReuniao / 100);
            const leads = resp / (v.taxaResposta / 100);
            return { cli, reu, resp, leads, custo: leads * porLead };
          })()
        : null;
    return { v, price, porLead, total, respostas, reunioes, clientes, receita, back, msgsLead, semPreco: price.marketing + price.utilidade + price.autenticacao === 0 };
  }, [numeric, prices]);

  const over = r.v.orcamento > 0 && r.total > r.v.orcamento;
  const lastOpen = data.game.lines[lineId]?.pastas.filter((p) => !p.bonus).every((p) => p.state !== 'locked');

  const download = async () => {
    setExporting('Montando o dossiê...');
    try {
      await auto.flush();
      await exportDossie(data, line, user);
      setExporting('');
    } catch (err) {
      setExporting(err.message);
    }
  };

  return (
    <div className="pasta">
      <PastaHead code="09" title={`Simulador · ${line.data?.nome || ''}`} actions={<SaveStatus {...auto} onRetry={auto.flush} />}>
        Quanto custa falar com os seus leads pelo WhatsApp oficial e quantas reuniões isso gera. Responda os passos 1 e 2; o resultado aparece no passo 3.
      </PastaHead>

      <div className="sim-steps">
        <section className="sim-step">
          <div className="sim-step-n">1</div>
          <div className="sim-step-body">
            <h3 className="dq-check-title">Preço de cada mensagem</h3>
            {prices ? (
              <>
                <table className="tbl price-tbl">
                  <tbody>
                    {CATS.map(([k, label, hint]) => (
                      <tr key={k}>
                        <th>
                          {label}
                          <div className="small muted">{hint}</div>
                        </th>
                        <td className="price">{brl(prices[k])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="small muted">
                  Tabela definida por {prices.updated_by || 'um consultor'} em {dateLabel(prices.updated_at)}
                  {prices.fonte ? ` · ${prices.fonte}` : ''}.
                  {isAdmin ? (
                    <>
                      {' '}
                      <button type="button" className="link-btn" onClick={() => setPriceModal(true)}>
                        Editar tabela
                      </button>
                    </>
                  ) : null}
                </p>
              </>
            ) : isAdmin ? (
              <div className="stack-3">
                <p className="small">Ainda não há tabela de preços. Preencha uma vez e ela vale para todos os casos.</p>
                <Button onClick={() => setPriceModal(true)}>Preencher tabela de preços</Button>
              </div>
            ) : (
              <div className="stack-3">
                <p className="small">O consultor ainda não preencheu a tabela de preços. Enquanto isso, use os valores da sua fatura:</p>
                <div className="grid-3">
                  <Field id="sim-custoMarketing" label="Marketing (R$)" inputMode="decimal" value={form.custoMarketing} onChange={set('custoMarketing')} />
                  <Field id="sim-custoUtilidade" label="Utilidade (R$)" inputMode="decimal" value={form.custoUtilidade} onChange={set('custoUtilidade')} />
                  <Field id="sim-custoAutenticacao" label="Autenticação (R$)" inputMode="decimal" value={form.custoAutenticacao} onChange={set('custoAutenticacao')} />
                </div>
              </div>
            )}
            <Tutorial />
          </div>
        </section>

        <section className="sim-step">
          <div className="sim-step-n">2</div>
          <div className="sim-step-body">
            <h3 className="dq-check-title">Quantos leads por mês?</h3>
            <div className="leads-input">
              <input className="dq-field-input big-number" id="sim-leads" aria-label="Leads por mês" inputMode="numeric" value={form.leads} onChange={set('leads')} />
              <div className="row-3 wrap">
                {QUICK.map((q) => (
                  <button key={q} type="button" className={`quick ${n(form.leads) === q ? 'is-active' : ''}`} onClick={() => setForm({ ...form, leads: String(q) })}>
                    {num(q)}
                  </button>
                ))}
              </div>
            </div>
            <p className="small">
              Cada lead recebe <b>{num(r.msgsLead)} mensagens pagas</b>: {num(r.v.msgMarketing)} de marketing e {num(r.v.msgUtilidade)} de utilidade
              {r.v.msgAutenticacao ? ` e ${num(r.v.msgAutenticacao)} de autenticação` : ''}
              {msgs07 && msgs07.marketing === r.v.msgMarketing && msgs07.utilidade === r.v.msgUtilidade && msgs07.autenticacao === r.v.msgAutenticacao
                ? ', pela cadência da pasta 08.'
                : msgs07
                  ? '. Este número foi ajustado à mão; a cadência da pasta 08 diz outro.'
                  : '. Gere a cadência na pasta 08 para este número vir pronto.'}
            </p>
            <details className="how">
              <summary>Ajustar mensagens por lead</summary>
              <div className="grid-3" style={{ marginTop: 'var(--space-3)' }}>
                <Field id="sim-msgMarketing" label="Marketing" inputMode="numeric" value={form.msgMarketing} onChange={set('msgMarketing')} />
                <Field id="sim-msgUtilidade" label="Utilidade" inputMode="numeric" value={form.msgUtilidade} onChange={set('msgUtilidade')} />
                <Field id="sim-msgAutenticacao" label="Autenticação" inputMode="numeric" value={form.msgAutenticacao} onChange={set('msgAutenticacao')} />
              </div>
              {msgs07 ? (
                <Button size="sm" variant="quiet" onClick={() => setForm({ ...form, msgMarketing: String(msgs07.marketing), msgUtilidade: String(msgs07.utilidade), msgAutenticacao: String(msgs07.autenticacao) })}>
                  Voltar ao número da pasta 08
                </Button>
              ) : null}
            </details>
          </div>
        </section>

        <section className="sim-step sim-step-result">
          <div className="sim-step-n">3</div>
          <div className="sim-step-body">
            <h3 className="dq-check-title">Resultado</h3>
            {r.semPreco ? <p className="small warn-text">Falta o preço por mensagem no passo 1 para calcular o custo.</p> : null}
            <div className="readouts">
              <Readout label="Custo no mês" value={brl(r.total)} tone={r.v.orcamento > 0 ? (over ? 'danger' : 'green') : 'blue'} flag={r.v.orcamento > 0 ? (over ? 'Acima do orçamento' : 'Dentro do orçamento') : undefined} />
              <Readout label="Custo por lead" value={brl(r.porLead)} />
              <Readout label="Reuniões por mês" value={num(r.reunioes, 1)} tone="green" />
              <Readout label="Custo por reunião" value={r.reunioes > 0 ? brl(r.total / r.reunioes) : 'sem dado'} />
            </div>
            <p className="small muted">
              Conta usada: {num(r.v.taxaResposta)}% dos leads respondem e {num(r.v.taxaReuniao)}% de quem responde marca reunião. São números de exemplo: troque pelos reais em Avançado.
            </p>
          </div>
        </section>

        <details className="how advanced">
          <summary>Avançado: conversão, orçamento e meta de receita</summary>
          <div className="stack-4" style={{ marginTop: 'var(--space-4)' }}>
            <div className="grid-3">
              <Field id="sim-taxaResposta" label="Respondem (%)" inputMode="decimal" value={form.taxaResposta} onChange={set('taxaResposta')} />
              <Field id="sim-taxaReuniao" label="Viram reunião (%)" inputMode="decimal" value={form.taxaReuniao} onChange={set('taxaReuniao')} />
              <Field id="sim-taxaFechamento" label="Fecham (%)" inputMode="decimal" value={form.taxaFechamento} onChange={set('taxaFechamento')} />
              <Field id="sim-ticket" label="Ticket médio (R$)" inputMode="decimal" value={form.ticket} onChange={set('ticket')} />
              <Field id="sim-orcamento" label="Orçamento de disparos (R$ por mês)" inputMode="decimal" value={form.orcamento} onChange={set('orcamento')} />
              <Field id="sim-metaReceita" label="Meta de receita (R$ por mês)" inputMode="decimal" value={form.metaReceita} onChange={set('metaReceita')} />
              <Field id="sim-margem" label="Taxa extra do provedor (%)" hint="Só se não estiver no preço" inputMode="decimal" value={form.margem} onChange={set('margem')} />
            </div>
            <div className="readouts">
              <Readout label="Clientes por mês" value={num(r.clientes, 1)} tone="blue" />
              <Readout label="Receita estimada" value={brl(r.receita, 0)} tone="green" />
              <Readout label="Receita por real em disparo" value={r.total > 0 ? `${num(r.receita / r.total, 1)}×` : 'sem dado'} />
            </div>
            <div>
              <h3 className="dq-check-title">Conta de trás para frente</h3>
              {r.back ? (
                <ol className="reverse">
                  <li>
                    <span>Meta de receita</span>
                    <b>{brl(r.v.metaReceita, 0)}</b>
                  </li>
                  <li>
                    <span>Clientes necessários</span>
                    <b>{num(r.back.cli)}</b>
                  </li>
                  <li>
                    <span>Reuniões necessárias</span>
                    <b>{num(Math.ceil(r.back.reu))}</b>
                  </li>
                  <li>
                    <span>Respostas necessárias</span>
                    <b>{num(Math.ceil(r.back.resp))}</b>
                  </li>
                  <li>
                    <span>Leads na cadência</span>
                    <b>{num(Math.ceil(r.back.leads))}</b>
                  </li>
                  <li className="reverse-total">
                    <span>Custo de disparo para bater a meta</span>
                    <b>{brl(r.back.custo)}</b>
                  </li>
                </ol>
              ) : (
                <p className="small muted">Preencha a meta de receita e o ticket médio.</p>
              )}
            </div>
          </div>
        </details>
      </div>

      <CaseFile className="closing" caseNo="Fechamento" title="Dossiê completo" aside={lastOpen ? <Stamp tone="green">Pronto para arquivar</Stamp> : null}>
        <p>Um PDF com várias páginas: capa com o nível do caso e o tabuleiro, o perfil do cliente ideal com o retrato, playbook, roteiros, jornada, funil, anúncios, automações, este simulador e o mural do time.</p>
        <div className="row-3">
          <Button onClick={download} disabled={exporting === 'Montando o dossiê...'}>
            {exporting === 'Montando o dossiê...' ? exporting : 'Baixar dossiê completo (PDF)'}
          </Button>
          {exporting && exporting !== 'Montando o dossiê...' ? <span className="error-text small">{exporting}</span> : null}
        </div>
        <p className="small muted">Na janela de impressão, escolha "Salvar como PDF" e marque "Gráficos de fundo" para manter as cores.</p>
      </CaseFile>

      {priceModal ? (
        <PriceModal
          prices={prices}
          onClose={() => setPriceModal(false)}
          onSaved={async () => {
            setPriceModal(false);
            onUpdate(await api(`/projects/${pid}`));
          }}
        />
      ) : null}
    </div>
  );
}
