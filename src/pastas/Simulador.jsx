import React, { useMemo, useState } from 'react';
import { Button, Field, Note, Readout } from '../ds/index.jsx';
import { api } from '../lib/api.js';
import { brl, num } from '../lib/format.js';
import { Block, PastaHead } from './common.jsx';
import { mensagensPorLead } from './Automacoes.jsx';

const GROUPS = [
  {
    title: 'Custo por mensagem (R$)',
    note: 'Use os valores da fatura do seu provedor da API oficial. A Meta cobra por mensagem de template e o preço muda por categoria.',
    fields: [
      ['custoMarketing', 'Template de marketing', 'R$ por mensagem'],
      ['custoUtilidade', 'Template de utilidade', 'R$ por mensagem, fora da janela'],
      ['custoAutenticacao', 'Template de autenticação', 'R$ por mensagem'],
      ['margem', 'Margem do provedor (%)', 'Taxa que o seu provedor soma, se houver'],
    ],
  },
  {
    title: 'Volume da cadência',
    note: 'Vem da pasta 07: mensagens pagas que cada lead recebe. Respostas dentro da janela de 24 horas não entram.',
    fields: [
      ['leads', 'Leads por mês', 'Quantos entram na cadência'],
      ['msgMarketing', 'Marketing por lead', ''],
      ['msgUtilidade', 'Utilidade por lead', ''],
      ['msgAutenticacao', 'Autenticação por lead', ''],
    ],
  },
  {
    title: 'Conversão',
    note: 'Valores iniciais de exemplo. Troque pelos números reais da operação assim que tiver uma semana de dados.',
    fields: [
      ['taxaResposta', 'Respondem (%)', 'Dos leads que recebem'],
      ['taxaReuniao', 'Viram reunião (%)', 'De quem responde'],
      ['taxaFechamento', 'Fecham (%)', 'Das reuniões'],
      ['ticket', 'Ticket médio (R$)', ''],
    ],
  },
  {
    title: 'Orçamento e meta',
    note: '',
    fields: [
      ['orcamento', 'Orçamento de disparos (R$ por mês)', ''],
      ['metaReceita', 'Meta de receita (R$ por mês)', 'Para a conta de trás para frente'],
    ],
  },
];

function defaults(saved, automacoes) {
  if (saved) return Object.fromEntries(Object.entries(saved).map(([k, v]) => [k, String(v)]));
  const msgs = automacoes ? mensagensPorLead(automacoes) : { marketing: 3, utilidade: 1, autenticacao: 0 };
  return {
    custoMarketing: '',
    custoUtilidade: '',
    custoAutenticacao: '',
    margem: '0',
    leads: '500',
    msgMarketing: String(msgs.marketing),
    msgUtilidade: String(msgs.utilidade),
    msgAutenticacao: String(msgs.autenticacao),
    taxaResposta: '20',
    taxaReuniao: '30',
    taxaFechamento: '25',
    ticket: '',
    orcamento: '',
    metaReceita: '',
  };
}

