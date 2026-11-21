import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Lecture seule : aucune installation et aucun démarrage du serveur adb.
const windows = process.platform === 'win32';
const candidates = [...new Set([process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT,
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Android', 'Sdk')].filter(Boolean))];
function find(name, extra = []) {
  return [...extra, ...(process.env.PATH || '').split(windows ? ';' : ':')
    .map((path) => join(path.replace(/^"|"$/g, ''), windows ? `${name}.exe` : name))]
    .find((path) => existsSync(path));
}
function inspect(name, args, extra = []) {
  const path = find(name, extra);
  if (!path) return null;
  const result = spawnSync(path, args, { encoding: 'utf8', timeout: 10000, windowsHide: true });
  return { path, exitCode: result.status, output: `${result.stdout || ''}${result.stderr || ''}`.trim(), error: result.error?.message };
}
const jdk = (name) => process.env.JAVA_HOME ? [join(process.env.JAVA_HOME, 'bin', windows ? `${name}.exe` : name)] : [];
console.log(JSON.stringify({ node: process.version,
  java: inspect('java', ['-version'], jdk('java')),
  compiler: inspect('javac', ['-version'], jdk('javac')),
  adb: inspect('adb', ['version'], candidates.map((path) => join(path, 'platform-tools', windows ? 'adb.exe' : 'adb'))),
  sdkCandidates: candidates.map((path) => ({ path, exists: existsSync(path), platformsPresent: existsSync(join(path, 'platforms')) })),
  note: 'Lecture seule. Ne prouve ni appareil connecté, ni SDK complet, ni compatibilité Gradle. Aucun outil installé.',
}, null, 2));
