// Senhas e sessões. Tudo com WebCrypto, sem dependência.
// PBKDF2-SHA256: o Workers aceita até 100.000 iterações. O número fica gravado junto do hash,
// então dá para mudar PBKDF2_ITERATIONS no futuro sem invalidar as senhas antigas.

const enc = new TextEncoder();
export const SESSION_COOKIE = 'dq_session';
export const SESSION_DAYS = 30;

export const toBase64Url = (bytes) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function randomToken(size = 32) {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(size)));
}

export async function sha256(text) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password, { salt, iterations = 100_000 } = {}) {
  const saltBytes = salt ? Uint8Array.from(atob(salt), (c) => c.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations }, key, 256);
  return {
    hash: btoa(String.fromCharCode(...new Uint8Array(bits))),
    salt: btoa(String.fromCharCode(...saltBytes)),
    iterations,
  };
}

/** Comparação em tempo constante. */
export function sameString(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(password, stored) {
  if (!stored?.pass_hash) return false;
  const { hash } = await hashPassword(password, { salt: stored.pass_salt, iterations: stored.pass_iter });
  return sameString(hash, stored.pass_hash);
}

export function readSessionToken(request) {
  const cookie = request.headers.get('cookie') || '';
  return new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`).exec(cookie)?.[1] || null;
}

export function sessionCookie(token, url) {
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}`;
}

export function clearCookie(url) {
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=0`;
}

export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) return 'A senha precisa ter pelo menos 8 caracteres';
  if (password.length > 200) return 'Senha longa demais';
  return null;
}

export const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');
export const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 200;
