#!/usr/bin/env python3
"""Bounded offline Apktool workflow for APKs you own or are authorized to modify.

No APKs or source are uploaded. Original input stays untouched. This is NOT a
signing workflow. Requires official Apktool CLI installed separately.
"""
import argparse, hashlib, json, os, re, shutil, subprocess, sys, tempfile
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.etree import ElementTree as ET

MAX_ARCHIVE = 48 * 1024 * 1024
MAX_FILES = 320
MAX_FILE = 384 * 1024
MAX_SOURCE = 18 * 1024 * 1024
MAX_PROJECT = 512 * 1024 * 1024


def sha(b): return hashlib.sha256(b).hexdigest()


def allowed(path):
    if not isinstance(path, str) or not path or len(path) > 384 or '\\' in path or ':' in path or path.startswith('/'):
        return False
    if any(x in ('', '.', '..') for x in path.split('/')): return False
    if path == 'tree/AndroidManifest.xml': return True
    if re.fullmatch(r'tree/smali(?:_classes[0-9]+)?/[A-Za-z0-9_/$-]+\.smali', path): return True
    return re.fullmatch(r'tree/res/(?:values(?:-[A-Za-z0-9_]+)?|xml(?:-[A-Za-z0-9_]+)?)/[A-Za-z0-9_.-]+\.xml', path) is not None


def under(base, relative):
    root = base.resolve(strict=True)
    dest = root / relative
    if not dest.resolve().is_relative_to(root):
        raise ValueError('Path escaped decoded directory')
    if dest.is_symlink(): raise ValueError('Symlink in project is not accepted')
    return dest


def source_sha(path):
    with path.open('rb') as f:
        h=hashlib.sha256()
        while True:
            chunk=f.read(1024*1024)
            if not chunk: break
            h.update(chunk)
    return h.hexdigest()


def create_bundle(decoded, apk_path, output):
    decoded, apk_path, output = decoded.resolve(strict=True), apk_path.resolve(strict=True), output.resolve()
    if output.is_relative_to(decoded) or output == apk_path:
        raise ValueError('Output must be outside decoded directory and original APK')
    if not decoded.is_dir() or not apk_path.is_file(): raise ValueError('Input missing')
    files=[]; total=0;skipped=0
    for p in sorted(decoded.rglob('*')):
        if not p.is_file() or p.is_symlink(): continue
        rel='tree/'+p.relative_to(decoded).as_posix()
        if not allowed(rel): continue
        size=p.stat().st_size
        if size>MAX_FILE or total+size>MAX_SOURCE or len(files)>=MAX_FILES:
            skipped+=1; continue
        b=p.read_bytes()
        try:
            text=b.decode('utf-8', 'strict')
            if '\0' in text: raise ValueError('NUL')
        except (UnicodeError,ValueError): skipped+=1;continue
        files.append((rel,b));total+=len(b)
    if not files: raise ValueError('No eligible Smali or resource XML in decoded project')
    metadata={'schemaVersion':1,'engine':'apktool-review','sourceFile':apk_path.name,'sourceBytes':apk_path.stat().st_size,
      'sourceSha256':source_sha(apk_path),'files':[{'path':n,'bytes':len(b),'sha256':sha(b)} for n,b in files],
      'selectedFiles':len(files),'skippedFiles':skipped,'warning':'Only selected files. No executable or signature included.'}
    output.parent.mkdir(parents=True,exist_ok=True)
    with ZipFile(output,'w',ZIP_DEFLATED,compresslevel=6) as zip:
        zip.writestr('bundle.json',json.dumps(metadata,ensure_ascii=False,separators=(',',':')))
        for n,b in files:zip.writestr(n,b)
    if output.stat().st_size>MAX_ARCHIVE:
        output.unlink();raise ValueError('Bundle exceeds 48 MiB')
    return metadata


def preflight(path,text):
    if not allowed(path):raise ValueError('Path not allowlisted')
    if not text or len(text.encode('utf-8'))>MAX_FILE or '\0' in text:raise ValueError('Invalid content or size')
    if path.endswith('.smali'):
        if not re.search(r'^\.class\s+',text,re.M) or not re.search(r'^\.super\s+',text,re.M):raise ValueError('Missing .class or .super')
        if len(re.findall(r'^\.method\s+',text,re.M)) != len(re.findall(r'^\.end method\s*$',text,re.M)):
            raise ValueError('Unbalanced Smali method directives')
    if path.endswith('.xml'):
        if '<!DOCTYPE' in text.upper() or '<!ENTITY' in text.upper(): raise ValueError('DTD/ENTITY not allowed')
        ET.fromstring(text)


