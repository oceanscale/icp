import React, { useEffect, useState } from 'react';
import { Button } from '../ds/index.jsx';

const DEFAULT_STEPS = ['Abrindo as pastas anteriores...', 'Cruzando dores, gatilhos e objeções...', 'Escrevendo com o método...', 'Datilografando a ficha...', 'Revisando antes de arquivar...'];

/** Botão de geração por IA com espera datilografada (as gerações levam de 20 a 90 segundos). */
export default function Generate({ label, againLabel = 'Gerar de novo', has, onRun, steps = DEFAULT_STEPS, warning, disabled }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!busy) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [busy]);

  const run = async () => {
    if (has && !window.confirm('Gerar de novo substitui a versão atual desta pasta. Continuar?')) return;
    setBusy(true);
    setTick(0);
    setError('');
    try {
      await onRun();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const step = steps[Math.min(steps.length - 1, Math.floor(tick / 6))];
  return (
    <div className="generate">
      <div className="row-3">
        <Button variant={has ? 'quiet' : 'primary'} onClick={run} disabled={busy || disabled}>
          {busy ? 'Gerando...' : has ? againLabel : label}
        </Button>
        {busy ? (
          <span className="generate-status" role="status">
            <span className="generate-dot" aria-hidden="true" />
            {step} <span className="muted">{tick}s</span>
          </span>
        ) : null}
      </div>
      {warning && !busy ? <p className="small warn-text">{warning}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
