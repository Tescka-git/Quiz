import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {questions} from '../apps/server-node/mock-rooms.mjs';
import {createHash} from 'node:crypto';
const target=new URL('../artifacts/mock-assets/',import.meta.url);
await mkdir(target,{recursive:true});
await writeFile(new URL('mock-quiz.json',target),JSON.stringify(questions));
await copyFile(new URL('../packages/protocol/mock-presentation.js',import.meta.url),new URL('mock-presentation.js',target));
const protocol=await readFile(new URL('../packages/protocol/mock.mjs',import.meta.url),'utf8');
await writeFile(new URL('mock-protocol.js',target),protocol.replace('export function parseClientMessage','function parseClientMessage'));
const sources={};
for(const path of ['apps/server-node/mock-rooms.mjs','packages/protocol/mock.mjs','packages/protocol/mock-presentation.js'])
  sources[path]=createHash('sha256').update(await readFile(new URL('../'+path,import.meta.url))).digest('hex');
const outputs={};
for(const name of ['mock-quiz.json','mock-protocol.js','mock-presentation.js'])
  outputs[name]=createHash('sha256').update(await readFile(new URL(name,target))).digest('hex');
await writeFile(new URL('mock-assets-manifest.json',target),JSON.stringify({sources,outputs},null,2));
console.log('Contrat, contenu fictif et projection communs préparés pour Android.');
