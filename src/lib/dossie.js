// Dossiê completo em PDF: várias páginas, com a moldura do jogo (capa com nível e tabuleiro, carimbos,
// retrato do decisor). Sai pela impressão do navegador ("Salvar como PDF").
import { ALL_PASTAS } from '../../shared/game.js';
import { brl, dateLabel, dueInfo, num, pad3 } from './format.js';
import { esc } from './export.js';
import { seaAdsUrl } from '../components/SeaAds.jsx';

const FONTS =
  'https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&family=Courier+Prime:wght@400;700&family=IBM+Plex+Sans:ital,wght@0,400;0,600;1,400&family=Special+Elite&display=swap';

const CSS = `
@page { size: A4; margin: 12mm; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; background: #f4efe2; color: #1e2a38; font: 10.5pt/1.5 "IBM Plex Sans", Arial, sans-serif; }
.page { break-before: page; padding: 4mm 2mm; }
.page:first-child { break-before: auto; }
h1, h2, h3, .display { font-family: "Special Elite", "Courier New", monospace; font-weight: 400; margin: 0; }
h2 { font-size: 22pt; line-height: 1.1; margin: 2mm 0 4mm; }
h3 { font-size: 13pt; margin: 5mm 0 2mm; }
p { margin: 0 0 2mm; }
.label { font: 700 8pt/1.3 "Courier Prime", monospace; letter-spacing: .1em; text-transform: uppercase; color: #57616c; }
.muted { color: #57616c; }
.head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #d8cdb5; padding-bottom: 3mm; margin-bottom: 5mm; }
.stamp { display: inline-block; font: 11pt/1 "Special Elite", monospace; letter-spacing: .14em; text-transform: uppercase; padding: 2mm 3mm 1.6mm; border: 2px solid currentColor; outline: 1px solid currentColor; outline-offset: 2px; border-radius: 2px; transform: rotate(-6deg); }
.s-green { color: #2c6a4b; } .s-blue { color: #1f4f8f; } .s-danger { color: #a03a28; } .s-ink { color: #1e2a38; }
.card { background: #fcfaf4; border: 1px solid #d8cdb5; border-radius: 2px; padding: 4mm; margin-bottom: 4mm; break-inside: avoid; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 6mm; }
.grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3mm 5mm; }
dl { margin: 0; } dt { font: 700 7.5pt/1.3 "Courier Prime", monospace; letter-spacing: .1em; text-transform: uppercase; color: #57616c; } dd { margin: 0 0 2mm; }
table { width: 100%; border-collapse: collapse; font-size: 9pt; margin: 2mm 0 4mm; background: #fcfaf4; }
th, td { border: 1px solid #d8cdb5; padding: 1.6mm 2mm; text-align: left; vertical-align: top; }
th { background: #e7dfcb; font-weight: 600; }
ul { margin: 0 0 2mm; padding-left: 5mm; }
.cover { min-height: 260mm; display: flex; flex-direction: column; }
.cover h1 { font-size: 54pt; line-height: .95; margin: 8mm 0 3mm; }
.cover .company { font: 22pt/1.15 "Special Elite", monospace; margin: 10mm 0 2mm; }
.track { display: flex; gap: 2mm; margin: 10mm 0 3mm; flex-wrap: wrap; }
.sq { width: 15.6mm; text-align: center; }
.sq b { display: grid; place-items: center; height: 15mm; border: 1.5px dashed #857a68; border-radius: 2px; font: 13pt/1 "Special Elite", monospace; color: #57616c; }
.sq.done b { background: #2c6a4b; border: 1.5px solid #2c6a4b; color: #fcfaf4; }
.sq.open b { background: #dde7f2; border: 2px solid #1f4f8f; color: #1f4f8f; }
.sq.bonus b { border-radius: 50%; }
.sq span { display: block; font-size: 7pt; margin-top: 1mm; color: #57616c; }
.xp { height: 3mm; background: #e7dfcb; border-radius: 9999px; overflow: hidden; margin: 2mm 0 1mm; }
.xp i { display: block; height: 100%; background: #1f4f8f; }
.folders { margin-top: auto; height: 40mm; position: relative; }
.folders div { position: absolute; left: 0; right: 0; bottom: 0; border-radius: 2px; }
.polaroid { width: 52mm; background: #fefdf9; padding: 3mm 3mm 2mm; box-shadow: 0 2px 6px #1e2a3833; transform: rotate(1.5deg); float: left; margin: 0 6mm 4mm 0; }
.polaroid img { width: 100%; aspect-ratio: 4/5; object-fit: cover; display: block; filter: grayscale(.2) sepia(.12); }
.polaroid .ph { aspect-ratio: 4/5; background: repeating-linear-gradient(45deg, #e7dfcb 0 6px, #d8cdb5 6px 7px); display: grid; place-items: center; font: 7pt "Courier Prime", monospace; }
.polaroid p { font: 600 13pt/1.2 Caveat, cursive; text-align: center; margin: 2mm 0 0; }
.check { list-style: none; padding: 0; }
.check li { padding: 1.2mm 0 1.2mm 7mm; position: relative; border-bottom: 1px dashed #d8cdb5; }
.check li::before { content: ""; position: absolute; left: 0; top: 1.8mm; width: 4mm; height: 4mm; border: 1.5px solid #857a68; border-radius: 1px; }
.check li.done::before { background: #2c6a4b; border-color: #2c6a4b; }
.check li.done { color: #57616c; text-decoration: line-through; text-decoration-color: #2c6a4b; }
.who { font: 700 7pt "Courier Prime", monospace; color: #2c6a4b; text-transform: uppercase; letter-spacing: .06em; text-decoration: none; display: inline-block; margin-left: 2mm; }
.note { background: #eaf0d4; padding: 3mm 4mm; font: 600 13pt/1.25 Caveat, cursive; margin: 3mm 0; }
.big { font: 700 18pt/1.1 "Courier Prime", monospace; }
.rank li { margin-bottom: 1mm; }
.var { font-weight: 700; color: #1f4f8f; }
.foot { margin-top: 4mm; font-size: 8pt; color: #57616c; }
.task { font: 700 7pt "Courier Prime", monospace; color: #1f4f8f; text-transform: uppercase; letter-spacing: .06em; text-decoration: none; display: inline-block; margin-left: 2mm; }
.task.late { color: #a03a28; }
.mural-cols { display: flex; gap: 8mm; } .mural-cols > div:first-child { flex: 0 0 55mm; } .mural-cols > div:last-child { flex: 1; font-size: 9pt; }
.flow { break-before: auto; margin-top: 6mm; padding-top: 4mm; border-top: 1.5px dashed #857a68; }
.flow h2 { font-size: 18pt; margin: 1mm 0 2mm; } .flow .head { margin-bottom: 3mm; padding-bottom: 2mm; } .flow .card { padding: 2.5mm 4mm; margin-bottom: 2mm; } .flow h3 { margin-top: 3mm; }
.end { display: flex; align-items: center; gap: 6mm; margin-top: 3mm; } .end .note { flex: 1; margin: 0; }
.sim { break-inside: avoid; }
.sim-cols { display: flex; gap: 6mm; align-items: flex-start; }
.sim-cols > div { flex: 1; min-width: 0; }
.sim table { margin-top: 1mm; }
.sim td:last-child { text-align: right; white-space: nowrap; font-family: "Courier Prime", monospace; }
.stat { display: flex; justify-content: space-between; align-items: baseline; gap: 3mm; padding: 1.2mm 0; border-bottom: 1px dashed #d8cdb5; }
.stat b { font: 700 12pt/1.1 "Courier Prime", monospace; white-space: nowrap; }
.stat.main b { font-size: 17pt; color: #1f4f8f; }
.bars { margin: 3mm 0 2mm; }
.bar { display: flex; align-items: center; gap: 3mm; margin-bottom: 1mm; }
.bar span { width: 26mm; font: 700 7.5pt/1.2 "Courier Prime", monospace; letter-spacing: .06em; text-transform: uppercase; color: #57616c; }
.bar i { display: block; height: 4.2mm; min-width: 1.5mm; background: #1f4f8f; border-radius: 1px; }
.bar:nth-child(2) i { background: #4d77b0; } .bar:nth-child(3) i { background: #2c6a4b; } .bar:nth-child(4) i { background: #1e2a38; }
.bar em { font: 700 9pt "Courier Prime", monospace; font-style: normal; }
.brand { display: flex; align-items: center; justify-content: flex-end; gap: 2mm; text-decoration: none; font: 700 7pt/1 "Courier Prime", monospace; letter-spacing: .1em; text-transform: uppercase; color: #57616c; }
.brand img { height: 6mm; width: auto; }
`;

