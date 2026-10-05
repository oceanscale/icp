import { DurableObject } from 'cloudflare:workers';
import { PASTAS, computeGame } from '../shared/game.js';
import { SESSION_DAYS, hashPassword, normalizeEmail, randomToken, sha256, validEmail, validatePassword, verifyPassword } from './auth.js';

/*
 * Banco do Dossiê ICP: um único Durable Object com SQLite (incluso no plano grátis do Workers).
 * Toda regra de permissão mora aqui; o Worker só resolve a sessão e chama os métodos por RPC.
 * Erros de regra saem como "[status] mensagem" e o Worker converte em resposta HTTP.
 */

const DAY = 86_400_000;
const LOCK_WINDOW = 15 * 60_000;
const INVITE_DAYS = 7;
const MAX_LINES = 10;
const DOC_KINDS = ['icp_input', 'icp', 'playbook', 'roteiros', 'jornada', 'funil', 'automacoes', 'simulador', 'conteudo'];
const DYNAMIC_DAYS = 7;
const PRICE_KEYS = ['marketing', 'utilidade', 'autenticacao'];

const fail = (status, message) => {
  throw new Error(`[${status}] ${message}`);
};
const now = () => Date.now();
const parse = (text, fallback = null) => {
  try {
    return text ? JSON.parse(text) : fallback;
  } catch {
    return fallback;
  }
};
const pub = (u) => (u ? { id: u.id, email: u.email, name: u.name, role: u.role, avatarAt: u.avatar_at || null } : null);

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user',
    pass_hash TEXT, pass_salt TEXT, pass_iter INTEGER, active INTEGER NOT NULL DEFAULT 1, created_at INTEGER, last_login INTEGER)`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS invites (token_hash TEXT PRIMARY KEY, kind TEXT NOT NULL, email TEXT NOT NULL, name TEXT, project_id TEXT,
    role TEXT, created_by TEXT, created_at INTEGER, expires_at INTEGER, used_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS attempts (key TEXT PRIMARY KEY, fails INTEGER NOT NULL, first_at INTEGER NOT NULL, locked_until INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, number INTEGER NOT NULL, name TEXT NOT NULL, segment TEXT, city TEXT,
    created_by TEXT, created_at INTEGER, archived INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS members (project_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL, joined_at INTEGER, PRIMARY KEY (project_id, user_id))`,
  `CREATE TABLE IF NOT EXISTS lines (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, position INTEGER NOT NULL, data TEXT, updated_by TEXT, updated_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS docs (project_id TEXT NOT NULL, line_id TEXT NOT NULL, kind TEXT NOT NULL, data TEXT, updated_by TEXT, updated_at INTEGER,
    PRIMARY KEY (project_id, line_id, kind))`,
  `CREATE TABLE IF NOT EXISTS missions (project_id TEXT NOT NULL, line_id TEXT NOT NULL, mission_id TEXT NOT NULL, done_by TEXT, done_at INTEGER,
    PRIMARY KEY (project_id, line_id, mission_id))`,
  `CREATE TABLE IF NOT EXISTS ads (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, line_id TEXT NOT NULL, week TEXT NOT NULL, input TEXT, output TEXT,
    created_by TEXT, created_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, line_id TEXT NOT NULL, mime TEXT, data TEXT, alt TEXT,
    created_by TEXT, created_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS activity (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id TEXT NOT NULL, user_id TEXT, text TEXT, xp INTEGER, created_at INTEGER)`,
  `CREATE INDEX IF NOT EXISTS activity_project ON activity (project_id, id)`,
  `CREATE INDEX IF NOT EXISTS ads_line ON ads (project_id, line_id, week)`,
  `CREATE TABLE IF NOT EXISTS avatars (user_id TEXT PRIMARY KEY, mime TEXT, data TEXT, updated_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT, updated_by TEXT, updated_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS dynamics (token TEXT PRIMARY KEY, project_id TEXT NOT NULL, line_id TEXT NOT NULL, created_by TEXT,
    created_at INTEGER, expires_at INTEGER, closed INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS dynamic_answers (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, line_id TEXT NOT NULL, token TEXT, nome TEXT,
    data TEXT, ip TEXT, created_at INTEGER)`,
  `CREATE INDEX IF NOT EXISTS answers_line ON dynamic_answers (project_id, line_id, created_at)`,
];

// Colunas acrescentadas depois da primeira versão (o ALTER falha se já existir; tudo bem).
const MIGRATIONS = ['ALTER TABLE users ADD COLUMN avatar_at INTEGER'];

