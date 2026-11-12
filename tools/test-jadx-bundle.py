#!/usr/bin/env python3
import importlib.util
from pathlib import Path
import json
from tempfile import TemporaryDirectory
from zipfile import ZipFile

spec=importlib.util.spec_from_file_location('bundle_script',Path(__file__).parent/'make-jadx-bundle.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

with TemporaryDirectory() as t:
    root=Path(t)
    output=root/'jadx-source'
    folder=output/'sources'/'demo'
    folder.mkdir(parents=True)
    original=root/'my-demo.apk';original.write_bytes(b'A'*100)
    (folder/'Example.java').write_text('package demo; public class Example {}\n','utf-8')
    (folder/'Skip.java').write_bytes(b'A'*(192*1024+1))
    (output/'apk-reverse-jadx-report.json').write_text(json.dumps({
        'engine':'jadx-cli','source':str(original),'inputBytes':100,'sourceSha256':'5'*64
    }), 'utf-8')
    archive=root/'bundle.zip'
    report=module.make_bundle(output,archive)
    assert report['selectedSources']==1
    assert report['skippedSources']==1
    assert report['sourceFile']=='my-demo.apk'
    with ZipFile(archive) as z:
        assert 'sources/demo/Example.java' in z.namelist()
        manifest=json.loads(z.read('bundle.json'))
        assert manifest['files'][0]['path']=='sources/demo/Example.java'
        assert manifest['files'][0]['sha256']
    try:
        module.make_bundle(output, output/'bundle.zip')
        raise AssertionError('Should reject output inside source folder')
    except ValueError:
        pass
print('Bundle creator PASS: single valid source, oversize skipped, manifest hash, no self-inclusion')
