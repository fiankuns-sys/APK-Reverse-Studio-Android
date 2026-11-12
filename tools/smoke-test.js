const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '../app/src/main/assets/studio.js'), 'utf8');
const skillCode = fs.readFileSync(path.join(__dirname, '../app/src/main/assets/skill-intelligence.js'), 'utf8');
const disk = new Map();
function runApp() {
  const handlers = {};
  const root = {innerHTML:'', addEventListener(name, f){handlers[name]=f;}};
  const filePicker = {addEventListener(){}, click(){}, focus(){}, setSelectionRange(){}};
  const document = {
    getElementById(id){return id==='app'?root:filePicker;},
    querySelector(){return null;},
    createElement(){return {textContent:'',remove(){},style:{},setAttribute(){}};},
    body:{appendChild(){}},
  };
  const window={scrollTo(){},isSecureContext:false};
  const localStorage={getItem(key){return disk.get(key)||null;},setItem(key,value){disk.set(key,value);}};
  const context={window,document,localStorage,console,setTimeout(){return 1;},clearTimeout(){}};
  vm.runInNewContext(skillCode,context,{timeout:1000});
  vm.runInNewContext(code,context,{timeout:1000});
  return {root,handlers,window};
}
let app=runApp();
assert.match(app.root.innerHTML,/Pusat Kendali/);
assert.match(app.root.innerHTML,/Pilih Berkas Android/);
assert.match(app.root.innerHTML,/data-target="settings"/);
app.window.StudioUI.onNativeFile({name:'demo.apk',size:10485760,selectedAt:1000});
assert.match(app.root.innerHTML,/demo\.apk/);
assert.match(app.root.innerHTML,/10 MB/);
app.handlers.click({target:{closest(){return {getAttribute(k){return k==='data-action'?'route':'assistant';}};}}});
assert.match(app.root.innerHTML,/ChatGPT Analysis/);
app.handlers.input({target:{id:'aiDraft',value:'Tolong audit struktur aplikasi'}});
app=runApp();
assert.match(app.root.innerHTML,/ChatGPT Analysis/);
assert.match(app.root.innerHTML,/Tolong audit struktur aplikasi/);
app.window.StudioUI.onNativeFile({name:'<img src=x onerror=alert(1)>.apk',size:1,selectedAt:2000});
assert.doesNotMatch(app.root.innerHTML, /<img src=x onerror/);
assert.match(app.root.innerHTML,/&lt;img src=x onerror/);
const prev=disk.get('apk_reverse_studio_ui_v1');
app.window.StudioUI.onNativeFile({name:'too-large.apk',size:41*1024*1024*1024});
assert.equal(disk.get('apk_reverse_studio_ui_v1'),prev);
const saved=JSON.parse(disk.get('apk_reverse_studio_ui_v1'));
assert.equal(saved.aiDraft,'Tolong audit struktur aplikasi');
assert.equal(saved.route,'assistant');
// Browser preview must support clearing its local UI state without accessing an Android-only bridge.
app.handlers.click({target:{closest(){return {getAttribute(k){return k==='data-action'?'clear':'';}};}}});
assert.match(app.root.innerHTML,/Hapus data lokal|hapus data/i);
app.handlers.click({target:{closest(){return {getAttribute(k){return k==='data-action'?'confirm-clear':'';}};}}});
assert.match(app.root.innerHTML,/Pilih Berkas Android/);
assert.equal(JSON.parse(disk.get('apk_reverse_studio_ui_v1')).project,null);
// Restore prior fixture: later tests expect the original saved AI question.
disk.set('apk_reverse_studio_ui_v1',prev);
console.log('UI smoke tests PASS: dashboard, file metadata, 40GB guard, navigation, autosave, restart, HTML escaping, browser clear.');
// Simulate Android's native bridge returning a REAL indexed report.
const nativeDisk={file:{name:'tes.apk',size:1234,selectedAt:99000,uri:'content://test/test.apk'},report:null,calls:[]};
const workspaceDisk={value:null,patch:null};
const apktoolDisk={value:null,patch:null};
const buildDisk={value:null};
const jobDisk={jobs:[]};
function nativeBridge(){return {
  savedFile(){return JSON.stringify(nativeDisk.file);},
  savedReport(){return JSON.stringify(nativeDisk.report);},
  workspaceStatus(){return JSON.stringify(workspaceDisk.value);},
  apktoolStatus(){return JSON.stringify(apktoolDisk.value);},
  buildReportStatus(){return JSON.stringify(buildDisk.value);},
  chooseBuildReport(){nativeDisk.calls.push("import-build-report");},
  chooseApktoolBundle(){nativeDisk.calls.push('import-apktool');},
  exportApktoolPatches(){nativeDisk.calls.push('export-apktool');},
  openApktoolSource(path){return JSON.stringify({status:'ok',path,originalSha256:'89abcdef12345678',modified:!!apktoolDisk.patch,content:apktoolDisk.patch||'.class public Ldemo/App;\n.super Ljava/lang/Object;\n.method public go()V\n.end method\n'});},
  saveApktoolPatch(path,text){if(!text.includes('.end method'))return JSON.stringify({status:'error',message:'Smali gagal preflight'});apktoolDisk.patch=text;apktoolDisk.value.changedPaths=[path];return JSON.stringify({status:'ok',changedPaths:[path]});},
  resetApktoolPatch(path){apktoolDisk.patch=null;apktoolDisk.value.changedPaths=[];return JSON.stringify({status:'ok',changedPaths:[]});},
  chooseJadxBundle(){nativeDisk.calls.push('import-jadx');},
  exportWorkspacePatches(){nativeDisk.calls.push('export-patches');},
  openWorkspaceSource(path){return JSON.stringify({status:'ok',path,content:workspaceDisk.patch||'package demo; class Example { String safe = \"<img>\"; }',modified:!!workspaceDisk.patch,originalSha256:'abcdef0123456789'});},
  saveWorkspacePatch(path,content){workspaceDisk.patch=content;workspaceDisk.value.changedPaths=[path];return JSON.stringify({status:'ok',modified:true,changedPaths:[path]});},
  resetWorkspacePatch(path){workspaceDisk.patch=null;workspaceDisk.value.changedPaths=[];return JSON.stringify({status:'ok',modified:false,changedPaths:[]});},
  startInspection(){nativeDisk.calls.push('inspect');},
  cancelInspection(){nativeDisk.calls.push('cancel');},
  clearSavedFile(){nativeDisk.calls.push('clear');},
  copyText(value){nativeDisk.calls.push(value);},
  chooseFile(){nativeDisk.calls.push('pick');},
  chatGptStatus(){return JSON.stringify({connected:true,allowed:true,email:'example@example.com'});},
  startChatGptLogin(){nativeDisk.calls.push('login');},
  disconnectChatGpt(){nativeDisk.calls.push('logout');},
  loadChatGptModels(){nativeDisk.calls.push('models');},
  sendChatGpt(payload){nativeDisk.calls.push('send:'+payload);},
};}
function runAndroid(){
 const old=globalThis.__TEST_NATIVE__;
 globalThis.__TEST_NATIVE__=nativeBridge();
 const state=runAppWithNative(globalThis.__TEST_NATIVE__);
 globalThis.__TEST_NATIVE__=old;
 return state;
}
function runAppWithNative(bridge){
  const handlers={};
  const root={innerHTML:'',addEventListener(name,fn){handlers[name]=fn;}};
  const filePicker={addEventListener(){},focus(){},setSelectionRange(){}};
  const document={getElementById(id){return id==='app'?root:filePicker;},querySelector(){return null;},createElement(){return {textContent:'',remove(){},style:{},setAttribute(){}};},body:{appendChild(){}}};
  const window={scrollTo(){},StudioNative:bridge};
  const localStorage={getItem(key){return disk.get(key)||null;},setItem(key,value){disk.set(key,value);}};
  const testContext={window,document,localStorage,console,setTimeout(){return 1;},clearTimeout(){}};
  vm.runInNewContext(skillCode,testContext,{timeout:1500});
  vm.runInNewContext(code,testContext,{timeout:1500});
  window.StudioUI.onChatGptUpdate({status:'models',data:{models:[{id:'gpt-test-model',label:'Testing model'}]}});
  return {root,window,handlers};
}
function clickAction(app,action,target=''){
 app.handlers.click({target:{closest(){return {getAttribute(k){return k==='data-action'?action:target;}};}}});
}
let nativeApp=runAndroid();
assert.match(nativeApp.root.innerHTML,/tes\.apk/);
clickAction(nativeApp,'route','analysis');
clickAction(nativeApp,'inspect');
assert(nativeDisk.calls.includes('inspect'));
assert.match(nativeApp.root.innerHTML,/BERJALAN/);
const sample={schemaVersion:4,bundledApks:[],languages:[{technology:"Java / Kotlin / bahasa JVM lainnya (DEX)",evidence:["classes.dex"],confidence:"bukti artefak"}],localInsights:[],deep:{manifest:{status:'ok',packageName:'id.example.demo',versionCode:'2',minSdk:'26',targetSdk:'35',permissions:['android.permission.CAMERA'],permissionCount:1,components:{activity:1},componentExamples:['activity: id.example.demo.Home']},resources:{status:'ok',declaredSize:1200,packageCount:1,scope:'Header only'},dexFiles:[{status:'ok',name:'classes.dex',version:'039',classDefs:7,methodIds:120,fieldIds:12,stringIds:200,inspectionDepth:'header + bounded class descriptors',classExamples:['Lid/example/demo/Home;']}],warnings:[]},sourceSelectedAt:99000,fileSize:1234,totalEntries:3,totalUncompressed:800,centralOffset:400,zip64:false,formatHint:'APK (indikasi struktur)',hasManifest:true,hasArsc:false,dexCount:1,signatureMetadataPresent:false,counts:{manifest:1,dex:1,assets:1},entries:[{name:'AndroidManifest.xml',group:'manifest',compressedSize:90,uncompressedSize:200,crc32:123,method:8,encrypted:false},{name:'classes.dex',group:'dex',compressedSize:100,uncompressedSize:300,crc32:1234,method:8,encrypted:false},{name:'assets/file.txt',group:'assets',compressedSize:50,uncompressedSize:300,crc32:345,method:8,encrypted:false}],warnings:[]};
nativeDisk.report=sample;
nativeApp.window.StudioUI.onInspectionUpdate({status:'done',report:sample});
assert.match(nativeApp.root.innerHTML,/TERINDEKS/);
assert.match(nativeApp.root.innerHTML,/APK \(indikasi struktur\)/);
assert.match(nativeApp.root.innerHTML,/id\.example\.demo/);
assert.match(nativeApp.root.innerHTML,/android\.permission\.CAMERA/);
assert.match(nativeApp.root.innerHTML,/Lid\/example\/demo\/Home/);
clickAction(nativeApp,'route','explorer');
assert.match(nativeApp.root.innerHTML,/AndroidManifest\.xml/);
assert.match(nativeApp.root.innerHTML,/200 B/);
clickAction(nativeApp,'route','assistant');
assert.match(nativeApp.root.innerHTML,/copy-ai/);
clickAction(nativeApp,'copy-ai');
assert(nativeDisk.calls.some(x=>typeof x==='string'&&x.includes('"dexCount": 1')));
assert(nativeDisk.calls.some(x=>typeof x==='string'&&x.includes('id.example.demo')));
assert.match(nativeApp.root.innerHTML,/Tinjau & Analisis/);
clickAction(nativeApp,'send');
assert.match(nativeApp.root.innerHTML,/Konfirmasi data AI/);
assert(!nativeDisk.calls.some(x=>typeof x==='string'&&x.startsWith('send:')));
clickAction(nativeApp,'confirm-ai');
assert(nativeDisk.calls.some(x=>typeof x==='string'&&x.startsWith('send:')));
let sent=JSON.parse(nativeDisk.calls.find(x=>typeof x==='string'&&x.startsWith('send:')).slice(5));
assert.equal(sent.consent,true);
assert.deepEqual(Array.from(sent.context.consentedSections),['Manifest','Permissions','DEX']);
assert.equal(sent.context.languages,undefined,'Technology evidence must not be shared unless selected');
nativeApp.window.StudioUI.onAiUpdate({status:'done',data:{projectId:'99000',analysis:{summary:'Analisis contoh',model:'gpt-test-model',findings:[]}}});
assert.match(nativeApp.root.innerHTML,/Analisis contoh/);
assert.match(nativeApp.root.innerHTML,/gpt-test-model/);
nativeApp=runAndroid();
clickAction(nativeApp,'route','explorer');
assert.match(nativeApp.root.innerHTML,/TERINDEKS/);
const stale={...sample,sourceSelectedAt:99001};
nativeApp.window.StudioUI.onInspectionUpdate({status:'done',report:stale});
assert.match(nativeApp.root.innerHTML,/TERINDEKS/);
console.log('Native bridge UI tests PASS: inspection, Explorer, consent-gated AI request, result presentation, persistence, stale report guard.');
// v0.5 must expose bounded findings and preserve metadata-only sharing.
const v05={...sample,schemaVersion:5,signingInspection:{signingBlock:'present',v2Present:true,v3Present:true,v31Present:false,jarSignatureFilesPresent:false,verification:'NOT_VERIFIED',verificationNote:'Belum diverifikasi kriptografis'},nativeLibraries:[{name:'lib/arm64-v8a/libsample.so',status:'ok',format:'ELF64',cpu:'AArch64 (ARM64)',endianness:'little',programHeaderCount:1}],integritySamples:{checkedCount:2,matches:2,failures:0,skipped:0,samples:[{path:'AndroidManifest.xml',status:'match',zipClaimedCrc32:'12345678',actualCrc32:'12345678'}],scope:'CRC32 is not cryptographic'},deep:{...sample.deep,resources:{status:'ok',declaredSize:1024,packageCount:1,scope:'Package preview',packagesPreview:[{id:127,name:'id.example.demo',types:{count:1,examples:['string']},keys:{count:1,examples:['app_name']}}]}}};
nativeDisk.report=v05;
nativeApp.window.StudioUI.onInspectionUpdate({status:'done',report:v05});
clickAction(nativeApp,'route','analysis');
assert.match(nativeApp.root.innerHTML,/Pemeriksaan tambahan v0\.5/);
assert.match(nativeApp.root.innerHTML,/BELUM DIVERIFIKASI/);
assert.match(nativeApp.root.innerHTML,/AArch64 \(ARM64\)/);
assert.match(nativeApp.root.innerHTML,/CRC COCOK/);
assert.match(nativeApp.root.innerHTML,/app_name/);
clickAction(nativeApp,'route','assistant');
nativeApp.handlers.change({target:{dataset:{section:'Signing'},checked:true}});
nativeApp.handlers.change({target:{dataset:{section:'Integritas CRC'},checked:true}});
clickAction(nativeApp,'copy-ai');
const v05Copied=nativeDisk.calls.at(-1);
assert.match(v05Copied,/"verification": "NOT_VERIFIED"/);
assert.match(v05Copied,/"zipClaimedCrc32": "12345678"/);
assert.doesNotMatch(v05Copied,/"nativeLibraries"/, 'Unselected native metadata must not be disclosed');
assert(!code.includes('payload.slice(0,10000)'), 'AI approval must preview all outgoing context');
assert(code.includes('JSON.parse(pendingAiPayload)'), 'AI send must use exact approved snapshot');
console.log('v0.5 UI tests PASS: signing/ELF/resource/CRC panel, opt-in selective sharing, complete AI preview snapshot.');
// v0.6: symbols are rendered read-only; per-class notes stay local; AI symbols require opt-in.
const v06={...v05,schemaVersion:6,dexSymbols:{status:'indexed',scope:'DEX definitions only, no decompiled source',truncated:false,files:[{name:'classes.dex',status:'indexed',classDefs:1,methodIds:1}],classes:[{name:'Ldemo/Preview;',dex:'classes.dex',methodCount:1}],methods:[{dex:'classes.dex',owner:'Ldemo/Preview;',signature:'Ldemo/Preview;->onCreate()V'},{dex:'classes.dex',owner:'Ldemo/Preview;',signature:'<img src=x onerror=alert(1)>'}]}};
nativeDisk.report=v06;
nativeApp.window.StudioUI.onInspectionUpdate({status:'done',report:v06});
clickAction(nativeApp,'route','analysis');
assert.match(nativeApp.root.innerHTML,/Penjelajah Simbol DEX v0\.6/);
assert.match(nativeApp.root.innerHTML,/Ldemo\/Preview;/);
assert.match(nativeApp.root.innerHTML,/onCreate\(\)V/);
nativeApp.handlers.input({target:{id:'symbolQuery',value:'onCreate',selectionStart:8}});
assert.match(nativeApp.root.innerHTML,/Metode terdefinisi \(1\)/);
assert.match(nativeApp.root.innerHTML,/Tidak ada kelas yang cocok/);
nativeApp.handlers.input({target:{id:'symbolQuery',value:'',selectionStart:0}});
assert.doesNotMatch(nativeApp.root.innerHTML,/<img src=x onerror=alert\(1\)>/);
assert.match(nativeApp.root.innerHTML,/&lt;img src=x/);
clickAction(nativeApp,'select-symbol','Ldemo/Preview;');
assert.match(nativeApp.root.innerHTML,/Catatan kelas/);
nativeApp.handlers.input({target:{id:'symbolNote',value:'Penanda kelas lokal: periksa onCreate'}});
assert.match(disk.get('apk_reverse_studio_ui_v1'),/Penanda kelas lokal/);
nativeApp=runAndroid();
clickAction(nativeApp,'route','analysis');
assert.match(nativeApp.root.innerHTML,/Catatan kelas/);
assert.match(nativeApp.root.innerHTML,/Penanda kelas lokal/);
clickAction(nativeApp,'route','assistant');
clickAction(nativeApp,'copy-ai');
assert.doesNotMatch(nativeDisk.calls.at(-1),/"dexSymbols"/,'No DEX symbols are shared until user opts in');
nativeApp.handlers.change({target:{dataset:{section:'Simbol DEX'},checked:true}});
clickAction(nativeApp,'copy-ai');
assert.match(nativeDisk.calls.at(-1),/"dexSymbols"/,'Opt-in DEX symbols can be copied');
assert.doesNotMatch(nativeDisk.calls.at(-1),/Penanda kelas lokal/,'Private class notes are not disclosed');
console.log('v0.6 UI tests PASS: read-only symbols, escaped source names, notes persisted, AI optional section.');

