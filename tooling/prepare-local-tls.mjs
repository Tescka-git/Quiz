import { mkdir, readdir, writeFile, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, X509Certificate } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const pcIp = process.argv[2];
const androidIp = process.argv[3];
if (!isIP(pcIp || '') || !isIP(androidIp || '')) throw new Error('Usage : npm run prepare:tls -- IP_PC IP_ANDROID');
const directory = join(root, '.tools', 'tls');
try { await access(directory); throw new Error('Le dossier TLS existe déjà : refus de remplacer les clés.'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const jdks = await readdir(join(root, '.tools', 'jdk17'));
const keytool = join(root, '.tools', 'jdk17', jdks.find((name) => name.startsWith('jdk-')), 'bin', process.platform === 'win32' ? 'keytool.exe' : 'keytool');
await access(keytool);
await mkdir(directory, { mode: 0o700 });
const password = randomBytes(32).toString('hex');
await writeFile(join(directory, 'password.txt'), password + '\n', { mode: 0o600, flag: 'wx' });
const env = { ...process.env, KUIKUIZ_TLS_PASSWORD: password };
function run(args) {
  const result = spawnSync(keytool, [...args, '-storepass:env', 'KUIKUIZ_TLS_PASSWORD'], { cwd: directory, env, encoding: 'utf8', windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(`Échec keytool : ${result.error?.message || result.stderr}`);
}
run(['-genkeypair', '-alias', 'ca', '-keystore', 'ca.p12', '-storetype', 'PKCS12', '-keyalg', 'RSA', '-keysize', '3072',
  '-dname', 'CN=Kuikuiz Local Test CA', '-validity', '90', '-ext', 'bc:critical=ca:true,pathlen:0', '-ext', 'ku:critical=keyCertSign,cRLSign']);
run(['-exportcert', '-alias', 'ca', '-keystore', 'ca.p12', '-rfc', '-file', 'ca.pem']);
run(['-exportcert', '-alias', 'ca', '-keystore', 'ca.p12', '-file', 'ca.cer']);
for (const [name, ip] of [['pc', pcIp], ['android', androidIp]]) {
  run(['-genkeypair', '-alias', 'server', '-keystore', `${name}.p12`, '-storetype', 'PKCS12', '-keyalg', 'RSA', '-keysize', '2048',
    '-dname', `CN=Kuikuiz ${name} Test`, '-validity', '30']);
  run(['-certreq', '-alias', 'server', '-keystore', `${name}.p12`, '-file', `${name}.csr`]);
  run(['-gencert', '-alias', 'ca', '-keystore', 'ca.p12', '-infile', `${name}.csr`, '-outfile', `${name}.pem`, '-rfc',
    '-validity', '30', '-ext', 'bc:critical=ca:false', '-ext', 'ku:critical=digitalSignature,keyEncipherment',
    '-ext', 'eku=serverAuth', '-ext', `san=ip:${ip}${name === 'pc' ? ',ip:127.0.0.1,dns:localhost' : ''}`]);
  run(['-importcert', '-noprompt', '-alias', 'ca', '-keystore', `${name}.p12`, '-file', 'ca.pem']);
  run(['-importcert', '-alias', 'server', '-keystore', `${name}.p12`, '-file', `${name}.pem`]);
}
const ca = new X509Certificate(await readFile(join(directory, 'ca.pem')));
await writeFile(join(directory, 'info.json'), JSON.stringify({ pcIp, androidIp, caFingerprint256: ca.fingerprint256,
  caExpires: ca.validTo, purpose: 'Test local uniquement ; aucune confiance système installée.' }, null, 2));
console.log(`Certificats préparés dans ${resolve(directory)}. Aucun magasin de confiance modifié.`);
console.log(`Empreinte SHA-256 de l'autorité : ${ca.fingerprint256}`);
