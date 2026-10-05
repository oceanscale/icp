import React from 'react';
import { FunnelColumn, LeadCard } from '../ds/index.jsx';
import { api } from '../lib/api.js';
import { csv, downloadText, esc, list, printDocument, table } from '../lib/export.js';
import Generate from '../components/Generate.jsx';
import { Block, Downloads, PastaHead, slug } from './common.jsx';

export default function Funil({ data, line, lineId, onUpdate }) {
  const pid = data.project.id;
  const f = data.docs[lineId]?.funil?.data;
  const title = `Funil · ${line.data?.nome || ''}`;

  const rows = f ? f.etapas.map((e) => [e.codigo, e.nome, e.objetivo, e.criterio_entrada, e.criterio_saida, e.dono, e.sla_dias, e.conversao_referencia, (e.atividades || []).join(' | ')]) : [];
  const head = ['Código', 'Etapa', 'Objetivo', 'Entra quando', 'Sai quando', 'Dono', 'Prazo (dias)', 'Conversão de referência', 'Atividades'];

  return (
    <div className="pasta">
      <PastaHead
        code="05"
        title={title}
        actions={
          f ? (
            <Downloads
              onPdf={() =>
                printDocument({
                  title,
                  subtitle: data.project.name,
                  html: `<p>${esc(f.visao)}</p><h2>Etapas</h2>${table(head, rows)}<h2>Motivos de perda</h2>${list(f.motivos_perda || [])}<p class="muted">Conversões são referência inicial: troque pelos números reais depois da primeira semana.</p>`,
                })
              }
              onCsv={() => downloadText(`funil-${slug(line.data?.nome)}.csv`, `﻿${csv([head, ...rows])}`, 'text/csv;charset=utf-8')}
            />
          ) : null
        }
      >
        Cada etapa vira uma coluna do Kanban no CRM do cliente, com critério de entrada, de saída, dono e prazo. Este quadro é o desenho; os leads de verdade ficam no CRM.
      </PastaHead>

      <Generate
        label="Desenhar o funil"
        has={Boolean(f)}
        onRun={async () => onUpdate(await api(`/projects/${pid}/lines/${lineId}/generate/funil`, { method: 'POST' }))}
        steps={['Lendo ICP e critério de qualificação...', 'Separando as etapas...', 'Definindo critérios de passagem...', 'Calculando prazos...', 'Montando o quadro de exemplo...']}
      />

      {f ? (
        <div className="stack-5" style={{ marginTop: 'var(--space-5)' }}>
          <p>{f.visao}</p>
          <div className="board" role="region" aria-label="Quadro do funil" tabIndex={0}>
            {f.etapas.map((e) => {
              const leads = (f.exemplos || []).filter((x) => x.etapa === e.codigo);
              return (
                <FunnelColumn key={e.codigo} code={e.codigo} name={e.nome} count={leads.length} rate={e.conversao_referencia}>
                  <div className="stage-rules small">
                    <p>
                      <b>Entra:</b> {e.criterio_entrada}
                    </p>
                    <p>
                      <b>Sai:</b> {e.criterio_saida}
                    </p>
                    <p className="muted">
                      {e.dono} · até {e.sla_dias} {e.sla_dias === 1 ? 'dia' : 'dias'}
                    </p>
                  </div>
                  {leads.map((x) => (
                    <LeadCard key={x.nome} name={x.nome} company={x.empresa} value={x.valor} days={x.dias} late={x.dias > e.sla_dias} tag={x.canal} />
                  ))}
                </FunnelColumn>
              );
            })}
          </div>
          <p className="small muted">Leads de exemplo, fictícios, para treinar o time a ler o quadro. Conversões são referência inicial a validar.</p>
          <Block title="Motivos de perda para registrar">
            <ul className="ticks ticks-alert">
              {(f.motivos_perda || []).map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </Block>
        </div>
      ) : null}
    </div>
  );
}
