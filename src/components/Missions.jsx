import React, { useState } from 'react';
import { Checklist } from '../ds/index.jsx';
import { api } from '../lib/api.js';

/** Missões da pasta aberta. Automáticas o sistema marca; manuais o time marca e ganha XP. */
export default function Missions({ data, pasta, lineId, onUpdate }) {
  const [error, setError] = useState('');
  if (!pasta) return null;
  const names = data.names || {};
  const missions = pasta.missions.filter((m) => !m.item);
  const items = pasta.missions.filter((m) => m.item);
  const locked = pasta.state === 'locked';

  const toggle = async (missionId, done) => {
    setError('');
    try {
      onUpdate(await api(`/projects/${data.project.id}/missions`, { method: 'POST', body: { lineId: pasta.id === 'empresa' ? '' : lineId, missionId, done } }));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="aside-block">
      <Checklist
        title="Missões da pasta"
        unit="feitas"
        onToggle={locked ? undefined : toggle}
        items={missions.map((m) => ({
          id: m.id,
          label: m.label,
          hint: m.hint,
          done: m.done,
          auto: m.auto,
          disabled: locked,
          meta: m.done ? `${names[m.doneBy] || (m.auto ? 'Sistema' : 'Alguém')} · +${m.points} XP` : m.auto ? `Automática · ${m.points} XP` : `${m.points} XP`,
        }))}
      />
      {items.length ? (
        <p className="small muted" style={{ marginTop: 'var(--space-2)' }}>
          Itens do playbook: {items.filter((i) => i.done).length} de {items.length} (5 XP cada), marcados dentro da pasta.
        </p>
      ) : null}
      {locked ? <p className="small muted">Pasta trancada: as missões abrem junto com ela.</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </section>
  );
}
