const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/src/main/assets/skill-intelligence.js'),'utf8');
const window={};
vm.runInNewContext(source,{window},{timeout:1200});
const skills=window.SkillIntelligence;
assert.ok(skills,'Global skill engine must load before UI');
assert.equal(skills.catalog.length,14,'All approved specialist domains including Lua must be present');
const ids=skills.catalog.map(x=>x.id);
assert.equal(new Set(ids).size,ids.length,'Skill ids must be unique');
for(const id of ids){
 assert.ok(skills.questionFor(id).length>60,'Each skill needs a scoped expert question: '+id);
 assert.ok(skills.contextFor(id).limits,'Skill must disclose limitations: '+id);
}
assert.equal(skills.getSkill('does-not-exist'),null);
assert.equal(skills.contextFor('does-not-exist'),null);
const report={
 entries:[{name:'AndroidManifest.xml'},{name:'classes.dex'},{name:'resources.arsc'},
 {name:'lib/arm64-v8a/libunity.so'},{name:'assets/scripts/main.js'},{name:'assets/config/data.json'}],
 deep:{manifest:{status:'ok',packageName:'com.example.safe'}},
 dexSymbols:{classes:[{name:'Lcom/example/safe/Main;'}]},
 signingInspection:{status:'present'},
 nativeLibraries:[{name:'libunity.so',status:'ok'}],
 languages:[{technology:'Unity game engine'}]
};
const result=skills.evaluate(report);
function resultFor(id){return result.find(x=>x.id===id);}
assert.equal(resultFor('android').status,'ada-bukti');
assert.ok(resultFor('jvm').evidence.some(x=>x.kind==='parser'));
assert.ok(resultFor('game').evidence.some(x=>/unity/i.test(x.label)),'Game engine evidence');
assert.ok(resultFor('web').evidence.some(x=>/javascript/i.test(x.label)),'JavaScript asset');
assert.ok(resultFor('integrity').evidence.some(x=>/signing/i.test(x.label)),'Signing metadata');
assert.equal(resultFor('lua').status,'bukti-terbatas');
assert.ok(skills.questionFor('lua').includes('read-only'));
assert.equal(resultFor('python').status,'bukti-terbatas','APK without Python evidence must not claim Python');
assert.ok(skills.questionFor('modding').includes('offline'),'Game mods restricted to offline authorized use');
assert.ok(skills.questionFor('game-integrity').includes('anti-cheat'),'Integrity review should avoid bypass instructions');
const noReport=skills.evaluate(null);
assert.ok(noReport.every(x=>x.status==='belum-dianalisis'),'Empty report must not yield fake findings');
const bad={entries:[{name:'assets/<img src=x onerror=alert(1)>.js'}]};
const attack=skills.evaluate(bad).find(x=>x.id==='web');
assert.ok(attack.evidence.length>0,'Untrusted path retained for escaping at UI boundary');
assert.ok(attack.evidence.every(x=>typeof x.path==='string'));
const big={entries:Array.from({length:7000},(_,i)=>({name:'assets/'+i+'.js'}))};
assert.ok(skills.evaluate(big).find(x=>x.id==='web').evidence.length<=6,'UI evidence capped');
console.log('Skill Intelligence PASS: 14 skill schemas, classification, provenance, uncertainty, privacy, safe game scope, limits');
