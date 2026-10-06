import React, { useMemo, useState } from 'react';
import { dueInfo, firstName } from '../lib/format.js';
import Avatar from './Avatar.jsx';

export const COLUMNS = [
  { id: 'todo', title: 'Pistas na mesa', hint: 'Esperando um responsável ou o começo' },
  { id: 'doing', title: 'Em investigação', hint: 'Alguém está cuidando' },
  { id: 'review', title: 'Para conferir', hint: 'Feito, falta o gestor checar' },
  { id: 'done', title: 'Caso arquivado', hint: 'Entregue e marcado no playbook' },
];

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
        className={`ev-card ${onOpen ? 'ev-clickable' : ''} ${due?.tone === 'late' ? 'ev-late' : ''} ${done ? 'ev-done' : ''}`}
        draggable={draggable || undefined}
        onDragStart={draggable ? (e) => onDragStart(e, card) : undefined}
        onClick={open}
        onKeyDown={open ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open()) : undefined}
        aria-label={onOpen ? `${card.title}. Abrir ficha` : undefined}
      >
        <span className="ev-pin" aria-hidden="true" />
        <span className="ev-top">
          <span className="ev-no">Evidência {number}</span>
          {showLine ? <span className="ev-line">{card.line_name}</span> : null}
        </span>
        <span className="ev-title">{card.title}</span>
        <span className="ev-section">{card.section}</span>
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

/**
 * Quadro de tarefas do playbook, com cara de mural de investigação.
 * people: { [userId]: { name, avatar_at } } · canMove(card) · onMove(card, status) · onOpen(card)
 */
export default function Board({ cards, people, srcFor, canMove, onMove, onOpen, toolbar, meId }) {
  const [lineFilter, setLineFilter] = useState('');
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

  const visible = cards.filter((c) => (!lineFilter || c.line_id === lineFilter) && (!personFilter || (personFilter === '-' ? !c.assignee_id : c.assignee_id === personFilter)));
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

  if (!cards.length) {
    return (
      <div className="tboard board-empty">
        <p className="dq-case-title" style={{ fontSize: 22 }}>
          Mural vazio
        </p>
        <p className="muted">As tarefas aparecem aqui quando o playbook de uma linha for gerado (pasta 03). Cada item do checklist vira um cartão.</p>
      </div>
    );
  }

  return (
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

      <div className="board-filters">
        {lines.length > 1 ? (
          <div className="board-filter" role="group" aria-label="Filtrar por linha">
            <button type="button" className={`line-chip ${!lineFilter ? 'is-active' : ''}`} aria-pressed={!lineFilter} onClick={() => setLineFilter('')}>
              Todas as linhas
            </button>
            {lines.map(([id, name]) => (
              <button key={id} type="button" className={`line-chip ${lineFilter === id ? 'is-active' : ''}`} aria-pressed={lineFilter === id} onClick={() => setLineFilter(id)}>
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

      <div className="board-cols">
        <svg className="board-string" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
          <path d="M12.5 2 Q 25 9 37.5 2 Q 50 9 62.5 2 Q 75 9 87.5 2" />
        </svg>
        {COLUMNS.map((col) => {
          const list = visible.filter((c) => c.status === col.id);
          return (
            <section
              key={col.id}
              className={`board-col board-col-${col.id} ${over === col.id ? 'is-over' : ''}`}
              aria-label={col.title}
              onDragOver={onMove ? (e) => (e.preventDefault(), setOver(col.id)) : undefined}
              onDragLeave={onMove ? () => setOver((o) => (o === col.id ? null : o)) : undefined}
              onDrop={onMove ? (e) => drop(e, col.id) : undefined}
            >
              <header className="board-col-head">
                <span className="board-col-pin" aria-hidden="true" />
                <h3>{col.title}</h3>
                <span className="board-col-count">{String(list.length).padStart(2, '0')}</span>
                <p>{col.hint}</p>
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
  );
}
