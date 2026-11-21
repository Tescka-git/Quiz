// Protocole v1 de la maquette. Aucun import du moteur ou de Node.js.
const text = (value, max = 128) => typeof value === 'string' && value.length > 0 && value.length <= max;
export function parseClientMessage(raw) {
  let message;try{message=JSON.parse(raw);}catch{throw new Error('invalid-message');}
  if (!message || Array.isArray(message) || message.v !== 1) throw new Error('invalid-message');
  const { type } = message;
  if (type === 'join' && text(message.code, 12) && text(message.name, 24) && message.name.trim().length)
    return {v:1,type,code:message.code.toUpperCase(),name:message.name.trim()};
  if ((type === 'host' || type === 'player') && text(message.roomId) && text(message.token))
    return {v:1,type,roomId:message.roomId,token:message.token};
  if (['start','pause','resume','reveal','sync'].includes(type)) return {v:1,type};
  if (type === 'answer' && text(message.submissionId,64) && text(message.option,32))
    return {v:1,type,submissionId:message.submissionId,option:message.option};
  throw new Error('invalid-message');
}
