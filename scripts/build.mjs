import {cp,rm,readdir,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
async function check(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())await check(path);else if(path.endsWith('.js'))execFileSync(process.execPath,['--check',path]);else if(path.endsWith('.html')){const html=await readFile(path,'utf8');for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(match[1].includes('src=')||/application\/(ld\+)?json/.test(match[1]))continue;execFileSync(process.execPath,['--check','--input-type='+(/type=["']module/.test(match[1])?'module':'commonjs')],{input:match[2]});}}}}
await check(join(root,'dist'));
await rm(join(root,'www'),{recursive:true,force:true});
await cp(join(root,'dist'),join(root,'www'),{recursive:true});
console.log('Web verificada. Los mismos archivos están preparados en www para Capacitor.');
