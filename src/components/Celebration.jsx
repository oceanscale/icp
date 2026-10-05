import React, { useEffect } from 'react';
import { Stamp } from '../ds/index.jsx';

/** Carimbo grande quando uma pasta é resolvida ou o caso sobe de nível. */
export default function Celebration({ title, subtitle, onDone }) {
  useEffect(() => {
    const id = setTimeout(onDone, 2600);
    return () => clearTimeout(id);
  }, [onDone]);
  return (
    <div className="celebrate" role="status" aria-live="polite" onClick={onDone}>
      <div className="celebrate-stamp">
        <Stamp tone="green">{title}</Stamp>
      </div>
      {subtitle ? <p className="celebrate-sub">{subtitle}</p> : null}
    </div>
  );
}
