/* APK Reverse Studio v1.0 — durable metadata analysis job queue + offline signing pipeline. */
(function(){
'use strict';
const STORAGE_KEY='apk_reverse_studio_ui_v1';
const MAX_BYTES=40*1000*1000*1000;
const EXTS=['apk','aab','apks','apkm','xapk','zip','obb'];
const root=document.getElementById('app');
const native=typeof window.StudioNative!=='undefined';
let directInfo={connected:false,allowed:false,email:''};
let directModels=[];
const glyph={
 cube:'<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="M3 7v10l9 5 9-5V7M12 12v10"/>',
 house:'<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
 folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9H3z"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
 bot:'<rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 3v4M9 3h6M9 14h.01M15 14h.01M8 20v2M16 20v2"/>',
 build:'<path d="M14 7a5 5 0 0 0 7 6l-9 9-4-4 9-9a5 5 0 0 0-6-7l3 3z"/><path d="m5 2 5 5M3 4l4-2"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M19 13.5a7.2 7.2 0 0 0 0-3l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-2.6-1.5L13.6 2h-3.2l-.4 3a7.4 7.4 0 0 0-2.6 1.5l-2.4-1L3 8.9l2 1.6a7.2 7.2 0 0 0 0 3l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 2.6 1.5l.4 3h3.2l.4-3a7.4 7.4 0 0 0 2.6-1.5l2.4 1 2-3.4z"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 arrowUp:'<path d="M7 17 17 7M8 7h9v9"/>',
 up:'<path d="M12 20V4m-7 7 7-7 7 7"/>',
 check:'<path d="m4 12 5 5L20 6"/>',
 chevron:'<path d="m9 18 6-6-6-6"/>',
 down:'<path d="m6 9 6 6 6-6"/>',
 shield:'<path d="M12 2 21 6v6c0 5-4 8-9 10-5-2-9-5-9-10V6z"/><path d="m9 12 2 2 4-4"/>',
 info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6m0-10h.01"/>',
 alert:'<path d="m12 3 10 18H2z"/><path d="M12 9v5m0 3h.01"/>',
 file:'<path d="M5 2h9l5 5v15H5z"/><path d="M14 2v6h5M8 12h8m-8 4h8"/>',
 code:'<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16"/>',
 layers:'<path d="m12 2 10 6-10 6L2 8zM2 12l10 6 10-6M2 16l10 6 10-6"/>',
 database:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 4 18 4 18 0V5M3 12c0 4 18 4 18 0"/>',
 package:'<path d="M3 7 12 2l9 5v10l-9 5-9-5zM3 7l9 5 9-5M12 12v10M7 4l9 5"/>',
 lock:'<rect x="5" y="10" width="14" height="12" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3M12 15v2"/>',
 spark:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z"/>',
 terminal:'<rect x="2" y="3" width="20" height="18" rx="3"/><path d="m6 9 4 3-4 3m6 0h5"/>',
 key:'<circle cx="8" cy="16" r="4"/><path d="M11 13 21 3m-5 5 3 3"/>',
 copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3"/>',
 trash:'<path d="M3 6h18M8 6V3h8v3m3 0-1 15H6L5 6m5 4v7m4-7v7"/>',
 cloud:'<path d="M6 19a4 4 0 0 1 0-8h1a6 6 0 0 1 11-3 5.5 5.5 0 0 1 1 11z"/>',
 phone:'<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 x:'<path d="M5 5l14 14M19 5 5 19"/>',
 cpu:'<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 9h6v6H9zM9 1v5m6-5v5M9 18v5m6-5v5M1 9h5m-5 6h5m12-6h5m-5 6h5"/>',
 refresh:'<path d="M20 7v5h-5M4 17v-5h5M5.5 9a7 7 0 0 1 12-3l2.5 1M4 17l2.5 1A7 7 0 0 0 19 15"/>',
 text:'<path d="M4 5h16M12 5v14m-5 0h10"/>',
 archive:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 8h18m-12 4h6m-5 4h4"/>',
 download:'<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
 wifi:'<path d="M2 9a15 15 0 0 1 20 0M5 13a10 10 0 0 1 14 0M9 17a5 5 0 0 1 6 0M12 21h.01"/>',
 bell:'<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5zM10 21h4"/>'
};
function icon(name,size=20){return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" aria-hidden="true">'+(glyph[name]||glyph.cube)+'</svg>'}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function defaultState(){return {route:'dashboard',project:null,history:[],selectedTree:'manifest',aiDraft:'',notes:'',sections:['Manifest','Permissions','DEX'],buildName:'',buildMode:'resources',showMetadata:true,acceptConsent:false,analysisStatus:'idle',analysisMessage:'',entryQuery:'',activeEntry:'',aiStatus:'idle',aiMessage:'',aiReply:null,symbolQuery:'',symbolSelected:'',symbolBookmarks:{},apktoolQuery:'',jobFocusId:'',aiHistory:[],aiModel:'',aiRequestProjectId:''};}
function readState(){try{const p=JSON.parse(localStorage.getItem(STORAGE_KEY));const base=defaultState();if(!p||typeof p!=='object')return base;return {...base,...p,route:['dashboard','explorer','analysis','code','apktool','assistant','jobs','build','settings'].includes(p.route)?p.route:'dashboard'};}catch(e){return defaultState();}}
let state=readState();let report=null;let modal=null;let toastTimer=null;let pendingAiPayload=null;
let workspace=null;let workspaceFile=null;let workspaceDraft='';
let apktoolWorkspace=null;let apktoolFile=null;let apktoolDraft='';
let buildReceipt=null;
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(e){notify('Penyimpanan lokal penuh. Periksa kapasitas perangkat.');}}
function sizeText(bytes){if(typeof bytes!=='number'||bytes<0)return 'Tidak diketahui';if(bytes===0)return '0 B';const names=['B','KB','MB','GB','TB'];const unit=Math.min(Math.floor(Math.log(bytes)/Math.log(1024)),4);return (bytes/(1024**unit)).toLocaleString('id-ID',{maximumFractionDigits:unit===0?0:2})+' '+names[unit];}
function filenameExt(filename){const str=String(filename||'').toLowerCase();return str.split('.').pop();}
function stamp(ts){try{return new Date(ts).toLocaleString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch(e){return 'Tidak diketahui';}}
function route(name){state.route=name;persist();render();window.scrollTo(0,0);}
function navButton(name,title,symbol){return '<button type="button" class="nav-button '+(state.route===name?'active':'')+'" data-action="route" data-target="'+name+'">'+icon(symbol,18)+'<span>'+title+'</span>'+(state.route===name?'<i class="mini-dot"></i>':'')+'</button>';}
function miniNavButton(name,title,symbol){return '<button type="button" class="mobile-tab '+(state.route===name?'active':'')+'" data-action="route" data-target="'+name+'" aria-label="'+title+'">'+icon(symbol,19)+'<span>'+title+'</span></button>';}
function badge(text,kind='grey'){return '<span class="pill '+kind+'">'+(kind==='teal'?'<span class="dot"></span>':'')+esc(text)+'</span>';}
function note(text,kind='note'){return '<div class="'+kind+'">'+icon(kind==='warn'?'alert':'info',17)+'<div>'+text+'</div></div>';}
function top(name,description,action){return '<div class="page-intro"><div><div class="eyebrow">WORKSPACE / '+esc(name.toUpperCase())+'</div><h1 class="heading">'+name+'</h1><p class="subtitle">'+description+'</p></div>'+(action||'')+'</div>';}
function section(title,caption,action){return '<div class="section-head"><div><h2 class="section-title">'+title+'</h2>'+(caption?'<div class="section-desc">'+caption+'</div>':'')+'</div>'+(action||'')+'</div>';}
function cardInfo(title,value){return '<div class="info-row"><span>'+title+'</span><strong>'+esc(value)+'</strong></div>';}
function selectedFile(){return state.project||null;}
function reportReady(){return !!(report && selectedFile() && Number(report.sourceSelectedAt)===Number(state.project.selectedAt));}
function reportCount(name){return reportReady() ? Number((report.counts||{})[name]||0) : 0;}
function inspectCta(){return '<button class="main-action" data-action="inspect" '+(!selectedFile()||state.analysisStatus==='running'||!native?'disabled':'')+'>'+icon('search',16)+' '+(state.analysisStatus==='running'?'Membaca…':'Analisis Struktur APK')+'</button>';}
function resultBadge(){return reportReady()?badge('TERINDEKS','teal'):state.analysisStatus==='running'?badge('BERJALAN','blue'):badge('BELUM DIPERIKSA','amber');}
function escapeReportText(value){return esc(String(value===undefined||value===null?'—':value));}

function importCta(extra=''){return '<button class="main-action '+extra+'" data-action="pick">'+icon('folder',16)+' Pilih Berkas Android '+icon('arrow',15)+'</button>';}
function dashboard(){
const f=selectedFile();
const stats=[{label:'TARGET UKURAN INPUT',value:'0 – 40 GB',detail:'Baca indeks tanpa ekstraksi',icon:'database'},{label:'FORMAT INPUT',value:'7 format',detail:'APK / AAB / split / arsip',icon:'archive'},{label:'PRIVASI DATA',value:'Izin AI',detail:'Analisis lokal; AI opt-in',icon:'shield'}];
return top('Pusat Kendali', 'Seluruh proyek reverse engineering, pemeriksaan berkas, AI Analyst, dan perakitan APK dalam satu ruang kerja.')+
'<section class="dashboard-hero"><div class="hero-info"><div class="hero-top">ANDROID REVERSE ENGINEERING WORKSPACE</div><div class="hero-title">Bedah struktur aplikasi.<br><span style="color:var(--teal)">Rancang perubahan dengan kendali penuh.</span></div><p class="hero-copy">v1.0: inspeksi APK, editor patch, signing offline, dan analisis AI dengan login ChatGPT. Tidak ada unggahan otomatis.</p><div class="button-row">'+importCta()+'<button class="secondary-action" data-action="route" data-target="explorer">'+icon('layers',16)+' Lihat Workspace</button></div></div><div class="hero-symbol">'+icon('cube',83)+'</div></section>'+
'<div class="stat-grid">'+stats.map(t=>'<div class="stat"><div><small>'+t.label+'</small><strong>'+t.value+'</strong><span>'+t.detail+'</span></div><span class="stat-icon">'+icon(t.icon,22)+'</span></div>').join('')+'</div>'+
section('Proyek aktif','Berkas yang Anda pilih akan diingat saat aplikasi dibuka kembali.', '<button class="section-link" data-action="route" data-target="explorer">Buka Explorer '+icon('arrow',14)+'</button>')+
'<div class="panel">'+(f?'<div class="project-card"><div class="file-emblem">'+icon('package',28)+'</div><div><h3>'+esc(f.name)+'</h3><p>'+sizeText(f.size)+' &nbsp;·&nbsp; '+esc(filenameExt(f.name).toUpperCase())+' &nbsp;·&nbsp; '+stamp(f.selectedAt)+'</p><p>'+(reportReady()?'Hasil inspeksi tersimpan • Indeks tersedia':'Berkas dipilih • Tekan Analisis Struktur')+'</p></div><div class="project-actions"><button class="secondary-action sm-action" data-action="route" data-target="explorer">'+icon('folder',14)+' Jelajahi</button><button class="ghost-action sm-action" data-action="copy">'+icon('copy',14)+' Salin info</button></div></div>':'<div class="empty-state">'+icon('folder',32)+'<strong>Belum ada proyek aktif</strong><p>Mulai dengan memilih APK atau paket Android. Analisis struktur ZIP/ZIP64 tersedia di aplikasi Android.</p></div>')+'</div>'+
section('Modul Studio','Analisis lokal dan peninjauan patch aktif; build dan signing memerlukan alat SDK offline.')+
'<div class="module-grid">'+[
['explorer','folder','File Explorer','Telusuri Manifest, DEX, resources, assets, native libs.'],
['analysis','search','Reverse Engineering','Baca struktur, permission, DEX, paket bersarang, dan teknologi yang terindikasi.'],
['assistant','bot','AI Analyst','Analisis metadata melalui akun ChatGPT yang diotorisasi langsung.'],
['jobs','database','Riwayat AI','Tinjau hasil analisis yang tersimpan lokal di perangkat.'],
['build','build','Build & Repack','Atur perubahan, validasi, zipalign, sign, dan export APK.'],
['settings','shield','Local-first','Data proyek dan patch tersimpan privat; kontrol privasi tetap pada pengguna.'],
['code','terminal','JADX Source Workspace','Impor paket hasil JADX, tinjau kode Java, simpan patch privat.']
].map(m=>'<button type="button" data-action="route" data-target="'+m[0]+'" class="module" style="text-align:left;cursor:pointer"><div class="module-top"><span class="module-icon">'+icon(m[1],19)+'</span>'+icon('arrowUp',13)+'</div><strong>'+m[2]+'</strong><p>'+m[3]+'</p><span class="tag">BUKA MODUL</span></button>').join('')+'</div>';
}
const trees=[['manifest','AndroidManifest.xml','file','Manifest, komponen, permission'],['dex','classes.dex','code','DEX: header dan descriptor kelas (bukan kode sumber)'],['res','res/','folder','Layout, drawable, strings'],['assets','assets/','folder','Berkas dan data tersemat'],['lib','lib/','cpu','Library native .so'],['meta','META-INF/','shield','Sertifikat dan metadata signing'],['other','Lainnya / Split','layers','Modul, konfigurasi dan arsip']];
function explorer(){
const f=selectedFile();const current=trees.find(t=>t[0]===state.selectedTree)||trees[0];const ready=reportReady();
const groupEntries=ready?(report.entries||[]).filter(e=>e.group===state.selectedTree):[];
const filtered=groupEntries.filter(e=>String(e.name||'').toLowerCase().includes((state.entryQuery||'').toLowerCase()));
const chosen=filtered.find(e=>e.name===state.activeEntry)||filtered[0]||null;
const list=filtered.length?'<div class="indexed-files">'+filtered.slice(0,250).map(e=>'<button class="indexed-file '+(chosen&&chosen.name===e.name?'active':'')+'" data-action="entry" data-target="'+esc(e.name)+'">'+icon('file',14)+'<span>'+esc(e.name)+'</span><em>'+sizeText(Number(e.uncompressedSize))+'</em></button>').join('')+'</div>':'<div class="preview-placeholder slim">'+icon('search',30)+'<strong>Belum ada entri untuk kategori/pencarian ini</strong></div>';
const detail=chosen?'<div class="file-inspector"><div class="label-muted">DETAIL ENTRI ASLI</div><h3>'+esc(chosen.name)+'</h3><div class="info-rows">'+cardInfo('Ukuran asli',sizeText(Number(chosen.uncompressedSize)))+cardInfo('Terkompresi',sizeText(Number(chosen.compressedSize)))+cardInfo('Metode ZIP',String(chosen.method))+cardInfo('CRC32 (klaim ZIP)',Number(chosen.crc32).toString(16).padStart(8,'0').toUpperCase())+cardInfo('Enkripsi ZIP',chosen.encrypted?'Ya':'Tidak')+'</div></div>':'';
return top('File Explorer','Struktur asli berkas diperoleh dari indeks ZIP/ZIP64 secara read-only.',importCta())+
'<div class="three-col"><aside class="panel tight"><div class="label-muted">PROJECT ROOT</div><div class="project-root-name">'+esc(f?f.name:'Belum ada berkas')+'</div><div class="tree-list">'+trees.map(t=>'<button class="tree-item '+(state.selectedTree===t[0]?'active':'')+'" data-action="tree" data-target="'+t[0]+'">'+icon(t[2],15)+'<span>'+esc(t[1])+'</span>'+(ready?'<span class="tree-meta">'+reportCount(t[0])+'</span>':icon('chevron',12))+'</button>').join('')+'</div><div class="divider"></div>'+resultBadge()+'</aside><section class="panel file-preview"><div class="section-head" style="margin-top:0"><div><div class="label-muted">ISI KATEGORI</div><h3 style="font-size:15px;margin:9px 0 0">'+esc(current[1])+'</h3></div>'+resultBadge()+'</div>'+
(ready?'<div class="field"><label>Cari nama berkas (indeks ditampilkan terbatas)</label><input id="entryQuery" value="'+esc(state.entryQuery||'')+'" placeholder="Cari file / folder …" maxlength="200" /></div><div class="mini-description">'+filtered.length+' entri ditampilkan dari '+reportCount(state.selectedTree)+' entri kategori. Tidak ada file yang diekstrak.</div>'+list+detail:'<div class="preview-placeholder">'+icon(current[2],47)+'<strong>'+esc(current[3])+'</strong><p>'+(f?'Berkas telah dipilih. Tekan Analisis Struktur APK untuk mengindeks file asli.':'Pilih paket APK atau arsip Android untuk mulai memeriksa struktur.')+'</p>'+inspectCta()+'</div>')+
'<div class="section-head"><h3 class="section-title">Metadata sumber</h3></div><div class="info-rows">'+cardInfo('Nama input',f?f.name:'Belum dipilih')+cardInfo('Ukuran',f?sizeText(f.size):'—')+cardInfo('Format input',f?filenameExt(f.name).toUpperCase():'—')+cardInfo('Status',ready?'Indeks selesai':state.analysisStatus==='error'?'Gagal diindeks':'Belum diindeks')+'</div></section></div>'+
'<div style="margin-top:16px">'+note('Ini adalah indeks nama dan metadata berkas ZIP yang benar-benar ditemukan. Manifest biner dan ringkasan DEX tersedia di menu Analisis; kode Java/Smali lengkap belum didekompilasi. Batas tampilan per kategori mencegah antarmuka melambat.')+'</div>';
}
const detectors=[['archive','Inspeksi arsip','Indeks ZIP64, duplikasi dan pemeriksaan risiko'],['file','Manifest biner','Package name, SDK, komponen dan permission (root APK)'],['code','Metadata DEX','Header, jumlah class/method ID, contoh nama kelas'],['layers','Resource table','Header, nama paket dan contoh tipe/kunci resource'],['cpu','Native inspection','Header ELF 32/64 bit dan arsitektur CPU (sampel)'],['shield','Signing inspection','Deteksi blok v2/v3; belum verifikasi kriptografis']];

function deepContent(){return reportReady() && report.deep && typeof report.deep==='object' ? report.deep : null;}
function depthPanel(){
 const deep=deepContent();
 if(!deep)return reportReady()?'<div style="margin-top:14px">'+note('Laporan versi lama berhasil dipulihkan. Jalankan Analisis Struktur APK lagi untuk memperoleh metadata v0.5.')+'</div>':'';
 const m=deep.manifest||{}, r=deep.resources||{}, dex=Array.isArray(deep.dexFiles)?deep.dexFiles:[];
 const manifestInfo=m.status==='ok' ?
   '<div class="info-rows">'+[
    ['Nama paket',m.packageName||'Tidak terbaca'],['Version code',m.versionCode||'—'],['Version name',m.versionName||'—'],
    ['Minimum SDK',m.minSdk||'—'],['Target SDK',m.targetSdk||'—'],['Label aplikasi',m.applicationLabel||'—'],
    ['Permission',String(m.permissionCount||0)]].map(item=>cardInfo(item[0],item[1])).join('')+'</div>'+
   '<h4 class="deep-mini-head">Permission yang ditemukan</h4><div class="deep-tags">'+((m.permissions||[]).length?(m.permissions||[]).slice(0,50).map(t=>'<code>'+esc(t)+'</code>').join(''):'<span class="mini-description">Tidak ada permission yang tercatat dalam node yang didukung.</span>')+'</div>'+
   '<h4 class="deep-mini-head">Komponen aplikasi</h4><div class="mini-description">'+Object.entries(m.components||{}).map(([k,v])=>esc(k)+': '+esc(v)).join(' • ')+'</div>'+
   '<div class="deep-code-list">'+(m.componentExamples||[]).slice(0,30).map(v=>'<div>'+icon('code',13)+'<span>'+esc(v)+'</span></div>').join('')+'</div>'
   : '<p class="mini-description">'+esc(m.reason||m.note||(m.status==='missing'?'Tidak ada AndroidManifest.xml pada akar paket. Untuk XAPK / APKS, manifest mungkin berada dalam APK tertanam.':'Format belum dapat didekode'))+'</p>';
 const dexInfo=dex.length ? dex.map(d=>'<details class="deep-dex-item"><summary><span>'+icon('code',16)+' '+esc(d.name)+'</span>'+badge(d.status==='ok'?'TERBACA':'DIBATASI',d.status==='ok'?'teal':'amber')+'</summary>'+
   (d.status==='ok'?'<div class="info-rows">'+cardInfo('DEX version',d.version)+cardInfo('Class defs',d.classDefs)+cardInfo('Method IDs',d.methodIds)+cardInfo('Field IDs',d.fieldIds)+cardInfo('String IDs',d.stringIds)+cardInfo('Tingkat inspeksi',d.inspectionDepth)+'</div>'+((d.classExamples||[]).length?'<h4 class="deep-mini-head">Contoh kelas terdefinisi</h4><div class="deep-code-list">'+d.classExamples.map(x=>'<div>'+icon('code',13)+'<span>'+esc(x)+'</span></div>').join('')+'</div>':''):
     '<div class="mini-description">'+esc(d.reason||'Tidak terbaca')+'</div>')+'</details>').join(''):'<div class="mini-description">Tidak ada classes*.dex di akar arsip yang dapat dianalisis.</div>';
 const resourceInfo=r.status==='ok'?'<div class="info-rows">'+cardInfo('Jumlah paket ARSC',r.packageCount)+cardInfo('Ukuran tabel menurut header',sizeText(Number(r.declaredSize)))+cardInfo('Cakupan',r.scope)+'</div>'+((r.packagesPreview||[]).map(v=>'<details class="deep-dex-item"><summary>'+esc(v.name||'Paket tanpa nama')+' · ID '+esc(v.id)+'</summary><p class="mini-description">Tipe ('+esc(v.types&&v.types.count||0)+'): '+esc((v.types&&v.types.examples||[]).join(', '))+'</p><p class="mini-description">Kunci ('+esc(v.keys&&v.keys.count||0)+'): '+esc((v.keys&&v.keys.examples||[]).join(', '))+'</p></details>').join('')):'<div class="mini-description">'+esc(r.reason||'resources.arsc tidak ditemukan atau tidak didukung dalam berkas root.')+'</div>';
 const warning=(deep.warnings||[]).map(w=>note(esc(w),'warn')).join('');
 return section('Analisis Binary Metadata v0.5','Hasil dibaca langsung dari berkas; bukan kode Java/Smali dan bukan verifikasi tanda tangan.')+
   '<div class="deep-grid"><section class="panel"><div class="deep-title">'+icon('file',18)+' <h3>AndroidManifest.xml</h3>'+badge(m.status==='ok'?'TERBACA':m.status==='missing'?'TIDAK ADA':'TERBATAS',m.status==='ok'?'teal':'amber')+'</div>'+manifestInfo+'</section>'+
   '<section class="panel"><div class="deep-title">'+icon('layers',18)+' <h3>resources.arsc</h3>'+badge(r.status==='ok'?'HEADER TERBACA':'TERBATAS',r.status==='ok'?'teal':'amber')+'</div>'+resourceInfo+'<div class="divider"></div><p class="mini-description">Pembacaan tabel hanya sampai header. Nama dan nilai resource belum diterjemahkan.</p></section></div>'+
   section('DEX — Struktur Kode','Jumlah class dan method ID diambil dari header DEX, contoh nama kelas hanya pada DEX kecil.')+
   '<div class="panel">'+dexInfo+'</div>'+(warning?'<div style="margin-top:12px" class="issues">'+warning+'</div>':'')+
   '<div style="margin-top:12px">'+note('Analisis ini tidak mengeksekusi aplikasi dan tidak memodifikasi APK. Data permission berasal dari Manifest, bukan bukti perilaku berbahaya. Kode Java/Kotlin/Smali lengkap dan decoding isi resource belum tersedia.')+'</div>';
}

function symbolPanel(){
 if(!reportReady() || Number(report.schemaVersion||0)<6)return '';
 const dx=report.dexSymbols||{};const classes=Array.isArray(dx.classes)?dx.classes:[];
 const methods=Array.isArray(dx.methods)?dx.methods:[];
 const q=String(state.symbolQuery||'').toLocaleLowerCase();
 const matches=c=>String(c.name||c.signature||'').toLocaleLowerCase().includes(q);
 const filteredClasses=classes.filter(matches).slice(0,60);
 const filteredMethods=methods.filter(matches).slice(0,70);
 const selected=classes.find(c=>c.name===state.symbolSelected)||null;
 const bookmark=selected?String((state.symbolBookmarks||{})[selected.name]||''):'';
 const fileRows=(dx.files||[]).map(f=>'<div class="info-row"><span>'+esc(f.name)+'</span><strong>'+esc(f.status==='indexed'?'Simbol tersedia':f.status==='limit_size'?'Terlalu besar':'Tidak terindeks')+'</strong></div>').join('');
 return section('Penjelajah Simbol DEX v0.6','Nama class dan signature metode yang benar-benar terdefinisi dalam DEX. Bukan hasil dekompilasi source Java/Kotlin.')+
 '<div class="panel"><div class="symbol-summary">'+badge('READ-ONLY','teal')+'<span>'+classes.length+' kelas ditampilkan · '+methods.length+' metode ditampilkan</span>'+ (dx.truncated?badge('SAMPEL DIBATASI','amber'):'')+'</div>'+fileRows+
 '<div class="field"><label for="symbolQuery">Cari kelas atau metode (hasil yang tersedia)</label><input id="symbolQuery" type="search" placeholder="Contoh: Activity, onCreate, Lcom/…" value="'+esc(state.symbolQuery||'')+'" autocomplete="off" /></div>'+
 '<div class="symbol-layout"><div class="symbol-results"><h4>Definisi kelas ('+filteredClasses.length+')</h4>'+ (filteredClasses.length?filteredClasses.map(c=>'<button type="button" class="symbol-row '+(state.symbolSelected===c.name?'active':'')+'" data-action="select-symbol" data-target="'+esc(c.name)+'">'+icon('code',14)+'<span>'+esc(c.name)+'</span><small>'+esc(c.methodCount||0)+' metode</small></button>').join(''):'<p class="mini-description">Tidak ada kelas yang cocok dalam pratinjau.</p>')+'</div><div class="symbol-results"><h4>Metode terdefinisi ('+filteredMethods.length+')</h4>'+(filteredMethods.length?filteredMethods.map(m=>'<div class="symbol-line">'+icon('terminal',14)+'<span>'+esc(m.signature)+'</span></div>').join(''):'<p class="mini-description">Tidak ada metode yang cocok dalam pratinjau.</p>')+'</div></div>'+
 (selected?'<div class="symbol-detail"><h4>Catatan kelas: '+esc(selected.name)+'</h4><p class="mini-description">'+esc(selected.dex)+' · '+esc(selected.methodCount)+' metode terdefinisi pada file kelas ini</p><textarea id="symbolNote" maxlength="3000" placeholder="Catat temuan atau rencana perubahan. Tidak mengedit isi APK.">'+esc(bookmark)+'</textarea><small>Catatan tersimpan otomatis di perangkat untuk proyek ini.</small></div>':'')+
 '<div style="margin-top:13px">'+note('DEX disusun dari bytecode, sehingga signature dapat dicari tetapi badan metode dan kode Java/Smali belum tersedia. Sampel maksimum 4 DEX × 8 MiB; tidak semua kelas berkas besar akan muncul. Untuk dekompilasi sumber, lihat tool JADX CLI yang disertakan dalam paket.')+'</div></div>';
}

function apktoolPage(){
 const files=apktoolWorkspace&&Array.isArray(apktoolWorkspace.files)?apktoolWorkspace.files:[];
 const query=String(state.apktoolQuery||'').toLowerCase();
 const shown=files.filter(x=>String(x.path||'').toLowerCase().includes(query)).slice(0,140);
 const changed=new Set(apktoolWorkspace&&Array.isArray(apktoolWorkspace.changedPaths)?apktoolWorkspace.changedPaths:[]);
 const active=apktoolFile&&apktoolFile.status==='ok'?apktoolFile:null;
 const editor=active?'<div class="code-editor-bar"><div><strong>'+esc(active.path)+'</strong><p>Baseline SHA-256 '+esc(active.originalSha256.slice(0,18))+'… · '+(active.modified?'Patch tersimpan':'Belum diubah')+'</p></div>'+badge(active.modified?'PATCH':'REVIEW',active.modified?'amber':'teal')+'</div>'+
 '<div class="field"><label for="apktoolCode">Salinan kerja Smali / XML <span id="apktool-dirty"></span></label><textarea id="apktoolCode" class="source-editor" spellcheck="false" maxlength="393216">'+esc(apktoolDraft)+'</textarea></div>'+
 '<div class="button-row"><button class="main-action" data-action="save-apktool">'+icon('check',16)+' Validasi & Simpan Patch</button><button class="secondary-action" data-action="reset-apktool">'+icon('refresh',16)+' Kembali ke Baseline</button><button class="ghost-action" data-action="copy-apktool">'+icon('copy',15)+' Salin</button></div>'+
 '<p class="mini-description">Pemeriksaan Smali/XML bersifat awal, tidak menggantikan compiler atau tes runtime. Isi patch tersimpan setelah memilih Simpan Patch.</p>':
 '<div class="preview-placeholder">'+icon('terminal',34)+'<strong>Pilih source untuk diedit</strong><p>Impor ZIP review Apktool agar daftar Smali dan XML tersedia.</p></div>';
 return top('Apktool / Smali Workspace','Lihat dan edit salinan Smali serta XML resource dari APK yang Anda miliki atau punya izin.')+
 '<div class="panel"><div class="symbol-summary">'+badge('v0.8 • OFFLINE APKTOOL','teal')+'<span>'+(apktoolWorkspace?'Review aktif: '+files.length+' file · '+changed.size+' patch tersimpan':'Belum ada bundle Apktool')+'</span></div>'+
 '<p class="mini-description">Jalankan tools/apktool-workflow.py di komputer/server dengan Apktool CLI resmi untuk decode dan membuat bundle. Pilih APK sumber yang sama di Android, lalu impor ZIP. Batas bundle 48 MiB, maksimal 320 file terpilih.</p>'+
 '<div class="button-row"><button class="main-action" data-action="import-apktool" '+(!native||!selectedFile()?'disabled':'')+'>'+icon('folder',16)+' Impor Bundle Apktool</button><button class="secondary-action" data-action="export-apktool" '+(!native||!apktoolWorkspace?'disabled':'')+'>'+icon('download',16)+' Ekspor Patch JSON</button><button class="ghost-action" data-action="route" data-target="code">'+icon('code',15)+' Lihat Java JADX</button></div>'+
 (apktoolWorkspace?'<div class="info-rows">'+cardInfo('APK sumber',apktoolWorkspace.meta&&apktoolWorkspace.meta.sourceFile)+cardInfo('Jumlah source',files.length)+cardInfo('File terlewati',apktoolWorkspace.meta&&apktoolWorkspace.meta.skippedFiles)+cardInfo('Identitas','Nama/ukuran cocok; SHA APK diverifikasi saat prepare offline')+'</div>':'')+'</div>'+
 '<div class="source-layout"><div class="panel"><div class="field"><label for="apktoolQuery">Cari path Smali / XML</label><input id="apktoolQuery" type="search" placeholder="smali/demo atau res/values" value="'+esc(state.apktoolQuery)+'" maxlength="160" /></div><div class="source-list">'+(shown.length?shown.map(x=>'<button class="source-row '+(active&&active.path===x.path?'active':'')+'" data-action="open-apktool" data-target="'+esc(x.path)+'">'+icon(x.path.endsWith('.smali')?'terminal':'file',14)+'<span>'+esc(x.path.replace(/^tree\//,''))+'</span>'+(changed.has(x.path)?badge('PATCH','amber'):'')+'</button>').join(''):'<p class="mini-description">Tidak ada berkas yang cocok. Pilih bundle atau ubah pencarian.</p>')+'</div></div><div class="panel"><h3 class="section-title">Editor Smali / XML</h3>'+editor+'</div></div>'+
 '<div style="margin-top:14px">'+note('Patch hanya disimpan lokal dan diekspor sebagai JSON. Alur prepare offline memeriksa hash APK, hash baseline, serta struktur patch sebelum membuat salinan proyek. Perintah build Apktool menghasilkan APK unsigned, belum APK siap instal.','warn')+'</div>';
}
function onApktoolUpdate(value){if(!value||typeof value!=='object')return;
 if(value.workspace&&value.workspace.status==='ready'){apktoolWorkspace=value.workspace;apktoolFile=null;apktoolDraft='';}
 notify(value.message||'Status Apktool berubah');render();
}
function openApktool(path){if(!native||!apktoolWorkspace)return;
 if(apktoolFile&&apktoolFile.path!==path&&apktoolDraft!==apktoolFile.content){notify('Simpan perubahan sebelum mengganti file.');return;}
 try{const x=JSON.parse(window.StudioNative.openApktoolSource(path));if(x.status!=='ok'){notify(x.message||'Gagal membuka');return;}
 apktoolFile=x;apktoolDraft=String(x.content||'');render();}
 catch(e){notify('Tidak dapat membuka source Apktool');}
}
function saveApktool(reset){if(!native||!apktoolFile)return;
 try{const result=JSON.parse(reset?window.StudioNative.resetApktoolPatch(apktoolFile.path):window.StudioNative.saveApktoolPatch(apktoolFile.path,apktoolDraft));
 if(result.status!=='ok'){notify(result.message||'Patch tidak lolos preflight');return;}
 apktoolWorkspace.changedPaths=Array.from(result.changedPaths||[]);
 const path=apktoolFile.path;apktoolFile=null;apktoolDraft='';openApktool(path);
 notify(reset?'File dikembalikan ke baseline.':'Patch Smali/XML lolos preflight awal dan tersimpan.');}
 catch(e){notify('Penyimpanan patch gagal');}
}

function codeWorkspace(){
 const f=selectedFile();
 const files=workspace&&Array.isArray(workspace.sources)?workspace.sources:[];
 const q=String(state.workspaceQuery||'').toLowerCase();
 const filtered=files.filter(x=>String(x.path||'').toLowerCase().includes(q)).slice(0,120);
 const changed=new Set(workspace&&Array.isArray(workspace.changedPaths)?workspace.changedPaths:[]);
 const active=workspaceFile&&workspaceFile.status==='ok'?workspaceFile:null;
 const editor=active?'<div class="code-editor-bar"><div><strong>'+esc(active.path)+'</strong><p>Baseline SHA-256: '+esc(active.originalSha256.slice(0,16))+'… · '+(active.modified?'Patch tersimpan':'Belum diubah')+'</p></div>'+badge(active.modified?'PATCH TERSEDIA':'SOURCE REVIEW',active.modified?'amber':'teal')+'</div>'+
 '<div class="field"><label for="workspaceCode">Salinan kerja kode Java (tidak mengubah APK) <span id="editor-dirty"></span></label><textarea spellcheck="false" id="workspaceCode" maxlength="196608" class="source-editor">'+esc(workspaceDraft)+'</textarea></div>'+
 '<div class="button-row"><button class="main-action" data-action="save-source">'+icon('check',15)+' Simpan Patch</button><button class="secondary-action" data-action="reset-source">'+icon('refresh',15)+' Kembali ke Awal</button><button class="ghost-action" data-action="copy-source">'+icon('copy',15)+' Salin Teks</button></div><p class="mini-description">Simpan perubahan sebelum menutup aplikasi. Editor hanya menyimpan JSON patch; Java hasil JADX belum bisa langsung dibangun menjadi APK.</p>':
 '<div class="preview-placeholder">'+icon('code',36)+'<strong>Pilih satu file Java</strong><p>Daftar source tersedia setelah paket review JADX diimpor. File asli tetap read-only.</p></div>';
 return top('JADX Source Workspace','Penjelajah kode dekompilasi Java dengan editor salinan kerja yang tidak menimpa berkas asli.')+
 '<div class="panel"><div class="symbol-summary">'+badge('v0.7 REVIEW & PATCH','teal')+'<span>'+(workspace?'Bundle terimpor • '+files.length+' source Java • '+changed.size+' perubahan tersimpan':'Belum ada paket hasil JADX yang diimpor')+'</span></div>'+
 '<p class="mini-description">1. Jalankan JADX CLI secara lokal/di server tepercaya. 2. Jalankan tools/make-jadx-bundle.py. 3. Impor ZIP melalui tombol berikut. Ukuran maksimal 32 MiB dan 240 source Java.</p>'+
 '<div class="button-row"><button class="main-action" data-action="import-jadx" '+(!native||!f?'disabled':'')+'>'+icon('folder',16)+' Impor Paket JADX</button><button class="secondary-action" data-action="export-patches" '+(!native||!workspace?'disabled':'')+'>'+icon('download',16)+' Ekspor JSON Patch</button></div>'+
 (workspace?'<div class="info-rows">'+cardInfo('APK referensi',workspace.meta&&workspace.meta.sourceFile)+cardInfo('Ukuran APK sumber',sizeText(Number(workspace.meta&&workspace.meta.sourceBytes)))+cardInfo('Identitas APK','Nama/ukuran cocok; hash APK belum diverifikasi')+'</div>':'')+'</div>'+
 '<div class="source-layout"><div class="panel"><div class="field"><label>Cari path Java dalam paket</label><input id="workspaceQuery" type="search" placeholder="com/example/MainActivity" value="'+esc(state.workspaceQuery||'')+'" maxlength="160"></div><div class="source-list">'+(filtered.length?filtered.map(x=>'<button class="source-row '+(active&&active.path===x.path?'active':'')+'" data-action="open-source" data-target="'+esc(x.path)+'">'+icon('code',14)+'<span>'+esc(x.path.replace(/^sources\//,''))+'</span>'+(changed.has(x.path)?badge('PATCH','amber'):'')+'</button>').join(''):'<p class="mini-description">Tidak ada source yang ditemukan.</p>')+'</div></div><div class="panel"><h3 class="section-title">Editor Java (working copy)</h3>'+editor+'</div></div>'+
 '<div style="margin-top:16px">'+note('Ini adalah output pendekatan terbaik dari JADX dan bukan source asli yang terjamin akurat. Ekspor JSON patch memerlukan validasi manual sebelum dapat diterapkan ke sumber proyek yang sah. APK asli tidak berubah. Untuk patch Smali dan resource, gunakan menu Apktool / Smali.')+'</div>';
}
function onWorkspaceUpdate(value){if(!value||typeof value!=='object')return;
 if(value.workspace&&value.workspace.status==='ready'){workspace=value.workspace;workspaceFile=null;workspaceDraft='';}
 if(value.status==='error')notify(value.message||'Gagal mengimpor workspace');
 else notify(String(value.message||'Status workspace diperbarui'));
 render();
}
function openSource(path){if(!native||!workspace)return;if(workspaceFile&&workspaceFile.path!==path&&workspaceDraft!==workspaceFile.content){notify('Ada perubahan belum disimpan. Simpan Patch sebelum membuka file lain.');return;}try{const value=JSON.parse(window.StudioNative.openWorkspaceSource(path));
 if(value.status!=='ok')return notify(value.message||'Gagal membuka source');workspaceFile=value;workspaceDraft=String(value.content||'');render();
 }catch(e){notify('Source tidak dapat dibuka');}}
function patchSource(reset){if(!native||!workspaceFile)return;
 try{const result=JSON.parse(reset?window.StudioNative.resetWorkspacePatch(workspaceFile.path):window.StudioNative.saveWorkspacePatch(workspaceFile.path,workspaceDraft));
 if(result.status!=='ok')return notify(result.message||'Gagal menyimpan patch');
 workspace.changedPaths=Array.from(result.changedPaths||[]);
 const path=workspaceFile.path;openSource(path);notify(reset?'Source dikembalikan ke versi bundle.':'Patch tersimpan secara privat.');
 }catch(e){notify('Gagal menyimpan salinan kerja');}}

function analysis(){
const f=selectedFile();const ready=reportReady();
const steps=[['01','Indeks arsip','ZIP/ZIP64 dan daftar entri',ready?'Selesai':state.analysisStatus==='running'?'Berjalan':'Menunggu'],['02','Baca konten terpilih','Manifest, DEX dan header ARSC (dengan batas ukuran)',ready?'Selesai':state.analysisStatus==='running'?'Berjalan':'Menunggu'],['03','Inspeksi paket bersarang','Baca APK tertanam hingga batas aman',ready?'Selesai':'Menunggu'],['04','Profil dan temuan lokal','Indikasi bahasa, framework dan aturan risiko struktur',ready?'Selesai':'Menunggu'],['05','Signature, ELF dan integritas','Blok signing, header .so, sampel CRC32',ready&&report&&report.schemaVersion>=5?'Selesai':ready?'Belum tersedia':'Menunggu'],['06','Indeks simbol DEX','Class definitions dan metode terdefinisi, dengan batas keamanan',ready&&report&&report.schemaVersion>=6?'Selesai':ready?'Belum tersedia':'Menunggu'],['07','Simpan laporan','Hasil privat dipulihkan pada restart',ready?'Selesai':'Menunggu']];
const metrics=ready?'<div class="result-grid">'+[['ENTRI TOTAL',report.totalEntries],['DEX',report.dexCount],['LIBRARY NATIVE',reportCount('lib')],['PERINGATAN',(report.warnings||[]).length]].map(t=>'<div class="result-metric"><small>'+t[0]+'</small><strong>'+escapeReportText(t[1])+'</strong></div>').join('')+'</div><div class="info-rows">'+cardInfo('Jenis terindikasi',report.formatHint||'ZIP')+cardInfo('Central directory',sizeText(Number(report.centralOffset)))+cardInfo('ZIP64',report.zip64?'Ya':'Tidak')+cardInfo('Manifest ditemukan',report.hasManifest?'Ya':'Tidak')+cardInfo('resources.arsc',report.hasArsc?'Ditemukan':'Tidak ditemukan')+cardInfo('Signature META-INF',report.signatureMetadataPresent?'Ada metadata (belum diverifikasi)':'Tidak terdeteksi')+cardInfo('Total uncompressed (metadata)',sizeText(Number(report.totalUncompressed)))+'</div>'+((report.warnings||[]).length?'<div class="issues">'+report.warnings.map(w=>note(esc(w),'warn')).join('')+'</div>':note('Belum ditemukan indikator risiko yang diperiksa oleh pengindeks awal. Ini bukan audit keamanan lengkap.')):'';
return top('Reverse Engineering','Inspeksi lokal APK/XAPK/APKS: struktur ZIP64, APK bersarang, Manifest, DEX, bukti bahasa, dan temuan terukur.')+
'<div class="two-col"><div class="panel"><div class="section-head" style="margin-top:0"><div><h3 class="section-title">Pipeline Pemeriksaan v0.6</h3><div class="section-desc">Indeks, metadata, APK bersarang, dan aturan lokal dijalankan pada perangkat.</div></div>'+resultBadge()+'</div><div class="pipeline">'+steps.map(p=>'<div class="pipeline-step"><span class="pipeline-index">'+p[0]+'</span><div><strong>'+p[1]+'</strong><p>'+p[2]+'</p></div><span class="status">'+p[3]+'</span></div>').join('')+'</div><div class="button-row">'+inspectCta()+(state.analysisStatus==='running'&&native?'<button class="secondary-action" data-action="cancel-inspect">Batalkan</button>':'')+'<button class="secondary-action" data-action="route" data-target="explorer">'+icon('folder',16)+' File Explorer</button></div>'+(state.analysisMessage?'<p class="mini-description" style="margin-top:15px">'+esc(state.analysisMessage)+'</p>':'')+'</div><div class="panel"><h3 class="section-title no-top-margin">Hasil Nyata Inspeksi</h3>'+(ready?metrics:'<div class="info-rows">'+cardInfo('Berkas',f?f.name:'Belum dipilih')+cardInfo('Ukuran',f?sizeText(f.size):'—')+cardInfo('Proses aktif',state.analysisStatus==='running'?'Ya':'Tidak')+cardInfo('Laporan','Belum tersedia')+'</div>'+note('Mulai pemeriksaan dengan tombol di sebelah kiri. Pada browser preview, mesin native Android tidak tersedia.','warn'))+'</div></div>'+
depthPanel()+symbolPanel()+v04EvidencePanel()+v05InspectionPanel()+section('Modul Mesin Analisis','Status tiap kemampuan berdasarkan implementasi yang sebenarnya.')+
'<div class="module-grid">'+detectors.map((t,i)=>'<div class="module"><div class="module-top"><span class="module-icon">'+icon(t[0],18)+'</span>'+badge(i===0?'AKTIF':i===1?'AKTIF TERBATAS':i===5?'DETEKSI SAJA':'METADATA SAJA',i<6?'teal':'grey')+'</div><strong>'+t[1]+'</strong><p>'+t[2]+'</p></div>').join('')+'</div>';
}
function v04EvidencePanel(){
 if(!reportReady())return '';
 const langs=Array.isArray(report.languages)?report.languages:[];
 const nested=Array.isArray(report.bundledApks)?report.bundledApks:[];
 const insights=Array.isArray(report.localInsights)?report.localInsights:[];
 const tags=langs.length?langs.map(v=>'<div class="evidence-item"><strong>'+esc(v.technology)+'</strong><small>'+esc(v.confidence||'indikasi')+'</small><p>'+esc((v.evidence||[]).join(' · '))+'</p></div>').join(''):note('Tidak ditemukan bukti bahasa atau framework dari contoh berkas yang diindeks. Ini bukan bukti tidak adanya kode.');
 const packages=nested.length?nested.map(v=>'<details class="deep-dex-item"><summary><span>'+icon('package',15)+' '+esc(v.name)+'</span>'+badge(v.status==='ok'?'TERBACA':v.status==='metadata-only'?'TERBATAS':'GAGAL',v.status==='ok'?'teal':'amber')+'</summary><div class="info-rows">'+cardInfo('Ukuran',sizeText(Number(v.size)))+cardInfo('DEX',v.dexCount===undefined?'—':v.dexCount)+cardInfo('Package',v.manifest&&v.manifest.packageName||'Belum terbaca')+cardInfo('Status',v.reason||v.status)+'</div></details>').join(''):note('Tidak ada APK bersarang yang tercatat di sampel Explorer. Untuk paket besar, entri yang tidak tampil mungkin belum terjangkau.');
 const observations=insights.length?insights.map(v=>'<div class="evidence-item"><strong>'+esc(v.title)+'</strong>'+badge(v.type==='warning'?'PERIKSA':'INFORMASI',v.type==='warning'?'amber':'grey')+'<p>'+esc(v.detail)+'</p><small>Bukti: '+esc(v.evidence)+'</small></div>').join(''):note('Tidak ada aturan lokal yang menghasilkan temuan. Ini bukan sertifikat keamanan APK.');
 return section('Temuan Otomatis v0.5','Bukti dari struktur file dan aturan lokal; belum merupakan opini atau keputusan AI')+
 '<div class="evidence-grid"><section class="panel"><h3 class="section-title no-top-margin">Teknologi & Bahasa Kode</h3><div class="evidence-list">'+tags+'</div></section><section class="panel"><h3 class="section-title no-top-margin">APK di Dalam Paket</h3><div class="evidence-list">'+packages+'</div></section><section class="panel"><h3 class="section-title no-top-margin">Penjelasan Berbasis Aturan</h3><div class="evidence-list">'+observations+'</div></section></div>'+
 '<div style="margin:10px 0 20px">'+note('Java/Kotlin asli tidak bisa dipastikan hanya dari DEX. APK bersarang di atas 32 MiB dicatat sebagai metadata-only. Tidak ada eksekusi aplikasi atau pembacaan semua byte input.')+'</div>';
}
function v05InspectionPanel(){
 if(!reportReady() || Number(report.schemaVersion||0)<5)return '';
 const sign=report.signingInspection||{}, elf=Array.isArray(report.nativeLibraries)?report.nativeLibraries:[], integrity=report.integritySamples||{};
 const signatureInfo='<div class="info-rows">'+cardInfo('Blok tanda tangan',sign.signingBlock||'tidak diketahui')+cardInfo('Signature v1 (metadata)',sign.jarSignatureFilesPresent?'Bukti berkas ada':'Tidak terdeteksi')+cardInfo('v2',sign.v2Present?'Ditemukan':'Tidak terdeteksi')+cardInfo('v3',sign.v3Present?'Ditemukan':'Tidak terdeteksi')+cardInfo('v3.1',sign.v31Present?'Ditemukan':'Tidak terdeteksi')+cardInfo('Validitas kriptografis','BELUM DIVERIFIKASI')+'</div>'+(sign.reason?note(esc(sign.reason),'warn'):'')+'<p class="mini-description">'+esc(sign.verificationNote||'Penemuan blok signing bukan verifikasi tanda tangan APK.')+'</p>';
 const elfInfo=elf.length?elf.map(e=>'<details class="deep-dex-item"><summary><span>'+icon('cpu',15)+' '+esc(e.name)+'</span>'+badge(e.status==='ok'?'HEADER':'GAGAL',e.status==='ok'?'teal':'amber')+'</summary><div class="info-rows">'+cardInfo('Arsitektur',e.cpu||'—')+cardInfo('Format',e.format||'—')+cardInfo('Endian',e.endianness||'—')+cardInfo('Program headers',e.programHeaderCount===undefined?'—':e.programHeaderCount)+'</div>'+(e.reason?note(esc(e.reason),'warn'):'')+'</details>').join(''):note('Tidak ada sampel .so dalam pratinjau lib. Ini tidak membuktikan tidak adanya library native.');
 const samples=Array.isArray(integrity.samples)?integrity.samples:[];
 const integrityInfo='<div class="info-rows">'+cardInfo('Sampel diperiksa',integrity.checkedCount||0)+cardInfo('CRC cocok',integrity.matches||0)+cardInfo('Gagal/tidak cocok',integrity.failures||0)+cardInfo('Dilewati',integrity.skipped||0)+'</div>'+(samples.length?'<div class="evidence-list">'+samples.map(e=>'<div class="evidence-item"><strong>'+esc(e.path)+'</strong>'+badge(e.status==='match'?'CRC COCOK':e.status==='MISMATCH'?'CRC BERBEDA':'TERBATAS',e.status==='match'?'teal':'amber')+'<p>CRC arsip: '+esc(e.zipClaimedCrc32)+' · Hitung ulang: '+esc(e.actualCrc32||'—')+'</p></div>').join('')+'</div>':'<p class="mini-description">Belum ada entri cocok yang dapat diuji.</p>')+'<p class="mini-description">'+esc(integrity.scope||'CRC32 tidak membuktikan keaslian signature')+'</p>';
 return section('Pemeriksaan tambahan v0.5','Hasil struktural terbatas, bukan malware scan atau verifikasi keaslian APK.')+'<div class="evidence-grid"><section class="panel"><h3 class="section-title no-top-margin">Tanda Tangan APK</h3>'+signatureInfo+'</section><section class="panel"><h3 class="section-title no-top-margin">Library ELF (.so)</h3>'+elfInfo+'</section><section class="panel"><h3 class="section-title no-top-margin">Sampel Integritas</h3>'+integrityInfo+'</section></div>';
}
const aiSection=['Cuplikan Smali/XML','Manifest','Permissions','DEX','Simbol DEX','Resources','Native Libs','Signing','Integritas CRC','Teknologi','APK Bersarang','Temuan Lokal','Cuplikan JADX'];
function assistant(){
 const f=selectedFile(), ready=native&&directInfo.connected&&directInfo.allowed&&directModels.length>0;
 const ai=state.aiReply&&typeof state.aiReply==='object'?state.aiReply:null;
 const outcome=ai?'<div class="ai-results"><h3>Hasil analisis AI • '+esc(ai.model||'model terotorisasi')+'</h3><p style="white-space:pre-wrap">'+esc(ai.summary||'Tidak ada teks')+'</p></div>':'';
 return top('AI Analyst','Analisis berdasarkan bukti dengan Sign in with ChatGPT. Tanpa gateway pribadi atau API key.')+
 '<div class="chat-layout"><section class="panel chat-panel"><div class="section-head" style="margin-top:0"><div><h3 class="section-title inline-icon">'+icon('bot',19)+' ChatGPT Analysis</h3><div class="section-desc">'+esc(directInfo.connected?directInfo.email+' · '+(directInfo.allowed?'Izin AI aktif':'Izin AI belum diberikan'):'Hubungkan akun Anda lewat browser resmi OpenAI')+'</div></div>'+badge(directInfo.connected?'AKUN TERSAMBUNG':'BELUM MASUK',directInfo.connected?'teal':'amber')+'</div>'+
 '<div class="chat-history"><div class="chat-intro"><div class="large">'+icon('spark',30)+'</div><h3>'+(ai?'Analisis proyek terakhir':'Data tetap di perangkat hingga disetujui')+'</h3><p>'+esc(state.aiMessage||'Akun yang sama dapat dipakai untuk AI, tetapi tidak memberikan akses ke riwayat ChatGPT.')+'</p>'+(outcome||'<div style="margin-top:14px"><button class="secondary-action" data-action="route" data-target="settings">'+icon('lock',15)+' Hubungkan ChatGPT</button></div>')+'</div></div>'+
 '<div class="chat-compose"><div class="field"><label for="directModel">Model AI dari akun Anda</label><select id="directModel" style="width:100%;padding:11px;background:#131c31;color:#e9f2ff;border:1px solid #31405e;border-radius:9px">'+(directModels.length?directModels.map(m=>'<option value="'+esc(m.id)+'" '+(state.aiModel===m.id?'selected':'')+'>'+esc(m.label)+'</option>').join(''):'<option value="">Hubungkan akun lalu muat model</option>')+'</select></div><textarea id="aiDraft" maxlength="5000" placeholder="Contoh: Jelaskan struktur dan kelas APK berdasarkan bukti yang dipilih…">'+esc(state.aiDraft)+'</textarea><div class="compose-bottom"><span class="compose-label inline-icon">'+icon('shield',14)+' Tinjau seluruh data sebelum dikirim</span><button class="main-action sm-action" data-action="send" '+(!ready||!reportReady()||state.aiStatus==='running'?'disabled':'')+'>'+icon('up',14)+' '+(state.aiStatus==='running'?'Memproses…':'Tinjau & Analisis')+'</button></div></div></section>'+
 '<aside class="chat-options"><div class="panel"><div class="label-muted">KONTROL DATA</div><p class="mini-description">Pilih kategori yang boleh dibagikan. APK penuh, keystore, dan token tidak dikirim otomatis.</p><div class="option-list">'+aiSection.map(x=>'<label class="option"><input type="checkbox" data-section="'+x+'" '+(state.sections.includes(x)?'checked':'')+'><span>'+x+'</span></label>').join('')+'</div>'+badge('Persetujuan setiap permintaan','teal')+'</div><div class="panel"><h3 class="section-title no-top-margin">Akun & Model</h3><div class="info-rows">'+cardInfo('Akun',directInfo.connected?directInfo.email:'Belum terhubung')+cardInfo('Izin AI',directInfo.allowed?'Diberikan':'Belum diberikan')+cardInfo('Model tersedia',directModels.length)+cardInfo('Berkas proyek',f?f.name:'Belum dipilih')+'</div><button class="secondary-action sm-action" style="width:100%;margin-top:10px" data-action="load-models" '+(!native||!directInfo.allowed?'disabled':'')+'>'+icon('refresh',14)+' Perbarui Model</button><button class="ghost-action sm-action" style="width:100%;margin-top:8px" data-action="copy-ai">'+icon('copy',14)+' Salin Konteks</button></div></aside></div>'+
 '<div style="margin-top:14px">'+note('Autorisasi menggunakan izin akun ChatGPT. Tidak ada akses otomatis ke percakapan, memori, file ChatGPT, atau pekerjaan Codex Cloud. Jawaban AI harus diverifikasi dengan bukti lokal.')+'</div>';
}
const stages=[
 ['01','Patch Workspace','Edit Smali/XML di salinan kerja Android; ekspor JSON'],
 ['02','Apktool Build','Prepare patch lalu buat APK unsigned secara offline'],
 ['03','Zipalign','Selaraskan APK unsigned, termasuk file native untuk halaman 16 KiB'],
 ['04','Signing','Tanda tangani dengan keystore pribadi melalui apksigner'],
 ['05','Verification','Periksa zipalign dan signature menggunakan SDK resmi'],
 ['06','Output & Receipt','Simpan APK signed + receipt JSON; impor receipt di Android']
];
function build(){
 const f=selectedFile();
 const r=buildReceipt&&buildReceipt.format==='apk-reverse-build-receipt'&&buildReceipt.result==='VERIFIED'?buildReceipt:null;
 const progress=stages.map((t,i)=>'<div class="pipeline-step"><span class="pipeline-index">'+t[0]+'</span><div><strong>'+t[1]+'</strong><p>'+t[2]+'</p></div><span class="status">'+(r && i>=2 && i<=4?'RECEIPT':'Offline')+'</span></div>').join('');
 const details=r?'<div class="info-rows">'+cardInfo('APK output (laporan)',r.signedFile)+cardInfo('Ukuran output',sizeText(Number(r.signedBytes)))+cardInfo('SHA-256 output',r.signedApkSha256)+cardInfo('Sertifikat SHA-256 (klaim receipt)',r.signerCertificateSha256||'Tidak tercantum')+cardInfo('Zipalign 16 KiB (klaim)',r.zipalign16KiB)+cardInfo('Apksigner verify (klaim)',r.apksignerVerify)+'</div>'+note('Receipt JSON dapat dibuat atau diubah secara manual. Android hanya memvalidasi format, bukan memeriksa signature dan APK output. Untuk bukti aktual, jalankan perintah verify offline dan bandingkan hash APK.','warn'):
 '<div class="empty-state">'+icon('shield',30)+'<strong>Belum ada laporan hasil build</strong><p>Jalankan pipeline offline dan impor file *.receipt.json untuk membaca status dari komputer/server tepercaya.</p></div>';
 return top('Build & Signing','Pipeline finalisasi APK berjalan di komputer/server yang memiliki Android SDK Build Tools. Android berfungsi sebagai workspace dan pembaca receipt hasil verifikasi.')+
 '<div class="two-col"><section class="panel"><div class="section-head" style="margin-top:0"><h3 class="section-title">Finalisasi APK Offline</h3>'+badge('v0.9 • OFFLINE SDK','teal')+'</div>'+
 '<div class="info-rows">'+cardInfo('Proyek Android',f?f.name:'Belum dipilih')+cardInfo('Workspace Apktool',apktoolWorkspace?'Bundle review tersedia':'Belum diimpor')+cardInfo('Patch lokal',apktoolWorkspace?(apktoolWorkspace.changedPaths||[]).length+' berkas':'—')+cardInfo('Apktool build unsigned','Offline pada komputer/server')+cardInfo('Build/sign langsung di Android','Belum tersedia')+'</div>'+
 '<div class="divider"></div><h3 class="section-title">Hasil Pemeriksaan</h3>'+details+
 '<div class="button-row" style="margin-top:16px"><button class="main-action" data-action="import-build-report" '+(!native?'disabled':'')+'>'+icon('folder',16)+' Impor Receipt JSON</button><button class="secondary-action" data-action="show-sign">'+icon('shield',16)+' Keamanan Signing</button></div>'+
 '<p class="mini-description" style="margin-top:12px">Perintah CLI: <code>python3 tools/build-sign-verify.py finalize unsigned.apk keystore.jks alias output.apk</code>. Password keystore lewat variabel lingkungan, tidak disimpan di proyek maupun dikirim ke AI.</p></section>'+
 '<section class="panel"><h3 class="section-title no-top-margin">Build Pipeline</h3><p class="mini-description">Tahapan 1–2 memakai workflow v0.8; tahapan 3–5 tersedia melalui script v0.9. Receipt menunjukkan hasil pemeriksaan yang diklaim oleh berkas yang diimpor, bukan job Android.</p><div class="pipeline">'+progress+'</div>'+note('Build sukses bukan jaminan APK akan bekerja di semua perangkat. Untuk APK split, AAB dan keluaran besar diperlukan alur build khusus; uji pada perangkat dan pemeriksaan kompatibilitas tetap wajib.','warn')+'</section></div>';
}
function onBuildReportUpdate(value){
 if(!value||typeof value!=='object')return;
 if(value.status==='ready'&&value.receipt&&value.receipt.format==='apk-reverse-build-receipt'){
   buildReceipt=value.receipt;render();notify('Receipt offline dimuat. Status ini belum diverifikasi ulang di Android.');
 }else if(value.status==='error'){notify(String(value.message||'Impor gagal').slice(0,300));}
}

function jobsPage(){
 const all=Array.isArray(state.aiHistory)?state.aiHistory:[];
 const filtered=all.filter(x=>!state.project || x.project===state.project.name);
 return top('Riwayat Analisis Lokal','Hasil AI disimpan di perangkat ini, bukan di riwayat percakapan ChatGPT.')+
 '<div class="panel"><h3 class="section-title no-top-margin">Analisis tersimpan</h3><p class="mini-description">'+filtered.length+' hasil untuk proyek ini. Riwayat lokal disimpan oleh WebView dan tidak terenkripsi seperti token OAuth.</p>'+
 (filtered.length?filtered.map((x,i)=>'<details class="deep-dex-item"><summary><span>'+icon('bot',15)+' '+esc(x.question)+'</span>'+badge('LOKAL','teal')+'</summary><small>'+esc(x.model)+' · '+stamp(x.timestamp)+'</small><p style="white-space:pre-wrap">'+esc(x.answer)+'</p></details>').join(''):'<div class="empty-state">'+icon('database',28)+'<strong>Belum ada analisis tersimpan</strong><p>Kirim pertanyaan melalui AI Analyst setelah login dan izin AI.</p></div>')+
 '<div class="button-row"><button class="ghost-action" data-action="clear-ai-history">'+icon('trash',15)+' Hapus riwayat lokal</button></div></div>';
}
function settings(){const f=selectedFile();return top('Pengaturan & Privasi','Kontrol data proyek dan koneksi akun resmi ChatGPT tanpa server gateway pribadi.')+
 '<div class="two-col"><section class="panel"><div class="label-muted">DATA LOKAL</div><div class="toggle-row"><div><strong>Simpan proyek otomatis</strong><p>Metadata APK, catatan, editor patch, dan riwayat analisis tersimpan pada perangkat.</p></div><span class="switch locked"><span class="knob"></span></span></div><div class="toggle-row"><div><strong>Persetujuan AI</strong><p>Tidak ada pengiriman metadata tanpa pratinjau dan persetujuan.</p></div><span class="switch locked"><span class="knob"></span></span></div><div class="divider"></div><div class="info-rows">'+cardInfo('Proyek',f?f.name:'Tidak ada')+cardInfo('Sumber',f?sizeText(f.size):'—')+cardInfo('Riwayat AI lokal',(state.aiHistory||[]).length+' hasil')+'</div><div class="button-row"><button class="ghost-action" data-action="clear">Hapus data lokal</button></div></section>'+
 '<section class="panel"><div class="label-muted">SIGN IN WITH CHATGPT</div><div style="display:flex;gap:12px;align-items:center;margin:15px 0"><div class="file-emblem" style="width:46px;height:46px">'+icon('bot',23)+'</div><div><strong>ChatGPT / OpenAI</strong><p class="mini-description">'+esc(directInfo.connected?(directInfo.email||'Terotorisasi'):'Belum diotorisasi')+'</p></div></div>'+badge(directInfo.connected?(directInfo.allowed?'AKSES AI AKTIF':'IDENTITAS SAJA'):'BELUM TERHUBUNG',directInfo.allowed?'teal':'amber')+
 '<div class="divider"></div><p class="mini-description">OAuth resmi dibuka di browser sistem. Access token dan refresh token dienkripsi di Android Keystore, tidak dikirim ke WebView, dan tidak membutuhkan gateway atau API key. Masuk tidak memberi akses ke riwayat ChatGPT.</p><div class="info-rows">'+cardInfo('Izin akses AI',directInfo.allowed?'Disetujui':'Belum')+cardInfo('Model pilihan',state.aiModel||'Belum dipilih')+cardInfo('Transport','HTTPS langsung ke OpenAI')+'</div><div class="button-row" style="margin-top:15px"><button class="main-action" data-action="chatgpt-login" '+(!native?'disabled':'')+'>'+icon('lock',15)+' '+(directInfo.connected?'Otorisasi Ulang':'Continue with ChatGPT')+'</button><button class="secondary-action" data-action="load-models" '+(!native||!directInfo.allowed?'disabled':'')+'>'+icon('refresh',15)+' Muat Model</button><button class="ghost-action" data-action="chatgpt-logout" '+(!native||!directInfo.connected?'disabled':'')+'>Putuskan Akun</button></div>'+note('Untuk integrasi open-source lokal yang memenuhi syarat. Login nyata belum diuji pada perangkat ini; bila izin atau paket tidak mendukung, aplikasi harus menampilkan kesalahan, bukan berpura-pura tersambung.','warn')+'</section></div>'+
 section('Catatan Proyek','Tersimpan lokal, terpisah dari akun ChatGPT.')+
 '<div class="panel"><div class="field"><label>Catatan atau rencana perubahan</label><textarea id="notes" maxlength="20000" style="min-height:110px">'+esc(state.notes)+'</textarea></div><span class="mini-description">Tersimpan otomatis di perangkat</span></div>';
}
function shell(){const names={dashboard:'Dashboard',explorer:'File Explorer',analysis:'Reverse Engineering',code:'JADX Source',apktool:'Apktool / Smali',assistant:'AI Analyst',jobs:'Riwayat AI',build:'Build & Signing',settings:'Pengaturan'};
return '<div class="app-shell"><aside class="sidebar"><div class="brand"><div class="brand-icon">'+icon('cube',22)+'</div><div class="brand-name">APK REVERSE<small>STUDIO // LAB</small></div></div><div class="side-kicker">WORKSPACE</div><nav class="nav-group">'+navButton('dashboard','Dashboard','house')+navButton('explorer','File Explorer','folder')+navButton('analysis','Reverse Engineering','search')+navButton('code','JADX Source','code')+navButton('apktool','Apktool / Smali','terminal')+navButton('assistant','AI Analyst','bot')+navButton('jobs','Riwayat AI','database')+navButton('build','Build & Signing','build')+'</nav><div class="side-divider"></div><div class="side-kicker">PREFERENSI</div><nav class="nav-group">'+navButton('settings','Pengaturan','gear')+'</nav><div class="side-bottom"><div class="side-status">'+badge('INSPECTOR v1.0','teal')+'<strong>Local-first Workspace</strong><p>ZIP64, Manifest, DEX, resource, ELF, signature block dan pemeriksaan CRC terbatas. AI opsional.</p></div><div class="version">v1.0 • Direct ChatGPT OAuth</div></div></aside><main class="workspace"><header class="topbar"><div class="top-left">'+icon('house',15)+' <span>Workspace</span> '+icon('chevron',13)+' <span class="crumb">'+names[state.route]+'</span></div><div class="top-mobile-logo"><div class="brand-icon">'+icon('cube',18)+'</div> REVERSE STUDIO</div><div class="top-actions"><span class="top-pill hide-mid">'+icon('shield',14)+' Local-first</span><span class="top-pill hide-small">'+icon('terminal',14)+' Local Inspector</span><button class="top-settings" data-action="route" data-target="settings" title="Pengaturan" aria-label="Pengaturan">'+icon('gear',17)+'</button><button class="avatar" aria-label="Info akun" data-action="connect">AI</button></div></header><div class="content">'+({dashboard,explorer,analysis,code:codeWorkspace,apktool:apktoolPage,assistant,jobs:jobsPage,build,settings}[state.route]||dashboard)()+'<div class="footer-copyright">APK REVERSE STUDIO · INSPEKTOR LOKAL · APKTOOL & SIGNING OFFLINE · RECEIPT REVIEW DI ANDROID</div></div></main></div><nav class="mobile-bar" aria-label="Navigasi utama">'+miniNavButton('dashboard','Beranda','house')+miniNavButton('explorer','Explorer','folder')+miniNavButton('analysis','Analisis','search')+miniNavButton('apktool','Smali','terminal')+miniNavButton('assistant','AI','bot')+miniNavButton('jobs','Riwayat','database')+miniNavButton('build','Build','build')+'</nav>';
}
const modalContent={
connect:{icon:'bot',title:'Hubungkan ChatGPT',body:'<p>Masuk melalui Pengaturan → Continue with ChatGPT. Anda perlu mengizinkan penggunaan paket ChatGPT secara terpisah. Riwayat percakapan ChatGPT tidak ikut dibagikan.</p>',primary:'Paham'},
send:{icon:'lock',title:'Pratinjau konteks wajib',body:'<p>Hubungkan akun ChatGPT dan pilih metadata APK untuk ditinjau sebelum mengirim permintaan.</p>',primary:'Kembali'},
build:{icon:'build',title:'Pipeline APK v0.9',body:'<p>Jalankan build unsigned dengan Apktool, lalu tools/build-sign-verify.py untuk zipalign → signing → verification di komputer/server yang memiliki Android SDK resmi. Setelah berhasil, impor receipt JSON melalui halaman Build & Signing di Android.</p><p>Build dan penandatanganan tidak berjalan langsung di ponsel.</p>',primary:'Mengerti'},
'show-plan':{icon:'cpu',title:'Rencana mesin analisis',body:'<p>Engine dirancang membaca struktur berkas secara bertahap memakai <strong>URI Android, indeks ZIP/ZIP64, pemeriksaan integrity, parser Manifest dan resource, serta analisis DEX</strong>.</p><p>Untuk sumber mendekati 40 GB, engine wajib memproses per bagian, tidak memuat keseluruhan berkas ke RAM, membatasi ekspansi arsip, dan menyediakan cancel/resume.</p>',primary:'Mengerti'},
'show-sign':{icon:'shield',title:'Aturan tanda tangan APK',body:'<p>Hasil modifikasi harus dibangun secara konsisten, di-<em>zipalign</em>, ditandatangani dengan keystore sah, dan diverifikasi setelahnya.</p><p>Kunci berbeda dari APK asli biasanya membuat hasil tidak dapat menggantikan instalasi sebelumnya. Jangan bagikan kunci privat dan password ke AI atau penyimpanan cloud tanpa kendali keamanan.</p>',primary:'Mengerti'},
clear:{icon:'trash',title:'Hapus data UI lokal?',body:'<p>Tindakan ini akan menghapus proyek terpilih, riwayat pemilihan, draf percakapan dan catatan dari aplikasi ini. File asli tidak akan dihapus dari perangkat.</p>',primary:'Hapus data lokal',danger:true}
};
function renderModal(){if(!modal)return '';
if(modal==='ai-preview'){
 const payload=pendingAiPayload || aiContext();
 return '<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="modal-close" data-action="close-modal" aria-label="Tutup">'+icon('x',19)+'</button><div class="modal-icon">'+icon('shield',22)+'</div><h2 id="modal-title">Konfirmasi data AI</h2><p>Metadata berikut akan dikirim langsung ke OpenAI menggunakan akun yang telah Anda otorisasi. Bukan seluruh APK.</p><pre class="ai-preview">'+esc(payload)+'</pre><p>Ukuran: '+payload.length+' karakter · Model: '+esc(state.aiModel||'belum dipilih')+'</p><div class="modal-actions"><button class="secondary-action" data-action="close-modal">Batal</button><button class="main-action" data-action="confirm-ai">Saya Setuju, Analisis</button></div></div></div>';
}
const m=modalContent[modal];if(!m)return '';return '<div class="modal-backdrop" role="presentation"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="modal-close" data-action="close-modal" aria-label="Tutup">'+icon('x',20)+'</button><div class="modal-icon">'+icon(m.icon,24)+'</div><h2 id="modal-title">'+m.title+'</h2>'+m.body+'<div class="modal-actions">'+(m.danger?'<button class="secondary-action" data-action="close-modal">Batal</button>':'')+'<button class="'+(m.danger?'ghost-action':'main-action')+'" data-action="'+(m.danger?'confirm-clear':'close-modal')+'">'+m.primary+'</button></div></div></div>';}
function render(){root.innerHTML=shell()+renderModal();}
function notify(message){const old=document.querySelector('.toast');if(old)old.remove();const t=document.createElement('div');t.className='toast';t.setAttribute('role','status');t.setAttribute('aria-live','polite');t.textContent=message;document.body.appendChild(t);if(toastTimer)clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.remove(),3400);}
function projectFrom(file){if(!file||typeof file!=='object')return;const name=String(file.name||'Berkas Android');const size=Number(file.size);const selectedAt=Number(file.selectedAt)||Date.now();if(name.length>1024||!Number.isFinite(size)||size>MAX_BYTES||size< -1){notify('Metadata berkas tidak valid atau melebihi 40 GB.');return;}const ext=filenameExt(name);if(!EXTS.includes(ext)){notify('Format belum ditargetkan. Gunakan APK, AAB, APKS, APKM, XAPK, ZIP atau OBB.');return;}
workspace=null;workspaceFile=null;workspaceDraft='';apktoolWorkspace=null;apktoolFile=null;apktoolDraft='';buildReceipt=null;state.notes='';state.buildName='';state.project={name,size,selectedAt,uri:typeof file.uri==='string'?file.uri:null};state.history=[{name,size,selectedAt},...state.history.filter(i=>i.name!==name)].slice(0,20);state.selectedTree='manifest';state.entryQuery='';state.activeEntry='';state.symbolQuery='';state.symbolSelected='';state.symbolBookmarks={};state.jobFocusId='';state.analysisStatus='idle';state.analysisMessage='';report=null;state.aiStatus='idle';state.aiReply=null;state.aiRequestProjectId='';state.aiMessage='';persist();render();notify('Berkas dipilih. Tekan Analisis Struktur untuk membaca isi ZIP.');}
function pick(){if(native){try{window.StudioNative.chooseFile();}catch(e){notify('Pemilih file Android tidak tersedia.');}}else{document.getElementById('browser-file').click();}}
function projectSummary(){const f=selectedFile();return f?'File: '+f.name+'\nUkuran: '+sizeText(f.size)+'\nDipilih: '+stamp(f.selectedAt)+'\nFormat: '+filenameExt(f.name).toUpperCase()+'\nStatus: belum dianalisis':'Belum ada berkas dipilih.';}
function aiContext(){
 const f=selectedFile();
 const source={file:f?f.name:null,size:f?f.size:null,consentedSections:state.sections,notice:'Hanya metadata yang dipilih secara sadar; bukan seluruh isi APK, bukan source Java/Smali asli.'};
 if(reportReady()){
   source.formatHint=report.formatHint;
   const selectedGroups=state.sections.map(x=>({Manifest:'manifest',Permissions:'manifest',DEX:'dex',Resources:'res','Native Libs':'lib',Signing:'meta'}[x])).filter(Boolean);
   source.examplePaths=(report.entries||[]).filter(x=>selectedGroups.includes(x.group)).slice(0,35).map(x=>x.name);
   const deep=deepContent();
   if(deep){
     if(state.sections.includes('Manifest'))source.manifest=deep.manifest;
     else if(state.sections.includes('Permissions'))source.permissions={permissions:(deep.manifest||{}).permissions||[],permissionCount:(deep.manifest||{}).permissionCount||0};
     if(state.sections.includes('DEX'))source.dexFiles=deep.dexFiles;
     if(state.sections.includes('Resources'))source.resources=deep.resources;
   }
   if(state.sections.includes('DEX'))source.dexCount=report.dexCount;
   if(state.sections.includes('Cuplikan Smali/XML'))source.apktoolExcerpt=apktoolFile&&apktoolFile.status==='ok'?{path:apktoolFile.path,excerpt:apktoolDraft.slice(0,8000),excerptTruncated:apktoolDraft.length>8000,warning:'Cuplikan Smali/XML dari bundle impor, belum diverifikasi terhadap APK asli pada Android.'}:{status:'no_source_selected'};
   if(state.sections.includes('Cuplikan JADX'))source.jadxExcerpt=workspaceFile&&workspaceFile.status==='ok'?{path:workspaceFile.path,modified:!!workspaceFile.modified,unsavedDraft:workspaceDraft!==workspaceFile.content,excerpt:workspaceDraft.slice(0,8000),excerptTruncated:workspaceDraft.length>8000,warning:'Output dekompilasi, bukan sumber asli yang terverifikasi.'}:{status:'no_source_selected'};
   if(state.sections.includes('Simbol DEX'))source.dexSymbols={scope:report.dexSymbols&&report.dexSymbols.scope,classes:(report.dexSymbols&&report.dexSymbols.classes||[]).slice(0,70),methods:(report.dexSymbols&&report.dexSymbols.methods||[]).slice(0,80),truncated:report.dexSymbols&&report.dexSymbols.truncated};
   if(state.sections.includes('Signing'))source.signingInspection=report.signingInspection||{signatureMetadataPresent:report.signatureMetadataPresent};
   if(state.sections.includes('Integritas CRC'))source.integritySamples=report.integritySamples||null;
   if(state.sections.includes('Native Libs')){source.nativeLibCount=Number((report.counts||{}).lib||0);source.nativeLibraries=report.nativeLibraries||[];}
   if(state.sections.includes('Teknologi'))source.languages=report.languages||[];
   if(state.sections.includes('Temuan Lokal'))source.localInsights=report.localInsights||[];
   if(state.sections.includes('APK Bersarang'))source.bundledApks=(report.bundledApks||[]).map(x=>({name:x.name,status:x.status,size:x.size,dexCount:x.dexCount,packageName:x.manifest&&x.manifest.packageName}));
 }
 return JSON.stringify(source,null,2);
}

function sendToCodex(){
 if(!native||!directInfo.allowed||!reportReady()||!pendingAiPayload)return notify('Akun ChatGPT atau pratinjau belum siap.');
 if(!state.aiModel)return notify('Pilih model terlebih dahulu.');
 const context=JSON.parse(pendingAiPayload);pendingAiPayload=null;modal=null;
 state.aiStatus='running';state.aiMessage='Mengirim permintaan yang disetujui…';state.aiReply=null;
 state.aiRequestProjectId=String(state.project.selectedAt);persist();render();
 try{window.StudioNative.sendChatGpt(JSON.stringify({consent:true,model:state.aiModel,projectId:state.aiRequestProjectId,question:state.aiDraft,context}));}
 catch(e){state.aiStatus='error';state.aiMessage='Gagal memulai permintaan';persist();render();}
}
function onChatGptUpdate(update){
 if(!update||typeof update!=='object')return;
 if(update.data && ('connected' in update.data)){
  const d=update.data;directInfo={connected:!!d.connected,allowed:!!d.allowed,email:String(d.email||''),name:String(d.name||'')};
  if(!directInfo.allowed){directModels=[];state.aiModel='';}
 }
 if(update.status==='models' && update.data && Array.isArray(update.data.models)){
  directModels=update.data.models.filter(x=>x&&/^[a-zA-Z0-9._-]{1,80}$/.test(x.id)).slice(0,40);
  if(!directModels.some(m=>m.id===state.aiModel))state.aiModel=directModels.length?directModels[0].id:'';
 }
 if(update.status==='connected' && directInfo.allowed && native)window.StudioNative.loadChatGptModels();
 if(update.status==='error')notify(String(update.message||'Autorisasi gagal').slice(0,200));
 persist();render();
}
function aiUpdate(update){
 if(!update||typeof update!=='object')return;
 if(update.status==='done'&&(!update.data||String(update.data.projectId)!==String(state.aiRequestProjectId)||String(state.aiRequestProjectId)!==String(state.project&&state.project.selectedAt)))return;
 state.aiStatus=update.status;state.aiMessage=String(update.message||'').slice(0,600);
 if(update.status==='done'&&update.data&&update.data.analysis){
  state.aiReply=update.data.analysis;
  state.aiHistory=Array.isArray(state.aiHistory)?state.aiHistory:[];
  state.aiHistory.unshift({timestamp:Date.now(),project:state.project.name,question:state.aiDraft,model:state.aiReply.model||state.aiModel,answer:String(state.aiReply.summary||'').slice(0,12000)});
  state.aiHistory=state.aiHistory.slice(0,30);
 }
 persist();render();if(update.status==='error')notify('AI: '+state.aiMessage);
}
function copyAiContext(){const value=aiContext();if(native){window.StudioNative.copyText(value);notify('Konteks analisis disalin untuk ditinjau dan ditempel secara manual.');}else fallbackCopy(value);}
function startInspection(){if(!native){notify('Pemeriksaan ZIP hanya tersedia dalam aplikasi Android.');return;}if(!selectedFile()){notify('Pilih berkas terlebih dahulu.');return;}report=null;state.analysisStatus='running';state.analysisMessage='Membaca indeks struktur melalui Android…';persist();render();try{window.StudioNative.startInspection();}catch(e){state.analysisStatus='error';state.analysisMessage='Gagal memulai layanan inspektor Android';persist();render();}}
function inspectionUpdate(data){if(!data||typeof data!=='object')return;if(data.status==='done'&&(!data.report||!state.project||Number(data.report.sourceSelectedAt)!==Number(state.project.selectedAt)))return;if(data.status==='done' && data.report && Number(data.report.sourceSelectedAt)===Number(state.project&&state.project.selectedAt)){report=data.report;state.analysisStatus='done';state.analysisMessage='Analisis biner selesai. Hasil tersimpan di perangkat.';}else if(data.status==='running'){state.analysisStatus='running';state.analysisMessage=String(data.message||'Sedang memeriksa struktur');}else if(data.status==='error'||data.status==='cancelled'){state.analysisStatus=data.status;state.analysisMessage=String(data.message||'Pemeriksaan gagal').slice(0,450);}persist();render();if(data.status==='done')notify('Analisis APK selesai: '+report.totalEntries+' entri.');else if(data.status==='error')notify('Inspeksi gagal: '+state.analysisMessage);}
function copySummary(){const message=projectSummary();if(native){window.StudioNative.copyText(message);return;}if(navigator.clipboard && window.isSecureContext){navigator.clipboard.writeText(message).then(()=>notify('Ringkasan disalin.'),()=>fallbackCopy(message));}else fallbackCopy(message);}
function fallbackCopy(text){const input=document.createElement('textarea');input.value=text;input.style.position='fixed';input.style.opacity='0';document.body.appendChild(input);input.select();try{document.execCommand('copy');notify('Ringkasan disalin.');}catch(e){notify('Salin teks tidak tersedia.');}input.remove();}
root.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const action=b.getAttribute('data-action');const target=b.getAttribute('data-target');if(action==='route')route(target);else if(action==='select-symbol'){state.symbolSelected=target;persist();render();}else if(action==='pick')pick();else if(action==='import-build-report'){if(native&&window.StudioNative.chooseBuildReport)window.StudioNative.chooseBuildReport();else notify('Impor receipt hanya tersedia pada Android.');}else if(action==='import-apktool'){if(native&&selectedFile())window.StudioNative.chooseApktoolBundle();else notify('Pilih APK di Android dahulu.');}else if(action==='export-apktool'){if(native&&apktoolWorkspace)window.StudioNative.exportApktoolPatches();}else if(action==='open-apktool')openApktool(target);else if(action==='save-apktool')saveApktool(false);else if(action==='reset-apktool')saveApktool(true);else if(action==='copy-apktool'){if(apktoolFile){if(native)window.StudioNative.copyText(apktoolDraft);else fallbackCopy(apktoolDraft);}}else if(action==='import-jadx'){if(native&&selectedFile())window.StudioNative.chooseJadxBundle();else notify('Pilih proyek APK di Android dahulu.');}else if(action==='export-patches'){if(native&&workspace)window.StudioNative.exportWorkspacePatches();}else if(action==='open-source')openSource(target);else if(action==='save-source')patchSource(false);else if(action==='reset-source')patchSource(true);else if(action==='copy-source'){if(workspaceFile){if(native)window.StudioNative.copyText(workspaceDraft);else fallbackCopy(workspaceDraft);}}else if(action==='tree'){state.selectedTree=target;state.activeEntry='';state.entryQuery='';persist();render();}else if(action==='entry'){state.activeEntry=target;persist();render();}else if(action==='inspect')startInspection();else if(action==='cancel-inspect'){if(native)window.StudioNative.cancelInspection();}else if(action==='copy-ai')copyAiContext();
else if(action==='chatgpt-login'){if(native)window.StudioNative.startChatGptLogin();}
else if(action==='chatgpt-logout'){if(native)window.StudioNative.disconnectChatGpt();}
else if(action==='load-models'){if(native)window.StudioNative.loadChatGptModels();}
else if(action==='clear-ai-history'){state.aiHistory=[];persist();render();notify('Riwayat AI lokal dihapus.');}
else if(action==='confirm-ai')sendToCodex();else if(action==='copy')copySummary();else if(action==='send'){
  if(!reportReady()){notify('Analisis APK dahulu untuk menghasilkan laporan.');return;}
  if(!directInfo.connected||!directInfo.allowed||!directModels.length){notify('Masuk ChatGPT, beri izin AI, lalu muat model di Pengaturan.');return;}
  if(!state.aiDraft.trim()){notify('Isi pertanyaan analisis dahulu.');return;}
  if(state.sections.length===0){notify('Pilih minimal satu kategori metadata.');return;}
  pendingAiPayload=aiContext();
  if(pendingAiPayload.length>85000){pendingAiPayload=null;notify('Konteks terlalu besar untuk dikirim; kurangi kategori metadata.');return;}
  modal='ai-preview';render();
}
else if(action==='connect'||action==='build'||action==='clear'||action==='show-plan'||action==='show-sign'){modal=action;render();}else if(action==='close-modal'){pendingAiPayload=null;modal=null;render();}else if(action==='confirm-clear'){pendingAiPayload=null;state=defaultState();workspace=null;workspaceFile=null;workspaceDraft='';apktoolWorkspace=null;apktoolFile=null;apktoolDraft='';buildReceipt=null;persist();if(native){window.StudioNative.clearSavedFile();}modal=null;render();notify('Data UI lokal dihapus. Berkas asli tidak dihapus.');}});
root.addEventListener('input',e=>{const input=e.target;if(input.id==='apktoolCode'){apktoolDraft=input.value;const dirty=document.getElementById('apktool-dirty');if(dirty&&apktoolFile)dirty.textContent=apktoolDraft!==apktoolFile.content?' • BELUM DISIMPAN':'';}else if(input.id==='apktoolQuery'){state.apktoolQuery=input.value;persist();const at=input.selectionStart;render();const el=document.getElementById('apktoolQuery');if(el){el.focus();el.setSelectionRange(at,at);}}else if(input.id==='workspaceCode'){workspaceDraft=input.value;const dirty=document.getElementById('editor-dirty');if(dirty&&workspaceFile)dirty.textContent=workspaceDraft!==workspaceFile.content?' • BELUM DISIMPAN':'';}else if(input.id==='workspaceQuery'){state.workspaceQuery=input.value;persist();const at=input.selectionStart;render();const el=document.getElementById('workspaceQuery');if(el){el.focus();el.setSelectionRange(at,at);}}else if(input.id==='aiDraft'){state.aiDraft=input.value;persist();}else if(input.id==='notes'){state.notes=input.value;persist();}else if(input.id==='symbolNote'){if(state.symbolSelected){state.symbolBookmarks=state.symbolBookmarks||{};state.symbolBookmarks[state.symbolSelected]=input.value;persist();}}else if(input.id==='symbolQuery'){state.symbolQuery=input.value;persist();const at=input.selectionStart;render();const el=document.getElementById('symbolQuery');if(el){el.focus();el.setSelectionRange(at,at);}}else if(input.id==='buildName'){state.buildName=input.value;persist();}else if(input.id==='entryQuery'){state.entryQuery=input.value;persist();const at=input.selectionStart;render();const el=document.getElementById('entryQuery');if(el){el.focus();el.setSelectionRange(at,at);}}});
root.addEventListener('change',e=>{const t=e.target;if(t.dataset.section){const s=t.dataset.section;state.sections=t.checked?[...new Set([...state.sections,s])]:state.sections.filter(q=>q!==s);persist();const count=document.getElementById('sections-count');if(count)count.textContent=state.sections.length;}else if(t.id==='buildMode'){state.buildMode=t.value;persist();}else if(t.id==='directModel'){state.aiModel=t.value;persist();}});
document.getElementById('browser-file').addEventListener('change',e=>{const file=e.target.files&&e.target.files[0];if(file)projectFrom({name:file.name,size:file.size,selectedAt:Date.now()});e.target.value='';});
window.StudioUI={onChatGptUpdate:onChatGptUpdate,onNativeFile:projectFrom,onInspectionUpdate:inspectionUpdate,onAiUpdate:aiUpdate,onWorkspaceUpdate:onWorkspaceUpdate,onApktoolUpdate:onApktoolUpdate,onBuildReportUpdate:onBuildReportUpdate,onBack:()=>{if(modal){pendingAiPayload=null;modal=null;render();return true;}if(state.route!=='dashboard'){route('dashboard');return true;}return false;}};
if(native){try{const d=JSON.parse(window.StudioNative.chatGptStatus());directInfo={connected:!!d.connected,allowed:!!d.allowed,email:String(d.email||''),name:String(d.name||'')};if(directInfo.allowed)window.StudioNative.loadChatGptModels();}catch(e){}try{const saved=JSON.parse(window.StudioNative.savedFile());if(saved){if(!state.project || Number(saved.selectedAt)!==Number(state.project.selectedAt) || String(saved.uri||'')!==String(state.project.uri||''))projectFrom(saved);}else{ // Native storage is authoritative; don't show a ghost project from WebView storage.
    state.project=null;state.history=[];state.notes='';state.buildName='';state.symbolBookmarks={};state.jobFocusId='';state.aiReply=null;state.aiRequestProjectId='';state.analysisStatus='idle';state.analysisMessage='';report=null;workspace=null;apktoolWorkspace=null;buildReceipt=null;
  }const previous=JSON.parse(window.StudioNative.savedReport());if(previous&&state.project&&Number(previous.sourceSelectedAt)===Number(state.project.selectedAt)){report=previous;state.analysisStatus='done';state.analysisMessage='Laporan lama dipulihkan dari penyimpanan perangkat.';}else if(state.analysisStatus==='running'||state.analysisStatus==='done'){state.analysisStatus='idle';state.analysisMessage='';}persist();}catch(e){state.analysisStatus='idle';}try{const value=JSON.parse(window.StudioNative.workspaceStatus());if(value&&value.status==='ready')workspace=value;}catch(e){}try{const x=JSON.parse(window.StudioNative.apktoolStatus());if(x&&x.status==='ready')apktoolWorkspace=x;}catch(e){}try{const r=JSON.parse(window.StudioNative.buildReportStatus());if(r&&r.format==='apk-reverse-build-receipt')buildReceipt=r;}catch(e){}}
render();

})();
