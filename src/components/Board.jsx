import React, { useMemo, useState } from 'react';
import { dueInfo, firstName } from '../lib/format.js';
import Avatar from './Avatar.jsx';

// Padrão de um quadro novo; o gestor renomeia, cria e remove colunas (a primeira e a última ficam fixas).
export const COLUMNS = [
  { id: 'todo', title: 'Pistas na mesa', hint: 'Esperando um responsável ou o começo' },
  { id: 'doing', title: 'Em investigação', hint: 'Alguém está cuidando' },
  { id: 'review', title: 'Para conferir', hint: 'Feito, falta o gestor checar' },
  { id: 'done', title: 'Caso arquivado', hint: 'Entregue e marcado no playbook' },
];

/** Endereço da API de um cartão: item do playbook (por linha) ou cartão do gestor. */
export const cardPath = (pid, card) => (card.custom ? `/projects/${pid}/cards/${card.mission_id}` : `/projects/${pid}/lines/${card.line_id}/tasks/${card.mission_id}`);

// Pontos do pódio: 10 por pista arquivada, mais 5 se foi entregue no prazo.
const POINTS = 10;
const ON_TIME = 5;
const TITLES = ['Detetive-chefe', 'Braço direito', 'Olho vivo'];

export function boardRanking(cards, month) {
  const now = new Date();
  const score = new Map();
  for (const c of cards) {
    if (c.status !== 'done' || !c.done_by || !c.done_at) continue;
    const d = new Date(c.done_at);
    if (month && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) continue;
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const onTime = !c.due || day <= c.due;
    const s = score.get(c.done_by) || { userId: c.done_by, points: 0, cards: 0, onTime: 0, last: 0 };
    s.points += POINTS + (onTime ? ON_TIME : 0);
    s.cards += 1;
    if (onTime) s.onTime += 1;
    s.last = Math.max(s.last, c.done_at);
    score.set(c.done_by, s);
  }
  return [...score.values()].sort((a, b) => b.points - a.points || b.onTime - a.onTime || a.last - b.last);
}

// Inclinação estável por cartão, para o quadro parecer montado à mão.
const tilt = (id) => {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 7) - 3) * 0.35;
};

function Polaroid({ id, person, srcFor }) {
  if (!id) {
    return (
      <span className="ev-polaroid ev-polaroid-empty" title="Sem responsável">
        <span className="ev-silhouette" aria-hidden="true">
          <svg viewBox="0 0 32 32" width="30" height="30">
            <path d="M8 13h16l-2-6c-.5-1.4-1.6-2-3-2h-6c-1.4 0-2.5.6-3 2z M5 14h22v1.6H5z" fill="currentColor" />
            <circle cx="16" cy="19" r="4.6" fill="currentColor" />
            <path d="M7 32c.6-5.6 4.4-8 9-8s8.4 2.4 9 8z" fill="currentColor" />
          </svg>
        </span>
        <span className="ev-polaroid-name">sem dono</span>
      </span>
    );
  }
  return (
    <span className="ev-polaroid" title={person?.name}>
      <Avatar userId={id} name={person?.name} avatarAt={person?.avatar_at} size={40} srcFor={srcFor} className="ev-photo" />
      <span className="ev-polaroid-name">{firstName(person?.name) || 'Alguém'}</span>
    </span>
  );
}