const n = (v) => {
  const x = Number(String(v ?? '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(x) && x >= 0 ? x : 0;
};

export default function Simulador({ data, line, lineId, onUpdate }) {
  const pid = data.project.id;
  const docs = data.docs[lineId] || {};
  const [form, setForm] = useState(() => defaults(docs.simulador?.data, docs.automacoes?.data));
  const [status, setStatus] = useState('');
  const msgs07 = docs.automacoes?.data ? mensagensPorLead(docs.automacoes.data) : null;

  const r = useMemo(() => {
    const v = Object.fromEntries(Object.entries(form).map(([k, x]) => [k, n(x)]));
    const porLead = (v.msgMarketing * v.custoMarketing + v.msgUtilidade * v.custoUtilidade + v.msgAutenticacao * v.custoAutenticacao) * (1 + v.margem / 100);
    const total = v.leads * porLead;
    const respostas = v.leads * (v.taxaResposta / 100);
    const reunioes = respostas * (v.taxaReuniao / 100);
    const clientes = reunioes * (v.taxaFechamento / 100);
    const receita = clientes * v.ticket;
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
    const semCusto = v.custoMarketing + v.custoUtilidade + v.custoAutenticacao === 0;
    const semVolume = v.msgMarketing + v.msgUtilidade + v.msgAutenticacao === 0;
    return { v, porLead, total, respostas, reunioes, clientes, receita, back, semCusto, semVolume };
  }, [form]);

  const save = async () => {
    setStatus('Salvando...');
    try {
      onUpdate(await api(`/projects/${pid}/lines/${lineId}/docs/simulador`, { method: 'PUT', body: Object.fromEntries(Object.entries(form).map(([k, x]) => [k, n(x)])) }));
      setStatus('Cenário salvo.');
    } catch (err) {
      setStatus(err.message);
    }
  };

  const over = r.v.orcamento > 0 && r.total > r.v.orcamento;
  return (
    <div className="pasta">
      <PastaHead code="08" title={`Simulador · ${line.data?.nome || ''}`}>
        Quanto custa a cadência no WhatsApp oficial, quantas reuniões ela gera e quantos leads a meta de receita exige.
      </PastaHead>

      <div className="sim">
        <div className="sim-inputs stack-5">
          {GROUPS.map((g) => (
            <Block key={g.title} title={g.title}>
              {g.note ? <p className="small muted">{g.note}</p> : null}
              <div className="grid-2">
                {g.fields.map(([k, label, hint]) => (
                  <Field key={k} id={`sim-${k}`} label={label} hint={hint || undefined} inputMode="decimal" value={form[k]} placeholder="0" onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                ))}
              </div>
            </Block>
          ))}
          <div className="row-3">
            <Button onClick={save}>Salvar cenário</Button>
            {msgs07 ? (
              <Button variant="quiet" onClick={() => setForm({ ...form, msgMarketing: String(msgs07.marketing), msgUtilidade: String(msgs07.utilidade), msgAutenticacao: String(msgs07.autenticacao) })}>
                Usar volume da pasta 07
              </Button>
            ) : null}
            {status ? (
              <span className="small muted" role="status">
                {status}
              </span>
            ) : null}
          </div>
        </div>

        <div className="sim-out stack-4" aria-live="polite">
          {r.semCusto ? (
            <Note title="Falta o custo" tilt={false} className="note-wide">
              Preencha o custo por mensagem com o valor da sua fatura para ver o custo da cadência.
            </Note>
          ) : r.semVolume ? (
            <Note title="Falta o volume" tilt={false} className="note-wide">
              Nenhuma mensagem paga por lead. Preencha o volume da cadência ou use os números da pasta 07.
            </Note>
          ) : null}
          <div className="readouts">
            <Readout label="Custo por lead" value={brl(r.porLead)} hint="Todas as mensagens pagas da cadência" />
            <Readout
              label="Custo no mês"
              value={brl(r.total)}
              tone={r.v.orcamento > 0 ? (over ? 'danger' : 'green') : undefined}
              flag={r.v.orcamento > 0 ? (over ? 'Acima do orçamento' : 'Dentro do orçamento') : undefined}
              hint={r.v.orcamento > 0 ? `Orçamento: ${brl(r.v.orcamento)}` : `${num(r.v.leads)} leads`}
            />
            <Readout label="Reuniões no mês" value={num(r.reunioes, 1)} tone="blue" hint={`${num(r.respostas)} respostas`} />
            <Readout label="Custo por reunião" value={r.reunioes > 0 ? brl(r.total / r.reunioes) : 'sem dado'} />
            <Readout label="Clientes no mês" value={num(r.clientes, 1)} tone="blue" />
            <Readout label="Custo por cliente" value={r.clientes > 0 ? brl(r.total / r.clientes) : 'sem dado'} />
            <Readout label="Receita estimada" value={brl(r.receita, 0)} tone="green" hint="Clientes × ticket médio" />
            <Readout label="Receita por real em disparo" value={r.total > 0 ? `${num(r.receita / r.total, 1)}×` : 'sem dado'} />
          </div>

          <Block title="Conta de trás para frente">
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
              <p className="small muted">Preencha a meta de receita, o ticket médio e as três taxas de conversão.</p>
            )}
          </Block>
        </div>
      </div>
    </div>
  );
}
