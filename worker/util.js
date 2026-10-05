export class HttpError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

/** Só aceita escrita feita pelo próprio app (freio contra CSRF e uso da API por terceiros). */
export function isSameOrigin(request, url) {
  const site = request.headers.get('sec-fetch-site');
  if (site) return site === 'same-origin';
  const origin = request.headers.get('origin');
  return !origin || origin === url.origin;
}

export async function readJson(request, limit = 200_000) {
  const text = await request.text();
  if (text.length > limit) throw new HttpError('Requisição grande demais', 413);
  try {
    return JSON.parse(text || '{}');
  } catch {
    throw new HttpError('JSON inválido', 400);
  }
}

/**
 * O Durable Object sinaliza erros de regra como "[status] mensagem"; a RPC preserva só a mensagem.
 * Aqui ela volta a virar HttpError com o status certo.
 */
export function fromStoreError(error) {
  const match = /^\[(\d{3})\] ([\s\S]*)$/.exec(error?.message || '');
  if (match) return new HttpError(match[2], Number(match[1]));
  return null;
}

export const str = (value, max = 2000) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

export function requireString(value, field, max = 300) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new HttpError(`Campo inválido: ${field}`, 400);
  return value.trim();
}

/** Limpa um objeto de texto vindo do front: só chaves conhecidas, strings curtas. */
export function pickStrings(source, keys, max = 2000) {
  const out = {};
  for (const key of keys) out[key] = str(source?.[key], max);
  return out;
}
