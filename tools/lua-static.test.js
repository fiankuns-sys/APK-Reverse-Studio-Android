const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../app/src/main/assets/lua-static-inspector.js'),'utf8');
const window={};
vm.runInNewContext(source,{window},{timeout:2000});
const parser=window.LuaStaticInspector;
assert.ok(parser,'Lua analyzer exposed');
assert.equal(parser.scan('').status,'empty');
assert.equal(parser.scan(null).status,'error');
assert.equal(parser.scan('x'.repeat(150001)).status,'error');
const demo=[
'-- require("fake")',
'-- os.execute("untrusted")',
'local helper = require("demo.utility")',
'function greet(name)',
'  local message = "Hello, " .. name',
'  print(message)',
'end',
'local fn = load("return 2 + 2")',
'local path = "C:\\\\project\\\\script.lua"'
].join('\n');
const result=parser.scan(demo);
assert.equal(result.status,'ok');
assert.equal(result.dependencies.length,1);
assert.equal(result.dependencies[0].module,'demo.utility');
assert.ok(result.functions.some(f=>f.name==='greet'));
assert.ok(result.findings.some(x=>x.symbol==='load'));
assert.ok(!result.findings.some(x=>x.symbol==='os.execute'),'Comment contents should not be treated as code');
assert.ok(result.platformHints.some(x=>x.platform==='Windows PC'));
assert.ok(result.limits.some(x=>x.includes('tidak dijalankan')));
const android=parser.scan('local p="/data/user/0/com.example.test/"\nlocal n = "lib/arm64-v8a/libexample.so"');
assert.ok(android.platformHints.some(x=>x.platform==='Android / Unix'));
const injected=parser.scan('-- [=[ os.execute("fake") ]=]\nlocal x = "loadfile(\'no\')"');
assert.equal(injected.findings.length,0,'Comments and strings should not be executable tokens');
console.log('Lua static analyzer PASS: bounded parsing, require, functions, platform hints, no code execution, ignore comments.');
