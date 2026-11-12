import zipfile, struct, warnings
from pathlib import Path
p=Path(__file__).resolve().parent/'fixtures'
p.mkdir(exist_ok=True)
with zipfile.ZipFile(p/'minimal.apk','w',zipfile.ZIP_DEFLATED) as z:
    z.writestr('AndroidManifest.xml',b'\x03\x00\x08\x00small-binary-xml-sample')
    z.writestr('resources.arsc',b'\x02\x00\x0c\x00')
    z.writestr('classes.dex',b'dex\n035\x00not-a-real-dex')
    z.writestr('lib/arm64-v8a/libdemo.so',b'\x7fELF' + b'\x00'*128)
    z.writestr('assets/readme.txt',b'SAFE TEST')
    z.writestr('META-INF/CERT.RSA',b'not-a-real-certificate')
base=(p/'minimal.apk').read_bytes()
# Synthetic ZIP64 EOCD with the same central directory. No ZIP body contents changed.
e=base.rfind(b'PK\x05\x06')
assert e>0
signature,disk,cddisk,diskCount,totalCount,centralSize,centralOffset,comment=struct.unpack_from('<IHHHHIIH',base,e)
zip64eocd=struct.pack('<IQHHIIQQQQ',0x06064b50,44,45,45,0,0,totalCount,totalCount,centralSize,centralOffset)
locator=struct.pack('<IIQI',0x07064b50,0,e,1)
eocd=struct.pack('<IHHHHIIH',0x06054b50,0,0,0xffff,0xffff,0xffffffff,0xffffffff,0)
(p/'zip64.zip').write_bytes(base[:e]+zip64eocd+locator+eocd)
with warnings.catch_warnings():
    warnings.simplefilter('ignore',UserWarning)
    with zipfile.ZipFile(p/'suspicious.zip','w',zipfile.ZIP_DEFLATED) as z:
        z.writestr('../escape.txt','BAD')
        z.writestr('same.txt','a')
        z.writestr('same.txt','b')
(p/'corrupt.zip').write_bytes(base[:34])