/** Pódio dos três que mais resolveram pistas, acima do quadro. */
function Podium({ cards, people, srcFor, meId }) {
  const hasMonth = useMemo(() => boardRanking(cards, true).length > 0, [cards]);
  const [month, setMonth] = useState(hasMonth);
  const rank = useMemo(() => boardRanking(cards, month), [cards, month]);
  const top = rank.slice(0, 3);
  const me = meId ? rank.findIndex((r) => r.userId === meId) : -1;
  const monthName = new Date().toLocaleDateString('pt-BR', { month: 'long' });

  return (
    <section className="podium" aria-label="Quadro de honra">
      <div className="podium-head">
        <span className="dq-label">Quadro de honra</span>
        <h3 className="podium-heading">Quem mais resolveu pistas</h3>
        <div className="podium-period" role="group" aria-label="Período">
          <button type="button" className={month ? 'is-on' : ''} aria-pressed={month} onClick={() => setMonth(true)}>
            Em {monthName}
          </button>
          <button type="button" className={!month ? 'is-on' : ''} aria-pressed={!month} onClick={() => setMonth(false)}>
            Desde o início
          </button>
        </div>
        <p className="podium-rule">
          Cada pista arquivada vale {POINTS} pontos, mais {ON_TIME} se foi entregue no prazo.
          {me >= 3 ? ` Você está em ${me + 1}º, com ${rank[me].points} pontos.` : ''}
        </p>
      </div>
      {top.length ? (
        <ol className="podium-list">
          {[1, 0, 2].map((i) => {
              const r = top[i];
              if (!r) {
                return (
                  <li key={`vaga-${i}`} className={`podium-spot podium-${i + 1} podium-vacant`}>
                    <span className="podium-photo">
                      <span className="ev-silhouette podium-silhouette" aria-hidden="true">
                        <svg viewBox="0 0 32 32" width="40" height="40">
                          <path d="M8 13h16l-2-6c-.5-1.4-1.6-2-3-2h-6c-1.4 0-2.5.6-3 2z M5 14h22v1.6H5z" fill="currentColor" />
                          <circle cx="16" cy="19" r="4.6" fill="currentColor" />
                          <path d="M7 32c.6-5.6 4.4-8 9-8s8.4 2.4 9 8z" fill="currentColor" />
                        </svg>
                      </span>
                    </span>
                    <b className="podium-name">Vaga aberta</b>
                    <span className="podium-title">{TITLES[i]}</span>
                    <span className="podium-meta">Arquive uma pista para entrar</span>
                    <span className="podium-step" aria-hidden="true">
                      {i + 1}º
                    </span>
                  </li>
                );
              }
              const p = people[r.userId];
              return (
                <li key={r.userId} className={`podium-spot podium-${i + 1}`}>
                  <span className="podium-photo">
                    <Avatar userId={r.userId} name={p?.name} avatarAt={p?.avatar_at} size={i === 0 ? 68 : 54} srcFor={srcFor} className="ev-photo" />
                  </span>
                  <b className="podium-name">{r.userId === meId ? 'Você' : firstName(p?.name) || 'Alguém'}</b>
                  <span className="podium-title">{TITLES[i]}</span>
                  <span className="podium-points">{r.points} pts</span>
                  <span className="podium-meta">
                    {r.cards} {r.cards === 1 ? 'pista' : 'pistas'} · {r.onTime} no prazo
                  </span>
                  <span className="podium-step" aria-hidden="true">
                    {i + 1}º
                  </span>
                </li>
              );
            })}
        </ol>
      ) : (
        <p className="podium-empty">Ninguém arquivou uma pista {month ? `em ${monthName}` : 'ainda'}. O primeiro cartão arquivado abre o pódio.</p>
      )}
    </section>
  );
}

function EvidenceCard({ card, number, person, srcFor, draggable, onOpen, onDragStart, showLine }) {
  const done = card.status === 'done';
  const due = dueInfo(card.due, done);
  // div com papel de botão: botões nativos não arrastam em todos os navegadores.
  const open = onOpen ? () => onOpen(card) : undefined;
  return (
    <li className="ev-slot" style={{ '--ev-tilt': `${tilt(card.line_id + card.mission_id)}deg` }}>
      <div
        role={onOpen ? 'button' : undefined}
        tabIndex={onOpen ? 0 : undefined}
        className={`ev-card ${onOpen ? 'ev-clickable' : ''} ${card.custom ? 'ev-custom' : ''} ${due?.tone === 'late' ? 'ev-late' : ''} ${done ? 'ev-done' : ''}`}
        draggable={draggable || undefined}
        onDragStart={draggable ? (e) => onDragStart(e, card) : undefined}
        onClick={open}
        onKeyDown={open ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open()) : undefined}
        aria-label={onOpen ? `${card.title}. Abrir ficha` : undefined}
      >
        <span className="ev-pin" aria-hidden="true" />
        <span className="ev-top">
          <span className="ev-no">
            {card.custom ? 'Cartão extra' : 'Evidência'} {number}
          </span>
          {showLine ? <span className="ev-line">{card.line_name}</span> : null}
        </span>
        <span className="ev-title">{card.title}</span>
        <span className="ev-section">{card.custom ? card.hint || 'Cartão do gestor' : card.section}</span>
        <span className="ev-foot">
          <Polaroid id={card.assignee_id || (done ? card.done_by : null)} person={person} srcFor={srcFor} />
          <span className="ev-foot-right">
            {done ? (
              <span className="ev-stamp">Arquivado</span>
            ) : due ? (
              <span className={`ev-due ev-due-${due.tone}`}>{due.tone === 'late' ? 'Atrasada' : due.text}</span>
            ) : (
              <span className="ev-due ev-due-none">Sem prazo</span>
            )}
            {!done && due?.tone === 'late' ? <span className="ev-due-sub">{due.text}</span> : null}
            {card.link_open && !card.assignee_id ? <span className="ev-clip">Link aberto</span> : null}
          </span>
        </span>
      </div>
    </li>
  );
}

