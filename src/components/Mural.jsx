import React from 'react';
import { ago } from '../lib/format.js';

/** Mural do time: ranking de XP e o que aconteceu no caso. */
export default function Mural({ data }) {
  const { ranking } = data.game;
  const names = data.names || {};
  const top = ranking[0]?.xp || 1;
  return (
    <section className="aside-block">
      <h3 className="dq-check-title">Mural do time</h3>
      {ranking.length ? (
        <ol className="rank">
          {ranking.slice(0, 6).map((r, i) => (
            <li key={r.userId} className="rank-row">
              <span className="rank-pos">{i + 1}</span>
              <span className="avatar" aria-hidden="true">
                {(names[r.userId] || '?').slice(0, 1).toUpperCase()}
              </span>
              <span className="rank-name">{names[r.userId] || 'Ex-participante'}</span>
              <span className="rank-bar" aria-hidden="true">
                <i style={{ width: `${Math.round((r.xp / top) * 100)}%` }} />
              </span>
              <span className="rank-xp">{r.xp} XP</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="small muted">Ninguém pontuou ainda. A primeira missão cumprida abre o placar.</p>
      )}
      <ul className="feed">
        {data.activity.slice(0, 12).map((a, i) => (
          <li key={i} className="feed-row">
            <span>
              <b>{a.name}</b> {a.text}
              {a.xp ? <span className="feed-xp"> +{a.xp} XP</span> : null}
            </span>
            <span className="feed-when">{ago(a.created_at)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
