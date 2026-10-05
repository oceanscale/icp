import React, { useState } from 'react';

const time = (ms) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Selo do salvamento automático. */
export function SaveStatus({ status, savedAt, error, onRetry }) {
  if (status === 'saving') return <span className="save-status" role="status">Salvando...</span>;
  if (status === 'dirty') return <span className="save-status" role="status">Alterações a salvar...</span>;
  if (status === 'error')
    return (
      <span className="save-status save-error" role="status">
        Não salvou: {error}{' '}
        <button type="button" className="link-btn" onClick={onRetry}>
          tentar de novo
        </button>
      </span>
    );
  return (
    <span className="save-status save-ok" role="status">
      {savedAt ? `Salvo automaticamente às ${time(savedAt)}` : 'Salvamento automático ligado'}
    </span>
  );
}

/** Aviso que aparece até a pessoa fechar, uma vez por aparelho. */
export function AutosaveTip() {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem('dq-autosave-tip') === '1';
    } catch {
      return false;
    }
  });
  if (hidden) return null;
  const close = () => {
    setHidden(true);
    try {
      localStorage.setItem('dq-autosave-tip', '1');
    } catch {
      /* navegação privada: o aviso volta na próxima visita */
    }
  };
  return (
    <div className="tip" role="note">
      <b>Pode digitar sem medo.</b> Tudo o que você escreve nesta pasta é salvo sozinho poucos segundos depois. O selo ao lado do título mostra a hora do último salvamento.
      <button type="button" className="link-btn" onClick={close}>
        Entendi
      </button>
    </div>
  );
}
