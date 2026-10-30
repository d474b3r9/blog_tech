// Logique de publication partagée entre le site (Astro) et les scripts Node.
// JavaScript pur, sans dépendance : aucun besoin de compilation.
//
// Règle : `publishDate` est l'instant de mise en ligne du site. Le post LinkedIn part
// environ une heure plus tard, ce qui laisse de la marge au déploiement planifié.

const PARIS_TIMEZONE = 'Europe/Paris';
const HOUR_MS = 60 * 60 * 1000;

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
 * Date et heure lisibles à Paris, par exemple « mardi 3 novembre, 07:30 ».
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
 * - mode 'instant' (défaut) : publishDate <= now, comparaison d'instants ;
 * - mode 'day' : le jour à Paris de publishDate est arrivé.
 * Sans publishDate, l'article est considéré comme publié ; une date illisible ne l'est pas.
 * @param {{ draft?: boolean, publishDate?: string | Date | undefined }} flags
 * @param {Date} [now]
 * @param {{ mode?: 'day' | 'instant' }} [options]
 * @returns {boolean}
 */
export const isPublishedFlags = ({ draft, publishDate }, now = new Date(), { mode = 'instant' } = {}) => {
  if (draft) return false;
  if (publishDate === undefined || publishDate === '') return true;
  const date = new Date(publishDate);
  if (Number.isNaN(date.getTime())) return false;
  return mode === 'instant' ? date.getTime() <= now.getTime() : parisDay(date) <= parisDay(now);
};

/**
 * Vrai si au moins un article est devenu publiable dans les `windowHours` dernières heures.
 * Sert à ne reconstruire le site, lors d'un déclenchement planifié, que quand c'est utile.
 * @param {Array<{ draft?: boolean, publishDate?: string | undefined }>} postsFlags
 * @param {Date} now
 * @param {number} [windowHours]
 * @returns {boolean}
 */
export const hasRecentlyPublished = (postsFlags, now, windowHours = 6) =>
  postsFlags.some(({ draft, publishDate }) => {
    if (draft || !publishDate) return false;
    const time = new Date(publishDate).getTime();
    if (Number.isNaN(time)) return false;
    return time <= now.getTime() && time > now.getTime() - windowHours * HOUR_MS;
  });

/**
 * Décide si le workflow doit construire et déployer.
 * Toute exécution manuelle ou déclenchée par un push déploie ; une exécution planifiée
 * ne déploie que si un article vient de devenir publiable.
 * @param {string} event Nom de l'événement GitHub (push, schedule, workflow_dispatch)
 * @param {Array<{ draft?: boolean, publishDate?: string | undefined }>} postsFlags
 * @param {Date} now
 * @param {number} [windowHours]
 * @returns {boolean}
 */
export const shouldDeploy = (event, postsFlags, now, windowHours = 6) =>
  event !== 'schedule' || hasRecentlyPublished(postsFlags, now, windowHours);
