import React, { useState } from 'react';
import { api } from '../lib/api.js';
import { downloadText, esc, printDocument, table } from '../lib/export.js';
import Generate from '../components/Generate.jsx';
import CopyButton from '../components/CopyButton.jsx';
import { Downloads, PastaHead, slug } from './common.jsx';

const CANAIS = [
  ['ligacao', 'Ligação'],
  ['email', 'E-mail'],
  ['whatsapp', 'WhatsApp'],
  ['linkedin', 'LinkedIn'],
  ['objecoes', 'Objeções'],
];

function Script({ step, time, text, note }) {
  return (
    <div className="script">
      <div className="script-head">
        <span className="dq-label">{step}</span>
        {time ? <span className="script-time">{time}</span> : null}
        <CopyButton text={text} />
      </div>
      <p className="script-text">{text}</p>
      {note ? <p className="small muted">{note}</p> : null}
    </div>
  );
}

function callSteps(c) {
  return [
    ['1. Abertura', '30 s', c.abertura],
    ['2. Permissão', '15 s', c.permissao],
    ['3. Gancho', '45 s', c.gancho],
    ['Se reconhecer a dor', '', c.se_sim],
    ['Se não reconhecer', '', c.se_nao],
    ['4. Diagnóstico · Situação', '1 min', c.spin.situacao],
    ['Diagnóstico · Problema', '', c.spin.problema],
    ['Diagnóstico · Implicação', '', c.spin.implicacao],
    ['Diagnóstico · Necessidade', '', c.spin.necessidade],
    ['5. Próximo passo', '1 min', c.proximo_passo],
    ['6. Encerramento', '30 s', c.encerramento],
  ];
}

function allRows(r) {
  return [
    ...callSteps(r.cold_call).map(([s, , t]) => ['Ligação', s, t]),
    ['E-mail', `Assunto: ${r.email.assunto}`, r.email.corpo],
    ['E-mail', `Follow-up: ${r.email.follow_up_assunto}`, r.email.follow_up_corpo],
    ['WhatsApp', 'Primeira mensagem', r.whatsapp.primeira_mensagem],
    ['WhatsApp', 'Retomada', r.whatsapp.follow_up],
    ['WhatsApp', 'Encerramento', r.whatsapp.break_up],
    ['LinkedIn', 'Convite', r.linkedin.convite],
    ['LinkedIn', 'Primeira mensagem', r.linkedin.mensagem],
    ...r.objecoes_rapidas.map((o) => ['Objeção', o.objecao, o.resposta]),
  ];
}

export default function Roteiros({ data, line, lineId, onUpdate }) {
  const pid = data.project.id;
  const r = data.docs[lineId]?.roteiros?.data;
  const [canal, setCanal] = useState('ligacao');
  const title = `Roteiros · ${line.data?.nome || ''}`;

  return (
    <div className="pasta">
      <PastaHead
        code="04"
        title={title}
        actions={
          r ? (
            <Downloads
              onPdf={() => printDocument({ title, subtitle: data.project.name, html: `<p class="muted">A ligação fria serve para qualificar e agendar, não para vender. Cerca de 4 minutos.</p>${table(['Canal', 'Etapa', 'Texto'], allRows(r))}` })}
            />
          ) : null
        }
      >
        Roteiro não é decoreba: é controle de qualidade e material de treino. Use no role play antes de ligar.
      </PastaHead>

      <Generate
        label="Gerar roteiros"
        has={Boolean(r)}
        onRun={async () => onUpdate(await api(`/projects/${pid}/lines/${lineId}/generate/roteiros`, { method: 'POST' }))}
        steps={['Lendo ICP e playbook...', 'Escrevendo a abertura...', 'Encaixando as perguntas SPIN...', 'Ajustando o tom por canal...', 'Datilografando os roteiros...']}
      />

      {r ? (
        <div style={{ marginTop: 'var(--space-5)' }}>
          <div className="seg" role="tablist" aria-label="Canal">
            {CANAIS.map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={canal === id} className={`seg-btn ${canal === id ? 'is-active' : ''}`} onClick={() => setCanal(id)}>
                {label}
              </button>
            ))}
          </div>
          <div className="scripts">
            {canal === 'ligacao' ? callSteps(r.cold_call).map(([s, t, text]) => <Script key={s} step={s} time={t} text={text} />) : null}
            {canal === 'email' ? (
              <>
                <Script step={`Assunto: ${r.email.assunto}`} text={r.email.corpo} />
                <Script step={`Follow-up · ${r.email.follow_up_assunto}`} text={r.email.follow_up_corpo} />
              </>
            ) : null}
            {canal === 'whatsapp' ? (
              <>
                <Script step="Primeira mensagem" text={r.whatsapp.primeira_mensagem} note="Fora da janela de 24 horas, a primeira mensagem precisa ser um template aprovado pela Meta (veja a pasta 08)." />
                <Script step="Retomada" text={r.whatsapp.follow_up} />
                <Script step="Encerramento" text={r.whatsapp.break_up} />
              </>
            ) : null}
            {canal === 'linkedin' ? (
              <>
                <Script step="Nota do convite" text={r.linkedin.convite} />
                <Script step="Depois do aceite" text={r.linkedin.mensagem} />
              </>
            ) : null}
            {canal === 'objecoes' ? r.objecoes_rapidas.map((o) => <Script key={o.objecao} step={o.objecao} text={o.resposta} />) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
