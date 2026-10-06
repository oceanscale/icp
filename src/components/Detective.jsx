import React, { useEffect, useState } from 'react';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// O detetive anda deixando pegadas, para, varre o chão com a lupa e acha a pista. Depois recomeça.
const PHASES = [
  ['walk', 5200],
  ['search', 2600],
  ['found', 2800],
  ['out', 700],
];
const START = 20;
const STOP = 320;
const PRINTS = Array.from({ length: 9 }, (_, i) => 40 + i * 32);

export default function Detective() {
  const [phase, setPhase] = useState(() => (reducedMotion() ? 'found' : 'walk'));

  useEffect(() => {
    if (reducedMotion()) return undefined;
    let i = 0;
    let timer;
    const next = () => {
      i = (i + 1) % PHASES.length;
      setPhase(PHASES[i][0]);
      timer = setTimeout(next, PHASES[i][1]);
    };
    timer = setTimeout(next, PHASES[0][1]);
    return () => clearTimeout(timer);
  }, []);

  const walkSeconds = PHASES[0][1] / 1000;
  return (
    <svg className={`det det-${phase}`} viewBox="0 0 560 196" aria-hidden="true" focusable="false">
      <line className="det-ground" x1="0" y1="171" x2="560" y2="171" />

      {PRINTS.map((x, i) => (
        <g
          key={x}
          className="det-print"
          style={{ animationDelay: `${(((x - START) / (STOP - START)) * walkSeconds).toFixed(2)}s` }}
          transform={`translate(${x} ${i % 2 ? 175 : 167})`}
        >
          <ellipse cx="0" cy="0" rx="5" ry="2.4" />
          <ellipse cx="7" cy="0" rx="2.2" ry="2" />
        </g>
      ))}

      <g className="det-clue" transform="translate(408 160)">
        <ellipse className="det-spot" cx="0" cy="3" rx="34" ry="7" />
        <g className="det-finger">
          <path d="M-7 4a7 7 0 0 1 14 0" />
          <path d="M-10 4a10 10 0 0 1 20 0" />
          <path d="M-4 4a4 4 0 0 1 8 0" />
          <path d="M-13 4a13 13 0 0 1 26 0" />
        </g>
        <g transform="translate(32 -6)">
          <g className="det-marker">
            <path d="M-9 14 L0 -6 L9 14 Z" />
            <text x="0" y="12" textAnchor="middle">
              1
            </text>
          </g>
        </g>
      </g>

      <polygon className="det-beam" points="373,118 390,112 438,167 384,167" />

      <g className="det-move">
        <ellipse className="det-shadow" cx="0" cy="171" rx="26" ry="4" />
        <g className="det-body" transform="translate(0 171)">
          <g className="det-bob">
            <g className="det-lean">
              <g className="det-leg det-leg-b">
                <rect x="-9" y="-48" width="9" height="46" rx="3" />
                <ellipse cx="-2" cy="-2" rx="8" ry="3" />
              </g>
              <g className="det-leg det-leg-a">
                <rect x="1" y="-48" width="9" height="46" rx="3" />
                <ellipse cx="8" cy="-2" rx="8" ry="3" />
              </g>
              <path className="det-ink" d="M-21 -42 L-14 -101 Q0 -109 14 -101 L23 -42 Q1 -36 -21 -42 Z" />
              <path className="det-paper" d="M-14 -101 L-4 -84 L0 -103 Z M14 -101 L4 -84 L0 -103 Z" />
              <rect className="det-paper" x="-17" y="-69" width="36" height="3" rx="1" />
              <circle className="det-ink" cx="1" cy="-113" r="10.5" />
              <path className="det-ink" d="M-11 -119 L-9 -135 Q1 -140 11 -135 L13 -119 Z" />
              <rect className="det-paper" x="-10" y="-124" width="22" height="3" />
              <ellipse className="det-ink" cx="1" cy="-119" rx="21" ry="3.6" />
              <g className="det-arm">
                <path className="det-arm-line" d="M8 -94 L28 -80 L40 -70" />
                <line className="det-arm-line det-handle" x1="40" y1="-70" x2="47" y2="-64" />
                <circle className="det-lens" cx="56" cy="-57" r="12" />
                <path className="det-glint" d="M49 -61 a8 8 0 0 1 6 -5" />
              </g>
            </g>
          </g>
        </g>
      </g>

      <g className="det-say" transform="translate(352 30)">
        <text className="det-say-hmm" x="0" y="0">
          Hmm...
        </text>
        <text className="det-say-found" x="0" y="0">
          <tspan x="0">Achei a pista</tspan>
          <tspan x="0" dy="22">
            do cliente ideal.
          </tspan>
        </text>
      </g>
    </svg>
  );
}
