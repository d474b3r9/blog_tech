// Logique de publication partagée entre le site (Astro) et les scripts Node.
// JavaScript pur, sans dépendance : aucun besoin de compilation.
//
// Règle : `publishDate` porte l'heure exacte du post LinkedIn. Le site, lui, ne regarde que le
// jour : un déploiement quotidien à 4h (heure de Paris) fait sortir l'article le jour prévu, donc
// plusieurs heures avant le post.

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
 * Lit `draft` et `publishDate` dans le frontmatter d'un fichier Markdown.
 * Gère CRLF, guillemets simples ou doubles et clé absente.
 * @param {string} markdownText
 * @returns {{ draft: boolean, publishDate: string | undefined }}
 */
export const readFrontmatterFlags = (markdownText) => {
  const text = markdownText.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const front = (text.match(/^---\n([\s\S]*?)\n---/) ?? [])[1] ?? '';
  const draft = /^draft:\s*(['"]?)true\1\s*(?:#.*)?$/m.test(front);
  const rawDate = (front.match(/^publishDate:[ \t]*(.+)$/m) ?? [])[1];
  const publishDate = rawDate
    ?.replace(/\s+#.*$/, '')
    .trim()
    .replace(/^(['"])(.*)\1$/, '$2');
  return { draft, publishDate: publishDate || undefined };
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
