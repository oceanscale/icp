import React, { useState } from 'react';
import { Button } from '../ds/index.jsx';

export default function CopyButton({ text, label = 'Copiar' }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1600);
  };
  return (
    <Button variant="quiet" size="sm" onClick={copy}>
      {done ? 'Copiado' : label}
    </Button>
  );
}
