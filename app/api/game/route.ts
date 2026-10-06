import { roomDb } from '@/db/rooms';
import { createGame, newPlayer, apply, view, type Game } from '@/lib/game';
export const dynamic = 'force-dynamic';
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
function name(value:unknown){if(typeof value!=='string'||!value.trim()||value.trim().length>20)throw Error('Enter a nickname of 1–20 characters.');return value.trim();}
function code(value:unknown){if(typeof value!=='string'||!/^[A-Z2-9]{6}$/.test(value.toUpperCase()))throw Error('Enter a six-character room code.');return value.toUpperCase();}
async function read(roomCode:string){const row=await roomDb().prepare('SELECT state, version FROM rooms WHERE code = ?').bind(roomCode).first<{state:string;version:number}>();if(!row)throw Error('Room not found. Check the code and try again.');return {g:JSON.parse(row.state) as Game,version:row.version};}
async function save(g:Game,version:number){g.version=version+1;const r=await roomDb().prepare('UPDATE rooms SET state = ?, version = ?, updated_at = ? WHERE code = ? AND version = ?').bind(JSON.stringify(g),g.version,Date.now(),g.code,version).run();return r.meta.changes===1;}
export async function GET(request:Request){try{const url=new URL(request.url);const {g}=await read(code(url.searchParams.get('code')));const token=request.headers.get('x-player-token');const p=g.players.find(p=>p.token===token);if(!p)return reply({error:'Your player session is missing. Join the room again.'},401);return reply(view(g,p.id));}catch(e){return reply({error:e instanceof Error?e.message:'Could not load the game.'},400);}}
export async function POST(request:Request){try{
 if(Number(request.headers.get('content-length')||0)>8192)return reply({error:'Request too large.'},413);
 const b=await request.json() as {action:string;name?:unknown;avatar?:unknown;code?:unknown;advanced?:boolean;version?:number;payload?:Record<string,unknown>};
 if(!b||typeof b.action!=='string')throw Error('Invalid game request.');
 if(b.action==='create'){
 const p=newPlayer(name(b.name),b.avatar);const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
 for(let attempt=0;attempt<5;attempt++){const bytes=crypto.getRandomValues(new Uint8Array(6));const roomCode=Array.from(bytes,x=>alphabet[x%alphabet.length]).join('');const g=createGame(roomCode,p,b.advanced===true);try{await roomDb().prepare('INSERT INTO rooms (code, state, version, updated_at) VALUES (?, ?, ?, ?)').bind(roomCode,JSON.stringify(g),0,Date.now()).run();return reply({game:view(g,p.id),token:p.token},201);}catch(e){if(!String(e).includes('UNIQUE'))throw e;}}throw Error('Could not create a room. Please try again.');
 }
 const roomCode=code(b.code);
 if(b.action==='join'){
 const nickname=name(b.name);const p=newPlayer(nickname,b.avatar);
 for(let retry=0;retry<4;retry++){const {g,version}=await read(roomCode);if(g.phase!=='lobby')throw Error('This game has already started. Join a new room.');if(g.players.length>=8)throw Error('This room already has eight players.');if(g.players.some(x=>x.name.toLowerCase()===nickname.toLowerCase()))throw Error('That nickname is taken in this room. Choose another.');g.players.push(p);g.log=[`${p.name} joined the game.`,...g.log].slice(0,60);if(await save(g,version))return reply({game:view(g,p.id),token:p.token});}return reply({error:'The room changed. Please try joining again.'},409);
 }
 const {g,version}=await read(roomCode);const p=g.players.find(p=>p.token===request.headers.get('x-player-token'));if(!p)return reply({error:'Your session is missing. Join the room again.'},401);
 if(b.version!==version)return reply({error:'The table updated. Your screen has been refreshed; try again.',game:view(g,p.id)},409);
 apply(g,p.id,b.action,b.payload??{});if(!await save(g,version)){const fresh=await read(roomCode);return reply({error:'Another move arrived first. Try again.',game:view(fresh.g,p.id)},409);}return reply({game:view(g,p.id)});
 }catch(e){console.error('Game request failed:',e instanceof Error?e.message:e);return reply({error:e instanceof Error?e.message:'Could not complete your move. Please try again.'},400);}}
