#!/usr/bin/env python3
"""Make a bounded, review-only source bundle from JADX CLI output (never a rebuilt APK).
Usage: python3 tools/make-jadx-bundle.py path/to/jadx-output path/to/review-bundle.zip
"""
import hashlib
import json
from pathlib import Path
import sys
import zipfile

MAX_ITEMS = 240
MAX_FILE = 192 * 1024
MAX_TOTAL = 12 * 1024 * 1024
MAX_ZIP = 32 * 1024 * 1024

def make_bundle(folder, output):
    folder, output = Path(folder).resolve(strict=True), Path(output).resolve()
    if not folder.is_dir():
        raise ValueError('Folder output JADX tidak ditemukan')
    if output == folder or folder in output.parents:
        raise ValueError('Output ZIP harus di luar folder JADX agar tidak ikut terindeks')
    report_file = folder / 'apk-reverse-jadx-report.json'
    report = json.loads(report_file.read_text('utf-8'))
    if report.get('engine') != 'jadx-cli' or not report.get('source'):
        raise ValueError('Jalankan tools/jadx-offline.mjs terlebih dahulu')
    source_root = folder / 'sources'
    if not source_root.is_dir():
        # Some JADX CLI versions write sources directly at the destination root.
        source_root = folder
    candidates = sorted(source_root.rglob('*.java'))
    entries = []
    total = 0
    skipped = 0
    for file in candidates:
        if file.is_symlink() or not file.is_file():
            skipped += 1
            continue
        relative = file.relative_to(source_root).as_posix()
        if len(relative) > 330 or any(x in ('.', '..', '') for x in relative.split('/')):
            skipped += 1
            continue
        size = file.stat().st_size
        if size > MAX_FILE or total + size > MAX_TOTAL or len(entries) >= MAX_ITEMS:
            skipped += 1
            continue
        data = file.read_bytes()
        if b'\0' in data:
            skipped += 1
            continue
        data.decode('utf-8')
        total += len(data)
        entries.append((f'sources/{relative}', data))
    if not entries:
        raise ValueError('Tidak ada .java yang memenuhi batas bundle')
    source_name = Path(report['source']).name
    manifest = {
        'schemaVersion': 1,
        'engine': 'jadx-cli-review',
        'sourceFile': source_name,
        'sourceBytes': report.get('inputBytes'),
        'sourceSha256': report.get('sourceSha256'),
        'scope': 'Reviewable Java decompiler output. Not rebuildable APK source.',
        'selectedSources': len(entries),
        'skippedSources': skipped,
        'files': [{'path': path, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)} for path, data in entries],
    }
    manifest_data = json.dumps(manifest, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    if len(manifest_data) > 32 * 1024:
        raise ValueError('Manifest terlalu besar')
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=True) as z:
        z.writestr('bundle.json', manifest_data)
        for name, data in entries:
            z.writestr(name, data)
    if output.stat().st_size > MAX_ZIP:
        output.unlink()
        raise ValueError('Bundle lebih besar dari 32 MiB')
    return manifest

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('Usage: python3 tools/make-jadx-bundle.py <jadx-output> <review-bundle.zip>', file=sys.stderr)
        sys.exit(2)
    try:
        result = make_bundle(sys.argv[1], sys.argv[2])
        print(json.dumps({k: result[k] for k in ('sourceFile', 'selectedSources', 'skippedSources')}, indent=2))
    except (OSError, ValueError, UnicodeError, KeyError, json.JSONDecodeError) as ex:
        print(f'Gagal membuat bundle: {ex}', file=sys.stderr)
        sys.exit(1)
