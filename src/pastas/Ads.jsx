import React, { useEffect, useState } from 'react';
import { Button, CreativeCard, Field, Note } from '../ds/index.jsx';
import { isoWeek } from '../../shared/game.js';
import { api } from '../lib/api.js';
import { weekLabel } from '../lib/format.js';
import Generate from '../components/Generate.jsx';
import CopyButton from '../components/CopyButton.jsx';
import { Block, PastaHead } from './common.jsx';

const PLATFORMS = ['Meta', 'Google', 'LinkedIn', 'TikTok'];
const LIBRARIES = {
  Meta: (q) => `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&q=${encodeURIComponent(q)}`,
  Google: () => 'https://adstransparency.google.com/?region=BR',
  LinkedIn: () => 'https://www.linkedin.com/ad-library/',
  TikTok: () => 'https://library.tiktok.com/ads',
};

/** Reduz o print para no máximo 1280 px e JPEG, para caber no pedido e custar menos tokens. */
function shrink(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      resolve({ media_type: 'image/jpeg', data: dataUrl.split(',')[1], preview: dataUrl, name: file.name });
    };
    img.onerror = () => reject(new Error(`Não consegui ler ${file.name}`));
    img.src = url;
  });
}

export default function Ads({ data, line, lineId, onUpdate }) {
  const pid = data.project.id;
  const [limit, setLimit] = useState(3);
  const [form, setForm] = useState({ plataformas: ['Meta', 'Google'], objetivo: '', referencias: [] });
  const [prints, setPrints] = useState([]);
  const [ref, setRef] = useState({ plataforma: 'Meta', url: '', nota: '' });
  const [error, setError] = useState('');
  const week = isoWeek();
  const ads = data.ads.filter((a) => a.line_id === lineId);
  const usedThisWeek = ads.filter((a) => a.week === week).length;

  useEffect(() => {
    api('/health')
      .then((h) => setLimit(h.adsWeeklyLimit || 3))
      .catch(() => {});
  }, []);

  const togglePlatform = (p) => setForm({ ...form, plataformas: form.plataformas.includes(p) ? form.plataformas.filter((x) => x !== p) : [...form.plataformas, p] });
  const addRef = () => {
    setError('');
    if (!/^https:\/\/\S+$/i.test(ref.url.trim())) return setError('Cole o link completo, começando com https://');
    if (form.referencias.length >= 8) return setError('Até 8 referências por pedido');
    setForm({ ...form, referencias: [...form.referencias, { ...ref, url: ref.url.trim() }] });
    setRef({ ...ref, url: '', nota: '' });
  };
  const addPrints = async (files) => {
    setError('');
    try {
      const next = [...prints];
      for (const file of [...files].slice(0, 4 - prints.length)) next.push(await shrink(file));
      setPrints(next);
    } catch (err) {
      setError(err.message);
    }
  };
  const run = async () => {
    const body = { ...form, prints: prints.map(({ media_type, data: d }) => ({ media_type, data: d })) };
    onUpdate(await api(`/projects/${pid}/lines/${lineId}/ads`, { method: 'POST', body }));
    setPrints([]);
  };

  const byWeek = [...ads].reverse().reduce((acc, a) => {
    (acc[a.week] ||= []).push(a);
    return acc;
  }, {});
  const searchTerm = data.project.name;

  return (
    <div className="pasta">
      <PastaHead code="06" title={`Ads · ${line.data?.nome || ''}`}>
        Pautas de anúncio da semana: formato, fase do funil, foco, copy e o que produzir. Peça até {limit} vezes por semana nesta linha.
      </PastaHead>

      <Block title="Pedido da semana" aside={<span className="dq-label">{usedThisWeek} de {limit} pedidos nesta semana</span>}>
        <div className="stack-4">
          <div>
            <div className="dq-label">Plataformas</div>
            <div className="row-3 wrap" style={{ marginTop: 'var(--space-2)' }}>
              {PLATFORMS.map((p) => (
                <label key={p} className="check-pill">
                  <input type="checkbox" checked={form.plataformas.includes(p)} onChange={() => togglePlatform(p)} /> {p}
                </label>
              ))}
            </div>
          </div>
          <Field label="Objetivo da semana" value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} placeholder="Ex.: gerar conversas no WhatsApp para avaliação de implante" />

          <div className="refs">
            <div className="dq-label">Referências de concorrentes</div>
            <p className="small muted">
              Abra a biblioteca de anúncios, copie o link do anúncio ou da página do concorrente e, se puder, suba o print: o sistema não consegue ler o conteúdo desses links sozinho, mas lê as imagens.
            </p>
            <div className="row-3 wrap small">
              {PLATFORMS.map((p) => (
                <a key={p} href={LIBRARIES[p](searchTerm)} target="_blank" rel="noreferrer">
                  Biblioteca {p}
                </a>
              ))}
            </div>
            <div className="ref-form">
              <select className="dq-field-input" aria-label="Plataforma da referência" value={ref.plataforma} onChange={(e) => setRef({ ...ref, plataforma: e.target.value })}>
                {PLATFORMS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              <input className="dq-field-input" aria-label="Link da referência" placeholder="https://..." value={ref.url} onChange={(e) => setRef({ ...ref, url: e.target.value })} />
              <input className="dq-field-input" aria-label="Observação" placeholder="O que chamou atenção" value={ref.nota} onChange={(e) => setRef({ ...ref, nota: e.target.value })} />
              <Button size="sm" variant="quiet" onClick={addRef}>
                Adicionar
              </Button>
            </div>
            {form.referencias.length ? (
              <ul className="ref-list small">
                {form.referencias.map((r, i) => (
                  <li key={r.url + i}>
                    <span className="dq-chip">{r.plataforma}</span>{' '}
                    <a href={r.url} target="_blank" rel="noreferrer">
                      {r.url.slice(0, 60)}
                    </a>{' '}
                    {r.nota}{' '}
                    <button type="button" className="link-btn" onClick={() => setForm({ ...form, referencias: form.referencias.filter((_, j) => j !== i) })}>
                      remover
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="prints">
              {prints.map((p, i) => (
                <figure key={i} className="print">
                  <img src={p.preview} alt={`Print ${i + 1}: ${p.name}`} />
                  <button type="button" className="link-btn small" onClick={() => setPrints(prints.filter((_, j) => j !== i))}>
                    remover
                  </button>
                </figure>
              ))}
              {prints.length < 4 ? (
                <label className="print-add">
                  <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(e) => addPrints(e.target.files)} />
                  <span>+ Print de anúncio</span>
                  <span className="small muted">até 4</span>
                </label>
              ) : null}
            </div>
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          <Generate
            label="Pedir pautas da semana"
            has={false}
            disabled={usedThisWeek >= limit || !form.plataformas.length}
            onRun={run}
            warning={usedThisWeek >= limit ? 'Limite desta semana atingido. Na próxima semana o contador volta a zero.' : undefined}
            steps={['Olhando as referências...', 'Cruzando com as dores do ICP...', 'Variando fases do funil...', 'Escrevendo as copies...', 'Montando as pautas...']}
          />
        </div>
      </Block>

      {Object.entries(byWeek).map(([w, requests]) => (
        <Block key={w} title={weekLabel(w)}>
          <div className="stack-5">
            {requests.map((a) => (
              <div key={a.id} className="stack-4">
                <p className="small muted">
                  {data.names[a.created_by] || 'Alguém'} pediu{a.input.objetivo ? `: ${a.input.objetivo}` : ''} · {(a.input.plataformas || []).join(', ')}
                  {a.input.referencias?.length ? ` · ${a.input.referencias.length} referências` : ''}
                  {a.input.prints ? ` · ${a.input.prints} prints` : ''}
                </p>
                {a.output.leitura_referencias ? (
                  <Note title="Leitura das referências" tilt={false} className="note-wide">
                    {a.output.leitura_referencias}
                  </Note>
                ) : null}
                <div className="creatives">
                  {(a.output.pautas || []).map((p, i) => (
                    <CreativeCard
                      key={i}
                      week={weekLabel(a.week).split(' · ')[0]}
                      platform={p.plataforma}
                      placement={p.posicionamento}
                      format={p.formato}
                      ratio={p.proporcao}
                      stage={p.fase}
                      focus={p.foco}
                      headline={p.headline}
                      copy={p.copy}
                      cta={p.cta}
                      brief={p.pauta_visual}
                    >
                      <div className="creative-actions">
                        <CopyButton text={`${p.headline}\n\n${p.copy}\n\n${p.cta}`} label="Copiar copy" />
                      </div>
                    </CreativeCard>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Block>
      ))}
    </div>
  );
}
