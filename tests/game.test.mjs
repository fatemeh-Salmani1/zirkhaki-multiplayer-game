import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,newPlayer,start,apply,score,view,SUITS} from '../lib/game.ts';
const card=(suit,value=5)=>({id:crypto.randomUUID(),suit,value});
function game(n=2,advanced=false){const a=newPlayer('Alex'),g=createGame('ABC234',a,advanced);for(let i=1;i<n;i++)g.players.push(newPlayer('Player '+i));start(g);return g;}
function rig(){const g=game();g.deck=[card('coins',9),card('map'),card('key')];g.discard=[];return g;}
function go(g,a,p){apply(g,g.players[g.turn].id,a,p);}
test('decks and setup follow the one-deck and two-deck rules',()=>{for(const n of [2,4,5,8]){const g=game(n);assert.equal(g.deck.length,n>4?100:50);assert.equal(g.discard.length,n>4?20:10);assert.equal(g.discard.filter(c=>c.suit==='coins').every(c=>c.value===4),true);}});
test('duplicate bust preserves old collections and carpet protects only prior cards',()=>{const g=rig();const old=card('map',7);g.players[0].bank=[old];g.deck=[card('coins',8),card('carpet'),card('key'),card('key'),card('map')];go(g,'draw');go(g,'draw');go(g,'draw');go(g,'draw');assert.equal(g.turn,1);assert.deepEqual(g.players[0].bank.map(c=>c.suit),['map','coins']);assert.deepEqual(g.discard.map(c=>c.suit),['carpet','key','key']);});
test('key and chest collect bonus cards without playing bonus abilities',()=>{const g=rig();g.treasure=[card('key'),card('chest')];g.discard=[card('snake'),card('pistol'),card('dagger')];go(g,'collect');assert.equal(g.players[0].bank.length,4);assert.equal(g.turn,1);assert.equal(g.forced,0);});
test('greedy doubles bonuses; coins ring gives 5 points; highest only scores',()=>{const g=rig();g.players[0].ring='greedy';g.treasure=[card('key'),card('chest')];g.discard=[card('snake'),card('pistol'),card('dagger'),card('coins',9)];go(g,'collect');assert.equal(g.players[0].bank.length,6);assert.equal(score({bank:[card('coins',4),card('coins',9),card('key',7)],ring:'goldsmith'}),21);});
test('private peeks and tokens never leak to opponents',()=>{const g=rig();g.deck.unshift(card('astrolabe'));go(g,'draw');const own=view(g,g.players[0].id),other=view(g,g.players[1].id);assert.equal(own.pending.peek.length,1);assert.equal(other.pending.peek,undefined);assert.equal(JSON.stringify(other).includes('token'),false);assert.equal('deck' in other,false);assert.equal('discard' in other,false);});
test('pistol discards a single exposed card; extortionist receives it',()=>{const g=rig();const target=card('coins',9);g.players[1].bank=[card('coins',4),target];g.players[1].ring='extortionist';g.deck.unshift(card('pistol'));go(g,'draw');assert.equal(g.pending.options.length,1);go(g,'choice',{cardId:target.id});assert.equal(g.players[1].bank.length,2);assert.equal(g.discard.length,0);});
test('dagger respects collection restriction; stolen duplicate busts',()=>{const g=rig();const target=card('coins',9);g.players[1].bank=[target];g.treasure=[card('coins',5)];g.deck.unshift(card('dagger'));go(g,'draw');go(g,'choice',{cardId:target.id});assert.equal(g.turn,1);assert.equal(g.players[1].bank.length,0);assert.equal(g.discard.length,3);});
test('forced snake card abilities count toward the two reveals',()=>{const g=rig();g.deck=[card('snake'),card('horseshoe'),card('key')];g.players[0].bank=[card('coins',9)];go(g,'draw');assert.equal(g.pending.kind,'horseshoe');assert.equal(g.forced,1);go(g,'choice',{cardId:g.pending.options[0].id});assert.equal(g.forced,0);assert.equal(g.treasure.length,3);assert.equal(g.deck.length,1);});
test('last astrolabe or snake resolves without deadlock',()=>{for(const s of ['astrolabe','snake']){const g=rig();g.deck=[card(s)];go(g,'draw');assert.equal(g.phase,'finished');assert.equal(g.players[0].bank.length,1);}});
test('snakecharmer immediately banks snake and can keep drawing',()=>{const g=rig();g.players[0].ring='snakecharmer';g.deck.unshift(card('snake'));go(g,'draw');assert.equal(g.players[0].bank.length,1);assert.equal(g.treasure.length,0);assert.equal(g.forced,0);});
test('fortune peek is ordered; map exposes only its 3 cards; cartographer sees all',()=>{const g=rig();g.players[0].ring='fortune';g.deck.unshift(card('astrolabe'));go(g,'draw');assert.deepEqual(g.pending.peek.map(c=>c.id),g.deck.slice(0,3).map(c=>c.id));const m=rig();m.discard=SUITS.map(s=>card(s));m.deck.unshift(card('map'));go(m,'draw');assert.equal(m.pending.options.length,3);const c=rig();c.players[0].ring='cartographer';c.discard=SUITS.map(s=>card(s));c.deck.unshift(card('map'));go(c,'draw');assert.equal(c.pending.options.length,10);});
test('out-of-turn actions and invalid choices are rejected',()=>{const g=rig();assert.throws(()=>apply(g,g.players[1].id,'draw'),/another/);assert.throws(()=>go(g,'choice',{cardId:'no'}),/no card choice/);assert.throws(()=>go(g,'collect'),/at least one/);});
test('100 complete matches across player counts and modes conserve every card',()=>{
 for(let run=0;run<100;run++){
 const n=2+run%7,g=game(n,run%2===0);if(g.phase==='rings')for(const p of g.players)apply(g,p.id,'ring',{ring:p.ringOptions[0]});
 let moves=0;while(g.phase==='playing'){
 if(++moves>6000)throw Error('Game did not finish');
 const id=g.players[g.turn].id;if(g.pending&&g.pending.kind!=='peek')go(g,'choice',{cardId:g.pending.options[Math.floor(Math.random()*g.pending.options.length)].id});
 else if(g.treasure.length&&g.forced===0&&g.replays===0&&(g.treasure.length>=3||Math.random()<.3))go(g,'collect');else go(g,'draw');
 const all=[...g.deck,...g.discard,...g.treasure,...g.players.flatMap(p=>p.bank)];assert.equal(all.length,n>4?120:60);assert.equal(new Set(all.map(c=>c.id)).size,all.length);assert.equal(view(g,id).players.every(p=>p.score>=0),true);
 }
 assert.equal(g.phase,'finished');assert.equal(g.deck.length,0);assert.equal(view(g,g.host).winners.length>0,true);
 }
});
test('automatic snake chains retain the snake notice and matching bust cards',()=>{const g=rig();const first=card('chest',4),second=card('chest',6);g.deck=[card('snake'),first,second,card('coins',9)];go(g,'draw');assert.equal(g.turn,1);assert.deepEqual(g.events.map(e=>e.kind),['ability','bust']);const bust=g.events.at(-1);assert.match(bust.title,/another Chest/);assert.deepEqual(bust.cards.map(c=>c.id),[first.id,second.id]);assert.equal(view(g,g.players[1].id).events.length,0);assert.equal(view(g,g.players[0].id).events.length,2);});
test('combo and collection notices report actual score gain and bonus cards',()=>{const g=rig();g.deck=[card('key',5),card('chest',6),card('coins',9)];g.discard=[card('coins',4),card('snake',2)];go(g,'draw');go(g,'draw');assert.equal(g.events.at(-1).kind,'combo');go(g,'collect');const e=g.events.at(-1);assert.equal(e.kind,'collect');assert.equal(e.scoreChange,17);assert.equal(e.cards.length,2);assert.match(e.text,/2 bonus cards/);});