// v0.7 JADX review bundle: source rendering, private edits, restart recovery and explicit AI opt-in.
workspaceDisk.value={status:'ready',meta:{sourceFile:'tes.apk',sourceBytes:1234},sources:[{path:'sources/demo/Example.java',bytes:80}],changedPaths:[]};
nativeApp=runAndroid();
clickAction(nativeApp,'route','code');
assert.match(nativeApp.root.innerHTML,/JADX Source Workspace/);
assert.match(nativeApp.root.innerHTML,/Impor Paket JADX/);
clickAction(nativeApp,'import-jadx');
assert(nativeDisk.calls.includes('import-jadx'));
clickAction(nativeApp,'open-source','sources/demo/Example.java');
assert.match(nativeApp.root.innerHTML,/source-editor/);
assert.match(nativeApp.root.innerHTML,/&lt;img&gt;/);
assert.doesNotMatch(nativeApp.root.innerHTML,/<img>/);
nativeApp.handlers.input({target:{id:'workspaceCode',value:'package demo; class Example { int answer=17; }'}});
clickAction(nativeApp,'save-source');
assert.match(nativeApp.root.innerHTML,/PATCH TERSEDIA/);
assert.equal(workspaceDisk.patch,'package demo; class Example { int answer=17; }');
nativeApp=runAndroid();
clickAction(nativeApp,'route','code');
clickAction(nativeApp,'open-source','sources/demo/Example.java');
assert.match(nativeApp.root.innerHTML,/answer=17/,'Source patch should persist through native workspace bridge');
clickAction(nativeApp,'route','assistant');
clickAction(nativeApp,'copy-ai');
assert.doesNotMatch(nativeDisk.calls.at(-1),/answer=17/,'No selected source should be sent by default');
nativeApp.handlers.change({target:{dataset:{section:'Cuplikan JADX'},checked:true}});
clickAction(nativeApp,'copy-ai');
assert.match(nativeDisk.calls.at(-1),/answer=17/,'Source snippet only after explicit category selection');
clickAction(nativeApp,'route','code');
clickAction(nativeApp,'export-patches');
assert(nativeDisk.calls.includes('export-patches'));
clickAction(nativeApp,'reset-source');
assert.equal(workspaceDisk.patch,null);
console.log('v0.7 UI tests PASS: portable bundle route, escaped source view, save/restore patch, manual export, opt-in code sharing.');

