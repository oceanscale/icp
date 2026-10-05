import React from 'react';
import { Button } from '../ds/index.jsx';

export function PastaHead({ code, title, children, actions }) {
  return (
    <header className="pasta-head">
      <div>
        <div className="dq-label">Pasta {code}</div>
        <h2 className="dq-case-title">{title}</h2>
        {children ? <p className="pasta-lead">{children}</p> : null}
      </div>
      {actions ? <div className="row-3 pasta-actions">{actions}</div> : null}
    </header>
  );
}

export function Block({ title, children, aside }) {
  return (
    <section className="block">
      {title ? (
        <div className="block-head">
          <h3 className="dq-check-title">{title}</h3>
          {aside || null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function KV({ items }) {
  return (
    <dl className="kv">
      {items
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k}>
            <dt className="dq-label">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
    </dl>
  );
}

export function Downloads({ onPdf, onMd, onCsv }) {
  return (
    <>
      {onPdf ? (
        <Button variant="quiet" size="sm" onClick={onPdf}>
          Baixar PDF
        </Button>
      ) : null}
      {onMd ? (
        <Button variant="quiet" size="sm" onClick={onMd}>
          Markdown
        </Button>
      ) : null}
      {onCsv ? (
        <Button variant="quiet" size="sm" onClick={onCsv}>
          CSV para o CRM
        </Button>
      ) : null}
    </>
  );
}

export const slug = (s) =>
  String(s || 'linha')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}
