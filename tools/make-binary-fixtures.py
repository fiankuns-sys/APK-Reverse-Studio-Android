#!/usr/bin/env python3
"""Create entirely synthetic APK binary metadata samples (not copied from third-party apps)."""
from pathlib import Path
import struct
import zipfile

OUT=Path(__file__).parent/'fixtures'
OUT.mkdir(parents=True,exist_ok=True)

def u16(*v): return struct.pack('<'+'H'*len(v),*v)
def u32(*v): return struct.pack('<'+'I'*len(v),*v)

strings=['manifest','package','org.example.synthetic','versionCode','versionName','1.0.2',
         'uses-sdk','minSdkVersion','targetSdkVersion','uses-permission','name',
         'android.permission.INTERNET','application','label','Synthetic App',
         'activity','org.example.synthetic.HomeActivity','service','org.example.synthetic.SyncService']
si={s:i for i,s in enumerate(strings)}
def u8len(n): return bytes([n]) if n < 128 else bytes([(n>>8)|0x80,n&255])

def string_pool():
    chunks=[];offsets=[]
    for value in strings:
        offsets.append(sum(map(len,chunks)))
        b=value.encode('utf-8');chunks.append(u8len(len(value))+u8len(len(b))+b+b'\0')
    data=b''.join(chunks);pad=b'\0'*((-len(data))%4)
    hdr=u16(1,28)+u32(28+len(strings)*4+len(data)+len(pad),len(strings),0,0x100,28+len(strings)*4,0)
    return hdr+b''.join(u32(o) for o in offsets)+data+pad

def attrib(name,value):
    if isinstance(value,int): return u32(0xffffffff,si[name],0xffffffff)+u16(8)+bytes([0,0x10])+u32(value)
    return u32(0xffffffff,si[name],si[value])+u16(8)+bytes([0,3])+u32(si[value])

def start(tag, pairs):
    n=len(pairs)
    chunk=u16(0x0102,16)+u32(16+20+20*n)+u32(1,0xffffffff)
    chunk+=u32(0xffffffff,si[tag])+u16(20,20,n,0,0,0)
    chunk+=b''.join(attrib(k,v) for k,v in pairs)
    return chunk

def manifest():
    content=string_pool()+start('manifest',[('package','org.example.synthetic'),('versionCode',12),('versionName','1.0.2')])
    content+=start('uses-sdk',[('minSdkVersion',26),('targetSdkVersion',35)])
    content+=start('uses-permission',[('name','android.permission.INTERNET')])
    content+=start('application',[('label','Synthetic App')])
    content+=start('activity',[('name','org.example.synthetic.HomeActivity')])
    content+=start('service',[('name','org.example.synthetic.SyncService')])
    return u16(3,8)+u32(len(content)+8)+content

def uleb(n):
    parts=[]
    while True:
        x=n&127;n >>= 7
        parts.append(x|(0x80 if n else 0))
        if not n: return bytes(parts)

def dex():
    descriptor=b'Lorg/example/synthetic/HomeActivity;'
    string_off=112
    type_off=116
    class_off=120
    data_off=152
    string_data=uleb(len(descriptor))+descriptor+b'\0'
    fsize=data_off+len(string_data)
    head=bytearray(112)
    head[0:8]=b'dex\n035\x00'
    struct.pack_into('<I',head,32,fsize)
    struct.pack_into('<I',head,36,112)
    struct.pack_into('<I',head,40,0x12345678)
    struct.pack_into('<II',head,56,1,string_off)
    struct.pack_into('<II',head,64,1,type_off)
    struct.pack_into('<II',head,80,0,0)
    struct.pack_into('<II',head,88,1,0) # 1 method ID but offset zero: enough for metadata test only
    struct.pack_into('<II',head,96,1,class_off)
    struct.pack_into('<II',head,104,fsize-data_off,data_off)
    class_def=u32(0,1,0xffffffff,0,0xffffffff,0,0,0)
    return bytes(head)+u32(data_off)+u32(0)+class_def+string_data

def resources(): return u16(2,12)+u32(12,1)

with zipfile.ZipFile(OUT/'binary-synthetic.apk','w',compression=zipfile.ZIP_DEFLATED) as z:
    z.writestr('AndroidManifest.xml',manifest())
    z.writestr('classes.dex',dex())
    z.writestr('resources.arsc',resources())
    z.writestr('res/drawable/placeholder.png',b'not-an-image',compress_type=zipfile.ZIP_STORED)
with zipfile.ZipFile(OUT/'binary-bad-manifest.apk','w',compression=zipfile.ZIP_DEFLATED) as z:
    z.writestr('AndroidManifest.xml',b'\x03\x00\x08\x00'+u32(1_000_000)+b'invalid')
    z.writestr('classes.dex',dex())
with zipfile.ZipFile(OUT/'binary-missing.apk','w',compression=zipfile.ZIP_STORED) as z:
    z.writestr('assets/text.txt',b'hello')
print('Created synthetic fixtures:', *(f.name for f in sorted(OUT.glob('binary-*.apk'))))
