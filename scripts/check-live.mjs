// Vérifie qu'un article est en ligne avant de poster sur LinkedIn.
// Usage : npm run live -- <slug>
// Affiche l'heure du post LinkedIn (publishDate), l'heure actuelle (Paris) et l'état de la page.
// Code de sortie 1 si la page ne répond pas 200 : ne pas poster.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parisDateTime, readFrontmatterFlags } from '../src/utils/publication.mjs';

const SITE = 'https://datastart.fr';

const slug = process.argv[2];
if (!slug) {
  console.error('Usage : npm run live -- <slug>');
  process.exit(2);
}

const file = join(fileURLToPath(new URL('..', import.meta.url)), 'src', 'data', 'post', `${slug}.md`);
const { draft, publishDate } = readFrontmatterFlags(readFileSync(file, 'utf8'));
const now = new Date();

console.log(`Maintenant        : ${parisDateTime(now)} (Paris)`);
if (draft) console.log("Attention : l'article est en brouillon (draft: true), il ne sera pas publié.");
if (!publishDate) {
  console.log("Pas de publishDate : l'article est publié dès le prochain déploiement.");
} else {
  console.log(`Post LinkedIn     : ${parisDateTime(new Date(publishDate))} (Paris), d'après publishDate`);
}

const url = `${SITE}/${slug}/`;
try {
  const res = await fetch(url, { headers: { 'cache-control': 'no-cache' }, redirect: 'follow' });
  console.log(`Page ${url} : HTTP ${res.status}`);
  if (res.status !== 200) {
    console.log("NE PAS POSTER : la page n'est pas encore en ligne. Relancez le déploiement à la main si besoin.");
    process.exit(1);
  }
  console.log('OK : la page répond 200, le lien du commentaire fonctionnera.');
} catch (error) {
  console.log(`Page ${url} : injoignable (${error.message}). NE PAS POSTER.`);
  process.exit(1);
}
