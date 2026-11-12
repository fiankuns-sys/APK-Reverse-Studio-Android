from pathlib import Path
import zipfile
fixture=Path(__file__).resolve().parent/'fixtures'
fixture.mkdir(exist_ok=True)
nested=(fixture/'binary-synthetic.apk').read_bytes()
with zipfile.ZipFile(fixture/'package-set.xapk','w',compression=zipfile.ZIP_DEFLATED,compresslevel=4) as z:
    z.writestr('base.apk',nested)
    z.writestr('config.id.apk',nested)
    z.writestr('assets/example.js','console.log("sample");')
with zipfile.ZipFile(fixture/'package-set-oversize.xapk','w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    z.writestr('huge.apk',b'\x00'*(32*1024*1024+1))
print('Created v0.4 nested APK fixtures')
