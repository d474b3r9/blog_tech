import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasRecentlyPublished,
  isPublishedFlags,
  parisDateTime,
  parisDay,
  readFrontmatterFlags,
  shouldDeploy,
} from '../src/utils/publication.mjs';

const d = (iso) => new Date(iso);
const day = (flags, now) => isPublishedFlags(flags, now, { mode: 'day' });

test('parisDay : heure d hiver (UTC+1) et heure d été (UTC+2)', () => {
  assert.equal(parisDay(d('2026-01-15T23:30:00Z')), '2026-01-16');
  assert.equal(parisDay(d('2026-07-15T21:59:00Z')), '2026-07-15');
  assert.equal(parisDay(d('2026-07-15T22:00:00Z')), '2026-07-16');
});

test('parisDay : changement d heure du 25 octobre 2026', () => {
  assert.equal(parisDay(d('2026-10-24T21:59:00Z')), '2026-10-24');
  assert.equal(parisDay(d('2026-10-24T22:00:00Z')), '2026-10-25');
  // après le retour à l heure d hiver, minuit Paris = 23h UTC
  assert.equal(parisDay(d('2026-10-25T22:59:00Z')), '2026-10-25');
  assert.equal(parisDay(d('2026-10-25T23:00:00Z')), '2026-10-26');
});

test('parisDateTime : mardi 3 novembre 2026 à 7h30 Paris = 6h30 UTC (heure d hiver)', () => {
  const text = parisDateTime(d('2026-11-03T06:30:00Z'));
  assert.match(text, /mardi/);
  assert.match(text, /3 novembre/);
  assert.match(text, /07:30/);
});

test('readFrontmatterFlags : cas de base, CRLF, guillemets', () => {
  assert.deepEqual(readFrontmatterFlags('---\ntitle: A\ndraft: true\npublishDate: 2026-11-12\n---\ncorps'), {
    draft: true,
    publishDate: '2026-11-12',
  });
  assert.deepEqual(readFrontmatterFlags('---\r\ndraft: true\r\npublishDate: 2026-11-12T10:00:00Z\r\n---\r\ncorps'), {
    draft: true,
    publishDate: '2026-11-12T10:00:00Z',
  });
  assert.equal(readFrontmatterFlags("---\npublishDate: '2026-11-12'\n---").publishDate, '2026-11-12');
  assert.equal(readFrontmatterFlags('---\ndraft: "true"\n---').draft, true);
});

test('readFrontmatterFlags : clés absentes, pas de frontmatter, corps ignoré', () => {
  assert.deepEqual(readFrontmatterFlags('---\ntitle: A\n---\n'), { draft: false, publishDate: undefined });
  assert.deepEqual(readFrontmatterFlags('Pas de frontmatter\ndraft: true'), { draft: false, publishDate: undefined });
  assert.deepEqual(
    readFrontmatterFlags('---\ndraft: false # pas encore\npublishDate: 2026-11-12 # prévu\n---\ndraft: true'),
    { draft: false, publishDate: '2026-11-12' }
  );
});

test('instant (défaut) : publié à la seconde près', () => {
  const p = '2026-11-03T06:30:00Z';
  assert.equal(isPublishedFlags({ publishDate: p }, d('2026-11-03T06:29:59Z')), false);
  assert.equal(isPublishedFlags({ publishDate: p }, d('2026-11-03T06:30:00Z')), true);
  assert.equal(isPublishedFlags({ publishDate: p }, d('2026-11-03T06:30:01Z')), true);
});

test('instant : brouillon jamais publié, publishDate absent publié, date illisible non publiée', () => {
  assert.equal(isPublishedFlags({ draft: true, publishDate: '2020-01-01' }, d('2027-01-01T00:00:00Z')), false);
  assert.equal(isPublishedFlags({}, d('2026-01-01T00:00:00Z')), true);
  assert.equal(isPublishedFlags({ publishDate: 'pas une date' }, d('2026-01-01T00:00:00Z')), false);
});

test('instant : décalages de fuseau', () => {
  // 7h30 à Paris le 3 novembre (UTC+1) = 6h30 UTC
  const p = '2026-11-03T07:30:00+01:00';
  assert.equal(isPublishedFlags({ publishDate: p }, d('2026-11-03T06:29:00Z')), false);
  assert.equal(isPublishedFlags({ publishDate: p }, d('2026-11-03T06:30:00Z')), true);
});

test('mode day : conservé pour le jour entier à Paris', () => {
  const now = d('2026-11-12T03:00:00Z');
  assert.equal(day({ publishDate: '2026-11-13' }, now), false);
  assert.equal(day({ publishDate: '2026-11-12T20:00:00Z' }, d('2026-11-12T04:00:00Z')), true);
  assert.equal(day({ publishDate: '2026-11-12T00:00:00+01:00' }, d('2026-11-11T22:59:00Z')), false);
  assert.equal(day({ publishDate: '2026-11-12T00:00:00+01:00' }, d('2026-11-11T23:00:00Z')), true);
});

test('hasRecentlyPublished : fenêtre de 6 heures', () => {
  const posts = [{ publishDate: '2026-11-03T06:30:00Z' }];
  assert.equal(hasRecentlyPublished(posts, d('2026-11-03T06:29:00Z')), false); // pas encore
  assert.equal(hasRecentlyPublished(posts, d('2026-11-03T06:31:00Z')), true);
  assert.equal(hasRecentlyPublished(posts, d('2026-11-03T12:29:00Z')), true);
  assert.equal(hasRecentlyPublished(posts, d('2026-11-03T12:31:00Z')), false); // trop ancien
});

test('hasRecentlyPublished : brouillon, date absente ou illisible ignorés', () => {
  const now = d('2026-11-03T07:00:00Z');
  assert.equal(hasRecentlyPublished([{ draft: true, publishDate: '2026-11-03T06:30:00Z' }], now), false);
  assert.equal(hasRecentlyPublished([{}], now), false);
  assert.equal(hasRecentlyPublished([{ publishDate: 'abc' }], now), false);
  assert.equal(hasRecentlyPublished([], now), false);
});

test('shouldDeploy : push et déclenchement manuel déploient toujours', () => {
  const now = d('2026-11-03T07:00:00Z');
  assert.equal(shouldDeploy('push', [], now), true);
  assert.equal(shouldDeploy('workflow_dispatch', [], now), true);
});

test('shouldDeploy : une exécution planifiée ne déploie que si un article vient de sortir', () => {
  const posts = [{ publishDate: '2026-11-03T06:30:00Z' }, { publishDate: '2026-10-28T00:00:00Z' }];
  assert.equal(shouldDeploy('schedule', posts, d('2026-11-03T06:45:00Z')), true);
  assert.equal(shouldDeploy('schedule', posts, d('2026-11-03T06:15:00Z')), false);
  assert.equal(shouldDeploy('schedule', posts, d('2026-11-04T06:45:00Z')), false);
});
