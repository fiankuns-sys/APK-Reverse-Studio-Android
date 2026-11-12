#!/usr/bin/env python3
"""DEX with genuine class_data encoded method definitions, synthetic only."""
import struct,zipfile
from pathlib import Path
OUT=Path(__file__).resolve().parent/'fixtures';OUT.mkdir(exist_ok=True)
U=lambda x:struct.pack('<I',x)
H=lambda x:struct.pack('<H',x)
def string_data(s):
    raw=s.encode('utf-8');return bytes([len(s)])+raw+b'\0'
strings=['Lorg/example/synthetic/SymbolActivity;','V','onCreate']
data=[string_data(x) for x in strings]
head=bytearray(112)
head[0:8]=b'dex\n035\0'
layout={"string":112,"type":124,"proto":132,"method":144,"class":152,"data":184}
class_data=b'\x00\x00\x01\x00\x00\x01\x00'  # static, instance, direct, virtual; method_idx_delta, access_flags, code_off
string_at=layout['data']+len(class_data)
string_offsets=[];running=string_at
for x in data: string_offsets.append(running);running+=len(x)
struct.pack_into('<I',head,32,running)
struct.pack_into('<I',head,36,112)
struct.pack_into('<I',head,40,0x12345678)
for offset,count,at in [(56,3,layout['string']),(64,2,layout['type']),(72,1,layout['proto']),(88,1,layout['method']),(96,1,layout['class'])]:
    struct.pack_into('<II',head,offset,count,at)
struct.pack_into('<II',head,104,running-layout['data'],layout['data'])
blob=bytes(head)+b''.join(U(x) for x in string_offsets)+U(0)+U(1) + U(1)+U(1)+U(0)+ H(0)+H(0)+U(2)+U(0)+U(1)+U(0xffffffff)+U(0)+U(0xffffffff)+U(0)+U(layout['data'])+U(0)+class_data+b''.join(data)
assert len(blob)==running,(len(blob),running)
with zipfile.ZipFile(OUT/'v06-symbols.apk','w',compression=zipfile.ZIP_DEFLATED) as z:
    z.writestr('classes.dex',blob)
corrupt=bytearray(blob)
struct.pack_into('<I',corrupt,layout['class']+24,len(blob)+100)
with zipfile.ZipFile(OUT/'v06-corrupt-method.apk','w',compression=zipfile.ZIP_DEFLATED) as z:
    z.writestr('classes.dex',corrupt)
print('v06 DEX symbol fixtures prepared')
