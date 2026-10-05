import React, { useEffect, useState } from 'react';
import { Button, CreativeCard, Field, Note } from '../ds/index.jsx';
import { isoWeek } from '../../shared/game.js';
import { api } from '../lib/api.js';
import { caseWeekLabel } from '../lib/format.js';
import Generate from '../components/Generate.jsx';
import CopyButton from '../components/CopyButton.jsx';
import { Block, PastaHead } from './common.jsx';

const PLATFORMS = ['Meta', 'Google', 'LinkedIn', 'TikTok'];
const LIBRARIES = {
  Meta: (q) => `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&search_type=keyword_unordered&q=${encodeURIComponent(q)}`,
  Google: (q) => `https://adstransparency.google.com/?region=BR${q ? `&query=${encodeURIComponent(q)}` : ''}`,
  LinkedIn: (q) => `https://www.linkedin.com/ad-library/search${q ? `?companyName=${encodeURIComponent(q)}` : ''}`,
  TikTok: () => 'https://library.tiktok.com/ads',
};
const WHAT_TO_COPY = {
  Meta: 'Na lista, clique em "Ver detalhes do anúncio" e copie o endereço da página que abrir (tem ?id= no final).',
  Google: 'Clique no anunciante e depois no anúncio; copie o endereço da página do anúncio.',
  LinkedIn: 'Abra o anúncio da empresa e copie o endereço da página.',
  TikTok: 'Pesquise pelo anunciante, abra o anúncio e copie o endereço.',
};

/** Reduz o print para no máximo 1280 px e JPEG, para caber no pedido e custar menos. */
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

/** Anúncios gerados antes da mudança de formato usam outros nomes de campo. */
export function normalizeAd(p) {
  return {
    plataforma: p.plataforma,
    objetivo: p.objetivo_campanha || '',
    publico: p.publico || '',
    posicionamento: p.posicionamento,
    formato: p.formato,
    proporcao: p.proporcao,
    fase: p.fase,
    foco: p.foco,
    gancho: p.gancho || '',
    texto: p.texto_principal || p.copy || '',
    titulo: p.titulo || p.headline || '',
    descricao: p.descricao || '',
    cta: p.cta,
    criativo: p.criativo || p.pauta_visual || '',
  };
}

export const adsOf = (a) => (a.output.anuncios || a.output.pautas || []).map(normalizeAd);

function Tutorial({ concorrente }) {
  const [platform, setPlatform] = useState('Meta');
  return (
    <div className="tutorial">
      <div className="dq-label">Como pegar a referência certa</div>
      <ol className="steps">
        <li>
          Escreva o nome do concorrente no campo acima. O link do <b>site</b> do concorrente não serve: o que interessa é o <b>anúncio</b> que ele está pagando para veicular.
        </li>
        <li>
          Abra a biblioteca de anúncios da plataforma (ela já abre pesquisando o nome do concorrente):{' '}
          {PLATFORMS.map((p) => (
            <a key={p} href={LIBRARIES[p](concorrente)} target="_blank" rel="noreferrer" className="lib-link" onClick={() => setPlatform(p)}>
              {p}
            </a>
          ))}
        </li>
        <li>{WHAT_TO_COPY[platform]} Cole esse endereço em "Link do anúncio".</li>
        <li>
          Tire um <b>print</b> do anúncio e suba aqui. O sistema não consegue abrir esses links sozinho; quem analisa o anúncio é a IA, olhando o print.
        </li>
      </ol>
    </div>
  );
}

