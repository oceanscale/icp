export const pad3 = (n) => String(n ?? 0).padStart(3, '0');

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
export function dateLabel(ms) {
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function ago(ms) {
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  if (s < 86400 * 7) return `há ${Math.floor(s / 86400)} d`;
  return dateLabel(ms);
}

export const brl = (n, digits = 2) =>
  Number.isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: digits, maximumFractionDigits: digits }) : 'R$ 0';
export const num = (n, digits = 0) => (Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: digits }) : '0');

export function weekLabel(week) {
  const [year, w] = week.split('-W');
  return `Semana ${Number(w)} · ${year}`;
}

/** Segunda-feira (UTC) da semana ISO "2026-W41". */
export function mondayOfIsoWeek(week) {
  const [y, w] = week.split('-W').map(Number);
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const day = jan4.getUTCDay() || 7;
  return new Date(jan4.getTime() + ((w - 1) * 7 - (day - 1)) * 86400000);
}

const mondayOf = (ms) => {
  const d = new Date(ms);
  const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const day = new Date(utc).getUTCDay() || 7;
  return utc - (day - 1) * 86400000;
};

/** "Semana 1 do caso · 05 a 11 OUT": conta as semanas desde a abertura do caso. */
export function caseWeekLabel(week, caseCreatedAt) {
  const start = mondayOfIsoWeek(week).getTime();
  const n = Math.max(1, Math.floor((start - mondayOf(caseCreatedAt)) / (7 * 86400000)) + 1);
  const end = new Date(start + 6 * 86400000);
  const s = new Date(start);
  const fmt = (d) => `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]}`;
  return { short: `Semana ${n}`, long: `Semana ${n} do caso · ${fmt(s)} a ${fmt(end)}` };
}

export function clientesReais(n) {
  if (n <= 0) return 'Sem clientes reais na entrevista';
  const words = ['', 'um', 'dois'];
  return `Com ${words[n] || n} ${n === 1 ? 'cliente real' : 'clientes reais'}`;
}

export const firstName = (name) => String(name || '').split(/[\s,]+/).filter(Boolean)[0] || '';

/** Prazo "2026-10-12" comparado com hoje, no fuso do aparelho. */
export function dueInfo(due, done) {
  if (!due) return null;
  const [y, m, d] = due.split('-').map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((new Date(y, m - 1, d) - today) / 86400000);
  const label = `${String(d).padStart(2, '0')} ${MONTHS[m - 1]}`;
  if (done) return { label, days, tone: 'done', text: `Prazo ${label}` };
  if (days < 0) return { label, days, tone: 'late', text: days === -1 ? 'Atrasada 1 dia' : `Atrasada ${-days} dias` };
  if (days === 0) return { label, days, tone: 'soon', text: 'Vence hoje' };
  if (days === 1) return { label, days, tone: 'soon', text: 'Vence amanhã' };
  return { label, days, tone: days <= 3 ? 'soon' : 'ok', text: `Prazo ${label}` };
}

/** Data de hoje no formato do campo de data. */
export function todayIso(addDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + addDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
