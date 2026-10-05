import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Salva sozinho alguns segundos depois da última alteração e avisa ao fechar a aba se algo ficou pendente.
 * status: 'saved' | 'dirty' | 'saving' | 'error'
 */
export function useAutosave(value, save, { delay = 1500, enabled = true } = {}) {
  const lastSaved = useRef(JSON.stringify(value));
  const latest = useRef(value);
  const timer = useRef(null);
  const saveRef = useRef(save);
  const [state, setState] = useState({ status: 'saved', savedAt: null, error: '' });
  saveRef.current = save;
  latest.current = value;

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const snapshot = JSON.stringify(latest.current);
    if (snapshot === lastSaved.current) return;
    setState((s) => ({ ...s, status: 'saving', error: '' }));
    try {
      await saveRef.current(latest.current);
      lastSaved.current = snapshot;
      setState({ status: JSON.stringify(latest.current) === snapshot ? 'saved' : 'dirty', savedAt: Date.now(), error: '' });
    } catch (err) {
      setState((s) => ({ ...s, status: 'error', error: err.message }));
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    if (JSON.stringify(value) === lastSaved.current) return undefined;
    setState((s) => (s.status === 'saving' ? s : { ...s, status: 'dirty' }));
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, delay);
    return () => clearTimeout(timer.current);
  }, [value, enabled, delay, flush]);

  useEffect(() => {
    const pending = state.status === 'dirty' || state.status === 'saving';
    if (!pending) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [state.status]);

  // Ao sair da pasta, salva o que estiver pendente.
  useEffect(() => () => flush(), [flush]);

  return { ...state, flush };
}
