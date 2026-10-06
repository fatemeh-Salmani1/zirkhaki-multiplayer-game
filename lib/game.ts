export const SUITS = ['astrolabe','pistol','dagger','carpet','map','horseshoe','snake','coins','key','chest'] as const;
export type Suit = typeof SUITS[number];
export type Card = {id:string;suit:Suit;value:number};
export const INFO: Record<Suit,{name:string;description:string;color:string}> = {
 astrolabe:{name:'Astrolabe',description:'Peek at the next card. Then draw it or collect your treasure.',color:'#7460a5'},
 pistol:{name:'Pistol',description:'Discard an exposed card from an opponent’s collection.',color:'#b53c4e'},
 dagger:{name:'Dagger',description:'Steal an exposed card of a symbol missing from your collection. Play its ability.',color:'#327ca9'},
 carpet:{name:'Carpet',description:'If you bust, keep the cards revealed before this carpet.',color:'#9f4568'},
 map:{name:'Map',description:'Look at three shuffled discard cards. Choose one and play its ability.',color:'#967848'},
 horseshoe:{name:'Horseshoe',description:'Replay an exposed card from your own collection, including its ability.',color:'#318b85'},
 snake:{name:'Snake',description:'You must reveal two more cards. Resolve each ability before continuing.',color:'#98579c'},
 coins:{name:'Coins',description:'No special ability. Coins are worth 4–9 points; other treasures are worth 2–7.',color:'#b2831f'},
 key:{name:'Key',description:'Collect a key and chest in one turn to gain matching-count bonus cards from the discards.',color:'#40865b'},
 chest:{name:'Chest',description:'Collect with a key to gain one discard card per collected card. Bonus abilities do not activate.',color:'#b65b3e'}
};
export const RINGS = {
 snakecharmer:{name:'Snake Charmer',description:'A revealed snake goes straight to your collection, without forcing extra draws.',color:'#9d62b4'},
 extortionist:{name:'Extortionist',description:'Cards discarded by another player’s pistol go to your collection.',color:'#ce6373'},
 cutpurse:{name:'Cutpurse',description:'Your dagger can steal any exposed card, even a symbol already in your collection.',color:'#4f9dcc'},
 goldsmith:{name:'Goldsmith',description:'Finish with coins in your collection to earn 5 extra points.',color:'#d7ae43'},
 greedy:{name:'Treasure Hoarder',description:'Double your key-and-chest bonus cards.',color:'#73a353'},
 cartographer:{name:'Cartographer',description:'Your map can choose any card from the entire discard pile.',color:'#a18b66'},
 cunning:{name:'Cunning',description:'Your horseshoe replays two exposed cards from your collection, one at a time.',color:'#49a5a0'},
 fortune:{name:'Fortune Teller',description:'Your astrolabe peeks at the next three cards, in their draw order.',color:'#9b7cc1'}
} as const;
export type Ring = keyof typeof RINGS;
export type Player = {id:string;token:string;name:string;avatar?:number;away?:boolean;bank:Card[];ring?:Ring;ringOptions?:Ring[]};
type Option = {id:string;card:Card;playerId?:string};
export type Pending = {kind:'pistol'|'dagger'|'horseshoe'|'map'|'peek';title:string;options:Option[];peek?:Card[]};
export type GameNotice = {id:string;kind:'bust'|'ability'|'collect'|'combo'|'leave'|'return';playerId:string;playerName:string;title:string;text:string;cards:Card[];scoreChange?:number};
export type GameActivity = {id:string;playerId:string;playerName:string;verb:string;card:Card;detail:string};
export type Game = {activity?:GameActivity[];roomEvents?:GameNotice[];events?:GameNotice[];code:string;version:number;host:string;phase:'lobby'|'rings'|'playing'|'finished';advanced:boolean;players:Player[];deck:Card[];discard:Card[];treasure:Card[];turn:number;turnNumber:number;forced:number;replays:number;pending:Pending|null;log:string[];lastEvent:string;createdAt:number};
export function shuffle<T>(input:T[]):T[] {const a=[...input];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function note(g:Game,message:string){g.lastEvent=message;g.log=[message,...g.log].slice(0,60);}
export function newPlayer(name:string,avatar:unknown=0):Player{return {id:crypto.randomUUID(),token:crypto.randomUUID(),name,avatar:typeof avatar==='number'&&Number.isInteger(avatar)&&avatar>=0&&avatar<=3?avatar:0,bank:[]};}
export function createGame(code:string,host:Player,advanced:boolean):Game{return {code,version:0,host:host.id,phase:'lobby',advanced,players:[host],deck:[],discard:[],treasure:[],turn:0,turnNumber:0,forced:0,replays:0,pending:null,log:['Waiting for players.'],lastEvent:'Waiting for players.',createdAt:Date.now()};}
export function score(p:Pick<Player,'bank'|'ring'>){return SUITS.reduce((n,s)=>n+Math.max(0,...p.bank.filter(c=>c.suit===s).map(c=>c.value)),0)+(p.ring==='goldsmith'&&p.bank.some(c=>c.suit==='coins')?5:0);}
export function exposed(p:Pick<Player,'bank'>){return SUITS.flatMap(s=>{const cards=p.bank.filter(c=>c.suit===s);const max=Math.max(0,...cards.map(c=>c.value));return cards.filter(c=>c.value===max).slice(-1);});}
export function winners(g:Pick<Game,'players'>){const order=[...g.players].sort((a,b)=>score(b)-score(a)||b.bank.length-a.bank.length);return order.filter(p=>score(p)===score(order[0])&&p.bank.length===order[0].bank.length).map(p=>p.id);}
function notify(g:Game,kind:GameNotice['kind'],title:string,text:string,cards:Card[]=[],scoreChange?:number){if(g.turnNumber>g.players.length)return;const p=g.players[g.turn];g.events=[...(g.events??[]),{id:crypto.randomUUID(),kind,playerId:p.id,playerName:p.name,title,text,cards,scoreChange}].slice(-40);}
function active(g:Game){return g.players[g.turn];}
function remove(p:Player,id:string){const i=p.bank.findIndex(c=>c.id===id);if(i<0)throw Error('That card is no longer available.');return p.bank.splice(i,1)[0];}
export function start(g:Game){
 if(g.players.length<2)throw Error('At least two players are needed.');
 const copies=g.players.length>4?2:1;let deck:Card[]=[];
 for(let copy=0;copy<copies;copy++)for(const suit of SUITS)for(let v=2;v<=7;v++)deck.push({id:crypto.randomUUID(),suit,value:suit==='coins'?v+2:v});
 g.discard=shuffle(deck.filter(c=>c.value===(c.suit==='coins'?4:2)));g.deck=shuffle(deck.filter(c=>c.value!==(c.suit==='coins'?4:2)));
 g.treasure=[];g.turn=0;g.turnNumber=1;g.forced=0;g.replays=0;g.pending=null;
 g.players.forEach(p=>{p.bank=[];delete p.ring;delete p.ringOptions;});
 g.events=[];g.activity=[];g.phase=g.advanced?'rings':'playing';
 if(g.advanced){const rings=shuffle(Object.keys(RINGS) as Ring[]);if(copies===2){g.players.forEach(p=>p.ring=rings.pop());g.phase='playing';}else g.players.forEach(p=>p.ringOptions=[rings.pop()!,rings.pop()!]);}
 note(g,g.phase==='rings'?'Choose your ring before the game begins.':`${active(g).name} begins the game.`);
}
function turnEnd(g:Game){g.forced=0;g.replays=0;g.pending=null;g.treasure=[];if(g.deck.length===0){g.phase='finished';note(g,'The game is over. Your final scores are ready.');}else{g.turn=(g.turn+1)%g.players.length;g.turnNumber++;}}
function collect(g:Game){
 const p=active(g);const before=score(p);const cards=[...g.treasure];const combo=cards.some(c=>c.suit==='key')&&cards.some(c=>c.suit==='chest');p.bank.push(...cards);let bonus=0;
 if(combo){g.discard=shuffle(g.discard);const gift=g.discard.splice(0,cards.length*(p.ring==='greedy'?2:1));bonus=gift.length;p.bank.push(...gift);}
 notify(g,'collect',combo?'Key + Chest!':'Treasure collected!',combo?`${bonus} bonus cards added to your collection.`:`${cards.length} treasure${cards.length===1?'':'s'} collected.`,combo?cards.filter(c=>c.suit==='key'||c.suit==='chest'):[],score(p)-before);
 note(g,`${p.name} collected ${cards.length} treasure${cards.length===1?'':'s'}${bonus?` and ${bonus} bonus cards`:''}.`);turnEnd(g);
}
function bust(g:Game,card:Card){const match=g.treasure.find(c=>c.suit===card.suit)!;const carpet=g.treasure.findIndex(c=>c.suit==='carpet');const protectedCards=carpet>=0?g.treasure.splice(0,carpet):[];active(g).bank.push(...protectedCards);notify(g,'bust',`Oh no, another ${INFO[card.suit].name}!`,protectedCards.length?`You busted. Your carpet saved ${protectedCards.length} cards.`:'Same symbol! This turn’s treasure is lost.',[match,card]);g.discard.push(...g.treasure,card);note(g,`${active(g).name} busted on ${INFO[card.suit].name}.${protectedCards.length?` The carpet saved ${protectedCards.length} cards.`:''}`);turnEnd(g);}
function ownOptions(g:Game):Option[]{return exposed(active(g)).map(c=>({id:c.id,card:c,playerId:active(g).id}));}
function choice(g:Game,kind:Pending['kind'],title:string,options:Option[]){if(options.length)g.pending={kind,title,options};}
// A card introduced by another ability counts toward a snake's outstanding reveals.
function play(g:Game,c:Card){
 if(g.forced>0)g.forced--;
 const p=active(g);
 if(c.suit==='snake'&&p.ring==='snakecharmer'){p.bank.push(c);notify(g,'ability','Snake saved!','Your ring collects it safely. No extra draws.',[c]);note(g,`${p.name} safely collected a snake with their ring.`);return;}
 if(g.treasure.some(t=>t.suit===c.suit)){bust(g,c);return;}
 g.treasure.push(c);
 if((c.suit==='key'||c.suit==='chest')&&g.treasure.some(t=>t.suit==='key')&&g.treasure.some(t=>t.suit==='chest'))notify(g,'combo','Key + Chest!','Collect them together to get bonus cards.',g.treasure.filter(t=>t.suit==='key'||t.suit==='chest'));
 const abilityText:Partial<Record<Suit,string>>={astrolabe:'Peek at the next card before you decide.',pistol:'Choose an opponent’s card to discard.',dagger:'Steal a card and play its ability.',carpet:'The cards before this carpet are safe if you bust.',map:'Choose a discard card to play.',horseshoe:p.ring==='cunning'?'Replay two cards from your collection.':'Replay a card from your collection.',snake:'It’s a Snake! You must reveal two more cards.'};
 if(abilityText[c.suit])notify(g,'ability',c.suit==='snake'?'A Snake!':INFO[c.suit].name,abilityText[c.suit]!,[c]);
 note(g,`${p.name} revealed ${INFO[c.suit].name} (${c.value}).`);
 const opponents=g.players.filter(x=>x.id!==p.id);
 const targets=opponents.flatMap(o=>exposed(o).map(card=>({id:card.id,card,playerId:o.id})));
 switch(c.suit){
 case 'astrolabe':if(!g.deck.length)break;g.pending={kind:'peek',title:'A glimpse of what comes next',options:[],peek:g.deck.slice(0,p.ring==='fortune'?3:1)};break;
 case 'pistol':choice(g,'pistol','Choose an opponent’s exposed card to discard',targets);break;
 case 'dagger':choice(g,'dagger','Choose an exposed card to steal',targets.filter(o=>p.ring==='cutpurse'||!p.bank.some(b=>b.suit===o.card.suit)));break;
 case 'snake':g.forced+=2;break;
 case 'horseshoe':g.replays+=p.ring==='cunning'?2:1;break;
 case 'map':{
 if(g.discard.length){const candidates=p.ring==='cartographer'?[...g.discard]:shuffle(g.discard).slice(0,3);choice(g,'map','Choose a discard card to reveal',candidates.map(card=>({id:card.id,card})));}break;
 }
 }
}
function settle(g:Game,originalTurn:number){
 let iterations=0;
 while(g.phase==='playing'&&g.turnNumber===originalTurn&&!g.pending){
 if(++iterations>250)throw Error('Unable to resolve this card chain.');
 if(g.replays>0){const options=ownOptions(g);if(options.length){choice(g,'horseshoe','Choose a card from your collection to replay',options);return;}g.replays=0;}
 if(g.forced>0&&g.deck.length){play(g,g.deck.shift()!);continue;}
 if(!g.deck.length){g.forced=0;collect(g);}return;
 }
}
export function apply(g:Game,playerId:string,action:string,payload:Record<string,unknown>={}){
 const p=g.players.find(p=>p.id===playerId);if(!p)throw Error('You are not a player in this room.');
 if(action==='leave'||action==='return'){const away=action==='leave';if(!!p.away===away)return;p.away=away;const message=away?`${p.name} left the game.`:`${p.name} returned to the game.`;g.roomEvents=[...(g.roomEvents??[]),{id:crypto.randomUUID(),kind:(away?'leave':'return') as GameNotice['kind'],playerId:p.id,playerName:p.name,title:message,text:away?`${p.name} went back to the main page. They can return to this room.`:`${p.name} is back and ready to play.`,cards:[]}].slice(-20);note(g,message);return;}
 if(action==='start'||action==='rematch'){if(p.id!==g.host)throw Error('Only the host can start a game.');if(action==='start'&&g.phase!=='lobby'||action==='rematch'&&g.phase!=='finished')throw Error('This action is unavailable now.');start(g);return;}
 if(action==='ring'){if(g.phase!=='rings'||!p.ringOptions?.includes(payload.ring as Ring))throw Error('Choose one of your offered rings.');p.ring=payload.ring as Ring;delete p.ringOptions;if(g.players.every(p=>p.ring)){g.phase='playing';note(g,`${active(g).name} begins the game.`);}return;}
 if(g.phase!=='playing')throw Error('The game is not in progress.');if(active(g).id!==p.id)throw Error('It is another player’s turn.');const originalTurn=g.turnNumber;let chosen:Card|undefined;let verb="drew";let activityDetail="Revealed from the draw pile.";
 if(action==='choice'){
 const pending=g.pending;if(!pending||pending.kind==='peek')throw Error('There is no card choice to make.');const option=pending.options.find(o=>o.id===payload.cardId);if(!option)throw Error('Choose an available card.');g.pending=null;chosen=option.card;verb="chose";activityDetail=pending.kind==='map'?"Chosen from the discard pile using Map.":pending.kind==='pistol'?`Removed from ${g.players.find(o=>o.id===option.playerId)?.name}’s collection using Pistol.`:pending.kind==='dagger'?`Taken from ${g.players.find(o=>o.id===option.playerId)?.name}’s collection using Dagger.`:"Replayed from their collection using Horseshoe.";
 if(pending.kind==='map'){const i=g.discard.findIndex(c=>c.id===option.id);if(i<0)throw Error('That card is no longer in the discards.');play(g,g.discard.splice(i,1)[0]);}
 else {const owner=g.players.find(p=>p.id===option.playerId)!;const card=remove(owner,option.id);
 if(pending.kind==='pistol'){const receiver=g.players.find(o=>o.ring==='extortionist'&&o.id!==p.id);if(receiver)receiver.bank.push(card);else g.discard.push(card);note(g,`${p.name} discarded ${owner.name}’s ${INFO[card.suit].name}${receiver?`; ${receiver.name} claimed it`:''}.`);}
 else {if(pending.kind==='horseshoe')g.replays--;play(g,card);}}
 }else if(action==='draw'){
 if(g.pending&&g.pending.kind!=='peek')throw Error('Resolve the card ability first.');g.pending=null;if(!g.deck.length)throw Error('The draw pile is empty.');chosen=g.deck.shift()!;play(g,chosen);
 }else if(action==='collect'){
 if(g.pending&&g.pending.kind!=='peek')throw Error('Resolve the card ability first.');if(g.forced>0||g.replays>0)throw Error('You must finish the forced reveals first.');if(!g.treasure.length)throw Error('Draw at least one card first.');g.pending=null;collect(g);
 }else throw Error('Unknown action.');
 settle(g,originalTurn);
 if(chosen)g.activity=[...(g.activity??[]),{id:crypto.randomUUID(),playerId:p.id,playerName:p.name,verb,card:chosen,detail:activityDetail}].slice(-12);
}
export function view(g:Game,playerId:string){
 return {activity:g.activity??[],events:[...(g.events??[]).filter(e=>e.playerId===playerId),...(g.roomEvents??[]).filter(e=>e.playerId!==playerId)],code:g.code,version:g.version,host:g.host,phase:g.phase,advanced:g.advanced,players:g.players.map(({token,ringOptions,...p})=>({...p,score:score(p),ringOptions:p.id===playerId?ringOptions:undefined})),deckCount:g.deck.length,discardCount:g.discard.length,treasure:g.treasure,turn:g.turn,turnNumber:g.turnNumber,forced:g.forced,replays:g.replays,pending:g.pending?(active(g).id===playerId?g.pending:{kind:g.pending.kind,title:g.pending.kind==='peek'?`${active(g).name} is taking a private peek.`:`${active(g).name} is choosing a card using ${INFO[g.pending.kind].name}.`,options:[]}):null,log:g.log,lastEvent:g.lastEvent,winners:g.phase==='finished'?winners(g):[],me:playerId};
}
export type GameView = ReturnType<typeof view>;