/** Fio vermelho ligando os alfinetes das colunas. */
function stringPath(n) {
  const xs = Array.from({ length: n }, (_, i) => ((i + 0.5) / n) * 100);
  return xs.reduce((d, x, i) => (i === 0 ? `M${x} 2` : `${d} Q ${(xs[i - 1] + x) / 2} 9 ${x} 2`), '');
}

/**
 * Quadro do time com cara de mural de investigação, com o pódio em cima.
 * people: { [userId]: { name, avatar_at } } · canMove(card) · onMove(card, status) · onOpen(card)
 */
export default function Board({ cards, columns = COLUMNS, people, srcFor, canMove, onMove, onOpen, toolbar, meId }) {
  const [lineFilter, setLineFilter] = useState(null);
  const [personFilter, setPersonFilter] = useState('');
  const [over, setOver] = useState(null);

  const lines = useMemo(() => [...new Map(cards.map((c) => [c.line_id, c.line_name])).entries()], [cards]);
  // Número de evidência em sequência dentro de cada linha (com o número da linha quando há mais de uma).
  const numbers = useMemo(() => {
    const byLine = new Map(lines.map(([id], i) => [id, i + 1]));
    const seq = {};
    return Object.fromEntries(
      cards.map((c) => {
        seq[c.line_id] = (seq[c.line_id] || 0) + 1;
        const n = String(seq[c.line_id]).padStart(2, '0');
        return [`${c.line_id}|${c.mission_id}`, lines.length > 1 ? `${byLine.get(c.line_id)}.${n}` : n];
      }),
    );
  }, [cards, lines]);
  const assignees = useMemo(() => [...new Set(cards.map((c) => c.assignee_id).filter(Boolean))], [cards]);

  const visible = cards.filter((c) => (lineFilter === null || c.line_id === lineFilter) && (!personFilter || (personFilter === '-' ? !c.assignee_id : c.assignee_id === personFilter)));
  const late = visible.filter((c) => c.status !== 'done' && dueInfo(c.due)?.tone === 'late').length;
  const doneCount = visible.filter((c) => c.status === 'done').length;
  const free = visible.filter((c) => !c.assignee_id && c.status !== 'done').length;
  const pct = visible.length ? Math.round((doneCount / visible.length) * 100) : 0;

  const dragStart = (e, card) => {
    e.dataTransfer.setData('text/plain', `${card.line_id}|${card.mission_id}`);
    e.dataTransfer.effectAllowed = 'move';
  };
  const drop = (e, status) => {
    e.preventDefault();
    setOver(null);
    const key = e.dataTransfer.getData('text/plain');
    const card = cards.find((c) => `${c.line_id}|${c.mission_id}` === key);
    if (card && card.status !== status && canMove?.(card)) onMove(card, status);
  };

  return (
    <>
      <Podium cards={cards} people={people} srcFor={srcFor} meId={meId} />
      <div className="tboard">
        <div className="board-head">
          <div className="board-tags" aria-label="Resumo do quadro">
            <span className="board-tag">
              <b>{visible.length}</b> pistas
            </span>
            <span className="board-tag board-tag-free">
              <b>{free}</b> sem dono
            </span>
            <span className={`board-tag ${late ? 'board-tag-late' : ''}`}>
              <b>{late}</b> atrasadas
            </span>
            <span className="board-tag board-tag-done">
              <b>{doneCount}</b> arquivadas
            </span>
          </div>
          <div className="board-progress" aria-label={`${pct}% das tarefas arquivadas`}>
            <i style={{ width: `${pct}%` }} />
            <span>{pct}% do caso arquivado</span>
          </div>
          {toolbar}
        </div>

        {cards.length ? (
          <div className="board-filters">
            {lines.length > 1 ? (
              <div className="board-filter" role="group" aria-label="Filtrar por linha">
                <button type="button" className={`line-chip ${lineFilter === null ? 'is-active' : ''}`} aria-pressed={lineFilter === null} onClick={() => setLineFilter(null)}>
                  Todas as linhas
                </button>
                {lines.map(([id, name]) => (
                  <button key={id || 'caso'} type="button" className={`line-chip ${lineFilter === id ? 'is-active' : ''}`} aria-pressed={lineFilter === id} onClick={() => setLineFilter(id)}>
                    {name}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="board-filter" role="group" aria-label="Filtrar por responsável">
              <button type="button" className={`line-chip ${!personFilter ? 'is-active' : ''}`} aria-pressed={!personFilter} onClick={() => setPersonFilter('')}>
                Todo o time
              </button>
              {meId && assignees.includes(meId) ? (
                <button type="button" className={`line-chip ${personFilter === meId ? 'is-active' : ''}`} aria-pressed={personFilter === meId} onClick={() => setPersonFilter(meId)}>
                  Minhas
                </button>
              ) : null}
              {assignees
                .filter((id) => id !== meId)
                .map((id) => (
                  <button key={id} type="button" className={`line-chip board-person ${personFilter === id ? 'is-active' : ''}`} aria-pressed={personFilter === id} onClick={() => setPersonFilter(id)}>
                    <Avatar userId={id} name={people[id]?.name} avatarAt={people[id]?.avatar_at} size={20} srcFor={srcFor} />
                    {firstName(people[id]?.name)}
                  </button>
                ))}
              <button type="button" className={`line-chip ${personFilter === '-' ? 'is-active' : ''}`} aria-pressed={personFilter === '-'} onClick={() => setPersonFilter('-')}>
                Sem dono
              </button>
            </div>
          </div>
        ) : (
          <p className="board-hint">Os cartões aparecem quando o playbook de uma linha é gerado (pasta 03): cada item do checklist vira uma evidência. O gestor também pode pregar cartões extras.</p>
        )}

        <div className="board-scroll">
          <div className="board-cols" style={{ '--cols': columns.length }}>
            <svg className="board-string" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
              <path d={stringPath(columns.length)} />
            </svg>
            {columns.map((col) => {
              const list = visible.filter((c) => c.status === col.id);
              return (
                <section
                  key={col.id}
                  className={`board-col ${col.id === 'done' ? 'board-col-done' : ''} ${over === col.id ? 'is-over' : ''}`}
                  data-col={col.id}
                  aria-label={col.title}
                  onDragOver={onMove ? (e) => (e.preventDefault(), setOver(col.id)) : undefined}
                  onDragLeave={onMove ? () => setOver((o) => (o === col.id ? null : o)) : undefined}
                  onDrop={onMove ? (e) => drop(e, col.id) : undefined}
                >
                  <header className="board-col-head">
                    <span className="board-col-pin" aria-hidden="true" />
                    <h3>{col.title}</h3>
                    <span className="board-col-count">{String(list.length).padStart(2, '0')}</span>
                    {col.hint ? <p>{col.hint}</p> : null}
                  </header>
                  <ul className="board-list">
                    {list.map((card) => (
                      <EvidenceCard
                        key={`${card.line_id}|${card.mission_id}`}
                        card={card}
                        number={numbers[`${card.line_id}|${card.mission_id}`]}
                        person={people[card.assignee_id || card.done_by]}
                        srcFor={srcFor}
                        draggable={Boolean(onMove && canMove?.(card))}
                        onDragStart={dragStart}
                        onOpen={onOpen}
                        showLine={lines.length > 1}
                      />
                    ))}
                    {!list.length ? <li className="board-col-empty">Nada aqui</li> : null}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
