import { HttpError } from './util.js';

/*
 * Retrato do decisor pelo Workers AI (binding AI no wrangler.jsonc), com cota diária gratuita.
 * Modelo FLUX.1 schnell: rápido e barato; a Polaroid aplica leve dessaturação por CSS.
 */
const MODEL = '@cf/black-forest-labs/flux-1-schnell';

export async function generatePortrait(env, prompt) {
  if (!env.AI) throw new HttpError('Workers AI não está ligado neste Worker (binding AI)', 503);
  let result;
  try {
    result = await env.AI.run(MODEL, {
      prompt: `${prompt}. Documentary photograph, realistic, soft natural light, muted colors, 35mm, shallow depth of field, no text, no watermark, no logo.`,
      steps: 6,
    });
  } catch (error) {
    throw new HttpError(`Workers AI: ${error?.message || 'falha ao gerar a imagem'}`, 502);
  }
  const data = result?.image;
  if (typeof data !== 'string' || !data) throw new HttpError('O Workers AI não devolveu imagem', 502);
  const mime = data.startsWith('iVBOR') ? 'image/png' : data.startsWith('UklGR') ? 'image/webp' : 'image/jpeg';
  return { mime, data };
}
