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
