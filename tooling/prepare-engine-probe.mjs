import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createContext, runInContext } from 'node:vm';

// Consomme l'artefact existant : ne recompile pas les règles pour Android.
const directory = new URL('../artifacts/engine/', import.meta.url);
const bytes = await readFile(new URL('engine.js', directory));
const manifest = JSON.parse(await readFile(new URL('manifest.json', directory), 'utf8'));
if (createHash('sha256').update(bytes).digest('hex') !== manifest.sha256) throw new Error('Artefact différent du manifeste');
const harness = await readFile(new URL('../experiments/engine-portability/scenario.js', import.meta.url), 'utf8');
const fixture = await readFile(new URL('../tests/fixtures/engine-portability.json', import.meta.url), 'utf8');
const context = createContext(Object.create(null));
runInContext(bytes.toString('utf8'), context);
runInContext(harness, context);
const report = context.runKuikuizScenario(JSON.parse(fixture));
await writeFile(new URL('scenario.js', directory), harness);
await writeFile(new URL('fixture.json', directory), fixture);
await writeFile(new URL('node-reference.json', directory), report);
console.log(`Référence Node produite pour l'artefact ${manifest.sha256} ; Android non encore vérifié.`);
