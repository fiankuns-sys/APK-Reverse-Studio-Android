from pathlib import Path
p=Path(__file__).resolve().parent.parent/'app/src/main/assets/studio.js'
s=p.read_text()
s=s.replace('/* APK Reverse Studio v0.3 — bounded native manifest / DEX / resource header inspections. */','/* APK Reverse Studio v0.4 — bounded multi-APK analysis, code evidence, opt-in Codex gateway. */')
s=s.replace("entryQuery:'',activeEntry:''};}","entryQuery:'',activeEntry:'',aiStatus:'idle',aiMessage:'',aiReply:null};}")
# additional panel: before list of detectors at end of analysis
s=s.replace("depthPanel()+section('Enam Mesin Analisis'", "depthPanel()+v04EvidencePanel()+section('Enam Mesin Analisis'")
insert_before='const aiSection='
new_func='''function v04EvidencePanel(){
 if(!reportReady())return '';
 const langs=Array.isArray(report.languages)?report.languages:[];
 const nested=Array.isArray(report.bundledApks)?report.bundledApks:[];
 const insights=Array.isArray(report.localInsights)?report.localInsights:[];
 const tags=langs.length?langs.map(v=>'<div class="evidence-item"><strong>'+esc(v.technology)+'</strong><small>'+esc(v.confidence||'indikasi')+'</small><p>'+esc((v.evidence||[]).join(' · '))+'</p></div>').join(''):note('Tidak ditemukan bukti bahasa atau framework dari contoh berkas yang diindeks. Ini bukan bukti tidak adanya kode.');
 const packages=nested.length?nested.map(v=>'<details class="deep-dex-item"><summary><span>'+icon('package',15)+' '+esc(v.name)+'</span>'+badge(v.status==='ok'?'TERBACA':v.status==='metadata-only'?'TERBATAS':'GAGAL',v.status==='ok'?'teal':'amber')+'</summary><div class="info-rows">'+cardInfo('Ukuran',sizeText(Number(v.size)))+cardInfo('DEX',v.dexCount===undefined?'—':v.dexCount)+cardInfo('Package',v.manifest&&v.manifest.packageName||'Belum terbaca')+cardInfo('Status',v.reason||v.status)+'</div></details>').join(''):note('Tidak ada APK bersarang yang tercatat di sampel Explorer. Untuk paket besar, entri yang tidak tampil mungkin belum terjangkau.');
 const observations=insights.length?insights.map(v=>'<div class="evidence-item"><strong>'+esc(v.title)+'</strong>'+badge(v.type==='warning'?'PERIKSA':'INFORMASI',v.type==='warning'?'amber':'grey')+'<p>'+esc(v.detail)+'</p><small>Bukti: '+esc(v.evidence)+'</small></div>').join(''):note('Tidak ada aturan lokal yang menghasilkan temuan. Ini bukan sertifikat keamanan APK.');
 return section('Temuan Otomatis v0.4','Bukti dari struktur file dan aturan lokal; belum merupakan opini atau keputusan AI')+
 '<div class="evidence-grid"><section class="panel"><h3 class="section-title no-top-margin">Teknologi & Bahasa Kode</h3><div class="evidence-list">'+tags+'</div></section><section class="panel"><h3 class="section-title no-top-margin">APK di Dalam Paket</h3><div class="evidence-list">'+packages+'</div></section><section class="panel"><h3 class="section-title no-top-margin">Penjelasan Berbasis Aturan</h3><div class="evidence-list">'+observations+'</div></section></div>'+
 '<div style="margin:10px 0 20px">'+note('Java/Kotlin asli tidak bisa dipastikan hanya dari DEX. APK bersarang di atas 32 MiB dicatat sebagai metadata-only. Tidak ada eksekusi aplikasi atau pembacaan semua byte input.')+'</div>';
}
'''
s=s.replace(insert_before,new_func+insert_before,1)
start=s.index('function assistant(){')
end=s.index('\nconst stages=',start)
new_assistant='''function assistant(){const f=selectedFile();const configured=native&&gatewayInfo.configured;
const aiReply=state.aiReply&&typeof state.aiReply==='object'?state.aiReply:null;
const find=aiReply&&Array.isArray(aiReply.findings)?aiReply.findings:[];
const outcome=aiReply?'<div class="ai-results"><h3>Ringkasan Codex</h3><p>'+esc(aiReply.summary||'Tidak ada ringkasan')+'</p><div class="deep-tags"><code>Keyakinan: '+esc(aiReply.confidence||'tidak diketahui')+'</code><code>Temuan: '+find.length+'</code></div>'+find.slice(0,30).map(v=>'<div class="evidence-item"><strong>'+esc(v.title)+'</strong><p>'+esc(v.interpretation||'')+'</p><small>Bukti: '+esc(v.evidence||'')+' · Ketidakpastian: '+esc(v.uncertainty||'')+'</small></div>').join('')+((aiReply.nextSteps||[]).length?'<h4>Langkah selanjutnya</h4><ul>'+aiReply.nextSteps.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'')+((aiReply.limitations||[]).length?'<h4>Keterbatasan</h4><ul>'+aiReply.limitations.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'')+'</div>':'';
return top('AI Analyst','Analisis kode berbasis bukti lokal dan integrasi Codex berbasis gateway dengan persetujuan eksplisit.')+
'<div class="chat-layout"><section class="panel chat-panel"><div class="section-head" style="margin-top:0"><div><h3 class="section-title inline-icon">'+icon('bot',19)+' Konsol Analisis AI</h3><div class="section-desc">'+(configured?'Gateway tersimpan; gunakan Tes Koneksi untuk memverifikasi server.':'Gateway belum dikonfigurasi. Analisis lokal tetap tersedia.')+'</div></div>'+badge(configured?'DIKONFIGURASI':'BELUM TERHUBUNG',configured?'teal':'amber')+'</div><div class="chat-history"><div class="chat-intro"><div class="large">'+icon('spark',30)+'</div><h3>'+ (aiReply?'Laporan AI proyek aktif':'Konteks analisis terlindungi')+'</h3><p>'+esc(state.aiMessage||'Tidak ada file APK atau data mentah dikirim otomatis. Anda mengendalikan kategori metadata yang dibagikan.')+'</p>'+ (outcome||'<div style="margin-top:17px"><button class="secondary-action" data-action="route" data-target="settings">'+icon('lock',15)+' Konfigurasi koneksi</button></div>')+'</div></div><div class="chat-compose"><textarea id="aiDraft" maxlength="5000" placeholder="Contoh: Jelaskan struktur dan bahasa pemrograman yang dapat dibuktikan dari metadata APK ini…">'+esc(state.aiDraft)+'</textarea><div class="compose-bottom"><span class="compose-label inline-icon">'+icon('shield',14)+' Tinjau isi sebelum dikirim</span><button class="main-action sm-action" data-action="send" '+(!native||!configured||!reportReady()||state.aiStatus==='running'?'disabled':'')+'>'+icon('up',14)+' '+(state.aiStatus==='running'?'Memproses…':'Tinjau & Kirim')+'</button></div></div></section><aside class="chat-options"><div class="panel"><div class="label-muted">KONTEKS ANALISIS</div><div style="font-size:12px;font-weight:770;margin-top:10px">Pilih data yang boleh dibagikan</div><p class="mini-description">Tidak mengirim berkas APK utuh, kata sandi, keystore, ataupun token. Cukup metadata yang dipilih.</p><div class="option-list">'+aiSection.map(s=>'<label class="option"><input type="checkbox" data-section="'+s+'" '+(state.sections.includes(s)?'checked':'')+' /><span>'+s+'</span></label>').join('')+'</div><div class="divider"></div>'+badge('Selalu meminta persetujuan','teal')+'</div><div class="panel"><h3 class="section-title no-top-margin">Konteks siap ditinjau</h3><div class="terminal"><div class="comment">// Hanya ringkasan terpilih</div><div><span class="accent">file:</span> '+esc(f?f.name:'none')+'</div><div><span class="accent">size:</span> '+(f?sizeText(f.size):'none')+'</div><div><span class="accent">sections:</span> <span id="sections-count">'+state.sections.length+'</span></div><div><span class="accent">upload:</span> opt-in metadata</div></div><button class="ghost-action sm-action" style="margin-top:12px;width:100%" data-action="copy-ai">'+icon('copy',14)+' Salin konteks</button><button class="secondary-action sm-action" style="margin-top:8px;width:100%" data-action="route" data-target="analysis">'+icon('search',14)+' Lihat bukti lokal</button></div></aside></div><div style="margin-top:14px">'+note('Gateway Codex tidak otomatis masuk ke akun ChatGPT pada ponsel. Anda perlu menjalankan gateway pribadi dan menyiapkan autentikasi yang sah. Analisis AI adalah interpretasi, bukan jaminan kebenaran.')+'</div>';
}
'''
s=s[:start]+new_assistant+s[end:]
# settings swap: preserve cards and add gateway panel before section notes
key="section('Catatan Proyek','Ditulis lokal dan dipulihkan saat aplikasi dibuka kembali.')+"
gateway_panel='''section('Gateway Codex','Server pribadi yang menjalankan Codex SDK; token hanya dikirim lewat HTTPS dan disimpan terenkripsi oleh Android.')+
'<div class="panel"><div class="two-col"><div><div class="field"><label for="gatewayUrl">Alamat gateway HTTPS</label><input id="gatewayUrl" type="url" value="'+esc(gatewayInfo.url||'')+'" placeholder="https://ai.example.com" autocomplete="url"/></div><div class="field"><label for="gatewayToken">Token akses gateway (bukan OpenAI API key)</label><input id="gatewayToken" type="password" value="" placeholder="Minimal 24 karakter; kosongkan untuk mempertahankan token" autocomplete="off"/></div><p class="mini-description">Token tidak disimpan di localStorage atau dibagikan ke ChatGPT. OpenAI/Codex harus diotorisasi terpisah di server.</p></div><div><div class="info-rows">'+cardInfo('Status',gatewayInfo.configured?'Konfigurasi tersimpan; belum tentu online':'Belum diatur')+cardInfo('Sambungan','HTTPS terenkripsi')+cardInfo('Berkas APK mentah','Tidak dikirim')+'</div><div class="button-row"><button class="main-action" data-action="save-gateway" '+(!native?'disabled':'')+'>Simpan Gateway</button><button class="secondary-action" data-action="test-gateway" '+(!native||!gatewayInfo.configured?'disabled':'')+'>Tes Koneksi</button><button class="ghost-action" data-action="clear-gateway" '+(!native||!gatewayInfo.configured?'disabled':'')+'>Putuskan</button></div></div></div></div>'+ 
'''
s=s.replace(key,gateway_panel+key)
s=s.replace("'0.3.0 — Binary Metadata Inspector'","'0.4.0 — Multi-APK & Codex Gateway'")
s=s.replace("'ZIP64 + Manifest biner + DEX metadata + ARSC header'","'ZIP64 + Manifest/DEX + Paket Bersarang + Deteksi Teknologi'")
s=s.replace("badge('INSPECTOR v0.3'","badge('INSPECTOR v0.4'")
s=s.replace('v0.3.0 • Binary Metadata Inspector','v0.4.0 • Codex Gateway & Package Sets')
s=s.replace('ZIP64, Manifest, DEX metadata aktif. AI, decompiler lengkap, build belum tersedia.','ZIP64, Manifest, DEX, paket bersarang, dan aturan lokal aktif. Gateway AI opsional.')
s=s.replace('BINARY METADATA AKTIF (ANDROID) · TANPA JAVA DECOMPILATION / UPLOAD / BUILD','PACKAGE SETS + RULE ENGINE · AI OPSIONAL DENGAN IZIN · BELUM ADA BUILD')
s=s.replace("connect:{icon:'bot',title:'Integrasi ChatGPT/Codex: direncanakan',body:'<p>Prototipe ini belum melakukan autentikasi. Integrasi nantinya membutuhkan <strong>Sign in with ChatGPT</strong> resmi, persetujuan izin, validasi token, serta pengujian kompatibilitas OAuth pada Android.</p><p>Memakai akun ChatGPT yang sama tidak berarti aplikasi otomatis memperoleh isi percakapan lama. Berkas hanya akan dibagikan setelah pengguna menyetujui cakupan analisis.</p>',primary:'Paham'},","connect:{icon:'bot',title:'Pengaturan AI Codex',body:'<p>Konfigurasi tersedia melalui halaman Pengaturan → Gateway Codex. Aplikasi ini tidak memiliki akses otomatis ke akun ChatGPT Anda. Autentikasi Codex dilakukan pada server yang Anda kendalikan.</p>',primary:'Paham'},")
s=s.replace("send:{icon:'lock',title:'Pengiriman AI belum aktif',body:'<p>Draf pertanyaan Anda sudah disimpan secara lokal. Tombol kirim baru akan bekerja setelah koneksi akun, mesin pemrosesan dan mekanisme persetujuan data diimplementasikan.</p>',primary:'Kembali ke draf'},","send:{icon:'lock',title:'Pratinjau konteks wajib',body:'<p>Pilih laporan hasil inspeksi dan atur gateway terlebih dahulu. Setelah itu Anda dapat meninjau metadata yang akan dikirim.</p>',primary:'Kembali'},")
# state globals look before declaration
s=s.replace("const native=typeof window.StudioNative!=='undefined';","const native=typeof window.StudioNative!=='undefined';\nlet gatewayInfo={configured:false,url:''};")
s=s.replace("function aiContext(){const f=selectedFile();", "function aiContext(){const f=selectedFile();")
s=s.replace('source.resources=d.resources;}}return JSON.stringify(source,null,2);}',"source.resources=d.resources;}source.languages=report.languages||[];source.localInsights=report.localInsights||[];source.bundledApks=(report.bundledApks||[]).map(x=>({name:x.name,status:x.status,size:x.size,dexCount:x.dexCount,packageName:x.manifest&&x.manifest.packageName}));}return JSON.stringify(source,null,2);}")
# custom consent modal before generic
s=s.replace("function renderModal(){if(!modal)return '';", '''function renderModal(){if(!modal)return '';
if(modal==='ai-preview'){
 const payload=aiContext();
 return '<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="modal-close" data-action="close-modal" aria-label="Tutup">'+icon('x',19)+'</button><div class="modal-icon">'+icon('shield',22)+'</div><h2 id="modal-title">Tinjau sebelum dikirim ke Codex</h2><p>Hanya metadata JSON berikut, bukan berkas APK. Data akan dikirim ke gateway pribadi dengan persetujuan Anda.</p><pre class="ai-preview">'+esc(payload.slice(0,10000))+(payload.length>10000?'\\n… pratinjau dipotong; gunakan Salin konteks untuk melihat lengkap':'')+'</pre><p>Ukuran: '+sizeText(new TextEncoder().encode(payload).length)+' · Bagian: '+state.sections.length+' · URL: '+esc(gatewayInfo.url||'Belum diatur')+'</p><div class="modal-actions"><button class="secondary-action" data-action="close-modal">Batal</button><button class="main-action" data-action="confirm-ai">Saya setuju, kirim metadata</button></div></div></div>';
}
''')
# add callbacks action handling, no automatic auth
s=s.replace("else if(action==='copy-ai')copyAiContext();", """else if(action==='copy-ai')copyAiContext();
else if(action==='save-gateway')saveGateway();
else if(action==='test-gateway'){if(native)window.StudioNative.testGateway();notify('Menguji koneksi gateway…');}
else if(action==='clear-gateway'){if(native)window.StudioNative.clearGateway();}
else if(action==='confirm-ai')sendToCodex();""")
s=s.replace("else if(action==='connect'||action==='send'||action==='build'||action==='clear'||action==='show-plan'||action==='show-sign'){modal=action;render();}","""else if(action==='send'){
  if(!reportReady()){notify('Analisis APK dahulu untuk menghasilkan laporan.');return;}
  if(!gatewayInfo.configured){notify('Konfigurasi gateway Codex pada Pengaturan.');return;}
  if(!state.aiDraft.trim()){notify('Isi pertanyaan analisis dahulu.');return;}
  if(state.sections.length===0){notify('Pilih minimal satu kategori metadata.');return;}
  modal='ai-preview';render();
}
else if(action==='connect'||action==='build'||action==='clear'||action==='show-plan'||action==='show-sign'){modal=action;render();}""")
# ensure on clear clear token too
s=s.replace('window.StudioNative.clearSavedFile();modal=null;', 'window.StudioNative.clearSavedFile();window.StudioNative.clearGateway();gatewayInfo={configured:false,url:\'\'};modal=null;')
# add helper before copyAiContext
f='function copyAiContext(){'
add='''function saveGateway(){if(!native)return notify('Koneksi AI hanya tersedia di Android.');
 const url=(document.getElementById('gatewayUrl')||{}).value||'';
 const token=(document.getElementById('gatewayToken')||{}).value||'';
 if(!/^https:\\/\\/[^/\\s]+\\/?$/.test(url.trim()))return notify('Alamat harus origin HTTPS tanpa jalur tambahan.');
 try{window.StudioNative.configureGateway(url.trim(),token);notify('Menyimpan konfigurasi secara aman…');}catch(e){notify('Gagal memulai konfigurasi gateway.');}
}
function sendToCodex(){if(!native||!reportReady()||!gatewayInfo.configured)return;
 const context=JSON.parse(aiContext());modal=null;state.aiStatus='running';state.aiMessage='Menyiapkan permintaan AI…';state.aiReply=null;persist();render();
 try{window.StudioNative.sendAi(JSON.stringify({consent:true,question:state.aiDraft,context}));}catch(e){state.aiStatus='error';state.aiMessage='Permintaan gagal dijalankan';persist();render();}
}
function aiUpdate(update){if(!update||typeof update!=='object')return;
 state.aiStatus=update.status;state.aiMessage=String(update.message||'').slice(0,600);
 if((update.status==='configured'||update.status==='cleared'||update.status==='connected')&&update.data){gatewayInfo={configured:!!update.data.configured,url:String(update.data.url||'')};}
 if(update.status==='done'&&update.data&&update.data.analysis){state.aiReply=update.data.analysis;}
 persist();render();if(update.status==='error')notify('Gateway: '+state.aiMessage);
}
'''
s=s.replace(f,add+f,1)
s=s.replace('onNativeFile:projectFrom,onInspectionUpdate:inspectionUpdate,','onNativeFile:projectFrom,onInspectionUpdate:inspectionUpdate,onAiUpdate:aiUpdate,')
s=s.replace("if(native){try{const saved=JSON.parse(window.StudioNative.savedFile());", "if(native){try{const status=JSON.parse(window.StudioNative.gatewayStatus());gatewayInfo={configured:!!status.configured,url:String(status.url||'')};}catch(e){}try{const saved=JSON.parse(window.StudioNative.savedFile());")
s=s.replace('report=null;persist();render();notify(\'Berkas dipilih.', 'report=null;state.aiStatus=\'idle\';state.aiReply=null;state.aiMessage=\'\';persist();render();notify(\'Berkas dipilih.')
# v04 tests show more flows
p.write_text(s)
