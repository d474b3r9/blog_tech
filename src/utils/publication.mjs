// Logique de publication partagée entre le site (Astro) et les scripts Node.
// JavaScript pur (seule dépendance : js-yaml) : aucun besoin de compilation.
//
// Règle : `publishDate` porte l'heure exacte du post LinkedIn. Le site, lui, ne regarde que le
// jour : un déploiement quotidien à 4h (heure de Paris) fait sortir l'article le jour prévu, donc
// plusieurs heures avant le post.

import yaml from 'js-yaml';

const PARIS_TIMEZONE = 'Europe/Paris';

const parisDayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: PARIS_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const parisTimeFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: PARIS_TIMEZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Jour calendaire à Paris au format AAAA-MM-JJ (gère seul l'heure d'été et d'hiver).
 * @param {Date} date
 * @returns {string}
 */
export const parisDay = (date) => parisDayFormat.format(date);

/**
 * Date et heure lisibles à Paris, par exemple « mardi 3 novembre à 08:30 ».
 * @param {Date} date
 * @returns {string}
 */
export const parisDateTime = (date) => parisTimeFormat.format(date);

/**
 * Frontmatter YAML d'un fichier Markdown, lu avec le parseur du projet (CORE_SCHEMA : les dates
 * restent des chaînes). Gère BOM et CRLF. `null` si le frontmatter est absent, `'invalid'` s'il est
 * illisible ou n'est pas un objet.
 * @param {string} markdownText
 * @returns {Record<string, unknown> | null | 'invalid'}
 */
export const readFrontmatterData = (markdownText) => {
  const text = (markdownText.charCodeAt(0) === 0xfeff ? markdownText.slice(1) : markdownText).replace(/\r\n?/g, '\n');
  const front = (text.match(/^---\n([\s\S]*?)\n---/) ?? [])[1];
  if (front === undefined) return null;
  try {
    const data = yaml.load(front, { schema: yaml.CORE_SCHEMA }) ?? {};
    return typeof data === 'object' && !Array.isArray(data) ? data : 'invalid';
  } catch {
    return 'invalid';
  }
};

/**
 * Valeur de `draft` lue comme brouillon : `true` booléen ou ses graphies YAML et texte (`"true"`, `yes`, `on`).
 * @param {unknown} value
 * @returns {boolean}
 */
export const isDraftValue = (value) => value === true || /^(true|yes|on|y)$/i.test(String(value ?? '').trim());

/**
 * Lit `draft`, `publishDate` et `annexOf` dans le frontmatter d'un fichier Markdown
 * (`True`, `TRUE`, `"true"`, `yes`… valent « brouillon »).
 * Échoue en sécurité : un frontmatter illisible est traité comme un brouillon.
 * @param {string} markdownText
 * @returns {{ draft: boolean, publishDate: string | undefined, annexOf: string | undefined }}
 */
export const readFrontmatterFlags = (markdownText) => {
  const data = readFrontmatterData(markdownText);
  if (data === null) return { draft: false, publishDate: undefined, annexOf: undefined };
  if (data === 'invalid') return { draft: true, publishDate: undefined, annexOf: undefined };
  const asText = (value) => (value === undefined || value === null ? undefined : String(value).trim() || undefined);
  return { draft: isDraftValue(data.draft), publishDate: asText(data.publishDate), annexOf: asText(data.annexOf) };
};

/**
 * Un article est publié quand il n'est pas un brouillon et que sa date est arrivée.
 * - mode 'day' (défaut) : le jour à Paris de publishDate est arrivé (publication à la première
 *   construction du jour prévu) ;
 * - mode 'instant' : publishDate <= now, comparaison d'instants.
 * Sans publishDate, l'article est considéré comme publié ; une date illisible ne l'est pas.
 * @param {{ draft?: boolean, publishDate?: string | Date | undefined }} flags
 * @param {Date} [now]
 * @param {{ mode?: 'day' | 'instant' }} [options]
 * @returns {boolean}
 */
export const isPublishedFlags = ({ draft, publishDate }, now = new Date(), { mode = 'day' } = {}) => {
  if (draft) return false;
  if (publishDate === undefined || publishDate === '') return true;
  const date = new Date(publishDate);
  if (Number.isNaN(date.getTime())) return false;
  return mode === 'instant' ? date.getTime() <= now.getTime() : parisDay(date) <= parisDay(now);
};
