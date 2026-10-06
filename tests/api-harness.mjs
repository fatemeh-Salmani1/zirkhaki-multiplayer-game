// Execute the real Worker route with a D1-compatible SQLite adapter.
// This bypasses unavailable preview networking, without changing production source.
import ts from 'typescript';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const root=new URL('../.sites-runtime/api-test/',import.meta.url);mkdirSync(root,{recursive:true});
const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../drizzle/0000_slow_proteus.sql',import.meta.url),'utf8'));
globalThis.__testDB={prepare(sql){let values=[];return{bind(...args){values=args;return this;},async first(){return db.prepare(sql).get(...values)||null;},async run(){const r=db.prepare(sql).run(...values);return {meta:{changes:Number(r.changes)}};}};}};
const options={module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022};
for(const [input,output] of [['lib/game.ts','game.mjs'],['app/api/game/route.ts','route.mjs']]){let source=readFileSync(new URL('../'+input,import.meta.url),'utf8');source=source.replace("import { roomDb } from '@/db/rooms';",'const roomDb=()=>globalThis.__testDB;').replace("from '@/lib/game'","from './game.mjs'");writeFileSync(new URL(output,root),ts.transpileModule(source,{compilerOptions:options}).outputText);}
const route=await import(new URL('route.mjs',root));
globalThis.fetch=async(input,init)=>{const req=new Request(input,init);if(new URL(req.url).pathname!=='/api/game')throw Error('Harness only supports the real game API.');return req.method==='GET'?route.GET(req):route.POST(req);};
await import('./multiplayer.mjs');
