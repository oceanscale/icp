import { GENERATORS, aiModel, writeAds } from './ai.js';
import { clearCookie, readSessionToken, sameString, sessionCookie, sha256 } from './auth.js';
import { generatePortrait } from './images.js';
import { HttpError, fromStoreError, isSameOrigin, json, pickStrings, readJson, str } from './util.js';
import { isoWeek } from '../shared/game.js';

export { DossieStore } from './store.js';

/*
 * API do Dossiê ICP. Tudo fora de /api/* é servido pelos arquivos estáticos do build (dist/).
 * Segredos (Cloudflare > Worker > Configurações > Variáveis e segredos, tipo Segredo):
 *   ANTHROPIC_API_KEY  geração das pastas com Claude
 *   SETUP_TOKEN        libera o primeiro acesso (criação do primeiro consultor); pode apagar depois
 * Variáveis (wrangler.jsonc > vars): ADS_WEEKLY_LIMIT, AI_MODEL (opcional).
 * Bindings: DOSSIE (Durable Object com SQLite) e AI (Workers AI, retrato do decisor).
 */

const EMPRESA_KEYS = ['pitch', 'missao', 'diferenciais', 'concorrentes', 'time', 'ferramentas', 'observacoes'];
const LINE_KEYS = ['nome', 'como_funciona', 'dor', 'preco', 'ticket', 'concorrentes', 'ciclo'];
const CLIENTE_KEYS = ['nome', 'segmento', 'dor', 'gatilho', 'ciclo', 'objecao', 'ticket', 'resultado'];
const SIM_KEYS = [
  'custoMarketing', 'custoUtilidade', 'custoAutenticacao', 'margem', 'leads', 'msgMarketing', 'msgUtilidade', 'msgAutenticacao',
  'taxaResposta', 'taxaReuniao', 'taxaFechamento', 'ticket', 'orcamento', 'metaReceita',
];
const PLATFORMS = ['Meta', 'Google', 'LinkedIn', 'TikTok'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const store = (env) => env.DOSSIE.get(env.DOSSIE.idFromName('main'));
const adsLimit = (env) => Math.max(1, Number(env.ADS_WEEKLY_LIMIT) || 3);
const inviteLink = (url, token) => `${url.origin}/#/convite/${token}`;

function sanitizeDoc(kind, body) {
  if (kind === 'icp_input') {
    const clientes = (Array.isArray(body.clientes) ? body.clientes : []).slice(0, 5).map((c) => pickStrings(c, CLIENTE_KEYS, 600));
    return { clientes, observacoes: str(body.observacoes, 2000) };
  }
  if (kind === 'simulador') {
    const out = {};
    for (const key of SIM_KEYS) {
      const n = Number(body[key]);
      out[key] = Number.isFinite(n) && n >= 0 ? Math.min(n, 1e9) : 0;
    }
    return out;
  }
  throw new HttpError('Este documento não é editável', 400);
}

function sanitizeAds(body) {
  const plataformas = (Array.isArray(body.plataformas) ? body.plataformas : []).filter((p) => PLATFORMS.includes(p));
  const referencias = (Array.isArray(body.referencias) ? body.referencias : [])
    .slice(0, 8)
    .map((r) => ({ plataforma: PLATFORMS.includes(r?.plataforma) ? r.plataforma : 'Meta', url: str(r?.url, 500), nota: str(r?.nota, 200) }))
    .filter((r) => /^https:\/\/\S+$/i.test(r.url));
  const prints = (Array.isArray(body.prints) ? body.prints : [])
    .slice(0, 4)
    .filter((p) => IMAGE_TYPES.includes(p?.media_type) && typeof p.data === 'string' && p.data.length < 1_600_000 && /^[A-Za-z0-9+/=]+$/.test(p.data.slice(0, 200)));
  return { plataformas, objetivo: str(body.objetivo, 300), referencias, prints };
}

async function route(request, env, url, setCookie) {
  const { pathname } = url;
  const method = request.method;
  const db = store(env);
  const ip = request.headers.get('cf-connecting-ip') || '';

  if (pathname === '/api/health' && method === 'GET') {
    return { ok: true, anthropic: Boolean(env.ANTHROPIC_API_KEY), aiModel: aiModel(env), portrait: Boolean(env.AI), adsWeeklyLimit: adsLimit(env) };
  }

  // ----- primeiro acesso, login e convites (sem sessão) -----
  if (pathname === '/api/setup' && method === 'GET') {
    return { ...(await db.status()), tokenConfigured: Boolean(env.SETUP_TOKEN) };
  }
  if (pathname === '/api/setup' && method === 'POST') {
    const body = await readJson(request);
    if (!env.SETUP_TOKEN) throw new HttpError('Configure o segredo SETUP_TOKEN no Worker para liberar o primeiro acesso', 503);
    if (!sameString(String(body.token || ''), env.SETUP_TOKEN)) throw new HttpError('Código de primeiro acesso incorreto', 403);
    const { token, user } = await db.setup(body);
    setCookie(sessionCookie(token, url));
    return { user };
  }
  if (pathname === '/api/login' && method === 'POST') {
    const body = await readJson(request);
    const { token, user } = await db.login({ email: body.email, password: body.password, ip });
    setCookie(sessionCookie(token, url));
    return { user };
  }
  const inviteMatch = /^\/api\/invites\/([A-Za-z0-9_-]{20,80})$/.exec(pathname);
  if (inviteMatch) {
    const hash = await sha256(inviteMatch[1]);
    if (method === 'GET') return db.invitePreview(hash);
    if (method === 'POST') {
      const body = await readJson(request);
      const { token, user, projectId } = await db.acceptInvite(hash, { name: body.name, password: body.password });
      setCookie(sessionCookie(token, url));
      return { user, projectId };
    }
  }

  // ----- daqui para baixo, só com sessão -----
  const raw = readSessionToken(request);
  const tokenHash = raw ? await sha256(raw) : null;
  const user = tokenHash ? await db.session(tokenHash) : null;

  if (pathname === '/api/me' && method === 'GET') return { user };
  if (pathname === '/api/logout' && method === 'POST') {
    if (tokenHash) await db.logout(tokenHash);
    setCookie(clearCookie(url));
    return { ok: true };
  }
  if (!user) throw new HttpError('Entre para continuar', 401);
  const me = user.id;

  if (pathname === '/api/password' && method === 'POST') {
    const body = await readJson(request);
    await db.changePassword(me, body.current, body.next);
    return { ok: true };
  }
  if (pathname === '/api/consultores/convite' && method === 'POST') {
    const body = await readJson(request);
    const invite = await db.createInvite(me, { email: body.email, name: body.name });
    return { ...invite, link: inviteLink(url, invite.token), token: undefined };
  }

  const imageMatch = /^\/api\/images\/([0-9a-f-]{36})$/.exec(pathname);
  if (imageMatch && method === 'GET') {
    const img = await db.getImage(me, imageMatch[1]);
    const bytes = Uint8Array.from(atob(img.data), (c) => c.charCodeAt(0));
    return new Response(bytes, { headers: { 'content-type': img.mime, 'cache-control': 'private, max-age=86400' } });
  }

  if (pathname === '/api/projects') {
    if (method === 'GET') return { projects: await db.listProjects(me) };
    if (method === 'POST') return db.createProject(me, await readJson(request));
  }

  const p = /^\/api\/projects\/([0-9a-f-]{36})(\/.*)?$/.exec(pathname);
  if (!p) throw new HttpError('Rota não encontrada', 404);
  const [, pid, rest = ''] = p;

  if (rest === '') {
    if (method === 'GET') return db.getProject(me, pid);
    if (method === 'PUT') return db.updateProject(me, pid, await readJson(request));
    if (method === 'DELETE') return { ok: await db.archiveProject(me, pid) };
  }
  if (rest === '/empresa' && method === 'PUT') {
    return db.saveEmpresa(me, pid, pickStrings(await readJson(request), EMPRESA_KEYS, 3000));
  }
  if (rest === '/lines' && method === 'POST') {
    return db.saveLine(me, pid, null, pickStrings(await readJson(request), LINE_KEYS, 2000));
  }
  if (rest === '/missions' && method === 'POST') {
    const body = await readJson(request);
    return db.toggleMission(me, pid, str(body.lineId, 40), str(body.missionId, 40), Boolean(body.done));
  }
  if (rest === '/invites' && method === 'POST') {
    const body = await readJson(request);
    const invite = await db.createInvite(me, { projectId: pid, email: body.email, name: body.name, role: body.role });
    return { ...invite, link: inviteLink(url, invite.token), token: undefined };
  }
  if (rest === '/invites' && method === 'DELETE') {
    return db.cancelInvite(me, pid, (await readJson(request)).email);
  }

  const member = /^\/members\/([0-9a-f-]{36})(\/reset)?$/.exec(rest);
  if (member) {
    const [, uid, reset] = member;
    if (reset && method === 'POST') {
      const r = await db.createReset(me, { projectId: pid, userId: uid });
      return { ...r, link: inviteLink(url, r.token), token: undefined };
    }
    if (!reset && method === 'PUT') return db.setMemberRole(me, pid, uid, (await readJson(request)).role);
    if (!reset && method === 'DELETE') return db.removeMember(me, pid, uid);
  }

  const l = /^\/lines\/([0-9a-f-]{36})(\/.*)?$/.exec(rest);
  if (!l) throw new HttpError('Rota não encontrada', 404);
  const [, lid, sub = ''] = l;

  if (sub === '' && method === 'PUT') return (await db.saveLine(me, pid, lid, pickStrings(await readJson(request), LINE_KEYS, 2000))).project;
  if (sub === '' && method === 'DELETE') return db.deleteLine(me, pid, lid);

  const doc = /^\/docs\/(icp_input|simulador)$/.exec(sub);
  if (doc && method === 'PUT') {
    const kind = doc[1];
    const note = kind === 'icp_input' ? 'atualizou a entrevista de carteira' : 'salvou um cenário no simulador';
    return db.saveDoc(me, pid, lid, kind, sanitizeDoc(kind, await readJson(request)), note);
  }

  const gen = /^\/generate\/(icp|playbook|roteiros|funil|automacoes)$/.exec(sub);
  if (gen && method === 'POST') {
    const kind = gen[1];
    const ctx = await db.getContext(me, pid, lid);
    if (ctx.pastaStates[kind] === 'locked') throw new HttpError('Esta pasta ainda está trancada', 400);
    const data = await GENERATORS[kind](env, ctx);
    const labels = { icp: 'gerou o ICP', playbook: 'gerou o playbook', roteiros: 'gerou os roteiros', funil: 'desenhou o funil', automacoes: 'desenhou a cadência e as automações' };
    return db.saveDoc(me, pid, lid, kind, data, `${labels[kind]} da linha ${ctx.line.nome || ''}`.trim());
  }

  if (sub === '/portrait' && method === 'POST') {
    const ctx = await db.getContext(me, pid, lid);
    const persona = ctx.docs.icp?.persona;
    if (!persona?.prompt_imagem) throw new HttpError('Gere o ICP antes de revelar o retrato', 400);
    const img = await generatePortrait(env, persona.prompt_imagem);
    return db.saveImage(me, pid, lid, img.mime, img.data, persona.descricao_visual);
  }

  if (sub === '/ads' && method === 'POST') {
    const input = sanitizeAds(await readJson(request, 7_000_000));
    const week = isoWeek();
    const limit = adsLimit(env);
    const ctx = await db.getContext(me, pid, lid);
    if (ctx.pastaStates.ads === 'locked') throw new HttpError('Esta pasta ainda está trancada', 400);
    if ((await db.adsWeekCount(me, pid, lid, week)) >= limit) throw new HttpError(`Limite de ${limit} pedidos de pauta por semana nesta linha`, 429);
    const output = await writeAds(env, ctx, input);
    const { prints, ...stored } = input;
    return db.addAds(me, pid, lid, week, { ...stored, prints: prints.length }, output, limit);
  }

  throw new HttpError('Rota não encontrada', 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (request.method !== 'GET' && !isSameOrigin(request, url)) return json({ error: 'Origem não permitida' }, 403);
    const cookies = [];
    try {
      const result = await route(request, env, url, (c) => cookies.push(c));
      if (result instanceof Response) return result;
      const response = json(result ?? { ok: true });
      cookies.forEach((c) => response.headers.append('set-cookie', c));
      return response;
    } catch (error) {
      const known = error instanceof HttpError ? error : fromStoreError(error);
      if (known) {
        const response = json({ error: known.message }, known.status);
        if (known.status === 401) response.headers.append('set-cookie', clearCookie(url));
        return response;
      }
      console.error(error);
      return json({ error: 'Erro interno' }, 500);
    }
  },
};