test('guidance stops after each player has completed one turn, and returns on rematch',()=>{
 for(const n of [2,8]){
  const g=game(n);g.discard=[];g.deck=Array.from({length:n+2},()=>card('coins',9));
  for(let turn=0;turn<n;turn++){go(g,'draw');go(g,'collect');assert.equal(g.events.length,turn+1);}
  const firstRound=g.events.map(e=>e.id);go(g,'draw');go(g,'collect');assert.deepEqual(g.events.map(e=>e.id),firstRound);assert.equal(g.players[0].bank.length,2);
  g.deck=[card('snake'),card('key'),card('key'),card('coins')];go(g,'draw');assert.deepEqual(g.events.map(e=>e.id),firstRound);assert.equal(g.treasure.length,0);
  start(g);assert.equal(g.events.length,0);g.deck=[card('carpet'),card('coins')];go(g,'draw');assert.equal(g.events[0].kind,'ability');
 }
});

test('public activity identifies card choices after the first round without exposing private peeks',()=>{
 const g=rig();g.turnNumber=g.players.length+1;g.players[0].name='Diane';g.discard=[card('key',5),card('chest',4),card('coins',8)];g.deck=[card('map',7),card('astrolabe',6),card('snake',5),card('coins',9)];
 go(g,'draw');const picked=g.pending.options[0].card;go(g,'choice',{cardId:picked.id});
 const other=view(g,g.players[1].id);const action=other.activity.at(-1);assert.equal(action.playerName,'Diane');assert.equal(action.verb,'chose');assert.deepEqual(action.card,picked);assert.match(action.detail,/using Map/);assert.equal(other.events.length,0);
 const secret=rig();secret.deck=[card('astrolabe'),card('key',7),card('coins',9)];go(secret,'draw');const watcher=view(secret,secret.players[1].id);assert.equal(watcher.activity.length,1);assert.equal(watcher.activity[0].card.suit,'astrolabe');assert.equal(watcher.pending.peek,undefined);assert.equal(JSON.stringify(watcher.activity).includes(secret.deck[0].id),false);start(secret);assert.equal(secret.activity.length,0);
});

