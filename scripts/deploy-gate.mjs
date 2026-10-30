// Décide si le workflow de déploiement doit construire le site.
// Usage : node scripts/deploy-gate.mjs <événement GitHub>
// Écrit « run=true » ou « run=false » dans $GITHUB_OUTPUT (et sur la sortie standard).
import { appendFileSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFrontmatterFlags, shouldDeploy } from '../src/utils/publication.mjs';

const postsDir = join(fileURLToPath(new URL('..', import.meta.url)), 'src', 'data', 'post');
const event = process.argv[2] ?? process.env.GITHUB_EVENT_NAME ?? 'workflow_dispatch';

const flags = readdirSync(postsDir)
  .filter((name) => name.endsWith('.md') || name.endsWith('.mdx'))
  .map((name) => readFrontmatterFlags(readFileSync(join(postsDir, name), 'utf8')));

const run = shouldDeploy(event, flags, new Date());
console.log(`événement : ${event} ; ${flags.length} article(s) lu(s) ; déploiement : ${run ? 'oui' : 'non'}`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `run=${run}\n`);
