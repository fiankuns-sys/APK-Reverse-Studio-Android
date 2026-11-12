import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runJadx } from './jadx-offline.mjs';
test('JADX tool guards invalid formats and oversized input',async()=>{
 const root=await mkdtemp(join(tmpdir(),'jadx-test-'));
 const bad=join(root,'payload.sh');await writeFile(bad,'hello this is not apk');
 await assert.rejects(runJadx({input:bad,output:join(root,'out')}),/Format/);
});
test('JADX CLI invoked with fixed args, no shell, and emits manifest',async()=>{
 const root=await mkdtemp(join(tmpdir(),'jadx-test-'));
 const apk=join(root,'example.apk');await writeFile(apk,'abcde12345678not_real_apk');
 const cli=join(root,'jadx-stub');
 await writeFile(cli,'#!/bin/sh\nOUT="$5"\nmkdir -p "$OUT/sources/com/example"\nprintf "class Example {}\\n" > "$OUT/sources/com/example/Example.java"\n');
 await chmod(cli,0o755);
 // no real decompilation here; verifies safe process boundary and manifest handling
 const report=await runJadx({input:apk,output:join(root,'out'),jadx:cli,timeout:2000});
 assert.equal(report.status,'process_exit_zero');
 assert(report.sourceSample.some(x=>x.endsWith('Example.java')));
 assert.match(await readFile(join(root,'out','apk-reverse-jadx-report.json'),'utf8'),/jadx-cli/);
});
