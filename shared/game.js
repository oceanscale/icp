// Regras do jogo do Dossiê ICP, usadas pelo Worker e pelo front.
// Um caso (empresa) tem a pasta 01 Empresa e, para cada linha de produto, as pastas 02 a 09, mais a pasta bônus.
// Cada pasta tem missões: automáticas (o sistema marca quando a entrega existe) e manuais (o time marca).
// A pasta seguinte abre quando a peça-chave da anterior existe; a pasta fica resolvida quando todas as missões estão feitas.
// Uma pasta que já tem a própria entrega nunca volta a trancar (vale para casos antigos quando entra uma pasta nova).

export const PASTAS = [
  { id: 'empresa', code: '01', label: 'Empresa', scope: 'caso' },
  { id: 'icp', code: '02', label: 'ICP' },
  { id: 'playbook', code: '03', label: 'Playbook' },
  { id: 'roteiros', code: '04', label: 'Roteiros' },
  { id: 'jornada', code: '05', label: 'Jornada' },
  { id: 'funil', code: '06', label: 'Funil' },
  { id: 'ads', code: '07', label: 'Anúncios' },
  { id: 'automacoes', code: '08', label: 'Automações' },
  { id: 'simulador', code: '09', label: 'Simulador' },
];

// Pastas bônus: abrem quando a peça-chave da pasta `after` existe e não contam para o caso resolvido.
export const BONUS = [{ id: 'conteudo', code: 'B', label: 'Conteúdo', bonus: true, after: 'ads' }];

export const ALL_PASTAS = [...PASTAS, ...BONUS];

export const XP = { auto: 20, manual: 10, item: 5, pasta: 50 };

export const LEVELS = [
  { n: 1, name: 'Improviso', min: 0 },
  { n: 2, name: 'Estruturando', min: 120 },
  { n: 3, name: 'Processo definido', min: 300 },
  { n: 4, name: 'Previsível', min: 550 },
  { n: 5, name: 'Escalável', min: 850 },
];

const filled = (v) => typeof v === 'string' && v.trim().length > 0;
const clientesValidos = (input) => (input?.clientes || []).filter((c) => filled(c.nome) && filled(c.dor)).length;