// v0.8 Apktool offline review. This is a mock Android bridge; parser tests run separately.
apktoolDisk.value={status:'ready',meta:{sourceFile:'tes.apk',sourceBytes:1234,skippedFiles:0},files:[{path:'tree/smali/demo/App.smali',bytes:94},{path:'tree/res/values/strings.xml',bytes:65}],changedPaths:[]};
nativeApp=runAndroid();
clickAction(nativeApp,'route','apktool');
assert.match(nativeApp.root.innerHTML,/Apktool \/ Smali Workspace/);
assert.match(nativeApp.root.innerHTML,/Impor Bundle Apktool/);
clickAction(nativeApp,'import-apktool');
assert(nativeDisk.calls.includes('import-apktool'));
clickAction(nativeApp,'open-apktool','tree/smali/demo/App.smali');
assert.match(nativeApp.root.innerHTML,/\.class public Ldemo/);
let valid='.class public Ldemo/App;\n.super Ljava/lang/Object;\n.method public go()V\n.end method\n# authorized note';
nativeApp.handlers.input({target:{id:'apktoolCode',value:valid}});
clickAction(nativeApp,'save-apktool');
assert.equal(apktoolDisk.patch,valid);
assert.match(nativeApp.root.innerHTML,/PATCH/);
nativeApp=runAndroid();clickAction(nativeApp,'route','apktool');
clickAction(nativeApp,'open-apktool','tree/smali/demo/App.smali');
assert.match(nativeApp.root.innerHTML,/authorized note/);
clickAction(nativeApp,'route','assistant');clickAction(nativeApp,'copy-ai');
assert.doesNotMatch(nativeDisk.calls.at(-1),/authorized note/,'No Apktool source shared by default');
nativeApp.handlers.change({target:{dataset:{section:'Cuplikan Smali/XML'},checked:true}});
clickAction(nativeApp,'copy-ai');
assert.match(nativeDisk.calls.at(-1),/authorized note/,'Opt-in snippet present');
clickAction(nativeApp,'route','apktool');clickAction(nativeApp,'export-apktool');
assert(nativeDisk.calls.includes('export-apktool'));
clickAction(nativeApp,'reset-apktool');assert.equal(apktoolDisk.patch,null);
console.log('v0.8 UI PASS: mobile route, import, Smali edit, persist, reset, export, AI opt-in.');

