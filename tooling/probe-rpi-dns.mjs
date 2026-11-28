import {Resolver} from 'node:dns/promises';
import http from 'node:http';
import assert from 'node:assert/strict';
const resolver=new Resolver({timeout:3000,tries:3});
resolver.setServers(['192.168.1.34:53535']);
const addresses=await resolver.resolve4('quizcotte.test');
assert.deepEqual(addresses,['192.168.1.34']);
await assert.rejects(resolver.resolve6('quizcotte.test'),error=>error.code==='ENODATA');
await assert.rejects(resolver.resolve4('inconnu.test'),error=>error.code==='ENOTFOUND');
const body=await new Promise((resolve,reject)=>{
  const req=http.get({hostname:'quizcotte.test',port:4180,path:'/connection.json',timeout:4000,
    lookup:(host,options,callback)=>callback(null,options.all?addresses.map(address=>({address,family:4})):addresses[0],4)},response=>{
      if(response.statusCode!==200){response.resume();reject(Error(`HTTP ${response.statusCode}`));return;}
      let value='';response.setEncoding('utf8');response.on('data',chunk=>value+=chunk);response.on('end',()=>resolve(value));
    });
  req.on('error',reject);req.on('timeout',()=>req.destroy(Error('HTTP timeout')));
});
assert.equal(JSON.parse(body).socketPath,'/socket');
console.log(JSON.stringify({result:'PASS',addresses,checks:['A exact','AAAA sans donnée','Nom inconnu NXDOMAIN','HTTP via résolution explicite'],limits:['DNS explicitement choisi par cette sonde, aucun DNS système changé','Pas de résolution navigateur ni TLS validés']}));