function AdDetails({ ad }) {
  return (
    <dl className="ad-details">
      {ad.objetivo ? (
        <div>
          <dt>Campanha</dt>
          <dd>{ad.objetivo}</dd>
        </div>
      ) : null}
      {ad.publico ? (
        <div>
          <dt>Público</dt>
          <dd>{ad.publico}</dd>
        </div>
      ) : null}
      {ad.gancho ? (
        <div>
          <dt>Gancho</dt>
          <dd>{ad.gancho}</dd>
        </div>
      ) : null}
      {ad.descricao ? (
        <div>
          <dt>Descrição</dt>
          <dd>{ad.descricao}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export default function Ads({ data, line, lineId, onUpdate }) {
  const pid = data.project.id;
  const [limit, setLimit] = useState(3);
  const [form, setForm] = useState({ plataformas: ['Meta', 'Google'], objetivo: '', concorrente: '', referencias: [] });
  const [prints, setPrints] = useState([]);
  const [ref, setRef] = useState({ plataforma: 'Meta', url: '', nota: '' });
  const [error, setError] = useState('');
  const week = isoWeek();
  const ads = data.ads.filter((a) => a.line_id === lineId);
  const usedThisWeek = ads.filter((a) => a.week === week).length;
  const thisWeek = caseWeekLabel(week, data.project.created_at);

  useEffect(() => {
    api('/health')
      .then((h) => setLimit(h.adsWeeklyLimit || 3))
      .catch(() => {});
  }, []);

  const togglePlatform = (p) => setForm({ ...form, plataformas: form.plataformas.includes(p) ? form.plataformas.filter((x) => x !== p) : [...form.plataformas, p] });
  const addRef = () => {
    setError('');
    if (!/^https:\/\/\S+$/i.test(ref.url.trim())) return setError('Cole o endereço completo do anúncio, começando com https://');
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

  return (
    <div className="pasta">
      <PastaHead code="07" title={`Anúncios · ${line.data?.nome || ''}`}>
        Anúncios de mídia paga da semana: campanha, público, formato, gancho, texto e o criativo a produzir. Para posts orgânicos de redes sociais, use a pasta bônus Conteúdo.
      </PastaHead>

      <Block title={`Pedido da ${thisWeek.short.toLowerCase()}`} aside={<span className="dq-label">{usedThisWeek} de {limit} pedidos nesta semana</span>}>
        <p className="small muted">{thisWeek.long}. A semana 1 é a semana em que o caso foi aberto; o contador de pedidos zera toda segunda-feira.</p>
        <div className="stack-4" style={{ marginTop: 'var(--space-3)' }}>
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
          <div className="grid-2">
            <Field label="Objetivo da semana" value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} placeholder="Ex.: conversas no WhatsApp para avaliação de implante" />
            <Field label="Concorrente para pesquisar" value={form.concorrente} onChange={(e) => setForm({ ...form, concorrente: e.target.value })} placeholder="Nome como aparece no Instagram ou Google" />
          </div>

          <div className="refs">
            <Tutorial concorrente={form.concorrente} />
            <div className="ref-form">
              <select className="dq-field-input" aria-label="Plataforma do anúncio" value={ref.plataforma} onChange={(e) => setRef({ ...ref, plataforma: e.target.value })}>
                {PLATFORMS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              <input className="dq-field-input" aria-label="Link do anúncio" placeholder="Link do anúncio: https://..." value={ref.url} onChange={(e) => setRef({ ...ref, url: e.target.value })} />
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
                  <span>+ Print do anúncio</span>
                  <span className="small muted">até 4</span>
                </label>
              ) : null}
            </div>
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          <Generate
            label="Gerar anúncios da semana"
            has={false}
            disabled={usedThisWeek >= limit || !form.plataformas.length}
            onRun={run}
            warning={usedThisWeek >= limit ? 'Limite desta semana atingido. Na segunda-feira o contador volta a zero.' : undefined}
            steps={['Olhando os anúncios de referência...', 'Cruzando com as dores do ICP...', 'Escolhendo campanha e público...', 'Escrevendo ganchos e textos...', 'Montando os criativos...']}
          />
        </div>
      </Block>

      {Object.entries(byWeek).map(([w, requests]) => {
        const label = caseWeekLabel(w, data.project.created_at);
        return (
          <Block key={w} title={label.long}>
            <div className="stack-5">
              {requests.map((a) => (
                <div key={a.id} className="stack-4">
                  <p className="small muted">
                    {data.names[a.created_by] || 'Alguém'} pediu{a.input.objetivo ? `: ${a.input.objetivo}` : ''} · {(a.input.plataformas || []).join(', ')}
                    {a.input.concorrente ? ` · concorrente: ${a.input.concorrente}` : ''}
                    {a.input.referencias?.length ? ` · ${a.input.referencias.length} referências` : ''}
                    {a.input.prints ? ` · ${a.input.prints} prints` : ''}
                  </p>
                  {a.output.leitura_referencias ? (
                    <Note title="Leitura das referências" tilt={false} className="note-wide">
                      {a.output.leitura_referencias}
                    </Note>
                  ) : null}
                  <div className="creatives">
                    {adsOf(a).map((ad, i) => (
                      <CreativeCard
                        key={i}
                        week={label.short}
                        platform={ad.plataforma}
                        placement={ad.posicionamento}
                        format={ad.formato}
                        ratio={ad.proporcao}
                        stage={ad.fase}
                        focus={ad.foco}
                        headline={ad.titulo}
                        copy={ad.texto}
                        cta={ad.cta}
                        brief={ad.criativo}
                      >
                        <AdDetails ad={ad} />
                        <div className="creative-actions">
                          <CopyButton text={[ad.texto, `Título: ${ad.titulo}`, ad.descricao ? `Descrição: ${ad.descricao}` : '', `Botão: ${ad.cta}`].filter(Boolean).join('\n\n')} label="Copiar texto do anúncio" />
                        </div>
                      </CreativeCard>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Block>
        );
      })}
    </div>
  );
}