// check(ctx) devolve o id do usuário a creditar (ou true) quando a missão automática está feita.
export const MISSIONS = {
  empresa: [
    { id: 'empresa.perfil', label: 'Perfil da empresa preenchido', hint: 'Pitch, missão e diferenciais', auto: (c) => (filled(c.empresa?.data?.pitch) && filled(c.empresa?.data?.diferenciais) ? c.empresa.updated_by : false), key: true },
    { id: 'empresa.linhas', label: 'Pelo menos uma linha de produto cadastrada', hint: 'Nome, dor que resolve e preço', auto: (c) => (c.lines.some((l) => filled(l.data?.nome) && filled(l.data?.dor)) ? c.lines[0].updated_by : false), key: true },
    { id: 'empresa.organograma', label: 'Papéis do time comercial definidos', hint: 'Quem prospecta, quem fecha, quem cuida da carteira' },
    { id: 'empresa.ferramentas', label: 'Ferramentas do time listadas', hint: 'CRM, WhatsApp oficial, discador, agenda' },
  ],
  icp: [
    { id: 'icp.entrevista', label: 'Entrevista de carteira com 3 clientes reais', hint: 'Os melhores clientes, não os imaginados', auto: (c) => (clientesValidos(c.docs.icp_input?.data) >= 3 ? c.docs.icp_input.updated_by : false) },
    { id: 'icp.gerado', label: 'ICP principal e secundário gerados', auto: (c) => (c.docs.icp ? c.docs.icp.updated_by : false), key: true },
    { id: 'icp.retrato', label: 'Retrato do decisor revelado', auto: (c) => (c.image ? c.image.created_by : false) },
    { id: 'icp.validado', label: 'ICP validado com o dono da empresa', hint: 'Ele reconhece os melhores clientes nesse perfil?' },
    { id: 'icp.time', label: 'Time comercial apresentado ao ICP', hint: 'Todo vendedor sabe dizer o ICP em uma frase' },
  ],
  playbook: [
    { id: 'playbook.gerado', label: 'Playbook gerado para esta linha', auto: (c) => (c.docs.playbook ? c.docs.playbook.updated_by : false), key: true },
  ],
  roteiros: [
    { id: 'roteiros.gerado', label: 'Roteiros de ligação, e-mail e WhatsApp gerados', auto: (c) => (c.docs.roteiros ? c.docs.roteiros.updated_by : false), key: true },
    { id: 'roteiros.roleplay', label: 'Role play da cold call com o time', hint: '10 minutos, um vendedor liga e outro faz o cliente' },
    { id: 'roteiros.objecoes', label: 'Banco de objeções revisado pelo time', hint: 'Acrescente as objeções reais da semana' },
    { id: 'roteiros.ligacoes', label: '10 primeiras ligações feitas com o roteiro' },
  ],
  jornada: [
    { id: 'jornada.gerada', label: 'Jornada de compra mapeada', auto: (c) => (c.docs.jornada ? c.docs.jornada.updated_by : false), key: true },
    { id: 'jornada.validada', label: 'Jornada conferida com 2 clientes reais', hint: 'Pergunte onde buscaram informação antes de comprar' },
    { id: 'jornada.canais', label: 'Canais prioritários escolhidos pelo time', hint: 'Onde o ICP presta atenção e vocês vão aparecer' },
  ],
  funil: [
    { id: 'funil.gerado', label: 'Etapas do funil desenhadas', auto: (c) => (c.docs.funil ? c.docs.funil.updated_by : false), key: true },
    { id: 'funil.crm', label: 'Etapas configuradas no CRM do cliente' },
    { id: 'funil.criterios', label: 'Critérios de passagem combinados com o time' },
    { id: 'funil.taxas', label: 'Taxas de conversão da primeira semana registradas' },
  ],
  ads: [
    { id: 'ads.pauta', label: 'Primeiros anúncios da semana gerados', auto: (c) => (c.ads.length ? c.ads[c.ads.length - 1].created_by : false), key: true },
    { id: 'ads.referencias', label: 'Referências de concorrentes registradas', hint: 'Links das bibliotecas de anúncios e prints', auto: (c) => { const a = c.ads.find((x) => (x.input?.referencias || []).length); return a ? a.created_by : false; } },
    { id: 'ads.publicado', label: 'Primeiro anúncio no ar' },
    { id: 'ads.revisao', label: 'Revisão semanal de resultados feita' },
  ],
  automacoes: [
    { id: 'automacoes.gerado', label: 'Cadência e follow-ups desenhados', auto: (c) => (c.docs.automacoes ? c.docs.automacoes.updated_by : false), key: true },
    { id: 'automacoes.templates', label: 'Templates enviados para aprovação na Meta' },
    { id: 'automacoes.cadencia', label: 'Cadência ativada no sistema de WhatsApp' },
    { id: 'automacoes.teste', label: 'Régua de follow-up testada com um lead real' },
  ],
  simulador: [
    { id: 'simulador.salvo', label: 'Cenário de custo salvo', auto: (c) => (c.docs.simulador ? c.docs.simulador.updated_by : false), key: true },
    { id: 'simulador.orcamento', label: 'Orçamento mensal de disparos aprovado' },
    { id: 'simulador.meta', label: 'Meta de reuniões do mês definida' },
  ],
  conteudo: [
    { id: 'conteudo.gerado', label: 'Plano de conteúdo da semana gerado', auto: (c) => (c.docs.conteudo ? c.docs.conteudo.updated_by : false), key: true },
    { id: 'conteudo.agenda', label: 'Calendário da semana aprovado' },
    { id: 'conteudo.publicado', label: 'Três posts publicados' },
  ],
};

/** Itens do playbook gerado viram missões manuais da pasta 03. */
export const playbookItems = (playbook) =>
  (playbook?.data?.secoes || []).flatMap((s, si) =>
    (s.itens || []).map((it, ii) => ({ id: `pb.${si}.${ii}`, label: it.texto, hint: it.dica, section: s.titulo, item: true })),
  );

