import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPublishedFlags, parisDateTime, parisDay, readFrontmatterFlags } from '../src/utils/publication.mjs';

const d = (iso) => new Date(iso);
const instant = (flags, now) => isPublishedFlags(flags, now, { mode: 'instant' });

test('parisDay : heure d hiver (UTC+1) et heure d été (UTC+2)', () => {
  assert.equal(parisDay(d('2026-01-15T23:30:00Z')), '2026-01-16');
  assert.equal(parisDay(d('2026-07-15T21:59:00Z')), '2026-07-15');
  assert.equal(parisDay(d('2026-07-15T22:00:00Z')), '2026-07-16');
});

test('parisDay : changements d heure de 2026', () => {
  assert.equal(parisDay(d('2026-03-28T22:59:00Z')), '2026-03-28');
  assert.equal(parisDay(d('2026-03-28T23:00:00Z')), '2026-03-29');
  assert.equal(parisDay(d('2026-03-29T21:59:00Z')), '2026-03-29');
  assert.equal(parisDay(d('2026-03-29T22:00:00Z')), '2026-03-30');
  assert.equal(parisDay(d('2026-10-24T21:59:00Z')), '2026-10-24');
  assert.equal(parisDay(d('2026-10-24T22:00:00Z')), '2026-10-25');
  assert.equal(parisDay(d('2026-10-25T22:59:00Z')), '2026-10-25');
  assert.equal(parisDay(d('2026-10-25T23:00:00Z')), '2026-10-26');
});

test('parisDateTime : mardi 3 novembre 2026 à 8h30 Paris = 7h30 UTC (heure d hiver)', () => {
  const text = parisDateTime(d('2026-11-03T07:30:00Z'));
  assert.match(text, /mardi/);
  assert.match(text, /3 novembre/);
  assert.match(text, /08:30/);
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

test('mode jour (défaut) : l article sort le jour de publishDate, même avant l heure du post', () => {
  // post LinkedIn mardi 3 novembre à 8h30 Paris = 07:30Z ; déploiement à 4h Paris = 03:03Z
  const p = '2026-11-03T07:30:00Z';
  assert.equal(isPublishedFlags({ publishDate: p }, d('2026-11-03T03:03:00Z')), true);
  assert.equal(isPublishedFlags({ publishDate: p }, d('2026-11-02T03:03:00Z')), false);
  assert.equal(isPublishedFlags({ publishDate: p }, d('2026-11-04T03:03:00Z')), true);
});

test('mode jour : minuit Paris à la seconde près, changements d heure compris', () => {
  const p = '2026-11-12T00:00:00+01:00';
  assert.equal(isPublishedFlags({ publishDate: p }, d('2026-11-11T22:59:00Z')), false);
  assert.equal(isPublishedFlags({ publishDate: p }, d('2026-11-11T23:00:00Z')), true);
  assert.equal(isPublishedFlags({ publishDate: '2026-03-29T00:00:00+01:00' }, d('2026-03-28T22:59:00Z')), false);
  assert.equal(isPublishedFlags({ publishDate: '2026-03-29T00:00:00+01:00' }, d('2026-03-28T23:00:00Z')), true);
  assert.equal(isPublishedFlags({ publishDate: '2026-10-25T00:00:00+02:00' }, d('2026-10-24T21:59:00Z')), false);
  assert.equal(isPublishedFlags({ publishDate: '2026-10-25T00:00:00+02:00' }, d('2026-10-24T22:00:00Z')), true);
});

test('mode jour : décalages de fuseau', () => {
  // 2026-11-12T00:30:00+05:00 = 11 novembre 20h30 Paris, jour Paris : 11 novembre
  const p = '2026-11-12T00:30:00+05:00';
  assert.equal(isPublishedFlags({ publishDate: p }, d('2026-11-11T05:00:00Z')), true);
  assert.equal(isPublishedFlags({ publishDate: p }, d('2026-11-10T22:00:00Z')), false);
  assert.equal(isPublishedFlags({ publishDate: '2026-11-12T00:00:00Z' }, d('2026-11-12T00:00:00Z')), true);
});

test('brouillon jamais publié, publishDate absent publié, date illisible non publiée', () => {
  assert.equal(isPublishedFlags({ draft: true, publishDate: '2020-01-01' }, d('2027-01-01T00:00:00Z')), false);
  assert.equal(isPublishedFlags({}, d('2026-01-01T00:00:00Z')), true);
  assert.equal(isPublishedFlags({ publishDate: 'pas une date' }, d('2026-01-01T00:00:00Z')), false);
});

test('mode instant : comparaison d instants', () => {
  const p = '2026-11-12T10:00:00Z';
  assert.equal(instant({ publishDate: p }, d('2026-11-12T09:59:59Z')), false);
  assert.equal(instant({ publishDate: p }, d('2026-11-12T10:00:00Z')), true);
  assert.equal(instant({ draft: true, publishDate: p }, d('2027-01-01T00:00:00Z')), false);
  assert.equal(instant({}, d('2026-01-01T00:00:00Z')), true);
});
