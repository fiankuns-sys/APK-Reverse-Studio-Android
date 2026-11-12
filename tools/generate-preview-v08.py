#!/usr/bin/env python3
"""Preview uses genuine UI assets; demo bridge is synthetic only."""
from pathlib import Path
r=Path(__file__).resolve().parent.parent
ui=r/'app/src/main/assets'
index=(ui/'index.html').read_text('utf8')
css=(ui/'styles.css').read_text('utf8')
js=(ui/'studio.js').read_text('utf8')
index=index.replace('<link rel="stylesheet" href="styles.css" />','<style>\n'+css+'\n</style>')
(r/'preview-ui.html').write_text(index.replace('<script src="studio.js"></script>','<script>\n'+js+'\n</script>'),'utf8')
bootstrap=r'''<script>
// SYNTHETIC DEMO. Nothing is decompiled or uploaded by this page.
(function(){
 const source={name:'demo.apk',size:4096,selectedAt:8800,uri:'demo://synthetic'};
 const files=[{path:'tree/AndroidManifest.xml',bytes:63},{path:'tree/smali/demo/MainActivity.smali',bytes:120},{path:'tree/res/values/strings.xml',bytes:100}];
 const originals={
  'tree/AndroidManifest.xml':'<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="demo"/>',
  'tree/smali/demo/MainActivity.smali':'.class public Ldemo/MainActivity;\n.super Ljava/lang/Object;\n\n.method public hello()V\n    .locals 0\n    return-void\n.end method\n',
  'tree/res/values/strings.xml':'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <string name="app_name">Demo Aplikasi</string>\n</resources>\n'
 };
 const get=()=>{try{return JSON.parse(localStorage.getItem('v08-demo-patches')||'{}')}catch{return {}}};
 const put=x=>localStorage.setItem('v08-demo-patches',JSON.stringify(x));
 localStorage.setItem('apk_reverse_studio_ui_v1',JSON.stringify({route:'apktool',project:source,sections:['Manifest']}));
 window.StudioNative={
  savedFile(){return JSON.stringify(source)},savedReport(){return 'null'},
  gatewayStatus(){return JSON.stringify({configured:false,url:''})},
  workspaceStatus(){return 'null'},
  apktoolStatus(){return JSON.stringify({status:'ready',meta:{sourceFile:'demo.apk',sourceBytes:4096,skippedFiles:0},files,changedPaths:Object.keys(get())})},
  openApktoolSource(path){const patches=get();return JSON.stringify({status:'ok',path,content:Object.hasOwn(patches,path)?patches[path]:originals[path],modified:Object.hasOwn(patches,path),originalSha256:'synthetic-0000000-not-real'})},
  saveApktoolPatch(path,content){const p=get();if(path.endsWith('.smali')&&(!content.includes('.class ')||!content.includes('.super ')||((content.match(/\.method\s+/g)||[]).length!==(content.match(/\.end method/g)||[]).length)))return JSON.stringify({status:'error',message:'Preflight demo: Smali tidak lengkap'});if(path.endsWith('.xml')&&content.includes('<!DOCTYPE'))return JSON.stringify({status:'error',message:'DTD dilarang'});if(content===originals[path])delete p[path];else p[path]=content;put(p);return JSON.stringify({status:'ok',modified:!!p[path],changedPaths:Object.keys(p)})},
  resetApktoolPatch(path){const p=get();delete p[path];put(p);return JSON.stringify({status:'ok',changedPaths:Object.keys(p)})},
  chooseApktoolBundle(){alert('DEMO: bundle sintetis sudah dimuat. Pada aplikasi Android asli, pemilih dokumen akan dibuka.')},
  exportApktoolPatches(){const p=get();const blob=new Blob([JSON.stringify({format:'SYNTHETIC_DEMO_NOT_VALID_PATCH',patches:p},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='demo-v08-not-for-build.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)},
  chooseJadxBundle(){alert('Demo hanya Smali/XML.')},exportWorkspacePatches(){},
  chooseFile(){alert('Pilih file tersedia di APK Android asli.')},startInspection(){alert('Demo tidak memiliki parser Android.')},
  clearSavedFile(){},clearGateway(){},copyText(value){if(navigator.clipboard)navigator.clipboard.writeText(value)}
 };
})();
</script>'''
warning='''<div style="position:relative;z-index:999;background:#1c3850;color:#e6f7fc;text-align:center;padding:10px;font:12px system-ui;border-bottom:1px solid #3b6b76">DEMO INTERAKTIF v0.8 — data Smali/XML sintetis, bukan analisis APK sesungguhnya</div>'''
demo=index.replace('<div id="app"></div>',warning+'\n<div id="app"></div>')
demo=demo.replace('<script src="studio.js"></script>',bootstrap+'\n<script>\n'+js+'\n</script>')
(r/'preview-v08-demo.html').write_text(demo,'utf8')
print('Generated preview-ui.html and preview-v08-demo.html')