export function levelFor(xp) {
  let level = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.min) level = l;
  const next = LEVELS.find((l) => l.min > xp);
  return { ...level, next: next ? next.min : null, label: `Nível ${level.n} · ${level.name}` };
}

/**
 * Calcula o estado do jogo de um caso.
 * state: { empresa, lines: [{id, data, updated_by}], docs: {[lineId]: {kind: doc}}, ads: [{line_id, created_by, input}],
 *          images: {[lineId]: {created_by}}, missions: [{line_id, mission_id, done_by, done_at}] }
 */
export function computeGame(state) {
  const manual = new Map(state.missions.map((m) => [`${m.line_id}|${m.mission_id}`, m]));
  const xpBy = {};
  let xp = 0;
  const award = (who, points) => {
    xp += points;
    if (who && typeof who === 'string') xpBy[who] = (xpBy[who] || 0) + points;
  };

  const resolveMissions = (pastaId, lineId, ctx) => {
    const defs = pastaId === 'playbook' ? [...MISSIONS.playbook, ...playbookItems(ctx.docs.playbook)] : MISSIONS[pastaId];
    return defs.map((d) => {
      if (d.auto) {
        const who = d.auto(ctx);
        return { id: d.id, label: d.label, hint: d.hint, auto: true, key: d.key, done: Boolean(who), doneBy: typeof who === 'string' ? who : null, points: XP.auto };
      }
      const m = manual.get(`${lineId}|${d.id}`);
      return { id: d.id, label: d.label, hint: d.hint, section: d.section, item: d.item, done: Boolean(m), doneBy: m?.done_by || null, doneAt: m?.done_at || null, points: d.item ? XP.item : XP.manual };
    });
  };

  const pastaState = (missions, prevOpen) => {
    const keyDone = missions.filter((m) => m.key).every((m) => m.done);
    const ownKey = missions.some((m) => m.key && m.done);
    const open = prevOpen || ownKey;
    const all = missions.length > 0 && missions.every((m) => m.done);
    return { state: !open ? 'locked' : all ? 'done' : 'open', keyDone, resolved: open && all };
  };

  const empresaCtx = { empresa: state.empresa, lines: state.lines, docs: {}, ads: [] };
  const empresaMissions = resolveMissions('empresa', '', empresaCtx);
  const empresa = { id: 'empresa', missions: empresaMissions, ...pastaState(empresaMissions, true) };
  empresaMissions.filter((m) => m.done).forEach((m) => award(m.doneBy, m.points));
  if (empresa.resolved) award(null, XP.pasta);

  const lines = {};
  for (const line of state.lines) {
    const ctx = {
      empresa: state.empresa,
      lines: state.lines,
      docs: state.docs[line.id] || {},
      ads: state.ads.filter((a) => a.line_id === line.id),
      image: state.images[line.id] || null,
    };
    let prevKey = empresa.keyDone;
    const pastas = [empresa];
    const byId = { empresa };
    const add = (p, prevOpen) => {
      const missions = resolveMissions(p.id, line.id, ctx);
      const st = pastaState(missions, prevOpen);
      if (st.state !== 'locked') {
        missions.filter((m) => m.done).forEach((m) => award(m.doneBy, m.points));
        if (st.resolved) award(null, XP.pasta);
      }
      const pasta = { id: p.id, bonus: Boolean(p.bonus), missions, ...st };
      pastas.push(pasta);
      byId[p.id] = pasta;
      return pasta;
    };
    for (const p of PASTAS.slice(1)) {
      const pasta = add(p, prevKey);
      prevKey = pasta.state !== 'locked' && pasta.keyDone;
    }
    for (const b of BONUS) add(b, byId[b.after].state !== 'locked' && byId[b.after].keyDone);
    lines[line.id] = { pastas };
  }

  const level = levelFor(xp);
  const ranking = Object.entries(xpBy)
    .map(([userId, points]) => ({ userId, xp: points }))
    .sort((a, b) => b.xp - a.xp);
  return { xp, level, ranking, empresa, lines };
}

/** Semana ISO no formato 2026-W41, usada para agrupar as pautas de Ads. */
export function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
