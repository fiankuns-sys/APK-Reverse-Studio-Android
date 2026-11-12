#!/usr/bin/env python3
"""Create static previews from the actual v0.9 Android WebView assets."""
from pathlib import Path
r=Path(__file__).resolve().parent.parent
ui=r/'app/src/main/assets'
html=(ui/'index.html').read_text('utf-8')
css=(ui/'styles.css').read_text('utf-8')
js=(ui/'studio.js').read_text('utf-8')
page=html.replace('<link rel="stylesheet" href="styles.css" />', '<style>\n'+css+'\n</style>')
(r/'preview-ui.html').write_text(page.replace('<script src="studio.js"></script>', '<script>\n'+js+'\n</script>'),encoding='utf-8')
bootstrap=r'''<script>
// SYNTHETIC DEMO: data below is not output from Android SDK cryptographic verification.
(function(){
 const receipt={format:'apk-reverse-build-receipt',schemaVersion:1,result:'VERIFIED',
 signedFile:'contoh-sintetis-signed.apk',signedBytes:4259840,
 signedApkSha256:'a'.repeat(64),sourceApkSha256:'c'.repeat(64),
 signerCertificateSha256:'b'.repeat(64),zipalign16KiB:'PASS',apksignerVerify:'PASS',
 verifiedSchemes:{v2:true,v3:true},note:'DATA DEMO, BUKAN HASIL SIGNING YANG ASLI'};
 localStorage.setItem('apk_reverse_studio_ui_v1',JSON.stringify({route:'build'}));
 window.StudioNative={
 savedFile(){return 'null'},savedReport(){return 'null'},workspaceStatus(){return 'null'},apktoolStatus(){return 'null'},
 gatewayStatus(){return JSON.stringify({configured:false,url:''})},
 buildReportStatus(){return JSON.stringify(receipt)},
 chooseBuildReport(){alert('DEMO: receipt sintetis sudah terlihat. Pada APK Android, pemilih JSON akan terbuka.')},
 clearSavedFile(){},clearGateway(){},copyText(text){navigator.clipboard?.writeText(text)}
 };
})();
</script>'''
banner='<div style="position:relative;z-index:999;background:#17384a;color:#e7f7fd;text-align:center;padding:10px;font:12px system-ui;border-bottom:1px solid #397f91">DEMO v0.9 — Receipt sintetis, tidak membuktikan tanda tangan APK nyata</div>'
demo=page.replace('<div id="app"></div>',banner+'\n<div id="app"></div>').replace('<script src="studio.js"></script>',bootstrap+'\n<script>\n'+js+'\n</script>')
(r/'preview-v09-demo.html').write_text(demo,encoding='utf-8')
print('Preview v09 generated')
