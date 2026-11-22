import {connect} from 'node:net';
import {mkdir,writeFile} from 'node:fs/promises';

// Ce contrôle accompagne le relevé des interfaces et la coupure des accès amont du Pixel.
// Deux destinations injoignables ne prouvent pas, seules, l'absence de tout accès Internet.
const results=await Promise.all(['1.1.1.1','8.8.8.8'].map(host=>new Promise(resolve=>{
  const socket=connect({host,port:443});socket.setTimeout(3000);
  socket.on('connect',()=>{socket.destroy();resolve({host,reachable:true});});
  socket.on('timeout',()=>{socket.destroy();resolve({host,reachable:false,reason:'timeout'});});
  socket.on('error',error=>resolve({host,reachable:false,reason:error.code}));
})));
const report={date:new Date().toISOString(),scope:'Two public TCP endpoints from PC; combine with interface and Android upstream checks',
  isolated:results.every(result=>!result.reachable),results};
await mkdir('artifacts/mock-preview',{recursive:true});
await writeFile('artifacts/mock-preview/pc-network-check.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
if(!report.isolated)process.exitCode=1;