// v0.9: offline build receipt viewer. Imported JSON is display-only evidence.
const verifiedMock = {format:'apk-reverse-build-receipt',schemaVersion:1,result:'VERIFIED',
  signedFile:'hasil-v09.apk',signedBytes:10240,signedApkSha256:'a'.repeat(64),
  signerCertificateSha256:'b'.repeat(64),zipalign16KiB:'PASS',apksignerVerify:'PASS'};
let buildApp=runAndroid(); clickAction(buildApp,'route','build');
assert.match(buildApp.root.innerHTML,/Belum ada laporan hasil build/);
clickAction(buildApp,'import-build-report');assert(nativeDisk.calls.includes('import-build-report'));
buildApp.window.StudioUI.onBuildReportUpdate({status:'ready',receipt:verifiedMock});
assert.match(buildApp.root.innerHTML,/hasil-v09.apk/);
assert.match(buildApp.root.innerHTML,/bukan memeriksa signature/);
buildDisk.value=verifiedMock;
buildApp=runAndroid();clickAction(buildApp,'route','build');
assert.match(buildApp.root.innerHTML,/hasil-v09.apk/);
const suspicious={...verifiedMock,signedFile:'<svg onload=alert(1)>.apk'};
buildApp.window.StudioUI.onBuildReportUpdate({status:'ready',receipt:suspicious});
assert.doesNotMatch(buildApp.root.innerHTML,/<svg onload=/);
assert.match(buildApp.root.innerHTML,/&lt;svg onload=/);
console.log('v0.9 UI PASS: native receipt import, restart persistence, unverified-label, escaping.');

