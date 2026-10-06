// Componentes do Design System Dossiê ICP. Fonte única: o app importa daqui e
// scripts/build-design-system.mjs empacota este arquivo como window.Dossie para o Design System publicado.
import React, { useLayoutEffect, useRef, useState } from 'react';

const cx = (...parts) => parts.filter(Boolean).join(' ');
const srOnly = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' };
const pad2 = (n) => String(n).padStart(2, '0');

export function CheckMark({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" fill="none">
      <path d="M2.5 8.6 6.2 12 13.5 3.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" />
    </svg>
  );
}

/** Botão com cara de tecla: primary (tinta azul), confirm (carimbo verde), quiet. */
export function Button({ variant = 'primary', size, className, children, ...rest }) {
  return (
    <button type="button" {...rest} className={cx('dq-btn', `dq-btn-${variant}`, size === 'sm' && 'dq-btn-sm', className)}>
      {children}
    </button>
  );
}

/** Carimbo de status, sempre com palavra. */
export function Stamp({ tone = 'blue', tilt = true, className, children }) {
  return <span className={cx('dq-stamp', `dq-stamp-${tone}`, !tilt && 'dq-stamp-flat', className)}>{children}</span>;
}

/** As pastas numeradas do dossiê. Controlado por active/onChange; pastas trancadas continuam navegáveis. */
export function FolderTabs({ tabs = [], active, onChange, label = 'Pastas do dossiê', idBase = 'dq-folder', arrows = false, className, children }) {
  const refs = useRef({});
  const list = useRef(null);
  const [compact, setCompact] = useState(false);
  const current = active ?? tabs[0]?.id;
  const index = tabs.findIndex((t) => t.id === current);
  const labels = tabs.map((t) => t.label + (t.done ? '+' : '')).join('|');

  // Quando as abas não cabem, só a aba aberta mostra o nome; as outras ficam com o código.
  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return undefined;
    const check = () => {
      const was = el.classList.contains('dq-tabs-compact');
      el.classList.remove('dq-tabs-compact');
      const overflow = el.scrollWidth > el.clientWidth + 1;
      if (was) el.classList.add('dq-tabs-compact');
      setCompact(overflow);
    };
    check();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [labels]);

  // A aba aberta sempre fica visível na faixa.
  useLayoutEffect(() => {
    const el = list.current;
    const tab = refs.current[current];
    if (!el || !tab) return;
    const t = tab.getBoundingClientRect();
    const c = el.getBoundingClientRect();
    if (t.left < c.left) el.scrollLeft -= c.left - t.left + 12;
    else if (t.right > c.right) el.scrollLeft += t.right - c.right + 12;
  }, [current, compact]);

  const go = (i) => {
    const t = tabs[(i + tabs.length) % tabs.length];
    if (!t) return;
    onChange?.(t.id);
    refs.current[t.id]?.focus();
  };
  const onKey = (e, i) => {
    const map = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
    if (e.key in map) {
      e.preventDefault();
      go(map[e.key]);
    }
  };
  return (
    <div className={cx('dq-folder', className)}>
      <div className="dq-tabs-row">
        <div className={cx('dq-tabs', compact && 'dq-tabs-compact')} role="tablist" aria-label={label} ref={list}>
          {tabs.map((t, i) => {
            const sel = t.id === current;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`${idBase}-tab-${t.id}`}
                aria-selected={sel ? 'true' : 'false'}
                aria-controls={`${idBase}-panel`}
                tabIndex={sel ? 0 : -1}
                className={cx('dq-tab', t.locked && !sel && 'dq-tab-locked')}
                title={t.code ? `${t.code} ${t.label}` : t.label}
                ref={(el) => {
                  refs.current[t.id] = el;
                }}
                onClick={() => onChange?.(t.id)}
                onKeyDown={(e) => onKey(e, i)}
              >
                {t.code ? <span className="dq-tab-code">{t.code}</span> : null}
                <span className="dq-tab-label">{t.label}</span>
                {t.done ? (
                  <span className="dq-tab-done" title="Pasta resolvida">
                    <CheckMark />
                    <span style={srOnly}>resolvida</span>
                  </span>
                ) : null}
                {t.locked ? <span style={srOnly}>trancada</span> : null}
              </button>
            );
          })}
        </div>
        {arrows ? (
          <div className="dq-tabs-arrows">
            <button type="button" className="dq-tabs-arrow" aria-label={index > 0 ? `Pasta anterior: ${tabs[index - 1].label}` : 'Pasta anterior'} title={index > 0 ? `${tabs[index - 1].code || ''} ${tabs[index - 1].label}`.trim() : undefined} disabled={index <= 0} onClick={() => onChange?.(tabs[index - 1].id)}>
              ‹
            </button>
            <button type="button" className="dq-tabs-arrow" aria-label={index < tabs.length - 1 ? `Próxima pasta: ${tabs[index + 1].label}` : 'Próxima pasta'} title={index < tabs.length - 1 ? `${tabs[index + 1].code || ''} ${tabs[index + 1].label}`.trim() : undefined} disabled={index < 0 || index >= tabs.length - 1} onClick={() => onChange?.(tabs[index + 1].id)}>
              ›
            </button>
          </div>
        ) : null}
      </div>
      {children != null ? (
        <div className="dq-tabpanel" role="tabpanel" id={`${idBase}-panel`} aria-labelledby={`${idBase}-tab-${current}`} tabIndex={0}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** A ficha base de papel, com número do caso e clipe opcional. */
export function CaseFile({ caseNo, title, subtitle, aside, clip, className, children }) {
  const hasHead = caseNo || title || subtitle || aside;
  return (
    <section className={cx('dq-case', className)}>
      {clip ? <span className="dq-clip" aria-hidden="true" /> : null}
      {hasHead ? (
        <header className="dq-case-head">
          <div>
            {caseNo ? <div className="dq-label">{caseNo}</div> : null}
            {title ? <h2 className="dq-case-title">{title}</h2> : null}
            {subtitle ? <p className="dq-case-sub">{subtitle}</p> : null}
          </div>
          {aside || null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/** Moldura de foto instantânea para o retrato do decisor. Sem src mostra "em revelação". */
export function Polaroid({ src, alt = '', caption, pendingLabel = 'Retrato em revelação', width, tilt = true, className }) {
  return (
    <figure className={cx('dq-polaroid', !tilt && 'dq-polaroid-flat', className)} style={width ? { width } : undefined}>
      {src ? (
        <img className="dq-polaroid-img" src={src} alt={alt} />
      ) : (
        <div className="dq-polaroid-wait" role="img" aria-label={pendingLabel}>
          <span>{pendingLabel}</span>
        </div>
      )}
      {caption ? <figcaption className="dq-polaroid-cap">{caption}</figcaption> : null}
    </figure>
  );
}

/** A ficha do cliente ideal: retrato do decisor, perfil em uma frase e os campos do ICP. */
export function IcpFile({ name, summary, kicker = 'Perfil do cliente ideal · ICP principal', fields = [], photo, photoAlt, caption, pendingLabel, stamp, className, children }) {
  return (
    <article className={cx('dq-icp', className)}>
      <div className="dq-icp-photo">
        <Polaroid src={photo} alt={photoAlt} caption={caption} pendingLabel={pendingLabel} />
      </div>
      <div className="dq-icp-main">
        <div className="dq-icp-top">
          <div className="dq-label">{kicker}</div>
          {stamp ? <Stamp tone={stamp.tone || 'blue'}>{stamp.text}</Stamp> : null}
        </div>
        <h2 className="dq-icp-name">{name}</h2>
        {summary ? <p className="dq-icp-summary">{summary}</p> : null}
        <dl className="dq-icp-fields">
          {fields.map((f, i) => (
            <div key={`${f.label}-${i}`}>
              <dt className="dq-label">{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
        {children || null}
      </div>
    </article>
  );
}

/** Lista de itens com caixa datilografada, barra de progresso e contador "03/06 itens". */
export function Checklist({ title, items = [], onToggle, unit = 'itens', className }) {
  const done = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  return (
    <section className={cx('dq-check', className)}>
      <div className="dq-check-head">
        {title ? <h3 className="dq-check-title">{title}</h3> : <span />}
        <span className="dq-check-count">
          {pad2(done)}/{pad2(items.length)} {unit}
        </span>
      </div>
      <div className="dq-check-bar" aria-hidden="true">
        <i style={{ width: `${pct}%` }} />
      </div>
      <ul className="dq-check-list">
        {items.map((it) => {
          const canToggle = Boolean(onToggle) && !it.auto && !it.disabled;
          const toggle = () => canToggle && onToggle(it.id, !it.done);
          return (
            <li key={it.id} className={cx('dq-check-item', it.done && 'dq-check-done')}>
              <button
                type="button"
                role="checkbox"
                aria-checked={it.done ? 'true' : 'false'}
                aria-labelledby={`dq-ck-${it.id}`}
                className="dq-check-box"
                onClick={toggle}
                disabled={!canToggle}
                title={it.auto ? 'Marcada automaticamente pelo sistema' : undefined}
              >
                {it.done ? <CheckMark /> : null}
              </button>
              <span className="dq-check-text" onClick={toggle}>
                <span className="dq-check-label" id={`dq-ck-${it.id}`}>
                  {it.label}
                </span>
                {it.hint ? <span className="dq-check-hint">{it.hint}</span> : null}
                {it.meta ? <span className="dq-check-meta">{it.meta}</span> : null}
              </span>
              {it.aside ? <span className="dq-check-aside">{it.aside}</span> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Campo de formulário; multiline vira folha pautada. */
export function Field({ label, hint, error, multiline, className, id, ...rest }) {
  const fieldId = id || `dq-f-${String(label || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-')}`;
  const hintId = error || hint ? `${fieldId}-hint` : undefined;
  const Control = multiline ? 'textarea' : 'input';
  return (
    <div className={cx('dq-field', error && 'dq-field-error', className)}>
      {label ? (
        <label className="dq-label" htmlFor={fieldId}>
          {label}
        </label>
      ) : null}
      <Control {...rest} id={fieldId} className="dq-field-input" aria-describedby={hintId} aria-invalid={error ? 'true' : undefined} />
      {error || hint ? (
        <span className="dq-field-hint" id={hintId}>
          {error || hint}
        </span>
      ) : null}
    </div>
  );
}

/** Uma etapa do funil no quadro Kanban. */
export function FunnelColumn({ code, name, count = 0, rate, className, children }) {
  return (
    <section className={cx('dq-col', className)} aria-label={name}>
      <header className="dq-col-head">
        <div className="dq-col-top">
          {code ? <span className="dq-col-code">{code}</span> : null}
          <span className="dq-col-name">{name}</span>
        </div>
        <div className="dq-col-meta">
          <span>
            {count} {count === 1 ? 'lead' : 'leads'}
          </span>
          {rate != null ? <span className="dq-col-rate">conv. {rate}</span> : null}
        </div>
      </header>
      <div className="dq-col-body">{children}</div>
    </section>
  );
}

/** A ficha de um lead dentro de uma etapa do funil. */
export function LeadCard({ name, company, value, days, late, tag, tagTone, className }) {
  return (
    <article className={cx('dq-lead', className)}>
      {tag ? (
        <span className={cx('dq-chip', tagTone && `dq-chip-${tagTone}`)} style={{ marginBottom: 'var(--space-2)' }}>
          {tag}
        </span>
      ) : null}
      <h4 className="dq-lead-name">{name}</h4>
      {company ? <p className="dq-lead-co">{company}</p> : null}
      <div className="dq-lead-row">
        <span className="dq-lead-value">{value || ''}</span>
        {late ? (
          <span className="dq-lead-late">Atrasado · {days}d</span>
        ) : days != null ? (
          <span style={{ color: 'var(--ink-muted)' }}>{days}d na etapa</span>
        ) : null}
      </div>
    </article>
  );
}

const RATIOS = { '1:1': [1, 1], '4:5': [4, 5], '9:16': [9, 16], '1.91:1': [1.91, 1], '16:9': [16, 9] };

/** Sugestão de criativo e copy para Ads. */
export function CreativeCard({ week, platform, placement, status, format, ratio = '1:1', stage, focus, headline, copy, cta, brief, className, children }) {
  const [w, h] = RATIOS[ratio] || [1, 1];
  const wide = w >= h;
  return (
    <article className={cx('dq-creative', className)}>
      <div className="dq-creative-strip">
        <span className="dq-label">{[week, platform, placement].filter(Boolean).join(' · ')}</span>
        {status ? (
          <span className="dq-label" style={{ color: 'var(--green)' }}>
            {status}
          </span>
        ) : null}
      </div>
      <div className="dq-creative-body">
        <div className="dq-creative-frame">
          <div className="dq-creative-ratio" style={{ aspectRatio: `${w} / ${h}`, maxHeight: 160, width: wide ? '100%' : 'auto', height: wide ? 'auto' : 160 }}>
            <span className="dq-label">{ratio}</span>
          </div>
          <span className="dq-label" style={{ textAlign: 'center' }}>
            {format}
          </span>
        </div>
        <div className="dq-creative-main">
          <div className="dq-creative-tags">
            {stage ? <span className="dq-chip">Fase: {stage}</span> : null}
            {focus ? <span className="dq-chip dq-chip-green">Foco: {focus}</span> : null}
          </div>
          {headline ? <h4 className="dq-creative-head">{headline}</h4> : null}
          {copy ? <p className="dq-creative-copy">{copy}</p> : null}
          {cta ? <span className="dq-creative-cta">CTA: {cta}</span> : null}
        </div>
      </div>
      {brief ? (
        <p className="dq-creative-brief">
          <b>Criativo: </b>
          {brief}
        </p>
      ) : null}
      {children || null}
    </article>
  );
}

/** Bilhete fixado com alfinete, em letra de mão: a nota do consultor. */
export function Note({ title, pin = 'blue', tilt = true, className, children }) {
  return (
    <aside className={cx('dq-note', pin === 'green' && 'dq-note-green', !tilt && 'dq-note-flat', className)}>
      {title ? <div className="dq-label">{title}</div> : null}
      <p className="dq-note-text">{children}</p>
    </aside>
  );
}

/** O tabuleiro do caso: uma casa por pasta, vencidas em verde, abertas com o peão, trancadas tracejadas. */
export function ClueTrack({ steps = [], title = 'Progresso do caso', level, xp, nextXp, onStep, className }) {
  const done = steps.filter((s) => s.state === 'done').length;
  const pct = nextXp ? Math.min(100, Math.round((xp / nextXp) * 100)) : 100;
  return (
    <section className={cx('dq-track', className)}>
      <div className="dq-track-head">
        <span className="dq-label">
          {title} {done}/{steps.length}
        </span>
        {level ? <span className="dq-track-level">{level}</span> : null}
      </div>
      <ol className="dq-track-list">
        {steps.map((s, i) => {
          const st = s.state || 'locked';
          const content = (
            <>
              <span className="dq-track-sq">{st === 'done' ? <CheckMark size={22} /> : s.code || String(i + 1)}</span>
              <span className="dq-track-name">
                {s.label}
                <span style={srOnly}>{st === 'done' ? ' (resolvida)' : st === 'current' ? ' (aberta)' : ' (trancada)'}</span>
              </span>
            </>
          );
          return (
            <li key={s.id || i} className={cx('dq-track-step', `dq-track-${st}`, s.bonus && 'dq-track-bonus')} aria-current={s.active ? 'step' : undefined}>
              {onStep ? (
                <button type="button" className="dq-track-btn" onClick={() => onStep(s.id ?? i)}>
                  {content}
                </button>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ol>
      {xp != null ? (
        <div className="dq-track-xp">
          <div className="dq-track-xp-bar" aria-hidden="true">
            <i style={{ width: `${pct}%` }} />
          </div>
          <span className="dq-track-xp-num">{nextXp ? `${xp} / ${nextXp} XP` : `${xp} XP · nível máximo`}</span>
        </div>
      ) : null}
    </section>
  );
}

/** Número do simulador em estilo livro-caixa. */
export function Readout({ label, value, unit, hint, tone, flag, className }) {
  return (
    <div className={cx('dq-readout', tone && `dq-readout-${tone}`, className)}>
      <div className="dq-label">{label}</div>
      <output className="dq-readout-value">
        {value}
        {unit ? <span className="dq-readout-unit">{unit}</span> : null}
      </output>
      {hint ? <div className="dq-readout-hint">{hint}</div> : null}
      {flag ? (
        <div className="dq-readout-flag">
          <Stamp tone={tone === 'danger' ? 'danger' : 'green'} tilt={false}>
            {flag}
          </Stamp>
        </div>
      ) : null}
    </div>
  );
}