export class DossieStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    for (const statement of SCHEMA) this.sql.exec(statement);
    for (const statement of MIGRATIONS) {
      try {
        this.sql.exec(statement);
      } catch {
        /* coluna já existe */
      }
    }
    this.iterations = Math.min(Number(env.PBKDF2_ITERATIONS) || 100_000, 100_000);
  }

  q(query, ...params) {
    return this.sql.exec(query, ...params).toArray();
  }

  one(query, ...params) {
    return this.q(query, ...params)[0] || null;
  }

  // ---------- usuários, sessões e acesso ----------

  user(id) {
    const u = this.one('SELECT * FROM users WHERE id = ? AND active = 1', id);
    if (!u) fail(401, 'Sessão expirada. Entre de novo.');
    return u;
  }

  access(actor, projectId) {
    const project = this.one('SELECT * FROM projects WHERE id = ? AND archived = 0', projectId);
    if (!project) fail(404, 'Caso não encontrado');
    if (actor.role === 'admin') return { project, role: 'gestor', admin: true };
    const member = this.one('SELECT role FROM members WHERE project_id = ? AND user_id = ?', projectId, actor.id);
    if (!member) fail(403, 'Você não participa deste caso');
    return { project, role: member.role, admin: false };
  }

  manage(actor, projectId) {
    const a = this.access(actor, projectId);
    if (a.role !== 'gestor') fail(403, 'Só o gestor do caso pode fazer isso');
    return a;
  }

  line(projectId, lineId) {
    const l = this.one('SELECT * FROM lines WHERE id = ? AND project_id = ?', lineId, projectId);
    if (!l) fail(404, 'Linha de produto não encontrada');
    return l;
  }

  log(projectId, userId, text, xp = 0) {
    // Salvamento automático repete a mesma ação: dentro de 15 minutos, só atualiza o horário da última linha.
    const last = this.one('SELECT id, user_id, text, created_at FROM activity WHERE project_id = ? ORDER BY id DESC LIMIT 1', projectId);
    if (!xp && last && last.user_id === userId && last.text === text && now() - last.created_at < 15 * 60_000) {
      this.sql.exec('UPDATE activity SET created_at = ? WHERE id = ?', now(), last.id);
      return;
    }
    this.sql.exec('INSERT INTO activity (project_id, user_id, text, xp, created_at) VALUES (?, ?, ?, ?, ?)', projectId, userId, text, xp, now());
  }

  async newSession(userId) {
    const token = randomToken();
    this.sql.exec(
      'INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
      await sha256(token),
      userId,
      now() + SESSION_DAYS * DAY,
      now(),
    );
    this.sql.exec('DELETE FROM sessions WHERE expires_at < ?', now());
    return token;
  }

  async setPassword(userId, password) {
    const { hash, salt, iterations } = await hashPassword(password, { iterations: this.iterations });
    this.sql.exec('UPDATE users SET pass_hash = ?, pass_salt = ?, pass_iter = ? WHERE id = ?', hash, salt, iterations, userId);
  }

  checkLock(key) {
    const row = this.one('SELECT locked_until FROM attempts WHERE key = ?', key);
    if (row && row.locked_until > now()) {
      fail(429, `Muitas tentativas. Tente de novo em ${Math.ceil((row.locked_until - now()) / 60_000)} min.`);
    }
  }

  registerFail(key, max) {
    const row = this.one('SELECT * FROM attempts WHERE key = ?', key);
    if (!row || now() - row.first_at > LOCK_WINDOW) {
      this.sql.exec('INSERT OR REPLACE INTO attempts (key, fails, first_at, locked_until) VALUES (?, 1, ?, 0)', key, now());
      return;
    }
    const fails = row.fails + 1;
    this.sql.exec('UPDATE attempts SET fails = ?, locked_until = ? WHERE key = ?', fails, fails >= max ? now() + LOCK_WINDOW : 0, key);
  }

  status() {
    return { needsSetup: !this.one("SELECT id FROM users WHERE role = 'admin' LIMIT 1") };
  }

  async setup({ name, email, password }) {
    if (!this.status().needsSetup) fail(409, 'O primeiro acesso já foi feito');
    const mail = normalizeEmail(email);
    if (!validEmail(mail)) fail(400, 'E-mail inválido');
    if (!name?.trim()) fail(400, 'Informe seu nome');
    const problem = validatePassword(password);
    if (problem) fail(400, problem);
    const id = crypto.randomUUID();
    this.sql.exec("INSERT INTO users (id, email, name, role, created_at) VALUES (?, ?, ?, 'admin', ?)", id, mail, name.trim().slice(0, 80), now());
    await this.setPassword(id, password);
    return { token: await this.newSession(id), user: pub(this.user(id)) };
  }

  async login({ email, password, ip }) {
    const mail = normalizeEmail(email);
    const keys = [`email:${mail}`, `ip:${ip || 'desconhecido'}`];
    keys.forEach((k) => this.checkLock(k));
    const u = this.one('SELECT * FROM users WHERE email = ? AND active = 1', mail);
    const ok = u ? await verifyPassword(String(password || ''), u) : false;
    if (!ok) {
      this.registerFail(keys[0], 5);
      this.registerFail(keys[1], 20);
      fail(401, 'E-mail ou senha incorretos');
    }
    this.sql.exec('DELETE FROM attempts WHERE key = ?', keys[0]);
    this.sql.exec('UPDATE users SET last_login = ? WHERE id = ?', now(), u.id);
    return { token: await this.newSession(u.id), user: pub(u) };
  }

  session(tokenHash) {
    const row = this.one(
      'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1',
      tokenHash,
      now(),
    );
    return pub(row);
  }

  logout(tokenHash) {
    this.sql.exec('DELETE FROM sessions WHERE token_hash = ?', tokenHash);
    return true;
  }

  async changePassword(userId, current, next) {
    const u = this.user(userId);
    if (!(await verifyPassword(String(current || ''), u))) fail(401, 'Senha atual incorreta');
    const problem = validatePassword(next);
    if (problem) fail(400, problem);
    await this.setPassword(u.id, next);
    return true;
  }

  // ---------- convites e redefinição de senha ----------

  async createInvite(actorId, { projectId, email, name, role }) {
    const actor = this.user(actorId);
    const mail = normalizeEmail(email);
    if (!validEmail(mail)) fail(400, 'E-mail inválido');
    let projectName = null;
    if (projectId) {
      const { project } = this.manage(actor, projectId);
      if (!['gestor', 'membro'].includes(role)) fail(400, 'Papel inválido');
      const existing = this.one('SELECT u.id FROM users u JOIN members m ON m.user_id = u.id WHERE u.email = ? AND m.project_id = ?', mail, projectId);
      if (existing) fail(409, 'Essa pessoa já participa do caso');
      projectName = project.name;
    } else {
      if (actor.role !== 'admin') fail(403, 'Só consultores convidam outros consultores');
      role = 'admin';
    }
    const token = randomToken();
    this.sql.exec(
      "INSERT INTO invites (token_hash, kind, email, name, project_id, role, created_by, created_at, expires_at) VALUES (?, 'invite', ?, ?, ?, ?, ?, ?, ?)",
      await sha256(token),
      mail,
      String(name || '').trim().slice(0, 80),
      projectId || null,
      role,
      actor.id,
      now(),
      now() + INVITE_DAYS * DAY,
    );
    if (projectId) this.log(projectId, actor.id, `convidou ${name?.trim() || mail} para o caso`);
    return { token, email: mail, projectName, expiresAt: now() + INVITE_DAYS * DAY };
  }

  async createReset(actorId, { projectId, userId }) {
    const actor = this.user(actorId);
    const target = this.user(userId);
    if (actor.role !== 'admin') {
      this.manage(actor, projectId);
      if (!this.one('SELECT 1 AS ok FROM members WHERE project_id = ? AND user_id = ?', projectId, userId)) fail(403, 'Essa pessoa não participa do caso');
      if (target.role === 'admin') fail(403, 'Só consultores redefinem a senha de outro consultor');
    }
    const token = randomToken();
    this.sql.exec(
      "INSERT INTO invites (token_hash, kind, email, name, project_id, role, created_by, created_at, expires_at) VALUES (?, 'reset', ?, ?, ?, NULL, ?, ?, ?)",
      await sha256(token),
      target.email,
      target.name,
      projectId || null,
      actor.id,
      now(),
      now() + 2 * DAY,
    );
    return { token, email: target.email, expiresAt: now() + 2 * DAY };
  }

  validInvite(tokenHash) {
    const inv = this.one('SELECT * FROM invites WHERE token_hash = ?', tokenHash);
    if (!inv || inv.used_at || inv.expires_at < now()) fail(410, 'Este link expirou ou já foi usado. Peça um novo.');
    return inv;
  }

  invitePreview(tokenHash) {
    const inv = this.validInvite(tokenHash);
    const project = inv.project_id ? this.one('SELECT name FROM projects WHERE id = ?', inv.project_id) : null;
    const exists = Boolean(this.one('SELECT id FROM users WHERE email = ?', inv.email));
    return { kind: inv.kind, email: inv.email, name: inv.name, role: inv.role, projectName: project?.name || null, userExists: exists };
  }

  async acceptInvite(tokenHash, { name, password }) {
    const inv = this.validInvite(tokenHash);
    let u = this.one('SELECT * FROM users WHERE email = ?', inv.email);
    if (inv.kind === 'reset') {
      if (!u) fail(404, 'Conta não encontrada');
      const problem = validatePassword(password);
      if (problem) fail(400, problem);
      await this.setPassword(u.id, password);
      this.sql.exec('DELETE FROM sessions WHERE user_id = ?', u.id);
      this.sql.exec('DELETE FROM attempts WHERE key = ?', `email:${u.email}`);
    } else if (u) {
      // Quem já tem conta confirma a própria senha para entrar no novo caso.
      if (!(await verifyPassword(String(password || ''), u))) fail(401, 'Senha incorreta para esta conta');
      if (inv.role === 'admin' && u.role !== 'admin') this.sql.exec("UPDATE users SET role = 'admin' WHERE id = ?", u.id);
    } else {
      if (!name?.trim()) fail(400, 'Informe seu nome');
      const problem = validatePassword(password);
      if (problem) fail(400, problem);
      const id = crypto.randomUUID();
      this.sql.exec(
        'INSERT INTO users (id, email, name, role, created_at) VALUES (?, ?, ?, ?, ?)',
        id,
        inv.email,
        name.trim().slice(0, 80),
        inv.role === 'admin' ? 'admin' : 'user',
        now(),
      );
      await this.setPassword(id, password);
      u = this.one('SELECT * FROM users WHERE id = ?', id);
    }
    if (inv.kind === 'invite' && inv.project_id) {
      this.sql.exec('INSERT OR IGNORE INTO members (project_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)', inv.project_id, u.id, inv.role, now());
      this.log(inv.project_id, u.id, 'entrou no caso');
    }
    this.sql.exec('UPDATE invites SET used_at = ? WHERE token_hash = ?', now(), tokenHash);
    this.sql.exec('UPDATE users SET last_login = ? WHERE id = ?', now(), u.id);
    return { token: await this.newSession(u.id), user: pub(this.user(u.id)), projectId: inv.project_id };
  }

  // ---------- casos ----------

  loadState(projectId) {
    const empresa = this.one("SELECT data, updated_by, updated_at FROM docs WHERE project_id = ? AND line_id = '' AND kind = 'empresa'", projectId);
    const lines = this.q('SELECT id, position, data, updated_by, updated_at FROM lines WHERE project_id = ? ORDER BY position', projectId).map((l) => ({
      ...l,
      data: parse(l.data, {}),
    }));
    const docs = {};
    for (const d of this.q("SELECT line_id, kind, data, updated_by, updated_at FROM docs WHERE project_id = ? AND line_id <> ''", projectId)) {
      (docs[d.line_id] ||= {})[d.kind] = { data: parse(d.data, {}), updated_by: d.updated_by, updated_at: d.updated_at };
    }
    const ads = this.q('SELECT id, line_id, week, input, output, created_by, created_at FROM ads WHERE project_id = ? ORDER BY created_at', projectId).map((a) => ({
      ...a,
      input: parse(a.input, {}),
      output: parse(a.output, {}),
    }));
    const images = {};
    for (const img of this.q('SELECT id, line_id, alt, created_by, created_at FROM images WHERE project_id = ? ORDER BY created_at', projectId)) {
      images[img.line_id] = img;
    }
    const missions = this.q('SELECT line_id, mission_id, done_by, done_at FROM missions WHERE project_id = ?', projectId);
    return { empresa: empresa ? { ...empresa, data: parse(empresa.data, {}) } : null, lines, docs, ads, images, missions };
  }

  summary(project, role) {
    const state = this.loadState(project.id);
    const game = computeGame(state);
    const members = this.one('SELECT COUNT(*) AS n FROM members WHERE project_id = ?', project.id).n;
    const resolved = state.lines.reduce((acc, l) => acc + game.lines[l.id].pastas.slice(1).filter((p) => !p.bonus && p.state === 'done').length, game.empresa.state === 'done' ? 1 : 0);
    const firstLine = state.lines[0] ? game.lines[state.lines[0].id].pastas : [game.empresa];
    return {
      id: project.id,
      number: project.number,
      name: project.name,
      segment: project.segment,
      city: project.city,
      role,
      members,
      lines: state.lines.map((l) => l.data?.nome || 'Linha sem nome'),
      xp: game.xp,
      level: game.level,
      resolved,
      track: PASTAS.map((p, i) => ({ id: p.id, code: p.code, label: p.label, state: firstLine[i]?.state || 'locked' })),
    };
  }

  listProjects(actorId) {
    const actor = this.user(actorId);
    const rows =
      actor.role === 'admin'
        ? this.q("SELECT *, 'gestor' AS member_role FROM projects WHERE archived = 0 ORDER BY number DESC")
        : this.q(
            'SELECT p.*, m.role AS member_role FROM projects p JOIN members m ON m.project_id = p.id WHERE m.user_id = ? AND p.archived = 0 ORDER BY p.number DESC',
            actor.id,
          );
    return rows.map((p) => this.summary(p, p.member_role));
  }

  createProject(actorId, { name, segment, city }) {
    const actor = this.user(actorId);
    if (actor.role !== 'admin') fail(403, 'Só consultores abrem casos');
    if (!name?.trim()) fail(400, 'Informe o nome da empresa');
    const number = (this.one('SELECT MAX(number) AS n FROM projects')?.n || 0) + 1;
    const id = crypto.randomUUID();
    this.sql.exec(
      'INSERT INTO projects (id, number, name, segment, city, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      id,
      number,
      name.trim().slice(0, 120),
      String(segment || '').trim().slice(0, 120),
      String(city || '').trim().slice(0, 120),
      actor.id,
      now(),
    );
    this.sql.exec("INSERT INTO members (project_id, user_id, role, joined_at) VALUES (?, ?, 'gestor', ?)", id, actor.id, now());
    this.log(id, actor.id, `abriu o caso Nº ${String(number).padStart(3, '0')}`);
    return { id };
  }

  updateProject(actorId, projectId, { name, segment, city }) {
    const actor = this.user(actorId);
    this.manage(actor, projectId);
    if (!name?.trim()) fail(400, 'Informe o nome da empresa');
    this.sql.exec(
      'UPDATE projects SET name = ?, segment = ?, city = ? WHERE id = ?',
      name.trim().slice(0, 120),
      String(segment || '').trim().slice(0, 120),
      String(city || '').trim().slice(0, 120),
      projectId,
    );
    return this.getProject(actorId, projectId);
  }

  archiveProject(actorId, projectId) {
    const actor = this.user(actorId);
    if (actor.role !== 'admin') fail(403, 'Só consultores arquivam casos');
    this.access(actor, projectId);
    this.sql.exec('UPDATE projects SET archived = 1 WHERE id = ?', projectId);
    return true;
  }

  getProject(actorId, projectId) {
    const actor = this.user(actorId);
    const { project, role, admin } = this.access(actor, projectId);
    const state = this.loadState(projectId);
    const game = computeGame(state);
    const members = this.q(
      'SELECT u.id, u.name, u.email, u.role AS user_role, u.avatar_at, m.role, m.joined_at FROM members m JOIN users u ON u.id = m.user_id WHERE m.project_id = ? ORDER BY m.joined_at',
      projectId,
    );
    // Só os nomes de quem tem rastro neste caso (nunca a base inteira de usuários).
    const ids = new Set(members.map((m) => m.id));
    for (const r of this.q('SELECT DISTINCT user_id AS id FROM activity WHERE project_id = ?', projectId)) ids.add(r.id);
    for (const m of state.missions) ids.add(m.done_by);
    for (const l of state.lines) ids.add(l.updated_by);
    for (const a of state.ads) ids.add(a.created_by);
    for (const img of Object.values(state.images)) ids.add(img.created_by);
    for (const kinds of Object.values(state.docs)) for (const d of Object.values(kinds)) ids.add(d.updated_by);
    if (state.empresa) ids.add(state.empresa.updated_by);
    const idList = [...ids].filter(Boolean).slice(0, 90);
    const people = idList.length ? this.q(`SELECT id, name, avatar_at FROM users WHERE id IN (${idList.map(() => '?').join(',')})`, ...idList) : [];
    const names = Object.fromEntries(people.map((u) => [u.id, u.name]));
    names.dinamica = 'Dinâmica';
    const avatars = Object.fromEntries(people.filter((u) => u.avatar_at).map((u) => [u.id, u.avatar_at]));
    const activity = this.q('SELECT user_id, text, xp, created_at FROM activity WHERE project_id = ? ORDER BY id DESC LIMIT 40', projectId).map((a) => ({
      ...a,
      name: names[a.user_id] || 'Alguém',
    }));
    const invites =
      role === 'gestor'
        ? this.q('SELECT email, name, role, expires_at FROM invites WHERE project_id = ? AND kind = ? AND used_at IS NULL AND expires_at > ? ORDER BY created_at DESC', projectId, 'invite', now())
        : [];
    return {
      project,
      me: { ...pub(actor), projectRole: role, admin },
      empresa: state.empresa,
      lines: state.lines,
      docs: state.docs,
      ads: state.ads.slice(-60),
      images: Object.fromEntries(Object.entries(state.images).map(([k, v]) => [k, { id: v.id, alt: v.alt }])),
      game,
      members,
      names,
      avatars,
      activity,
      invites,
      prices: this.getPrices(),
      dynamics: Object.fromEntries(
        this.q('SELECT token, line_id, expires_at FROM dynamics WHERE project_id = ? AND closed = 0 AND expires_at > ?', projectId, now()).map((d) => [
          d.line_id,
          { token: d.token, expires_at: d.expires_at },
        ]),
      ),
      answers: this.q('SELECT id, line_id, nome, data, created_at FROM dynamic_answers WHERE project_id = ? ORDER BY created_at DESC LIMIT 200', projectId).map((a) => ({
        ...a,
        data: parse(a.data, {}),
      })),
    };
  }

  // ---------- pastas ----------

  saveEmpresa(actorId, projectId, data) {
    const actor = this.user(actorId);
    this.access(actor, projectId);
    this.sql.exec(
      "INSERT OR REPLACE INTO docs (project_id, line_id, kind, data, updated_by, updated_at) VALUES (?, '', 'empresa', ?, ?, ?)",
      projectId,
      JSON.stringify(data),
      actor.id,
      now(),
    );
    this.log(projectId, actor.id, 'atualizou a pasta Empresa');
    return this.getProject(actorId, projectId);
  }

  saveLine(actorId, projectId, lineId, data) {
    const actor = this.user(actorId);
    this.access(actor, projectId);
    if (lineId) {
      this.line(projectId, lineId);
      this.sql.exec('UPDATE lines SET data = ?, updated_by = ?, updated_at = ? WHERE id = ?', JSON.stringify(data), actor.id, now(), lineId);
    } else {
      const count = this.one('SELECT COUNT(*) AS n FROM lines WHERE project_id = ?', projectId).n;
      if (count >= MAX_LINES) fail(400, `Limite de ${MAX_LINES} linhas por caso`);
      lineId = crypto.randomUUID();
      this.sql.exec(
        'INSERT INTO lines (id, project_id, position, data, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        lineId,
        projectId,
        count,
        JSON.stringify(data),
        actor.id,
        now(),
      );
      this.log(projectId, actor.id, `abriu a linha ${data.nome || 'sem nome'}`);
    }
    return { lineId, project: this.getProject(actorId, projectId) };
  }

  deleteLine(actorId, projectId, lineId) {
    const actor = this.user(actorId);
    this.manage(actor, projectId);
    const l = this.line(projectId, lineId);
    for (const table of ['docs', 'missions', 'ads', 'images', 'dynamics', 'dynamic_answers']) {
      this.sql.exec(`DELETE FROM ${table} WHERE project_id = ? AND line_id = ?`, projectId, lineId);
    }
    this.sql.exec('DELETE FROM lines WHERE id = ?', lineId);
    this.log(projectId, actor.id, `removeu a linha ${parse(l.data, {}).nome || 'sem nome'}`);
    return this.getProject(actorId, projectId);
  }

  /** Contexto para a IA: o caso, a linha e o que as pastas anteriores já produziram. */
  getContext(actorId, projectId, lineId) {
    const actor = this.user(actorId);
    const { project } = this.access(actor, projectId);
    const line = this.line(projectId, lineId);
    const empresa = this.one("SELECT data FROM docs WHERE project_id = ? AND line_id = '' AND kind = 'empresa'", projectId);
    const docs = {};
    for (const d of this.q('SELECT kind, data FROM docs WHERE project_id = ? AND line_id = ?', projectId, lineId)) docs[d.kind] = parse(d.data, {});
    const headlines = this.q('SELECT output FROM ads WHERE project_id = ? AND line_id = ? ORDER BY created_at DESC LIMIT 4', projectId, lineId).flatMap((a) =>
      (parse(a.output, {}).anuncios || parse(a.output, {}).pautas || []).map((p) => p.titulo || p.headline),
    );
    const otherLines = this.q('SELECT data FROM lines WHERE project_id = ? AND id <> ?', projectId, lineId).map((l) => parse(l.data, {}).nome).filter(Boolean);
    // O desbloqueio do jogo também vale no servidor: pasta trancada não gera nada.
    const game = computeGame(this.loadState(projectId));
    const pastaStates = Object.fromEntries(game.lines[lineId].pastas.map((p) => [p.id, p.state]));
    const answers = this.q('SELECT nome, data FROM dynamic_answers WHERE project_id = ? AND line_id = ? ORDER BY created_at DESC LIMIT 30', projectId, lineId).map((a) => ({
      vendedor: a.nome,
      ...parse(a.data, {}),
    }));
    return {
      answers,
      pastaStates,
      project: { name: project.name, segment: project.segment, city: project.city },
      empresa: parse(empresa?.data, {}),
      line: parse(line.data, {}),
      otherLines,
      docs,
      headlines,
    };
  }

  saveDoc(actorId, projectId, lineId, kind, data, note) {
    const actor = this.user(actorId);
    this.access(actor, projectId);
    this.line(projectId, lineId);
    if (!DOC_KINDS.includes(kind)) fail(400, 'Tipo de documento inválido');
    const text = JSON.stringify(data);
    if (text.length > 300_000) fail(413, 'Documento grande demais');
    this.sql.exec(
      'INSERT OR REPLACE INTO docs (project_id, line_id, kind, data, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      projectId,
      lineId,
      kind,
      text,
      actor.id,
      now(),
    );
    // Um playbook novo traz itens novos: as marcações do anterior deixam de valer.
    if (kind === 'playbook') this.sql.exec("DELETE FROM missions WHERE project_id = ? AND line_id = ? AND mission_id LIKE 'pb.%'", projectId, lineId);
    if (note) this.log(projectId, actor.id, note);
    return this.getProject(actorId, projectId);
  }

  toggleMission(actorId, projectId, lineId, missionId, done) {
    const actor = this.user(actorId);
    this.access(actor, projectId);
    const state = this.loadState(projectId);
    const game = computeGame(state);
    let pasta;
    if (!lineId) {
      pasta = game.empresa;
    } else {
      this.line(projectId, lineId);
      pasta = game.lines[lineId].pastas.find((p) => p.missions.some((m) => m.id === missionId));
    }
    const mission = pasta?.missions.find((m) => m.id === missionId);
    if (!mission) fail(404, 'Missão não encontrada');
    if (mission.auto) fail(400, 'Esta missão é marcada pelo sistema quando a entrega existe');
    if (pasta.state === 'locked') fail(400, 'Esta pasta ainda está trancada');
    if (done) {
      this.sql.exec(
        'INSERT OR IGNORE INTO missions (project_id, line_id, mission_id, done_by, done_at) VALUES (?, ?, ?, ?, ?)',
        projectId,
        lineId || '',
        missionId,
        actor.id,
        now(),
      );
      this.log(projectId, actor.id, `concluiu “${mission.label}”`, mission.points);
      const after = computeGame(this.loadState(projectId));
      const pAfter = lineId ? after.lines[lineId].pastas.find((p) => p.id === pasta.id) : after.empresa;
      if (pAfter.state === 'done' && pasta.state !== 'done') {
        const label = PASTAS.find((p) => p.id === pasta.id)?.label;
        this.log(projectId, actor.id, `resolveu a pasta ${label}`, 50);
      }
    } else {
      this.sql.exec('DELETE FROM missions WHERE project_id = ? AND line_id = ? AND mission_id = ?', projectId, lineId || '', missionId);
    }
    return this.getProject(actorId, projectId);
  }

  // ---------- ads e imagens ----------

  adsWeekCount(actorId, projectId, lineId, week) {
    const actor = this.user(actorId);
    this.access(actor, projectId);
    this.line(projectId, lineId);
    return this.one('SELECT COUNT(*) AS n FROM ads WHERE project_id = ? AND line_id = ? AND week = ?', projectId, lineId, week).n;
  }

  addAds(actorId, projectId, lineId, week, input, output, limit) {
    const actor = this.user(actorId);
    if (this.adsWeekCount(actorId, projectId, lineId, week) >= limit) fail(429, `Limite de ${limit} pedidos de pauta por semana nesta linha`);
    this.sql.exec(
      'INSERT INTO ads (id, project_id, line_id, week, input, output, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      crypto.randomUUID(),
      projectId,
      lineId,
      week,
      JSON.stringify(input),
      JSON.stringify(output),
      actor.id,
      now(),
    );
    this.log(projectId, actor.id, `gerou ${(output.anuncios || output.pautas || []).length} anúncios da semana`);
    return this.getProject(actorId, projectId);
  }

  saveImage(actorId, projectId, lineId, mime, data, alt) {
    const actor = this.user(actorId);
    this.access(actor, projectId);
    this.line(projectId, lineId);
    if (data.length > 1_900_000) fail(413, 'Imagem grande demais');
    this.sql.exec(
      'INSERT INTO images (id, project_id, line_id, mime, data, alt, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      crypto.randomUUID(),
      projectId,
      lineId,
      mime,
      data,
      String(alt || '').slice(0, 300),
      actor.id,
      now(),
    );
    // Guarda só os 3 retratos mais recentes de cada linha.
    this.sql.exec(
      'DELETE FROM images WHERE project_id = ? AND line_id = ? AND id NOT IN (SELECT id FROM images WHERE project_id = ? AND line_id = ? ORDER BY created_at DESC LIMIT 3)',
      projectId,
      lineId,
      projectId,
      lineId,
    );
    this.log(projectId, actor.id, 'revelou o retrato do decisor');
    return this.getProject(actorId, projectId);
  }

  getImage(actorId, imageId) {
    const actor = this.user(actorId);
    const img = this.one('SELECT project_id, mime, data FROM images WHERE id = ?', imageId);
    if (!img) fail(404, 'Imagem não encontrada');
    this.access(actor, img.project_id);
    return { mime: img.mime, data: img.data };
  }

  // ---------- foto de perfil ----------

  setAvatar(actorId, mime, data) {
    const actor = this.user(actorId);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) fail(400, 'Use uma imagem JPG, PNG ou WEBP');
    if (typeof data !== 'string' || data.length > 400_000) fail(413, 'Imagem grande demais');
    if (data) this.sql.exec('INSERT OR REPLACE INTO avatars (user_id, mime, data, updated_at) VALUES (?, ?, ?, ?)', actor.id, mime, data, now());
    this.sql.exec('UPDATE users SET avatar_at = ? WHERE id = ?', now(), actor.id);
    return pub(this.user(actor.id));
  }

  removeAvatar(actorId) {
    const actor = this.user(actorId);
    this.sql.exec('DELETE FROM avatars WHERE user_id = ?', actor.id);
    this.sql.exec('UPDATE users SET avatar_at = NULL WHERE id = ?', actor.id);
    return pub(this.user(actor.id));
  }

  getAvatar(actorId, userId) {
    this.user(actorId);
    const row = this.one('SELECT mime, data FROM avatars WHERE user_id = ?', userId);
    if (!row) fail(404, 'Sem foto');
    return row;
  }

  // ---------- tabela de preços do WhatsApp (vale para todos os casos) ----------

  getPrices() {
    const row = this.one("SELECT value, updated_by, updated_at FROM config WHERE key = 'precos'");
    if (!row) return null;
    const by = this.one('SELECT name FROM users WHERE id = ?', row.updated_by);
    return { ...parse(row.value, {}), updated_at: row.updated_at, updated_by: by?.name || null };
  }

  setPrices(actorId, body) {
    const actor = this.user(actorId);
    if (actor.role !== 'admin') fail(403, 'Só consultores editam a tabela de preços');
    const value = {};
    for (const key of PRICE_KEYS) {
      const n = Number(body?.[key]);
      value[key] = Number.isFinite(n) && n >= 0 && n < 100 ? n : 0;
    }
    value.fonte = String(body?.fonte || '').trim().slice(0, 200);
    this.sql.exec("INSERT OR REPLACE INTO config (key, value, updated_by, updated_at) VALUES ('precos', ?, ?, ?)", JSON.stringify(value), actor.id, now());
    return this.getPrices();
  }

  // ---------- dinâmica do ICP: link público para os vendedores responderem ----------

  createDynamic(actorId, projectId, lineId, token) {
    const actor = this.user(actorId);
    this.access(actor, projectId);
    const line = this.line(projectId, lineId);
    this.sql.exec('UPDATE dynamics SET closed = 1 WHERE project_id = ? AND line_id = ?', projectId, lineId);
    this.sql.exec(
      'INSERT INTO dynamics (token, project_id, line_id, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      token,
      projectId,
      lineId,
      actor.id,
      now(),
      now() + DYNAMIC_DAYS * DAY,
    );
    this.log(projectId, actor.id, `abriu uma dinâmica do ICP para a linha ${parse(line.data, {}).nome || ''}`.trim());
    return this.getProject(actorId, projectId);
  }

  closeDynamic(actorId, projectId, lineId) {
    const actor = this.user(actorId);
    this.access(actor, projectId);
    this.sql.exec('UPDATE dynamics SET closed = 1 WHERE project_id = ? AND line_id = ?', projectId, lineId);
    return this.getProject(actorId, projectId);
  }

  openDynamic(token) {
    const d = this.one('SELECT * FROM dynamics WHERE token = ?', token);
    if (!d || d.closed || d.expires_at < now()) fail(410, 'Esta dinâmica foi encerrada. Peça um link novo a quem conduz o treinamento.');
    const project = this.one('SELECT name, archived FROM projects WHERE id = ?', d.project_id);
    const line = this.one('SELECT data FROM lines WHERE id = ?', d.line_id);
    if (!project || project.archived || !line) fail(410, 'Esta dinâmica foi encerrada.');
    return { d, projectName: project.name, lineName: parse(line.data, {}).nome || '' };
  }

  dynamicInfo(token) {
    const { d, projectName, lineName } = this.openDynamic(token);
    const answers = this.one('SELECT COUNT(*) AS n FROM dynamic_answers WHERE token = ?', token).n;
    return { projectName, lineName, expiresAt: d.expires_at, answers };
  }

  submitDynamic(token, { nome, cliente, frase }, ip) {
    const { d } = this.openDynamic(token);
    const total = this.one('SELECT COUNT(*) AS n FROM dynamic_answers WHERE token = ?', token).n;
    if (total >= 200) fail(429, 'Esta dinâmica já recebeu o máximo de respostas');
    const recent = this.one('SELECT COUNT(*) AS n FROM dynamic_answers WHERE ip = ? AND created_at > ?', ip || '', now() - 3_600_000).n;
    if (recent >= 30) fail(429, 'Muitas respostas seguidas deste aparelho. Tente mais tarde.');
    const name = String(nome || '').trim().slice(0, 80);
    if (!name) fail(400, 'Informe seu nome');
    if (!cliente?.dor?.trim()) fail(400, 'Conte a dor do cliente');
    this.sql.exec(
      'INSERT INTO dynamic_answers (id, project_id, line_id, token, nome, data, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      crypto.randomUUID(),
      d.project_id,
      d.line_id,
      token,
      name,
      JSON.stringify({ ...cliente, frase: String(frase || '').trim().slice(0, 400) }),
      ip || '',
      now(),
    );
    this.log(d.project_id, 'dinamica', `recebeu a resposta de ${name}`);
    return { ok: true };
  }

  deleteAnswer(actorId, projectId, answerId) {
    const actor = this.user(actorId);
    this.access(actor, projectId);
    this.sql.exec('DELETE FROM dynamic_answers WHERE id = ? AND project_id = ?', answerId, projectId);
    return this.getProject(actorId, projectId);
  }

  // ---------- time ----------

  removeMember(actorId, projectId, userId) {
    const actor = this.user(actorId);
    this.manage(actor, projectId);
    if (userId === actor.id) fail(400, 'Você não pode se remover do caso');
    const target = this.one('SELECT u.name FROM members m JOIN users u ON u.id = m.user_id WHERE m.project_id = ? AND m.user_id = ?', projectId, userId);
    if (!target) fail(404, 'Pessoa não encontrada no caso');
    this.sql.exec('DELETE FROM members WHERE project_id = ? AND user_id = ?', projectId, userId);
    this.log(projectId, actor.id, `removeu ${target.name} do caso`);
    return this.getProject(actorId, projectId);
  }

  setMemberRole(actorId, projectId, userId, role) {
    const actor = this.user(actorId);
    this.manage(actor, projectId);
    if (!['gestor', 'membro'].includes(role)) fail(400, 'Papel inválido');
    if (userId === actor.id && actor.role !== 'admin') fail(400, 'Peça a outro gestor para mudar o seu papel');
    this.sql.exec('UPDATE members SET role = ? WHERE project_id = ? AND user_id = ?', role, projectId, userId);
    return this.getProject(actorId, projectId);
  }

  cancelInvite(actorId, projectId, email) {
    const actor = this.user(actorId);
    this.manage(actor, projectId);
    this.sql.exec("UPDATE invites SET used_at = ? WHERE project_id = ? AND email = ? AND kind = 'invite' AND used_at IS NULL", now(), projectId, normalizeEmail(email));
    return this.getProject(actorId, projectId);
  }
}

