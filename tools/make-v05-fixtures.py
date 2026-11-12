#!/usr/bin/env python3
"""Synthetic only. APK v2 marker is structurally shaped but NOT a cryptographic signature."""
from pathlib import Path
import io, struct, zipfile
D=Path(__file__).parent/'fixtures';D.mkdir(exist_ok=True)
u16=lambda v:struct.pack('<H',v)
u32=lambda v:struct.pack('<I',v)
u64=lambda v:struct.pack('<Q',v)

def pool(strings):
    data=b'';offs=[]
    for s in strings:
        b=s.encode('utf8');offs.append(len(data));data+=bytes([len(s),len(b)])+b+b'\x00'
    size=28+4*len(strings)+len(data)
    return u16(1)+u16(28)+u32(size)+u32(len(strings))+u32(0)+u32(0x100)+u32(28+4*len(strings))+u32(0)+b''.join(u32(v) for v in offs)+data

def resources():
    types=pool(['drawable','string']);keys=pool(['app_name','logo'])
    pkg=bytearray(288)
    struct.pack_into('<HHI',pkg,0,0x0200,288,288+len(types)+len(keys))
    struct.pack_into('<I',pkg,8,0x7f)
    name='org.synthetic.res'.encode('utf-16le');pkg[12:12+len(name)]=name
    struct.pack_into('<I',pkg,268,288);struct.pack_into('<I',pkg,276,288+len(types))
    chunk=bytes(pkg)+types+keys
    return u16(2)+u16(12)+u32(12+len(chunk))+u32(1)+chunk

def elf():
    b=bytearray(64);b[:4]=b'\x7fELF';b[4:9]=bytes([2,1,1,0,0]);struct.pack_into('<HHI',b,16,3,183,1)
    struct.pack_into('<H',b,52,64);struct.pack_into('<H',b,54,56);struct.pack_into('<H',b,56,1)
    return bytes(b)

def zipbytes():
    f=io.BytesIO()
    with zipfile.ZipFile(f,'w') as z:
        z.writestr('AndroidManifest.xml',b'<fake/>',compress_type=zipfile.ZIP_STORED)
        z.writestr('resources.arsc',resources(),compress_type=zipfile.ZIP_DEFLATED)
        z.writestr('lib/arm64-v8a/libsample.so',elf(),compress_type=zipfile.ZIP_STORED)
    return f.getvalue()

def signing_block(ids):
    pairs=b''.join(u64(4+6)+u32(x)+b'EXAMPLE'[:6] for x in ids)
    size=len(pairs)+24
    return u64(size)+pairs+u64(size)+b'APK Sig Block 42'

def insert_block(z,ids):
    e=z.rfind(b'PK\x05\x06');assert e>=0
    central=struct.unpack_from('<I',z,e+16)[0]
    b=signing_block(ids)
    out=bytearray(z[:central]+b+z[central:]);struct.pack_into('<I',out,e+len(b)+16,central+len(b))
    return bytes(out)

base=zipbytes();(D/'v05-unsigned.apk').write_bytes(base)
(D/'v05-block.apk').write_bytes(insert_block(base,[0x7109871a,0xf05368c0,0x1b93ad61]))
(D/'v05-unknown.apk').write_bytes(insert_block(base,[0x0badf00d]))
# tamper an uncompressed small payload but keep ZIP central directory intact
bad=bytearray(base);i=bad.find(b'<fake/>');assert i>0;bad[i+2]^=1
(D/'v05-corrupt-crc.apk').write_bytes(bytes(bad))
print('Created synthetic v0.5 fixtures (including non-cryptographic signing marker)')