test('chosen adventurer survives room views and rematches; invalid avatars use the default',()=>{const host=newPlayer('Diane',2),g=createGame('ABC234',host,false);g.players.push(newPlayer('Fatemeh',3));assert.deepEqual(view(g,host.id).players.map(p=>p.avatar),[2,3]);start(g);assert.deepEqual(view(g,host.id).players.map(p=>p.avatar),[2,3]);for(const bad of [-1,4,1.5,'2',null])assert.equal(newPlayer('Guest',bad).avatar,0);});


test('first-round explanations belong to their acting player even after the turn changes',()=>{const g=rig();g.players[1].bank=[card('key',7)];g.deck=[card('pistol',5),card('coins',9),card('map',6)];const diane=g.players[0].id,fifi=g.players[1].id;go(g,'draw');assert.equal(view(g,diane).events[0].kind,'ability');assert.equal(view(g,fifi).events.length,0);go(g,'choice',{cardId:g.pending.options[0].id});assert.deepEqual(view(g,diane).activity,view(g,fifi).activity);go(g,'collect');assert.equal(g.turn,1);assert.equal(view(g,diane).events.length,2);assert.equal(view(g,fifi).events.length,0);go(g,'draw');go(g,'collect');assert.equal(view(g,fifi).events.length,1);assert.equal(view(g,fifi).events[0].playerId,fifi);assert.equal(view(g,diane).events.length,2);});

test('leaving and returning announce presence to other players in every round without losing progress',()=>{const g=rig();g.turnNumber=7;const host=g.players[0],guest=g.players[1];host.bank=[card('coins',9)];apply(g,host.id,'leave');assert.equal(host.away,true);assert.equal(g.turn,0);assert.equal(host.bank.length,1);assert.equal(view(g,host.id).events.length,0);assert.equal(view(g,guest.id).events[0].kind,'leave');assert.match(view(g,guest.id).events[0].title,/left the game/);apply(g,host.id,'leave');assert.equal(g.roomEvents.length,1);apply(g,host.id,'return');assert.equal(host.away,false);assert.equal(view(g,guest.id).events.at(-1).kind,'return');assert.equal(host.bank.length,1);apply(g,guest.id,'leave');assert.equal(view(g,host.id).events.at(-1).playerId,guest.id);assert.equal(g.turn,0);});
