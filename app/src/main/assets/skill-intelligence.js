/* APK Reverse Studio — Skill Intelligence Engine, local deterministic evidence only.
 * Do not treat file names as instructions or infer runtime behavior from metadata.
 */
(function(global){
'use strict';
const common='Bedakan fakta, indikasi, dan hal yang belum diverifikasi. Sebutkan berkas atau field sumber yang mendukung setiap kesimpulan. Jangan menganggap metadata sebagai bukti perilaku runtime.';
const privacy='Hanya gunakan metadata/kode yang secara sadar dipilih dan disetujui pengguna. Jangan meminta token, password, atau keystore.';
const catalog=[
 {id:'android',name:'Android Engineering',domain:'Android',description:'Manifest, permission, komponen, SDK, lifecycle, dan konfigurasi paket.',sections:['Manifest','Permissions','DEX'],patterns:[['^AndroidManifest\\.xml$','AndroidManifest.xml'],['^classes(\\d+)?\\.dex$','DEX'],['^resources\\.arsc$','Resource table']],focus:'Audit konfigurasi Android, kompatibilitas SDK, permission, komponen aplikasi, dan bukti pembatasan parser.'},
 {id:'architecture',name:'Programming Engineering',domain:'Arsitektur',description:'Hubungan modul, ketergantungan dan pemisahan tanggung jawab secara statis.',sections:['DEX','Simbol DEX','Temuan Lokal'],patterns:[['^classes(\\d+)?\\.dex$','DEX'],['(^|/)build\\.gradle(\\.kts)?$','Gradle'],['(^|/)pom\\.xml$','Maven']],focus:'Uraikan struktur modul yang terlihat, kandidat dependensi, dan cara memverifikasi alur logika secara sah.'},
 {id:'jvm',name:'Java & Kotlin Engineering',domain:'JVM',description:'Kelas DEX, signature metode, Kotlin metadata dan pola JVM.',sections:['DEX','Simbol DEX','Cuplikan JADX'],patterns:[['^classes(\\d+)?\\.dex$','DEX (bahasa belum pasti)'],['(^|/)kotlin/','Indikasi Kotlin'],['\\.kotlin_module$','Kotlin metadata'],['\\.class$','Bytecode JVM']],focus:'Audit struktur kelas, metode, signature, dan Kotlin bila benar-benar dibuktikan; DEX saja tidak membuktikan bahasa aslinya.'},
 {id:'python',name:'Python Engineering',domain:'Python',description:'Skrip Python yang benar-benar tertanam, dependensi, dan validasi skrip.',sections:['Temuan Lokal','Teknologi'],patterns:[['\\.py$','Python script'],['(^|/)requirements\\.txt$','Dependencies'],['(^|/)pyproject\\.toml$','Python project'],['(^|/)libpython[^/]*\\.(so|dll)$','Python runtime']],focus:'Tinjau skrip Python atau runtime tertanam bila ditemukan; jangan menganggap setiap APK mengandung Python.'},
 {id:'lua',name:'Lua Script Engineering',domain:'Lua',description:'Pemeriksaan statis source Lua, require/dependensi, dan petunjuk platform.',sections:['Ringkasan Lua','Cuplikan Lua','Teknologi'],patterns:[['\\.lua,domain:'Native',description:'ELF, ABI, library .so, JNI dan komponen native.',sections:['Native Libs','Teknologi','Integritas CRC'],patterns:[['^lib/[^/]+/.+\\.so$','Native shared library'],['\\.so$','ELF kandidat'],['(^|/)jni/','JNI']],focus:'Audit metadata ELF, ABI dan struktur JNI; kode mesin tidak otomatis terdekompilasi menjadi C/C++ asli.'},
 {id:'web',name:'JavaScript & WebView Engineering',domain:'Web',description:'Aset HTML/JS/CSS dan potensi komunikasi WebView–Android.',sections:['Temuan Lokal','Teknologi','Resources'],patterns:[['\\.js$','JavaScript asset'],['\\.html?$','HTML asset'],['\\.css$','CSS asset'],['(^|/)(www|webview)/','WebView assets']],focus:'Uraikan berkas web yang ditemukan; klaim adanya bridge JavaScript–Android memerlukan kode sumber atau bukti tambahan.'},
 {id:'reverse',name:'Reverse Engineering',domain:'Analisis statis',description:'Struktur APK/ZIP64, Manifest, DEX, Smali dan sumber dekompilasi.',sections:['DEX','Manifest','APK Bersarang','Simbol DEX'],patterns:[['^AndroidManifest\\.xml$','Manifest'],['^classes(\\d+)?\\.dex$','DEX'],['\\.smali$','Smali'],['^resources\\.arsc$','Resources']],focus:'Susun peta berkas/kelas berdasarkan observasi, ketidakpastian dekompilasi, dan langkah review yang dapat direproduksi.'},
 {id:'game',name:'Game Engineering',domain:'Game',description:'Jejak engine game, aset, paket data, dan komponen UI game.',sections:['Teknologi','Resources','Native Libs'],patterns:[['(^|/)globalgamemanagers$','Unity marker'],['(^|/)libunity\\.so$','Unity library'],['(^|/)libil2cpp\\.so$','IL2CPP library'],['(^|/)libUE4\\.so$','Unreal library'],['(^|/)libUnreal\\.so$','Unreal library'],['\\.pck$','Godot package'],['(^|/)cocos','Cocos marker'],['\\.unity3d$','Unity asset']],focus:'Tentukan indikasi engine dari bukti berkas, bukan dari nama game; cek asal aset dan kompatibilitas.'},
 {id:'modding',name:'Game Modding Engineering',domain:'Modding offline',description:'Peninjauan perubahan aset dan resource game milik sendiri atau berizin.',sections:['Resources','Teknologi','Integritas CRC'],patterns:[['^resources\\.arsc$','Resource table'],['(^|/)assets/','Assets'],['\\.(png|json|xml|webp)$','Modifiable asset candidate']],focus:'Bahas kompatibilitas mod offline yang diizinkan, backup baseline, dan risiko kehilangan data; jangan instruksikan bypass proteksi/anti-cheat atau manipulasi game daring.'},
 {id:'game-integrity',name:'Game Mechanics & Integrity Analysis',domain:'Game audit',description:'Tinjau mekanika yang terdokumentasi, flag debug, dan risiko integritas secara read-only.',sections:['Temuan Lokal','Simbol DEX','Integritas CRC'],patterns:[['(^|/)globalgamemanagers$','Game technology marker'],['(^|/)libunity\\.so$','Game library'],['(^|/)libil2cpp\\.so$','Game library'],['(^|/)libUE4\\.so$','Game library'],['\\.pck$','Game data']],focus:'Audit hanya yang tersedia dalam bukti statis dan proyek yang diizinkan. Tidak menyusun cheat untuk multiplayer, menghindari anti-cheat, membobol akun, atau menyembunyikan perubahan.'},
 {id:'integrity',name:'Integrity & Security Review',domain:'Verifikasi',description:'CRC, struktur signature, metadata signing, dan indikator risiko arsip.',sections:['Signing','Integritas CRC','Temuan Lokal'],patterns:[['^META-INF/','Signature metadata'],['^AndroidManifest\\.xml$','Manifest'],['^classes(\\d+)?\\.dex$','DEX']],focus:'Pisahkan signature block terdeteksi dari signature yang benar-benar terverifikasi, serta CRC sampel dari validasi menyeluruh.'},
 {id:'build',name:'Build & Signing Engineering',domain:'Rebuild',description:'Validasi patch, zipalign, signing, dan kompatibilitas APK.',sections:['Signing','Manifest','Integritas CRC'],patterns:[['^AndroidManifest\\.xml$','Manifest'],['^resources\\.arsc$','Resources'],['^classes(\\d+)?\\.dex$','DEX']],focus:'Evaluasi kelayakan rebuild yang diizinkan, baseline, alignment dan verifikasi tanda tangan; jangan menyatakan APK siap dipasang tanpa hasil build nyata.'},
 {id:'qa',name:'QA & Debugging Engineering',domain:'Pengujian',description:'Test plan, regresi, error reproduksi, dan batasan klaim hasil.',sections:['Temuan Lokal','DEX','Manifest'],patterns:[['^AndroidManifest\\.xml$','Manifest'],['^classes(\\d+)?\\.dex$','DEX'],['^resources\\.arsc$','Resources']],focus:'Buat rencana uji eksplisit dan hipotesis yang dapat dibuktikan, termasuk error yang membutuhkan perangkat nyata.'}
];
const frozen=catalog.map(x=>Object.freeze(Object.assign({},x,{sections:Object.freeze(x.sections.slice()),patterns:Object.freeze(x.patterns.map(p=>Object.freeze(p.slice())))})));
const byId=Object.fromEntries(frozen.map(x=>[x.id,x]));
function getSkill(id){return byId[id]||null;}
function collectPaths(report){
  if(!report||typeof report!=='object')return [];
  const out=[],set=new Set();
  for(const item of (Array.isArray(report.entries)?report.entries:[]).slice(0,4000)){
    const p=typeof item==='string'?item:(item&&typeof item.name==='string'?item.name:'');
    if(p&&p.length<=1024&&!set.has(p)){set.add(p);out.push(p);}
  }
  return out;
}
function evaluate(report){
 const paths=collectPaths(report);
 const technologies=(report&&Array.isArray(report.languages)?report.languages:[]).slice(0,60).map(x=>String(typeof x==='string'?x:(x&&x.technology||''))).filter(Boolean);
 return frozen.map(skill=>{
  const evid=[];
  for(const [pattern,label] of skill.patterns) {
   const re=new RegExp(pattern,'i');const path=paths.find(p=>re.test(p));
   if(path){evid.push({kind:'file',label,path});if(evid.length>=5)break;}
  }
  if(skill.id==='android' && report&&report.deep&&report.deep.manifest&&report.deep.manifest.status==='ok')evid.unshift({kind:'parser',label:'Manifest biner terbaca',path:'deep.manifest.status'});
  if(skill.id==='integrity'&&report&&report.signingInspection&&report.signingInspection.status)evid.unshift({kind:'parser',label:'Inspeksi signing tersedia',path:'signingInspection.status'});
  if(skill.id==='native'&&report&&Array.isArray(report.nativeLibraries)&&report.nativeLibraries.length)evid.unshift({kind:'parser',label:'Metadata ELF terbaca',path:'nativeLibraries'});
  if(skill.id==='jvm'&&report&&report.dexSymbols&&Array.isArray(report.dexSymbols.classes)&&report.dexSymbols.classes.length)evid.unshift({kind:'parser',label:'Simbol DEX tersedia',path:'dexSymbols.classes'});
  if(skill.id==='game'&&technologies.some(x=>/unity|unreal|godot|cocos/i.test(x)))evid.unshift({kind:'heuristic',label:'Profil teknologi game terindikasi',path:'languages.technology'});
  const evidence=evid.slice(0,6);
  const status=!report?'belum-dianalisis':evidence.some(x=>x.kind==='parser'||x.kind==='file')?'ada-bukti':evidence.length?'indikasi':'bukti-terbatas';
  return {id:skill.id,name:skill.name,domain:skill.domain,description:skill.description,sections:skill.sections,focus:skill.focus,evidence,status,notice:common};
 });
}
function questionFor(id){
 const s=getSkill(id);if(!s)return '';
 return 'Bertindak sebagai analis '+s.name+' untuk APK atau proyek yang saya miliki atau berizin. '+s.focus+' '+common+' '+privacy+' Berikan: (1) bukti dan asalnya, (2) interpretasi terkalibrasi, (3) risiko atau batas, (4) prioritas langkah verifikasi, (5) pengujian yang disarankan. Jangan membuat fakta, path, kelas, atau hasil tes yang tidak ada.';
}
function contextFor(id){
 const s=getSkill(id);if(!s)return null;
 return {id:s.id,title:s.name,domain:s.domain,focus:s.focus,methodology:common,privacy,limits:'Metadata statis bukan bukti runtime; review game hanya untuk proyek milik sendiri atau berizin.'};
}
global.SkillIntelligence=Object.freeze({catalog:frozen,getSkill,evaluate,questionFor,contextFor});
})(typeof window!=='undefined'?window:globalThis);
,'Lua source'],['\\.luac,domain:'Native',description:'ELF, ABI, library .so, JNI dan komponen native.',sections:['Native Libs','Teknologi','Integritas CRC'],patterns:[['^lib/[^/]+/.+\\.so$','Native shared library'],['\\.so$','ELF kandidat'],['(^|/)jni/','JNI']],focus:'Audit metadata ELF, ABI dan struktur JNI; kode mesin tidak otomatis terdekompilasi menjadi C/C++ asli.'},
 {id:'web',name:'JavaScript & WebView Engineering',domain:'Web',description:'Aset HTML/JS/CSS dan potensi komunikasi WebView–Android.',sections:['Temuan Lokal','Teknologi','Resources'],patterns:[['\\.js$','JavaScript asset'],['\\.html?$','HTML asset'],['\\.css$','CSS asset'],['(^|/)(www|webview)/','WebView assets']],focus:'Uraikan berkas web yang ditemukan; klaim adanya bridge JavaScript–Android memerlukan kode sumber atau bukti tambahan.'},
 {id:'reverse',name:'Reverse Engineering',domain:'Analisis statis',description:'Struktur APK/ZIP64, Manifest, DEX, Smali dan sumber dekompilasi.',sections:['DEX','Manifest','APK Bersarang','Simbol DEX'],patterns:[['^AndroidManifest\\.xml$','Manifest'],['^classes(\\d+)?\\.dex$','DEX'],['\\.smali$','Smali'],['^resources\\.arsc$','Resources']],focus:'Susun peta berkas/kelas berdasarkan observasi, ketidakpastian dekompilasi, dan langkah review yang dapat direproduksi.'},
 {id:'game',name:'Game Engineering',domain:'Game',description:'Jejak engine game, aset, paket data, dan komponen UI game.',sections:['Teknologi','Resources','Native Libs'],patterns:[['(^|/)globalgamemanagers$','Unity marker'],['(^|/)libunity\\.so$','Unity library'],['(^|/)libil2cpp\\.so$','IL2CPP library'],['(^|/)libUE4\\.so$','Unreal library'],['(^|/)libUnreal\\.so$','Unreal library'],['\\.pck$','Godot package'],['(^|/)cocos','Cocos marker'],['\\.unity3d$','Unity asset']],focus:'Tentukan indikasi engine dari bukti berkas, bukan dari nama game; cek asal aset dan kompatibilitas.'},
 {id:'modding',name:'Game Modding Engineering',domain:'Modding offline',description:'Peninjauan perubahan aset dan resource game milik sendiri atau berizin.',sections:['Resources','Teknologi','Integritas CRC'],patterns:[['^resources\\.arsc$','Resource table'],['(^|/)assets/','Assets'],['\\.(png|json|xml|webp)$','Modifiable asset candidate']],focus:'Bahas kompatibilitas mod offline yang diizinkan, backup baseline, dan risiko kehilangan data; jangan instruksikan bypass proteksi/anti-cheat atau manipulasi game daring.'},
 {id:'game-integrity',name:'Game Mechanics & Integrity Analysis',domain:'Game audit',description:'Tinjau mekanika yang terdokumentasi, flag debug, dan risiko integritas secara read-only.',sections:['Temuan Lokal','Simbol DEX','Integritas CRC'],patterns:[['(^|/)globalgamemanagers$','Game technology marker'],['(^|/)libunity\\.so$','Game library'],['(^|/)libil2cpp\\.so$','Game library'],['(^|/)libUE4\\.so$','Game library'],['\\.pck$','Game data']],focus:'Audit hanya yang tersedia dalam bukti statis dan proyek yang diizinkan. Tidak menyusun cheat untuk multiplayer, menghindari anti-cheat, membobol akun, atau menyembunyikan perubahan.'},
 {id:'integrity',name:'Integrity & Security Review',domain:'Verifikasi',description:'CRC, struktur signature, metadata signing, dan indikator risiko arsip.',sections:['Signing','Integritas CRC','Temuan Lokal'],patterns:[['^META-INF/','Signature metadata'],['^AndroidManifest\\.xml$','Manifest'],['^classes(\\d+)?\\.dex$','DEX']],focus:'Pisahkan signature block terdeteksi dari signature yang benar-benar terverifikasi, serta CRC sampel dari validasi menyeluruh.'},
 {id:'build',name:'Build & Signing Engineering',domain:'Rebuild',description:'Validasi patch, zipalign, signing, dan kompatibilitas APK.',sections:['Signing','Manifest','Integritas CRC'],patterns:[['^AndroidManifest\\.xml$','Manifest'],['^resources\\.arsc$','Resources'],['^classes(\\d+)?\\.dex$','DEX']],focus:'Evaluasi kelayakan rebuild yang diizinkan, baseline, alignment dan verifikasi tanda tangan; jangan menyatakan APK siap dipasang tanpa hasil build nyata.'},
 {id:'qa',name:'QA & Debugging Engineering',domain:'Pengujian',description:'Test plan, regresi, error reproduksi, dan batasan klaim hasil.',sections:['Temuan Lokal','DEX','Manifest'],patterns:[['^AndroidManifest\\.xml$','Manifest'],['^classes(\\d+)?\\.dex$','DEX'],['^resources\\.arsc$','Resources']],focus:'Buat rencana uji eksplisit dan hipotesis yang dapat dibuktikan, termasuk error yang membutuhkan perangkat nyata.'}
];
const frozen=catalog.map(x=>Object.freeze(Object.assign({},x,{sections:Object.freeze(x.sections.slice()),patterns:Object.freeze(x.patterns.map(p=>Object.freeze(p.slice())))})));
const byId=Object.fromEntries(frozen.map(x=>[x.id,x]));
function getSkill(id){return byId[id]||null;}
function collectPaths(report){
  if(!report||typeof report!=='object')return [];
  const out=[],set=new Set();
  for(const item of (Array.isArray(report.entries)?report.entries:[]).slice(0,4000)){
    const p=typeof item==='string'?item:(item&&typeof item.name==='string'?item.name:'');
    if(p&&p.length<=1024&&!set.has(p)){set.add(p);out.push(p);}
  }
  return out;
}
function evaluate(report){
 const paths=collectPaths(report);
 const technologies=(report&&Array.isArray(report.languages)?report.languages:[]).slice(0,60).map(x=>String(typeof x==='string'?x:(x&&x.technology||''))).filter(Boolean);
 return frozen.map(skill=>{
  const evid=[];
  for(const [pattern,label] of skill.patterns) {
   const re=new RegExp(pattern,'i');const path=paths.find(p=>re.test(p));
   if(path){evid.push({kind:'file',label,path});if(evid.length>=5)break;}
  }
  if(skill.id==='android' && report&&report.deep&&report.deep.manifest&&report.deep.manifest.status==='ok')evid.unshift({kind:'parser',label:'Manifest biner terbaca',path:'deep.manifest.status'});
  if(skill.id==='integrity'&&report&&report.signingInspection&&report.signingInspection.status)evid.unshift({kind:'parser',label:'Inspeksi signing tersedia',path:'signingInspection.status'});
  if(skill.id==='native'&&report&&Array.isArray(report.nativeLibraries)&&report.nativeLibraries.length)evid.unshift({kind:'parser',label:'Metadata ELF terbaca',path:'nativeLibraries'});
  if(skill.id==='jvm'&&report&&report.dexSymbols&&Array.isArray(report.dexSymbols.classes)&&report.dexSymbols.classes.length)evid.unshift({kind:'parser',label:'Simbol DEX tersedia',path:'dexSymbols.classes'});
  if(skill.id==='game'&&technologies.some(x=>/unity|unreal|godot|cocos/i.test(x)))evid.unshift({kind:'heuristic',label:'Profil teknologi game terindikasi',path:'languages.technology'});
  const evidence=evid.slice(0,6);
  const status=!report?'belum-dianalisis':evidence.some(x=>x.kind==='parser'||x.kind==='file')?'ada-bukti':evidence.length?'indikasi':'bukti-terbatas';
  return {id:skill.id,name:skill.name,domain:skill.domain,description:skill.description,sections:skill.sections,focus:skill.focus,evidence,status,notice:common};
 });
}
function questionFor(id){
 const s=getSkill(id);if(!s)return '';
 return 'Bertindak sebagai analis '+s.name+' untuk APK atau proyek yang saya miliki atau berizin. '+s.focus+' '+common+' '+privacy+' Berikan: (1) bukti dan asalnya, (2) interpretasi terkalibrasi, (3) risiko atau batas, (4) prioritas langkah verifikasi, (5) pengujian yang disarankan. Jangan membuat fakta, path, kelas, atau hasil tes yang tidak ada.';
}
function contextFor(id){
 const s=getSkill(id);if(!s)return null;
 return {id:s.id,title:s.name,domain:s.domain,focus:s.focus,methodology:common,privacy,limits:'Metadata statis bukan bukti runtime; review game hanya untuk proyek milik sendiri atau berizin.'};
}
global.SkillIntelligence=Object.freeze({catalog:frozen,getSkill,evaluate,questionFor,contextFor});
})(typeof window!=='undefined'?window:globalThis);
,'Lua bytecode (bukan source)'],['(^|/)liblua[^/]*\\.so,domain:'Native',description:'ELF, ABI, library .so, JNI dan komponen native.',sections:['Native Libs','Teknologi','Integritas CRC'],patterns:[['^lib/[^/]+/.+\\.so$','Native shared library'],['\\.so$','ELF kandidat'],['(^|/)jni/','JNI']],focus:'Audit metadata ELF, ABI dan struktur JNI; kode mesin tidak otomatis terdekompilasi menjadi C/C++ asli.'},
 {id:'web',name:'JavaScript & WebView Engineering',domain:'Web',description:'Aset HTML/JS/CSS dan potensi komunikasi WebView–Android.',sections:['Temuan Lokal','Teknologi','Resources'],patterns:[['\\.js$','JavaScript asset'],['\\.html?$','HTML asset'],['\\.css$','CSS asset'],['(^|/)(www|webview)/','WebView assets']],focus:'Uraikan berkas web yang ditemukan; klaim adanya bridge JavaScript–Android memerlukan kode sumber atau bukti tambahan.'},
 {id:'reverse',name:'Reverse Engineering',domain:'Analisis statis',description:'Struktur APK/ZIP64, Manifest, DEX, Smali dan sumber dekompilasi.',sections:['DEX','Manifest','APK Bersarang','Simbol DEX'],patterns:[['^AndroidManifest\\.xml$','Manifest'],['^classes(\\d+)?\\.dex$','DEX'],['\\.smali$','Smali'],['^resources\\.arsc$','Resources']],focus:'Susun peta berkas/kelas berdasarkan observasi, ketidakpastian dekompilasi, dan langkah review yang dapat direproduksi.'},
 {id:'game',name:'Game Engineering',domain:'Game',description:'Jejak engine game, aset, paket data, dan komponen UI game.',sections:['Teknologi','Resources','Native Libs'],patterns:[['(^|/)globalgamemanagers$','Unity marker'],['(^|/)libunity\\.so$','Unity library'],['(^|/)libil2cpp\\.so$','IL2CPP library'],['(^|/)libUE4\\.so$','Unreal library'],['(^|/)libUnreal\\.so$','Unreal library'],['\\.pck$','Godot package'],['(^|/)cocos','Cocos marker'],['\\.unity3d$','Unity asset']],focus:'Tentukan indikasi engine dari bukti berkas, bukan dari nama game; cek asal aset dan kompatibilitas.'},
 {id:'modding',name:'Game Modding Engineering',domain:'Modding offline',description:'Peninjauan perubahan aset dan resource game milik sendiri atau berizin.',sections:['Resources','Teknologi','Integritas CRC'],patterns:[['^resources\\.arsc$','Resource table'],['(^|/)assets/','Assets'],['\\.(png|json|xml|webp)$','Modifiable asset candidate']],focus:'Bahas kompatibilitas mod offline yang diizinkan, backup baseline, dan risiko kehilangan data; jangan instruksikan bypass proteksi/anti-cheat atau manipulasi game daring.'},
 {id:'game-integrity',name:'Game Mechanics & Integrity Analysis',domain:'Game audit',description:'Tinjau mekanika yang terdokumentasi, flag debug, dan risiko integritas secara read-only.',sections:['Temuan Lokal','Simbol DEX','Integritas CRC'],patterns:[['(^|/)globalgamemanagers$','Game technology marker'],['(^|/)libunity\\.so$','Game library'],['(^|/)libil2cpp\\.so$','Game library'],['(^|/)libUE4\\.so$','Game library'],['\\.pck$','Game data']],focus:'Audit hanya yang tersedia dalam bukti statis dan proyek yang diizinkan. Tidak menyusun cheat untuk multiplayer, menghindari anti-cheat, membobol akun, atau menyembunyikan perubahan.'},
 {id:'integrity',name:'Integrity & Security Review',domain:'Verifikasi',description:'CRC, struktur signature, metadata signing, dan indikator risiko arsip.',sections:['Signing','Integritas CRC','Temuan Lokal'],patterns:[['^META-INF/','Signature metadata'],['^AndroidManifest\\.xml$','Manifest'],['^classes(\\d+)?\\.dex$','DEX']],focus:'Pisahkan signature block terdeteksi dari signature yang benar-benar terverifikasi, serta CRC sampel dari validasi menyeluruh.'},
 {id:'build',name:'Build & Signing Engineering',domain:'Rebuild',description:'Validasi patch, zipalign, signing, dan kompatibilitas APK.',sections:['Signing','Manifest','Integritas CRC'],patterns:[['^AndroidManifest\\.xml$','Manifest'],['^resources\\.arsc$','Resources'],['^classes(\\d+)?\\.dex$','DEX']],focus:'Evaluasi kelayakan rebuild yang diizinkan, baseline, alignment dan verifikasi tanda tangan; jangan menyatakan APK siap dipasang tanpa hasil build nyata.'},
 {id:'qa',name:'QA & Debugging Engineering',domain:'Pengujian',description:'Test plan, regresi, error reproduksi, dan batasan klaim hasil.',sections:['Temuan Lokal','DEX','Manifest'],patterns:[['^AndroidManifest\\.xml$','Manifest'],['^classes(\\d+)?\\.dex$','DEX'],['^resources\\.arsc$','Resources']],focus:'Buat rencana uji eksplisit dan hipotesis yang dapat dibuktikan, termasuk error yang membutuhkan perangkat nyata.'}
];
const frozen=catalog.map(x=>Object.freeze(Object.assign({},x,{sections:Object.freeze(x.sections.slice()),patterns:Object.freeze(x.patterns.map(p=>Object.freeze(p.slice())))})));
const byId=Object.fromEntries(frozen.map(x=>[x.id,x]));
function getSkill(id){return byId[id]||null;}
function collectPaths(report){
  if(!report||typeof report!=='object')return [];
  const out=[],set=new Set();
  for(const item of (Array.isArray(report.entries)?report.entries:[]).slice(0,4000)){
    const p=typeof item==='string'?item:(item&&typeof item.name==='string'?item.name:'');
    if(p&&p.length<=1024&&!set.has(p)){set.add(p);out.push(p);}
  }
  return out;
}
function evaluate(report){
 const paths=collectPaths(report);
 const technologies=(report&&Array.isArray(report.languages)?report.languages:[]).slice(0,60).map(x=>String(typeof x==='string'?x:(x&&x.technology||''))).filter(Boolean);
 return frozen.map(skill=>{
  const evid=[];
  for(const [pattern,label] of skill.patterns) {
   const re=new RegExp(pattern,'i');const path=paths.find(p=>re.test(p));
   if(path){evid.push({kind:'file',label,path});if(evid.length>=5)break;}
  }
  if(skill.id==='android' && report&&report.deep&&report.deep.manifest&&report.deep.manifest.status==='ok')evid.unshift({kind:'parser',label:'Manifest biner terbaca',path:'deep.manifest.status'});
  if(skill.id==='integrity'&&report&&report.signingInspection&&report.signingInspection.status)evid.unshift({kind:'parser',label:'Inspeksi signing tersedia',path:'signingInspection.status'});
  if(skill.id==='native'&&report&&Array.isArray(report.nativeLibraries)&&report.nativeLibraries.length)evid.unshift({kind:'parser',label:'Metadata ELF terbaca',path:'nativeLibraries'});
  if(skill.id==='jvm'&&report&&report.dexSymbols&&Array.isArray(report.dexSymbols.classes)&&report.dexSymbols.classes.length)evid.unshift({kind:'parser',label:'Simbol DEX tersedia',path:'dexSymbols.classes'});
  if(skill.id==='game'&&technologies.some(x=>/unity|unreal|godot|cocos/i.test(x)))evid.unshift({kind:'heuristic',label:'Profil teknologi game terindikasi',path:'languages.technology'});
  const evidence=evid.slice(0,6);
  const status=!report?'belum-dianalisis':evidence.some(x=>x.kind==='parser'||x.kind==='file')?'ada-bukti':evidence.length?'indikasi':'bukti-terbatas';
  return {id:skill.id,name:skill.name,domain:skill.domain,description:skill.description,sections:skill.sections,focus:skill.focus,evidence,status,notice:common};
 });
}
function questionFor(id){
 const s=getSkill(id);if(!s)return '';
 return 'Bertindak sebagai analis '+s.name+' untuk APK atau proyek yang saya miliki atau berizin. '+s.focus+' '+common+' '+privacy+' Berikan: (1) bukti dan asalnya, (2) interpretasi terkalibrasi, (3) risiko atau batas, (4) prioritas langkah verifikasi, (5) pengujian yang disarankan. Jangan membuat fakta, path, kelas, atau hasil tes yang tidak ada.';
}
function contextFor(id){
 const s=getSkill(id);if(!s)return null;
 return {id:s.id,title:s.name,domain:s.domain,focus:s.focus,methodology:common,privacy,limits:'Metadata statis bukan bukti runtime; review game hanya untuk proyek milik sendiri atau berizin.'};
}
global.SkillIntelligence=Object.freeze({catalog:frozen,getSkill,evaluate,questionFor,contextFor});
})(typeof window!=='undefined'?window:globalThis);
,'Native Lua runtime']],focus:'Audit skrip Lua secara read-only, identifikasi dependensi, operasi dinamis dan petunjuk Windows/Android. Jangan mengeksekusi, menginjeksi, mengubah runtime game, atau menghindari anti-cheat.'},
 {id:'native',name:'C/C++ & Native Engineering',domain:'Native',description:'ELF, ABI, library .so, JNI dan komponen native.',sections:['Native Libs','Teknologi','Integritas CRC'],patterns:[['^lib/[^/]+/.+\\.so$','Native shared library'],['\\.so$','ELF kandidat'],['(^|/)jni/','JNI']],focus:'Audit metadata ELF, ABI dan struktur JNI; kode mesin tidak otomatis terdekompilasi menjadi C/C++ asli.'},
 {id:'web',name:'JavaScript & WebView Engineering',domain:'Web',description:'Aset HTML/JS/CSS dan potensi komunikasi WebView–Android.',sections:['Temuan Lokal','Teknologi','Resources'],patterns:[['\\.js$','JavaScript asset'],['\\.html?$','HTML asset'],['\\.css$','CSS asset'],['(^|/)(www|webview)/','WebView assets']],focus:'Uraikan berkas web yang ditemukan; klaim adanya bridge JavaScript–Android memerlukan kode sumber atau bukti tambahan.'},
 {id:'reverse',name:'Reverse Engineering',domain:'Analisis statis',description:'Struktur APK/ZIP64, Manifest, DEX, Smali dan sumber dekompilasi.',sections:['DEX','Manifest','APK Bersarang','Simbol DEX'],patterns:[['^AndroidManifest\\.xml$','Manifest'],['^classes(\\d+)?\\.dex$','DEX'],['\\.smali$','Smali'],['^resources\\.arsc$','Resources']],focus:'Susun peta berkas/kelas berdasarkan observasi, ketidakpastian dekompilasi, dan langkah review yang dapat direproduksi.'},
 {id:'game',name:'Game Engineering',domain:'Game',description:'Jejak engine game, aset, paket data, dan komponen UI game.',sections:['Teknologi','Resources','Native Libs'],patterns:[['(^|/)globalgamemanagers$','Unity marker'],['(^|/)libunity\\.so$','Unity library'],['(^|/)libil2cpp\\.so$','IL2CPP library'],['(^|/)libUE4\\.so$','Unreal library'],['(^|/)libUnreal\\.so$','Unreal library'],['\\.pck$','Godot package'],['(^|/)cocos','Cocos marker'],['\\.unity3d$','Unity asset']],focus:'Tentukan indikasi engine dari bukti berkas, bukan dari nama game; cek asal aset dan kompatibilitas.'},
 {id:'modding',name:'Game Modding Engineering',domain:'Modding offline',description:'Peninjauan perubahan aset dan resource game milik sendiri atau berizin.',sections:['Resources','Teknologi','Integritas CRC'],patterns:[['^resources\\.arsc$','Resource table'],['(^|/)assets/','Assets'],['\\.(png|json|xml|webp)$','Modifiable asset candidate']],focus:'Bahas kompatibilitas mod offline yang diizinkan, backup baseline, dan risiko kehilangan data; jangan instruksikan bypass proteksi/anti-cheat atau manipulasi game daring.'},
 {id:'game-integrity',name:'Game Mechanics & Integrity Analysis',domain:'Game audit',description:'Tinjau mekanika yang terdokumentasi, flag debug, dan risiko integritas secara read-only.',sections:['Temuan Lokal','Simbol DEX','Integritas CRC'],patterns:[['(^|/)globalgamemanagers$','Game technology marker'],['(^|/)libunity\\.so$','Game library'],['(^|/)libil2cpp\\.so$','Game library'],['(^|/)libUE4\\.so$','Game library'],['\\.pck$','Game data']],focus:'Audit hanya yang tersedia dalam bukti statis dan proyek yang diizinkan. Tidak menyusun cheat untuk multiplayer, menghindari anti-cheat, membobol akun, atau menyembunyikan perubahan.'},
 {id:'integrity',name:'Integrity & Security Review',domain:'Verifikasi',description:'CRC, struktur signature, metadata signing, dan indikator risiko arsip.',sections:['Signing','Integritas CRC','Temuan Lokal'],patterns:[['^META-INF/','Signature metadata'],['^AndroidManifest\\.xml$','Manifest'],['^classes(\\d+)?\\.dex$','DEX']],focus:'Pisahkan signature block terdeteksi dari signature yang benar-benar terverifikasi, serta CRC sampel dari validasi menyeluruh.'},
 {id:'build',name:'Build & Signing Engineering',domain:'Rebuild',description:'Validasi patch, zipalign, signing, dan kompatibilitas APK.',sections:['Signing','Manifest','Integritas CRC'],patterns:[['^AndroidManifest\\.xml$','Manifest'],['^resources\\.arsc$','Resources'],['^classes(\\d+)?\\.dex$','DEX']],focus:'Evaluasi kelayakan rebuild yang diizinkan, baseline, alignment dan verifikasi tanda tangan; jangan menyatakan APK siap dipasang tanpa hasil build nyata.'},
 {id:'qa',name:'QA & Debugging Engineering',domain:'Pengujian',description:'Test plan, regresi, error reproduksi, dan batasan klaim hasil.',sections:['Temuan Lokal','DEX','Manifest'],patterns:[['^AndroidManifest\\.xml$','Manifest'],['^classes(\\d+)?\\.dex$','DEX'],['^resources\\.arsc$','Resources']],focus:'Buat rencana uji eksplisit dan hipotesis yang dapat dibuktikan, termasuk error yang membutuhkan perangkat nyata.'}
];
const frozen=catalog.map(x=>Object.freeze(Object.assign({},x,{sections:Object.freeze(x.sections.slice()),patterns:Object.freeze(x.patterns.map(p=>Object.freeze(p.slice())))})));
const byId=Object.fromEntries(frozen.map(x=>[x.id,x]));
function getSkill(id){return byId[id]||null;}
function collectPaths(report){
  if(!report||typeof report!=='object')return [];
  const out=[],set=new Set();
  for(const item of (Array.isArray(report.entries)?report.entries:[]).slice(0,4000)){
    const p=typeof item==='string'?item:(item&&typeof item.name==='string'?item.name:'');
    if(p&&p.length<=1024&&!set.has(p)){set.add(p);out.push(p);}
  }
  return out;
}
function evaluate(report){
 const paths=collectPaths(report);
 const technologies=(report&&Array.isArray(report.languages)?report.languages:[]).slice(0,60).map(x=>String(typeof x==='string'?x:(x&&x.technology||''))).filter(Boolean);
 return frozen.map(skill=>{
  const evid=[];
  for(const [pattern,label] of skill.patterns) {
   const re=new RegExp(pattern,'i');const path=paths.find(p=>re.test(p));
   if(path){evid.push({kind:'file',label,path});if(evid.length>=5)break;}
  }
  if(skill.id==='android' && report&&report.deep&&report.deep.manifest&&report.deep.manifest.status==='ok')evid.unshift({kind:'parser',label:'Manifest biner terbaca',path:'deep.manifest.status'});
  if(skill.id==='integrity'&&report&&report.signingInspection&&report.signingInspection.status)evid.unshift({kind:'parser',label:'Inspeksi signing tersedia',path:'signingInspection.status'});
  if(skill.id==='native'&&report&&Array.isArray(report.nativeLibraries)&&report.nativeLibraries.length)evid.unshift({kind:'parser',label:'Metadata ELF terbaca',path:'nativeLibraries'});
  if(skill.id==='jvm'&&report&&report.dexSymbols&&Array.isArray(report.dexSymbols.classes)&&report.dexSymbols.classes.length)evid.unshift({kind:'parser',label:'Simbol DEX tersedia',path:'dexSymbols.classes'});
  if(skill.id==='game'&&technologies.some(x=>/unity|unreal|godot|cocos/i.test(x)))evid.unshift({kind:'heuristic',label:'Profil teknologi game terindikasi',path:'languages.technology'});
  const evidence=evid.slice(0,6);
  const status=!report?'belum-dianalisis':evidence.some(x=>x.kind==='parser'||x.kind==='file')?'ada-bukti':evidence.length?'indikasi':'bukti-terbatas';
  return {id:skill.id,name:skill.name,domain:skill.domain,description:skill.description,sections:skill.sections,focus:skill.focus,evidence,status,notice:common};
 });
}
function questionFor(id){
 const s=getSkill(id);if(!s)return '';
 return 'Bertindak sebagai analis '+s.name+' untuk APK atau proyek yang saya miliki atau berizin. '+s.focus+' '+common+' '+privacy+' Berikan: (1) bukti dan asalnya, (2) interpretasi terkalibrasi, (3) risiko atau batas, (4) prioritas langkah verifikasi, (5) pengujian yang disarankan. Jangan membuat fakta, path, kelas, atau hasil tes yang tidak ada.';
}
function contextFor(id){
 const s=getSkill(id);if(!s)return null;
 return {id:s.id,title:s.name,domain:s.domain,focus:s.focus,methodology:common,privacy,limits:'Metadata statis bukan bukti runtime; review game hanya untuk proyek milik sendiri atau berizin.'};
}
global.SkillIntelligence=Object.freeze({catalog:frozen,getSkill,evaluate,questionFor,contextFor});
})(typeof window!=='undefined'?window:globalThis);
