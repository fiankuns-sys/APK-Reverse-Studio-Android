#!/usr/bin/env node
/** Opt-in, offline JADX CLI runner for APKs you own / have permission to inspect.
 *  Runs with shell=false. It is NOT invoked by the Android UI or Codex gateway.
 */
import { spawn } from 'node:child_process';
import { stat, mkdir, realpath, writeFile, readdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, extname, join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function runJadx({input,output,jadx=process.env.JADX_BIN||'jadx',timeout=180000}={}) {
 if(typeof input!=='string'||!input.trim()||typeof output!=='string'||!output.trim())throw new Error('Path input dan output wajib');
 const source=await realpath(resolve(input));
 const meta=await stat(source);
 if(!meta.isFile()||!['.apk','.dex','.jar','.aab','.xapk','.apks','.apkm'].includes(extname(source).toLowerCase())) throw new Error('Format sumber belum didukung');
 if(meta.size<10||meta.size>512*1024*1024)throw new Error('JADX offline dibatasi pada input 512 MiB per proses; bukan target 40 GB');
 const dest=resolve(output);
 if(dest===source || dest.startsWith(source+sep)||source.startsWith(dest+sep))throw new Error('Folder output dan input tidak boleh saling menimpa');
 await mkdir(dest,{recursive:true});
 const args=['--no-res','--threads-count','2','--output-dir',dest,source];
 const result=await new Promise((done,reject)=>{
   const proc=spawn(jadx,args,{shell:false,stdio:['ignore','ignore','pipe'],windowsHide:true});
   let stderr='';let timedOut=false;
   const timer=setTimeout(()=>{timedOut=true;proc.kill('SIGKILL');},timeout);
   proc.stderr.on('data',b=>{if(stderr.length<10000)stderr+=b.toString().slice(0,10000-stderr.length);});
   proc.once('error',e=>{clearTimeout(timer);reject(new Error('Tidak dapat menjalankan JADX: '+e.message));});
   proc.once('close',code=>{clearTimeout(timer);if(timedOut)reject(new Error('JADX melebihi batas waktu proses'));else if(code!==0)reject(new Error('JADX gagal, exit '+code+': '+stderr.slice(-1200)));else done({code});});
 });
 const sample=[];
 async function walk(dir,depth){
   if(depth>16||sample.length>=120)return;
   for(const item of await readdir(dir,{withFileTypes:true})){
     if(sample.length>=120)return;
     const full=join(dir,item.name);
     if(item.isDirectory())await walk(full,depth+1);
     else if(item.isFile()&&/\.(java|json|xml)$/i.test(item.name))sample.push(relative(dest,full));
   }
 }
 await walk(dest,0);
 const hash=createHash('sha256');
 for await(const chunk of createReadStream(source)){hash.update(chunk);}
 const report={sourceSha256:hash.digest('hex'),engine:'jadx-cli',status:'process_exit_zero',source,output:dest,inputBytes:meta.size,sourceSample:sample,notes:'Exit code zero does not guarantee every method decompiled. Inspect JADX warnings and generated code; no APK rebuilt or signed.'};
 await writeFile(join(dest,'apk-reverse-jadx-report.json'),JSON.stringify(report,null,2),'utf8');
 return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [, ,input,output]=process.argv;
 if(!input||!output){console.error('Usage: node tools/jadx-offline.mjs path/to/app.apk path/to/output_folder');process.exitCode=2;}
 else runJadx({input,output}).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.message);process.exitCode=1;});
}