// v1.0 Direct OAuth: local history, no gateway, permission checks and consent-gated delivery.
let jobsApp=runAndroid();
clickAction(jobsApp,'route','settings');
assert.match(jobsApp.root.innerHTML,/Otorisasi Ulang|Continue with ChatGPT/);
assert.doesNotMatch(jobsApp.root.innerHTML,/gatewayUrl|gatewayToken/);
clickAction(jobsApp,'chatgpt-login');
assert(nativeDisk.calls.includes('login'));
clickAction(jobsApp,'load-models');
assert(nativeDisk.calls.includes('models'));
clickAction(jobsApp,'route','jobs');
assert.match(jobsApp.root.innerHTML,/Riwayat Analisis Lokal/);
clickAction(jobsApp,'route','assistant');
jobsApp.handlers.input({target:{id:'aiDraft',value:'Periksa metadata yang saya setujui'}});
clickAction(jobsApp,'send');assert.match(jobsApp.root.innerHTML,/Konfirmasi data AI/);
const beforeSend=nativeDisk.calls.filter(x=>x.startsWith('send:')).length;
clickAction(jobsApp,'close-modal');assert.equal(nativeDisk.calls.filter(x=>x.startsWith('send:')).length,beforeSend);
clickAction(jobsApp,'send');clickAction(jobsApp,'confirm-ai');
const sentResults=nativeDisk.calls.filter(x=>x.startsWith('send:'));
assert.equal(sentResults.length,beforeSend+1,'No inference request without explicit review consent');
const request=JSON.parse(sentResults.at(-1).slice(5));
assert.equal(request.consent,true);assert.equal(request.model,'gpt-test-model');
assert.equal(request.context.file,'tes.apk');assert.equal(request.context.rawBinary,undefined);
jobsApp.window.StudioUI.onAiUpdate({status:'done',data:{projectId:'99000',analysis:{summary:'<script>evil()</script>\nAnalisis metadata',model:'gpt-test-model'}}});
clickAction(jobsApp,'route','jobs');
assert.match(jobsApp.root.innerHTML,/Riwayat Analisis Lokal/);
assert.match(jobsApp.root.innerHTML,/Periksa metadata yang saya setujui/);
assert.doesNotMatch(jobsApp.root.innerHTML,/<script>evil/);
assert.match(jobsApp.root.innerHTML,/&lt;script&gt;evil/);
jobsApp=runAndroid();clickAction(jobsApp,'route','jobs');
assert.match(jobsApp.root.innerHTML,/Periksa metadata yang saya setujui/);
clickAction(jobsApp,'clear-ai-history');
assert.doesNotMatch(jobsApp.root.innerHTML,/Periksa metadata yang saya setujui/);
console.log('v1.0 direct ChatGPT UI PASS: sign-in action, model selection, explicit consent, project-scoped local history, escaping.');

