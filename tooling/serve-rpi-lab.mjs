// P26 : environnement utilisateur expérimental, aucun changement DNS système.
import {createSocket} from 'node:dgram';
import {isIP} from 'node:net';
import {mkdir} from 'node:fs/promises';
import {createMockServer} from '../apps/server-node/mock-server.mjs';
const address=process.env.KUIKUIZ_LAB_ADDRESS;
if(!isIP(address)||! /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(address))throw Error('Adresse IPv4 privée explicite requise');
const name='quizcotte.test';
await mkdir(new URL('../.tools/rpi-lab/',import.meta.url),{recursive:true});
const game=await createMockServer({filename:new URL('../.tools/rpi-lab/quiz.sqlite',import.meta.url).pathname});
const dns=createSocket('udp4');
dns.on('message',(query,peer)=>{
  // Une seule question IN/A sans compression ; les autres demandes ne sont pas résolues.
  if(query.length<17||query.length>512||query.readUInt16BE(4)!==1||(query.readUInt16BE(2)&0xf800)!==0x0000)return;
  let offset=12,labels=[];
  while(offset<query.length){const length=query[offset++];if(length===0)break;if(length>63||offset+length>query.length)return;labels.push(query.subarray(offset,offset+length).toString('ascii'));offset+=length;}
  if(offset+4>query.length)return;
  const type=query.readUInt16BE(offset),klass=query.readUInt16BE(offset+2),question=query.subarray(12,offset+4);
  const matches=labels.join('.').toLowerCase()===name,typeA=type===1&&klass===1;
  const header=Buffer.alloc(12);query.copy(header,0,0,2);header.writeUInt16BE(matches?0x8400:0x8403,2);header.writeUInt16BE(1,4);
  let answer=Buffer.alloc(0);
  if(matches&&typeA){header.writeUInt16BE(1,6);answer=Buffer.alloc(16);answer.writeUInt16BE(0xc00c,0);answer.writeUInt16BE(1,2);answer.writeUInt16BE(1,4);answer.writeUInt32BE(30,6);answer.writeUInt16BE(4,10);Buffer.from(address.split('.').map(Number)).copy(answer,12);}
  dns.send(Buffer.concat([header,question,answer]),peer.port,peer.address);
});
dns.on('error',error=>{console.error(error.message);stop(1);});
game.server.on('error',error=>{console.error(error.message);stop(1);});
let stopping=false;
async function stop(code=0){if(stopping)return;stopping=true;try{dns.close();}catch{}await game.stop();process.exitCode=code;}
dns.bind(53535,address,()=>console.log(`DNS de sonde seulement : ${name} -> ${address}, UDP 53535 (aucun redirecteur)`));
game.server.listen(4180,address,()=>console.log(`Jeu de laboratoire : http://${address}:4180 ; HTTP/ws non chiffré, pas de PWA sécurisée`));
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>stop());
