// Contrôle le HTML livré à Google. Usage : npm run check:seo (après le build).
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import slugify from 'limax';
import { isPublishedFlags, readFrontmatterData, readFrontmatterFlags } from '../src/utils/publication.mjs';

const SITE = 'https://datastart.fr';
const read = (file) => readFileSync(file, 'utf8');
const decode = (s) => s.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&apos;', "'");
const tags = (html, name) =>
  [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(([tag]) =>
    Object.fromEntries(
      [...tag.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map((m) => [
        m[1].toLowerCase(),
        decode(m[2] ?? m[3] ?? m[4]),
      ])
    )
  );
const locations = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1]));
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.html') ? [join(dir, e.name)] : []
  );

export function checkSeo(dir, expectedPaths = []) {
  const out = resolve(dir);
  const local = (url) => {
    const u = new URL(url);
    assert.equal(u.origin, SITE, `Domaine inattendu : ${url}`);
    assert.ok(!u.search && !u.hash, `Paramètres ou ancre : ${url}`);
    return join(out, decodeURIComponent(u.pathname));
  };
  const sitemapFiles = locations(read(join(out, 'sitemap-index.xml')));
  assert.ok(sitemapFiles.length, 'Index de sitemap vide');
  const urls = sitemapFiles.flatMap((url) => locations(read(local(url))));
  assert.ok(urls.length, 'Sitemap vide');
  const sitemap = new Set(urls);
  assert.equal(sitemap.size, urls.length, 'URL dupliquée dans le sitemap');
  const pages = new Map(
    walk(out).map((file) => {
      const path =
        '/' +
        relative(out, file)
          .replaceAll('\\', '/')
          .replace(/index\.html$/, '');
      return [SITE + path, read(file)];
    })
  );
  for (const url of urls) {
    local(url);
    assert.ok(url.endsWith('/'), `Slash final absent : ${url}`);
    assert.ok(pages.has(url), `Page du sitemap absente ou redirigée : ${url}`);
  }
  for (const [url, html] of pages) {
    if (url === `${SITE}/404.html`) continue;
    const path = new URL(url).pathname;
    const excluded = path.startsWith('/tag/');
    const meta = tags(html, 'meta');
    const directives = meta
      .filter((m) => ['robots', 'googlebot'].includes(m.name?.toLowerCase()))
      .flatMap((m) => (m.content ?? '').toLowerCase().split(/[\s,]+/));
    const noindex = directives.includes('noindex') || directives.includes('none');
    assert.equal(noindex, excluded, `Directive d'indexation incorrecte : ${url}`);
    assert.equal(sitemap.has(url), !excluded, `Présence dans le sitemap incorrecte : ${url}`);
    assert.ok(!meta.some((m) => m['http-equiv']?.toLowerCase() === 'refresh'), `Redirection HTML : ${url}`);
    const canonical = tags(html, 'link').filter((l) => l.rel?.toLowerCase() === 'canonical');
    assert.equal(canonical.length, 1, `Une seule canonical requise : ${url}`);
    assert.equal(canonical[0].href, url, `Canonical incorrecte : ${url}`);
    if (!excluded) {
      assert.ok(!directives.includes('nofollow'), `Liens non suivis : ${url}`);
      assert.match(html, /<title\b[^>]*>\s*[^<\s][\s\S]*?<\/title>/i, `Titre absent : ${url}`);
      assert.ok(
        meta.some((m) => m.name === 'description' && m.content?.trim()),
        `Description absente : ${url}`
      );
    }
  }
  for (const path of expectedPaths) {
    assert.ok(pages.has(SITE + path), `Article publié absent du build : ${path}`);
    assert.ok(sitemap.has(SITE + path), `Article publié absent du sitemap : ${path}`);
  }
  const robots = read(join(out, 'robots.txt'));
  assert.match(robots, /^Sitemap:\s*https:\/\/datastart\.fr\/sitemap-index\.xml\s*$/m);
  assert.ok(!/^Disallow:\s*\S+/im.test(robots), 'Blocage robots.txt : vérifier les pages concernées');
  return urls.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const postDir = 'src/data/post';
    const now = new Date();
    const expected = readdirSync(postDir)
      .filter((f) => /\.mdx?$/.test(f))
      .flatMap((file) => {
        const text = read(join(postDir, file));
        if (!isPublishedFlags(readFrontmatterFlags(text), now)) return [];
        const data = readFrontmatterData(text);
        const slug = String(data?.slug ?? file.replace(/\.mdx?$/, ''))
          .split('/')
          .map((s) => slugify(s))
          .join('/');
        return [`/${slug}/`];
      });
    console.log(`SEO : ${checkSeo(process.argv[2] ?? 'dist', expected)} pages indexables vérifiées.`);
  } catch (error) {
    console.error(`SEO : ${error.message}`);
    process.exitCode = 1;
  }
}
