#!/usr/bin/env python3
"""APK Reverse Studio v0.9: offline signing and verifying a user-owned APK.

Uses official Android SDK zipalign/apksigner installed independently. Never
executes APK code, uploads binaries, or asks AI to handle signing secrets.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time
from zipfile import ZipFile, BadZipFile

SCHEMA = 'apk-reverse-build-receipt'
PASSWORD_ENV = 'APKR_KEYSTORE_PASS'
KEY_PASSWORD_ENV = 'APKR_KEY_PASS'


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as inp:
        for chunk in iter(lambda: inp.read(4 * 1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def existing_file(path: Path, kind: str) -> Path:
    if path.is_symlink() or not path.is_file():
        raise ValueError(f'{kind} harus berupa berkas biasa, bukan symlink')
    return path.resolve(strict=True)


def output_path(path: Path, forbidden: list[Path]) -> Path:
    if path.is_symlink() or path.exists():
        raise ValueError(f'Output sudah ada atau berupa symlink: {path.name}')
    parent = path.parent.resolve(strict=True)
    if not parent.is_dir():
        raise ValueError('Folder output harus ada')
    resolved = parent / path.name
    if resolved in forbidden:
        raise ValueError('Output tidak boleh menimpa input atau keystore')
    return resolved


def apk_check(path: Path) -> None:
    if path.stat().st_size < 100:
        raise ValueError('Bukan APK yang valid: terlalu kecil')
    try:
        with ZipFile(path) as z:
            names = set(z.namelist())
            if 'AndroidManifest.xml' not in names:
                raise ValueError('Bukan APK: AndroidManifest.xml tidak ditemukan')
            if z.testzip() is not None:
                raise ValueError('Arsip APK gagal pemeriksaan CRC')
    except BadZipFile as exc:
        raise ValueError('Bukan APK ZIP yang valid') from exc


def sdk_tool(name: str) -> str:
    found = shutil.which(name)
    if not found:
        raise RuntimeError(f'{name} tidak ditemukan di PATH. Instal Android SDK Build Tools.')
    return found


def execute(args: list[str], *, timeout: int=360, env=None) -> str:
    try:
        run = subprocess.run(args, shell=False, text=True, stdout=subprocess.PIPE,
                             stderr=subprocess.STDOUT, timeout=timeout,
                             stdin=subprocess.DEVNULL, env=env, check=False)
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError('Perintah SDK melewati batas waktu') from exc
    if run.returncode != 0:
        # Tool messages are not trusted to omit secrets: provide only generic failure,
        # never print its stdout/stderr (especially keystore paths or passwords).
        raise RuntimeError(f'Tahap {Path(args[0]).name} gagal (exit {run.returncode}); cek konfigurasi SDK/keystore')
    return run.stdout[-12000:]


def safe_log_info(text: str) -> dict:
    # No raw stdout, paths or environment variables in portable build receipt.
    cert = re.search(r'(?im)^Signer #1 certificate SHA-256 digest:\s*([0-9a-f:]+)\s*$', text)
    scheme = {}
    for ver in ('v1', 'v2', 'v3', 'v3.1', 'v4'):
        m = re.search(r'(?im)^Verified using '+re.escape(ver)+r' scheme[^:]*:\s*(true|false)\s*$', text)
        if m: scheme[ver] = m.group(1).lower() == 'true'
    return {'signerSha256':cert.group(1).lower() if cert else None, 'schemes':scheme}


def receipt_for(signed: Path, unsigned_sha: str | None, tool_output: str) -> dict:
    s = safe_log_info(tool_output)
    return {
        'format':SCHEMA, 'schemaVersion':1, 'result':'VERIFIED',
        'sourceApkSha256':unsigned_sha, 'signedApkSha256':digest(signed),
        'signedBytes':signed.stat().st_size, 'signedFile':signed.name,
        'zipalign16KiB':'PASS', 'apksignerVerify':'PASS',
        'signerCertificateSha256':s['signerSha256'], 'verifiedSchemes':s['schemes'],
        'verifiedAtEpoch':int(time.time()),
        'note':'Verifikasi signature dan alignment bukan bukti aplikasi dapat dijalankan; uji perangkat tetap diperlukan.'
    }


def atomic_write_json(path: Path, payload: dict):
    # Never overwrite a pre-existing report; place temp file beside output.
    with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=path.parent,
                                     prefix='.receipt-', suffix='.json', delete=False) as f:
        tmp = Path(f.name)
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write('\n')
    try:
        os.link(tmp, path)  # exclusive publication
    finally:
        tmp.unlink(missing_ok=True)


def publish_copy(verified: Path, output: Path):
    os.link(verified, output)  # fails safely if the destination suddenly exists


def verify_tools(apk: Path, zipalign: str, apksigner: str) -> str:
    # -P 16 aligns native libs on 16 KiB boundaries (Android Build Tools 35+).
    execute([zipalign, '-c', '-P', '16', '4', str(apk)])
    return execute([apksigner, 'verify', '--verbose', '--print-certs', str(apk)])


def finalize(unsigned: Path, keystore: Path, alias: str, output: Path, receipt: Path | None):
    unsigned = existing_file(unsigned, 'Unsigned APK')
    keystore = existing_file(keystore, 'Keystore')
    if not re.fullmatch(r'[a-zA-Z0-9_.-]{1,128}', alias):
        raise ValueError('Alias hanya boleh huruf, angka, titik, garis bawah dan strip')
    if not os.environ.get(PASSWORD_ENV):
        raise ValueError('Variabel lingkungan APKR_KEYSTORE_PASS harus diatur pada komputer tepercaya')
    if receipt is None:
        receipt = output.with_suffix('.receipt.json')
    output = output_path(output, [unsigned, keystore])
    receipt = output_path(receipt, [unsigned, keystore, output])
    if output == receipt:
        raise ValueError('Output APK dan receipt harus berbeda')
    zipalign, apksigner = sdk_tool('zipalign'), sdk_tool('apksigner')
    apk_check(unsigned)
    source_sha = digest(unsigned)
    with tempfile.TemporaryDirectory(dir=output.parent, prefix='.reverse-build-') as tmp:
        aligned = Path(tmp) / 'aligned.apk'
        signed = Path(tmp) / 'signed.apk'
        execute([zipalign, '-P', '16', '4', str(unsigned), str(aligned)])
        env = dict(os.environ)
        args = [apksigner, 'sign', '--ks', str(keystore), '--ks-key-alias', alias,
                '--ks-pass', 'env:' + PASSWORD_ENV]
        if env.get(KEY_PASSWORD_ENV):
            args += ['--key-pass', 'env:' + KEY_PASSWORD_ENV]
        args += ['--out', str(signed), str(aligned)]
        execute(args, env=env)
        verify_output = verify_tools(signed, zipalign, apksigner)
        apk_check(signed)
        if digest(unsigned) != source_sha:
            raise RuntimeError('APK input berubah selama proses; output dibatalkan')
        report = receipt_for(signed, source_sha, verify_output)
        try:
            # Publish only after both checks pass. If report write fails,
            # remove the published output (which did not exist beforehand).
            publish_copy(signed, output)
            atomic_write_json(receipt, report)
        except Exception:
            output.unlink(missing_ok=True)
            raise
        return report


def verify_existing(apk: Path, receipt: Path | None):
    apk = existing_file(apk, 'Signed APK')
    if receipt is not None:
        receipt = output_path(receipt, [apk])
    apk_check(apk)
    result = verify_tools(apk, sdk_tool('zipalign'), sdk_tool('apksigner'))
    report = receipt_for(apk, None, result)
    if receipt: atomic_write_json(receipt, report)
    return report


def main(argv=None):
    p = argparse.ArgumentParser(description='Finalisasi APK milik sendiri: zipalign, sign, verify (offline)')
    sub = p.add_subparsers(dest='command', required=True)
    f = sub.add_parser('finalize', help='APK unsigned -> aligned -> signed & verified')
    f.add_argument('unsigned', type=Path)
    f.add_argument('keystore', type=Path)
    f.add_argument('alias')
    f.add_argument('output', type=Path)
    f.add_argument('--receipt', type=Path)
    v = sub.add_parser('verify', help='Periksa APK signed tanpa mengubahnya')
    v.add_argument('apk', type=Path)
    v.add_argument('--receipt', type=Path)
    opts = p.parse_args(argv)
    report = (finalize(opts.unsigned,opts.keystore,opts.alias,opts.output,opts.receipt)
              if opts.command == 'finalize' else verify_existing(opts.apk,opts.receipt))
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    try: main()
    except (OSError, ValueError, RuntimeError) as e:
        print('ERROR:', str(e), file=sys.stderr)
        sys.exit(1)
