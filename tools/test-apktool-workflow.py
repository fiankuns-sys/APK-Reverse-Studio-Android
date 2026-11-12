from pathlib import Path
from tempfile import TemporaryDirectory
from importlib.util import spec_from_file_location,module_from_spec
import json, hashlib
from zipfile import ZipFile
spec=spec_from_file_location('a',Path(__file__).with_name('apktool-workflow.py'))
m=module_from_spec(spec);spec.loader.exec_module(m)
with TemporaryDirectory() as d:
 root=Path(d);decoded=root/'decoded';(decoded/'smali/demo').mkdir(parents=True)
 origin=root/'my-app.apk';origin.write_bytes(b'APK synthetic fixture')
 smali='.class public Ldemo/A;\n.super Ljava/lang/Object;\n.method public x()V\n.end method\n'
 (decoded/'smali/demo/A.smali').write_text(smali,'utf-8')
 (decoded/'AndroidManifest.xml').write_text('<manifest package="demo"/>','utf-8')
 archive=root/'review.zip';meta=m.create_bundle(decoded,origin,archive)
 assert meta['selectedFiles']==2
 with ZipFile(archive) as z: assert z.read('tree/smali/demo/A.smali').decode()==smali
 updated=smali+'# local approved comment\n'
 patch={'schemaVersion':1,'format':'apk-reverse-apktool-patch','originalApk':origin.name,'originalSize':origin.stat().st_size,
  'sourceSha256':m.source_sha(origin),'patches':{'tree/smali/demo/A.smali':{'baselineSha256':m.sha(smali.encode()),'changedSha256':m.sha(updated.encode()),'content':updated}}}
 patch_file=root/'patch.json';patch_file.write_text(json.dumps(patch),'utf-8')
 result=m.prepare(decoded,patch_file,root/'working',origin)
 assert result['patchedFiles']==1 and (root/'working/smali/demo/A.smali').read_text()==updated
 assert (decoded/'smali/demo/A.smali').read_text()==smali
 try: m.prepare(decoded,patch_file,root/'another-working',root/'missing.apk');assert False
 except FileNotFoundError:pass
 try:m.preflight('tree/AndroidManifest.xml','<!DOCTYPE x><manifest/>');assert False
 except ValueError:pass
 patch['patches']['tree/smali/demo/A.smali']['baselineSha256']='0'*64
 patch_file.write_text(json.dumps(patch),'utf-8')
 try:m.prepare(decoded,patch_file,root/'badcopy',origin);assert False
 except ValueError:pass
 print('Apktool offline workflow PASS: bundle, identity SHA, baseline, copy isolation, XML DTD')
