#!/usr/bin/env python3
"""Self-contained visual previews. The demo has no OAuth or AI network calls."""
from pathlib import Path
r=Path(__file__).resolve().parents[1]; ui=r/'app/src/main/assets'
h=(ui/'index.html').read_text(encoding='utf-8');css=(ui/'styles.css').read_text(encoding='utf-8');js=(ui/'studio.js').read_text(encoding='utf-8')
base=h.replace('<link rel="stylesheet" href="styles.css" />','<style>\n'+css+'\n</style>')
(r/'preview-ui.html').write_text(base.replace('<script src="studio.js"></script>','<script>\n'+js+'\n</script>'),encoding='utf-8')
mock=r'''<script>
/* VISUAL DEMO ONLY; no OAuth session, tokens, or network inference. */
(function(){
 const k='apk_reverse_studio_ui_v1';
 localStorage.setItem(k,JSON.stringify({route:'settings',aiDraft:'Tinjau metadata APK contoh'}));
 let connected=false;
 const profile=()=>JSON.stringify({connected,allowed:connected,email:connected?'contoh@invalid.example':''});
 window.StudioNative={
  savedFile(){return 'null';},savedReport(){return 'null';},workspaceStatus(){return 'null';},apktoolStatus(){return 'null';},buildReportStatus(){return 'null';},
  chatGptStatus(){return profile();},
  startChatGptLogin(){connected=true;window.StudioUI?.onChatGptUpdate({status:'connected',message:'DEMO: login simulasi, tanpa akun ChatGPT.',data:JSON.parse(profile())});},
  disconnectChatGpt(){connected=false;window.StudioUI?.onChatGptUpdate({status:'disconnected',data:JSON.parse(profile())});},
  loadChatGptModels(){window.StudioUI?.onChatGptUpdate({status:'models',data:{models:[{id:'demo-only-model',label:'Model contoh (tidak nyata)'}]}});},
  sendChatGpt(){alert('Hanya demo UI. Tidak ada AI yang dipanggil.');},
  chooseFile(){alert('Demo browser: pemilih APK hanya berfungsi di aplikasi Android.');},
  clearSavedFile(){},copyText(text){navigator.clipboard?.writeText(text);},
  startInspection(){alert('Demo browser: tidak ada pemeriksaan APK nyata.');}
 };
})();
</script>'''
notice='<div style="background:#143748;color:#e7f7fd;border-bottom:1px solid #397f91;text-align:center;padding:12px;font:13px system-ui">DEMO ANTARMUKA — Login & model hanya simulasi. Tidak tersambung ke ChatGPT atau API.</div>'
demo=base.replace('<div id="app"></div>',notice+'\n<div id="app"></div>')
demo=demo.replace('<script src="studio.js"></script>',mock+'\n<script>\n'+js+'\n</script>')
(r/'preview-direct-chatgpt-demo.html').write_text(demo,encoding='utf-8')
print('Created:',[(p.name,p.stat().st_size) for p in (r/'preview-ui.html',r/'preview-direct-chatgpt-demo.html')])
