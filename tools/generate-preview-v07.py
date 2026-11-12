#!/usr/bin/env python3
from pathlib import Path
import html
root=Path(__file__).resolve().parent.parent
ui=root/'app/src/main/assets'
index=(ui/'index.html').read_text('utf8')
css=(ui/'styles.css').read_text('utf8')
script=(ui/'studio.js').read_text('utf8')
index=index.replace('<link rel="stylesheet" href="styles.css" />','<style>\n'+css+'\n</style>')
(root/'preview-ui.html').write_text(index.replace('<script src="studio.js"></script>','<script>\n'+script+'\n</script>'),'utf8')
bootstrap=r'''<script>
// DEMO ONLY: synthetic source and a mock bridge, never a real APK decompile.
(function(){
 const selectedAt=777000;
 const example={name:'sample.apk',size:1024,selectedAt,uri:'content://demo/mock'};
 const mainPath='sources/demo/MainActivity.java';
 const examples=[{path:mainPath,bytes:310},{path:'sources/demo/Config.java',bytes:180}];
 const data={
 'sources/demo/MainActivity.java':'package demo;\n\npublic class MainActivity {\n    public String getMessage() {\n        return "Halo dari hasil dekompilasi contoh";\n    }\n}\n',
 'sources/demo/Config.java':'package demo;\n\npublic final class Config {\n    public static final int VERSION = 7;\n}\n'
 };
 localStorage.setItem('apk_reverse_studio_ui_v1',JSON.stringify({route:'code',project:example,history:[],sections:['Manifest'],workspaceQuery:''}));
 window.StudioNative={
   savedFile(){return JSON.stringify(example)},savedReport(){return 'null'},
   gatewayStatus(){return JSON.stringify({configured:false,url:''})},
   workspaceStatus(){return JSON.stringify({status:'ready',meta:{sourceFile:'sample.apk',sourceBytes:1024},sources:examples,changedPaths:Object.keys(JSON.parse(localStorage.getItem('v07-demo-patches')||'{}'))})},
   openWorkspaceSource(path){const patches=JSON.parse(localStorage.getItem('v07-demo-patches')||'{}');return JSON.stringify({status:'ok',path,originalSha256:'synthetic-demo-not-verified',modified:Object.hasOwn(patches,path),content:Object.hasOwn(patches,path)?patches[path]:data[path]})},
   saveWorkspacePatch(path,content){const patches=JSON.parse(localStorage.getItem('v07-demo-patches')||'{}');patches[path]=content;localStorage.setItem('v07-demo-patches',JSON.stringify(patches));return JSON.stringify({status:'ok',modified:true,changedPaths:Object.keys(patches)})},
   resetWorkspacePatch(path){const patches=JSON.parse(localStorage.getItem('v07-demo-patches')||'{}');delete patches[path];localStorage.setItem('v07-demo-patches',JSON.stringify(patches));return JSON.stringify({status:'ok',modified:false,changedPaths:Object.keys(patches)})},
   chooseJadxBundle(){alert('Mode demo: bundle sumber Java sintetis sudah dimuat. Di Android asli, tombol ini membuka pemilih ZIP.')},
   exportWorkspacePatches(){const patches=localStorage.getItem('v07-demo-patches')||'{}';const json=JSON.stringify({mode:'SYNTHETIC_DEMO',patches:JSON.parse(patches)},null,2);const blob=new Blob([json],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='demo-patches.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)},
   copyText(x){if(navigator.clipboard)navigator.clipboard.writeText(x)},
   startInspection(){window.StudioUI.onInspectionUpdate({status:'error',message:'Demo tanpa berkas APK sungguhan'})},
   chooseFile(){alert('Mode demo: pemilihan APK tersedia di aplikasi Android asli.')},
   clearSavedFile(){},clearGateway(){},
 };
})();
</script>'''
warning='''<div style="position:relative;z-index:999;background:#1c3850;color:#d7f8f0;text-align:center;padding:8px;font:12px system-ui;border-bottom:1px solid #3b6b76">DEMO UI v0.7 — kode Java sintetis, bukan hasil dekompilasi APK nyata</div>'''
demo=index.replace('<div id="app"></div>',warning+'\n<div id="app"></div>')
demo=demo.replace('<script src="studio.js"></script>',bootstrap+'\n<script>\n'+script+'\n</script>')
(root/'preview-v07-demo.html').write_text(demo,'utf8')
print('Preview generated', (root/'preview-ui.html').stat().st_size, (root/'preview-v07-demo.html').stat().st_size)
