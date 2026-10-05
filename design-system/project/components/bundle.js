/* @ds-bundle: {"format":4,"namespace":"Dossie","components":[{"name":"Button"},{"name":"Stamp"},{"name":"FolderTabs"},{"name":"CaseFile"},{"name":"Polaroid"},{"name":"IcpFile"},{"name":"Checklist"},{"name":"Field"},{"name":"FunnelColumn"},{"name":"LeadCard"},{"name":"CreativeCard"},{"name":"Note"},{"name":"ClueTrack"},{"name":"Readout"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;

  function cx() {
    return Array.prototype.filter.call(arguments, Boolean).join(' ');
  }
  function omit(obj, keys) {
    var out = {};
    for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k) && keys.indexOf(k) < 0) out[k] = obj[k];
    return out;
  }
  function Check(size) {
    return h('svg', { width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': 'true', fill: 'none' },
      h('path', { d: 'M2.5 8.6 6.2 12 13.5 3.8', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'square' }));
  }

  /* Button: primary (tinta azul), confirm (carimbo verde), quiet. */
  function Button(p) {
    var variant = p.variant || 'primary';
    var rest = omit(p, ['variant', 'size', 'className', 'children']);
    return h('button', Object.assign({ type: 'button' }, rest, {
      className: cx('dq-btn', 'dq-btn-' + variant, p.size === 'sm' && 'dq-btn-sm', p.className)
    }), p.children);
  }

  /* Stamp: carimbo de status, sempre com palavra. */
  function Stamp(p) {
    var tone = p.tone || 'blue';
    return h('span', {
      className: cx('dq-stamp', 'dq-stamp-' + tone, p.tilt === false && 'dq-stamp-flat', p.className)
    }, p.children);
  }

  /* FolderTabs: as pastas do dossiê. Controlado por active/onChange. */
  function FolderTabs(p) {
    var tabs = p.tabs || [];
    var active = p.active != null ? p.active : (tabs[0] && tabs[0].id);
    var refs = React.useRef({});
    var base = p.idBase || 'dq-folder';
    function go(i) {
      var t = tabs[(i + tabs.length) % tabs.length];
      if (!t) return;
      if (p.onChange) p.onChange(t.id);
      var el = refs.current[t.id];
      if (el) el.focus();
    }
    function onKey(e, i) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
      else if (e.key === 'Home') { e.preventDefault(); go(0); }
      else if (e.key === 'End') { e.preventDefault(); go(tabs.length - 1); }
    }
    return h('div', { className: cx('dq-folder', p.className) },
      h('div', { className: 'dq-tabs', role: 'tablist', 'aria-label': p.label || 'Pastas do dossiê' },
        tabs.map(function (t, i) {
          var sel = t.id === active;
          return h('button', {
            key: t.id, type: 'button', role: 'tab', id: base + '-tab-' + t.id,
            'aria-selected': sel ? 'true' : 'false', 'aria-controls': base + '-panel',
            tabIndex: sel ? 0 : -1, className: 'dq-tab',
            ref: function (el) { refs.current[t.id] = el; },
            onClick: function () { if (p.onChange) p.onChange(t.id); },
            onKeyDown: function (e) { onKey(e, i); }
          },
          t.code ? h('span', { className: 'dq-tab-code' }, t.code) : null,
          h('span', null, t.label),
          t.done ? h('span', { className: 'dq-tab-done', title: 'Pasta concluída' }, Check(14), h('span', { style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' } }, 'concluída')) : null);
        })),
      p.children != null ? h('div', {
        className: 'dq-tabpanel', role: 'tabpanel', id: base + '-panel',
        'aria-labelledby': base + '-tab-' + active, tabIndex: 0
      }, p.children) : null);
  }

  /* CaseFile: a ficha base de papel, com número do caso e clipe opcional. */
  function CaseFile(p) {
    var hasHead = p.caseNo || p.title || p.subtitle || p.aside;
    return h('section', { className: cx('dq-case', p.className) },
      p.clip ? h('span', { className: 'dq-clip', 'aria-hidden': 'true' }) : null,
      hasHead ? h('header', { className: 'dq-case-head' },
        h('div', null,
          p.caseNo ? h('div', { className: 'dq-label' }, p.caseNo) : null,
          p.title ? h('h2', { className: 'dq-case-title' }, p.title) : null,
          p.subtitle ? h('p', { className: 'dq-case-sub' }, p.subtitle) : null),
        p.aside || null) : null,
      p.children);
  }

  /* Polaroid: o retrato falado do ICP. Sem src mostra "em revelação". */
  function Polaroid(p) {
    return h('figure', { className: cx('dq-polaroid', p.tilt === false && 'dq-polaroid-flat', p.className), style: p.width ? { width: p.width } : null },
      p.src
        ? h('img', { className: 'dq-polaroid-img', src: p.src, alt: p.alt || '' })
        : h('div', { className: 'dq-polaroid-wait', role: 'img', 'aria-label': p.pendingLabel || 'Retrato em revelação' },
            h('span', null, p.pendingLabel || 'Retrato em revelação')),
      p.caption ? h('figcaption', { className: 'dq-polaroid-cap' }, p.caption) : null);
  }

  /* IcpFile: a ficha do cliente ideal (retrato falado + pistas). */
  function IcpFile(p) {
    var fields = p.fields || [];
    return h('article', { className: cx('dq-icp', p.className) },
      h('div', { className: 'dq-icp-photo' },
        h(Polaroid, { src: p.photo, alt: p.photoAlt, caption: p.caption, pendingLabel: p.pendingLabel })),
      h('div', { className: 'dq-icp-main' },
        h('div', { className: 'dq-icp-top' },
          h('div', { className: 'dq-label' }, p.kicker || 'Retrato falado · ICP principal'),
          p.stamp ? h(Stamp, { tone: p.stamp.tone || 'blue' }, p.stamp.text) : null),
        h('h2', { className: 'dq-icp-name' }, p.name),
        p.summary ? h('p', { className: 'dq-icp-summary' }, p.summary) : null,
        h('dl', { className: 'dq-icp-fields' },
          fields.map(function (f, i) {
            return h('div', { key: f.label + i },
              h('dt', { className: 'dq-label' }, f.label),
              h('dd', null, f.value));
          })),
        p.children || null));
  }

  /* Checklist: itens do playbook com caixa datilografada e contador. */
  function Checklist(p) {
    var items = p.items || [];
    var done = items.filter(function (i) { return i.done; }).length;
    var pct = items.length ? Math.round((done / items.length) * 100) : 0;
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    return h('section', { className: cx('dq-check', p.className) },
      (p.title || items.length) ? h('div', { className: 'dq-check-head' },
        p.title ? h('h3', { className: 'dq-check-title' }, p.title) : h('span'),
        h('span', { className: 'dq-check-count' }, pad(done) + '/' + pad(items.length) + ' pistas')) : null,
      h('div', { className: 'dq-check-bar', 'aria-hidden': 'true' }, h('i', { style: { width: pct + '%' } })),
      h('ul', { className: 'dq-check-list' },
        items.map(function (it) {
          var toggle = function () { if (p.onToggle) p.onToggle(it.id, !it.done); };
          return h('li', { key: it.id, className: cx('dq-check-item', it.done && 'dq-check-done') },
            h('button', {
              type: 'button', role: 'checkbox', 'aria-checked': it.done ? 'true' : 'false',
              'aria-labelledby': 'dq-ck-' + it.id, className: 'dq-check-box', onClick: toggle
            }, it.done ? Check(14) : null),
            h('span', { className: 'dq-check-text', onClick: toggle },
              h('span', { className: 'dq-check-label', id: 'dq-ck-' + it.id }, it.label),
              it.hint ? h('span', { className: 'dq-check-hint' }, it.hint) : null));
        })));
  }

  /* Field: campo de formulário datilografado; multiline vira folha pautada. */
  function Field(p) {
    var id = p.id || ('dq-f-' + String(p.label || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    var rest = omit(p, ['label', 'hint', 'error', 'multiline', 'className', 'id']);
    var hintId = (p.error || p.hint) ? id + '-hint' : undefined;
    var control = h(p.multiline ? 'textarea' : 'input', Object.assign({}, rest, {
      id: id, className: 'dq-field-input', 'aria-describedby': hintId, 'aria-invalid': p.error ? 'true' : undefined
    }));
    return h('div', { className: cx('dq-field', p.error && 'dq-field-error', p.className) },
      p.label ? h('label', { className: 'dq-label', htmlFor: id }, p.label) : null,
      control,
      (p.error || p.hint) ? h('span', { className: 'dq-field-hint', id: hintId }, p.error || p.hint) : null);
  }

  /* FunnelColumn: uma etapa do funil no quadro Kanban. */
  function FunnelColumn(p) {
    return h('section', { className: cx('dq-col', p.className), 'aria-label': p.name },
      h('header', { className: 'dq-col-head' },
        h('div', { className: 'dq-col-top' },
          p.code ? h('span', { className: 'dq-col-code' }, p.code) : null,
          h('span', { className: 'dq-col-name' }, p.name)),
        h('div', { className: 'dq-col-meta' },
          h('span', null, (p.count != null ? p.count : 0) + (p.count === 1 ? ' lead' : ' leads')),
          p.rate != null ? h('span', { className: 'dq-col-rate' }, 'conv. ' + p.rate) : null)),
      h('div', { className: 'dq-col-body' }, p.children));
  }

  /* LeadCard: a ficha de um lead dentro de uma etapa. */
  function LeadCard(p) {
    return h('article', { className: cx('dq-lead', p.className) },
      p.tag ? h('span', { className: cx('dq-chip', p.tagTone && 'dq-chip-' + p.tagTone), style: { marginBottom: 'var(--space-2)' } }, p.tag) : null,
      h('h4', { className: 'dq-lead-name' }, p.name),
      p.company ? h('p', { className: 'dq-lead-co' }, p.company) : null,
      h('div', { className: 'dq-lead-row' },
        h('span', { className: 'dq-lead-value' }, p.value || ''),
        p.late
          ? h('span', { className: 'dq-lead-late' }, 'Atrasado · ' + p.days + 'd')
          : (p.days != null ? h('span', { style: { color: 'var(--ink-muted)' } }, p.days + 'd na etapa') : null)));
  }

  /* CreativeCard: sugestão de criativo e copy para Ads. */
  var RATIOS = { '1:1': [1, 1], '4:5': [4, 5], '9:16': [9, 16], '1.91:1': [1.91, 1], '16:9': [16, 9] };
  function CreativeCard(p) {
    var r = RATIOS[p.ratio] || [1, 1];
    return h('article', { className: cx('dq-creative', p.className) },
      h('div', { className: 'dq-creative-strip' },
        h('span', { className: 'dq-label' }, [p.week, p.platform, p.placement].filter(Boolean).join(' · ')),
        p.status ? h('span', { className: 'dq-label', style: { color: 'var(--green)' } }, p.status) : null),
      h('div', { className: 'dq-creative-body' },
        h('div', { className: 'dq-creative-frame' },
          h('div', { className: 'dq-creative-ratio', style: { aspectRatio: r[0] + ' / ' + r[1], maxHeight: 160, width: r[0] >= r[1] ? '100%' : 'auto', height: r[0] >= r[1] ? 'auto' : 160 } },
            h('span', { className: 'dq-label' }, p.ratio || '1:1')),
          h('span', { className: 'dq-label', style: { textAlign: 'center' } }, p.format)),
        h('div', { className: 'dq-creative-main' },
          h('div', { className: 'dq-creative-tags' },
            p.stage ? h('span', { className: 'dq-chip' }, 'Fase: ' + p.stage) : null,
            p.focus ? h('span', { className: 'dq-chip dq-chip-green' }, 'Foco: ' + p.focus) : null),
          p.headline ? h('h4', { className: 'dq-creative-head' }, p.headline) : null,
          p.copy ? h('p', { className: 'dq-creative-copy' }, p.copy) : null,
          p.cta ? h('span', { className: 'dq-creative-cta' }, 'CTA: ' + p.cta) : null)),
      p.brief ? h('p', { className: 'dq-creative-brief' }, h('b', null, 'Pauta: '), p.brief) : null,
      p.children || null);
  }

  /* Note: bilhete fixado com alfinete, em letra de mão. */
  function Note(p) {
    return h('aside', { className: cx('dq-note', p.pin === 'green' && 'dq-note-green', p.tilt === false && 'dq-note-flat', p.className) },
      p.title ? h('div', { className: 'dq-label' }, p.title) : null,
      h('p', { className: 'dq-note-text' }, p.children));
  }

  /* ClueTrack: o tabuleiro de progresso do caso. */
  function ClueTrack(p) {
    var steps = p.steps || [];
    var done = steps.filter(function (s) { return s.state === 'done'; }).length;
    return h('section', { className: cx('dq-track', p.className) },
      h('div', { className: 'dq-track-head' },
        h('span', { className: 'dq-label' }, (p.title || 'Pistas coletadas') + ' ' + done + '/' + steps.length),
        p.level ? h('span', { className: 'dq-track-level' }, p.level) : null),
      h('ol', { className: 'dq-track-list' },
        steps.map(function (s, i) {
          var st = s.state || 'locked';
          return h('li', { key: i, className: cx('dq-track-step', 'dq-track-' + st), 'aria-current': st === 'current' ? 'step' : undefined },
            h('span', { className: 'dq-track-sq' }, st === 'done' ? Check(22) : (s.code || String(i + 1))),
            h('span', { className: 'dq-track-name' }, s.label,
              h('span', { style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' } },
                st === 'done' ? ' (concluída)' : st === 'current' ? ' (atual)' : ' (bloqueada)')));
        })));
  }

  /* Readout: número do simulador de custo. */
  function Readout(p) {
    return h('div', { className: cx('dq-readout', p.tone && 'dq-readout-' + p.tone, p.className) },
      h('div', { className: 'dq-label' }, p.label),
      h('output', { className: 'dq-readout-value' }, p.value, p.unit ? h('span', { className: 'dq-readout-unit' }, p.unit) : null),
      p.hint ? h('div', { className: 'dq-readout-hint' }, p.hint) : null,
      p.flag ? h('div', { className: 'dq-readout-flag' }, h(Stamp, { tone: p.tone === 'danger' ? 'danger' : 'green', tilt: false }, p.flag)) : null);
  }

  var api = {
    Button: Button, Stamp: Stamp, FolderTabs: FolderTabs, CaseFile: CaseFile, Polaroid: Polaroid,
    IcpFile: IcpFile, Checklist: Checklist, Field: Field, FunnelColumn: FunnelColumn, LeadCard: LeadCard,
    CreativeCard: CreativeCard, Note: Note, ClueTrack: ClueTrack, Readout: Readout
  };
  window.Dossie = Object.assign(window.Dossie || {}, api);
})();
