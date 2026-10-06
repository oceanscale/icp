import React, { useState } from 'react';
import { Button } from '../ds/index.jsx';
import { api } from '../lib/api.js';
import Modal from './Modal.jsx';

const MAX = 8;

/** O gestor renomeia, cria, move e remove colunas. A primeira (onde os cartões chegam) e a última (arquivo) ficam nas pontas. */
export default function ColumnsModal({ data, onClose, onUpdate }) {
  const pid = data.project.id;
  const [cols, setCols] = useState(() => data.board.columns.map((c) => ({ ...c, key: c.id })));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const count = (id) => data.board.cards.filter((c) => c.status === id).length;
  const fixed = (i) => i === 0 || i === cols.length - 1;

  const edit = (i, k) => (e) => setCols(cols.map((c, j) => (j === i ? { ...c, [k]: e.target.value } : c)));
  const move = (i, d) => {
    const next = [...cols];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setCols(next);
  };
  const remove = (i) => setCols(cols.filter((_, j) => j !== i));
  const add = () => {
    const next = [...cols];
    next.splice(cols.length - 1, 0, { id: null, key: `novo-${Date.now()}`, title: '', hint: '' });
    setCols(next);
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      onUpdate(await api(`/projects/${pid}/quadro/colunas`, { method: 'PUT', body: { columns: cols.map(({ id, title, hint }) => ({ id, title, hint })) } }));
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title="Colunas do quadro" onClose={onClose} wide>
      <form className="stack-4" onSubmit={save}>
        <p className="small muted">
          A primeira coluna recebe os cartões novos e a última arquiva (no playbook, arquivar marca o item feito). As do meio são suas: renomeie, crie, mude de lugar ou remova. Os cartões de uma coluna removida vão para a coluna à esquerda.
        </p>
        <ol className="cols-edit">
          {cols.map((c, i) => (
            <li key={c.key} className={`cols-row ${fixed(i) ? 'is-fixed' : ''}`}>
              <span className="cols-pin" aria-hidden="true" />
              <div className="cols-fields">
                <input className="dq-field-input" aria-label={`Título da coluna ${i + 1}`} required maxLength={40} value={c.title} onChange={edit(i, 'title')} placeholder="Título da coluna" />
                <input className="dq-field-input cols-hint" aria-label={`Descrição da coluna ${i + 1}`} maxLength={80} value={c.hint || ''} onChange={edit(i, 'hint')} placeholder="Frase curta (opcional)" />
                <span className="small muted">
                  {i === 0 ? 'Fixa: onde os cartões chegam' : i === cols.length - 1 ? 'Fixa: arquivo' : 'Coluna do meio'}
                  {c.id ? ` · ${count(c.id)} ${count(c.id) === 1 ? 'cartão' : 'cartões'}` : ' · nova'}
                </span>
              </div>
              {!fixed(i) ? (
                <div className="cols-actions">
                  <button type="button" className="dq-tabs-arrow" aria-label="Mover para a esquerda" disabled={i <= 1} onClick={() => move(i, -1)}>
                    ‹
                  </button>
                  <button type="button" className="dq-tabs-arrow" aria-label="Mover para a direita" disabled={i >= cols.length - 2} onClick={() => move(i, 1)}>
                    ›
                  </button>
                  <button type="button" className="link-btn small danger-text" onClick={() => remove(i)}>
                    Remover
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
        <Button variant="quiet" size="sm" onClick={add} disabled={cols.length >= MAX}>
          + Nova coluna
        </Button>
        {cols.length >= MAX ? <p className="small muted">Limite de {MAX} colunas.</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        <div className="row-3">
          <Button type="submit" disabled={busy}>
            {busy ? 'Salvando...' : 'Salvar colunas'}
          </Button>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