def prepare(decoded, patch_json, target, expected_apk):
    decoded,patch_json,target,expected_apk = decoded.resolve(strict=True), patch_json.resolve(strict=True), target.resolve(), expected_apk.resolve(strict=True)
    if not decoded.is_dir() or not expected_apk.is_file():raise ValueError('Invalid source')
    if target.exists() or target.is_relative_to(decoded) or decoded.is_relative_to(target):raise ValueError('Target must be new separate directory')
    if target==expected_apk:raise ValueError('Never overwrite original APK')
    content=json.loads(patch_json.read_text('utf-8'))
    if content.get('format')!='apk-reverse-apktool-patch' or content.get('schemaVersion')!=1:
        raise ValueError('Not an Apktool patch export')
    if content.get('originalApk')!=expected_apk.name or content.get('originalSize')!=expected_apk.stat().st_size:
        raise ValueError('APK identity mismatch')
    if content.get('sourceSha256')!=source_sha(expected_apk):raise ValueError('Source APK SHA-256 mismatch')
    patches=content.get('patches')
    if not isinstance(patches,dict) or len(patches)>40:raise ValueError('Invalid patch list')
    if not patches:raise ValueError('No changed files')
    writes=[]
    for name,obj in patches.items():
        if not allowed(name) or not isinstance(obj,dict):raise ValueError('Invalid path or record')
        p=under(decoded,name[5:]);original=p.read_bytes()
        if not p.is_file() or len(original)>MAX_FILE:raise ValueError('Source missing or too large')
        if sha(original)!=obj.get('baselineSha256'):raise ValueError('Baseline hash mismatch: '+name)
        changed=obj.get('content');
        if not isinstance(changed,str):raise ValueError('Missing content')
        preflight(name,changed)
        if sha(changed.encode('utf-8'))!=obj.get('changedSha256'):raise ValueError('Patch content hash mismatch')
        writes.append((name[5:],changed.encode('utf-8')))
    # Strict input review: no symlinks and cap copy to 512 MiB.
    size=0
    for base,dirs,files in os.walk(decoded,followlinks=False):
        for dirname in dirs:
            if (Path(base)/dirname).is_symlink():raise ValueError('Symlinks not supported')
        for fn in files:
            p=Path(base)/fn
            if p.is_symlink():raise ValueError('Symlinks not supported')
            size+=p.stat().st_size
            if size>MAX_PROJECT:raise ValueError('Decoded project exceeds 512 MiB cap')
    target.parent.mkdir(parents=True,exist_ok=True)
    try:
        shutil.copytree(decoded,target,symlinks=False)
        for name,b in writes:
            dest=under(target,name)
            dest.write_bytes(b)
        return {'patchedFiles':len(writes),'workingDirectory':str(target),'verifiedOriginalSha256':source_sha(expected_apk)}
    except Exception:
        shutil.rmtree(target,ignore_errors=True)
        raise


def run_apktool(arguments,timeout=600):
    executable=shutil.which('apktool')
    if not executable: raise RuntimeError('Apktool CLI not found; install it separately')
    subprocess.run([executable,*arguments],check=True,timeout=timeout)


def main():
    p=argparse.ArgumentParser(description='Apktool v0.8 workflow (no signing, no license bypass)')
    sub=p.add_subparsers(dest='action',required=True)
    d=sub.add_parser('decode');d.add_argument('apk',type=Path);d.add_argument('decoded',type=Path)
    b=sub.add_parser('bundle');b.add_argument('decoded',type=Path);b.add_argument('original_apk',type=Path);b.add_argument('output',type=Path)
    a=sub.add_parser('prepare');a.add_argument('decoded',type=Path);a.add_argument('patch',type=Path);a.add_argument('working_copy',type=Path);a.add_argument('original_apk',type=Path)
    r=sub.add_parser('build-unsigned');r.add_argument('working_copy',type=Path);r.add_argument('output',type=Path)
    opts=p.parse_args()
    if opts.action=='decode':
        if opts.decoded.exists() or not opts.apk.is_file() or opts.apk.resolve()==opts.decoded.resolve():raise ValueError('Source APK missing or output exists')
        run_apktool(['d',str(opts.apk.resolve()),'-o',str(opts.decoded.resolve())])
        print('Decode finished; output is untrusted and must be inspected.')
    elif opts.action=='bundle':print(json.dumps(create_bundle(opts.decoded,opts.original_apk,opts.output),indent=2))
    elif opts.action=='prepare':print(json.dumps(prepare(opts.decoded,opts.patch,opts.working_copy,opts.original_apk),indent=2))
    elif opts.action=='build-unsigned':
        if opts.output.exists() or not opts.working_copy.is_dir():raise ValueError('Output must be new and workspace must exist')
        if opts.output.resolve().is_relative_to(opts.working_copy.resolve()):raise ValueError('Output must be outside workspace')
        run_apktool(['b',str(opts.working_copy.resolve()),'-o',str(opts.output.resolve())])
        print('APK UNSIGNED created. Do not install or distribute until aligned, signed and verified separately.')

if __name__=='__main__':
    try:main()
    except (OSError,ValueError,subprocess.SubprocessError,ET.ParseError) as e:print('ERROR:',str(e),file=sys.stderr);sys.exit(1)
