// Contrôle qualité des articles avant publication.
// usage : node scripts/validate-posts.mjs [--dir <dossier d'articles>] [--now ISO] [--include-drafts]
// Code de sortie 1 si une erreur est relevée (les avertissements n'échouent pas).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { isDraftValue } from '../src/utils/publication.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const postDir = resolve(opt('--dir') ?? join(root, 'src', 'data', 'post'));
const now = opt('--now') ? new Date(opt('--now')) : new Date();
const includeDrafts = args.includes('--include-drafts');
if (Number.isNaN(now.getTime())) {
  console.error('--now : date invalide');
  process.exit(2);
}

const REQUIRED = ['publishDate', 'title', 'excerpt', 'image', 'imageAlt', 'category', 'tags', 'author'];
const OPTIONAL = ['draft', 'updateDate', 'canonical', 'metadata', 'unlisted', 'annexOf'];
const KNOWN = new Set([...REQUIRED, ...OPTIONAL]);
const DAYS = 'lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche';
const MONTHS =
  'janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre';
const WHEN = `(?:${DAYS}|\\d{1,2}(?:er)?\\s+(?:${MONTHS})|\\d{1,2}/\\d{1,2}|\\d{4}-\\d{2}-\\d{2})`;
const ANNOUNCE = [
  new RegExp(`(?:prochain|futur)\\s+article[^.\\n]{0,80}?\\b${WHEN}\\b`, 'i'),
  new RegExp(`\\bprévu(?:e|s)?\\s+(?:pour\\s+)?(?:le\\s+|ce\\s+)?${WHEN}\\b`, 'i'),
  new RegExp(`\\b(?:sortira|paraîtra|paraitra|publié\\s+le|à\\s+paraître)\\s+(?:le\\s+)?${WHEN}\\b`, 'i'),
];
// pages du site qui ne sont pas des articles (src/pages/*.astro)
const pagesDir = join(root, 'src', 'pages');
const PAGES = new Set(
  existsSync(pagesDir)
    ? readdirSync(pagesDir)
        .filter((f) => f.endsWith('.astro') && !f.startsWith('['))
        .map((f) => f.replace('.astro', ''))
    : []
);
PAGES.add('category');
PAGES.add('tag');

let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch {
  /* dimensions non vérifiées */
}

const errors = [];
const warnings = [];

const files = readdirSync(postDir).filter((f) => /\.mdx?$/.test(f));
const posts = new Map();
for (const file of files) {
  const slug = file.replace(/\.mdx?$/, '');
  const text = readFileSync(join(postDir, file), 'utf8').replace(/\r\n/g, '\n');
  const m = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  let data = {};
  let err = null;
  if (!m) err = 'frontmatter absent ou mal fermé';
  else {
    try {
      data = yaml.load(m[1]) ?? {};
    } catch (e) {
      err = `frontmatter YAML invalide : ${e.message.split('\n')[0]}`;
    }
  }
  posts.set(slug, { file, slug, text, data, err, fmLines: m ? m[0].split('\n').length - 1 : 0 });
}

const dateOf = (p) => (p.data.publishDate ? new Date(p.data.publishDate) : null);
const iso = (p) => dateOf(p)?.toISOString();