const stateStamp = (state) =>
  state === 'done' ? '<span class="stamp s-green">Resolvida</span>' : state === 'open' ? '<span class="stamp s-blue">Aberta</span>' : '<span class="stamp s-ink">Pendente</span>';

function head(def, pasta, title) {
  return `<div class="head"><div><div class="label">Pasta ${esc(def.code)}${def.bonus ? ' · bônus' : ''}</div><h2>${esc(title)}</h2></div>${stateStamp(pasta?.state)}</div>`;
}

const pending = (what) => `<div class="card"><p class="muted">${esc(what)} ainda não foi gerado nesta linha.</p></div>`;
const tableHtml = (headRow, rows) =>
  `<table><thead><tr>${headRow.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const ul = (items) => `<ul>${(items || []).map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;

async function imageData(id) {
  try {
    const res = await fetch(`/api/images/${id}`, { credentials: 'same-origin' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function simulate(sim, prices) {
  if (!sim) return null;
  const price = prices || { marketing: sim.custoMarketing || 0, utilidade: sim.custoUtilidade || 0, autenticacao: sim.custoAutenticacao || 0 };
  const margem = sim.margem || 0;
  const porLead = (sim.msgMarketing * price.marketing + sim.msgUtilidade * price.utilidade + sim.msgAutenticacao * price.autenticacao) * (1 + margem / 100);
  const total = sim.leads * porLead;
  const respostas = sim.leads * ((sim.taxaResposta || 0) / 100);
  const reunioes = respostas * ((sim.taxaReuniao || 0) / 100);
  const clientes = reunioes * ((sim.taxaFechamento || 0) / 100);
  const receita = clientes * (sim.ticket || 0);
  let back = null;
  if (sim.metaReceita > 0 && sim.ticket > 0 && sim.taxaFechamento > 0 && sim.taxaReuniao > 0 && sim.taxaResposta > 0) {
    const cli = Math.ceil(sim.metaReceita / sim.ticket);
    const reu = cli / (sim.taxaFechamento / 100);
    const resp = reu / (sim.taxaReuniao / 100);
    const leads = resp / (sim.taxaResposta / 100);
    back = { cli, reu, resp, leads, custo: leads * porLead };
  }
  return { sim, price, margem, porLead, total, respostas, reunioes, clientes, receita, back, leads: sim.leads, porReuniao: reunioes > 0 ? total / reunioes : 0, porCliente: clientes > 0 ? total / clientes : 0 };
}

async function toDataUrl(url) {
  try {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function simulatorHtml(r, prices) {
  const s = r.sim;
  const pct = (v) => `${num(v || 0, 1)}%`;
  const rows = [
    ['Leads por mês', num(r.leads)],
    ['Mensagens de marketing por lead', `${num(s.msgMarketing)} × ${brl(r.price.marketing, 4)}`],
    ['Mensagens de utilidade por lead', `${num(s.msgUtilidade)} × ${brl(r.price.utilidade, 4)}`],
    ['Mensagens de autenticação por lead', `${num(s.msgAutenticacao)} × ${brl(r.price.autenticacao, 4)}`],
    ...(r.margem ? [['Taxa do provedor', pct(r.margem)]] : []),
    ['Leads que respondem', pct(s.taxaResposta)],
    ['Respostas que viram reunião', pct(s.taxaReuniao)],
    ['Reuniões que fecham', pct(s.taxaFechamento)],
    ...(s.ticket ? [['Ticket médio', brl(s.ticket)]] : []),
  ];
  const stats = [
    ['Custo por lead', brl(r.porLead), true],
    ['Custo no mês', brl(r.total), true],
    ['Respostas', num(r.respostas, 1)],
    ['Reuniões', num(r.reunioes, 1)],
    ['Clientes', num(r.clientes, 1)],
    ['Custo por reunião', r.reunioes > 0 ? brl(r.porReuniao) : 'sem dado'],
    ['Custo por cliente', r.clientes > 0 ? brl(r.porCliente) : 'sem dado'],
    ...(r.receita ? [['Receita estimada', brl(r.receita, 0)]] : []),
  ];
  const max = Math.max(r.leads, 1);
  const bars = [
    ['Leads', r.leads],
    ['Respostas', r.respostas],
    ['Reuniões', r.reunioes],
    ['Clientes', r.clientes],
  ];
  return `<div class="sim">
    <div class="sim-cols">
      <div><div class="label">Premissas do cenário</div>${tableHtml(['Item', 'Valor'], rows)}</div>
      <div><div class="label">Resultado do mês</div>${stats.map(([k, v, main]) => `<div class="stat ${main ? 'main' : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>
    </div>
    <div class="bars">${bars.map(([k, v]) => `<div class="bar"><span>${esc(k)}</span><i style="width:${Math.max(0.5, (v / max) * 120).toFixed(1)}mm"></i><em>${esc(num(v, v < 10 ? 1 : 0))}</em></div>`).join('')}</div>
    ${
      r.back
        ? `<div class="card"><div class="label">Conta de trás para frente</div><p>Para faturar <b>${esc(brl(r.sim.metaReceita, 0))}</b> no mês: ${esc(num(r.back.cli))} clientes, ${esc(num(r.back.reu, 0))} reuniões, ${esc(num(r.back.resp, 0))} respostas e <b>${esc(num(r.back.leads, 0))} leads</b>, com custo de mensagens de <b>${esc(brl(r.back.custo))}</b>.</p></div>`
        : ''
    }
    <p class="muted">Preços por mensagem ${prices ? `da tabela definida em ${dateLabel(prices.updated_at)}` : 'informados no simulador'}. Valores de referência para planejamento; a fatura do provedor da API oficial é quem manda.</p>
  </div>`;
}

function templateHtml(t, ctx) {
  const vars = Object.fromEntries((t.variaveis?.length ? t.variaveis : [{ numero: 1, tipo: 'nome_lead' }, { numero: 2, tipo: 'nome_vendedor' }]).map((v) => [String(v.numero), v]));
  const value = { nome_lead: ctx.lead, empresa_lead: ctx.leadCompany, nome_vendedor: ctx.seller, empresa_vendedor: ctx.company, data: '15/10', horario: '14h', link: 'link' };
  return esc(t.texto).replace(/\{\{(\d+)\}\}/g, (_, nVar) => {
    const v = vars[nVar];
    return `<span class="var">{${esc((v && (v.exemplo || value[v.tipo])) || `variável ${nVar}`)}}</span>`;
  });
}

export async function exportDossie(data, line, user) {
  const lineId = line.id;
  const docs = Object.fromEntries(Object.entries(data.docs[lineId] || {}).map(([k, v]) => [k, v.data]));
  const pastas = data.game.lines[lineId].pastas;
  const byId = Object.fromEntries(pastas.map((p) => [p.id, p]));
  const def = Object.fromEntries(ALL_PASTAS.map((p) => [p.id, p]));
  const { project, game } = data;
  const names = data.names || {};
  const image = data.images[lineId] ? await imageData(data.images[lineId].id) : null;
  const logo = await toDataUrl('/brand/sea-ads.png');
  const site = seaAdsUrl('dossie-pdf');
  const brand = `<a class="brand" href="${esc(site)}">${logo ? `<img src="${logo}" alt="Sea-Ads Marketing">` : 'Sea-Ads Marketing'}</a>`;
  const cards = new Map((data.board?.cards || []).filter((c) => c.line_id === lineId).map((c) => [c.mission_id, c]));
  const mainDone = pastas.filter((p) => !p.bonus).every((p) => p.state === 'done');
  const pct = game.level.next ? Math.min(100, Math.round((game.xp / game.level.next) * 100)) : 100;
  const pages = [];

  // Capa
  pages.push(`<section class="page cover">
    <div class="label">Arquivo comercial · Caso Nº ${pad3(project.number)} · aberto em ${dateLabel(project.created_at)}</div>
    <h1>Dossiê ICP</h1>
    <div class="muted" style="font: 13pt 'Courier Prime', monospace">Cada empresa é um caso a resolver.</div>
    <div class="company">${esc(project.name)}</div>
    <div class="label">Linha de produto · ${esc(line.data?.nome || '')}${project.segment ? ` · ${esc(project.segment)}` : ''}${project.city ? ` · ${esc(project.city)}` : ''}</div>
    <div style="margin: 10mm 0 0; display: flex; gap: 10mm; align-items: center">
      <span class="stamp ${mainDone ? 's-green' : 's-blue'}" style="font-size: 16pt">${mainDone ? 'Caso resolvido' : 'Em andamento'}</span>
      <div><div class="label">Nível do caso</div><div class="display" style="font-size: 18pt; color: #1f4f8f">${esc(game.level.label)}</div></div>
    </div>
    <div class="track">${ALL_PASTAS.map((p) => {
      const st = byId[p.id]?.state || 'locked';
      return `<div class="sq ${st === 'done' ? 'done' : st === 'open' ? 'open' : ''} ${p.bonus ? 'bonus' : ''}"><b>${st === 'done' ? '✓' : esc(p.code)}</b><span>${esc(p.bonus ? `Bônus ${p.label}` : p.label)}</span></div>`;
    }).join('')}</div>
    <div class="xp"><i style="width:${pct}%"></i></div>
    <div class="label">${game.xp} XP${game.level.next ? ` · próximo nível em ${game.level.next} XP` : ' · nível máximo'}</div>
    <p style="margin-top: 8mm"><span class="label">Time do caso</span><br>${data.members.map((m) => esc(m.name)).join(' · ')}</p>
    <p class="muted">Gerado por ${esc(user?.name || '')} em ${dateLabel(Date.now())}.</p>
    <div style="margin-top: auto; padding-bottom: 4mm">${brand}</div>
    <div class="folders" style="margin-top: 0"><div style="height: 40mm; background:#1e2a38"></div><div style="height: 30mm; background:#2c6a4b"></div><div style="height: 20mm; background:#857a68"></div><div style="height: 10mm; background:#1f4f8f"></div></div>
  </section>`);

  // 02 ICP
  const icp = docs.icp;
  pages.push(`<section class="page">${head(def.icp, byId.icp, 'Perfil do cliente ideal')}${
    icp
      ? `<div class="polaroid">${image ? `<img src="${image}" alt="">` : '<div class="ph">Retrato em revelação</div>'}<p>${esc(icp.persona?.nome)}</p></div>
      <div class="label">ICP principal ${icp.confianca === 'evidencia' ? '· baseado em clientes reais' : '· hipótese a validar'}</div>
      <h3 style="margin-top: 1mm">${esc(icp.principal.nome_perfil)}</h3>
      <p><i>${esc(icp.principal.frase)}</i></p>
      <dl>${[
        ['Segmento e porte', icp.principal.segmento_porte],
        ['Dor principal', icp.principal.dor_principal],
        ['Gatilho de compra', icp.principal.gatilho_compra],
        ['Ciclo de decisão', icp.principal.ciclo_decisao],
        ['Decisor', icp.principal.decisor],
        ['Objeções', icp.principal.objecoes],
        ['Ticket e recorrência', icp.principal.ticket_recorrencia],
      ]
        .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
        .join('')}</dl>
      <div style="clear: both"></div>
      <div class="grid"><div><div class="label">Sinais de encaixe</div>${ul(icp.principal.sinais_de_fit)}</div><div><div class="label">Sinais de alerta</div>${ul(icp.principal.sinais_de_alerta)}</div></div>
      <div class="card"><div class="label">Persona decisora</div><h3 style="margin-top: 1mm">${esc(icp.persona.nome)} · ${esc(icp.persona.cargo)}</h3>
        <div class="grid">${[
          ['Metas', icp.persona.metas],
          ['Dores', icp.persona.dores],
          ['O que precisa ouvir', icp.persona.o_que_precisa_ouvir],
          ['Canais', icp.persona.canais],
        ]
          .map(([k, v]) => `<dl><dt>${esc(k)}</dt><dd>${esc(v)}</dd></dl>`)
          .join('')}</div></div>
      <div class="card"><div class="label">ICP secundário</div><h3 style="margin-top: 1mm">${esc(icp.secundario.nome_perfil)}</h3><p>${esc(icp.secundario.frase)}</p></div>`
      : pending('O ICP')
  }</section>`);

  // 03 Playbook
  const pb = docs.playbook;
  if (pb) {
    const items = new Map(byId.playbook.missions.filter((m) => m.item).map((m) => [m.id, m]));
    pages.push(`<section class="page">${head(def.playbook, byId.playbook, 'Playbook')}<p>${esc(pb.resumo)}</p>
      <div class="card"><div class="label">Lead qualificado</div><p><b>${esc(pb.criterio_qualificacao)}</b></p></div>
      <div class="grid">${pb.secoes
        .map(
          (s, si) => `<div><h3>${esc(s.titulo)}</h3><ul class="check">${s.itens
            .map((it, ii) => {
              const m = items.get(`pb.${si}.${ii}`);
              const t = cards.get(`pb.${si}.${ii}`);
              const due = t && !m?.done ? dueInfo(t.due) : null;
              const task = t?.assignee_id && !m?.done ? `<span class="task ${due?.tone === 'late' ? 'late' : ''}">com ${esc((names[t.assignee_id] || 'alguém').split(' ')[0])}${due ? ` · ${esc(due.tone === 'late' ? due.text : `prazo ${due.label}`)}` : ''}</span>` : '';
              return `<li class="${m?.done ? 'done' : ''}">${esc(it.texto)}${m?.done ? `<span class="who">${esc(names[m.doneBy] || '')}</span>` : task}</li>`;
            })
            .join('')}</ul></div>`,
        )
        .join('')}</div>
      <h3>Perguntas SPIN</h3>${tableHtml(['Situação', 'Problema', 'Implicação', 'Necessidade'], [[pb.spin.situacao, pb.spin.problema, pb.spin.implicacao, pb.spin.necessidade].map((q) => (q || []).join('\n'))])}
      <h3>Banco de objeções (A.R.A.)</h3>${tableHtml(['Objeção', 'Acolher', 'Reformular', 'Avançar'], pb.objecoes.map((o) => [o.objecao, o.acolher, o.reformular, o.avancar]))}</section>`);
  } else pages.push(`<section class="page">${head(def.playbook, byId.playbook, 'Playbook')}${pending('O playbook')}</section>`);

  // 04 Roteiros
  const r = docs.roteiros;
  pages.push(`<section class="page">${head(def.roteiros, byId.roteiros, 'Roteiros')}${
    r
      ? `<h3>Cold call · 4 minutos</h3>${tableHtml(
          ['Etapa', 'O que dizer'],
          [
            ['Abertura', r.cold_call.abertura],
            ['Permissão', r.cold_call.permissao],
            ['Gancho', r.cold_call.gancho],
            ['Se reconhecer a dor', r.cold_call.se_sim],
            ['Se não reconhecer', r.cold_call.se_nao],
            ['Situação', r.cold_call.spin.situacao],
            ['Problema', r.cold_call.spin.problema],
            ['Implicação', r.cold_call.spin.implicacao],
            ['Necessidade', r.cold_call.spin.necessidade],
            ['Próximo passo', r.cold_call.proximo_passo],
            ['Encerramento', r.cold_call.encerramento],
          ],
        )}
      <div class="grid"><div class="card"><div class="label">WhatsApp</div><p>${esc(r.whatsapp.primeira_mensagem)}</p><p class="muted">${esc(r.whatsapp.follow_up)}</p></div>
      <div class="card"><div class="label">E-mail · ${esc(r.email.assunto)}</div><p>${esc(r.email.corpo).replace(/\n/g, '<br>')}</p></div></div>`
      : pending('Os roteiros')
  }</section>`);

  // 05 Jornada
  const j = docs.jornada;
  pages.push(`<section class="page">${head(def.jornada, byId.jornada, 'Jornada de compra')}${
    j
      ? `<p>${esc(j.resumo)}</p>${tableHtml(['Etapa', 'O que pensa', 'Onde está', 'Papel da empresa'], (j.etapas || []).map((e) => [e.nome, e.pensa, (e.onde_esta || []).join('; '), e.papel_da_empresa]))}
      <div class="grid3"><div><div class="label">Onde está a atenção</div>${ul((j.midias || []).map((m) => `${m.canal} (${m.peso})`))}</div><div><div class="label">O que dispara a busca</div>${ul(j.gatilhos)}</div><div><div class="label">Em quem confia</div>${ul(j.fontes_confianca)}</div></div>`
      : pending('A jornada')
  }</section>`);

  // 06 Funil
  const f = docs.funil;
  pages.push(`<section class="page">${head(def.funil, byId.funil, 'Funil de vendas')}${
    f ? `<p>${esc(f.visao)}</p>${tableHtml(['Etapa', 'Entra quando', 'Sai quando', 'Dono', 'Prazo', 'Conversão'], f.etapas.map((e) => [`${e.codigo} ${e.nome}`, e.criterio_entrada, e.criterio_saida, e.dono, `${e.sla_dias} dias`, e.conversao_referencia]))}<div class="label">Motivos de perda</div>${ul(f.motivos_perda)}` : pending('O funil')
  }</section>`);

  // 07 Anúncios (último pedido)
  const ads = data.ads.filter((a) => a.line_id === lineId);
  const lastAds = ads[ads.length - 1];
  const adList = lastAds ? (lastAds.output.anuncios || lastAds.output.pautas || []) : [];
  pages.push(`<section class="page">${head(def.ads, byId.ads, 'Anúncios')}${
    adList.length
      ? `<p class="muted">Últimos anúncios gerados (${ads.length} ${ads.length === 1 ? 'pedido' : 'pedidos'} no caso).</p>${adList
          .map(
            (a) => `<div class="card"><div class="label">${esc(a.plataforma)} · ${esc(a.formato)} · ${esc(a.proporcao)} · fase ${esc(a.fase)} · foco ${esc(a.foco)}</div>
            <h3 style="margin-top: 1mm">${esc(a.titulo || a.headline)}</h3><p>${esc(a.texto_principal || a.copy).replace(/\n/g, '<br>')}</p>
            <p class="muted"><b>Botão:</b> ${esc(a.cta)}${a.publico ? ` · <b>Público:</b> ${esc(a.publico)}` : ''}</p><p class="muted"><b>Criativo:</b> ${esc(a.criativo || a.pauta_visual)}</p></div>`,
          )
          .join('')}`
      : pending('Nenhum anúncio')
  }</section>`);

  // 08 Automações
  const au = docs.automacoes;
  const icpCtx = { lead: (icp?.persona?.nome || 'Nome do lead').split(',')[0].trim(), leadCompany: icp?.principal?.nome_perfil || 'Empresa do lead', seller: (user?.name || 'Seu nome').split(' ')[0], company: project.name };
  pages.push(`<section class="page">${head(def.automacoes, byId.automacoes, 'Cadência e automações')}${
    au
      ? `<p>${esc(au.visao)}</p>${tableHtml(['Dia', 'Canal', 'Ação', 'Objetivo'], au.cadencia.map((c) => [`D${c.dia}`, c.canal, c.acao, c.objetivo]))}
      <h3>Templates de WhatsApp</h3>${au.templates.map((t) => `<div class="card"><div class="label">${esc(t.nome)} · ${esc(t.categoria)}</div><p>${templateHtml(t, icpCtx)}</p></div>`).join('')}`
      : pending('A cadência')
  }</section>`);

  // 09 Simulador
  const sim = simulate(docs.simulador, data.prices);
  pages.push(`<section class="page">${head(def.simulador, byId.simulador, 'Simulador de custo')}${sim ? simulatorHtml(sim, data.prices) : pending('O cenário de custo')}</section>`);

  // Bônus
  const c = docs.conteudo;
  if (c) {
    pages.push(`<section class="page">${head(def.conteudo, byId.conteudo, 'Plano de conteúdo')}<p>${esc(c.linha_editorial)}</p>${tableHtml(['Dia', 'Rede', 'Formato', 'Tema', 'Gancho'], (c.posts || []).map((p) => [p.dia, p.rede, p.formato, p.tema, p.gancho]))}</section>`);
  }

  // Mural
  const done = pastas.flatMap((p) => p.missions.filter((m) => m.done)).length;
  const total = pastas.flatMap((p) => p.missions).length;
  // O mural segue na mesma folha quando cabe, sem abrir página quase vazia.
  pages.push(`<section class="page flow"><div class="head"><div><div class="label">Mural do time</div><h2>Placar do caso</h2></div><span class="stamp s-blue">${esc(game.level.name)}</span></div>
    <div class="grid"><div class="card"><div class="label">XP do caso</div><div class="big">${game.xp} XP</div></div><div class="card"><div class="label">Missões cumpridas nesta linha</div><div class="big">${done} de ${total}</div></div></div>
    <div class="mural-cols"><div><h3>Ranking</h3><ol class="rank">${game.ranking.map((rk) => `<li><b>${esc(names[rk.userId] || 'Ex-participante')}</b> · ${rk.xp} XP</li>`).join('') || '<li class="muted">Ninguém pontuou ainda.</li>'}</ol></div>
    <div><h3>Últimos registros</h3>${ul(data.activity.slice(0, 4).map((a) => `${a.name} ${a.text}${a.xp ? ` (+${a.xp} XP)` : ''} · ${dateLabel(a.created_at)}`))}</div></div>
    <div class="end"><div class="note">Este dossiê é um retrato do caso em ${dateLabel(Date.now())}. O jogo continua no sistema.</div>${brand}</div>
  </section>`);

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Dossiê ICP · ${esc(project.name)} · ${esc(line.data?.nome || '')}</title>
<link rel="stylesheet" href="${FONTS}"><style>${CSS}</style></head><body>${pages.join('\n')}</body></html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  doc.open();
  doc.write(html);
  doc.close();
  await new Promise((resolve) => setTimeout(resolve, 300));
  try {
    await Promise.race([doc.fonts?.ready, new Promise((resolve) => setTimeout(resolve, 2500))]);
  } catch {
    /* segue sem esperar as fontes */
  }
  iframe.contentWindow.focus();
  iframe.contentWindow.print();
  setTimeout(() => iframe.remove(), 2000);
  return html;
}
