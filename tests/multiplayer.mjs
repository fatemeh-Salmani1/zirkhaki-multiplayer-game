import assert from 'node:assert/strict';
const origin='http://127.0.0.1:4173';
async function post(body,token){const r=await fetch(origin+'/api/game',{method:'POST',headers:{'Content-Type':'application/json',...(token?{'x-player-token':token}:{})},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
async function read(code,token){const r=await fetch(origin+'/api/game?code='+code,{headers:{'x-player-token':token}});assert.equal(r.status,200);return r.json();}
for(const advanced of [false,true]){
 const host=await post({action:'create',name:'Alex',avatar:2,advanced});assert.equal(host.status,201,JSON.stringify(host.data));const code=host.data.game.code;
 const join=await post({action:'join',code,name:'Jamie',avatar:3});assert.equal(join.status,200,JSON.stringify(join.data));const players=[{id:host.data.game.me,token:host.data.token},{id:join.data.game.me,token:join.data.token}];
 let g=await read(code,players[0].token);assert.equal(g.players.length,2);assert.deepEqual(g.players.map(p=>p.avatar),[2,3]);
 const started=await post({action:'start',code,version:g.version},players[0].token);assert.equal(started.status,200);g=started.data.game;
 if(advanced){for(const p of players){const mine=await read(code,p.token);const options=mine.players.find(x=>x.id===p.id).ringOptions;assert.equal(options.length,2);assert.equal(mine.players.find(x=>x.id!==p.id).ringOptions,undefined);const picked=await post({action:'ring',code,version:mine.version,payload:{ring:options[0]}},p.token);assert.equal(picked.status,200);}}
 let moves=0,peeks=0;
 g=await read(code,players[0].token);
 // Replay a stale version and an unauthorized move before completing the game.
 const outOfTurn=await post({action:'draw',code,version:g.version},players[1].token);assert.equal(outOfTurn.status,400);assert.match(outOfTurn.data.error,/another/);
 const stale=await post({action:'draw',code,version:g.version-1},players[0].token);assert.equal(stale.status,409);
 while(g.phase==='playing'){
 if(++moves>2000)throw Error('Game stalled');const who=players.find(p=>p.id===g.players[g.turn].id);g=await read(code,who.token);const observer=players.find(p=>p.id!==who.id);
 const other=await read(code,observer.token);assert.equal(other.version,g.version);assert.deepEqual(other.treasure,g.treasure);assert.deepEqual(other.activity,g.activity);assert.deepEqual(other.players.map(p=>p.score),g.players.map(p=>p.score));
 if(g.pending?.kind==='peek'){peeks++;assert.equal(other.pending.peek,undefined);assert.equal(g.pending.peek.length>0,true);}
 let action,payload={};if(g.pending&&g.pending.kind!=='peek'){action='choice';payload={cardId:g.pending.options[0].id};}else if(g.treasure.length>=2&&!g.forced&&!g.replays){action='collect';}else action='draw';
 const r=await post({action,code,version:g.version,payload},who.token);assert.equal(r.status,200,JSON.stringify(r.data));g=r.data.game;
 }
 const final=await read(code,players[1].token);assert.equal(final.phase,'finished');assert.equal(final.winners.length>0,true);assert.equal(final.deckCount,0);const all=final.players.flatMap(p=>p.bank);assert.equal(all.length+final.discardCount,60);const invalid=await post({action:'rematch',code,version:final.version},players[1].token);assert.equal(invalid.status,400);const rematch=await post({action:'rematch',code,version:final.version},players[0].token);assert.equal(rematch.status,200);assert.equal(rematch.data.game.players.every(p=>p.bank.length===0),true);
 console.log(JSON.stringify({mode:advanced?'advanced':'classic',moves,privatePeeks:peeks,result:'passed',scores:final.players.map(p=>({name:p.name,score:p.score}))}));
}
// Concurrent duplicate host actions must commit once, preventing lost updates.
const host=await post({action:'create',name:'Race host'});const code=host.data.game.code;await post({action:'join',code,name:'Race guest'});let g=await read(code,host.data.token);g=(await post({action:'start',code,version:g.version},host.data.token)).data.game;
const race=await Promise.all([post({action:'draw',code,version:g.version},host.data.token),post({action:'draw',code,version:g.version},host.data.token)]);assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);console.log('Concurrent move protection passed.');
// Explicit quit/return messages reach the other player without broadcasting tutorials.
const departing=await post({action:'create',name:'Diane'});const room=departing.data.game.code;const staying=await post({action:'join',code:room,name:'FiFi'});let present=await read(room,departing.data.token);const left=await post({action:'leave',code:room,version:present.version},departing.data.token);assert.equal(left.status,200);assert.equal(left.data.game.events.some(e=>e.kind==='leave'),false);let spectator=await read(room,staying.data.token);assert.equal(spectator.events.at(-1).kind,'leave');assert.equal(spectator.players.find(p=>p.name==='Diane').away,true);present=await read(room,departing.data.token);const back=await post({action:'return',code:room,version:present.version},departing.data.token);assert.equal(back.status,200);spectator=await read(room,staying.data.token);assert.equal(spectator.events.at(-1).kind,'return');assert.equal(spectator.players.find(p=>p.name==='Diane').away,false);console.log('Quit and return announcements passed.');
