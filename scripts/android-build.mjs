import {execFileSync,spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {readdirSync,readFileSync,unlinkSync} from 'node:fs';
const root=resolve(import.meta.dirname,'..');
// Some file-sync clients duplicate Capacitor's generated config file.
// Remove only byte-equivalent (ignoring whitespace) generated copies.
const xml=resolve(root,'android/app/src/main/res/xml');
const canonical=readFileSync(resolve(xml,'config.xml'),'utf8').replace(/\s/g,'');
for(const name of readdirSync(xml)){
  if(/^config \d+\.xml$/.test(name)){
    const path=resolve(xml,name);
    if(readFileSync(path,'utf8').replace(/\s/g,'')!==canonical)throw Error('Revisa el recurso duplicado: '+name);
    unlinkSync(path);
  }
}
const env={...process.env};
if(process.platform==='darwin'){
  try{env.JAVA_HOME=execFileSync('/usr/libexec/java_home',['-v','21'],{encoding:'utf8'}).trim();}catch{throw Error('Instala Java 21 para compilar Android.');}
}
const result=spawnSync(process.platform==='win32'?'gradlew.bat':'./gradlew',['assembleDebug'],{cwd:resolve(root,'android'),env,stdio:'inherit',shell:process.platform==='win32'});
if(result.error)throw result.error;
process.exit(result.status??1);
