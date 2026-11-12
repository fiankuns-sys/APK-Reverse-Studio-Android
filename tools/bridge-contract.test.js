// Static interface verification, not a substitute for Android runtime instrumentation.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const base=path.join(__dirname,'../app/src/main');
const java=fs.readFileSync(path.join(base,'java/id/reverselab/studio/MainActivity.java'),'utf8');
const js=fs.readFileSync(path.join(base,'assets/studio.js'),'utf8');
const html=fs.readFileSync(path.join(base,'assets/index.html'),'utf8');
const published=new Set([...java.matchAll(/@JavascriptInterface\s+public\s+(?:String|void)\s+([A-Za-z_]\w*)\s*\(/g)].map(x=>x[1]));
const used=new Set([...js.matchAll(/(?:window\.)?StudioNative\.([A-Za-z_]\w*)/g)].map(x=>x[1]));
const missing=[...used].filter(x=>!published.has(x));
assert.deepEqual(missing,[],`JavaScript references missing Android bridge methods: ${missing.join(', ')}`);
const emitted=new Set([...java.matchAll(/emit\("([A-Za-z_]\w*)"\s*,/g)].map(x=>x[1]));
for(const method of emitted) assert.match(js,new RegExp(`(?:\\b${method}\\s*[:=]|\\b${method}\\b)`),`Missing StudioUI callback ${method}`);
for(const asset of ['styles.css','studio.js']) assert.match(html,new RegExp(`(?:href|src)="${asset.replace('.','\\.')}"`));
assert.match(java,/TRUSTED_PAGE\.equals\(request\.getUrl\(\)\.toString\(\)\)/,'Unexpected navigations should be blocked');
assert.doesNotMatch(js, /<script\s+src\s*=\s*['"]https?:\/\//i, 'Remote scripts are forbidden');
console.log(`Bridge contract PASS: ${used.size} JavaScript-called native methods, ${emitted.size} native callbacks, local HTML assets.`);