// chemin d'image du site -> chemin disque (src/assets/...)
const toDisk = (ref, mdDir) => {
  if (/^(https?:)?\/\//.test(ref) || ref.startsWith('data:')) return { external: true };
  let rel;
  if (ref.startsWith('~/')) rel = ref.slice(2);
  else if (ref.startsWith('../../')) rel = ref.slice(6);
  else if (ref.startsWith('/')) return { disk: join(root, 'public', ref.slice(1)) };
  else return { disk: resolve(mdDir, ref) };
  return { disk: join(root, 'src', rel), rel };
};

const checkImage = (p, ref, line, label) => {
  const r = toDisk(ref, postDir);
  if (r.external) return null;
  if (!existsSync(r.disk)) {
    errors.push(`${p.file}:${line}: ${label} introuvable sur disque : ${ref}`);
    return null;
  }
  if (!p.data.annexOf && (!r.rel || !r.rel.startsWith(`assets/images/${p.slug}/`))) {
    warnings.push(`${p.file}:${line}: ${label} hors de src/assets/images/${p.slug}/ : ${ref}`);
  }
  return r.disk;
};

for (const p of posts.values()) {
  const { file, data, text } = p;
  const isDraft = isDraftValue(data.draft);
  if (isDraft && !includeDrafts) continue;
  const lines = text.split('\n');
  const lineOfKey = (k) => {
    const i = lines.findIndex((l, n) => n <= p.fmLines && new RegExp(`^${k}\\s*:`).test(l));
    return i >= 0 ? i + 1 : 1;
  };
  const E = (line, msg) => errors.push(`${file}:${line}: ${msg}`);
  const W = (line, msg) => warnings.push(`${file}:${line}: ${msg}`);

  if (p.err) {
    E(1, p.err);
    continue;
  }
  for (const k of REQUIRED) {
    if (data[k] === undefined || data[k] === null || data[k] === '') E(1, `clé obligatoire absente : ${k}`);
  }
  for (const k of Object.keys(data)) if (!KNOWN.has(k)) E(lineOfKey(k), `clé inconnue (faute de frappe ?) : ${k}`);
  if (data.annexOf !== undefined) {
    const parent = posts.get(String(data.annexOf));
    if (!parent) E(lineOfKey('annexOf'), `annexOf « ${data.annexOf} » ne désigne aucun article`);
    else if (isDraftValue(parent.data.draft))
      E(lineOfKey('annexOf'), `annexOf « ${data.annexOf} » : l'article parent est un brouillon`);
    if (data.unlisted !== true)
      W(lineOfKey('annexOf'), 'annexOf sans unlisted: true : l’annexe restera listée sur le blog');
  }
  if (data.publishDate !== undefined && Number.isNaN(dateOf(p)?.getTime())) {
    E(lineOfKey('publishDate'), 'publishDate invalide');
  }
  if (isDraft && dateOf(p) && dateOf(p) <= now) W(lineOfKey('draft'), 'brouillon dont la publishDate est déjà passée');
  if (data.tags !== undefined && !Array.isArray(data.tags)) E(lineOfKey('tags'), 'tags doit être une liste');
  if (typeof data.excerpt === 'string') {
    const n = [...data.excerpt].length;
    if (n < 50) E(lineOfKey('excerpt'), `excerpt trop court (${n} caractères, minimum 50)`);
    if (n > 200) W(lineOfKey('excerpt'), `excerpt long (${n} caractères, recommandé 200 au plus)`);
  }
  if (typeof data.image === 'string') {
    const disk = checkImage(p, data.image, lineOfKey('image'), 'image de couverture');
    if (disk && sharp) {
      try {
        const { width, height } = await sharp(disk).metadata();
        // LinkedIn : minimum 1200x627, ratio recommandé 1,91:1 (un 1200x630 est donc valable)
        const ratio = width / height;
        if (width < 1200 || height < 627 || Math.abs(ratio - 1.91) > 0.12) {
          W(lineOfKey('image'), `couverture de ${width}x${height} (minimum 1200x627, ratio proche de 1,91:1)`);
        }
      } catch {
        /* format non lisible */
      }
    }
  }

  // corps : les blocs de code sont ignorés pour les règles de texte
  let inCode = false;
  let tldrOpen = null;
  let tldrCount = 0;
  let tldrBullets = 0;
  lines.forEach((raw, i) => {
    const n = i + 1;
    if (/^\s*(```|~~~)/.test(raw)) {
      inCode = !inCode;
      return;
    }
    if (inCode) return;
    if (/[—–]/.test(raw)) E(n, 'tiret cadratin ou demi-cadratin à remplacer');
    if (/\[À COMPLÉTER|\bTODO\b/.test(raw)) E(n, 'marqueur à compléter (TODO ou [À COMPLÉTER) restant');
    for (const re of ANNOUNCE) {
      const a = raw.match(re);
      if (a) {
        E(n, `annonce datée d'un futur article (« ${a[0].trim()} ») : écrire « prochainement »`);
        break;
      }
    }
    if (n <= p.fmLines) return;
    for (const m of raw.matchAll(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      if (!m[1].trim()) E(n, `image sans texte alternatif : ${m[2]}`);
      checkImage(p, m[2], n, 'image du corps');
    }
    for (const m of raw.matchAll(/(?<!!)\]\((\/[^)\s#?]*)(?:[#?][^)\s]*)?\)/g)) {
      const slug = m[1].replace(/^\/|\/$/g, '');
      if (slug === '' || PAGES.has(slug.split('/')[0])) continue;
      const t = posts.get(slug);
      if (!t) E(n, `lien interne vers un article inexistant : ${m[1]}`);
      else if (t.data.draft === true) E(n, `lien interne vers un brouillon : ${m[1]}`);
      else if (!p.data.annexOf && dateOf(t) && dateOf(p) && dateOf(t) > dateOf(p)) {
        E(n, `lien interne vers un article publié plus tard (${iso(t)} après ${iso(p)}) : ${m[1]}`);
      }
    }
    if (/<div class="tldr">/.test(raw)) {
      tldrOpen = n;
      tldrCount++;
      tldrBullets = 0;
    } else if (tldrOpen && /^\s*<\/div>/.test(raw)) {
      if (tldrBullets !== 3) E(tldrOpen, `bloc TL;DR avec ${tldrBullets} puce(s) au lieu de 3`);
      tldrOpen = null;
    } else if (tldrOpen && /^\s*[-*]\s+/.test(raw)) tldrBullets++;
  });
  if (tldrOpen) E(tldrOpen, 'bloc TL;DR non fermé');
  if (tldrCount === 0 && !p.data.annexOf) E(1, 'bloc <div class="tldr"> absent');
  if (tldrCount > 1) W(1, `${tldrCount} blocs TL;DR`);
}

for (const w of warnings) console.log(`AVERTISSEMENT ${w}`);
for (const e of errors) console.log(`ERREUR ${e}`);
const checked = [...posts.values()].filter((p) => includeDrafts || !isDraftValue(p.data.draft)).length;
console.log(
  `${checked} article(s) contrôlé(s) dans ${basename(postDir)} : ${errors.length} erreur(s), ${warnings.length} avertissement(s).`
);
process.exit(errors.length ? 1 : 0);