// Out-of-order inspection completion after selecting a different APK must not crash the UI.
nativeApp.window.StudioUI.onNativeFile({name:'different.apk',size:4000,selectedAt:99002});
assert.doesNotThrow(()=>nativeApp.window.StudioUI.onInspectionUpdate({status:'done',report:stale}));
assert.doesNotMatch(nativeApp.root.innerHTML,/TERINDEKS/);
console.log('v1.0 stabilisasi UI PASS: browser clear, stale report ignored.');

// Build 12: device-stored project is authoritative, and a build receipt must not leak across APK projects.
const stateKey='apk_reverse_studio_ui_v1';
const v10prior=JSON.parse(disk.get(stateKey));
const authoritative={name:'on-device.apk',size:777,selectedAt:100,uri:'content://device/on-device'};
nativeDisk.file=authoritative;nativeDisk.report=null;buildDisk.value=null;
disk.set(stateKey,JSON.stringify({...v10prior,project:{name:'cached-ghost.apk',size:222,selectedAt:999999,uri:'content://other/ghost'},notes:'Notes from old project',route:'dashboard'}));
let stableApp=runAndroid();
assert.match(stableApp.root.innerHTML,/on-device\.apk/);
assert.doesNotMatch(stableApp.root.innerHTML,/cached-ghost\.apk/);
assert.equal(JSON.parse(disk.get(stateKey)).notes,'','project-scoped notes must reset when source changes');
// The native file may have been cleared while WebView localStorage still contains old UI data.
nativeDisk.file=null;
const storageState=JSON.parse(disk.get(stateKey));
disk.set(stateKey,JSON.stringify({...storageState,project:authoritative,notes:'Confidential project notes'}));
stableApp=runAndroid();
assert.doesNotMatch(stableApp.root.innerHTML,/on-device\.apk/);
assert.equal(JSON.parse(disk.get(stateKey)).project,null);
assert.equal(JSON.parse(disk.get(stateKey)).notes,'');
// A receipt is for the APK that was active at import time, not the next chosen APK.
nativeDisk.file={name:'previous.apk',size:8000,selectedAt:101,uri:'content://device/previous'};
buildDisk.value={format:'apk-reverse-build-receipt',result:'VERIFIED',signedFile:'previous-signed.apk',signedBytes:1200,signedApkSha256:'a'.repeat(64),zipalign16KiB:'PASS',apksignerVerify:'PASS'};
stableApp=runAndroid();clickAction(stableApp,'route','build');
assert.match(stableApp.root.innerHTML,/previous-signed\.apk/);
stableApp.window.StudioUI.onNativeFile({name:'another.apk',size:9100,selectedAt:102,uri:'content://device/another'});
clickAction(stableApp,'route','build');
assert.doesNotMatch(stableApp.root.innerHTML,/previous-signed\.apk/);
assert.equal(JSON.parse(disk.get(stateKey)).notes,'');
console.log('v1.0 build 12 UI PASS: authoritative native project, ghost-state cleanup, project-isolated receipts and notes.');
