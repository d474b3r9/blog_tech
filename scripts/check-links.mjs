// Vérifie les liens internes d'un site construit : fichiers (href, src, srcset) et ancres (#id).
// usage : node scripts/check-links.mjs [dossier de sortie du build, par défaut dist]
// Code de sortie 1 s'il y a des liens cassés.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix, resolve } from 'node:path';

const dir = process.argv[2] ?? 'dist';
if (!dir || !existsSync(dir) || !statSync(dir).isDirectory()) {
  console.error('usage : node scripts/check-links.mjs <dossier de sortie du build>');
  process.exit(2);
}
const out = resolve(dir);
const OWN_HOSTS = new Set(['datastart.fr', 'www.datastart.fr']);

const htmlFiles = [];
const walk = (d) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) htmlFiles.push(p);
  }
};
walk(out);

// chemin de page (ex. /blog/x/) pour un fichier html
const pageUrl = (file) => {
  const rel = file.slice(out.length).replaceAll('\\', '/');
  return rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel;
};

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const ids = new Map(); // fichier -> Set d'ids
const idsOf = (file) => {
  if (!ids.has(file)) {
    const set = new Set();
    const html = readFileSync(file, 'utf8');
    for (const m of html.matchAll(/\s(?:id|name)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
      set.add(decode(m[1] ?? m[2] ?? m[3]));
    }
    ids.set(file, set);
  }
  return ids.get(file);
};

// résout un chemin de site vers un fichier de la sortie, ou null
const resolveFile = (path) => {
  const clean = posix.normalize(path);
  const candidates = clean.endsWith('/') ? [clean + 'index.html'] : [clean, clean + '/index.html', clean + '.html'];
  for (const c of candidates) {
    const f = join(out, c);
    if (f.startsWith(out) && existsSync(f) && statSync(f).isFile()) return f;
  }
  return null;
};

const broken = [];
let count = 0;

const check = (pageFile, raw) => {
  const link = decode(raw.trim());
  if (!link || /^(mailto:|tel:|javascript:|data:|blob:)/i.test(link)) return;
  let url = link;
  if (/^(https?:)?\/\//i.test(link)) {
    const u = new URL(link.startsWith('//') ? `https:${link}` : link);
    if (!OWN_HOSTS.has(u.hostname)) return;
    url = u.pathname + u.search + u.hash;
  }
  count++;
  const page = pageUrl(pageFile);
  const hashAt = url.indexOf('#');
  const hash = hashAt >= 0 ? url.slice(hashAt + 1) : null;
  let path = hashAt >= 0 ? url.slice(0, hashAt) : url;
  path = path.split('?')[0];
  let target;
  if (path === '') target = pageFile;
  else {
    const abs = path.startsWith('/') ? path : posix.join(posix.dirname(page.endsWith('/') ? page + 'x' : page), path);
    let decoded = abs;
    try {
      decoded = decodeURI(abs);
    } catch {
      /* garde la forme brute */
    }
    target = resolveFile(decoded);
    if (!target) {
      broken.push(`${page} → ${link} : fichier introuvable`);
      return;
    }
  }
  if (hash && hash !== 'top' && target.endsWith('.html')) {
    let h = hash;
    try {
      h = decodeURIComponent(hash);
    } catch {
      /* garde la forme brute */
    }
    if (!idsOf(target).has(h)) broken.push(`${page} → ${link} : ancre #${h} absente de ${pageUrl(target)}`);
  }
};

for (const file of htmlFiles) {
  let html = readFileSync(file, 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '');
  // la page 404 est servie en 404.html : son canonical (/404/) n'est pas un lien cassé
  if (pageUrl(file) === '/404.html') html = html.replace(/<link\b[^>]*rel="canonical"[^>]*>/gi, '');
  for (const m of html.matchAll(/\s(href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    // les <link rel="canonical"> et autres liens absolus vers le domaine propre sont traités comme internes
    check(file, m[2] ?? m[3]);
  }
  for (const m of html.matchAll(/\ssrcset\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    for (const part of decode(m[1] ?? m[2]).split(/,\s+|,(?=\/)/)) {
      const u = part.trim().split(/\s+/)[0];
      if (u) check(file, u);
    }
  }
}

const unique = [...new Set(broken)];
for (const b of unique) console.log(b);
console.log(`${htmlFiles.length} page(s), ${count} lien(s) interne(s) vérifié(s) : ${unique.length} cassé(s).`);
process.exit(unique.length ? 1 : 0);
