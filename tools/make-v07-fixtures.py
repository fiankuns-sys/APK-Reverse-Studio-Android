#!/usr/bin/env python3
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json, hashlib
root = Path(__file__).parent / 'fixtures'
root.mkdir(parents=True, exist_ok=True)
source = b'package demo; public class Example { int answer = 42; }\n'
manifest = {'schemaVersion':1,'engine':'jadx-cli-review','sourceFile':'sample.apk','sourceBytes':1024,'files':[{'path':'sources/demo/Example.java','sha256':hashlib.sha256(source).hexdigest(),'bytes':len(source)}]}
with ZipFile(root/'v07-valid.zip','w',ZIP_DEFLATED) as z:
    z.writestr('bundle.json',json.dumps(manifest))
    z.writestr('sources/demo/Example.java',source)
with ZipFile(root/'v07-traversal.zip','w',ZIP_DEFLATED) as z:
    z.writestr('bundle.json',json.dumps(manifest))
    z.writestr('sources/../../outside.java',source)
with ZipFile(root/'v07-duplicate.zip','w',ZIP_DEFLATED) as z:
    z.writestr('bundle.json',json.dumps(manifest))
    z.writestr('sources/demo/Example.java',source)
    z.writestr('sources/demo/Example.java',source)
with ZipFile(root/'v07-too-large-source.zip','w',ZIP_DEFLATED) as z:
    z.writestr('bundle.json',json.dumps(manifest))
    z.writestr('sources/demo/Example.java',b'X'*(192*1024+1))
print('v0.7 ZIP fixtures generated')
