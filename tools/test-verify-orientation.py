#!/usr/bin/env python3
"""Regression tests: accepting valid screenshots and rejecting false rotation evidence."""
import importlib.util
from pathlib import Path
import struct
import tempfile

module_path = Path(__file__).with_name('verify-orientation.py')
spec = importlib.util.spec_from_file_location('orientation', module_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

with tempfile.TemporaryDirectory() as tmp:
    a, b = Path(tmp) / 'portrait.png', Path(tmp) / 'landscape.png'
    def write_png(path, width, height):
        path.write_bytes(b'\x89PNG\r\n\x1a\n'+struct.pack('>I',13)+b'IHDR'+struct.pack('>II',width,height))
    write_png(a, 540, 960)
    write_png(b, 960, 540)
    assert 'PASS:' in module.verify(a,b)
    write_png(b, 540, 960)
    try:
        module.verify(a,b)
        raise AssertionError('Landscape validation accepted portrait')
    except ValueError as exc:
        assert 'Orientation not applied' in str(exc)
    b.write_bytes(b'not an image')
    try:
        module.verify(a,b)
        raise AssertionError('Corrupt screenshot accepted')
    except ValueError as exc:
        assert 'Invalid emulator screenshot' in str(exc)
    print('PASS: orientation screenshot validator, rotated/stuck/corrupt cases')
